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
    const htmlPath = self.mainPath ? (self.mainPath + '/web/index.html') : null;
    if (htmlPath) {
      self.webView.loadRequest(NSURLRequest.requestWithURL(NSURL.fileURLWithPath(htmlPath)));
    } else {
      self.webView.loadHTMLStringBaseURL('<html><body style="margin:20px;">mainPath not found. Unable to load index.html.</body></html>', null);
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
    let targetKey = '', targetVal = '';
    const parts = queryString.split('&');
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

    if (host === 'focusNote' || path.indexOf('focusNote') !== -1) {
      const queryString = SZZoteroBridge._getQueryString(url, urlString);
      SZZoteroBridge._handleFocusNote(self, queryString);
      return false;
    }

    if (host === 'downloadPdf' || path.indexOf('downloadPdf') !== -1) {
      const queryString = SZZoteroBridge._getQueryString(url, urlString);
      SZZoteroBridge._handleDownloadPdf(self, queryString);
      return false;
    }

    if (host === 'exportLiteratureNotes' || path.indexOf('exportLiteratureNotes') !== -1) {
      const queryString = SZZoteroBridge._getQueryString(url, urlString);
      SZZoteroBridge._handleExportLiteratureNotes(self, queryString);
      return false;
    }

    if (host === 'exportAllLiteratureNotes' || path.indexOf('exportAllLiteratureNotes') !== -1) {
      const queryString = SZZoteroBridge._getQueryString(url, urlString);
      SZZoteroBridge._handleExportAllLiteratureNotes(self, queryString);
      return false;
    }

    return true;
  }

  static _getQueryString(url, urlString) {
    const fallbackQuery = urlString.indexOf('?') !== -1 ? (urlString.split('?')[1] || '') : '';
    let queryString = '';
    try {
      let q = url.query;
      if (typeof q === 'function') q = q();
      if (q) queryString = String(q);
      else queryString = fallbackQuery;
    } catch (e) {
      queryString = fallbackQuery;
    }
    return queryString;
  }

  static _parseQueryString(queryString) {
    const params = {};
    if (!queryString) return params;
    const parts = String(queryString).split('&');
    for (const part of parts) {
      if (!part) continue;
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const k = decodeURIComponent(part.substring(0, eq));
      const v = decodeURIComponent(part.substring(eq + 1).replace(/\+/g, ' '));
      params[k] = v;
    }
    return params;
  }

  static _resolveCloudApiBaseUrl() {
    const defaults = NSUserDefaults.standardUserDefaults();
    let cloudApiBaseUrl = defaults.objectForKey('mn_zotero_config_cloud_api_baseurl');
    cloudApiBaseUrl = cloudApiBaseUrl ? String(cloudApiBaseUrl) : 'https://api.zotero.org';
    return cloudApiBaseUrl.replace(/\/+$/, '');
  }

  static _validateExportParams(self, params, requireTarget) {
    const mode = params.mode ? String(params.mode).trim() : '';
    const uid = params.uid ? String(params.uid).trim() : '';
    const key = params.key ? String(params.key).trim() : '';
    const noteId = params.noteId ? String(params.noteId).trim() : '';
    const itemKey = params.itemKey ? String(params.itemKey).trim() : '';

    if (mode !== 'C') {
      Application.sharedInstance().showHUD('This feature currently supports Cloud API only.', self.view, 2);
      return { ok: false };
    }
    if (!uid || !key) {
      Application.sharedInstance().showHUD('Missing Cloud API credentials.', self.view, 2);
      return { ok: false };
    }
    if (requireTarget && (!noteId || !itemKey)) {
      Application.sharedInstance().showHUD('Missing export target parameters.', self.view, 2);
      return { ok: false };
    }
    return { ok: true, uid, key, noteId, itemKey, mode };
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

  static _handleExportLiteratureNotes(self, queryString) {
    const params = SZZoteroBridge._parseQueryString(queryString);
    const validated = SZZoteroBridge._validateExportParams(self, params, true);
    if (!validated.ok) return;

    SZZoteroBridge._syncLiteratureTargets(self, [{ noteId: validated.noteId, itemKey: validated.itemKey }], {
      uid: validated.uid,
      key: validated.key
    });
  }

  static _handleExportAllLiteratureNotes(self, queryString) {
    const params = SZZoteroBridge._parseQueryString(queryString);
    const validated = SZZoteroBridge._validateExportParams(self, params, false);
    if (!validated.ok) return;

    const targetWindow = (self.addon && self.addon.window) ? self.addon.window : self.addonWindow;
    let list = [];
    if (targetWindow && typeof getSelectedLiteratureNotes === 'function') {
      try { list = getSelectedLiteratureNotes(targetWindow); } catch (e) { list = []; }
    }
    const targets = (Array.isArray(list) ? list : []).filter((item) => item && item.noteId && item.itemKey).map((item) => ({
      noteId: String(item.noteId),
      itemKey: String(item.itemKey)
    }));
    if (targets.length === 0) {
      Application.sharedInstance().showHUD('No literature cards selected.', self.view, 2);
      return;
    }
    SZZoteroBridge._syncLiteratureTargets(self, targets, {
      uid: validated.uid,
      key: validated.key
    });
  }

  static _syncLiteratureTargets(self, targets, auth) {
    const list = Array.isArray(targets) ? targets : [];
    if (list.length === 0) {
      Application.sharedInstance().showHUD('No sync targets found.', self.view, 2);
      return;
    }

    const baseUrl = SZZoteroBridge._resolveCloudApiBaseUrl();
    const pluginVersion = '0.5.0';
    const summary = { created: 0, updated: 0, deletedDuplicates: 0, failed: 0, empty: 0, total: list.length, authFailed: false };

    Application.sharedInstance().showHUD(`Pushing notes (${list.length})`, self.view, 1.2);

    let chain = Promise.resolve();
    list.forEach((target) => {
      chain = chain.then(() => {
        if (summary.authFailed) return;
        const payload = MNTreeExportService.buildLiteratureExportPayload(String(target.noteId), {
          pluginVersion: pluginVersion
        });
        if (!payload || !payload.ok) {
          summary.failed += 1;
          return;
        }
        if (!payload.entries || payload.entries.length === 0) {
          summary.empty += 1;
          return;
        }

        return ZoteroNoteSyncService.syncLiteraturePayload({
          uid: auth.uid,
          apiKey: auth.key,
          baseUrl: baseUrl,
          parentItem: String(target.itemKey),
          entries: payload.entries
        }).then((result) => {
          summary.created += result.created || 0;
          summary.updated += result.updated || 0;
          summary.deletedDuplicates += result.deletedDuplicates || 0;
          summary.failed += result.failed || 0;
          if (result.skippedEmpty) summary.empty += 1;
          if (result.authFailed) summary.authFailed = true;
        });
      });
    });

    chain.then(() => {
      if (summary.authFailed) {
        Application.sharedInstance().showHUD(`Authentication failed, stopped. Created ${summary.created}, updated ${summary.updated}, cleaned ${summary.deletedDuplicates}, failed ${summary.failed}.`, self.view, 3);
        return;
      }
      Application.sharedInstance().showHUD(`Push complete. Created ${summary.created}, updated ${summary.updated}, cleaned ${summary.deletedDuplicates}, failed ${summary.failed}, empty ${summary.empty}.`, self.view, 3);
    }).catch((err) => {
      const msg = String((err && err.message) ? err.message : err);
      Application.sharedInstance().showHUD(`Push failed: ${msg}`, self.view, 3);
    });
  }

  static _handleCreateNote(self, queryString) {
    const params = SZZoteroBridge._parseQueryString(queryString);
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
      Application.sharedInstance().showHUD('Please open a document first.', self.view, 2);
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

    // Delayed focus to allow UI to update
    if (newNote && studyController && studyController.focusNoteInMindMapById) {
      NSTimer.scheduledTimerWithTimeInterval(0.5, false, function () {
        studyController.focusNoteInMindMapById(newNote.noteId);
      });
    }

    if (newNote && params.itemKey) {
      SZZoteroBridge._attachToZotero(self, newNote, params);
    } else if (newNote) {
      Application.sharedInstance().showHUD('Card created.', self.view, 1.5);
    }
  }

  static _buildNoteBody(p) {
    const esc = (s) => !s ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const ya = [p.year, p.author].filter(Boolean).map(esc).join(' ');
    const type = esc(p.type);
    let l = '';
    if (p.lZ) l += `<a href="${p.lZ}">🔗 Open in Zotero</a>`;
    if (p.lP) l += `<a href="${p.lP}" style="color:#2a3">📑 Read PDF</a>`;
    if (p.lW) l += `<a href="${p.lW}" style="color:#f90">🌐 Web</a>`;
    if (p.lC) l += `<a href="${p.lC}" style="color:#96f">📑 Cloud PDF</a>`;
    if (!ya && !type && !l) return '';
    return `<style>a{text-decoration:none;font-weight:bolder}</style><div>${ya ? `<x style="color:#3;font:1.1em">${ya}</x>` : ''}${type ? ` <x style="color:#9;font:1em;background:#eee;padding:.1em .5em;border-radius:.4em">${type}</x>` : ''}${l ? `<div>${l}</div>` : ''}</div>`;
  }

  static _attachToZotero(self, note, p) {
    try {
      const { noteId } = note;
      if (!noteId) return;
      const notebookTitle = String(note.notebook.title || '');
      const attachmentTitle = notebookTitle ? `Open in MarginNote-${notebookTitle}` : 'Open in MarginNote';
      const uid = p.uid || '0';
      const isCloud = (p.mode === 'C');
      const url = isCloud ? `https://api.zotero.org/users/${uid}/items` : `http://localhost:23119/api/users/${uid}/items`;
      const headers = { 'Content-Type': 'application/json', 'Zotero-API-Version': '3' };
      if (isCloud && p.key) headers['Zotero-API-Key'] = p.key;
      const postBody = [{ itemType: 'attachment', linkMode: 'linked_url', parentItem: p.itemKey, title: attachmentTitle, url: `marginnote4app://note/${String(noteId)}` }];

      SZMNNetwork.fetch(url, { method: 'POST', headers: headers, json: postBody }).then(() => {
        Application.sharedInstance().showHUD('Card created.', self.view, 1.5);
      }, () => {
        Application.sharedInstance().showHUD('Card created, but failed to add Zotero attachment.', self.view, 2);
      });
    } catch (e) {
      Application.sharedInstance().showHUD('Card created.', self.view, 1.5);
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

  static _handleDownloadPdf(self, queryString) {
    if (!queryString) return;
    const params = {};
    const parts = queryString.split('&');
    for (const part of parts) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const k = decodeURIComponent(part.substring(0, eq));
      const v = decodeURIComponent(part.substring(eq + 1).replace(/\+/g, ' '));
      params[k] = v;
    }

    const uid = params.uid ? String(params.uid) : '';
    const attachmentKey = params.attachmentKey ? String(params.attachmentKey) : '';
    const requestId = params.requestId ? String(params.requestId) : '';
    if (!uid || !attachmentKey) {
      SZZoteroBridge._notifyDownloadResult(self.webView, requestId, false, 'missing-params');
      return;
    }

    const defaults = NSUserDefaults.standardUserDefaults();
    let cloudApiBaseUrl = defaults.objectForKey('mn_zotero_config_cloud_api_baseurl');
    cloudApiBaseUrl = cloudApiBaseUrl ? String(cloudApiBaseUrl) : 'https://api.zotero.org';
    cloudApiBaseUrl = cloudApiBaseUrl.replace(/\/+$/, '');
    const downloadUrl = `${cloudApiBaseUrl}/users/${encodeURIComponent(uid)}/items/${encodeURIComponent(attachmentKey)}/file`;

    const title = params.fileName ? String(params.fileName).trim() : '';
    const fileName = title ? (title.endsWith('.pdf') ? title : `${title}.pdf`) : `${attachmentKey}.pdf`;
    const headers = { 'Zotero-API-Version': '3' };
    if (params.key) headers['Zotero-API-Key'] = String(params.key);

    SZMNNetwork.downloadToDocumentPath(downloadUrl, {
      method: 'GET',
      headers: headers,
      subdirectory: 'Zotero Downloads',
      fileName: fileName,
      overwrite: true,
      timeout: 45
    }).then((result) => {
      try {
        SZZoteroBridge._importAndOpenDownloadedPdf(self, result && result.path ? result.path : '');
        SZZoteroBridge._notifyDownloadResult(self.webView, requestId, true, '');
      } catch (error) {
        const errorMsg = String((error && error.message) ? error.message : error);
        SZZoteroBridge._notifyDownloadResult(self.webView, requestId, false, errorMsg);
      }
    }, (error) => {
      const errorMsg = String(error);
      SZZoteroBridge._notifyDownloadResult(self.webView, requestId, false, errorMsg);
    });
  }

  static _importAndOpenDownloadedPdf(self, localPath) {
    const path = localPath ? String(localPath).trim() : '';
    if (!path) throw 'import-failed:empty-path';

    let fileUrl = path;
    try {
      const nsUrl = NSURL.fileURLWithPath(path);
      let absolute = nsUrl.absoluteString;
      if (typeof absolute === 'function') absolute = absolute();
      if (absolute) fileUrl = String(absolute);
    } catch (e) {
      // Fallback to plain path when file URL conversion is unavailable.
    }

    const app = Application.sharedInstance();
    let importRaw = '';
    try {
      importRaw = app.importDocument(fileUrl);
    } catch (e) {
      throw `import-failed:${String((e && e.message) ? e.message : e)}`;
    }

    const docMd5 = SZZoteroBridge._normalizeImportResultToDocMd5(importRaw);
    if (!docMd5) throw `import-failed:${String(importRaw || '')}`;

    let doc = undefined;
    try {
      doc = Database.sharedInstance().getDocumentById(docMd5);
    } catch (e) {
      doc = undefined;
    }
    if (!doc) throw `import-failed:${String(importRaw || docMd5)}`;

    const resolved = SZZoteroBridge._resolveCurrentNotebookId(self);
    const { studyController, notebookId } = resolved;

    if (!studyController || !studyController.openNotebookAndDocument) {
      throw 'open-failed:study-controller-unavailable';
    }

    try {
      studyController.openNotebookAndDocument(notebookId, docMd5);
    } catch (e) {
      throw `open-failed:${String((e && e.message) ? e.message : e)}`;
    }

    return { notebookId: notebookId, docMd5: docMd5 };
  }

  static _resolveCurrentNotebookId(self) {
    const targetWindow = (self.addon && self.addon.window) ? self.addon.window : self.addonWindow;
    const studyController = Application.sharedInstance().studyController(targetWindow);
    const notebookController = studyController && studyController.notebookController ? studyController.notebookController : null;

    const fromNotebookId = notebookController && notebookController.notebookId ? String(notebookController.notebookId).trim() : '';
    const fromCurrTopic = notebookController && notebookController.currTopic ? String(notebookController.currTopic).trim() : '';
    const fromCached = self && self.currentNotebookId ? String(self.currentNotebookId).trim() : '';

    const notebookId = fromNotebookId || fromCurrTopic || fromCached;
    if (!notebookId) {
      throw 'notebook-missing';
    }
    return { studyController: studyController, notebookId: notebookId };
  }

  static _normalizeImportResultToDocMd5(importResult) {
    return String(importResult || '').trim();
  }

  static _notifyDownloadResult(webView, requestId, ok, errorMsg) {
    if (!webView || !requestId) return;
    const escId = String(requestId).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '').replace(/\n/g, '\\n');
    const escError = String(errorMsg || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '').replace(/\n/g, '\\n');
    webView.evaluateJavaScript(`(function(){ if (window.onMNDownloadResult) window.onMNDownloadResult('${escId}', ${ok ? 'true' : 'false'}, '${escError}'); })();`, null);
  }

  static _handleFocusNote(self, queryString) {
    if (!queryString) return;
    let noteId = '';
    const parts = queryString.split('&');
    for (const part of parts) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      if (decodeURIComponent(part.substring(0, eq)) === 'noteId') {
        noteId = decodeURIComponent(part.substring(eq + 1).replace(/\+/g, ' '));
        break;
      }
    }
    if (!noteId) return;
    const targetWindow = (self.addon && self.addon.window) ? self.addon.window : self.addonWindow;
    const studyController = Application.sharedInstance().studyController(targetWindow);
    if (studyController && studyController.focusNoteInMindMapById) {
      studyController.focusNoteInMindMapById(noteId);
    }
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
    var errHTML = "<html><body style='margin:20px; font-family:-apple-system; color:#666;'><h3>Load failed</h3><p>" + String(error.localizedDescription || '').replace(/</g, '&lt;') + "</p></body></html>";
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
