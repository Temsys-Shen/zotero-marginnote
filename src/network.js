var ZoteroNetwork = {

  // 辅助：生成 NSURL
  genURL: function (url) {
    // 简单处理空格和协议头
    url = url.trim();
    if (url.indexOf('://') === -1) {
      url = 'https://' + url;
    }
    // 必须编码，否则含空格或特殊字符会崩溃
    return NSURL.URLWithString(encodeURI(url));
  },

  // 核心 fetch 方法
  fetch: function (url, options) {
    var self = this; // 闭包引用
    options = options || {};

    return new Promise(function (resolve, reject) {
      var request = NSMutableURLRequest.requestWithURL(self.genURL(url));

      // 1. 设置 HTTP 方法
      request.setHTTPMethod(options.method || 'GET');
      request.setTimeoutInterval(options.timeout || 10.0);

      // 2. 设置 Headers
      var headers = {
        'User-Agent': 'MarginNote-Zotero-Addon/1.0',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      // 合并用户 headers
      if (options.headers) {
        for (var key in options.headers) {
          headers[key] = options.headers[key];
        }
      }
      request.setAllHTTPHeaderFields(headers);

      // 3. 处理 Body (JSON 或 String)
      if (options.body) {
        var bodyStr = "";
        if (typeof options.body === 'object') {
          // NSJSONWritingSortedKeys = 1
          var jsonData = NSJSONSerialization.dataWithJSONObjectOptions(options.body, 1);
          request.setHTTPBody(jsonData);
        } else {
          bodyStr = String(options.body);
          request.setHTTPBody(NSData.dataWithStringEncoding(bodyStr, 4)); // UTF8
        }
      }

      // 4. 处理 Search Query (拼接到 URL)
      if (options.search) {
        var qs = [];
        for (var k in options.search) {
          qs.push(k + "=" + encodeURIComponent(options.search[k]));
        }
        if (qs.length > 0) {
          var sep = (url.indexOf('?') === -1) ? '?' : '&';
          request.setURL(self.genURL(url + sep + qs.join('&')));
        }
      }

      // 5. 发送请求 (主线程队列)
      NSURLConnection.sendAsynchronousRequestQueueCompletionHandler(
        request,
        NSOperationQueue.mainQueue(),
        function (response, data, error) {
          if (error) {
            reject(error.localizedDescription);
          } else {
            // 封装结果
            resolve({
              data: data,
              // 辅助方法：转 JSON
              json: function () {
                if (!data || data.length() === 0) return {};
                // NSJSONReadingMutableContainers = 1
                return NSJSONSerialization.JSONObjectWithDataOptions(data, 1);
              },
              // 辅助方法：转 文本
              text: function () {
                if (!data) return "";
                return NSString.alloc().initWithDataEncoding(data, 4);
              }
            });
          }
        }
      );
    });
  }
};