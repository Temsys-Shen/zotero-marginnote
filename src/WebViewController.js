JSB.require('network');

var SZWebViewController = JSB.defineClass('SZWebViewController : UIViewController <UIWebViewDelegate>', {
  viewDidLoad: function() {
    // 1. View Setup
    self.navigationItem.title = 'Web';
    self.view.backgroundColor = UIColor.whiteColor();
    self.view.layer.cornerRadius = 6;
    self.view.layer.masksToBounds = false;
    self.view.layer.shadowOffset = {width:0,height:2};
    self.view.layer.shadowRadius = 4;
    self.view.layer.shadowOpacity = 0.3;
    self.view.layer.shadowColor = UIColor.blackColor();

    var titleHeight = 32;

    // 2. Title Bar
    self.titleBar = new UIView({x: 0, y: 0, width: self.view.bounds.width, height: titleHeight});
    self.titleBar.backgroundColor = UIColor.colorWithWhiteAlpha(0.96, 1);
    self.titleBar.autoresizingMask = (1 << 1); // FlexibleWidth

    
    // Mask top corners
    /* 暂注释掉圆角遮罩以排查闪退问题
    var maskPath = UIBezierPath.bezierPathWithRoundedRectByRoundingCornersCornerRadii(
        self.titleBar.bounds, 
        (1 << 0 | 1 << 1), // TopLeft | TopRight
        {width: 6, height: 6}
    );
    var maskLayer = CAShapeLayer.layer();
    maskLayer.frame = self.titleBar.bounds;
    try {
      maskLayer.path = maskPath.CGPath; // Try property access first
    } catch (e) {
      JSB.log('MNZotero: maskPath.CGPath property access failed: ' + e);
      try {
        maskLayer.path = maskPath.CGPath(); // Try method call
      } catch (e2) {
        JSB.log('MNZotero: maskPath.CGPath() method call failed: ' + e2);
      }
    }
    self.titleBar.layer.mask = maskLayer;
    */
    
    // Add Label
    self.titleLabel = new UILabel({x: 10, y: 0, width: self.view.bounds.width - 20, height: titleHeight});
    self.titleLabel.text = "Zotero Reference";
    self.titleLabel.textAlignment = 1; // Center
    self.titleLabel.font = UIFont.boldSystemFontOfSize(14);
    self.titleLabel.textColor = UIColor.darkGrayColor();
    self.titleLabel.autoresizingMask = (1 << 1); // FlexibleWidth
    self.titleBar.addSubview(self.titleLabel);

    // Pan Gesture for Title Bar
    var panRecognizer = new UIPanGestureRecognizer(self, "handlePan:");
    self.titleBar.addGestureRecognizer(panRecognizer);
    self.view.addSubview(self.titleBar);

    // 3. WebView
    self.webView = new UIWebView({x: 0, y: titleHeight, width: self.view.bounds.width, height: self.view.bounds.height - titleHeight});
    self.webView.backgroundColor = UIColor.whiteColor();
    self.webView.scalesPageToFit = true;
    self.webView.autoresizingMask = (1 << 1 | 1 << 4); // FlexibleWidth | FlexibleHeight
    self.webView.delegate = self;
    self.view.addSubview(self.webView);

    // 4. Resize Handle
    var resizeSize = 40;
    self.resizeHandle = new UIView({x: self.view.bounds.width - resizeSize, y: self.view.bounds.height - resizeSize, width: resizeSize, height: resizeSize});
    self.resizeHandle.backgroundColor = UIColor.clearColor(); // 调试时可改为红色观察
    self.resizeHandle.autoresizingMask = (1 << 0 | 1 << 3); // FlexibleLeftMargin | FlexibleTopMargin
    self.resizeHandle.userInteractionEnabled = true; 

    
    var resizeIcon = new UILabel({x: 15, y: 15, width: 20, height: 20});
    resizeIcon.text = "↘";
    resizeIcon.font = UIFont.systemFontOfSize(16);
    resizeIcon.textColor = UIColor.grayColor();
    resizeIcon.alpha = 0.5;
    self.resizeHandle.addSubview(resizeIcon);

    var resizeRecognizer = new UIPanGestureRecognizer(self, "handleResize:");
    self.resizeHandle.addGestureRecognizer(resizeRecognizer);
    self.view.addSubview(self.resizeHandle);

    var htmlPath = self.mainPath ? (self.mainPath + '/webpage.html') : null;
    if (htmlPath) {
      var fileURL = NSURL.fileURLWithPath(htmlPath);
      self.webView.loadRequest(NSURLRequest.requestWithURL(fileURL));
    } else {
      self.webView.loadHTMLStringBaseURL('<html><body style="margin:20px;">未找到 mainPath，无法加载 webpage.html</body></html>', null);
    }
  },
  
  handlePan: function(recognizer) {
    var translation = recognizer.translationInView(self.view.superview);
    var center = self.view.center;
    self.view.center = {x: center.x + translation.x, y: center.y + translation.y};
    recognizer.setTranslationInView({x: 0, y: 0}, self.view.superview);
    
    if (recognizer.state == 3) { // Ended
        // Inline save logic
        var frame = self.view.frame;
        var config = {
            x: frame.x,
            y: frame.y,
            width: frame.width,
            height: frame.height
        };
        NSUserDefaults.standardUserDefaults().setObjectForKey(config, 'mn_zotero_frame_config');
    }
  },

  handleResize: function(recognizer) {
    var location = recognizer.locationInView(self.view.superview); // Get absolute location in superview
    if (recognizer.state == 1) { // Began
        // Store initial touch position and initial frame
        self._resizeStartLocation = location;
        self._resizeStartFrame = self.view.frame;
    } else if (recognizer.state == 2) { // Changed
        if (!self._resizeStartLocation || !self._resizeStartFrame) return;
        
        var dx = location.x - self._resizeStartLocation.x;
        var dy = location.y - self._resizeStartLocation.y;
        
        var newWidth = Math.max(250, self._resizeStartFrame.width + dx);
        var newHeight = Math.max(300, self._resizeStartFrame.height + dy);
        
        // Use bounds for debugging
        JSB.log("MNZotero: Resize new frame: " + JSON.stringify({width: newWidth, height: newHeight}));

        self.view.frame = {
            x: self._resizeStartFrame.x,
            y: self._resizeStartFrame.y,
            width: newWidth,
            height: newHeight
        };
        
        // Force layout update if needed
        self.view.setNeedsLayout();
        
    } else if (recognizer.state == 3) { // Ended
        // self.saveFrameState(); // JSB 实例方法调用可能存在绑定问题，改为直接在这里执行保存逻辑
        var frame = self.view.frame;
        var config = {
            x: frame.x,
            y: frame.y,
            width: frame.width,
            height: frame.height
        };
        NSUserDefaults.standardUserDefaults().setObjectForKey(config, 'mn_zotero_frame_config');

        self._resizeStartLocation = null;
        self._resizeStartFrame = null;
    }
  },

  saveFrameState: function() {
      var frame = self.view.frame;
      var config = {
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height
      };
      NSUserDefaults.standardUserDefaults().setObjectForKey(config, 'mn_zotero_frame_config');
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

    var errorHTML = "<html><body style='margin:20px; font-family: -apple-system; color: #666;'><h3>加载失败</h3><p>" + (error.localizedDescription || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + "</p></body></html>";
    self.webView.loadHTMLStringBaseURL(errorHTML, null);
  },
  webViewShouldStartLoadWithRequestNavigationType: function(webView, request, type) {
    var url = request.URL();
    
    // JSBox/JSB 中 OC 对象的属性访问兼容性处理
    var scheme = '';
    try { scheme = url.scheme(); } catch (e) { scheme = url.scheme; }
    scheme = String(scheme || '').toLowerCase();

    var urlString = '';
    try { urlString = url.absoluteString(); } catch (e) { urlString = url.absoluteString; }
    urlString = String(urlString || '');

    // 1. 拦截 zotero 协议
    if (scheme === 'zotero' || urlString.indexOf('zotero:') === 0) {
      Application.sharedInstance().openURL(url);
      return false;
    }

    // 2. 拦截 http/https 协议（Web/Cloud PDF），强制在 Safari 打开
    if (scheme === 'http' || scheme === 'https') {
      Application.sharedInstance().openURL(url);
      return false;
    }

    // 3. 处理 mnzotero 内部协议
    if (scheme !== 'mnzotero') return true;
    var host = String(url.host || '');
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
            SZMNNetwork.fetch(reqUrl, options).then(function(res) {
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
