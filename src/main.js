JSB.newAddon = function(mainPath) {
  JSB.require('network');
  JSB.require('zotero');
  JSB.require('zoteroPanel');

  const newAddonClass = JSB.defineClass('ZoteroAddon : JSExtension', {
    panelView: null,
    tableView: null,
    tableDelegate: null,
    searchField: null,
    zoteroItems: [],
    filteredItems: [],
    lastFetchTime: 0,

    queryAddonCommandStatus() {
      return {
        image: 'logo.png', 
        object: self, 
        selector: 'onZoteroAction:', 
        checked: false
      };
    },

    async onZoteroAction(sender) {
      if (self.panelView) {
        closeZoteroPanel(self);
        return;
      }

      showZoteroPanel(self);
      await loadZoteroItems(self);
    },

    closeZoteroPanel(sender) {
      closeZoteroPanel(self);
    },

    refreshZoteroItems(sender) {
      refreshZoteroItems(self);
    },

    textFieldShouldReturn(textField) {
      return textFieldShouldReturn(self, textField);
    },

    textFieldDidChange(textField) {
      textFieldDidChange(self, textField);
    },

    sceneWillConnect() {},
    sceneDidDisconnect() {},
    notebookWillOpen(notebookid) {},
    notebookWillClose(notebookid) {},
    documentDidOpen(docmd5) {},
    documentWillClose(docmd5) {}

  }, {
    addonDidConnect() {},
    addonWillDisconnect() {}
  });

  return newAddonClass;
};
