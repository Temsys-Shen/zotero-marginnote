var MNTreeExportService = class {
  static getSectionSeparator() {
    return '\n\n---\n\n';
  }

  static toArray(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.slice();
    const count = raw.length !== undefined
      ? raw.length
      : (typeof raw.count === 'function' ? raw.count() : (raw.count !== undefined ? raw.count : 0));
    const out = [];
    for (let i = 0; i < count; i++) {
      const item = raw.objectAtIndex ? raw.objectAtIndex(i) : raw[i];
      if (item !== undefined && item !== null) out.push(item);
    }
    return out;
  }

  static escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  static textToHtml(value) {
    if (!value) return '';
    return MNTreeExportService.escapeHtml(value).replace(/\r\n/g, '\n').replace(/\n/g, '<br>');
  }

  static hash(content) {
    const input = String(content || '');
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return (h >>> 0).toString(16);
  }

  static collectSegments(rootNote) {
    const segments = [];
    const walk = (note, pathTokens) => {
      if (!note || !note.noteId) return;
      segments.push(MNTreeExportService.buildNodeSegment(note, pathTokens));
      const children = MNTreeExportService.toArray(note.childNotes);
      for (let i = 0; i < children.length; i++) {
        walk(children[i], pathTokens.concat(i + 1));
      }
    };
    walk(rootNote, []);
    return segments;
  }

  static readCommentBodies(note) {
    const comments = MNTreeExportService.toArray(note ? note.comments : null);
    const blocks = [];
    for (let i = 0; i < comments.length; i++) {
      const c = comments[i];
      if (!c) continue;
      let text = '';
      if (c.text !== undefined) text = typeof c.text === 'function' ? c.text() : c.text;
      if (!text && c.html !== undefined) text = typeof c.html === 'function' ? c.html() : c.html;
      text = text ? String(text).trim() : '';
      if (!text) continue;
      let markdown = false;
      if (c.markdown !== undefined) markdown = !!(typeof c.markdown === 'function' ? c.markdown() : c.markdown);
      const bodyHtml = MNTreeExportService.textToHtml(text);
      const commentType = markdown ? 'markdown' : 'text';
      blocks.push(`<div data-mn-comment-type="${commentType}">${bodyHtml}</div>`);
    }
    return blocks;
  }

  static buildNodeSegment(note, pathTokens) {
    const title = note && note.noteTitle !== undefined && note.noteTitle !== null
      ? String(note.noteTitle)
      : 'Untitled';
    const noteId = String(note && note.noteId ? note.noteId : '');
    const path = pathTokens.length > 0 ? pathTokens.join('.') : 'root';
    const titleHtml = MNTreeExportService.escapeHtml(title);

    const excerpt = MNTreeExportService.readPrimaryNoteText(note);

    const blocks = [];
    if (excerpt) blocks.push(MNTreeExportService.textToHtml(excerpt));
    const commentBlocks = MNTreeExportService.readCommentBodies(note);
    for (let i = 0; i < commentBlocks.length; i++) blocks.push(commentBlocks[i]);
    if (blocks.length === 0) blocks.push('<em>(empty)</em>');

    return `<section data-mn-path="${MNTreeExportService.escapeHtml(path)}" data-mn-noteid="${MNTreeExportService.escapeHtml(noteId)}"><h3>[${MNTreeExportService.escapeHtml(path)}] ${titleHtml}</h3><div>${blocks.join('<br><br>')}</div></section>`;
  }

  static readPrimaryNoteText(note) {
    if (!note) return '';
    if (!note.allNoteText || typeof note.allNoteText !== 'function') return '';
    try {
      const text = note.allNoteText();
      return text === undefined || text === null ? '' : String(text).trim();
    } catch (e) {
      return '';
    }
  }

  static buildRootNotePayload(rootChildNote, context) {
    const rootTitle = rootChildNote && rootChildNote.noteTitle !== undefined && rootChildNote.noteTitle !== null
      ? String(rootChildNote.noteTitle)
      : 'Untitled';
    const rootChildId = String(rootChildNote && rootChildNote.noteId ? rootChildNote.noteId : '');
    const rootPath = context && context.rootPath ? String(context.rootPath) : '';
    const literatureNoteId = context && context.literatureNoteId ? String(context.literatureNoteId) : '';
    const notebookId = context && context.notebookId ? String(context.notebookId) : '';
    const pluginVersion = context && context.pluginVersion ? String(context.pluginVersion) : 'unknown';
    const syncedAt = new Date().toISOString();

    const sections = MNTreeExportService.collectSegments(rootChildNote);
    const contentCore = `<div class="mnzotero-root"><h2>${MNTreeExportService.escapeHtml(rootTitle)}</h2>${sections.join(MNTreeExportService.getSectionSeparator())}</div>`;
    const metadata = {
      schema: SyncMetadata.getSchema(),
      mnLiteratureNoteId: literatureNoteId,
      mnRootChildId: rootChildId,
      mnRootChildTitle: rootTitle,
      mnRootChildPath: rootPath,
      mnNotebookId: notebookId,
      contentHash: MNTreeExportService.hash(contentCore),
      syncedAt: syncedAt,
      pluginVersion: pluginVersion
    };
    return {
      title: rootTitle,
      html: SyncMetadata.appendComment(contentCore, metadata),
      metadata: metadata
    };
  }

  static buildLiteratureExportPayload(literatureNoteId, options) {
    const noteId = String(literatureNoteId || '');
    if (!noteId) return { ok: false, error: 'missing-note-id' };
    const root = Database.sharedInstance().getNoteById(noteId);
    if (!root || !root.noteId) return { ok: false, error: 'literature-note-not-found' };

    const firstLevel = MNTreeExportService.toArray(root.childNotes);
    if (firstLevel.length === 0) {
      return {
        ok: true,
        entries: [],
        literatureTitle: root.noteTitle ? String(root.noteTitle) : '',
        literatureNoteId: String(root.noteId)
      };
    }

    const notebookId = root.notebookId ? String(root.notebookId) : (options && options.notebookId ? String(options.notebookId) : '');
    const pluginVersion = options && options.pluginVersion ? String(options.pluginVersion) : 'unknown';
    const entries = [];
    for (let i = 0; i < firstLevel.length; i++) {
      const child = firstLevel[i];
      if (!child || !child.noteId) continue;
      const payload = MNTreeExportService.buildRootNotePayload(child, {
        rootPath: String(i + 1),
        literatureNoteId: String(root.noteId),
        notebookId: notebookId,
        pluginVersion: pluginVersion
      });
      entries.push(payload);
    }

    return {
      ok: true,
      entries: entries,
      literatureTitle: root.noteTitle ? String(root.noteTitle) : '',
      literatureNoteId: String(root.noteId)
    };
  }
};
