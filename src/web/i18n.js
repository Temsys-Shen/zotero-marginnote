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
    "user_id": "用户ID",
    "username": "用户名",
    "api_key": "API Key",
    "local_api_limit_notice": "使用Local API前，请在Zotero中开启“允许此计算机上的其他应用程序与Zotero通讯”。",
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
    "push_all_notes": "推送所有笔记",
    "refresh": "刷新",
    "field_templates": "字段模板",
    "field_name": "字段名",
    "template": "模板",
    "default": "默认",
    "custom_fields": "自定义字段",
    "add_field": "添加字段",
    "remove_field": "删除",
    "move_up": "上移",
    "move_down": "下移",
    "field_placeholder": "选择Zotero字段",
    "template_placeholder": "输入模板，使用 {{value}} 作为占位符",
    "field_templates_desc": "配置Zotero字段在MarginNote卡片中的显示方式",
    "field_title": "标题",
    "field_author": "作者",
    "field_year": "年份",
    "field_type": "类型",
    "field_tags": "标签",
    "field_abstract": "摘要",
    "field_doi": "DOI",
    "field_isbn": "ISBN",
    "field_issn": "ISSN",
    "field_url": "网址",
    "field_language": "语言",
    "field_publication_title": "出版物",
    "field_volume": "卷",
    "field_issue": "期",
    "field_pages": "页码",
    "field_thesis_type": "论文类型",
    "field_university": "大学",
    "field_extra": "额外信息",
    "field_creators": "作者列表",
    "onboarding_title": "欢迎使用Zotero Connector",
    "onboarding_subtitle": "首次使用建议先了解以下流程，你可以按需选择Local API或Cloud API。",
    "onboarding_step_1": "点击去设置，选择适合你的API模式并完成基础配置。",
    "onboarding_step_2": "Local API速度快但功能受限；Cloud API需要先在Zotero获取API Key。",
    "onboarding_step_3": "返回文献库搜索条目并点击+创建卡片。",
    "onboarding_later": "我知道了",
    "onboarding_go_settings": "去设置",
    "reopen_onboarding": "查看新手引导"
  };

  // 翻译数据（英文）
  var enTranslations = {
    "window_title": "Web",
    "app_title": "Zotero Connector",
    "settings": "Settings",
    "local_api": "Local API",
    "cloud_api": "Cloud API",
    "user_id": "User ID",
    "username": "Username",
    "api_key": "API Key",
    "local_api_limit_notice": "Before using Local API, enable \"Allow other applications on this computer to communicate with Zotero\" in Zotero.",
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
    "push_all_notes": "Push All Notes",
    "refresh": "Refresh",
    "field_templates": "Field Templates",
    "field_name": "Field Name",
    "template": "Template",
    "default": "Default",
    "custom_fields": "Custom Fields",
    "add_field": "Add Field",
    "remove_field": "Remove",
    "move_up": "Move Up",
    "move_down": "Move Down",
    "field_placeholder": "Select Zotero Field",
    "template_placeholder": "Enter template, use {{value}} as placeholder",
    "field_templates_desc": "Configure how Zotero fields are displayed in MarginNote cards",
    "field_title": "Title",
    "field_author": "Author",
    "field_year": "Year",
    "field_type": "Type",
    "field_tags": "Tags",
    "field_abstract": "Abstract",
    "field_doi": "DOI",
    "field_isbn": "ISBN",
    "field_issn": "ISSN",
    "field_url": "URL",
    "field_language": "Language",
    "field_publication_title": "Publication",
    "field_volume": "Volume",
    "field_issue": "Issue",
    "field_pages": "Pages",
    "field_thesis_type": "Thesis Type",
    "field_university": "University",
    "field_extra": "Extra",
    "field_creators": "Creators",
    "onboarding_title": "Welcome to Zotero Connector",
    "onboarding_subtitle": "For first-time use, follow this quick guide. You can choose either Local API or Cloud API.",
    "onboarding_step_1": "Go to Settings, choose the API mode that fits you, and finish basic setup.",
    "onboarding_step_2": "Local API is faster but has limited features. For Cloud API, get your API Key from Zotero first.",
    "onboarding_step_3": "Back to Library, search items, then click + to create a card.",
    "onboarding_later": "Got it",
    "onboarding_go_settings": "Go Settings",
    "reopen_onboarding": "View Beginner Guide"
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
