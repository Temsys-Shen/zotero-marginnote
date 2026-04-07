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
    "local_api_limit_notice": "[仅MacOS]需在Zotero中开启“允许此计算机上的其他应用程序与Zotero通讯”。",
    "local_api_hint": "[仅MacOS]需在Zotero中开启“允许此计算机上的其他应用程序与Zotero通讯”。",
    "library": "文献库",
    "favorites": "收藏夹",
    "selected_cards": "文献卡片列表",
    "search_placeholder": "关键词（标题、作者、年份）...",
    "search_button": "搜索",
    "sort_button": "排序",
    "filter_button": "筛选",
    "sort_added_desc": "加入时间从新到旧",
    "sort_added_asc": "加入时间从旧到新",
    "sort_year_desc": "年份从新到旧",
    "sort_year_asc": "年份从旧到新",
    "sort_title_asc": "标题A-Z",
    "sort_author_asc": "作者A-Z",
    "quick_filter_all": "全部",
    "quick_filter_recent": "近5年",
    "quick_filter_with_tag": "有标签",
    "quick_filter_with_doi": "有DOI",
    "quick_filter_journal": "期刊",
    "filter_panel_title": "高级筛选",
    "filter_item_type": "文献类型",
    "filter_item_type_all": "全部类型",
    "filter_item_type_journal": "期刊文章",
    "filter_item_type_book": "图书",
    "filter_item_type_thesis": "学位论文",
    "filter_year_any": "不限",
    "filter_year_from": "起始年份",
    "filter_year_to": "结束年份",
    "filter_has_tag": "仅显示有标签",
    "filter_has_doi": "仅显示有DOI",
    "filter_reset": "重置",
    "filter_apply": "应用筛选",
    "filter_active_prefix": "已生效条件",
    "result_count": "显示{shown}条，共{total}条",
    "all": "全部",
    "ready_to_search": "准备搜索",
    "no_matches_found": "未找到匹配项",
    "searching": "搜索中...",
    "connection_failed": "连接失败",
    "checking_connection": "正在检查链接...",
    "connection_success": "连接成功",
    "auth_failed": "鉴权失败，请检查用户ID与API Key",
    "missing_user_id": "请先填写用户ID",
    "missing_api_key": "请先填写API Key",
    "no_literature_cards": "当前选区中没有文献卡片",
    "no_literature_cards_in_notebook": "当前笔记本中没有文献卡片",
    "open_in_zotero": "在Zotero中打开",
    "local_pdf": "本地PDF",
    "web": "网页",
    "cloud_pdf": "云PDF",
    "add_to_mn": "添加到MarginNote",
    "import_annotations": "导入标注",
    "download_pdf": "下载PDF",
    "select": "选择",
    "export": "导出",
    "push_note": "推送笔记",
    "unknown": "未知",
    "Untitled": "未标题",
    "loading": "加载中...",
    "select_in_zotero": "在Zotero中选择",
    "push_all_notes": "推送所有笔记",
    "push_checked_notes": "推送笔记",
    "refresh": "刷新",
    "select_all": "全选",
    "invert_selection": "反选",
    "clear_selection": "清空选中",
    "select_current_selected_cards": "勾选当前选中",
    "selected_count_summary": "已选{selected}/总数{total}",
    "batch_import": "批量导入",
    "edit_tag": "编辑Tag",
    "remove_tag": "移除标签",
    "clear_tag": "清空标签",
    "all_favorites": "全部",
    "untagged_favorites": "无Tag",
    "new_tag": "新建Tag",
    "tag_name": "Tag名称",
    "confirm": "确认",
    "delete": "删除",
    "cancel": "取消",
    "favorites_empty": "收藏夹为空",
    "favorites_loading": "正在加载收藏夹...",
    "batch_import_success": "批量导入完成",
    "batch_import_report": "成功{success}，跳过{skipped}，失败{failed}",
    "tag_name_required": "Tag名称不能为空",
    "select_tag_first": "请先在侧边栏选中一个Tag",
    "favorite_add": "加入收藏",
    "favorite_remove": "取消收藏",
    "refresh_favorites": "刷新收藏数据",
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
    "template_field_library": "字段库",
    "field_lang_zh": "中文",
    "field_lang_en": "English",
    "template_drag_hint": "将字段拖拽至右侧",
    "template_canvas_empty": "画布为空，请从左侧拖入字段。",
    "template_row": "第{index}行",
    "add_row": "添加行",
    "delete_row": "删除行",
    "template_click_to_edit": "点击编辑模板",
    "template_remove_block": "移除字段",
    "template_edit_title": "编辑模板",
    "template_edit_field": "字段：{field}",
    "template_edit_save": "保存",
    "template_edit_cancel": "取消",
    "check_link": "检查链接",
    "confirm_save": "确认保存",
    "save_success": "API配置已保存",
    "onboarding_title": "欢迎使用Zotero Connector",
    "onboarding_subtitle": "先用一分钟了解核心功能，再开始你的文献工作流。",
    "onboarding_step_1": "在文献库中可按关键词、标题、作者搜索，并结合分类和标签快速筛选目标条目。",
    "onboarding_step_2": "找到条目后点击加号，可一键生成结构清晰的文献卡片。",
    "onboarding_step_3": "你可利用收藏夹对文献进行批量导入，也可用于整理、回看，以及在其他学习集中复用。",
    "onboarding_step_4": "在文献卡片列表中，你可批量选择文献卡片并将子卡片导出到Zotero，便于后续整理与复用。",
    "onboarding_step_5": "将Zotero存储目录挂载为MarginNote外部文件夹后，点击文献右侧眼睛图标即可在MarginNote中直接打开对应PDF，无需重复导入。",
    "onboarding_step_6": "准备开始前，请前往设置页完成API配置，配置完成后即可使用完整功能。",
    "onboarding_prev": "上一页",
    "onboarding_next": "下一页",
    "onboarding_done": "我知道了",
    "onboarding_later": "我知道了",
    "onboarding_go_settings": "去设置",
    "reopen_onboarding": "查看新手引导",
    "insert_link_guide": "查看使用说明",
    "open_link_help": "打开链接说明",
    "settings_nav_api": "API配置",
    "settings_nav_templates": "字段模板",
    "settings_nav_onboarding": "新手引导",
    "local_status": "本地状态",
    "cloud_status": "云端状态",
    "connected": "已连接",
    "disconnected": "未连接"
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
    "local_api_limit_notice": "[MacOS only] Enable \"Allow other applications on this computer to communicate with Zotero\" in Zotero settings.",
    "local_api_hint": "[MacOS only] Enable \"Allow other applications on this computer to communicate with Zotero\" in Zotero settings.",
    "library": "Library",
    "favorites": "Favorites",
    "selected_cards": "Literature Cards",
    "search_placeholder": "Keywords (Title, Author, Year)...",
    "search_button": "Search",
    "sort_button": "Sort",
    "filter_button": "Filter",
    "sort_added_desc": "Added(Newest first)",
    "sort_added_asc": "Added(Oldest first)",
    "sort_year_desc": "Year(Newest first)",
    "sort_year_asc": "Year(Oldest first)",
    "sort_title_asc": "Title(A-Z)",
    "sort_author_asc": "Author(A-Z)",
    "quick_filter_all": "All",
    "quick_filter_recent": "Recent 5Y",
    "quick_filter_with_tag": "Tagged",
    "quick_filter_with_doi": "Has DOI",
    "quick_filter_journal": "Journal",
    "filter_panel_title": "Advanced Filters",
    "filter_item_type": "Item Type",
    "filter_item_type_all": "All Types",
    "filter_item_type_journal": "Journal Article",
    "filter_item_type_book": "Book",
    "filter_item_type_thesis": "Thesis",
    "filter_year_any": "Any",
    "filter_year_from": "Year From",
    "filter_year_to": "Year To",
    "filter_has_tag": "Only tagged items",
    "filter_has_doi": "Only items with DOI",
    "filter_reset": "Reset",
    "filter_apply": "Apply",
    "filter_active_prefix": "Active filters",
    "result_count": "Showing {shown} of {total}",
    "all": "All",
    "ready_to_search": "Ready to search",
    "no_matches_found": "No matches found",
    "searching": "Searching...",
    "connection_failed": "Connection Failed",
    "checking_connection": "Checking connection...",
    "connection_success": "Connection OK",
    "auth_failed": "Auth failed. Check User ID and API Key.",
    "missing_user_id": "Please fill in User ID first.",
    "missing_api_key": "Please fill in API Key first.",
    "no_literature_cards": "No literature cards in current selection",
    "no_literature_cards_in_notebook": "No literature cards in current notebook",
    "open_in_zotero": "Open in Zotero",
    "local_pdf": "Local PDF",
    "web": "Web",
    "cloud_pdf": "Cloud PDF",
    "add_to_mn": "Add to MN",
    "import_annotations": "Import Annotations",
    "download_pdf": "Download PDF",
    "select": "Select",
    "export": "Export",
    "push_note": "Push Note",
    "unknown": "Unknown",
    "Untitled": "Untitled",
    "loading": "Loading...",
    "select_in_zotero": "Select in Zotero",
    "push_all_notes": "Push All Notes",
    "push_checked_notes": "Push Notes",
    "refresh": "Refresh",
    "select_all": "Select All",
    "invert_selection": "Invert",
    "clear_selection": "Clear",
    "select_current_selected_cards": "Select Current",
    "selected_count_summary": "Selected {selected}/{total}",
    "batch_import": "Batch Import",
    "edit_tag": "Edit Tag",
    "remove_tag": "Remove Tag",
    "clear_tag": "Clear Tags",
    "all_favorites": "All",
    "untagged_favorites": "Untagged",
    "new_tag": "New Tag",
    "tag_name": "Tag Name",
    "confirm": "Confirm",
    "delete": "Delete",
    "cancel": "Cancel",
    "favorites_empty": "No favorites",
    "favorites_loading": "Loading favorites...",
    "batch_import_success": "Batch import completed",
    "batch_import_report": "Success {success}, skipped {skipped}, failed {failed}",
    "tag_name_required": "Tag name is required",
    "select_tag_first": "Please select a tag first",
    "favorite_add": "Add to favorites",
    "favorite_remove": "Remove from favorites",
    "refresh_favorites": "Refresh favorites",
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
    "template_field_library": "Field Library",
    "field_lang_zh": "中文",
    "field_lang_en": "English",
    "template_drag_hint": "Drag fields to the right.",
    "template_canvas_empty": "Canvas is empty. Drag fields from the left side.",
    "template_row": "Row {index}",
    "add_row": "Add Row",
    "delete_row": "Delete Row",
    "template_click_to_edit": "Click to edit template",
    "template_remove_block": "Remove field",
    "template_edit_title": "Edit Template",
    "template_edit_field": "Field: {field}",
    "template_edit_save": "Save",
    "template_edit_cancel": "Cancel",
    "check_link": "Check Connection",
    "confirm_save": "Save",
    "save_success": "API settings saved",
    "onboarding_title": "Welcome to Zotero Connector",
    "onboarding_subtitle": "Take one minute to learn the core features before you start.",
    "onboarding_step_1": "In Library, search by keyword, title, or author, then narrow results with collections and tags.",
    "onboarding_step_2": "After finding an item, click the plus button to create a clear literature card.",
    "onboarding_step_3": "Use Favorites for batch import, and also for organizing, reviewing, and reuse across study sets.",
    "onboarding_step_4": "In Literature Cards, you can batch-select literature cards and export their child cards to Zotero for later organization and reuse.",
    "onboarding_step_5": "After mounting the Zotero storage directory as an external folder in MarginNote, click the eye icon on the right side of an item to open its PDF directly in MarginNote without re-importing.",
    "onboarding_step_6": "Before you begin, go to Settings and complete API configuration to unlock full features.",
    "onboarding_prev": "Previous",
    "onboarding_next": "Next",
    "onboarding_done": "Got it",
    "onboarding_later": "Got it",
    "onboarding_go_settings": "Go Settings",
    "reopen_onboarding": "View Beginner Guide",
    "insert_link_guide": "View Usage Guide",
    "open_link_help": "Open Link Guide",
    "settings_nav_api": "API",
    "settings_nav_templates": "Templates",
    "settings_nav_onboarding": "Onboarding",
    "local_status": "Local Status",
    "cloud_status": "Cloud Status",
    "connected": "Connected",
    "disconnected": "Disconnected"
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
    getLanguage: function () {
      return (translations === enTranslations) ? 'en' : 'zh_CN';
    }
  };
})();

// 初始化i18n
Si18n.init();

// 提供全局别名 T，方便使用
window.T = Si18n.T;
