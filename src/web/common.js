const $ = i => document.getElementById(i);
const API = { L: 'http://localhost:23119/api/users', C: 'https://api.zotero.org/users' };

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
    const isC = mode === 'C';
    var keyEl = $('key');
    var uidEl = $('uid');
    var slugEl = $('slug');
    if (keyEl) keyEl.style.display = isC ? 'block' : 'none';
    if (uidEl) uidEl.style.display = isC ? 'block' : 'none';
    if (slugEl) slugEl.style.display = isC ? 'block' : 'none';
    var togglePassword = document.querySelector('.toggle-password');
    if (togglePassword) togglePassword.style.display = isC ? 'block' : 'none';
    var apiModeNotice = $('api-mode-notice');
    if (apiModeNotice) apiModeNotice.style.display = isC ? 'none' : 'block';
    if (window.resetFilterOptions) window.resetFilterOptions();
    if (window.loadFilters) window.loadFilters();
}

/**
 * Initialize config panel logic
 */
(function initModeOptions() {
    var opts = document.querySelectorAll('.mode-option');
    var modeInput = $('mode');

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

    // Save changes automatically via protocol
    ['uid', 'slug', 'key'].forEach(id => {
        var el = $(id);
        if (el) {
            var handleConfigEdit = function () {
                setConfigValue(id, this.value);

                // Visual feedback
                this.classList.remove('save-success');
                void this.offsetWidth; // Trigger reflow
                this.classList.add('save-success');

                if (window.resetFilterOptions) window.resetFilterOptions();
                if (window.loadFilters) window.loadFilters();
            };
            el.addEventListener('input', handleConfigEdit);
            el.addEventListener('change', handleConfigEdit);
        }
    });

    if (modeInput) {
        opts.forEach(function (el) {
            el.addEventListener('click', function () {
                var v = this.getAttribute('data-value');
                modeInput.value = v;
                setConfigValue('mode', v);
                opts.forEach(function (o) { o.classList.remove('active'); });
                this.classList.add('active');
                upd();
            });
        });
    }
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
            } else if (view === 'selected') {
                window.location.href = 'selection.html';
            } else if (view === 'settings') {
                window.location.href = 'settings.html';
            }
        });
    });
})();

// Helper fetch for local mode
function localFetch(url, options) {
    return new Promise(function (resolve, reject) {
        var id = 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        window.__mnFetchCb = window.__mnFetchCb || {};
        window.__mnFetchCb[id] = function (err, data) {
            try { delete window.__mnFetchCb[id]; } catch (e) { }
            if (err) reject(new Error(err));
            else resolve({
                ok: data && data.ok,
                status: data && data.status,
                json: function () { return Promise.resolve(data && data.body != null ? data.body : {}); }
            });
        };
        window.__mnFetchPending = JSON.stringify({ id: id, url: url, options: options || {} });
        var iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = 'mnzotero://fetch';
        document.body.appendChild(iframe);
        setTimeout(function () { try { iframe.remove(); } catch (e) { } }, 500);
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

function getDefaultFieldTemplateConfig() {
    return {
        fixed: Object.assign({}, FIELD_TEMPLATE_DEFAULTS),
        custom: []
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

    var normalized = {
        fixed: Object.assign({}, defaults.fixed),
        custom: []
    };

    var fixedRaw = parsed.fixed;
    if (fixedRaw && typeof fixedRaw === 'object') {
        Object.keys(defaults.fixed).forEach(function(field) {
            var value = fixedRaw[field];
            if (value !== undefined && value !== null && String(value).trim()) {
                normalized.fixed[field] = String(value);
            }
        });
    }

    var customRaw = Array.isArray(parsed.custom) ? parsed.custom : [];
    customRaw.forEach(function(item) {
        if (!item || typeof item !== 'object') return;
        var field = item.field !== undefined && item.field !== null ? String(item.field).trim() : '';
        if (!field) return;
        var template = item.template !== undefined && item.template !== null ? String(item.template) : '';
        normalized.custom.push({
            field: field,
            template: template || '{{value}}'
        });
    });

    return normalized;
}

function setFieldTemplates(templates) {
    var iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'mnzotero://setConfig?key=fieldTemplates&val=' + encodeURIComponent(JSON.stringify(templates || {}));
    document.body.appendChild(iframe);
    setTimeout(function () { try { iframe.remove(); } catch (e) { } }, 500);
}

function getFieldTemplates() {
    var hasSettingsTemplateDom = !!document.querySelector('.field-template-input') || !!document.querySelector('.custom-field-list');
    if (!hasSettingsTemplateDom) {
        var config = window.__mnConfig || {};
        return normalizeFieldTemplatesConfig(config.fieldTemplates);
    }

    var templates = getDefaultFieldTemplateConfig();

    // Read fixed templates from settings DOM if available.
    Object.keys(FIELD_TEMPLATE_DEFAULTS).forEach(function(field) {
        var input = document.querySelector('.field-template-input[data-field="' + field + '"]');
        if (input) {
            templates.fixed[field] = input.value || FIELD_TEMPLATE_DEFAULTS[field];
        }
    });

    // Read custom templates from settings DOM if available.
    var customList = document.querySelector('.custom-field-list');
    if (customList) {
        var items = customList.querySelectorAll('.custom-field-item');
        items.forEach(function(item) {
            var fieldSelect = item.querySelector('.custom-field-select');
            var templateInput = item.querySelector('.custom-field-template');
            var fieldValue = fieldSelect && fieldSelect.value ? String(fieldSelect.value).trim() : '';
            if (fieldValue) {
                templates.custom.push({
                    field: fieldValue,
                    template: templateInput && templateInput.value ? templateInput.value : '{{value}}'
                });
            }
        });
    }

    return templates;
}

function loadFieldTemplates(templates) {
    var normalized = normalizeFieldTemplatesConfig(templates);

    // Load fixed field templates
    if (normalized.fixed) {
        for (var field in normalized.fixed) {
            var input = document.querySelector('.field-template-input[data-field="' + field + '"]');
            if (input && normalized.fixed[field] !== undefined) {
                input.value = normalized.fixed[field];
            }
        }
    }

    // Load custom field templates
    var customList = document.querySelector('.custom-field-list');
    if (customList) {
        customList.innerHTML = '';
    }
    if (customList && normalized.custom && normalized.custom.length > 0) {
        normalized.custom.forEach(function(cf) {
            addCustomFieldItem(cf.field, cf.template);
        });
    }
}

function addCustomFieldItem(field, template) {
    var customList = document.querySelector('.custom-field-list');
    if (!customList) return;
    
    var item = document.createElement('div');
    item.className = 'custom-field-item';
    
    // Get available fields
    var availableFields = ['tags', 'abstractNote', 'DOI', 'ISBN', 'ISSN', 'url', 'language', 'publicationTitle', 'volume', 'issue', 'pages', 'thesisType', 'university', 'extra', 'creators'];
    var fieldSelect = document.createElement('select');
    fieldSelect.className = 'custom-field-select';
    fieldSelect.innerHTML = '<option value="">Select field...</option>';
    availableFields.forEach(function(f) {
        var opt = document.createElement('option');
        opt.value = f;
        opt.textContent = getFieldNameForSelect(f);
        fieldSelect.appendChild(opt);
    });
    
    if (field) {
        fieldSelect.value = field;
    }
    
    var templateInput = document.createElement('input');
    templateInput.type = 'text';
    templateInput.className = 'custom-field-template';
    templateInput.value = template || '{{value}}';
    templateInput.placeholder = 'Template (use {{value}})';
    
    var btnContainer = document.createElement('div');
    btnContainer.className = 'custom-field-buttons';
    
    var moveUpBtn = document.createElement('button');
    moveUpBtn.textContent = '↑';
    moveUpBtn.className = 'btn-move-up';
    moveUpBtn.onclick = function() {
        var current = item;
        var prev = current.previousElementSibling;
        if (prev) {
            current.parentNode.insertBefore(current, prev);
            setFieldTemplates(getFieldTemplates());
        }
    };
    
    var moveDownBtn = document.createElement('button');
    moveDownBtn.textContent = '↓';
    moveDownBtn.className = 'btn-move-down';
    moveDownBtn.onclick = function() {
        var current = item;
        var next = current.nextElementSibling;
        if (next) {
            current.parentNode.insertBefore(next, current);
            setFieldTemplates(getFieldTemplates());
        }
    };
    
    var removeBtn = document.createElement('button');
    removeBtn.textContent = '×';
    removeBtn.className = 'btn-remove';
    removeBtn.onclick = function() {
        item.remove();
        setFieldTemplates(getFieldTemplates());
    };
    
    btnContainer.appendChild(moveUpBtn);
    btnContainer.appendChild(moveDownBtn);
    btnContainer.appendChild(removeBtn);
    
    item.appendChild(fieldSelect);
    item.appendChild(templateInput);
    item.appendChild(btnContainer);
    customList.appendChild(item);
}

function getFieldNameForSelect(field) {
    var fieldNames = {
        'tags': T('field_tags'),
        'abstractNote': T('field_abstract'),
        'DOI': 'DOI',
        'ISBN': 'ISBN',
        'ISSN': 'ISSN',
        'url': T('field_url'),
        'language': T('field_language'),
        'publicationTitle': T('field_publication_title'),
        'volume': T('field_volume'),
        'issue': T('field_issue'),
        'pages': T('field_pages'),
        'thesisType': T('field_thesis_type'),
        'university': T('field_university'),
        'extra': T('field_extra'),
        'creators': T('field_creators')
    };
    return fieldNames[field] || field;
}

/**
 * Initialize field templates options
 */
function initFieldTemplates() {
    // Load saved templates from injected config
    if (window.__mnConfig && window.__mnConfig.fieldTemplates) {
        loadFieldTemplates(window.__mnConfig.fieldTemplates);
    }
    
    // Listen for late config injection - preserve existing handler
    var existingOnMNConfig = window.onMNConfig;
    window.onMNConfig = function() {
        if (window.__mnConfig && window.__mnConfig.fieldTemplates) {
            loadFieldTemplates(window.__mnConfig.fieldTemplates);
        }
        if (typeof existingOnMNConfig === 'function') {
            existingOnMNConfig();
        }
    };
    
    // Save on input change
    function saveTemplateChange(e) {
        if (e.target.classList.contains('field-template-input') || 
            e.target.classList.contains('custom-field-select') || 
            e.target.classList.contains('custom-field-template')) {
            setFieldTemplates(getFieldTemplates());
            if (e.target.classList.contains('custom-field-select') && typeof e.target.blur === 'function') {
                // Avoid keeping focus on select in WebView, which can block reopening the picker.
                e.target.blur();
            }
            
            // Visual feedback
            e.target.classList.remove('save-success');
            void e.target.offsetWidth;
            e.target.classList.add('save-success');
        }
    }
    document.addEventListener('input', saveTemplateChange);
    document.addEventListener('change', saveTemplateChange);
    
    // Add custom field button
    var addBtn = document.getElementById('add-custom-field');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            addCustomFieldItem();
            setFieldTemplates(getFieldTemplates());
        });
    }
}

// Initialize field templates after common.js loads
initFieldTemplates();

function shouldShowOnboarding(config) {
    var cfg = config || {};
    var forceShow = String(cfg.onboarding_force_show_once || '') === '1';
    if (forceShow) return true;
    var seen = String(cfg.onboarding_seen_v1 || '') === '1';
    return !seen;
}

function markOnboardingSeen() {
    setConfigValue('onboarding_seen_v1', '1');
    window.__mnConfig = window.__mnConfig || {};
    window.__mnConfig.onboarding_seen_v1 = '1';
}

function dismissOnboarding(markSeen) {
    var modal = $('mn-onboarding-modal');
    if (!modal) return;
    if (markSeen) markOnboardingSeen();
    modal.classList.remove('show');
    setTimeout(function () {
        if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    }, 180);
}

function showOnboardingModal() {
    if ($('mn-onboarding-modal')) return;
    var wrapper = document.createElement('div');
    wrapper.id = 'mn-onboarding-modal';
    wrapper.className = 'mn-onboarding-modal';
    wrapper.innerHTML = ''
        + '<div class="mn-onboarding-overlay"></div>'
        + '<div class="mn-onboarding-card" role="dialog" aria-modal="true">'
        + '  <h3>' + T('onboarding_title') + '</h3>'
        + '  <p class="mn-onboarding-subtitle">' + T('onboarding_subtitle') + '</p>'
        + '  <ol class="mn-onboarding-steps">'
        + '    <li>' + T('onboarding_step_1') + '</li>'
        + '    <li>' + T('onboarding_step_2') + '</li>'
        + '    <li>' + T('onboarding_step_3') + '</li>'
        + '  </ol>'
        + '  <div class="mn-onboarding-actions">'
        + '    <button id="mn-onboarding-later" class="mn-onboarding-btn secondary">' + T('onboarding_later') + '</button>'
        + '    <button id="mn-onboarding-settings" class="mn-onboarding-btn primary">' + T('onboarding_go_settings') + '</button>'
        + '  </div>'
        + '</div>';
    document.body.appendChild(wrapper);

    var laterBtn = $('mn-onboarding-later');
    var settingsBtn = $('mn-onboarding-settings');
    var overlay = wrapper.querySelector('.mn-onboarding-overlay');
    if (laterBtn) laterBtn.addEventListener('click', function () { dismissOnboarding(true); });
    if (overlay) overlay.addEventListener('click', function () { dismissOnboarding(true); });
    if (settingsBtn) settingsBtn.addEventListener('click', function () {
        markOnboardingSeen();
        window.location.href = 'settings.html';
    });
    setTimeout(function () { wrapper.classList.add('show'); }, 0);
}

function initOnboarding() {
    if (typeof window.location === 'undefined' || window.location.pathname.indexOf('library.html') === -1) return;
    var hasChecked = false;

    function maybeShowOnboarding() {
        if (hasChecked) return;
        if (!window.__mnConfig) return;
        hasChecked = true;

        var cfg = window.__mnConfig || {};
        if (!shouldShowOnboarding(cfg)) return;

        // Mark as seen immediately once it is shown, so it is only主动弹出 once.
        markOnboardingSeen();

        if (String(cfg.onboarding_force_show_once || '') === '1') {
            setConfigValue('onboarding_force_show_once', '0');
            window.__mnConfig.onboarding_force_show_once = '0';
        }
        showOnboardingModal();
    }

    if (window.__mnConfig) {
        maybeShowOnboarding();
        return;
    }

    var existingOnMNConfig = window.onMNConfig;
    window.onMNConfig = function () {
        if (typeof existingOnMNConfig === 'function') existingOnMNConfig();
        maybeShowOnboarding();
    };
}

function openOnboardingFromSettings() {
    setConfigValue('onboarding_force_show_once', '1');
    window.__mnConfig = window.__mnConfig || {};
    window.__mnConfig.onboarding_force_show_once = '1';
    window.location.href = 'library.html';
}

window.openOnboardingFromSettings = openOnboardingFromSettings;

initOnboarding();
