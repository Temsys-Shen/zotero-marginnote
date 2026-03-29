/**
 * 从当前脑图选中节点中筛选出文献卡片（评论中含 zotero://select/library/items/{itemKey} 的笔记）。
 * @param {*} context - 目标窗口 (UIWindow)，用于取 studyController
 * @returns {Array<{noteId: string, title: string, itemKey: string}>}
 */
function getSelectedLiteratureNotes(context) {
  const list = [];
  if (!context) return list;
  const studyController = _getStudyController(context);
  if (!studyController) return list;
  const nc = studyController.notebookController;
  if (!nc) return list;
  const mindmapView = nc.mindmapView || nc.mindMapView || nc.noteMindMap;
  if (!mindmapView) return list;
  const selViewLst = mindmapView.selViewLst;
  if (!selViewLst) return list;
  const count = _countOf(selViewLst);
  if (count === 0) return list;
  const zoteroItemRe = /zotero:\/\/select\/library\/items(?:\/|\?itemKey=)([^"'\s&\/>]+)/;
  for (let i = 0; i < count; i++) {
    const item = _objectAt(selViewLst, i);
    if (!item) continue;
    const node = item.note !== undefined ? item.note : item;
    const note = node.note !== undefined ? node.note : node;
    const entry = buildLiteratureEntry(note, zoteroItemRe);
    if (!entry) continue;
    list.push(entry);
  }
  return list;
}

/**
 * 遍历当前笔记本，返回全部文献卡片列表。
 * @param {*} context - 目标窗口 (UIWindow)
 * @returns {Array<{noteId: string, title: string, itemKey: string}>}
 */
function getNotebookLiteratureNotes(context) {
  const list = [];
  if (!context) return list;

  const studyController = _getStudyController(context);
  if (!studyController || !studyController.notebookController) return list;

  const notebookController = studyController.notebookController;
  const notebookIdRaw = notebookController.notebookId || notebookController.topicId || notebookController.currTopic;
  const notebookId = notebookIdRaw ? String(notebookIdRaw).trim() : '';
  if (!notebookId) return list;

  const db = Database.sharedInstance();
  const notebook = db && db.getNotebookById ? db.getNotebookById(notebookId) : null;
  if (!notebook || !notebook.notes) return list;

  const roots = _toArray(notebook.notes);
  if (roots.length === 0) return list;

  const zoteroItemRe = /zotero:\/\/select\/library\/items(?:\/|\?itemKey=)([^"'\s&\/>]+)/;
  const seen = {};

  const walk = (note) => {
    if (!note) return;
    const entry = buildLiteratureEntry(note, zoteroItemRe);
    if (entry && !seen[entry.noteId]) {
      seen[entry.noteId] = true;
      list.push(entry);
    }

    const children = _toArray(note.childNotes);
    for (let i = 0; i < children.length; i++) {
      walk(children[i]);
    }
  };

  for (let i = 0; i < roots.length; i++) {
    walk(roots[i]);
  }

  return list;
}

function buildLiteratureEntry(note, re) {
  if (!note || !note.noteId) return null;
  const itemKey = extractItemKeyFromNote(note, re);
  if (!itemKey) return null;
  const noteId = String(note.noteId);
  const title = (note.noteTitle !== undefined && note.noteTitle !== null) ? String(note.noteTitle) : '';
  return { noteId, title, itemKey };
}

function extractItemKeyFromNote(note, re) {
  const comments = note.comments;
  if (!comments) return null;
  const cnt = _countOf(comments);
  if (cnt === 0) return null;
  for (let j = 0; j < cnt; j++) {
    const c = _objectAt(comments, j);
    if (!c) continue;
    let raw = '';
    if (c.html !== undefined) raw = (typeof c.html === 'function' ? c.html() : c.html) || '';
    if (!raw && c.text !== undefined) raw = (typeof c.text === 'function' ? c.text() : c.text) || '';
    if (!raw) continue;
    const str = String(raw);
    const m = str.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

function _getStudyController(context) {
  return Application.sharedInstance().studyController(context);
}

function _countOf(collection) {
  if (!collection) return 0;
  if (collection.length !== undefined) return collection.length;
  if (typeof collection.count === 'function') return collection.count();
  if (collection.count !== undefined) return collection.count;
  return 0;
}

function _objectAt(collection, idx) {
  if (!collection) return undefined;
  if (collection.objectAtIndex) return collection.objectAtIndex(idx);
  return collection[idx];
}

function _toArray(collection) {
  const out = [];
  const cnt = _countOf(collection);
  for (let i = 0; i < cnt; i++) {
    const obj = _objectAt(collection, i);
    if (obj) out.push(obj);
  }
  return out;
}
