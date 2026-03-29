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
    var modal = document.getElementById('mn-onboarding-modal');
    if (!modal) return;
    if (markSeen) markOnboardingSeen();
    modal.classList.remove('show');
    setTimeout(function () {
        if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
    }, 180);
}

function showOnboardingModal() {
    if (document.getElementById('mn-onboarding-modal')) return;

    var stepKeys = [
        'onboarding_step_1',
        'onboarding_step_2',
        'onboarding_step_3',
        'onboarding_step_4',
        'onboarding_step_5',
        'onboarding_step_6'
    ];
    var steps = stepKeys.map(function (key) {
        return T(key);
    });
    var wrapper = document.createElement('div');
    wrapper.id = 'mn-onboarding-modal';
    wrapper.className = 'mn-onboarding-modal';
    wrapper.innerHTML = ''
        + '<div class="mn-onboarding-overlay"></div>'
        + '<div class="mn-onboarding-card" role="dialog" aria-modal="true">'
        + '  <h3>' + T('onboarding_title') + '</h3>'
        + '  <p class="mn-onboarding-subtitle">' + T('onboarding_subtitle') + '</p>'
        + '  <div class="mn-onboarding-carousel">'
        + '    <div class="mn-onboarding-track" id="mn-onboarding-track"></div>'
        + '  </div>'
        + '  <div class="mn-onboarding-dots" id="mn-onboarding-dots"></div>'
        + '  <div class="mn-onboarding-actions">'
        + '    <button id="mn-onboarding-prev" class="mn-onboarding-btn secondary hidden">' + T('onboarding_prev') + '</button>'
        + '    <button id="mn-onboarding-next" class="mn-onboarding-btn primary">' + T('onboarding_next') + '</button>'
        + '    <button id="mn-onboarding-done" class="mn-onboarding-btn primary hidden">' + T('onboarding_done') + '</button>'
        + '  </div>'
        + '</div>';
    document.body.appendChild(wrapper);

    var track = document.getElementById('mn-onboarding-track');
    var dots = document.getElementById('mn-onboarding-dots');
    var prevBtn = document.getElementById('mn-onboarding-prev');
    var nextBtn = document.getElementById('mn-onboarding-next');
    var doneBtn = document.getElementById('mn-onboarding-done');
    var overlay = wrapper.querySelector('.mn-onboarding-overlay');
    if (!track || !dots || !prevBtn || !nextBtn || !doneBtn) return;

    steps.forEach(function (text, idx) {
        var slide = document.createElement('div');
        slide.className = 'mn-onboarding-slide';
        slide.innerHTML = '<p class="mn-onboarding-step">' + text + '</p>';
        track.appendChild(slide);

        var dot = document.createElement('span');
        dot.className = 'mn-onboarding-dot' + (idx === 0 ? ' active' : '');
        dots.appendChild(dot);
    });

    var current = 0;
    var startX = 0;
    var moving = false;

    function render() {
        track.style.transform = 'translateX(' + (-current * 100) + '%)';
        var dotEls = dots.querySelectorAll('.mn-onboarding-dot');
        dotEls.forEach(function (dot, idx) {
            if (idx === current) dot.classList.add('active');
            else dot.classList.remove('active');
        });

        if (current > 0) prevBtn.classList.remove('hidden');
        else prevBtn.classList.add('hidden');

        if (current >= steps.length - 1) {
            nextBtn.classList.add('hidden');
            doneBtn.classList.remove('hidden');
        } else {
            nextBtn.classList.remove('hidden');
            doneBtn.classList.add('hidden');
        }
    }

    prevBtn.addEventListener('click', function () {
        if (current <= 0) return;
        current -= 1;
        render();
    });

    nextBtn.addEventListener('click', function () {
        if (current >= steps.length - 1) return;
        current += 1;
        render();
    });

    doneBtn.addEventListener('click', function () {
        dismissOnboarding(true);
    });

    if (overlay) overlay.addEventListener('click', function () {
        dismissOnboarding(true);
    });

    track.addEventListener('touchstart', function (e) {
        if (!e.touches || e.touches.length !== 1) return;
        startX = e.touches[0].clientX;
        moving = true;
    }, { passive: true });

    track.addEventListener('touchend', function (e) {
        if (!moving || !e.changedTouches || e.changedTouches.length !== 1) return;
        moving = false;
        var endX = e.changedTouches[0].clientX;
        var delta = endX - startX;
        if (Math.abs(delta) < 24) return;
        if (delta < 0 && current < steps.length - 1) current += 1;
        if (delta > 0 && current > 0) current -= 1;
        render();
    }, { passive: true });

    render();
    setTimeout(function () {
        wrapper.classList.add('show');
    }, 0);
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
    showOnboardingModal();
}

window.openOnboardingFromSettings = openOnboardingFromSettings;

initOnboarding();
