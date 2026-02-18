class SZResponse {
  constructor(data, nsResponse) {
    this.data = data;
    this.nsResponse = nsResponse;
    this.status = nsResponse ? nsResponse.statusCode() : 0;
  }

  static isNil(obj) {
    return obj === null || typeof obj === 'undefined' || obj instanceof NSNull;
  }

  text() {
    if (SZResponse.isNil(this.data) || this.data.length() === 0) return "";

    var encoding = this.data.base64Encoding();
    var decoding = SZBase64.decode(encoding);
    return decoding;
  }

  json() {
    if (SZResponse.isNil(this.data) || this.data.length() === 0) return {};

    try {
      return NSJSONSerialization.JSONObjectWithDataOptions(this.data, 1);
    } catch (e) {
      return null;
    }
  }
}

class SZMNNetwork {
  static isNil(obj) {
    return obj === null || typeof obj === 'undefined' || obj instanceof NSNull;
  }

  static _initRequest(url, options) {
    var fullUrl = url.trim();
    if (fullUrl.indexOf("://") === -1) fullUrl = "https://" + fullUrl;

    var request = NSMutableURLRequest.requestWithURL(NSURL.URLWithString(fullUrl));
    request.setHTTPMethod(options.method || "GET");
    request.setTimeoutInterval(options.timeout || 10);

    var headers = {
      "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
    if (options.headers) {
      for (var k in options.headers) headers[k] = String(options.headers[k]);
    }
    request.setAllHTTPHeaderFields(headers);

    if (options.json) {
      request.setHTTPBody(NSJSONSerialization.dataWithJSONObjectOptions(options.json, 1));
    } else if (options.body) {
      request.setHTTPBody(NSData.dataWithStringEncoding(String(options.body), 4));
    }

    if (options.search) {
      var components = NSURLComponents.componentsWithString(fullUrl);
      var qs = Object.keys(options.search).map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(options.search[k]);
      }).join("&");
      components.query = qs;
      request.setURL(components.URL());
    }

    return request;
  }

  static _safeString(value) {
    if (SZMNNetwork.isNil(value)) return "";
    return String(value);
  }

  static _joinPath(base, next) {
    var left = SZMNNetwork._safeString(base).replace(/\/+$/, "");
    var right = SZMNNetwork._safeString(next).replace(/^\/+/, "");
    if (!left) return right;
    if (!right) return left;
    return left + "/" + right;
  }

  static _sanitizeFileName(name) {
    var normalized = SZMNNetwork._safeString(name).trim();
    if (!normalized) return "";
    normalized = normalized
      .replace(/[\/\\:*?"<>|]/g, "_")
      .replace(/\s+/g, " ");
    if (normalized === "." || normalized === "..") return "";
    return normalized;
  }

  static _fileNameFromResponse(url, response) {
    var fromDisposition = "";
    if (response && response.allHeaderFields) {
      var headers = typeof response.allHeaderFields === "function" ? response.allHeaderFields() : response.allHeaderFields;
      var disposition = null;
      if (headers) {
        if (typeof headers.objectForKey === "function") {
          disposition = headers.objectForKey("Content-Disposition") || headers.objectForKey("content-disposition");
        } else {
          disposition = headers["Content-Disposition"] || headers["content-disposition"];
        }
      }
      if (disposition) {
        var raw = SZMNNetwork._safeString(disposition);
        var match = raw.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
        if (match && match[1]) {
          try {
            fromDisposition = decodeURIComponent(SZMNNetwork._safeString(match[1]).replace(/"/g, ""));
          } catch (e) {
            fromDisposition = SZMNNetwork._safeString(match[1]).replace(/"/g, "");
          }
        }
      }
    }
    if (fromDisposition) return SZMNNetwork._sanitizeFileName(fromDisposition);

    var rawUrl = SZMNNetwork._safeString(url).split("?")[0];
    if (!rawUrl) return "";
    var idx = rawUrl.lastIndexOf("/");
    var name = idx >= 0 ? rawUrl.substring(idx + 1) : rawUrl;
    try {
      return SZMNNetwork._sanitizeFileName(decodeURIComponent(name));
    } catch (e) {
      return SZMNNetwork._sanitizeFileName(name);
    }
  }

  static _resolveDocumentPath() {
    var app = Application.sharedInstance();
    var docPath = app.documentPath;
    if (typeof docPath === "function") docPath = docPath.call(app);
    return SZMNNetwork._safeString(docPath);
  }

  static _ensureDirectory(path) {
    var fm = NSFileManager.defaultManager();
    if (fm.fileExistsAtPath(path)) return true;

    try {
      if (typeof fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError === "function") {
        fm.createDirectoryAtPathWithIntermediateDirectoriesAttributesError(path, true, null, null);
      } else if (typeof fm.createDirectoryAtPathWithIntermediateDirectoriesAttributes === "function") {
        fm.createDirectoryAtPathWithIntermediateDirectoriesAttributes(path, true, null);
      } else if (typeof fm.createDirectoryAtPathAttributes === "function") {
        fm.createDirectoryAtPathAttributes(path, null);
      }
    } catch (e) {
      // keep fallback check below
    }
    return !!fm.fileExistsAtPath(path);
  }

  static _resolveTargetPath(directoryPath, fileName, overwrite) {
    var fm = NSFileManager.defaultManager();
    var cleanName = SZMNNetwork._sanitizeFileName(fileName) || ("download-" + Date.now());
    var targetPath = SZMNNetwork._joinPath(directoryPath, cleanName);
    if (overwrite) return targetPath;
    if (!fm.fileExistsAtPath(targetPath)) return targetPath;

    var dot = cleanName.lastIndexOf(".");
    var stem = dot > 0 ? cleanName.substring(0, dot) : cleanName;
    var ext = dot > 0 ? cleanName.substring(dot) : "";
    var seq = 1;
    while (seq < 1000) {
      var candidate = stem + "-" + seq + ext;
      var candidatePath = SZMNNetwork._joinPath(directoryPath, candidate);
      if (!fm.fileExistsAtPath(candidatePath)) return candidatePath;
      seq += 1;
    }
    return SZMNNetwork._joinPath(directoryPath, stem + "-" + Date.now() + ext);
  }

  static fetch(url, options) {
    var req = this._initRequest(url, options || {});

    return new Promise(function (resolve, reject) {
      NSURLConnection.sendAsynchronousRequestQueueCompletionHandler(
        req,
        NSOperationQueue.mainQueue(),
        function (res, data, err) {
          if (!SZMNNetwork.isNil(err)) {
            var msg = err.localizedDescription;
            if (typeof msg === 'function') msg = msg.call(err);
            reject(msg || "Network Error");
          } else {
            var response = new SZResponse(data, res);
            resolve(response);
          }
        }
      );
    });
  }

  static downloadToDocumentPath(url, options) {
    var opts = options || {};
    var subdirectory = SZMNNetwork._safeString(opts.subdirectory || "");
    var documentPath = SZMNNetwork._resolveDocumentPath();

    if (!documentPath) {
      return Promise.reject("documentPath is empty");
    }

    var outputDirectory = subdirectory ? SZMNNetwork._joinPath(documentPath, subdirectory) : documentPath;
    if (!SZMNNetwork._ensureDirectory(outputDirectory)) {
      return Promise.reject("Cannot create output directory: " + outputDirectory);
    }

    return SZMNNetwork.fetch(url, opts).then(function (res) {
      if (res.status < 200 || res.status >= 300) {
        throw "Download failed with status " + res.status;
      }
      if (SZMNNetwork.isNil(res.data) || res.data.length() === 0) {
        throw "Download response is empty";
      }

      var targetName = SZMNNetwork._sanitizeFileName(opts.fileName) || SZMNNetwork._fileNameFromResponse(url, res.nsResponse);
      var targetPath = SZMNNetwork._resolveTargetPath(outputDirectory, targetName, !!opts.overwrite);
      var written = res.data.writeToFileAtomically(targetPath, true);
      if (!written) {
        throw "Failed to write file: " + targetPath;
      }

      return {
        path: targetPath,
        fileName: targetPath.split("/").pop(),
        directory: outputDirectory,
        status: res.status,
        size: res.data.length()
      };
    });
  }
}
