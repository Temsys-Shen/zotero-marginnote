var SyncMetadata = class {
  static getSchema() {
    return 'mnzotero.note.sync.v1';
  }

  static buildComment(metadata) {
    const payload = Object.assign({}, metadata || {});
    payload.schema = SyncMetadata.getSchema();
    return `<!--mnzotero:${JSON.stringify(payload)}-->`;
  }

  static appendComment(noteHtml, metadata) {
    const html = noteHtml ? String(noteHtml) : '';
    return `${html}${SyncMetadata.buildComment(metadata)}`;
  }

  static parseComment(noteHtml) {
    const html = noteHtml ? String(noteHtml) : '';
    const re = /<!--mnzotero:(\{[\s\S]*?\})-->/g;
    let last = null;
    let m = re.exec(html);
    while (m) {
      last = m[1];
      m = re.exec(html);
    }
    if (!last) return null;
    try {
      const parsed = JSON.parse(last);
      if (!parsed || parsed.schema !== SyncMetadata.getSchema()) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }
};
