JSB.require('base64');

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

  static fetch(url, options) {
    var req = this._initRequest(url, options || {});

    return new Promise(function (resolve, reject) {
      NSURLConnection.sendAsynchronousRequestQueueCompletionHandler(
        req,
        NSOperationQueue.mainQueue(),
        function (res, data, err) {
          if (!SZMNNetwork.isNil(err)) {
            reject(err.localizedDescription ? err.localizedDescription() : "Network Error");
          } else {
            var response = new SZResponse(data, res);
            resolve(response);
          }
        }
      );
    });
  }
}
