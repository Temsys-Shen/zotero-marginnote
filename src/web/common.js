const $ = i => document.getElementById(i);
const API = { L: 'http://localhost:23119/api/users', C: 'https://api.zotero.org/users' };
var lastLocalFailureTime = 0;
// Local fetch queue to handle concurrency issues (mnzotero://fetch uses a single global window.__mnFetchPending)
var __mnFetchQueue = [];
var __mnFetchBusy = false;

function setConfigValue(key, val) {
    var iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'mnzotero://setConfig?key=' + encodeURIComponent(key) + '&val=' + encodeURIComponent(val);
    document.body.appendChild(iframe);
    setTimeout(function () { try { iframe.remove(); } catch (e) { } }, 500);
}

/**
 * Common configuration management
 */
function upd() {
    var modeEl = $('mode');
    var cfg = window.__mnConfig || {};
    var mode = modeEl ? modeEl.value : (cfg.mode || 'L');

    var keyEl = $('key');
    var uidEl = $('uid');
    var slugEl = $('slug');

    // Always show Cloud config fields (since Local needs no config)
    if (keyEl) keyEl.style.display = 'block';
    if (uidEl) uidEl.style.display = 'block';
    if (slugEl) slugEl.style.display = 'block';

    var togglePassword = document.querySelector('.toggle-password');
    if (togglePassword) togglePassword.style.display = 'block';

}

/**
 * Initialize config panel logic
 */
(function initModeOptions() {
    var opts = document.querySelectorAll('.mode-option');
    var modeInput = $('mode');
    var apiCheckBtn = $('btn-api-check');
    var apiSaveBtn = $('btn-api-save');
    var apiStatusEl = $('api-action-status');
    var apiDirty = false;

    function loadConfig(config) {
        if (!config) return;
        ['uid', 'slug', 'key', 'mode'].forEach(id => {
            if (document.getElementById(id) && config[id] !== undefined) {
                $(id).value = config[id];
                if (id === 'mode') {
                    opts.forEach(function (o) {
                        if (o.getAttribute('data-value') === config[id]) o.classList.add('active');
                        else o.classList.remove('active');
                    });
                }
            }
        });
        upd();
        apiDirty = false;
        updateApiSaveButtonState();
    }

    // Initial load from injected config if present
    if (window.__mnConfig) {
        loadConfig(window.__mnConfig);
    }

    // Listener for late injection - preserve existing handler
    var existingOnMNConfig = window.onMNConfig;
    window.onMNConfig = function () {
        loadConfig(window.__mnConfig);
        if (typeof existingOnMNConfig === 'function') {
            existingOnMNConfig();
        }
    };

    function setApiStatus(text, kind) {
        if (!apiStatusEl) return;
        apiStatusEl.style.display = text ? 'block' : 'none';
        apiStatusEl.textContent = text || '';
        apiStatusEl.classList.remove('success');
        apiStatusEl.classList.remove('error');
        if (kind) apiStatusEl.classList.add(kind);
    }

    function updateApiSaveButtonState() {
        if (!apiSaveBtn) return;
        apiSaveBtn.disabled = !apiDirty;
    }

    function markApiDirty() {
        apiDirty = true;
        updateApiSaveButtonState();
    }

    function readApiConfigFromDom() {
        var cfg = window.__mnConfig || {};
        var mode = modeInput ? String(modeInput.value || '').trim() : String(cfg.mode || 'L').trim();
        if (!API[mode]) mode = 'L';
        var uid = $('uid') ? String($('uid').value || '').trim() : String(cfg.uid || '').trim();
        var slug = $('slug') ? String($('slug').value || '').trim() : String(cfg.slug || '').trim();
        var key = $('key') ? String($('key').value || '').trim() : String(cfg.key || '').trim();
        return { mode: mode, uid: uid, slug: slug, key: key };
    }

    // Mark dirty on edit (no auto-save)
    ['uid', 'slug', 'key'].forEach(id => {
        var el = $(id);
        if (!el) return;
        var onEdit = function () {
            markApiDirty();
            setApiStatus('');
        };
        el.addEventListener('input', onEdit);
        el.addEventListener('change', onEdit);
    });

    if (modeInput) {
        opts.forEach(function (el) {
            el.addEventListener('click', function () {
                var v = this.getAttribute('data-value');
                modeInput.value = v;
                opts.forEach(function (o) { o.classList.remove('active'); });
                this.classList.add('active');
                upd();
                markApiDirty();
                setApiStatus('');
            });
        });
    }

    window.saveApiConfig = function saveApiConfig() {
        var next = readApiConfigFromDom();
        setConfigValue('mode', next.mode);
        setConfigValue('uid', next.uid);
        setConfigValue('slug', next.slug);
        setConfigValue('key', next.key);

        window.__mnConfig = window.__mnConfig || {};
        window.__mnConfig.mode = next.mode;
        window.__mnConfig.uid = next.uid;
        window.__mnConfig.slug = next.slug;
        window.__mnConfig.key = next.key;

        apiDirty = false;
        updateApiSaveButtonState();

        if (apiSaveBtn) {
            apiSaveBtn.classList.remove('save-success');
            void apiSaveBtn.offsetWidth;
            apiSaveBtn.classList.add('save-success');
        }
        setApiStatus((typeof T === 'function') ? T('save_success') : 'Saved', 'success');
    };

    function setStatusLight(id, state) {
        var light = $(id + '-light');
        var text = $(id + '-status-text');
        if (!light) return;
        light.className = 'status-light ' + state;
        if (text) {
            if (state === 'connected') text.textContent = (typeof T === 'function') ? T('connected') : 'Connected';
            else if (state === 'error') text.textContent = (typeof T === 'function') ? T('disconnected') : 'Disconnected';
            else if (state === 'checking') text.textContent = (typeof T === 'function') ? T('checking_connection') : 'Checking...';
        }
    }

    window.checkApiConnection = async function checkApiConnection() {
        var cfg = readApiConfigFromDom();
        var uid = cfg.uid;
        var key = cfg.key;

        if (apiCheckBtn) apiCheckBtn.disabled = true;
        setApiStatus((typeof T === 'function') ? T('checking_connection') : 'Checking...', '');

        // 1. Check Local
        setStatusLight('local', 'checking');
        var localOk = false;
        try {
            var localRes = await localFetch('http://localhost:23119/api/users/0/collections?limit=1');
            localOk = !!(localRes && localRes.ok);
            if (localOk) lastLocalFailureTime = 0; // Reset cooling period on success
            setStatusLight('local', localOk ? 'connected' : 'error');
        } catch (e) {
            setStatusLight('local', 'error');
        }

        // 2. Check Cloud
        setStatusLight('cloud', 'checking');
        var cloudOk = false;
        if (!uid || !key) {
            setStatusLight('cloud', 'error');
        } else {
            try {
                var cloudRes = await fetch('https://api.zotero.org/users/' + encodeURIComponent(uid) + '/collections?limit=1', {
                    headers: { 'Zotero-API-Version': 3, 'Zotero-API-Key': key }
                });
                cloudOk = !!(cloudRes && cloudRes.ok);
                setStatusLight('cloud', cloudOk ? 'connected' : 'error');
            } catch (e) {
                setStatusLight('cloud', 'error');
            }
        }

        if (localOk || cloudOk) {
            setApiStatus((typeof T === 'function') ? T('connection_success') : 'OK', 'success');
        } else {
            setApiStatus((typeof T === 'function') ? T('connection_failed') : 'Failed', 'error');
        }
        if (apiCheckBtn) apiCheckBtn.disabled = false;
    };

    // Initial state for new buttons (if present)
    updateApiSaveButtonState();
})();

/**
 * Initialize global view switcher navigation
 */
(function initViewSwitcher() {
    // Only handle library.html view switching (not for selection.html)
    if (typeof window.location !== 'undefined' && window.location.pathname.indexOf('selection.html') > -1) {
        return;
    }

    document.querySelectorAll('.view-option[data-view]').forEach(function (el) {
        el.addEventListener('click', function () {
            var view = this.getAttribute('data-view');
            if (view === 'library') {
                // Already on library page
            } else if (view === 'favorites') {
                window.location.href = 'favorites.html';
            } else if (view === 'selected') {
                window.location.href = 'selection.html';
            } else if (view === 'settings') {
                window.location.href = 'settings.html';
            }
        });
    });
})();

// Helper fetch for local mode - queue-based strategy to avoid overwriting mnzotero://fetch trigger data
function localFetch(url, options) {
    return new Promise(function (resolve, reject) {
        var id = 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        var request = {
            id: id,
            url: url,
            options: options || {},
            resolve: resolve,
            reject: reject
        };
        __mnFetchQueue.push(request);
        processFetchQueue();
    });
}

function processFetchQueue() {
    if (__mnFetchBusy || __mnFetchQueue.length === 0) return;
    __mnFetchBusy = true;

    var req = __mnFetchQueue[0];
    var id = req.id;

    window.__mnFetchCb = window.__mnFetchCb || {};
    window.__mnFetchCb[id] = function (err, data) {
        try { delete window.__mnFetchCb[id]; } catch (e) { }

        __mnFetchBusy = false;
        __mnFetchQueue.shift();

        if (err) req.reject(new Error(err));
        else req.resolve({
            ok: data && data.ok,
            status: data && data.status,
            json: function () { return Promise.resolve(data && data.body != null ? data.body : {}); }
        });

        processFetchQueue();
    };

    window.__mnFetchPending = JSON.stringify({ id: id, url: req.url, options: req.options });
    var iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'mnzotero://fetch';
    document.body.appendChild(iframe);
    setTimeout(function () { try { iframe.remove(); } catch (e) { } }, 500);
}

/**
 * Smart Fetch: Try Local first, fallback to Cloud
 */
async function smartFetch(path, options) {
    var opts = options || {};
    var cfg = window.__mnConfig || {};
    var uid = cfg.uid || '0';
    var key = cfg.key || '';
    var forceCloud = !!opts.forceCloud;
    var requestOpts = Object.assign({}, opts);
    if (requestOpts.forceCloud !== undefined) delete requestOpts.forceCloud;

    // 1. Try Local API (using user 0)
    // Circuit breaker: skip if failed in the last 10 seconds
    if (!forceCloud && Date.now() - lastLocalFailureTime > 10000) {
        var localPath = path.replace(new RegExp('/users/' + uid), '/users/0');
        var localUrl = 'http://localhost:23119/api' + localPath;
        console.log('[Network] Try Local: ' + localPath);
        try {
            var res = await localFetch(localUrl, requestOpts);
            if (res.ok) {
                console.log('[Network] Success (Local): ' + localPath);
                return res;
            } else {
                console.log('[Network] Failed (Local): ' + localPath + ' (Status: ' + res.status + ')');
            }
        } catch (e) {
            console.log('[Network] Error (Local): ' + localPath + '. Message: ' + e.message);
            lastLocalFailureTime = Date.now();
        }
    } else if (!forceCloud) {
        console.log('[Network] Circuit Breaker Active. Skip Local: ' + path);
    } else {
        console.log('[Network] Force Cloud: ' + path);
    }

    // 2. Try Cloud API
    var cloudUrl = 'https://api.zotero.org' + path;
    var headers = Object.assign({}, requestOpts.headers || {}, {
        'Zotero-API-Version': 3
    });
    if (key) headers['Zotero-API-Key'] = key;

    console.log('[Network] Fallback/Direct Cloud: ' + path);
    return fetch(cloudUrl, Object.assign({}, requestOpts, { headers: headers })).then(function (res) {
        console.log('[Network] Result (Cloud): ' + path + ' (Status: ' + res.status + ')');
        return res;
    });
}

/**
 * Toggle password visibility for API key input
 */
function togglePasswordVisibility() {
    const keyInput = $('key');
    const toggleIcon = document.querySelector('.toggle-password');
    if (keyInput.type === 'password') {
        keyInput.type = 'text';
        setToggleIcon(toggleIcon, true); // 显示状态
    } else {
        keyInput.type = 'password';
        setToggleIcon(toggleIcon, false); // 隐藏状态
    }
}

/**
 * 设置密码切换图标的SVG
 * @param {HTMLElement} element - 要设置图标的元素
 * @param {boolean} isVisible - 是否为可见状态
 */
function setToggleIcon(element, isVisible) {
    if (isVisible) {
        // 可见状态：眼睛图标
        element.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>';
    } else {
        // 隐藏状态：眼睛斜线图标
        element.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>';
    }
}

// 初始化密码切换图标为隐藏状态
(function initToggleIcon() {
    const toggleIcon = document.querySelector('.toggle-password');
    if (toggleIcon) {
        setToggleIcon(toggleIcon, false);
    }
})();

/**
 * 字段模板配置管理
 */
var FIELD_TEMPLATE_DEFAULTS = {
    author: 'by {{value}}',
    year: '({{value}})',
    type: '<z style="color:#9;font:1em;background:#eee;padding:.1em .5em;border-radius:.4em">{{value}}</z>'
};
var FIELD_LIBRARY_STORAGE_KEY = 'mn_zotero_field_display_lang';
var FIELD_LABELS_ZH = {
    title: '标题',
    abstractNote: '摘要',
    artworkMedium: '艺术媒介',
    medium: '媒介',
    artworkSize: '艺术尺寸',
    date: '日期',
    language: '语言',
    shortTitle: '短标题',
    archive: '档案',
    archiveLocation: '档案位置',
    libraryCatalog: '馆藏目录',
    callNumber: '索书号',
    url: '网址',
    accessDate: '访问日期',
    rights: '权利',
    extra: '额外信息',
    audioRecordingFormat: '音频录制格式',
    seriesTitle: '丛书标题',
    volume: '卷',
    numberOfVolumes: '总卷数',
    place: '地点',
    label: '标签',
    publisher: '出版者',
    runningTime: '时长',
    ISBN: 'ISBN',
    billNumber: '法案编号',
    number: '编号',
    code: '法典',
    codeVolume: '法典卷次',
    section: '条款',
    codePages: '法典页码',
    pages: '页码',
    legislativeBody: '立法机构',
    authority: '主管机构',
    session: '会议期次',
    history: '历史',
    blogTitle: '博客标题',
    publicationTitle: '出版物',
    websiteType: '网站类型',
    type: '类型',
    series: '系列',
    seriesNumber: '系列编号',
    edition: '版次',
    numPages: '总页数',
    bookTitle: '书名',
    caseName: '案件名称',
    court: '法院',
    dateDecided: '裁决日期',
    docketNumber: '案号',
    reporter: '判例汇编',
    reporterVolume: '判例卷次',
    firstPage: '起始页',
    versionNumber: '版本号',
    system: '系统',
    company: '公司',
    programmingLanguage: '编程语言',
    proceedingsTitle: '论文集标题',
    conferenceName: '会议名称',
    DOI: 'DOI',
    identifier: '标识符',
    repository: '资料库',
    repositoryLocation: '资料库位置',
    format: '格式',
    citationKey: '引用键',
    dictionaryTitle: '词典标题',
    subject: '主题',
    encyclopediaTitle: '百科标题',
    distributor: '发行方',
    genre: '体裁',
    videoRecordingFormat: '视频录制格式',
    forumTitle: '论坛标题',
    postType: '帖子类型',
    committee: '委员会',
    documentNumber: '文件编号',
    interviewMedium: '访谈媒介',
    issue: '期',
    seriesText: '系列文本',
    journalAbbreviation: '期刊简称',
    ISSN: 'ISSN',
    letterType: '信件类型',
    manuscriptType: '手稿类型',
    mapType: '地图类型',
    scale: '比例尺',
    country: '国家',
    assignee: '受让人',
    issuingAuthority: '签发机构',
    patentNumber: '专利号',
    filingDate: '申请日期',
    applicationNumber: '申请号',
    priorityNumbers: '优先权号',
    issueDate: '发布日期',
    references: '参考文献',
    legalStatus: '法律状态',
    status: '状态',
    episodeNumber: '集数',
    audioFileType: '音频文件类型',
    archiveID: '档案ID',
    presentationType: '演示类型',
    meetingName: '会议名称',
    programTitle: '节目标题',
    network: '播出网络',
    reportNumber: '报告编号',
    reportType: '报告类型',
    institution: '机构',
    organization: '组织',
    nameOfAct: '法案名称',
    codeNumber: '法典编号',
    publicLawNumber: '公法编号',
    dateEnacted: '颁布日期',
    thesisType: '论文类型',
    university: '大学',
    studio: '工作室',
    websiteTitle: '网站标题',
    eventPlace: '事件地点',
    originalDate: '原始日期',
    originalPublisher: '原始出版者',
    originalPlace: '原始地点',
    partNumber: '部分编号',
    partTitle: '部分标题',
    PMID: 'PMID',
    PMCID: 'PMCID',
    priorityDate: '优先权日期',
    sessionTitle: '会话标题',
    author: '作者',
    year: '年份',
    creators: '作者列表',
    tags: '标签'
};
var FIELD_LABELS_EN = {
    title: 'Title',
    abstractNote: 'Abstract',
    artworkMedium: 'Artwork Medium',
    medium: 'Medium',
    artworkSize: 'Artwork Size',
    date: 'Date',
    language: 'Language',
    shortTitle: 'Short Title',
    archive: 'Archive',
    archiveLocation: 'Archive Location',
    libraryCatalog: 'Library Catalog',
    callNumber: 'Call Number',
    url: 'URL',
    accessDate: 'Access Date',
    rights: 'Rights',
    extra: 'Extra',
    audioRecordingFormat: 'Audio Recording Format',
    seriesTitle: 'Series Title',
    volume: 'Volume',
    numberOfVolumes: 'Number Of Volumes',
    place: 'Place',
    label: 'Label',
    publisher: 'Publisher',
    runningTime: 'Running Time',
    ISBN: 'ISBN',
    billNumber: 'Bill Number',
    number: 'Number',
    code: 'Code',
    codeVolume: 'Code Volume',
    section: 'Section',
    codePages: 'Code Pages',
    pages: 'Pages',
    legislativeBody: 'Legislative Body',
    authority: 'Authority',
    session: 'Session',
    history: 'History',
    blogTitle: 'Blog Title',
    publicationTitle: 'Publication Title',
    websiteType: 'Website Type',
    type: 'Type',
    series: 'Series',
    seriesNumber: 'Series Number',
    edition: 'Edition',
    numPages: 'Num Pages',
    bookTitle: 'Book Title',
    caseName: 'Case Name',
    court: 'Court',
    dateDecided: 'Date Decided',
    docketNumber: 'Docket Number',
    reporter: 'Reporter',
    reporterVolume: 'Reporter Volume',
    firstPage: 'First Page',
    versionNumber: 'Version Number',
    system: 'System',
    company: 'Company',
    programmingLanguage: 'Programming Language',
    proceedingsTitle: 'Proceedings Title',
    conferenceName: 'Conference Name',
    DOI: 'DOI',
    identifier: 'Identifier',
    repository: 'Repository',
    repositoryLocation: 'Repository Location',
    format: 'Format',
    citationKey: 'Citation Key',
    dictionaryTitle: 'Dictionary Title',
    subject: 'Subject',
    encyclopediaTitle: 'Encyclopedia Title',
    distributor: 'Distributor',
    genre: 'Genre',
    videoRecordingFormat: 'Video Recording Format',
    forumTitle: 'Forum Title',
    postType: 'Post Type',
    committee: 'Committee',
    documentNumber: 'Document Number',
    interviewMedium: 'Interview Medium',
    issue: 'Issue',
    seriesText: 'Series Text',
    journalAbbreviation: 'Journal Abbreviation',
    ISSN: 'ISSN',
    letterType: 'Letter Type',
    manuscriptType: 'Manuscript Type',
    mapType: 'Map Type',
    scale: 'Scale',
    country: 'Country',
    assignee: 'Assignee',
    issuingAuthority: 'Issuing Authority',
    patentNumber: 'Patent Number',
    filingDate: 'Filing Date',
    applicationNumber: 'Application Number',
    priorityNumbers: 'Priority Numbers',
    issueDate: 'Issue Date',
    references: 'References',
    legalStatus: 'Legal Status',
    status: 'Status',
    episodeNumber: 'Episode Number',
    audioFileType: 'Audio File Type',
    archiveID: 'Archive ID',
    presentationType: 'Presentation Type',
    meetingName: 'Meeting Name',
    programTitle: 'Program Title',
    network: 'Network',
    reportNumber: 'Report Number',
    reportType: 'Report Type',
    institution: 'Institution',
    organization: 'Organization',
    nameOfAct: 'Name Of Act',
    codeNumber: 'Code Number',
    publicLawNumber: 'Public Law Number',
    dateEnacted: 'Date Enacted',
    thesisType: 'Thesis Type',
    university: 'University',
    studio: 'Studio',
    websiteTitle: 'Website Title',
    eventPlace: 'Event Place',
    originalDate: 'Original Date',
    originalPublisher: 'Original Publisher',
    originalPlace: 'Original Place',
    partNumber: 'Part Number',
    partTitle: 'Part Title',
    PMID: 'PMID',
    PMCID: 'PMCID',
    priorityDate: 'Priority Date',
    sessionTitle: 'Session Title',
    author: 'Author',
    year: 'Year',
    creators: 'Creators',
    tags: 'Tags'
};
var TEMPLATE_FIELD_LIST = (function buildTemplateFieldList() {
    var allFields = [
        'author',
        'year',
        'type',
        'creators',
        'tags',
        'title',
        'abstractNote',
        'artworkMedium',
        'medium',
        'artworkSize',
        'date',
        'language',
        'shortTitle',
        'archive',
        'archiveLocation',
        'libraryCatalog',
        'callNumber',
        'url',
        'accessDate',
        'rights',
        'extra',
        'audioRecordingFormat',
        'seriesTitle',
        'volume',
        'numberOfVolumes',
        'place',
        'label',
        'publisher',
        'runningTime',
        'ISBN',
        'billNumber',
        'number',
        'code',
        'codeVolume',
        'section',
        'codePages',
        'pages',
        'legislativeBody',
        'authority',
        'session',
        'history',
        'blogTitle',
        'publicationTitle',
        'websiteType',
        'series',
        'seriesNumber',
        'edition',
        'numPages',
        'bookTitle',
        'caseName',
        'court',
        'dateDecided',
        'docketNumber',
        'reporter',
        'reporterVolume',
        'firstPage',
        'versionNumber',
        'system',
        'company',
        'programmingLanguage',
        'proceedingsTitle',
        'conferenceName',
        'DOI',
        'identifier',
        'repository',
        'repositoryLocation',
        'format',
        'citationKey',
        'dictionaryTitle',
        'subject',
        'encyclopediaTitle',
        'distributor',
        'genre',
        'videoRecordingFormat',
        'forumTitle',
        'postType',
        'committee',
        'documentNumber',
        'interviewMedium',
        'issue',
        'seriesText',
        'journalAbbreviation',
        'ISSN',
        'letterType',
        'manuscriptType',
        'mapType',
        'scale',
        'country',
        'assignee',
        'issuingAuthority',
        'patentNumber',
        'filingDate',
        'applicationNumber',
        'priorityNumbers',
        'issueDate',
        'references',
        'legalStatus',
        'status',
        'episodeNumber',
        'audioFileType',
        'archiveID',
        'presentationType',
        'meetingName',
        'programTitle',
        'network',
        'reportNumber',
        'reportType',
        'institution',
        'organization',
        'nameOfAct',
        'codeNumber',
        'publicLawNumber',
        'dateEnacted',
        'thesisType',
        'university',
        'studio',
        'websiteTitle',
        'eventPlace',
        'originalDate',
        'originalPublisher',
        'originalPlace',
        'partNumber',
        'partTitle',
        'PMID',
        'PMCID',
        'priorityDate',
        'sessionTitle'
    ];
    allFields.sort(function (a, b) {
        return String(a || '').toLowerCase().localeCompare(String(b || '').toLowerCase());
    });
    var seen = {};
    var list = [];
    allFields.forEach(function (f) {
        if (seen[f]) return;
        seen[f] = true;
        list.push(f);
    });
    return list;
})();
var fieldTemplateUiState = {
    config: null,
    dragPayload: null,
    touchDrag: null,
    desktopDragPreview: null,
    editingBlockId: '',
    justDragged: false,
    fieldDisplayLang: 'zh'
};

function createTemplateId(prefix) {
    return String(prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function getDefaultTemplateForField(field) {
    if (FIELD_TEMPLATE_DEFAULTS[field]) return FIELD_TEMPLATE_DEFAULTS[field];
    return '{{value}}';
}

function getDefaultFieldTemplateConfig() {
    return {
        version: '2',
        layout: {
            rows: [
                {
                    id: createTemplateId('row'),
                    blocks: [
                        {
                            id: createTemplateId('block'),
                            field: 'author',
                            template: getDefaultTemplateForField('author')
                        },
                        {
                            id: createTemplateId('block'),
                            field: 'year',
                            template: getDefaultTemplateForField('year')
                        }
                    ]
                },
                {
                    id: createTemplateId('row'),
                    blocks: [
                        {
                            id: createTemplateId('block'),
                            field: 'type',
                            template: getDefaultTemplateForField('type')
                        }
                    ]
                },
                {
                    id: createTemplateId('row'),
                    blocks: [
                        {
                            id: createTemplateId('block'),
                            field: 'extra',
                            template: getDefaultTemplateForField('extra')
                        }
                    ]
                }
            ]
        }
    };
}

function normalizeFieldTemplatesConfig(rawTemplates) {
    var defaults = getDefaultFieldTemplateConfig();
    if (rawTemplates === undefined || rawTemplates === null || rawTemplates === '') {
        return defaults;
    }

    var parsed = rawTemplates;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch (e) {
            return defaults;
        }
    }

    if (!parsed || typeof parsed !== 'object') {
        return defaults;
    }

    if (String(parsed.version || '') !== '2' || !parsed.layout || !Array.isArray(parsed.layout.rows)) {
        return defaults;
    }

    var rows = [];
    parsed.layout.rows.forEach(function (row) {
        if (!row || typeof row !== 'object') return;
        var rowId = row.id !== undefined && row.id !== null ? String(row.id) : '';
        if (!rowId) rowId = createTemplateId('row');
        var blocksRaw = Array.isArray(row.blocks) ? row.blocks : [];
        var blocks = [];
        blocksRaw.forEach(function (block) {
            if (!block || typeof block !== 'object') return;
            var field = block.field !== undefined && block.field !== null ? String(block.field).trim() : '';
            if (!field) return;
            var blockId = block.id !== undefined && block.id !== null ? String(block.id) : '';
            if (!blockId) blockId = createTemplateId('block');
            var templateRaw = block.template !== undefined && block.template !== null ? String(block.template) : '';
            blocks.push({
                id: blockId,
                field: field,
                template: templateRaw || getDefaultTemplateForField(field)
            });
        });
        rows.push({ id: rowId, blocks: blocks });
    });

    if (rows.length === 0) {
        rows.push({ id: createTemplateId('row'), blocks: [] });
    }

    var normalized = {
        version: '2',
        layout: { rows: rows }
    };
    return normalized;
}

function cloneFieldTemplateConfig(config) {
    return JSON.parse(JSON.stringify(config || getDefaultFieldTemplateConfig()));
}

function setFieldTemplates(templates) {
    var iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'mnzotero://setConfig?key=fieldTemplates&val=' + encodeURIComponent(JSON.stringify(templates || {}));
    document.body.appendChild(iframe);
    setTimeout(function () { try { iframe.remove(); } catch (e) { } }, 500);
}

function getFieldTemplates() {
    var hasSettingsTemplateDom = !!document.getElementById('template-builder');
    if (!hasSettingsTemplateDom) {
        var config = window.__mnConfig || {};
        return normalizeFieldTemplatesConfig(config.fieldTemplates);
    }
    return cloneFieldTemplateConfig(fieldTemplateUiState.config || getDefaultFieldTemplateConfig());
}

function loadFieldTemplates(templates) {
    fieldTemplateUiState.config = normalizeFieldTemplatesConfig(templates);
    renderFieldTemplateBuilder();
}

function saveFieldTemplateLayout() {
    var templates = getFieldTemplates();
    setFieldTemplates(templates);
    window.__mnConfig = window.__mnConfig || {};
    window.__mnConfig.fieldTemplates = templates;
}

function inferDefaultFieldDisplayLang() {
    var lang = '';
    try {
        lang = String((navigator && navigator.language) || '').toLowerCase();
    } catch (e) {
        lang = '';
    }
    return lang.indexOf('zh') === 0 ? 'zh' : 'en';
}

function getFieldDisplayLang() {
    try {
        var saved = String(localStorage.getItem(FIELD_LIBRARY_STORAGE_KEY) || '').toLowerCase();
        if (saved === 'zh' || saved === 'en') return saved;
    } catch (e) { }
    return inferDefaultFieldDisplayLang();
}

function setFieldDisplayLang(lang) {
    var next = String(lang || '').toLowerCase();
    if (next !== 'zh' && next !== 'en') return;
    fieldTemplateUiState.fieldDisplayLang = next;
    try {
        localStorage.setItem(FIELD_LIBRARY_STORAGE_KEY, next);
    } catch (e) { }
}

function fallbackFieldName(field) {
    return String(field || '')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/^\s+|\s+$/g, '');
}

function getFieldNameForSelect(field) {
    var lang = fieldTemplateUiState.fieldDisplayLang || getFieldDisplayLang();
    if (lang === 'en') return FIELD_LABELS_EN[field] || fallbackFieldName(field) || field;
    return FIELD_LABELS_ZH[field] || fallbackFieldName(field) || field;
}

function findRowById(rowId) {
    var cfg = fieldTemplateUiState.config;
    if (!cfg || !cfg.layout || !Array.isArray(cfg.layout.rows)) return null;
    for (var i = 0; i < cfg.layout.rows.length; i++) {
        if (cfg.layout.rows[i].id === rowId) return cfg.layout.rows[i];
    }
    return null;
}

function findBlockLocation(blockId) {
    var cfg = fieldTemplateUiState.config;
    if (!cfg || !cfg.layout || !Array.isArray(cfg.layout.rows)) return null;
    for (var i = 0; i < cfg.layout.rows.length; i++) {
        var row = cfg.layout.rows[i];
        for (var j = 0; j < row.blocks.length; j++) {
            if (row.blocks[j].id === blockId) {
                return { rowIndex: i, blockIndex: j, row: row, block: row.blocks[j] };
            }
        }
    }
    return null;
}

function ensureAtLeastOneTemplateRow() {
    var cfg = fieldTemplateUiState.config;
    if (!cfg || !cfg.layout || !Array.isArray(cfg.layout.rows)) {
        fieldTemplateUiState.config = getDefaultFieldTemplateConfig();
        return;
    }
    if (cfg.layout.rows.length === 0) {
        cfg.layout.rows.push({ id: createTemplateId('row'), blocks: [] });
    }
}

function removeBlockById(blockId) {
    var location = findBlockLocation(blockId);
    if (!location) return;
    location.row.blocks.splice(location.blockIndex, 1);
}

function calcDropIndex(blocksContainer, clientX, ignoreBlockId) {
    var blocks = blocksContainer.querySelectorAll('.template-layout-block');
    var kept = [];
    blocks.forEach(function (el) {
        var id = el.getAttribute('data-block-id') || '';
        if (ignoreBlockId && id === ignoreBlockId) return;
        kept.push(el);
    });
    if (kept.length === 0) return 0;
    for (var i = 0; i < kept.length; i++) {
        var rect = kept[i].getBoundingClientRect();
        if (clientX < rect.left + rect.width / 2) return i;
    }
    return kept.length;
}

function clearDropIndicators() {
    document.querySelectorAll('.template-drop-indicator').forEach(function (node) {
        if (node && node.parentNode) node.parentNode.removeChild(node);
    });
    document.querySelectorAll('.template-layout-row.drag-over').forEach(function (node) {
        node.classList.remove('drag-over');
    });
}

function renderDropIndicator(rowId, index, ignoreBlockId) {
    clearDropIndicators();
    var rowBlocks = document.querySelector('.template-row-blocks[data-row-id="' + rowId + '"]');
    if (!rowBlocks) return;
    var row = rowBlocks.closest('.template-layout-row');
    if (row) row.classList.add('drag-over');
    var indicator = document.createElement('div');
    indicator.className = 'template-drop-indicator';
    var blocks = rowBlocks.querySelectorAll('.template-layout-block');
    var kept = [];
    blocks.forEach(function (el) {
        var id = el.getAttribute('data-block-id') || '';
        if (ignoreBlockId && id === ignoreBlockId) return;
        kept.push(el);
    });
    if (index >= kept.length) rowBlocks.appendChild(indicator);
    else rowBlocks.insertBefore(indicator, kept[index]);
}

function insertBlockToRow(rowId, index, block) {
    var row = findRowById(rowId);
    if (!row) return;
    var safeIndex = Math.max(0, Math.min(index, row.blocks.length));
    row.blocks.splice(safeIndex, 0, block);
}

function moveBlockTo(blockId, targetRowId, targetIndex) {
    var location = findBlockLocation(blockId);
    if (!location) return;
    var moving = location.block;
    var sourceRow = location.row;
    sourceRow.blocks.splice(location.blockIndex, 1);
    if (sourceRow.id === targetRowId && targetIndex > location.blockIndex) targetIndex -= 1;
    insertBlockToRow(targetRowId, targetIndex, moving);
}

function createBlockForField(field) {
    return {
        id: createTemplateId('block'),
        field: field,
        template: getDefaultTemplateForField(field)
    };
}

function applyDropPayload(payload, targetRowId, targetIndex) {
    if (!payload || !targetRowId) return;
    if (payload.type === 'palette' && payload.field) {
        insertBlockToRow(targetRowId, targetIndex, createBlockForField(payload.field));
        return;
    }
    if (payload.type === 'block' && payload.blockId) {
        moveBlockTo(payload.blockId, targetRowId, targetIndex);
    }
}

function renderFieldTemplateBuilder() {
    var palette = document.getElementById('field-palette-list');
    var canvas = document.getElementById('template-layout-canvas');
    if (!palette || !canvas) return;

    var cfg = fieldTemplateUiState.config || getDefaultFieldTemplateConfig();
    fieldTemplateUiState.config = cfg;
    ensureAtLeastOneTemplateRow();
    var currentLang = fieldTemplateUiState.fieldDisplayLang || getFieldDisplayLang();
    var langButtons = document.querySelectorAll('.field-lang-btn');
    langButtons.forEach(function (btn) {
        var lang = btn.getAttribute('data-lang') || '';
        if (lang === currentLang) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    palette.innerHTML = '';
    TEMPLATE_FIELD_LIST.forEach(function (field) {
        var item = document.createElement('div');
        item.className = 'field-palette-item';
        item.setAttribute('draggable', 'true');
        item.setAttribute('data-field', field);
        item.innerHTML = '<span>' + getFieldNameForSelect(field) + '</span>';
        item.title = getFieldNameForSelect(field);
        palette.appendChild(item);
    });

    canvas.innerHTML = '';
    var rows = cfg.layout.rows || [];
    if (!rows.length) {
        var empty = document.createElement('div');
        empty.className = 'template-empty';
        empty.textContent = T('template_canvas_empty');
        canvas.appendChild(empty);
        return;
    }

    rows.forEach(function (row, rowIndex) {
        var rowEl = document.createElement('div');
        rowEl.className = 'template-layout-row';
        rowEl.setAttribute('data-row-id', row.id);

        var header = document.createElement('div');
        header.className = 'template-layout-row-header';
        header.innerHTML = '<span class="template-layout-row-title">' + T('template_row', { index: rowIndex + 1 }) + '</span>';

        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete-row';
        deleteBtn.type = 'button';
        deleteBtn.setAttribute('data-row-id', row.id);
        deleteBtn.textContent = T('delete_row');
        header.appendChild(deleteBtn);
        rowEl.appendChild(header);

        var blocks = document.createElement('div');
        blocks.className = 'template-layout-row-blocks template-row-blocks';
        blocks.setAttribute('data-row-id', row.id);
        rowEl.appendChild(blocks);

        row.blocks.forEach(function (block) {
            var blockEl = document.createElement('div');
            blockEl.className = 'template-layout-block';
            blockEl.setAttribute('draggable', 'true');
            blockEl.setAttribute('data-block-id', block.id);
            blockEl.setAttribute('data-row-id', row.id);
            blockEl.setAttribute('title', T('template_click_to_edit'));
            blockEl.innerHTML = '<span>' + getFieldNameForSelect(block.field) + '</span>';

            var removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'template-block-remove';
            removeBtn.setAttribute('data-block-id', block.id);
            removeBtn.setAttribute('title', T('template_remove_block'));
            removeBtn.textContent = '×';
            blockEl.appendChild(removeBtn);
            blocks.appendChild(blockEl);
        });

        canvas.appendChild(rowEl);
    });
}

function openTemplateEditor(blockId) {
    var location = findBlockLocation(blockId);
    if (!location) return;
    var modal = document.getElementById('template-editor-modal');
    var titleEl = document.getElementById('template-editor-title');
    var fieldEl = document.getElementById('template-editor-field-label');
    var input = document.getElementById('template-editor-input');
    var saveBtn = document.getElementById('template-editor-save');
    var cancelBtn = document.getElementById('template-editor-cancel');
    if (!modal || !input || !saveBtn || !cancelBtn) return;

    fieldTemplateUiState.editingBlockId = blockId;
    if (titleEl) titleEl.textContent = T('template_edit_title');
    if (fieldEl) fieldEl.textContent = T('template_edit_field', { field: getFieldNameForSelect(location.block.field) });
    saveBtn.textContent = T('template_edit_save');
    cancelBtn.textContent = T('template_edit_cancel');
    input.value = String(location.block.template || '');

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(function () {
        if (typeof input.focus === 'function') input.focus();
    }, 0);
}

function closeTemplateEditor() {
    var modal = document.getElementById('template-editor-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    fieldTemplateUiState.editingBlockId = '';
}

function commitTemplateEditor() {
    var blockId = fieldTemplateUiState.editingBlockId;
    if (!blockId) return;
    var input = document.getElementById('template-editor-input');
    var location = findBlockLocation(blockId);
    if (!input || !location) return;
    var nextTemplate = String(input.value || '');
    location.block.template = nextTemplate || getDefaultTemplateForField(location.block.field);
    saveFieldTemplateLayout();
    renderFieldTemplateBuilder();
    closeTemplateEditor();
}

function ensureTouchGhost(text, x, y) {
    var ghost = document.createElement('div');
    ghost.className = 'template-touch-ghost';
    ghost.textContent = text;
    document.body.appendChild(ghost);
    updateTouchGhostPosition(ghost, x, y);
    return ghost;
}

function updateTouchGhostPosition(ghost, x, y) {
    if (!ghost) return;
    var ghostWidth = ghost.offsetWidth || 0;
    var ghostHeight = ghost.offsetHeight || 0;
    var left = Math.round(x - ghostWidth / 2);
    var top = Math.round(y - ghostHeight - 14);
    if (top < 6) top = 6;
    ghost.style.left = left + 'px';
    ghost.style.top = top + 'px';
}

function clearDesktopTemplateDragPreview() {
    var preview = fieldTemplateUiState.desktopDragPreview;
    if (preview && preview.parentNode) preview.parentNode.removeChild(preview);
    fieldTemplateUiState.desktopDragPreview = null;
}

function attachDesktopTemplateDragPreview(dataTransfer, text) {
    if (!dataTransfer) return;
    clearDesktopTemplateDragPreview();
    var preview = document.createElement('div');
    preview.className = 'desktop-drag-preview';
    preview.textContent = String(text || '');
    document.body.appendChild(preview);
    fieldTemplateUiState.desktopDragPreview = preview;
    var width = preview.offsetWidth || 0;
    var height = preview.offsetHeight || 0;
    dataTransfer.setDragImage(preview, Math.round(width / 2), height + 14);
}

function cleanupTouchTemplateDrag() {
    var drag = fieldTemplateUiState.touchDrag;
    clearDropIndicators();
    if (!drag) return;
    if (drag.pressTimer) {
        clearTimeout(drag.pressTimer);
        drag.pressTimer = null;
    }
    if (drag.ghost && drag.ghost.parentNode) drag.ghost.parentNode.removeChild(drag.ghost);
    fieldTemplateUiState.touchDrag = null;
}

function bindTemplateBuilderEvents() {
    var builder = document.getElementById('template-builder');
    if (!builder) return;
    if (builder.__mnTemplateBound) return;
    builder.__mnTemplateBound = true;

    var addRowBtn = document.getElementById('add-layout-row');
    if (addRowBtn) {
        addRowBtn.addEventListener('click', function () {
            fieldTemplateUiState.config.layout.rows.push({ id: createTemplateId('row'), blocks: [] });
            saveFieldTemplateLayout();
            renderFieldTemplateBuilder();
        });
    }

    var fieldLangSwitch = document.getElementById('field-lang-switch');
    if (fieldLangSwitch) {
        fieldLangSwitch.addEventListener('click', function (e) {
            var btn = e.target.closest('.field-lang-btn');
            if (!btn) return;
            var lang = btn.getAttribute('data-lang') || '';
            if (!lang) return;
            setFieldDisplayLang(lang);
            renderFieldTemplateBuilder();
        });
    }

    var cancelBtn = document.getElementById('template-editor-cancel');
    var saveBtn = document.getElementById('template-editor-save');
    var backdrop = document.getElementById('template-editor-backdrop');
    if (cancelBtn) cancelBtn.addEventListener('click', closeTemplateEditor);
    if (saveBtn) saveBtn.addEventListener('click', commitTemplateEditor);
    if (backdrop) backdrop.addEventListener('click', closeTemplateEditor);

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeTemplateEditor();
    });

    document.addEventListener('click', function (e) {
        var removeBtn = e.target.closest('.template-block-remove');
        if (removeBtn) {
            e.preventDefault();
            e.stopPropagation();
            var removeId = removeBtn.getAttribute('data-block-id') || '';
            if (!removeId) return;
            removeBlockById(removeId);
            saveFieldTemplateLayout();
            renderFieldTemplateBuilder();
            return;
        }

        var deleteRowBtn = e.target.closest('.btn-delete-row');
        if (deleteRowBtn) {
            var rowId = deleteRowBtn.getAttribute('data-row-id') || '';
            var rows = fieldTemplateUiState.config.layout.rows || [];
            if (rows.length <= 1) {
                rows[0].blocks = [];
            } else {
                fieldTemplateUiState.config.layout.rows = rows.filter(function (r) { return r.id !== rowId; });
            }
            ensureAtLeastOneTemplateRow();
            saveFieldTemplateLayout();
            renderFieldTemplateBuilder();
            return;
        }

        var block = e.target.closest('.template-layout-block');
        if (!block) return;
        if (fieldTemplateUiState.justDragged) return;
        var blockId = block.getAttribute('data-block-id') || '';
        if (blockId) openTemplateEditor(blockId);
    });

    document.addEventListener('dragstart', function (e) {
        var paletteItem = e.target.closest('.field-palette-item');
        if (paletteItem) {
            var field = paletteItem.getAttribute('data-field') || '';
            fieldTemplateUiState.dragPayload = { type: 'palette', field: field };
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', JSON.stringify(fieldTemplateUiState.dragPayload));
                attachDesktopTemplateDragPreview(e.dataTransfer, getFieldNameForSelect(field));
            }
            return;
        }
        var block = e.target.closest('.template-layout-block');
        if (block) {
            var blockId = block.getAttribute('data-block-id') || '';
            fieldTemplateUiState.dragPayload = { type: 'block', blockId: blockId };
            if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', JSON.stringify(fieldTemplateUiState.dragPayload));
                var location = findBlockLocation(blockId);
                var fieldName = location ? getFieldNameForSelect(location.block.field) : '';
                attachDesktopTemplateDragPreview(e.dataTransfer, fieldName);
            }
        }
    });

    document.addEventListener('dragover', function (e) {
        var rowBlocks = e.target.closest('.template-row-blocks');
        if (!rowBlocks) return;
        if (!fieldTemplateUiState.dragPayload) return;
        e.preventDefault();
        var rowId = rowBlocks.getAttribute('data-row-id') || '';
        if (!rowId) return;
        var ignoreBlockId = fieldTemplateUiState.dragPayload.type === 'block' ? fieldTemplateUiState.dragPayload.blockId : '';
        var index = calcDropIndex(rowBlocks, e.clientX, ignoreBlockId);
        renderDropIndicator(rowId, index, ignoreBlockId);
    });

    document.addEventListener('drop', function (e) {
        var rowBlocks = e.target.closest('.template-row-blocks');
        if (!rowBlocks) return;
        if (!fieldTemplateUiState.dragPayload) return;
        e.preventDefault();
        var rowId = rowBlocks.getAttribute('data-row-id') || '';
        if (!rowId) return;
        var ignoreBlockId = fieldTemplateUiState.dragPayload.type === 'block' ? fieldTemplateUiState.dragPayload.blockId : '';
        var index = calcDropIndex(rowBlocks, e.clientX, ignoreBlockId);
        applyDropPayload(fieldTemplateUiState.dragPayload, rowId, index);
        saveFieldTemplateLayout();
        renderFieldTemplateBuilder();
        clearDropIndicators();
    });

    document.addEventListener('dragend', function () {
        fieldTemplateUiState.dragPayload = null;
        clearDesktopTemplateDragPreview();
        clearDropIndicators();
        fieldTemplateUiState.justDragged = true;
        setTimeout(function () { fieldTemplateUiState.justDragged = false; }, 150);
    });

    document.addEventListener('touchstart', function (e) {
        var paletteItem = e.target.closest('.field-palette-item');
        var block = e.target.closest('.template-layout-block');
        if (!paletteItem && !block) return;
        if (e.target.closest('.template-block-remove')) return;
        if (!e.touches || e.touches.length !== 1) return;
        var touch = e.touches[0];
        var payload = null;
        if (paletteItem) {
            payload = {
                type: 'palette',
                field: paletteItem.getAttribute('data-field') || ''
            };
        } else {
            payload = {
                type: 'block',
                blockId: block.getAttribute('data-block-id') || ''
            };
        }
        fieldTemplateUiState.touchDrag = {
            payload: payload,
            startX: touch.clientX,
            startY: touch.clientY,
            armed: false,
            dragging: false,
            ghost: null,
            targetRowId: '',
            targetIndex: 0,
            pressTimer: null
        };
        fieldTemplateUiState.touchDrag.pressTimer = setTimeout(function () {
            if (!fieldTemplateUiState.touchDrag) return;
            fieldTemplateUiState.touchDrag.armed = true;
        }, 150);
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
        var drag = fieldTemplateUiState.touchDrag;
        if (!drag || !e.touches || e.touches.length !== 1) return;
        var touch = e.touches[0];
        var dx = touch.clientX - drag.startX;
        var dy = touch.clientY - drag.startY;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (!drag.armed) {
            if (distance > 8) {
                if (drag.pressTimer) {
                    clearTimeout(drag.pressTimer);
                    drag.pressTimer = null;
                }
                fieldTemplateUiState.touchDrag = null;
            }
            return;
        }
        e.preventDefault();
        if (!drag.dragging) {
            if (distance < 4) return;
            drag.dragging = true;
            if (drag.pressTimer) {
                clearTimeout(drag.pressTimer);
                drag.pressTimer = null;
            }
            var ghostText = drag.payload.type === 'palette'
                ? getFieldNameForSelect(drag.payload.field)
                : (function () {
                    var loc = findBlockLocation(drag.payload.blockId);
                    return loc ? getFieldNameForSelect(loc.block.field) : '';
                })();
            drag.ghost = ensureTouchGhost(ghostText, touch.clientX, touch.clientY);
        }
        if (drag.ghost) {
            updateTouchGhostPosition(drag.ghost, touch.clientX, touch.clientY);
        }
        var target = document.elementFromPoint(touch.clientX, touch.clientY);
        var rowBlocks = target ? target.closest('.template-row-blocks') : null;
        if (!rowBlocks) {
            drag.targetRowId = '';
            clearDropIndicators();
            return;
        }
        var rowId = rowBlocks.getAttribute('data-row-id') || '';
        if (!rowId) return;
        var ignoreBlockId = drag.payload.type === 'block' ? drag.payload.blockId : '';
        var index = calcDropIndex(rowBlocks, touch.clientX, ignoreBlockId);
        drag.targetRowId = rowId;
        drag.targetIndex = index;
        renderDropIndicator(rowId, index, ignoreBlockId);
    }, { passive: false });

    document.addEventListener('touchend', function () {
        var drag = fieldTemplateUiState.touchDrag;
        if (!drag) return;
        if (drag.pressTimer) {
            clearTimeout(drag.pressTimer);
            drag.pressTimer = null;
        }
        if (drag.dragging && drag.targetRowId) {
            applyDropPayload(drag.payload, drag.targetRowId, drag.targetIndex);
            saveFieldTemplateLayout();
            renderFieldTemplateBuilder();
            fieldTemplateUiState.justDragged = true;
            setTimeout(function () { fieldTemplateUiState.justDragged = false; }, 150);
        }
        cleanupTouchTemplateDrag();
    }, { passive: true });

    document.addEventListener('touchcancel', cleanupTouchTemplateDrag, { passive: true });
}

/**
 * Initialize field templates options
 */
function initFieldTemplates() {
    var hasBuilder = !!document.getElementById('template-builder');
    if (!hasBuilder) return;

    fieldTemplateUiState.fieldDisplayLang = getFieldDisplayLang();
    bindTemplateBuilderEvents();

    // Load saved templates from injected config
    loadFieldTemplates(window.__mnConfig && window.__mnConfig.fieldTemplates);

    // Listen for late config injection - preserve existing handler
    var existingOnMNConfig = window.onMNConfig;
    window.onMNConfig = function () {
        loadFieldTemplates(window.__mnConfig && window.__mnConfig.fieldTemplates);
        if (typeof existingOnMNConfig === 'function') {
            existingOnMNConfig();
        }
    };
}

// Initialize field templates after common.js loads
initFieldTemplates();
