/**
 * 从当前脑图选中节点中筛选出文献卡片（评论中含 zotero://select/library/items/{itemKey} 的笔记）。
 * @param {*} context - 目标窗口 (UIWindow)，用于取 studyController
 * @returns {Array<{noteId: string, title: string, itemKey: string}>}
 */
function getSelectedLiteratureNotes(context) {
  var list = [];
  if (!context) return list;
  var studyController = null;
  try {
    studyController = Application.sharedInstance().studyController(context);
  } catch (e) {
    return list;
  }
  if (!studyController) return list;
  var nc = studyController.notebookController;
  if (!nc) return list;
  var mindmapView = nc.mindmapView || nc.mindMapView || nc.noteMindMap;
  if (!mindmapView) return list;
  var selViewLst = mindmapView.selViewLst;
  if (!selViewLst) return list;
  var count = selViewLst.length !== undefined ? selViewLst.length : (typeof selViewLst.count === 'function' ? selViewLst.count() : (selViewLst.count !== undefined ? selViewLst.count : 0));
  if (count === 0) return list;
  var zoteroItemRe = /zotero:\/\/select\/library\/items\/([^"'\s\/>]+)/;
  for (var i = 0; i < count; i++) {
    var item = selViewLst.objectAtIndex ? selViewLst.objectAtIndex(i) : selViewLst[i];
    if (!item) continue;
    var node = item.note !== undefined ? item.note : item;
    var note = node.note !== undefined ? node.note : node;
    if (!note || !note.noteId) continue;
    var itemKey = extractItemKeyFromNote(note, zoteroItemRe);
    if (!itemKey) continue;
    var noteId = String(note.noteId);
    var title = (note.noteTitle !== undefined && note.noteTitle !== null) ? String(note.noteTitle) : '';
    list.push({ noteId: noteId, title: title, itemKey: itemKey });
  }
  return list;
}

function extractItemKeyFromNote(note, re) {
  var comments = note.comments;
  if (!comments) return null;
  var cnt = comments.length !== undefined ? comments.length : (typeof comments.count === 'function' ? comments.count() : (comments.count !== undefined ? comments.count : 0));
  if (cnt === 0) return null;
  for (var j = 0; j < cnt; j++) {
    var c = comments.objectAtIndex ? comments.objectAtIndex(j) : comments[j];
    if (!c) continue;
    var raw = '';
    if (c.html !== undefined) raw = (typeof c.html === 'function' ? c.html() : c.html) || '';
    if (!raw && c.text !== undefined) raw = (typeof c.text === 'function' ? c.text() : c.text) || '';
    if (!raw) continue;
    var str = String(raw);
    var m = str.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}
