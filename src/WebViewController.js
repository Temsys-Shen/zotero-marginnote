/**
 * UI 交互协调类：负责视图初始化、拖拽拖动、缩放、最大化等逻辑
 */
var SZWebUIHandler = class {
  static setupUI(controller) {
    const self = controller;
    const MIN_WIDTH = 400;
    const DEFAULT_WIDTH = 400;
    const DEFAULT_HEIGHT = 480;
    // 1. View Setup
    self.navigationItem.title = t('window_title');
    self.view.backgroundColor = UIColor.clearColor();
    self.view.layer.shadowOffset = { width: 0, height: 2 };
    self.view.layer.shadowRadius = 4;
    self.view.layer.shadowOpacity = 0.3;
    self.view.layer.shadowColor = UIColor.blackColor();
    self.view.layer.masksToBounds = false;

    const bounds = self.view.bounds;
    const initWidth = bounds.width > 0 ? Math.max(MIN_WIDTH, bounds.width) : DEFAULT_WIDTH;
    const initHeight = bounds.height > 0 ? bounds.height : DEFAULT_HEIGHT;

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

    self.titleLabel = new UILabel({ x: 40, y: 0, width: initWidth - 80, height: titleHeight });
    self.titleLabel.text = t('app_title');
    self.titleLabel.textAlignment = 1;
    self.titleLabel.font = UIFont.boldSystemFontOfSize(14);
    self.titleLabel.textColor = UIColor.darkGrayColor();
    self.titleLabel.autoresizingMask = (1 << 1);
    self.titleBar.addSubview(self.titleLabel);

    // 2.1 Close Button (Native)
    // Position it at the top left
    self.closeButton = new UIButton({ x: 5, y: 0, width: titleHeight, height: titleHeight });
    self.closeButton.setTitleForState("×", 0);
    self.closeButton.setTitleColorForState(UIColor.grayColor(), 0);
    self.closeButton.titleLabel.font = UIFont.systemFontOfSize(24);
    self.closeButton.addTargetActionForControlEvents(self, "closeWindow", 1 << 0); // UIControlEventTouchDown
    self.titleBar.addSubview(self.closeButton);

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
    const MIN_WIDTH = 400;
    const location = recognizer.locationInView(self.view.superview);
    if (recognizer.state === 1) { // Began
      self._resizeStartLocation = location;
      self._resizeStartFrame = self.view.frame;
    } else if (recognizer.state === 2) { // Changed
      if (!self._resizeStartLocation || !self._resizeStartFrame) return;

      const dx = location.x - self._resizeStartLocation.x;
      const dy = location.y - self._resizeStartLocation.y;

      let newWidth = Math.max(MIN_WIDTH, self._resizeStartFrame.width + dx);
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
  static getDefaultFieldTemplates() {
    return {
      version: '2',
      layout: {
        rows: [
          {
            id: 'row_default_1',
            blocks: [
              { id: 'block_default_author', field: 'author', template: 'by {{value}}' },
              { id: 'block_default_year', field: 'year', template: '({{value}})' }
            ]
          },
          {
            id: 'row_default_2',
            blocks: [
              { id: 'block_default_type', field: 'type', template: '<z style="color:#9;font:1em;background:#eee;padding:.1em .5em;border-radius:.4em">{{value}}</z>' }
            ]
          },
          {
            id: 'row_default_3',
            blocks: [
              { id: 'block_default_extra', field: 'extra', template: '{{value}}' }
            ]
          }
        ]
      }
    };
  }

  static normalizeFieldTemplates(rawTemplates) {
    const defaults = SZConfigManager.getDefaultFieldTemplates();
    if (rawTemplates === undefined || rawTemplates === null || rawTemplates === '') {
      return defaults;
    }

    let parsed = rawTemplates;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (e) {
        return defaults;
      }
    }

    if (!parsed || typeof parsed !== 'object') {
      return defaults;
    }

    if (String(parsed.version || '') !== '2' || !parsed.layout || !Array.isArray(parsed.layout.rows)) {
      return defaults;
    }

    const rows = [];
    for (let i = 0; i < parsed.layout.rows.length; i++) {
      const rowRaw = parsed.layout.rows[i];
      if (!rowRaw || typeof rowRaw !== 'object') continue;
      const rowIdRaw = rowRaw.id !== undefined && rowRaw.id !== null ? String(rowRaw.id).trim() : '';
      const rowId = rowIdRaw || ('row_' + i);
      const blocksRaw = Array.isArray(rowRaw.blocks) ? rowRaw.blocks : [];
      const blocks = [];
      for (let j = 0; j < blocksRaw.length; j++) {
        const blockRaw = blocksRaw[j];
        if (!blockRaw || typeof blockRaw !== 'object') continue;
        const field = blockRaw.field !== undefined && blockRaw.field !== null ? String(blockRaw.field).trim() : '';
        if (!field) continue;
        const blockIdRaw = blockRaw.id !== undefined && blockRaw.id !== null ? String(blockRaw.id).trim() : '';
        const templateRaw = blockRaw.template !== undefined && blockRaw.template !== null ? String(blockRaw.template) : '';
        blocks.push({
          id: blockIdRaw || (rowId + '_block_' + j),
          field: field,
          template: templateRaw || '{{value}}'
        });
      }
      rows.push({ id: rowId, blocks: blocks });
    }

    if (rows.length === 0) rows.push({ id: 'row_default_1', blocks: [] });

    const normalized = {
      version: '2',
      layout: {
        rows: rows
      }
    };
    return normalized;
  }

  static saveFrameState(controller) {
    const frame = controller.view.frame;
    const config = { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
    NSUserDefaults.standardUserDefaults().setObjectForKey(config, 'mn_zotero_frame_config');
  }

  static injectConfig(webView) {
    const keys = [
      'uid',
      'slug',
      'key',
      'mode',
      'cloud_api_baseurl',
      'onboarding_seen_v1',
      'onboarding_force_show_once'
    ];
    const config = {};
    const defaults = NSUserDefaults.standardUserDefaults();
    for (const key of keys) {
      const val = defaults.objectForKey('mn_zotero_config_' + key);
      if (val !== undefined && val !== null) {
        config[key] = String(val);
      }
    }
    const rawFieldTemplates = defaults.objectForKey('mn_zotero_config_fieldTemplates');
    config.fieldTemplates = SZConfigManager.normalizeFieldTemplates(rawFieldTemplates);
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

    if (host === 'checkDocument' || path.indexOf('checkDocument') !== -1) {
      const queryString = SZZoteroBridge._getQueryString(url, urlString);
      SZZoteroBridge._handleCheckDocument(self, queryString);
      return false;
    }

    if (host === 'checkDocuments' || path.indexOf('checkDocuments') !== -1) {
      const queryString = SZZoteroBridge._getQueryString(url, urlString);
      SZZoteroBridge._handleCheckDocuments(self, queryString);
      return false;
    }


    if (host === 'openDocument' || path.indexOf('openDocument') !== -1) {
      const queryString = SZZoteroBridge._getQueryString(url, urlString);
      SZZoteroBridge._handleOpenDocument(self, queryString);
      return false;
    }

    if (host === 'importAnnotations' || path.indexOf('importAnnotations') !== -1) {
      const queryString = SZZoteroBridge._getQueryString(url, urlString);
      SZZoteroBridge._handleImportAnnotations(self, queryString);
      return false;
    }

    if (host === 'favoritesTag' || path.indexOf('favoritesTag') !== -1) {
      const queryString = SZZoteroBridge._getQueryString(url, urlString);
      SZZoteroBridge._handleFavoritesTag(self, queryString);
      return false;
    }

    if (host === 'favorites' || path.indexOf('favorites') !== -1) {
      const queryString = SZZoteroBridge._getQueryString(url, urlString);
      SZZoteroBridge._handleFavorites(self, queryString);
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

  static _favoritesStorageKey() {
    return 'mn_zotero_favorites_state_v1';
  }

  static _loadFavoritesState() {
    const defaults = NSUserDefaults.standardUserDefaults();
    const raw = defaults.objectForKey(SZZoteroBridge._favoritesStorageKey());
    if (!raw) return { items: [], tags: [] };
    let parsed = raw;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (e) {
        return { items: [], tags: [] };
      }
    }
    if (!parsed || typeof parsed !== 'object') return { items: [], tags: [] };
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : []
    };
  }

  static _saveFavoritesState(state) {
    const normalized = {
      items: Array.isArray(state && state.items) ? state.items : [],
      tags: Array.isArray(state && state.tags) ? state.tags : []
    };
    NSUserDefaults.standardUserDefaults().setObjectForKey(JSON.stringify(normalized), SZZoteroBridge._favoritesStorageKey());
  }

  static _emitFavoritesState(webView, state) {
    if (!webView) return;
    const payload = JSON.stringify({
      items: Array.isArray(state && state.items) ? state.items : [],
      tags: Array.isArray(state && state.tags) ? state.tags : []
    });
    const esc = payload.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '').replace(/\n/g, '\\n');
    webView.evaluateJavaScript(`(function(){ try { window.__mnFavoritesPayload = JSON.parse('${esc}'); } catch (_) { window.__mnFavoritesPayload = {items:[],tags:[]}; } if (window.onMNFavoritesList) window.onMNFavoritesList(); })();`, null);
  }

  static _decodeJsonParam(raw, fallback) {
    if (!raw) return fallback;
    try {
      return JSON.parse(String(raw));
    } catch (e) {
      return fallback;
    }
  }

  static _normalizeFavoriteEntry(entry) {
    if (!entry || typeof entry !== 'object') return null;
    const key = entry.itemKey ? String(entry.itemKey).trim() : '';
    if (!key) return null;
    return {
      itemKey: key,
      snapshot: (entry.snapshot && typeof entry.snapshot === 'object') ? entry.snapshot : {},
      tags: Array.isArray(entry.tags) ? entry.tags.map((t) => String(t)) : [],
      hasPdf: !!entry.hasPdf,
      hasPdfAnnotations: !!entry.hasPdfAnnotations,
      attachmentKey: entry.attachmentKey ? String(entry.attachmentKey) : '',
      pdfFilename: entry.pdfFilename ? String(entry.pdfFilename) : '',
      docMd5: entry.docMd5 ? String(entry.docMd5) : '',
      uid: entry.uid ? String(entry.uid) : '',
      apiKey: entry.apiKey ? String(entry.apiKey) : '',
      slug: entry.slug ? String(entry.slug) : '',
      createNoteQuery: entry.createNoteQuery ? String(entry.createNoteQuery) : '',
      author: entry.author ? String(entry.author) : '',
      updatedAt: Date.now()
    };
  }

  static _mergeTagsFromItems(state) {
    const tagSet = {};
    const list = Array.isArray(state && state.items) ? state.items : [];
    list.forEach((entry) => {
      const tags = Array.isArray(entry && entry.tags) ? entry.tags : [];
      tags.forEach((tag) => {
        const name = String(tag || '').trim();
        if (name) tagSet[name] = true;
      });
    });
    const fixed = Array.isArray(state && state.tags) ? state.tags : [];
    fixed.forEach((tag) => {
      const name = String(tag || '').trim();
      if (name) tagSet[name] = true;
    });
    state.tags = Object.keys(tagSet).sort();
  }

  static _getFavoriteEntryByKey(state, itemKey) {
    const key = String(itemKey || '');
    const list = Array.isArray(state && state.items) ? state.items : [];
    for (let i = 0; i < list.length; i++) {
      if (String(list[i].itemKey || '') === key) return { index: i, entry: list[i] };
    }
    return { index: -1, entry: null };
  }

  static _handleFavorites(self, queryString) {
    const params = SZZoteroBridge._parseQueryString(queryString);
    const action = params.action ? String(params.action) : 'list';
    const state = SZZoteroBridge._loadFavoritesState();

    if (action === 'list') {
      SZZoteroBridge._emitFavoritesState(self.webView, state);
      return;
    }

    if (action === 'toggle') {
      const entry = SZZoteroBridge._normalizeFavoriteEntry(SZZoteroBridge._decodeJsonParam(params.payload, null));
      if (!entry) return;
      const found = SZZoteroBridge._getFavoriteEntryByKey(state, entry.itemKey);
      if (found.index >= 0) state.items.splice(found.index, 1);
      else state.items.unshift(entry);
      SZZoteroBridge._mergeTagsFromItems(state);
      SZZoteroBridge._saveFavoritesState(state);
      return;
    }

    if (action === 'upsert') {
      const entry = SZZoteroBridge._normalizeFavoriteEntry(SZZoteroBridge._decodeJsonParam(params.payload, null));
      if (!entry) return;
      const found = SZZoteroBridge._getFavoriteEntryByKey(state, entry.itemKey);
      if (found.index >= 0) state.items[found.index] = Object.assign({}, found.entry, entry);
      else state.items.unshift(entry);
      SZZoteroBridge._mergeTagsFromItems(state);
      SZZoteroBridge._saveFavoritesState(state);
      return;
    }

    if (action === 'bulkUpsert') {
      const list = SZZoteroBridge._decodeJsonParam(params.payload, []);
      if (!Array.isArray(list)) return;
      list.forEach((raw) => {
        const entry = SZZoteroBridge._normalizeFavoriteEntry(raw);
        if (!entry) return;
        const found = SZZoteroBridge._getFavoriteEntryByKey(state, entry.itemKey);
        if (found.index >= 0) state.items[found.index] = Object.assign({}, found.entry, entry);
        else state.items.unshift(entry);
      });
      SZZoteroBridge._mergeTagsFromItems(state);
      SZZoteroBridge._saveFavoritesState(state);
      return;
    }

    if (action === 'batchImport') {
      const payload = SZZoteroBridge._decodeJsonParam(params.payload, {});
      SZZoteroBridge._handleFavoritesBatchImport(self, payload);
      return;
    }
  }

  static _handleFavoritesTag(self, queryString) {
    const params = SZZoteroBridge._parseQueryString(queryString);
    const action = params.action ? String(params.action) : '';
    const tagId = params.tagId ? String(params.tagId).trim() : '';
    const newName = params.newName ? String(params.newName).trim() : '';
    const itemKeys = SZZoteroBridge._decodeJsonParam(params.itemKeys, []);
    const keys = Array.isArray(itemKeys) ? itemKeys.map((k) => String(k)) : [];
    const state = SZZoteroBridge._loadFavoritesState();

    if (action === 'create') {
      if (!tagId) return;
      if (state.tags.indexOf(tagId) === -1) state.tags.push(tagId);
    } else if (action === 'rename') {
      if (!tagId || !newName) return;
      state.tags = state.tags.map((tag) => (tag === tagId ? newName : tag));
      state.items.forEach((entry) => {
        if (!Array.isArray(entry.tags)) return;
        entry.tags = entry.tags.map((tag) => (tag === tagId ? newName : tag));
      });
    } else if (action === 'delete') {
      if (!tagId) return;
      state.tags = state.tags.filter((tag) => tag !== tagId);
      state.items.forEach((entry) => {
        if (!Array.isArray(entry.tags)) return;
        entry.tags = entry.tags.filter((tag) => tag !== tagId);
      });
    } else if (action === 'apply') {
      if (!tagId || keys.length === 0) return;
      if (state.tags.indexOf(tagId) === -1) state.tags.push(tagId);
      keys.forEach((key) => {
        const found = SZZoteroBridge._getFavoriteEntryByKey(state, key);
        if (!found.entry) return;
        if (!Array.isArray(found.entry.tags)) found.entry.tags = [];
        if (found.entry.tags.indexOf(tagId) === -1) found.entry.tags.push(tagId);
      });
    } else if (action === 'remove') {
      if (!tagId || keys.length === 0) return;
      keys.forEach((key) => {
        const found = SZZoteroBridge._getFavoriteEntryByKey(state, key);
        if (!found.entry || !Array.isArray(found.entry.tags)) return;
        found.entry.tags = found.entry.tags.filter((tag) => tag !== tagId);
      });
    } else if (action === 'clear') {
      if (keys.length === 0) return;
      keys.forEach((key) => {
        const found = SZZoteroBridge._getFavoriteEntryByKey(state, key);
        if (!found.entry) return;
        found.entry.tags = [];
      });
    } else {
      return;
    }

    SZZoteroBridge._mergeTagsFromItems(state);
    SZZoteroBridge._saveFavoritesState(state);
    SZZoteroBridge._emitFavoritesState(self.webView, state);
  }

  static _configValue(name, defaultValue) {
    const raw = NSUserDefaults.standardUserDefaults().objectForKey('mn_zotero_config_' + name);
    if (raw === undefined || raw === null) return defaultValue;
    return String(raw);
  }

  static _handleFavoritesBatchImport(self, payload) {
    const data = payload && typeof payload === 'object' ? payload : {};
    const options = data.options && typeof data.options === 'object' ? data.options : {};
    const items = Array.isArray(data.items) ? data.items : [];
    const result = { success: 0, skipped: 0, failed: 0 };
    const fallbackUid = SZZoteroBridge._configValue('uid', '0');
    const fallbackKey = SZZoteroBridge._configValue('key', '');
    let index = 0;

    const finishAll = () => {
      Application.sharedInstance().showHUD(t('favorites_batch_import_done') + ' ' + t('favorites_batch_import_report', {
        success: String(result.success),
        skipped: String(result.skipped),
        failed: String(result.failed)
      }), self.view, 2);

      const resultJson = JSON.stringify(result).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      self.webView.evaluateJavaScript(`(function(){ try { window.__mnBatchImportResult = JSON.parse('${resultJson}'); } catch (_) { window.__mnBatchImportResult = {success:0,skipped:0,failed:0}; } if (window.onMNBatchImportResult) window.onMNBatchImportResult(); })();`, null);
    };

    const processNext = () => {
      if (index >= items.length) {
        finishAll();
        return;
      }

      const rawItem = items[index++];
      const item = SZZoteroBridge._normalizeFavoriteEntry(rawItem);
      if (!item) {
        result.failed += 1;
        processNext();
        return;
      }

      let cardCreated = false;
      let postItemDelay = 0;
      if (options.card) {
        if (item.createNoteQuery) {
          try {
            SZZoteroBridge._handleCreateNote(self, item.createNoteQuery);
            result.success += 1;
            cardCreated = true;
          } catch (e) {
            result.failed += 1;
          }
        } else {
          result.skipped += 1;
        }
      }

      if (options.pdf) {
        if (item.docMd5) {
          try {
            SZZoteroBridge._handleOpenDocument(self, 'docMd5=' + encodeURIComponent(item.docMd5));
            result.success += 1;
            postItemDelay = 0.5;
          } catch (e) {
            result.failed += 1;
          }
        } else {
          result.skipped += 1;
        }
      }

      const scheduleNext = () => {
        if (postItemDelay > 0) {
          NSTimer.scheduledTimerWithTimeInterval(postItemDelay, false, function () {
            processNext();
          });
          return;
        }
        processNext();
      };

      const runAnnotation = () => {
        if (!options.annotation) {
          scheduleNext();
          return;
        }

        if (options.card && !cardCreated) {
          result.skipped += 1;
          scheduleNext();
          return;
        }

        if (!item.attachmentKey || !item.itemKey) {
          result.skipped += 1;
          scheduleNext();
          return;
        }

        const uid = item.uid || fallbackUid;
        const apiKey = item.apiKey || fallbackKey;
        const q = [
          'parentKey=' + encodeURIComponent(item.itemKey),
          'attachmentKey=' + encodeURIComponent(item.attachmentKey),
          'uid=' + encodeURIComponent(uid),
          'key=' + encodeURIComponent(apiKey)
        ].join('&');

        try {
          SZZoteroBridge._handleImportAnnotations(self, q);
          result.success += 1;
        } catch (e) {
          result.failed += 1;
        }
        scheduleNext();
      };

      // Ensure annotation import starts after card creation settles in UI/DB.
      if (options.annotation && options.card && cardCreated) {
        NSTimer.scheduledTimerWithTimeInterval(0.35, false, function () {
          runAnnotation();
        });
      } else {
        runAnnotation();
      }
    };

    processNext();
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
      Application.sharedInstance().showHUD(t('this_feature_supports_cloud_api_only'), self.view, 2);
      return { ok: false };
    }
    if (!uid || !key) {
      Application.sharedInstance().showHUD(t('missing_cloud_api_credentials'), self.view, 2);
      return { ok: false };
    }
    if (requireTarget && (!noteId || !itemKey)) {
      Application.sharedInstance().showHUD(t('missing_export_target_parameters'), self.view, 2);
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
      Application.sharedInstance().showHUD(t('no_literature_cards_selected'), self.view, 2);
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
      Application.sharedInstance().showHUD(t('no_sync_targets_found'), self.view, 2);
      return;
    }

    const baseUrl = SZZoteroBridge._resolveCloudApiBaseUrl();
    const pluginVersion = '0.5.0';
    const summary = { created: 0, updated: 0, deletedDuplicates: 0, failed: 0, empty: 0, total: list.length, authFailed: false };

    Application.sharedInstance().waitHUDOnView(t('pushing_notes'), self.view);

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
      Application.sharedInstance().stopWaitHUDOnView(self.view);
      if (summary.authFailed) {
        Application.sharedInstance().showHUD(t('authentication_failed') + ', stopped. ' + t('found_items').replace('{count}', summary.created + ', ' + t('updated') + ' ' + summary.updated + ', ' + t('cleaned') + ' ' + summary.deletedDuplicates + ', ' + t('failed') + ' ' + summary.failed), self.view, 3);
        return;
      }
      Application.sharedInstance().showHUD(t('push_complete') + '. ' + t('found_items').replace('{count}', summary.created + ', ' + t('updated') + ' ' + summary.updated + ', ' + t('cleaned') + ' ' + summary.deletedDuplicates + ', ' + t('failed') + ' ' + summary.failed + ', ' + t('empty') + ' ' + summary.empty) + '.', self.view, 3);
    }).catch((err) => {
      Application.sharedInstance().stopWaitHUDOnView(self.view);
      const msg = String((err && err.message) ? err.message : err);
      Application.sharedInstance().showHUD(t('push_failed') + ': ' + msg, self.view, 3);
    });
  }

  static _handleCreateNote(self, queryString) {
    const params = SZZoteroBridge._parseQueryString(queryString);
    if (!params.title) return;

    const targetWindow = (self.addon && self.addon.window) ? self.addon.window : self.addonWindow;
    if (!targetWindow) return;

    const studyController = Application.sharedInstance().studyController(targetWindow);
    const resolved = SZZoteroBridge._resolveCreateTargetContext(self, studyController);
    if (!resolved || !resolved.ok) return;
    const notebook = resolved.notebook;
    const doc = resolved.document;
    const topicId = resolved.topicId;
    const parentNote = resolved.parentNote;
    if (!doc || !notebook) {
      Application.sharedInstance().showHUD(t('please_open_a_document_first'), self.view, 2);
      return;
    }

    let newNote = undefined;
    UndoManager.sharedInstance().undoGrouping("Create Note", topicId, () => {
      try {
        const createdNote = Note.createWithTitleNotebookDocument(params.title, notebook, doc);
        newNote = createdNote;
        if (!createdNote) return;

        if (parentNote) {
          parentNote.addChild(createdNote);
        }

        const templatesHtml = SZZoteroBridge._getTemplatesHtml(params);
        const body = SZZoteroBridge._buildNoteBody(params, templatesHtml);
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
      Application.sharedInstance().showHUD(t('card_created'), self.view, 1.5);
    }
  }

  static _resolveCreateTargetContext(self, studyController) {
    if (!studyController) {
      Application.sharedInstance().showHUD(t('please_open_a_document_first'), self.view, 2);
      return { ok: false };
    }
    const db = Database.sharedInstance();
    const notebookController = studyController.notebookController;
    const fromTopicId = notebookController && notebookController.topicId ? String(notebookController.topicId).trim() : '';
    const fromNotebookId = notebookController && notebookController.notebookId ? String(notebookController.notebookId).trim() : '';
    const fromCached = self && self.currentNotebookId ? String(self.currentNotebookId).trim() : '';
    const notebookId = fromTopicId || fromNotebookId || fromCached;
    if (!notebookId) {
      Application.sharedInstance().showHUD(t('please_open_a_document_first'), self.view, 2);
      return { ok: false };
    }

    const notebook = db.getNotebookById(notebookId);
    if (!notebook) {
      Application.sharedInstance().showHUD(t('please_open_a_document_first'), self.view, 2);
      return { ok: false };
    }

    const readerController = studyController.readerController;
    const docController = readerController ? readerController.currentDocumentController : null;
    let document = docController ? docController.document : null;
    if (!document) {
      const docMd5 = docController && docController.docMd5 ? String(docController.docMd5).trim() : '';
      if (docMd5) document = db.getDocumentById(docMd5);
    }
    if (!document && notebook.mainDocMd5) {
      document = db.getDocumentById(String(notebook.mainDocMd5));
    }
    if (!document && notebook.documents && notebook.documents.length > 0) {
      document = notebook.documents[0];
    }
    if (!document) {
      Application.sharedInstance().showHUD(t('please_open_a_document_first'), self.view, 2);
      return { ok: false };
    }

    const selectedNote = SZZoteroBridge._getFirstSelectedNote(studyController);
    const parentNote = SZZoteroBridge._resolveCreateParentNote(selectedNote);
    const topicId = notebook.topicId || notebook.topicid;
    return { ok: true, notebook: notebook, document: document, topicId: topicId, parentNote: parentNote };
  }

  static _getFirstSelectedNote(studyController) {
    if (!studyController || !studyController.notebookController) return null;
    const nc = studyController.notebookController;
    const mindmapView = nc.mindmapView || nc.mindMapView || nc.noteMindMap;
    if (!mindmapView) return null;
    const selViewLst = mindmapView.selViewLst;
    if (!selViewLst) return null;

    const count = selViewLst.length !== undefined
      ? selViewLst.length
      : (typeof selViewLst.count === 'function' ? selViewLst.count() : (selViewLst.count !== undefined ? selViewLst.count : 0));
    if (!count) return null;

    const first = selViewLst.objectAtIndex ? selViewLst.objectAtIndex(0) : selViewLst[0];
    if (!first) return null;
    const node = first.note !== undefined ? first.note : first;
    const note = node && node.note !== undefined ? node.note : node;
    if (!note || !note.noteId) return null;
    return note;
  }

  static _resolveCreateParentNote(selectedNote) {
    if (!selectedNote) return null;
    if (!SZZoteroBridge._isLiteratureNote(selectedNote)) return selectedNote;
    const parentNote = selectedNote.parentNote;
    if (parentNote && parentNote.noteId) return parentNote;
    return null;
  }

  static _isLiteratureNote(note) {
    const zoteroItemRe = /zotero:\/\/select\/library\/items(?:\/|\?itemKey=)([^"'\s&\/>]+)/;
    return !!SZZoteroBridge._extractItemKeyFromNote(note, zoteroItemRe);
  }

  static _extractItemKeyFromNote(note, re) {
    if (!note || !re) return '';
    const comments = note.comments;
    if (!comments) return '';
    const cnt = comments.length !== undefined
      ? comments.length
      : (typeof comments.count === 'function' ? comments.count() : (comments.count !== undefined ? comments.count : 0));
    if (!cnt) return '';
    for (let j = 0; j < cnt; j++) {
      const c = comments.objectAtIndex ? comments.objectAtIndex(j) : comments[j];
      if (!c) continue;
      let raw = '';
      if (c.html !== undefined) raw = (typeof c.html === 'function' ? c.html() : c.html) || '';
      if (!raw && c.text !== undefined) raw = (typeof c.text === 'function' ? c.text() : c.text) || '';
      if (!raw) continue;
      const m = String(raw).match(re);
      if (m && m[1]) return String(m[1]);
    }
    return '';
  }

  static _getTemplatesHtml(params) {
    if (!params || !params.templatesHtml) return '';
    return String(params.templatesHtml);
  }

  static _buildNoteBody(p, templatesHtml) {
    const esc = (s) => !s ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    var dynamicHtml = templatesHtml || '';

    let l = '';
    if (p.lZ) l += '<a href="' + esc(p.lZ) + '">🔗 Open in Zotero</a>';
    if (p.lP) l += '<a href="' + esc(p.lP) + '" style="color:#2a3">📑 Read PDF</a>';
    if (p.lW) l += '<a href="' + esc(p.lW) + '" style="color:#f90">🌐 Web</a>';
    if (p.lC) l += '<a href="' + esc(p.lC) + '" style="color:#96f">📑 Cloud PDF</a>';

    if (!dynamicHtml && !l) return '';

    var result = '<style>a{text-decoration:none;font-weight:bolder}.custom-field-row{margin:2px 0}.custom-field-row .custom-field-block{display:inline-block;margin-right:6px}</style><div>';
    if (dynamicHtml) result += '<div class="custom-fields">' + dynamicHtml + '</div>';
    if (l) result += '<div>' + l + '</div>';
    result += '</div>';

    return result;
  }

  static _attachToZotero(self, note, p) {
    try {
      const { noteId } = note;
      if (!noteId) {
        Application.sharedInstance().showHUD(t('card_created'), self.view, 1.5);
        return;
      }
      // Local API in current Zotero Connector does not support POST /items, keep card creation only.
      if (p.mode !== 'C') {
        Application.sharedInstance().showHUD(t('card_created'), self.view, 1.5);
        return;
      }
      const notebookTitle = (note && note.notebook && note.notebook.title !== undefined && note.notebook.title !== null) ? String(note.notebook.title) : '';
      const attachmentTitle = notebookTitle ? 'Open in MarginNote-' + notebookTitle : 'Open in MarginNote';
      const uid = p.uid || '0';
      const url = 'https://api.zotero.org/users/' + uid + '/items';
      const headers = { 'Content-Type': 'application/json', 'Zotero-API-Version': '3' };
      if (p.key) headers['Zotero-API-Key'] = p.key;
      const postBody = [{ itemType: 'attachment', linkMode: 'linked_url', parentItem: p.itemKey, title: attachmentTitle, url: 'marginnote4app://note/' + String(noteId) }];

      SZMNNetwork.fetch(url, { method: 'POST', headers: headers, json: postBody }).then(() => {
        Application.sharedInstance().showHUD(t('card_created'), self.view, 1.5);
      }, () => {
        Application.sharedInstance().showHUD(t('card_created_but_failed_to_add_zotero_attachment'), self.view, 2);
      });
    } catch (e) {
      Application.sharedInstance().showHUD(t('card_created'), self.view, 1.5);
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
          webView.evaluateJavaScript('(function(){ var c = window.__mnFetchCb && window.__mnFetchCb[\'' + id + '\']; if(c) c(null, ' + payload + '); })();', null);
        }, (err) => {
          const msg = String(err.message || err);
          const esc = msg.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '').replace(/\n/g, '\\n');
          webView.evaluateJavaScript('(function(){ var c = window.__mnFetchCb && window.__mnFetchCb[\'' + id + '\']; if(c) c(\'' + esc + '\', null); })();', null);
        });
      } catch (e) {
        const msg = String(e.message || e);
        const esc = msg.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r/g, '').replace(/\n/g, '\\n');
        webView.evaluateJavaScript('(function(){ var c = window.__mnFetchCb && window.__mnFetchCb[\'' + (id || '') + '\']; if(c) c(\'' + esc + '\', null); })();', null);
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
    const downloadUrl = cloudApiBaseUrl + '/users/' + encodeURIComponent(uid) + '/items/' + encodeURIComponent(attachmentKey) + '/file';

    const title = params.fileName ? String(params.fileName).trim() : '';
    const fileName = title ? (title.endsWith('.pdf') ? title : title + '.pdf') : attachmentKey + '.pdf';
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
      throw 'import-failed:' + String((e && e.message) ? e.message : e);
    }

    const docMd5 = SZZoteroBridge._normalizeImportResultToDocMd5(importRaw);
    if (!docMd5) throw 'import-failed:' + String(importRaw || '');

    let doc = undefined;
    try {
      doc = Database.sharedInstance().getDocumentById(docMd5);
    } catch (e) {
      doc = undefined;
    }
    if (!doc) throw 'import-failed:' + String(importRaw || docMd5);

    const resolved = SZZoteroBridge._resolveCurrentNotebookId(self);
    const { studyController, notebookId } = resolved;

    if (!studyController || !studyController.openNotebookAndDocument) {
      throw 'open-failed:study-controller-unavailable';
    }

    try {
      studyController.openNotebookAndDocument(notebookId, docMd5);
    } catch (e) {
      throw 'open-failed:' + String((e && e.message) ? e.message : e);
    }

    return { notebookId: notebookId, docMd5: docMd5 };
  }

  static _handleImportAnnotations(self, queryString) {
    const params = SZZoteroBridge._parseQueryString(queryString);
    if (!params.attachmentKey || !params.uid) return;
    
    if (typeof AnnotationImportService !== 'undefined' && AnnotationImportService.importAnnotations) {
      AnnotationImportService.importAnnotations(params, self);
    }
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
    webView.evaluateJavaScript('(function(){ if (window.onMNDownloadResult) window.onMNDownloadResult(\'' + escId + '\', ' + (ok ? 'true' : 'false') + ', \'' + escError + '\'); })();', null);
  }

  static _handleCheckDocument(self, queryString) {
    const params = SZZoteroBridge._parseQueryString(queryString);
    const attachmentKey = params.attachmentKey ? String(params.attachmentKey) : '';
    if (!attachmentKey) return;

    // Use Local API to get filename (sequential native fetch)
    const url = 'http://localhost:23119/api/users/0/items/' + encodeURIComponent(attachmentKey);
    const headers = { 'Zotero-API-Version': '3' };

    SZMNNetwork.fetch(url, { method: 'GET', headers: headers }).then((res) => {
      const data = res.json();
      // In Local API, data is { key: "...", data: { filename: "...", ... } }
      let filename = params.filename ? String(params.filename) : '';
      if (!filename && data && data.data && data.data.filename) {
        filename = String(data.data.filename);
      }
      
      if (!filename) {
        self.webView.evaluateJavaScript('window.onMNDocumentCheck(\'' + attachmentKey + '\', null)', null);
        return;
      }

      const docMd5 = SZZoteroBridge._findDocMd5ByFilename(filename);
      self.webView.evaluateJavaScript('window.onMNDocumentCheck(\'' + attachmentKey + '\', ' + (docMd5 ? ('\'' + docMd5 + '\'') : 'null') + ')', null);
    }, (err) => {
      self.webView.evaluateJavaScript('window.onMNDocumentCheck(\'' + attachmentKey + '\', null)', null);
    });
  }

  static _handleCheckDocuments(self, queryString) {
    const params = SZZoteroBridge._parseQueryString(queryString);
    const payloadStr = params.payload ? String(params.payload) : '';
    if (!payloadStr) return;

    try {
      const payload = JSON.parse(payloadStr); // { attachmentKey: filename }
      const results = SZZoteroBridge._findDocMd5sByFilenames(payload);
      const resultsJson = JSON.stringify(results);
      self.webView.evaluateJavaScript('window.onMNDocumentCheckBatch(' + resultsJson + ')', null);
    } catch (e) {
      console.log('checkDocuments failed: ' + e);
    }
  }

  static _handleOpenDocument(self, queryString) {
    const params = SZZoteroBridge._parseQueryString(queryString);
    const docMd5 = params.docMd5 ? String(params.docMd5) : '';
    if (!docMd5) return;

    try {
      const resolved = SZZoteroBridge._resolveCurrentNotebookId(self);
      const { studyController, notebookId } = resolved;
      if (studyController) {
        studyController.openNotebookAndDocument(notebookId, docMd5);
      }
    } catch (e) {
      console.log('openDocument failed: ' + e);
    }
  }

  static _findDocMd5ByFilename(filename) {
    if (!filename) return null;
    const db = Database.sharedInstance();
    const docs = db.allDocuments();
    const count = SZZoteroBridge._getNSArrayCount(docs);
    if (count === 0) return null;

    const targetLower = filename.toLowerCase();

    for (let i = 0; i < count; i++) {
      const doc = SZZoteroBridge._getNSArrayItem(docs, i);
      if (!doc) continue;
      const path = String(doc.pathFile || '');
      const pathLower = path.toLowerCase();
      
      // Precise path match (target filename is a substring of the full path)
      if (pathLower.indexOf(targetLower) !== -1) {
        return String(doc.docMd5 || '');
      }
    }
    return null;
  }

  static _findDocMd5sByFilenames(payload) {
    // payload: { attachmentKey: filename }
    const results = {};
    const keys = Object.keys(payload);
    if (keys.length === 0) return results;

    // Initialize all results to null
    keys.forEach(k => { results[k] = null; });

    const db = Database.sharedInstance();
    const docs = db.allDocuments();
    const count = SZZoteroBridge._getNSArrayCount(docs);
    if (count === 0) return results;

    // Pre-normalize targets
    const targetData = keys.map(k => {
      return {
        key: k,
        lower: payload[k].toLowerCase()
      };
    });

    for (let i = 0; i < count; i++) {
        const doc = SZZoteroBridge._getNSArrayItem(docs, i);
        if (!doc) continue;
        const path = String(doc.pathFile || '');
        const pathLower = path.toLowerCase();

        for (let j = 0; j < targetData.length; j++) {
            const t = targetData[j];
            if (results[t.key]) continue; // Already found

            // Precise path match
            if (pathLower.indexOf(t.lower) !== -1) {
              results[t.key] = String(doc.docMd5 || '');
            }
        }
    }
    return results;
  }

  static _getNSArrayCount(arr) {
    if (!arr) return 0;
    if (typeof arr.length === 'number') return arr.length;
    if (typeof arr.count === 'function') return arr.count();
    if (typeof arr.count === 'number') return arr.count;
    return 0;
  }

  static _getNSArrayItem(arr, index) {
    if (!arr) return null;
    if (typeof arr.objectAtIndex === 'function') return arr.objectAtIndex(index);
    return arr[index];
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

  closeWindow: function () {
    // 1. 立即隐藏视图，保证视觉上的“零延迟”
    self.view.hidden = true;
    
    // 2. 同步更新状态，确保下一次点击图标时逻辑正确（不会需要点两次）
    if (self.view.superview) {
      self.view.removeFromSuperview();
    }
    NSUserDefaults.standardUserDefaults().setObjectForKey(false, 'marginnote_sample_w_on');

    // 3. 异步刷新工具栏图标，避开主线程阻塞感
    NSTimer.scheduledTimerWithTimeInterval(0, false, function () {
      const targetWindow = (self.addon && self.addon.window) ? self.addon.window : self.addonWindow;
      if (targetWindow) {
        Application.sharedInstance().studyController(targetWindow).refreshAddonCommands();
      }
    });
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
    self.view.hidden = false;
    self.webView.delegate = self;
    self.webView.evaluateJavaScript("typeof window.__onPanelShow==='function'&&window.__onPanelShow();", null);
  },
  viewWillDisappear: function () {
    self.webView.stopLoading();
    self.webView.delegate = null;
    UIApplication.sharedApplication().networkActivityIndicatorVisible = false;
  },
  webViewDidStartLoad: function () { 
    UIApplication.sharedApplication().networkActivityIndicatorVisible = true;
  },
  webViewDidFinishLoad: function () {
    UIApplication.sharedApplication().networkActivityIndicatorVisible = false;
    SZConfigManager.injectConfig(self.webView);
  },
  webViewDidFailLoadWithError: function (wv, error) {
    UIApplication.sharedApplication().networkActivityIndicatorVisible = false;
    var errHTML = '<html><body style="margin:20px; font-family:-apple-system; color:#666;"><h3>Load failed</h3><p>' + String(error.localizedDescription || '').replace(/</g, '<') + '</p></body></html>';
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
