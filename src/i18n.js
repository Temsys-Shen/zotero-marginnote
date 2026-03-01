/**
 * i18n国际化模块（后端版本 - MarginNote）
 * 提供多语言支持功能
 */
var Si18n = (function () {
  'use strict';

  // 翻译数据（中文）
  var zhCNTranslations = {
    "window_title": "网页",
    "app_title": "Zotero Connector",
    "this_feature_supports_cloud_api_only": "此功能仅支持云端API",
    "missing_cloud_api_credentials": "缺少云端API凭证",
    "missing_export_target_parameters": "缺少导出目标参数",
    "no_literature_cards_selected": "未选择文献卡片",
    "no_sync_targets_found": "未找到同步目标",
    "pushing_notes": "正在推送笔记...",
    "authentication_failed": "认证失败",
    "found_items": "找到 {count} 个项目",
    "updated": "已更新",
    "cleaned": "已清理",
    "failed": "失败",
    "empty": "空",
    "push_complete": "推送完成",
    "push_failed": "推送失败",
    "please_open_a_document_first": "请先打开一个文档",
    "card_created": "卡片已创建",
    "card_created_but_failed_to_add_zotero_attachment": "卡片已创建，但添加Zotero附件失败"
  };

  // 翻译数据（英文）
  var enTranslations = {
    "window_title": "Web",
    "app_title": "Zotero Connector",
    "this_feature_supports_cloud_api_only": "This feature supports Cloud API only",
    "missing_cloud_api_credentials": "Missing Cloud API credentials",
    "missing_export_target_parameters": "Missing export target parameters",
    "no_literature_cards_selected": "No literature cards selected",
    "no_sync_targets_found": "No sync targets found",
    "pushing_notes": "Pushing notes...",
    "authentication_failed": "Authentication failed",
    "found_items": "Found {count} items",
    "updated": "updated",
    "cleaned": "cleaned",
    "failed": "failed",
    "empty": "empty",
    "push_complete": "Push complete",
    "push_failed": "Push failed",
    "please_open_a_document_first": "Please open a document first",
    "card_created": "Card created",
    "card_created_but_failed_to_add_zotero_attachment": "Card created, but failed to add Zotero attachment"
  };

  // 当前使用的翻译数据
  var translations = enTranslations;

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
   * 获取系统语言
   * @returns {string} 语言代码
   */
  function getSystemLanguage() {
    var locale = NSLocale.currentLocale();
    return locale ? locale.localeIdentifier() : 'en';
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

// 定义局部别名 t，方便使用
var t = Si18n.t;
