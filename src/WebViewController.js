JSB.require('webpage');
JSB.require('network');

var WebViewController = JSB.defineClass('WebViewController : UIViewController <UIWebViewDelegate>', {
  viewDidLoad: function() {
    self.navigationItem.title = 'Web';
    self.view.backgroundColor = UIColor.whiteColor();
    self.view.layer.shadowOffset = {width:0,height:0};
    self.view.layer.shadowRadius = 10;
    self.view.layer.shadowOpacity = 0.5;
    self.view.layer.shadowColor = UIColor.colorWithWhiteAlpha(0.5,1);

    self.webView = new UIWebView(self.view.bounds);
    self.webView.backgroundColor = UIColor.whiteColor();
    self.webView.scalesPageToFit = true;
    self.webView.autoresizingMask = (1 << 1 | 1 << 4 | 1 << 5);
    self.webView.delegate = self;
    self.view.addSubview(self.webView);

    var htmlPath = self.mainPath ? (self.mainPath + '/webpage.html') : null;
    if (htmlPath) {
      var fileURL = NSURL.fileURLWithPath(htmlPath);
      self.webView.loadRequest(NSURLRequest.requestWithURL(fileURL));
    } else {
      self.webView.loadHTMLStringBaseURL('<html><body style="margin:20px;">未找到 mainPath，无法加载 webpage.html</body></html>', null);
    }
  },
  viewWillAppear: function(animated) {
    self.webView.delegate = self;
  },
  viewWillDisappear: function(animated) {
    self.webView.stopLoading();
    self.webView.delegate = null;

    UIApplication.sharedApplication().networkActivityIndicatorVisible = false;
  },
  webViewDidStartLoad: function(webView) {
    UIApplication.sharedApplication().networkActivityIndicatorVisible = true;
  },
  webViewDidFinishLoad: function(webView) {
    UIApplication.sharedApplication().networkActivityIndicatorVisible = false;
  },
  webViewDidFailLoadWithError: function(webView, error) {
    UIApplication.sharedApplication().networkActivityIndicatorVisible = false;

    var errorString = WebPageConfig.errorHTMLTemplate.replace("%@", error.localizedDescription);
    self.webView.loadHTMLStringBaseURL(errorString, null);
  },
  webViewShouldStartLoadWithRequestNavigationType: function(webView, request, type) {
    if (String(request.URL().scheme) !== 'mnzotero') return true;
    var host = String(request.URL().host || '');
    var path = String(request.URL().path || '');
    if (host === 'fetch' || path.indexOf('fetch') !== -1) {
        webView.evaluateJavaScript('window.__mnFetchPending', function(result) {
          if (!result || result.length === 0) return;
          var id = null;
          try {
            var pending = JSON.parse(result);
            id = pending.id;
            var reqUrl = pending.url;
            var opts = pending.options || {};
            var options = { method: opts.method || 'GET', headers: opts.headers || {} };
            if (opts.body) options.body = opts.body;
            if (opts.json) options.json = opts.json;
            MNNetwork.fetch(reqUrl, options).then(function(res) {
              var status = res.status;
              var body = res.json ? res.json() : (res.text ? res.text() : null);
              var ok = status >= 200 && status < 300;
              var payload = JSON.stringify({ ok: ok, status: status, body: body });
              webView.evaluateJavaScript("(function(){ var c = window.__mnFetchCb && window.__mnFetchCb['" + id + "']; if(c) c(null, " + payload + "); })();", null);
            }, function(err) {
              var msg = (err && (err.message || err.toString)) ? (err.message || err.toString()) : String(err);
              var esc = (msg || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '').replace(/\n/g, '\\n');
              webView.evaluateJavaScript("(function(){ var c = window.__mnFetchCb && window.__mnFetchCb['" + id + "']; if(c) c('" + esc + "', null); })();", null);
            });
          } catch (e) {
            try { var p = JSON.parse(result); if (p && p.id) id = p.id; } catch (_) {}
            var msg = (e && (e.message || e.toString)) ? (e.message || e.toString()) : String(e);
            var esc = (msg || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '').replace(/\n/g, '\\n');
            webView.evaluateJavaScript("(function(){ var c = window.__mnFetchCb && window.__mnFetchCb['" + (id || '') + "']; if(c) c('" + esc + "', null); })();", null);
          }
        });
        return false;
    }
    JSB.log('MNLOG %@', request);
    return true;
  },

});
