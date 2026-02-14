/**
 * 从当前脑图选中节点中筛选出文献卡片（评论中含 zotero://select/library/items/{itemKey} 的笔记）。
 * @param {*} context - 目标窗口 (UIWindow)，用于取 studyController
 * @returns {Array<{noteId: string, title: string, itemKey: string}>}
 */
function getSelectedLiteratureNotes(context) {
  const list = [];
  if (!context) return list;
  let studyController = null;
  try {
    studyController = Application.sharedInstance().studyController(context);
  } catch (e) {
    return list;
  }
  if (!studyController) return list;
  const nc = studyController.notebookController;
  if (!nc) return list;
  const mindmapView = nc.mindmapView || nc.mindMapView || nc.noteMindMap;
  if (!mindmapView) return list;
  const selViewLst = mindmapView.selViewLst;
  if (!selViewLst) return list;
  const count = selViewLst.length !== undefined ? selViewLst.length : (typeof selViewLst.count === 'function' ? selViewLst.count() : (selViewLst.count !== undefined ? selViewLst.count : 0));
  if (count === 0) return list;
  const zoteroItemRe = /zotero:\/\/select\/library\/items\/([^"'\s\/>]+)/;
  for (let i = 0; i < count; i++) {
    const item = selViewLst.objectAtIndex ? selViewLst.objectAtIndex(i) : selViewLst[i];
    if (!item) continue;
    const node = item.note !== undefined ? item.note : item;
    const note = node.note !== undefined ? node.note : node;
    if (!note || !note.noteId) continue;
    const itemKey = extractItemKeyFromNote(note, zoteroItemRe);
    if (!itemKey) continue;
    const noteId = String(note.noteId);
    const title = (note.noteTitle !== undefined && note.noteTitle !== null) ? String(note.noteTitle) : '';
    list.push({ noteId, title, itemKey });
  }
  return list;
}

function extractItemKeyFromNote(note, re) {
  const comments = note.comments;
  if (!comments) return null;
  const cnt = comments.length !== undefined ? comments.length : (typeof comments.count === 'function' ? comments.count() : (comments.count !== undefined ? comments.count : 0));
  if (cnt === 0) return null;
  for (let j = 0; j < cnt; j++) {
    const c = comments.objectAtIndex ? comments.objectAtIndex(j) : comments[j];
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
