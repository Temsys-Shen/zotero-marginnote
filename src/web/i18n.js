/**
 * i18n国际化模块（前端版本 - WebView）
 * 提供多语言支持功能
 */
var Si18n = (function () {
  'use strict';

  // 翻译数据（中文）
  var zhCNTranslations = {
    "window_title": "网页",
    "app_title": "Zotero Connector",
    "settings": "设置",
    "local_api": "本地API",
    "cloud_api": "云端API",
    "library": "文献库",
    "selected_cards": "选中文献卡片",
    "search_placeholder": "关键词（标题、作者、年份）...",
    "search_button": "搜索",
    "all": "全部",
    "ready_to_search": "准备搜索",
    "no_matches_found": "未找到匹配项",
    "searching": "搜索中...",
    "connection_failed": "连接失败",
    "no_literature_cards": "当前选区中没有文献卡片",
    "open_in_zotero": "在Zotero中打开",
    "local_pdf": "本地PDF",
    "web": "网页",
    "cloud_pdf": "云PDF",
    "add_to_mn": "添加到MarginNote",
    "download_pdf": "下载PDF",
    "select": "选择",
    "export": "导出",
    "push_note": "推送笔记",
    "unknown": "未知",
    "Untitled": "未标题",
    "loading": "加载中...",
    "select_in_zotero": "在Zotero中选择",
    "push_all_notes": "推送所有笔记"
  };

  // 翻译数据（英文）
  var enTranslations = {
    "window_title": "Web",
    "app_title": "Zotero Connector",
    "settings": "Settings",
    "local_api": "Local API",
    "cloud_api": "Cloud API",
    "library": "Library",
    "selected_cards": "Selected Cards",
    "search_placeholder": "Keywords (Title, Author, Year)...",
    "search_button": "Search",
    "all": "All",
    "ready_to_search": "Ready to search",
    "no_matches_found": "No matches found",
    "searching": "Searching...",
    "connection_failed": "Connection Failed",
    "no_literature_cards": "No literature cards in current selection",
    "open_in_zotero": "Open in Zotero",
    "local_pdf": "Local PDF",
    "web": "Web",
    "cloud_pdf": "Cloud PDF",
    "add_to_mn": "Add to MN",
    "download_pdf": "Download PDF",
    "select": "Select",
    "export": "Export",
    "push_note": "Push Note",
    "unknown": "Unknown",
    "Untitled": "Untitled",
    "loading": "Loading...",
    "select_in_zotero": "Select in Zotero",
    "push_all_notes": "Push All Notes"
  };

  // 当前使用的翻译数据 - 默认使用中文
  var translations = zhCNTranslations;

  // Apple规范的语言标识符到翻译数据的映射
  var languageMap = {
    'zh_CN': zhCNTranslations,
    'zh-Hans-CN': zhCNTranslations,
    'zh-Hans': zhCNTranslations,
    'zh-Hant': zhCNTranslations,
    'zh-Hant-TW': zhCNTranslations,
    'en': enTranslations,
    'en_US': enTranslations,
    'en_GB': enTranslations,
    'en-AU': enTranslations,
    'en-CA': enTranslations,
    'en-IE': enTranslations,
    'en-NZ': enTranslations,
    'en-ZA': enTranslations,
  };

  /**
   * 获取系统语言（前端使用 navigator.language）
   * @returns {string} 语言代码
   */
  function getSystemLanguage() {
    if (typeof navigator !== 'undefined' && navigator.language) {
      return navigator.language.replace('-', '_');
    }
    return 'zh_CN';
  }

  /**
   * 加载对应语言的翻译
   * @param {string} language - 语言代码
   */
  function loadLanguage(language) {
    if (languageMap[language]) {
      translations = languageMap[language];
      return;
    }
    
    // 尝试前缀匹配
    var prefix = language.split('-')[0].split('_')[0];
    for (var key in languageMap) {
      if (key.startsWith(prefix)) {
        translations = languageMap[key];
        return;
      }
    }
  }

  /**
   * 初始化i18n
   */
  function init() {
    var lang = getSystemLanguage();
    loadLanguage(lang);
  }

  /**
   * 翻译函数
   * @param {string} key - 翻译键
   * @param {object} params - 参数对象
   * @returns {string} 翻译后的文本
   */
  function t(key, params) {
    if (!translations || !translations[key]) {
      return key;
    }
    
    var text = translations[key];
    if (params) {
      for (var paramKey in params) {
        if (params.hasOwnProperty(paramKey)) {
          text = text.replace(new RegExp('{' + paramKey + '}', 'g'), params[paramKey]);
        }
      }
    }
    return text;
  }

  // 返回公开API
  return {
    init: init,
    t: t,
    T: t,
    getLanguage: function() {
      return (translations === enTranslations) ? 'en' : 'zh_CN';
    }
  };
})();

// 初始化i18n
Si18n.init();

// 提供全局别名 T，方便使用
window.T = Si18n.T;
