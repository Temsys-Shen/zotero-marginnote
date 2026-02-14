JSB.require('network');
JSB.require('SelectedNotesHelper');

/**
 * UI 交互协调类：负责视图初始化、拖拽拖动、缩放、最大化等逻辑
 */
var SZWebUIHandler = class {
  static setupUI(controller) {
    const self = controller;
    // 1. View Setup
    self.navigationItem.title = 'Web';
    self.view.backgroundColor = UIColor.clearColor();
    self.view.layer.shadowOffset = { width: 0, height: 2 };
    self.view.layer.shadowRadius = 4;
    self.view.layer.shadowOpacity = 0.3;
    self.view.layer.shadowColor = UIColor.blackColor();
    self.view.layer.masksToBounds = false;

    const bounds = self.view.bounds;
    const initWidth = bounds.width > 0 ? bounds.width : 300;
    const initHeight = bounds.height > 0 ? bounds.height : 400;

    self._isMaximized = false;

    // Container view
    self.containerView = new UIView({ x: 0, y: 0, width: initWidth, height: initHeight });
    self.containerView.backgroundColor = UIColor.whiteColor();
    self.containerView.layer.cornerRadius = 10;
    self.containerView.layer.masksToBounds = true;
    self.containerView.layer.borderWidth = 0.5;
    self.containerView.layer.borderColor = UIColor.lightGrayColor().colorWithAlphaComponent(0.3);
    self.containerView.autoresizingMask = (1 << 1 | 1 << 4);
    self.view.addSubview(self.containerView);

    const titleHeight = 32;

    // 2. Title Bar
    self.titleBar = new UIView({ x: 0, y: 0, width: initWidth, height: titleHeight });
    self.titleBar.backgroundColor = UIColor.colorWithWhiteAlpha(0.96, 1);
    self.titleBar.autoresizingMask = (1 << 1);

    self.titleLabel = new UILabel({ x: 10, y: 0, width: initWidth - 20, height: titleHeight });
    self.titleLabel.text = "Zotero Connector";
    self.titleLabel.textAlignment = 1;
    self.titleLabel.font = UIFont.boldSystemFontOfSize(14);
    self.titleLabel.textColor = UIColor.darkGrayColor();
    self.titleLabel.autoresizingMask = (1 << 1);
    self.titleBar.addSubview(self.titleLabel);

    const panRecognizer = new UIPanGestureRecognizer(self, "handlePan:");
    self.titleBar.addGestureRecognizer(panRecognizer);

    const doubleTapRecognizer = new UITapGestureRecognizer(self, "handleTitleBarDoubleTap:");
    doubleTapRecognizer.numberOfTapsRequired = 2;
    self.titleBar.addGestureRecognizer(doubleTapRecognizer);
    panRecognizer.requireGestureRecognizerToFail(doubleTapRecognizer);
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
    self.webView.autoresizingMask = (1 << 1 | 1 << 4);
    self.webView.delegate = self;
    self.containerView.addSubview(self.webView);

    // 4. Resize Handle
    const resizeSize = 40;
    self.resizeHandle = new UIView({ x: initWidth - resizeSize, y: initHeight - resizeSize, width: resizeSize, height: resizeSize });
    self.resizeHandle.backgroundColor = UIColor.clearColor();
    self.resizeHandle.autoresizingMask = (1 << 0 | 1 << 3);
    self.resizeHandle.userInteractionEnabled = true;

    const resizeIcon = new UILabel({ x: 15, y: 15, width: 20, height: 20 });
    resizeIcon.text = "↘";
    resizeIcon.font = UIFont.systemFontOfSize(16);
    resizeIcon.textColor = UIColor.grayColor();
    resizeIcon.alpha = 0.5;
    self.resizeHandle.addSubview(resizeIcon);

    const resizeRecognizer = new UIPanGestureRecognizer(self, "handleResize:");
    self.resizeHandle.addGestureRecognizer(resizeRecognizer);

    const resDoubleTap = new UITapGestureRecognizer(self, "handleResizeDoubleTap:");
    resDoubleTap.numberOfTapsRequired = 2;
    self.resizeHandle.addGestureRecognizer(resDoubleTap);
    resizeRecognizer.requireGestureRecognizerToFail(resDoubleTap);

    self.containerView.addSubview(self.resizeHandle);
  }

  static handlePan(controller, recognizer) {
    const self = controller;
    const translation = recognizer.translationInView(self.view.superview);
    const center = self.view.center;
    const newCenter = { x: center.x + translation.x, y: center.y + translation.y };

    const frame = self.view.frame;
    const superviewBounds = self.view.superview ? self.view.superview.bounds : { x: 0, y: 0, width: 1920, height: 1080 };

    const minX = superviewBounds.x + frame.width / 2;
    const maxX = superviewBounds.x + superviewBounds.width - frame.width / 2;
    const minY = superviewBounds.y + frame.height / 2;
    const maxY = superviewBounds.y + superviewBounds.height - frame.height / 2;

    newCenter.x = Math.max(minX, Math.min(maxX, newCenter.x));
    newCenter.y = Math.max(minY, Math.min(maxY, newCenter.y));

    self.view.center = newCenter;
    recognizer.setTranslationInView({ x: 0, y: 0 }, self.view.superview);

    if (recognizer.state === 3) { // Ended
      SZConfigManager.saveFrameState(self);
    }
  }

  static handleResize(controller, recognizer) {
    const self = controller;
    const location = recognizer.locationInView(self.view.superview);
    if (recognizer.state === 1) { // Began
      self._resizeStartLocation = location;
      self._resizeStartFrame = self.view.frame;
    } else if (recognizer.state === 2) { // Changed
      if (!self._resizeStartLocation || !self._resizeStartFrame) return;

      const dx = location.x - self._resizeStartLocation.x;
      const dy = location.y - self._resizeStartLocation.y;

      let newWidth = Math.max(250, self._resizeStartFrame.width + dx);
      let newHeight = Math.max(300, self._resizeStartFrame.height + dy);

      const superviewBounds = self.view.superview ? self.view.superview.bounds : { x: 0, y: 0, width: 1920, height: 1080 };
      const maxX = superviewBounds.x + superviewBounds.width;
      const maxY = superviewBounds.y + superviewBounds.height;

      if (self._resizeStartFrame.x + newWidth > maxX) {
        newWidth = maxX - self._resizeStartFrame.x;
      }
      if (self._resizeStartFrame.y + newHeight > maxY) {
        newHeight = maxY - self._resizeStartFrame.y;
      }

      self.view.frame = {
        x: self._resizeStartFrame.x,
        y: self._resizeStartFrame.y,
        width: newWidth,
        height: newHeight
      };
      self.view.setNeedsLayout();
    } else if (recognizer.state === 3) { // Ended
      SZConfigManager.saveFrameState(self);
      self._resizeStartLocation = null;
      self._resizeStartFrame = null;
    }
  }

  static toggleMaximize(controller) {
    const self = controller;
    const superview = self.view.superview;
    const superviewBounds = superview ? superview.bounds : { x: 0, y: 0, width: 1920, height: 1080 };

    if (!self._isMaximized) {
      self.view.frame = {
        x: superviewBounds.x,
        y: superviewBounds.y,
        width: superviewBounds.width,
        height: superviewBounds.height
      };
      self._isMaximized = true;
    } else {
      const smallWidth = 400, smallHeight = 500;
      self.view.frame = {
        x: (superviewBounds.width - smallWidth) / 2,
        y: (superviewBounds.height - smallHeight) / 2,
        width: smallWidth,
        height: smallHeight
      };
      self._isMaximized = false;
    }
    SZConfigManager.saveFrameState(self);
  }

  static loadInitialPage(controller) {
    const self = controller;
    const htmlPath = self.mainPath ? (self.mainPath + '/webpage.html') : null;
    if (htmlPath) {
      self.webView.loadRequest(NSURLRequest.requestWithURL(NSURL.fileURLWithPath(htmlPath)));
    } else {
      self.webView.loadHTMLStringBaseURL('<html><body style="margin:20px;">未找到 mainPath，无法加载 webpage.html</body></html>', null);
    }
  }
}

/**
 * 配置管理类：负责 NSUserDefaults 读写与 WebView 脚本注入
 */
var SZConfigManager = class {
  static saveFrameState(controller) {
    const frame = controller.view.frame;
    const config = { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
    NSUserDefaults.standardUserDefaults().setObjectForKey(config, 'mn_zotero_frame_config');
  }

  static injectConfig(webView) {
    const keys = ['uid', 'slug', 'key', 'mode'];
    const config = {};
    const defaults = NSUserDefaults.standardUserDefaults();
    for (const key of keys) {
      const val = defaults.objectForKey('mn_zotero_config_' + key);
      if (val !== undefined && val !== null) {
        config[key] = String(val);
      }
    }
    const jsonStr = JSON.stringify(config);
    const esc = jsonStr.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '').replace(/\n/g, '\\n');
    webView.evaluateJavaScript(`(function(){ try { window.__mnConfig = JSON.parse('${esc}'); } catch (_) { window.__mnConfig = {}; } if (window.onMNConfig) window.onMNConfig(); })();`, null);
  }

  static setConfigFromUrl(queryString) {
    if (!queryString) return;
    const parts = queryString.split('&');
    for (const part of parts) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const k = decodeURIComponent(part.substring(0, eq));
      const v = decodeURIComponent(part.substring(eq + 1).replace(/\+/g, ' '));
      if (k === 'key') {
        NSUserDefaults.standardUserDefaults().setObjectForKey(v, 'mn_zotero_config_' + k);
      } else if (k === 'val') {
        // This setConfig bridge seems to expect key/val as separate params
        // But usually we set mn_zotero_config_TITLE where TITLE is the key.
        // Let's keep the logic but refine once we know which key to use.
      }
    }
    // Original logic was set mn_zotero_config_TITLE = val where TITLE is the 'key' param.
    // Let's stick to that.
    let targetKey = '', targetVal = '';
    for (const part of parts) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const k = decodeURIComponent(part.substring(0, eq));
      const v = decodeURIComponent(part.substring(eq + 1).replace(/\+/g, ' '));
      if (k === 'key') targetKey = v;
      else if (k === 'val') targetVal = v;
    }
    if (targetKey) {
      NSUserDefaults.standardUserDefaults().setObjectForKey(targetVal, 'mn_zotero_config_' + targetKey);
    }
  }
}

/**
 * Zotero 桥接类：处理 mnzotero:// 协议及相关的笔记创建、数据获取逻辑
 */
var SZZoteroBridge = class {
  static handleRequest(controller, request) {
    const self = controller;
    const { webView } = self;
    const url = request.URL();
    let urlString = '';
    try { urlString = url.absoluteString(); } catch (e) { urlString = url.absoluteString; }
    urlString = String(urlString || '');

    const host = String(url.host || '');
    const path = String(url.path || '');

    if (host === 'setConfig' || path.indexOf('setConfig') !== -1) {
      const queryString = SZZoteroBridge._getQueryString(url, urlString);
      SZConfigManager.setConfigFromUrl(queryString);
      return false;
    }

    if (host === 'getSelectedNotes' || path.indexOf('getSelectedNotes') !== -1) {
      SZZoteroBridge._handleGetSelectedNotes(self);
      return false;
    }

    if (host === 'createNote' || path.indexOf('createNote') !== -1) {
      const queryString = SZZoteroBridge._getQueryString(url, urlString);
      SZZoteroBridge._handleCreateNote(self, queryString);
      return false;
    }

    if (host === 'fetch' || path.indexOf('fetch') !== -1) {
      SZZoteroBridge._handleFetch(webView);
      return false;
    }

    return true;
  }

  static _getQueryString(url, urlString) {
    let queryString = '';
    try {
      let q = url.query;
      if (typeof q === 'function') q = q();
      if (q) queryString = String(q);
      else if (urlString.indexOf('?') !== -1) queryString = urlString.split('?')[1] || '';
    } catch (e) {
      if (urlString.indexOf('?') !== -1) queryString = urlString.split('?')[1] || '';
    }
    return queryString;
  }

  static _handleGetSelectedNotes(self) {
    const targetWindow = (self.addon && self.addon.window) ? self.addon.window : self.addonWindow;
    let list = [];
    if (targetWindow && typeof getSelectedLiteratureNotes === 'function') {
      try { list = getSelectedLiteratureNotes(targetWindow); } catch (e) { }
    }
    const jsonStr = JSON.stringify(list);
    const esc = jsonStr.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '').replace(/\n/g, '\\n');
    self.webView.evaluateJavaScript(`(function(){ try { window.__selectedNotes = JSON.parse('${esc}'); } catch (_) { window.__selectedNotes = []; } if (window.onSelectedNotes) window.onSelectedNotes(); })();`, null);
  }

  static _handleCreateNote(self, queryString) {
    const params = {};
    if (queryString) {
      const parts = queryString.split('&');
      for (const part of parts) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        const k = decodeURIComponent(part.substring(0, eq));
        const v = decodeURIComponent(part.substring(eq + 1).replace(/\+/g, ' '));
        params[k] = v;
      }
    }
    if (!params.title) return;

    const targetWindow = (self.addon && self.addon.window) ? self.addon.window : self.addonWindow;
    if (!targetWindow) return;

    const studyController = Application.sharedInstance().studyController(targetWindow);
    const notebookId = (studyController.notebookController && (studyController.notebookController.currTopic || studyController.notebookController.topicId)) || self.currentNotebookId;
    if (!notebookId) return;

    const db = Database.sharedInstance();
    const notebook = db.getNotebookById(notebookId);
    if (!notebook) return;
    const doc = (notebook.documents && notebook.documents.length > 0) ? notebook.documents[0] : (notebook.mainDocMd5 ? db.getDocumentById(notebook.mainDocMd5) : undefined);
    if (!doc) {
      Application.sharedInstance().showHUD('请先打开文档', self.view, 2);
      return;
    }

    const topicId = notebook.topicId || notebook.topicid;
    let newNote = undefined;
    UndoManager.sharedInstance().undoGrouping("Create Note", topicId, () => {
      try {
        const createdNote = Note.createWithTitleNotebookDocument(params.title, notebook, doc);
        newNote = createdNote;
        if (!createdNote) return;

        const body = SZZoteroBridge._buildNoteBody(params);
        if (body && createdNote.appendMarkdownComment) {
          createdNote.appendMarkdownComment(body);
        }
      } catch (e) { }
    });

    Application.sharedInstance().refreshAfterDBChanged(topicId);
    if (newNote && params.itemKey) {
      SZZoteroBridge._attachToZotero(self, newNote, params);
    } else if (newNote) {
      Application.sharedInstance().showHUD('已创建卡片', self.view, 1.5);
    }
  }

  static _buildNoteBody(p) {
    const hasMeta = (p.type || p.year || p.author);
    const hasLinks = (p.lZ || p.lP || p.lW || p.lC);
    if (!hasMeta && !hasLinks) return '';

    const esc = (s) => !s ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    let body = '<div style="font-family:sans-serif;padding:20px 28px;background:rgb(250,250,250);border-left:6px solid rgb(0,122,255);border-radius:6px;margin:14px 0;">';
    if (hasMeta) {
      body += '<div style="margin-bottom:12px;">';
      const ya = [p.year, p.author].filter(Boolean).join(' ');
      if (ya) body += `<span style="font-size:32px;font-weight:bold;color:rgb(51,51,51);margin-right:12px;">${esc(ya)}</span>`;
      if (p.type) body += `<span style="color:rgb(153,153,153);font-size:22px;border:1px solid rgb(221,221,221);padding:4px 14px;border-radius:12px;vertical-align:text-bottom;">${esc(p.type)}</span>`;
      body += '</div>';
    }
    if (hasLinks) {
      body += '<div style="display:flex;gap:24px;">';
      if (p.lZ) body += `<a href="${p.lZ}" style="text-decoration:none;color:rgb(0,122,255);font-weight:600;font-size:24px;">🔗 Open in Zotero</a>`;
      if (p.lP) body += `<a href="${p.lP}" style="text-decoration:none;color:rgb(46,125,50);font-weight:600;font-size:24px;">📑 Read PDF</a>`;
      if (p.lW) body += `<a href="${p.lW}" style="text-decoration:none;color:rgb(102,102,102);font-weight:600;font-size:24px;">🌐 Web</a>`;
      if (p.lC) body += `<a href="${p.lC}" style="text-decoration:none;color:rgb(102,102,102);font-weight:600;font-size:24px;">📑 Cloud PDF</a>`;
      body += '</div>';
    }
    body += '</div>';
    return body;
  }

  static _attachToZotero(self, note, p) {
    try {
      const { noteId } = note;
      if (!noteId) return;
      const notebookTitle = String(note.notebook.title || '');
      const attachmentTitle = notebookTitle ? `在MarginNote中打开-${notebookTitle}` : '在MarginNote中打开';
      const uid = p.uid || '0';
      const isCloud = (p.mode === 'C');
      const url = isCloud ? `https://api.zotero.org/users/${uid}/items` : `http://localhost:23119/api/users/${uid}/items`;
      const headers = { 'Content-Type': 'application/json', 'Zotero-API-Version': '3' };
      if (isCloud && p.key) headers['Zotero-API-Key'] = p.key;
      const postBody = [{ itemType: 'attachment', linkMode: 'linked_url', parentItem: p.itemKey, title: attachmentTitle, url: `marginnote4app://note/${String(noteId)}` }];

      SZMNNetwork.fetch(url, { method: 'POST', headers: headers, json: postBody }).then(() => {
        Application.sharedInstance().showHUD('已创建卡片', self.view, 1.5);
      }, () => {
        Application.sharedInstance().showHUD('已创建卡片，Zotero 附件添加失败', self.view, 2);
      });
    } catch (e) {
      Application.sharedInstance().showHUD('已创建卡片', self.view, 1.5);
    }
  }

  static _handleFetch(webView) {
    webView.evaluateJavaScript('window.__mnFetchPending', (result) => {
      if (!result) return;
      let id = null;
      try {
        const pending = JSON.parse(result);
        id = pending.id;
        const { url, options: opts } = pending;
        SZMNNetwork.fetch(url, {
          method: opts.method || 'GET',
          headers: opts.headers || {},
          body: opts.body,
          json: opts.json
        }).then((res) => {
          const payload = JSON.stringify({ ok: (res.status >= 200 && res.status < 300), status: res.status, body: res.json ? res.json() : res.text() });
          webView.evaluateJavaScript(`(function(){ var c = window.__mnFetchCb && window.__mnFetchCb['${id}']; if(c) c(null, ${payload}); })();`, null);
        }, (err) => {
          const msg = String(err.message || err);
          const esc = msg.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '').replace(/\n/g, '\\n');
          webView.evaluateJavaScript(`(function(){ var c = window.__mnFetchCb && window.__mnFetchCb['${id}']; if(c) c('${esc}', null); })();`, null);
        });
      } catch (e) {
        const msg = String(e.message || e);
        const esc = msg.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '').replace(/\n/g, '\\n');
        webView.evaluateJavaScript(`(function(){ var c = window.__mnFetchCb && window.__mnFetchCb['${id || ''}']; if(c) c('${esc}', null); })();`, null);
      }
    });
  }
}

/**
 * 主控制器类：维持 UIViewController 生命周期，委托逻辑给辅助类
 */
var SZWebViewController = JSB.defineClass('SZWebViewController : UIViewController <UIWebViewDelegate>', {
  viewDidLoad: function () {
    SZWebUIHandler.setupUI(self);
    SZWebUIHandler.loadInitialPage(self);
  },

  handlePan: function (recognizer) { SZWebUIHandler.handlePan(self, recognizer); },
  handleResize: function (recognizer) { SZWebUIHandler.handleResize(self, recognizer); },
  handleResizeDoubleTap: function () {
    var sb = self.view.superview ? self.view.superview.bounds : { x: 0, y: 0, width: 1920, height: 1080 };
    self.view.center = { x: sb.x + sb.width / 2, y: sb.y + sb.height / 2 };
    SZConfigManager.saveFrameState(self);
  },
  handleTitleBarDoubleTap: function () { SZWebUIHandler.toggleMaximize(self); },

  viewWillAppear: function () {
    self.webView.delegate = self;
    self.webView.evaluateJavaScript("typeof window.__onPanelShow==='function'&&window.__onPanelShow();", null);
  },
  viewWillDisappear: function () {
    self.webView.stopLoading();
    self.webView.delegate = null;
    UIApplication.sharedApplication().networkActivityIndicatorVisible = false;
  },
  webViewDidStartLoad: function () { UIApplication.sharedApplication().networkActivityIndicatorVisible = true; },
  webViewDidFinishLoad: function () {
    UIApplication.sharedApplication().networkActivityIndicatorVisible = false;
    SZConfigManager.injectConfig(self.webView);
  },
  webViewDidFailLoadWithError: function (wv, error) {
    UIApplication.sharedApplication().networkActivityIndicatorVisible = false;
    var errHTML = "<html><body style='margin:20px; font-family:-apple-system; color:#666;'><h3>加载失败</h3><p>" + String(error.localizedDescription || '').replace(/</g, '&lt;') + "</p></body></html>";
    self.webView.loadHTMLStringBaseURL(errHTML, null);
  },

  webViewShouldStartLoadWithRequestNavigationType: function (webView, request, type) {
    var url = request.URL();
    var scheme = String(url.scheme || '').toLowerCase();
    var urlString = String(url.absoluteString || '');

    if (scheme === 'zotero' || urlString.indexOf('zotero:') === 0 || scheme === 'http' || scheme === 'https') {
      Application.sharedInstance().openURL(url);
      return false;
    }

    if (scheme === 'mnzotero') {
      return SZZoteroBridge.handleRequest(self, request);
    }
    return true;
  }
});

