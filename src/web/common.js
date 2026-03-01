const $ = i => document.getElementById(i);
const API = { L: 'http://localhost:23119/api/users', C: 'https://api.zotero.org/users' };

/**
 * Common configuration management
 */
function upd() {
    const isC = $('mode').value === 'C';
    $('key').style.display = isC ? 'block' : 'none';
    $('uid').style.display = isC ? 'block' : 'none';
    $('slug').style.display = isC ? 'block' : 'none';
    var togglePassword = document.querySelector('.toggle-password');
    if (togglePassword) togglePassword.style.display = isC ? 'block' : 'none';
    if (window.resetFilterOptions) window.resetFilterOptions();
    if (window.loadFilters) window.loadFilters();
}

/**
 * Initialize config panel logic
 */
(function initModeOptions() {
    var opts = document.querySelectorAll('.mode-option');
    var modeInput = $('mode');

    function setConfig(key, val) {
        var iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = 'mnzotero://setConfig?key=' + encodeURIComponent(key) + '&val=' + encodeURIComponent(val);
        document.body.appendChild(iframe);
        setTimeout(function () { try { iframe.remove(); } catch (e) { } }, 500);
    }

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

    // Listener for late injection
    window.onMNConfig = function () {
        loadConfig(window.__mnConfig);
    };

    // Save changes automatically via protocol
    ['uid', 'slug', 'key'].forEach(id => {
        var el = $(id);
        if (el) {
            el.addEventListener('input', function () {
                setConfig(id, this.value);

                // Visual feedback
                this.classList.remove('save-success');
                void this.offsetWidth; // Trigger reflow
                this.classList.add('save-success');

                if (window.resetFilterOptions) window.resetFilterOptions();
                if (window.loadFilters) window.loadFilters();
            });
        }
    });

    opts.forEach(function (el) {
        el.addEventListener('click', function () {
            var v = this.getAttribute('data-value');
            modeInput.value = v;
            setConfig('mode', v);
            opts.forEach(function (o) { o.classList.remove('active'); });
            this.classList.add('active');
            upd();
        });
    });
})();

/**
 * Initialize global view switcher navigation
 */
(function initViewSwitcher() {
    document.querySelectorAll('.view-option[data-view]').forEach(function (el) {
        el.addEventListener('click', function () {
            var view = this.getAttribute('data-view');
            if (view === 'library') {
                window.location.href = 'library.html';
            } else if (view === 'selected') {
                window.location.href = 'selection.html';
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
