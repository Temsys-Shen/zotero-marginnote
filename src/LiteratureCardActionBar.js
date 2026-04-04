var SZLiteratureCardActionBar = class {
  static start(addon) {
    if (!addon) return;
    SZLiteratureCardActionBar.stop(addon);
    addon._mnZoteroActionTimer = NSTimer.scheduledTimerWithTimeInterval(0.25, true, function () {
      SZLiteratureCardActionBar.refresh(addon);
    });
  }

  static stop(addon) {
    if (!addon) return;
    if (addon._mnZoteroActionTimer) {
      addon._mnZoteroActionTimer.invalidate();
      addon._mnZoteroActionTimer = null;
    }
    SZLiteratureCardActionBar._removeActionBar(addon);
    addon._mnZoteroActionKey = '';
    addon._mnZoteroActionLinkMap = {};
  }

  static refresh(addon) {
    if (!addon) return;
    const targetWindow = addon.window ? addon.window : (addon.webController ? addon.webController.addonWindow : null);
    if (!targetWindow) {
      SZLiteratureCardActionBar._removeActionBar(addon);
      return;
    }
    const selected = SZLiteratureCardActionBar._getSelectedLiteratureNode(targetWindow);
    if (!selected) {
      SZLiteratureCardActionBar._removeActionBar(addon);
      addon._mnZoteroActionKey = '';
      addon._mnZoteroActionLinkMap = {};
      return;
    }
    const key = selected.noteId + '|' + selected.links.map((link) => link.type + ':' + link.url).join('|');
    if (addon._mnZoteroActionKey !== key) {
      SZLiteratureCardActionBar._renderActionBar(addon, selected);
      addon._mnZoteroActionKey = key;
    } else {
      SZLiteratureCardActionBar._layoutActionBar(addon, selected);
    }
  }

  static _getSelectedLiteratureNode(context) {
    const studyController = Application.sharedInstance().studyController(context);
    if (!studyController || !studyController.notebookController) return null;
    const nc = studyController.notebookController;
    const mindmapView = nc.mindmapView || nc.mindMapView || nc.noteMindMap;
    if (!mindmapView || !mindmapView.selViewLst) return null;
    const selViewLst = mindmapView.selViewLst;
    const selectedCount = SZLiteratureCardActionBar._countOf(selViewLst);
    if (selectedCount !== 1) return null;

    const item = SZLiteratureCardActionBar._objectAt(selViewLst, 0);
    if (!item) return null;
    const node = item.note !== undefined ? item.note : item;
    const note = node && node.note !== undefined ? node.note : node;
    if (!note || !note.noteId) return null;

    const nodeView = item.view !== undefined ? item.view : (node && node.view !== undefined ? node.view : null);
    if (!nodeView || !nodeView.superview) return null;

    const links = SZLiteratureCardActionBar._extractLinksFromNote(note);
    if (links.length === 0) return null;

    let zoteroUrl = '';
    for (let i = 0; i < links.length; i++) {
      if (links[i].type === 'zotero') {
        zoteroUrl = links[i].url ? String(links[i].url) : '';
        break;
      }
    }
    if (!zoteroUrl) return null;

    const itemKey = SZLiteratureCardActionBar._extractItemKeyFromZoteroUrl(zoteroUrl);
    if (!itemKey) return null;

    if (typeof SZZoteroBridge !== 'undefined' && SZZoteroBridge._getRecordedDocMd5ForItemKey) {
      const recordedDocMd5 = SZZoteroBridge._getRecordedDocMd5ForItemKey(itemKey);
      if (recordedDocMd5) {
        links.push({
          type: 'open',
          title: '👁',
          url: 'mnzoterodoc://' + String(recordedDocMd5),
          color: { r: 0.20, g: 0.20, b: 0.20, a: 1 }
        });
      }
    }

    return {
      noteId: String(note.noteId),
      nodeView: nodeView,
      itemKey: itemKey,
      links: links
    };
  }

  static _extractLinksFromNote(note) {
    const comments = note.comments;
    const cnt = SZLiteratureCardActionBar._countOf(comments);
    if (cnt === 0) return [];

    const allLinks = [];
    const seen = {};

    const addUnique = (url) => {
      const val = String(url || '').trim();
      if (!val) return;
      if (seen[val]) return;
      seen[val] = true;
      allLinks.push(val);
    };

    const hrefRe = /href=(['"])(.*?)\1/ig;
    const urlRe = /(?:zotero:\/\/|https?:\/\/)[^\s"'<>]+/ig;

    for (let i = 0; i < cnt; i++) {
      const comment = SZLiteratureCardActionBar._objectAt(comments, i);
      if (!comment) continue;
      let html = '';
      if (comment.html !== undefined) {
        html = typeof comment.html === 'function' ? String(comment.html() || '') : String(comment.html || '');
      }
      let text = '';
      if (comment.text !== undefined) {
        text = typeof comment.text === 'function' ? String(comment.text() || '') : String(comment.text || '');
      }

      let m;
      hrefRe.lastIndex = 0;
      while ((m = hrefRe.exec(html)) !== null) {
        addUnique(m[2]);
      }
      urlRe.lastIndex = 0;
      while ((m = urlRe.exec(html)) !== null) {
        addUnique(m[0]);
      }
      urlRe.lastIndex = 0;
      while ((m = urlRe.exec(text)) !== null) {
        addUnique(m[0]);
      }
    }

    let zoteroLink = '';
    let pdfLink = '';
    let webLink = '';
    let cloudPdfLink = '';

    for (let i = 0; i < allLinks.length; i++) {
      const url = allLinks[i];
      if (!zoteroLink && /^zotero:\/\/select\/library\/items(?:\/|\?itemKey=)/i.test(url)) {
        zoteroLink = url;
        continue;
      }
      if (!pdfLink && /^zotero:\/\/open-pdf\/library\/items\//i.test(url)) {
        pdfLink = url;
        continue;
      }
      if (!cloudPdfLink && /^https?:\/\/www\.zotero\.org\/.+\/items\/.+\/file(?:\?.*)?$/i.test(url)) {
        cloudPdfLink = url;
        continue;
      }
      if (!webLink && /^https?:\/\//i.test(url)) {
        webLink = url;
      }
    }

    const result = [];
    if (zoteroLink) result.push({ type: 'zotero', title: 'Zotero', url: zoteroLink, color: { r: 0.10, g: 0.43, b: 0.90, a: 1 } });
    if (pdfLink) result.push({ type: 'pdf', title: 'Zotero📄', url: pdfLink, color: { r: 0.15, g: 0.60, b: 0.20, a: 1 } });
    if (webLink) result.push({ type: 'web', title: 'Web', url: webLink, color: { r: 0.94, g: 0.56, b: 0.10, a: 1 } });
    if (cloudPdfLink) result.push({ type: 'cloud', title: 'Web📄', url: cloudPdfLink, color: { r: 0.46, g: 0.36, b: 0.90, a: 1 } });
    return result;
  }

  static _extractItemKeyFromZoteroUrl(url) {
    const str = String(url || '');
    const m = str.match(/zotero:\/\/select\/library\/items(?:\/|\?itemKey=)([^"'\s&\/>]+)/i);
    return (m && m[1]) ? String(m[1]) : '';
  }

  static _renderActionBar(addon, selected) {
    SZLiteratureCardActionBar._removeActionBar(addon);

    const hostView = selected.nodeView.superview;
    const links = selected.links;
    const nodeFrame = selected.nodeView.frame;

    const barHeight = 68;
    const barWidth = Math.max(120, nodeFrame.width);
    const bar = new UIView({ x: 0, y: 0, width: barWidth, height: barHeight });
    bar.tag = 9527100;
    bar.layer.cornerRadius = 10;
    bar.layer.borderWidth = 0.5;
    bar.layer.borderColor = UIColor.colorWithWhiteAlpha(0.75, 1);
    bar.backgroundColor = UIColor.colorWithWhiteAlpha(1, 0.98);

    addon._mnZoteroActionLinkMap = {};
    const baseTag = 9527200;
    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const btn = new UIButton({ x: 0, y: 0, width: 60, height: 52 });
      btn.tag = baseTag + i;
      btn.layer.cornerRadius = 12;
      btn.layer.borderWidth = 0.5;
      btn.layer.borderColor = UIColor.colorWithWhiteAlpha(0.75, 1);
      btn.backgroundColor = UIColor.colorWithWhiteAlpha(0.98, 1);
      btn.setTitleForState(link.title, 0);
      btn.setTitleColorForState(UIColor.colorWithRedGreenBlueAlpha(link.color.r, link.color.g, link.color.b, link.color.a), 0);
      btn.titleLabel.font = UIFont.boldSystemFontOfSize(24);
      btn.addTargetActionForControlEvents(addon, "onLiteratureActionButtonTap:", (1 << 6));
      bar.addSubview(btn);
      addon._mnZoteroActionLinkMap[String(btn.tag)] = link.url;
    }

    hostView.addSubview(bar);
    addon._mnZoteroActionBar = bar;
    SZLiteratureCardActionBar._layoutActionBar(addon, selected);
  }

  static _layoutActionBar(addon, selected) {
    const bar = addon._mnZoteroActionBar;
    if (!bar || !selected || !selected.nodeView || !selected.nodeView.superview) return;
    const hostView = selected.nodeView.superview;
    const frame = selected.nodeView.frame;
    const hostBounds = hostView.bounds;
    const barHeight = bar.frame.height;
    const margin = 6;
    let x = frame.x;
    let y = frame.y + frame.height + (barHeight / 2);
    const width = frame.width;

    if (x < margin) x = margin;
    if (x + width > hostBounds.width - margin) x = hostBounds.width - margin - width;
    if (y < margin) y = margin;
    if (y + barHeight > hostBounds.height - margin) y = hostBounds.height - margin - barHeight;
    bar.frame = { x: x, y: y, width: width, height: barHeight };
    SZLiteratureCardActionBar._layoutButtons(bar, selected.links.length);
  }

  static _layoutButtons(bar, count) {
    if (!bar || !count) return;
    const innerPadding = 12;
    const gap = 8;
    const buttonHeight = Math.max(40, bar.frame.height - 16);
    const available = bar.frame.width - innerPadding * 2 - gap * (count - 1);
    const buttonWidth = available / count;
    for (let i = 0; i < count; i++) {
      const btn = bar.subviews && bar.subviews.objectAtIndex ? bar.subviews.objectAtIndex(i) : (bar.subviews ? bar.subviews[i] : null);
      if (!btn) continue;
      btn.frame = {
        x: innerPadding + i * (buttonWidth + gap),
        y: (bar.frame.height - buttonHeight) / 2,
        width: buttonWidth,
        height: buttonHeight
      };
    }
  }

  static _removeActionBar(addon) {
    if (!addon) return;
    const bar = addon._mnZoteroActionBar;
    if (bar && bar.removeFromSuperview) {
      bar.removeFromSuperview();
    }
    addon._mnZoteroActionBar = null;
  }

  static _countOf(collection) {
    if (!collection) return 0;
    if (collection.length !== undefined) return collection.length;
    if (typeof collection.count === 'function') return collection.count();
    if (collection.count !== undefined) return collection.count;
    return 0;
  }

  static _objectAt(collection, index) {
    if (!collection) return null;
    if (collection.objectAtIndex) return collection.objectAtIndex(index);
    return collection[index];
  }
};
