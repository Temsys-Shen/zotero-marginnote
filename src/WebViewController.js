JSB.require('network');

var SZWebViewController = JSB.defineClass('SZWebViewController : UIViewController <UIWebViewDelegate>', {
  viewDidLoad: function() {
    // 1. View Setup
    self.navigationItem.title = 'Web';
    
    // Root view: Clear background + Shadow + NO masking
    self.view.backgroundColor = UIColor.clearColor();
    self.view.layer.shadowOffset = {width:0,height:2};
    self.view.layer.shadowRadius = 4;
    self.view.layer.shadowOpacity = 0.3;
    self.view.layer.shadowColor = UIColor.blackColor();
    self.view.layer.masksToBounds = false;

    // Defend against zero frame initialization
    var bounds = self.view.bounds;
    var initWidth = bounds.width > 0 ? bounds.width : 300;
    var initHeight = bounds.height > 0 ? bounds.height : 400;

    // Container view (renamed to containerView to avoid potential conflict)
    self.containerView = new UIView({x: 0, y: 0, width: initWidth, height: initHeight});
    self.containerView.backgroundColor = UIColor.whiteColor();
    self.containerView.layer.cornerRadius = 10; 
    self.containerView.layer.masksToBounds = true; // Clip content
    self.containerView.layer.borderWidth = 0.5;
    self.containerView.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.3);
    self.containerView.autoresizingMask = (1 << 1 | 1 << 4); // FlexibleWidth | FlexibleHeight
    self.view.addSubview(self.containerView);

    var titleHeight = 32;

    // 2. Title Bar
    self.titleBar = new UIView({x: 0, y: 0, width: initWidth, height: titleHeight});
    self.titleBar.backgroundColor = UIColor.colorWithWhiteAlpha(0.96, 1);
    self.titleBar.autoresizingMask = (1 << 1); // FlexibleWidth
    
    // Add Label
    self.titleLabel = new UILabel({x: 10, y: 0, width: initWidth - 20, height: titleHeight});
    self.titleLabel.text = "Zotero Connector";
    self.titleLabel.textAlignment = 1; // Center
    self.titleLabel.font = UIFont.boldSystemFontOfSize(14);
    self.titleLabel.textColor = UIColor.darkGrayColor();
    self.titleLabel.autoresizingMask = (1 << 1); // FlexibleWidth
    self.titleBar.addSubview(self.titleLabel);

    // Pan Gesture for Title Bar
    var panRecognizer = new UIPanGestureRecognizer(self, "handlePan:");
    self.titleBar.addGestureRecognizer(panRecognizer);
    self.containerView.addSubview(self.titleBar);

    // 3. WebView
    self.webView = new UIWebView({
        x: 0, 
        y: titleHeight, 
        width: initWidth, 
        height: Math.max(0, initHeight - titleHeight)
    });
    self.webView.backgroundColor = UIColor.whiteColor();
    self.webView.scalesPageToFit = true;
    self.webView.autoresizingMask = (1 << 1 | 1 << 4); // FlexibleWidth | FlexibleHeight
    self.webView.delegate = self;
    self.containerView.addSubview(self.webView);

    // 4. Resize Handle
    var resizeSize = 40;
    self.resizeHandle = new UIView({x: initWidth - resizeSize, y: initHeight - resizeSize, width: resizeSize, height: resizeSize});
    self.resizeHandle.backgroundColor = UIColor.clearColor(); 
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
    self.containerView.addSubview(self.resizeHandle);

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
    var urlStringForQuery = urlString;

    if (host === 'createNote' || path.indexOf('createNote') !== -1) {
      var queryString = '';
      try {
        var q = url.query;
        if (typeof q === 'function') q = q();
        if (q) queryString = String(q);
        else if (urlStringForQuery.indexOf('?') !== -1) queryString = urlStringForQuery.split('?')[1] || '';
      } catch (e) {
        if (urlStringForQuery.indexOf('?') !== -1) queryString = urlStringForQuery.split('?')[1] || '';
      }
      var title = '', type = '', year = '', author = '', lZ = '', lP = '', lW = '', lC = '';
      if (queryString) {
        var parts = queryString.split('&');
        for (var i = 0; i < parts.length; i++) {
          var eq = parts[i].indexOf('=');
          if (eq === -1) continue;
          var key = decodeURIComponent(parts[i].substring(0, eq));
          var val = decodeURIComponent(parts[i].substring(eq + 1).replace(/\+/g, ' '));
          if (key === 'title') title = val;
          else if (key === 'type') type = val;
          else if (key === 'year') year = val;
          else if (key === 'author') author = val;
          else if (key === 'lZ') lZ = val;
          else if (key === 'lP') lP = val;
          else if (key === 'lW') lW = val;
          else if (key === 'lC') lC = val;
        }
      }
      if (!title) return false;
      var targetWindow = (self.addon && self.addon.window) ? self.addon.window : self.addonWindow;
      if (!targetWindow) return false;
      var studyController = null;
      try {
        studyController = Application.sharedInstance().studyController(targetWindow);
      } catch (e) {
        return false;
      }
      var notebookId = null;
      try {
        var nc = studyController.notebookController;
        if (nc) {
          notebookId = nc.currTopic;
          if (notebookId === undefined && typeof nc.currTopic === 'function') notebookId = nc.currTopic();
          if (notebookId === undefined) notebookId = nc.notebookId;
          if (notebookId === undefined) notebookId = nc.topicId;
        }
      } catch (e) { }
      if (notebookId === undefined && self.currentNotebookId) notebookId = self.currentNotebookId;
      if (!notebookId) return false;
      var db = Database.sharedInstance();
      var notebook = db.getNotebookById(notebookId);
      if (!notebook) return false;
      var doc = (notebook.documents && notebook.documents.length > 0) ? notebook.documents[0] : (notebook.mainDocMd5 ? db.getDocumentById(notebook.mainDocMd5) : undefined);
      if (!doc) {
        Application.sharedInstance().showHUD('请先打开文档', self.view, 2);
        return false;
      }
      var topicId = notebook.topicId || notebook.topicid;
      var newNote = undefined;
      UndoManager.sharedInstance().undoGrouping(
        "Create Note",
        topicId,
        function() {
          try {
            var createdNote = Note.createWithTitleNotebookDocument(title, notebook, doc);
            newNote = createdNote;
            if (!createdNote) return;
            var hasMeta = (type || year || author);
            var hasLinks = (lZ || lP || lW || lC);
            if (!hasMeta && !hasLinks) return;
            var esc = function(s) {
              if (!s) return '';
              return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            };
            var body = '<div style="font-family:sans-serif;padding:20px 28px;background:#FAFAFA;border-left:6px solid #007AFF;border-radius:6px;margin:14px 0;">';
            if (hasMeta) {
              body += '<div style="margin-bottom:12px;">';
              var yearAuthor = [year, author].filter(Boolean).join(' ');
              if (yearAuthor) body += '<span style="font-size:32px;font-weight:bold;color:#333;margin-right:12px;">' + esc(yearAuthor) + '</span>';
              if (type) body += '<span style="color:#999;font-size:22px;border:1px solid #ddd;padding:4px 14px;border-radius:12px;vertical-align:text-bottom;">' + esc(type) + '</span>';
              body += '</div>';
            }
            if (hasLinks) {
              body += '<div style="display:flex;gap:24px;">';
              if (lZ) body += '<a href="' + lZ + '" style="text-decoration:none;color:#007AFF;font-weight:600;font-size:24px;">🔗 Open in Zotero</a>';
              if (lP) body += '<a href="' + lP + '" style="text-decoration:none;color:#2E7D32;font-weight:600;font-size:24px;">📑 Read PDF</a>';
              if (lW) body += '<a href="' + lW + '" style="text-decoration:none;color:#666;font-weight:600;font-size:24px;">🌐 Web</a>';
              if (lC) body += '<a href="' + lC + '" style="text-decoration:none;color:#666;font-weight:600;font-size:24px;">📑 Cloud PDF</a>';
              body += '</div>';
            }
            body += '</div>';
            try {
              if (createdNote.appendMarkdownComment) createdNote.appendMarkdownComment(body);
            } catch (e) { }
          } catch (e) { }
        }
      );
      Application.sharedInstance().refreshAfterDBChanged(topicId);
      try {
        if (newNote) Application.sharedInstance().showHUD('已创建卡片', self.view, 1.5);
      } catch (e) { }
      return false;
    }

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
              webView.evaluateJavaScript("(function(){ var c = window.__mnFetchCb && window.__mnFetchCb['" + id + "']; if(c) c(null, " + payload + "); })();", function(){});
            }, function(err) {
              var msg = (err && (err.message || err.toString)) ? (err.message || err.toString()) : String(err);
              var esc = (msg || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '').replace(/\n/g, '\\n');
              webView.evaluateJavaScript("(function(){ var c = window.__mnFetchCb && window.__mnFetchCb['" + id + "']; if(c) c('" + esc + "', null); })();", function(){});
            });
          } catch (e) {
            try { var p = JSON.parse(result); if (p && p.id) id = p.id; } catch (_) {}
            var msg = (e && (e.message || e.toString)) ? (e.message || e.toString()) : String(e);
            var esc = (msg || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '').replace(/\n/g, '\\n');
            webView.evaluateJavaScript("(function(){ var c = window.__mnFetchCb && window.__mnFetchCb['" + (id || '') + "']; if(c) c('" + esc + "', null); })();", function(){});
          }
        });
        return false;
    }
    return true;
  },

});
