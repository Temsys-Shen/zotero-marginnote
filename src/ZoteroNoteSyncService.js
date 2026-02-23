var ZoteroNoteSyncService = class {

  static _toArray(raw) {
    if (raw === null || raw === undefined) return [];
    if (Array.isArray(raw)) return raw.slice();
    let count = 0;
    try {
      if (typeof raw.count === 'function') count = Number(raw.count());
      else if (raw.count !== undefined && raw.count !== null) count = Number(raw.count);
      else if (typeof raw.length === 'number') count = Number(raw.length);
    } catch (e) {
      count = 0;
    }
    if (!count || count < 0) return [];
    const out = [];
    for (let i = 0; i < count; i++) {
      let item = undefined;
      try {
        if (typeof raw.objectAtIndex === 'function') item = raw.objectAtIndex(i);
        else item = raw[i];
      } catch (e) {
        item = undefined;
      }
      if (item !== undefined && item !== null) out.push(item);
    }
    return out;
  }

  static _get(obj, key) {
    if (!obj) return undefined;
    try {
      if (obj[key] !== undefined) return obj[key];
    } catch (e) {
      // ignore direct index access error for Objective-C bridged objects
    }
    try {
      if (typeof obj.objectForKey === 'function') {
        const val = obj.objectForKey(key);
        if (val !== undefined && val !== null) return val;
      }
    } catch (e) {
      // ignore
    }
    return undefined;
  }

  static _normalizeBaseUrl(baseUrl) {
    const base = baseUrl ? String(baseUrl) : 'https://api.zotero.org';
    return base.replace(/\/+$/, '');
  }

  static _headers(apiKey) {
    return {
      'Content-Type': 'application/json',
      'Zotero-API-Version': '3',
      'Zotero-API-Key': String(apiKey || '')
    };
  }

  static _getHeader(res, key) {
    if (!res || !res.nsResponse) return '';
    let headers = null;
    try {
      if (typeof res.nsResponse.allHeaderFields === 'function') {
        headers = res.nsResponse.allHeaderFields();
      } else {
        headers = res.nsResponse.allHeaderFields;
      }
    } catch (e) {
      return '';
    }
    if (!headers) return '';
    if (typeof headers.objectForKey === 'function') {
      const val = headers.objectForKey(key) || headers.objectForKey(key.toLowerCase());
      return val ? String(val) : '';
    }
    return headers[key] ? String(headers[key]) : (headers[key.toLowerCase()] ? String(headers[key.toLowerCase()]) : '');
  }

  static _sleep(ms) {
    return new Promise((resolve) => {
      NSTimer.scheduledTimerWithTimeInterval(ms / 1000, false, function () {
        resolve();
      });
    });
  }

  static requestWithRetry(url, options, ctx) {
    const attempt = ctx && ctx.attempt ? Number(ctx.attempt) : 0;
    return SZMNNetwork.fetch(url, options).then((res) => {
      if (res.status === 429 && attempt < 3) {
        const retryAfter = Number(ZoteroNoteSyncService._getHeader(res, 'Retry-After') || '0');
        const waitMs = retryAfter > 0 ? retryAfter * 1000 : Math.pow(2, attempt) * 1000;
        return ZoteroNoteSyncService._sleep(waitMs).then(() => ZoteroNoteSyncService.requestWithRetry(url, options, { attempt: attempt + 1 }));
      }
      return res;
    });
  }

  static _safeStatus(res) {
    try {
      return res && res.status !== undefined ? Number(res.status) : -1;
    } catch (e) {
      return -1;
    }
  }

  static fetchChildNotes(params) {
    const uid = encodeURIComponent(String(params.uid || ''));
    const itemKeyRaw = params.itemKey !== undefined && params.itemKey !== null && String(params.itemKey).trim()
      ? String(params.itemKey).trim()
      : String(params.parentItem || '').trim();
    if (!itemKeyRaw) {
      throw { code: 'invalid-params', status: -1, message: 'missing-itemKey-for-children' };
    }
    const itemKey = encodeURIComponent(itemKeyRaw);
    const baseUrl = ZoteroNoteSyncService._normalizeBaseUrl(params.baseUrl);
    const url = `${baseUrl}/users/${uid}/items/${itemKey}/children?itemType=note`;
    return ZoteroNoteSyncService.requestWithRetry(url, {
      method: 'GET',
      headers: ZoteroNoteSyncService._headers(params.apiKey)
    }, { attempt: 0 }).then((res) => {
      const status = res && res.status !== undefined ? Number(res.status) : -1;
      if (status === 401 || status === 403) throw { code: 'auth', status: status, message: 'auth-failed' };
      if (status < 200 || status >= 300) throw { code: 'http', status: status, message: `load-children-failed:${status}` };
      let body = [];
      try {
        body = res.json ? res.json() : [];
      } catch (e) {
        const msg = String((e && e.message) ? e.message : e);
        let textPreview = '';
        try {
          const t = res && res.text ? String(res.text()) : '';
          textPreview = t.length > 300 ? `${t.substring(0, 300)}...` : t;
        } catch (_) { }
        throw { code: 'parse', status: status, message: `children-json-parse-failed:${msg}`, textPreview: textPreview };
      }
      const list = ZoteroNoteSyncService._toArray(body);
      return { items: list };
    });
  }

  static findExistingByRootChildId(children, rootChildId) {
    const list = ZoteroNoteSyncService._toArray(children);
    const matched = [];
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const data = ZoteroNoteSyncService._get(item, 'data');
      if (!item || !data) continue;
      const noteVal = ZoteroNoteSyncService._get(data, 'note');
      const noteHtml = noteVal ? String(noteVal) : '';
      const meta = SyncMetadata.parseComment(noteHtml);
      if (meta && String(meta.mnRootChildId || '') === String(rootChildId || '')) {
        matched.push(item);
      }
    }
    return matched;
  }

  static pickMasterByVersion(items) {
    const list = ZoteroNoteSyncService._toArray(items);
    if (list.length === 0) return null;
    let picked = list[list.length - 1];
    let pickedVersion = -1;
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const data = ZoteroNoteSyncService._get(item, 'data');
      const versionRaw = ZoteroNoteSyncService._get(item, 'version') !== undefined
        ? ZoteroNoteSyncService._get(item, 'version')
        : (data ? ZoteroNoteSyncService._get(data, 'version') : undefined);
      const versionNum = versionRaw === undefined || versionRaw === null ? -1 : Number(versionRaw);
      if (!Number.isNaN(versionNum) && versionNum >= pickedVersion) {
        picked = item;
        pickedVersion = versionNum;
      }
    }
    return picked;
  }

  static getItemVersion(item) {
    if (!item) return '';
    const data = ZoteroNoteSyncService._get(item, 'data');
    const itemVersion = ZoteroNoteSyncService._get(item, 'version');
    const dataVersion = data ? ZoteroNoteSyncService._get(data, 'version') : undefined;
    const version = itemVersion !== undefined && itemVersion !== null ? itemVersion : dataVersion;
    return version === undefined || version === null ? '' : String(version).trim();
  }

  static fetchItemSnapshot(params) {
    const uid = encodeURIComponent(String(params.uid || ''));
    const itemKey = encodeURIComponent(String(params.itemKey || ''));
    const baseUrl = ZoteroNoteSyncService._normalizeBaseUrl(params.baseUrl);
    const url = `${baseUrl}/users/${uid}/items/${itemKey}`;
    return ZoteroNoteSyncService.requestWithRetry(url, {
      method: 'GET',
      headers: ZoteroNoteSyncService._headers(params.apiKey)
    }, { attempt: 0 }).then((res) => {
      const status = res && res.status !== undefined ? Number(res.status) : -1;
      if (status === 401 || status === 403) throw { code: 'auth', status: status, message: 'auth-failed' };
      if (status < 200 || status >= 300) throw { code: 'http', status: status, message: `item-load-failed:${status}` };
      let body = null;
      try {
        body = res.json ? res.json() : null;
      } catch (e) {
        throw { code: 'parse', status: status, message: `item-json-parse-failed:${String(e && e.message ? e.message : e)}` };
      }
      const versionFromHeader = String(ZoteroNoteSyncService._getHeader(res, 'Last-Modified-Version') || '').trim();
      const versionFromBody = ZoteroNoteSyncService.getItemVersion(body);
      const itemVersion = versionFromBody || versionFromHeader;
      if (!itemVersion) throw { code: 'http', status: status, message: 'item-version-missing' };
      return { item: body, itemVersion: itemVersion };
    });
  }

  static updateNote(params) {
    const uid = encodeURIComponent(String(params.uid || ''));
    const noteKey = encodeURIComponent(String(params.noteKey || ''));
    const baseUrl = ZoteroNoteSyncService._normalizeBaseUrl(params.baseUrl);
    const url = `${baseUrl}/users/${uid}/items/${noteKey}`;
    const headers = ZoteroNoteSyncService._headers(params.apiKey);
    const itemVer = params.itemVersion !== undefined && params.itemVersion !== null
      ? String(params.itemVersion).trim()
      : '';
    if (!itemVer) {
      throw { code: 'invalid-params', status: -1, message: 'missing-item-version-for-update' };
    }
    headers['If-Unmodified-Since-Version'] = itemVer;
    return ZoteroNoteSyncService.requestWithRetry(url, {
      method: 'PATCH',
      headers: headers,
      json: {
        key: String(params.noteKey || ''),
        version: Number(itemVer),
        itemType: 'note',
        parentItem: String(params.parentItem || ''),
        note: String(params.noteHtml || '')
      }
    }, { attempt: 0 });
  }

  static deleteNote(params) {
    const uid = encodeURIComponent(String(params.uid || ''));
    const itemKey = encodeURIComponent(String(params.itemKey || ''));
    const baseUrl = ZoteroNoteSyncService._normalizeBaseUrl(params.baseUrl);
    const url = `${baseUrl}/users/${uid}/items/${itemKey}`;
    const headers = ZoteroNoteSyncService._headers(params.apiKey);
    const itemVersion = params.itemVersion !== undefined && params.itemVersion !== null
      ? String(params.itemVersion).trim()
      : '';
    if (itemVersion) headers['If-Unmodified-Since-Version'] = itemVersion;
    return ZoteroNoteSyncService.requestWithRetry(url, {
      method: 'DELETE',
      headers: headers
    }, { attempt: 0 });
  }

  static createNote(params) {
    const uid = encodeURIComponent(String(params.uid || ''));
    const baseUrl = ZoteroNoteSyncService._normalizeBaseUrl(params.baseUrl);
    const url = `${baseUrl}/users/${uid}/items`;
    return ZoteroNoteSyncService.requestWithRetry(url, {
      method: 'POST',
      headers: ZoteroNoteSyncService._headers(params.apiKey),
      json: [{
        itemType: 'note',
        parentItem: String(params.parentItem || ''),
        note: String(params.noteHtml || '')
      }]
    }, { attempt: 0 });
  }

  static syncOneRootEntry(params) {
    const entry = params.entry;
    const context = {
      uid: params.uid,
      apiKey: params.apiKey,
      baseUrl: params.baseUrl,
      parentItem: params.parentItem,
      itemKey: params.itemKey || params.parentItem
    };
    return ZoteroNoteSyncService.fetchChildNotes(context).then((snapshot) => {
      const children = snapshot && snapshot.items ? snapshot.items : [];
      const matched = ZoteroNoteSyncService.findExistingByRootChildId(children, entry.metadata.mnRootChildId);
      const existing = ZoteroNoteSyncService.pickMasterByVersion(matched);
      const duplicates = ZoteroNoteSyncService._toArray(matched).filter((item) => item !== existing);
      if (!existing) {
        return ZoteroNoteSyncService.createNote({
          uid: context.uid,
          apiKey: context.apiKey,
          baseUrl: context.baseUrl,
          parentItem: context.parentItem,
          noteHtml: entry.html
        }).then((res) => {
          if (res.status === 401 || res.status === 403) throw { code: 'auth', status: res.status, message: 'auth-failed' };
          if (res.status < 200 || res.status >= 300) throw { code: 'http', status: res.status, message: `create-failed:${res.status}` };
          return { created: 1, updated: 0, failed: 0, deletedDuplicates: 0, errors: [] };
        });
      }

      const updateOnce = (retryConflict) => {
        const existingKey = ZoteroNoteSyncService._get(existing, 'key');
        if (!existingKey) {
          throw { code: 'invalid-data', status: -1, message: 'existing-note-key-missing' };
        }
        return ZoteroNoteSyncService.fetchItemSnapshot({
          uid: context.uid,
          apiKey: context.apiKey,
          baseUrl: context.baseUrl,
          itemKey: existingKey
        }).then((snapshotNow) => {
          const latestVersion = String(snapshotNow.itemVersion);
          return ZoteroNoteSyncService.updateNote({
            uid: context.uid,
            apiKey: context.apiKey,
            baseUrl: context.baseUrl,
            noteKey: existingKey,
            itemVersion: latestVersion,
            parentItem: context.parentItem,
            noteHtml: entry.html
          });
        }).then((res) => {
          if (res.status === 401 || res.status === 403) throw { code: 'auth', status: res.status, message: 'auth-failed' };
          if ((res.status === 409 || res.status === 412) && retryConflict) {
                return ZoteroNoteSyncService.fetchChildNotes(context).then((refreshedSnapshot) => {
              const refreshedChildren = refreshedSnapshot && refreshedSnapshot.items ? refreshedSnapshot.items : [];
              const refreshedMatched = ZoteroNoteSyncService.findExistingByRootChildId(refreshedChildren, entry.metadata.mnRootChildId);
              const refreshed = ZoteroNoteSyncService.pickMasterByVersion(refreshedMatched);
              if (!refreshed) throw { code: 'conflict', status: res.status, message: 'update-conflict-no-target-after-refetch' };
              const refreshedKey = ZoteroNoteSyncService._get(refreshed, 'key');
              return ZoteroNoteSyncService.fetchItemSnapshot({
                uid: context.uid,
                apiKey: context.apiKey,
                baseUrl: context.baseUrl,
                itemKey: refreshedKey
              }).then((refreshSnapshotNow) => {
                const refreshedVersion = String(refreshSnapshotNow.itemVersion);
                return ZoteroNoteSyncService.updateNote({
                  uid: context.uid,
                  apiKey: context.apiKey,
                  baseUrl: context.baseUrl,
                  noteKey: refreshedKey,
                  itemVersion: refreshedVersion,
                  parentItem: context.parentItem,
                  noteHtml: entry.html
                });
              }).then((retryRes) => {
                if (retryRes.status >= 200 && retryRes.status < 300) return { created: 0, updated: 1, failed: 0, deletedDuplicates: 0, errors: [] };
                throw { code: 'http', status: retryRes.status, message: `update-retry-failed:${retryRes.status}` };
              });
            });
          }
          if (res.status < 200 || res.status >= 300) throw { code: 'http', status: res.status, message: `update-failed:${res.status}` };
          return { created: 0, updated: 1, failed: 0, deletedDuplicates: 0, errors: [] };
        });
      };
      return updateOnce(true).then((baseResult) => {
        if (!existing || duplicates.length === 0) return baseResult;
        let deleted = 0;
        const deleteErrors = [];
        let deleteChain = Promise.resolve();
        duplicates.forEach((dup) => {
          deleteChain = deleteChain.then(() => {
            const dupKey = ZoteroNoteSyncService._get(dup, 'key');
            if (!dupKey) {
              deleteErrors.push({ code: 'duplicate-delete-missing-key', message: 'duplicate-item-key-missing' });
              return;
            }
            return ZoteroNoteSyncService.deleteNote({
              uid: context.uid,
              apiKey: context.apiKey,
              baseUrl: context.baseUrl,
              itemKey: String(dupKey),
              itemVersion: ZoteroNoteSyncService.getItemVersion(dup)
            }).then((delRes) => {
              const status = ZoteroNoteSyncService._safeStatus(delRes);
              if (status >= 200 && status < 300) {
                deleted += 1;
              } else {
                deleteErrors.push({ code: 'duplicate-delete-http', status: status, message: `delete-failed:${status}` });
              }
            }).catch((err) => {
              const msg = err && err.message ? String(err.message) : String(err || 'duplicate-delete-error');
              deleteErrors.push({ code: 'duplicate-delete-error', message: msg });
            });
          });
        });
        return deleteChain.then(() => {
          baseResult.deletedDuplicates = deleted;
          baseResult.errors = (baseResult.errors || []).concat(deleteErrors);
          return baseResult;
        });
      });
    });
  }

  static syncLiteraturePayload(params) {
    const entries = Array.isArray(params.entries) ? params.entries : [];
    const result = { created: 0, updated: 0, deletedDuplicates: 0, failed: 0, skippedEmpty: 0, errors: [], authFailed: false };
    if (entries.length === 0) {
      result.skippedEmpty = 1;
      return Promise.resolve(result);
    }

    let chain = Promise.resolve();
    entries.forEach((entry) => {
      chain = chain.then(() => {
        if (result.authFailed) return;
        return ZoteroNoteSyncService.syncOneRootEntry({
          uid: params.uid,
          apiKey: params.apiKey,
          baseUrl: params.baseUrl,
          parentItem: params.parentItem,
          entry: entry
        }).then((r) => {
          result.created += r.created || 0;
          result.updated += r.updated || 0;
          result.deletedDuplicates += r.deletedDuplicates || 0;
          if (r.errors && r.errors.length > 0) result.errors = result.errors.concat(r.errors);
        }).catch((err) => {
          const code = err && err.code ? String(err.code) : 'unknown';
          const message = err && err.message ? String(err.message) : String(err || 'unknown-error');
          if (code === 'auth') {
            result.authFailed = true;
          }
          result.failed += 1;
          result.errors.push({
            code: code,
            message: message,
            rootChildId: entry && entry.metadata ? entry.metadata.mnRootChildId : ''
          });
        });
      });
    });
    return chain.then(() => result);
  }
};
