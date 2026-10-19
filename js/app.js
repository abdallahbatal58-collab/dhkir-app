/* ═════════════════════════════════════════════
   ذِكْر | Main Application v2.0.0
   ═════════════════════════════════════════════ */

'use strict';

const pageMap = ['home','morning','evening','sleep','wake','duas','tasbih','quran','qibla','settings'];

const state = {
    currentPage: 'home',
    tasbihCount: 0,
    tasbihTarget: 33,
    tasbihIndex: 0,
    qiblaBearing: 0,
    orientationListener: null,
    installPrompt: null
};

const settings = {
    darkMode: localStorage.getItem('dhikr_dark') === 'true',
    fontScale: parseInt(localStorage.getItem('dhikr_font') || '24', 10),
    resetCounter: localStorage.getItem('dhikr_reset') !== 'false'
};

let swiper = null;

/* ---- Bootstrap ---- */
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) splash.classList.add('hide');
        initApp();
    }, 1400);
});

function initApp() {
    applyTheme();
    applyFontScale();
    setupSwiper();
    setupNavigation();
    setupSearch();
    setupSettingsUI();
    setupTasbih();
    setupQibla();
    setupScrollTop();
    setupPWA();
    renderAllAdhkar();
    updateHijriDate();
    loadQuranSurahs();
    handleUrlParams();
}

/* ---- Theme ---- */
function applyTheme() {
    document.documentElement.dataset.theme = settings.darkMode ? 'dark' : 'light';
    const btn = document.getElementById('theme-btn');
    if (btn) btn.querySelector('use').setAttribute('href', settings.darkMode ? '#i-sunrise' : '#i-moon');
    const setDark = document.getElementById('set-dark');
    if (setDark) setDark.checked = settings.darkMode;
    const meta = document.querySelector('meta[name="theme-color"]:not([media])')
        || document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', settings.darkMode ? '#07120e' : '#0a3d2a');
}

function applyFontScale() {
    document.documentElement.style.setProperty('--quran-size', settings.fontScale + 'px');
    const setFont = document.getElementById('set-font');
    if (setFont) setFont.value = settings.fontScale;
}

/* ---- Swiper ---- */
function setupSwiper() {
    swiper = new Swiper('#main-content', {
        direction: 'horizontal',
        loop: false,
        speed: 320,
        resistanceRatio: 0.85,
        touchReleaseOnEdges: true,
        followFinger: true,
        on: {
            slideChange: function () {
                const newPage = pageMap[this.activeIndex];
                const oldPage = state.currentPage;
                if (settings.resetCounter && oldPage !== newPage) {
                    resetAdhkarCounters(oldPage);
                }
                state.currentPage = newPage;
                updateNavState(newPage);
                updateUrlParam(newPage);
            }
        }
    });
}

function updateNavState(pageId) {
    document.querySelectorAll('#bottom-nav button').forEach(btn => {
        const active = btn.dataset.target === pageId;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-current', active ? 'page' : 'false');
    });
    const active = document.querySelector('#bottom-nav button.active');
    if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

    document.querySelectorAll('.nav-group a').forEach(a => {
        a.classList.toggle('active', a.dataset.target === pageId);
    });
    closeSidebar();
    setActivePage(pageId);
}

function setActivePage(pageId) {
    state.currentPage = pageId;
}

function navigateTo(pageId) {
    const idx = pageMap.indexOf(pageId);
    if (idx !== -1 && swiper) swiper.slideTo(idx);
}

/* ---- Navigation ---- */
function setupNavigation() {
    document.querySelectorAll('.nav-group a').forEach(a => {
        a.addEventListener('click', e => { e.preventDefault(); navigateTo(a.dataset.target); });
    });
    document.querySelectorAll('.card[data-target]').forEach(c => {
        c.addEventListener('click', () => navigateTo(c.dataset.target));
    });
    document.querySelectorAll('#bottom-nav button').forEach(b => {
        b.addEventListener('click', () => navigateTo(b.dataset.target));
    });

    document.getElementById('menu-btn').onclick = openSidebar;
    document.getElementById('sidebar-overlay').onclick = closeSidebar;
    document.getElementById('close-reader').onclick = closeReader;
    document.getElementById('close-search').onclick = closeSearch;
    document.getElementById('theme-btn').onclick = toggleTheme;
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeSidebar(); closeReader(); closeSearch(); }
    });
}

function openSidebar() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('show');
    document.getElementById('sidebar').setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
    document.getElementById('sidebar').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}
function closeReader() { document.getElementById('overlay-quran-reader').classList.remove('active'); }
function closeSearch() { document.getElementById('overlay-search').classList.remove('active'); }
function toggleTheme() {
    settings.darkMode = !settings.darkMode;
    localStorage.setItem('dhikr_dark', settings.darkMode);
    applyTheme();
}

/* ---- URL Params (Shortcuts + Share) ---- */
function handleUrlParams() {
    const params = new URLSearchParams(location.search);
    const page = params.get('page') || location.hash.replace('#','');
    if (page && pageMap.includes(page) && page !== 'home') {
        setTimeout(() => navigateTo(page), 400);
    }
}
function updateUrlParam(page) {
    const url = new URL(location.href);
    if (page === 'home') url.searchParams.delete('page');
    else url.searchParams.set('page', page);
    history.replaceState(null, '', url.pathname + url.search);
}

/* ---- Adhkar ---- */
function renderAllAdhkar() {
    ['morning','evening','sleep','wake','duas'].forEach(cat => {
        const el = document.getElementById(`list-${cat}`);
        if (el) el.innerHTML = ADHKAR_DATA.filter(d => d.category === cat).map(generateCardHTML).join('');
    });
}

function generateCardHTML(item) {
    const header = item.type === 'surah'
        ? `<p class="basmala">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>`
        : (item.type === 'ayah' ? `<p class="istiadha">أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ</p>` : '');
    const btn = item.category !== 'duas'
        ? `<button class="btn-dhikr" onclick="incrementDhikr(this,'${item.id}',${item.count})">التكرار (0/${item.count})</button>`
        : '';
    return `
        <article class="adhkar-card" id="card-${item.id}">
            ${header ? `<div class="card-header">${header}</div>` : ''}
            <div class="adhkar-text">${item.text}</div>
            <div class="dua-ref">${item.source || ''}</div>
            <div class="adhkar-actions">
                ${btn}
                <button class="btn-util" onclick="copyDhikr('${item.id}')" aria-label="نسخ">
                    <svg class="icon"><use href="#i-copy"/></svg>
                </button>
                <button class="btn-util" onclick="shareDhikr('${item.id}')" aria-label="مشاركة">
                    <svg class="icon"><use href="#i-share"/></svg>
                </button>
            </div>
        </article>`;
}

window.incrementDhikr = (btn, id, max) => {
    let cur = parseInt(localStorage.getItem(`count_${id}`) || 0, 10);
    if (cur >= max) return;
    cur++;
    localStorage.setItem(`count_${id}`, cur);
    if (typeof navigator.vibrate === 'function') navigator.vibrate(12);
    btn.textContent = `التكرار (${cur}/${max})`;
    if (cur === max) {
        btn.classList.add('done');
        btn.innerHTML = `<svg class="icon" style="display:inline-block;vertical-align:middle"><use href="#i-check"/></svg> تم`;
        if (typeof navigator.vibrate === 'function') navigator.vibrate([80,40,80]);
    }
};

function resetAdhkarCounters(category) {
    if (!category) return;
    ADHKAR_DATA.filter(i => i.category === category).forEach(i => {
        localStorage.removeItem(`count_${i.id}`);
        const b = document.querySelector(`#card-${i.id} .btn-dhikr`);
        if (b) {
            b.classList.remove('done');
            b.textContent = `التكرار (0/${i.count})`;
        }
    });
}

window.copyDhikr = async (id) => {
    const item = ADHKAR_DATA.find(x => x.id === id);
    if (!item) return;
    try {
        await navigator.clipboard.writeText(`${item.text}\n\n${item.source || ''}`);
        showToast('تم النسخ ✓');
    } catch { showToast('تعذر النسخ'); }
};

window.shareDhikr = async (id) => {
    const item = ADHKAR_DATA.find(x => x.id === id);
    if (!item) return;
    const text = `${item.text}\n\n${item.source || ''}\n\n— من تطبيق ذِكْر`;
    if (navigator.share) {
        try { await navigator.share({ title: 'ذِكْر', text }); } catch {}
    } else {
        try { await navigator.clipboard.writeText(text); showToast('تم النسخ للمشاركة'); } catch {}
    }
};

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---- Search ---- */
function setupSearch() {
    const form = document.getElementById('search-form');
    if (!form) return;
    form.addEventListener('submit', e => { e.preventDefault(); executeSearch(); });
}

function normalize(text) {
    return (text || '')
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .trim()
        .toLowerCase();
}

function executeSearch() {
    const input = document.getElementById('search-input');
    const q = input.value.trim();
    if (!q) return;
    const nq = normalize(q);
    const results = ADHKAR_DATA.filter(i =>
        normalize(i.text).includes(nq) || normalize(i.source || '').includes(nq)
    );
    const container = document.getElementById('list-search');
    container.innerHTML = results.length
        ? results.map(generateCardHTML).join('')
        : '<p class="loading-text">لا توجد نتائج مطابقة</p>';
    document.getElementById('overlay-search').classList.add('active');
    document.getElementById('overlay-search').scrollTop = 0;
}

/* ---- Quran ---- */
async function loadQuranSurahs() {
    const container = document.getElementById('list-quran');
    if (!container) return;
    const cached = localStorage.getItem('dhikr_surahs_cache');
    if (cached) {
        try { renderSurahList(JSON.parse(cached)); } catch {}
    }
    try {
        const res = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await res.json();
        if (data.code === 200) {
            localStorage.setItem('dhikr_surahs_cache', JSON.stringify(data.data));
            renderSurahList(data.data);
        }
    } catch {
        if (!cached) container.innerHTML = '<p class="loading-text">تأكد من اتصالك بالإنترنت لتحميل الفهرس.</p>';
    }
}

function renderSurahList(surahs) {
    const container = document.getElementById('list-quran');
    container.innerHTML = surahs.map(s => `
        <button class="adhkar-card" style="cursor:pointer;text-align:right;width:100%" onclick="openSurah(${s.number},'${s.name}')">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                    <h3 style="color:var(--accent);font-family:'Amiri Quran';font-size:1.5rem;margin-bottom:4px">${s.name}</h3>
                    <p style="color:var(--text-muted);font-size:0.85rem">${s.numberOfAyahs} آية · ${s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}</p>
                </div>
                <div class="surah-number-circle">${s.number}</div>
            </div>
        </button>
    `).join('');
}

function formatTajweed(text) {
    return (text || '')
        .replace(/<tajweed class=([a-z_]+)>/g, '<span class="$1">')
        .replace(/<\/tajweed>/g, '</span>');
}

async function openSurah(number, name) {
    document.getElementById('reader-title').textContent = name;
    const container = document.getElementById('list-quran-verses');
    container.innerHTML = '<p class="loading-text"><span class="spinner-sm"></span> جاري تحميل الآيات...</p>';
    document.getElementById('overlay-quran-reader').classList.add('active');
    document.getElementById('overlay-quran-reader').scrollTop = 0;

    let ok = false;
    // Attempt 1: Quran.com
    try {
        const res = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${number}?fields=text_uthmani_tajweed&per_page=300`);
        const data = await res.json();
        if (data.verses && data.verses.length) {
            let html = '';
            if (number !== 1 && number !== 9) {
                html += `<div style="text-align:center;margin-bottom:24px"><span style="font-family:'Amiri Quran',serif;font-size:calc(var(--quran-size) + 4px);color:var(--accent)">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</span></div>`;
            }
            html += data.verses.map(v => {
                const t = formatTajweed(v.text_uthmani_tajweed || '');
                const n = v.verse_key.split(':')[1];
                return `<span>${t}</span> <span class="verse-number">${n}</span> `;
            }).join('');
            container.innerHTML = html;
            ok = true;
        }
    } catch (e) { /* fallback */ }

    // Attempt 2: AlQuran Cloud
    if (!ok) {
        try {
            const res = await fetch(`https://api.alquran.cloud/v1/surah/${number}/quran-tajweed`);
            const data = await res.json();
            if (data.code === 200) {
                let html = '';
                if (number !== 1 && number !== 9) {
                    html += `<div style="text-align:center;margin-bottom:24px"><span style="font-family:'Amiri Quran',serif;font-size:calc(var(--quran-size) + 4px);color:var(--accent)">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</span></div>`;
                }
                html += data.data.ayahs.map(a => {
                    const t = formatTajweed(a.text);
                    return `<span>${t}</span> <span class="verse-number">${a.numberInSurah}</span> `;
                }).join('');
                container.innerHTML = html;
                ok = true;
            }
        } catch (e) { /* nothing */ }
    }

    if (!ok) container.innerHTML = '<p class="loading-text">تعذر تحميل الآيات. تأكد من اتصالك بالإنترنت.</p>';
}

/* ---- Tasbih ---- */
function setupTasbih() {
    const select = document.getElementById('tasbih-select');
    const target = document.getElementById('tasbih-target');
    const circle = document.getElementById('tasbih-btn');
    if (!select) return;

    select.innerHTML = TASBIH_ITEMS.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');

    // Load saved state
    try {
        const saved = JSON.parse(localStorage.getItem('dhikr_tasbih') || '{}');
        if (saved.index != null) { state.tasbihIndex = saved.index; select.value = saved.index; }
        if (saved.count != null) state.tasbihCount = saved.count;
        if (saved.target != null) { state.tasbihTarget = saved.target; target.value = saved.target > 100 ? (saved.target === 500 || saved.target === 1000 ? String(saved.target) : 'custom') : String(saved.target); }
    } catch {}

    updateTasbihUI();

    select.onchange = () => {
        state.tasbihIndex = parseInt(select.value, 10);
        document.getElementById('tasbih-text').textContent = TASBIH_ITEMS[state.tasbihIndex].name;
        state.tasbihCount = 0;
        updateTasbihUI();
        saveTasbih();
    };

    target.onchange = () => {
        if (target.value === 'custom') {
            const v = parseInt(prompt('أدخل العدد:', '50') || '33', 10);
            state.tasbihTarget = v > 0 ? v : 33;
        } else {
            state.tasbihTarget = parseInt(target.value, 10);
        }
        state.tasbihCount = 0;
        updateTasbihUI();
        saveTasbih();
    };

    circle.onclick = () => {
        if (state.tasbihCount >= state.tasbihTarget) return;
        state.tasbihCount++;
        if (typeof navigator.vibrate === 'function') navigator.vibrate(12);
        updateTasbihUI();
        saveTasbih();
        if (state.tasbihCount === state.tasbihTarget) {
            if (typeof navigator.vibrate === 'function') navigator.vibrate([100,50,100,50,200]);
            showToast(`أكملت ${state.tasbihTarget} ✓`);
        }
    };

    document.getElementById('reset-tasbih').onclick = () => {
        state.tasbihCount = 0;
        updateTasbihUI();
        saveTasbih();
    };
}

function updateTasbihUI() {
    document.getElementById('tasbih-count').textContent = state.tasbihCount.toLocaleString('ar-EG');
    document.getElementById('tasbih-max').textContent = '/ ' + state.tasbihTarget.toLocaleString('ar-EG');
    const item = TASBIH_ITEMS[state.tasbihIndex] || TASBIH_ITEMS[0];
    document.getElementById('tasbih-text').textContent = item.name;
}

function saveTasbih() {
    localStorage.setItem('dhikr_tasbih', JSON.stringify({
        count: state.tasbihCount,
        target: state.tasbihTarget,
        index: state.tasbihIndex
    }));
}

/* ---- Qibla ---- */
function setupQibla() {
    const btn = document.getElementById('btn-qibla');
    if (!btn) return;
    btn.onclick = () => {
        btn.innerHTML = '<svg class="icon"><use href="#i-compass"/></svg><span>جاري التحديد...</span>';
        if (!navigator.geolocation) {
            showToast('جهازك لا يدعم تحديد الموقع');
            btn.innerHTML = '<svg class="icon"><use href="#i-location"/></svg><span>غير مدعوم</span>';
            return;
        }
        navigator.geolocation.getCurrentPosition(
            pos => onPosition(pos, btn),
            () => {
                showToast('الرجاء السماح بالوصول للموقع');
                btn.innerHTML = '<svg class="icon"><use href="#i-location"/></svg><span>إعادة المحاولة</span>';
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };
}

function onPosition(pos, btn) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const kLat = 21.4225, kLng = 39.8262;
    const dLon = (kLng - lng) * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(kLat * Math.PI / 180);
    const x = Math.cos(lat * Math.PI / 180) * Math.sin(kLat * Math.PI / 180)
            - Math.sin(lat * Math.PI / 180) * Math.cos(kLat * Math.PI / 180) * Math.cos(dLon);
    state.qiblaBearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

    document.getElementById('qibla-angle-text').textContent = `القبلة: ${Math.round(state.qiblaBearing)}° من الشمال`;
    btn.innerHTML = '<svg class="icon"><use href="#i-check"/></svg><span>البوصلة تعمل</span>';

    if (state.orientationListener) {
        window.removeEventListener('deviceorientationabsolute', state.orientationListener);
        window.removeEventListener('deviceorientation', state.orientationListener);
    }
    state.orientationListener = (e) => {
        let heading = null;
        if (e.webkitCompassHeading != null) heading = e.webkitCompassHeading;
        else if (e.alpha != null) heading = 360 - e.alpha;
        if (heading != null) {
            const rot = state.qiblaBearing - heading;
            document.getElementById('qibla-arrow').style.transform = `rotate(${rot}deg)`;
        }
    };
    window.addEventListener('deviceorientationabsolute', state.orientationListener);
    window.addEventListener('deviceorientation', state.orientationListener);
}

/* ---- Settings ---- */
function setupSettingsUI() {
    const setDark = document.getElementById('set-dark');
    const setFont = document.getElementById('set-font');
    const setReset = document.getElementById('set-reset-counter');
    const resetAll = document.getElementById('reset-all-btn');

    if (setDark) setDark.onchange = e => {
        settings.darkMode = e.target.checked;
        localStorage.setItem('dhikr_dark', settings.darkMode);
        applyTheme();
    };
    if (setFont) setFont.oninput = e => {
        settings.fontScale = parseInt(e.target.value, 10);
        localStorage.setItem('dhikr_font', settings.fontScale);
        applyFontScale();
    };
    if (setReset) {
        setReset.checked = settings.resetCounter;
        setReset.onchange = e => {
            settings.resetCounter = e.target.checked;
            localStorage.setItem('dhikr_reset', settings.resetCounter);
        };
    }
    if (resetAll) resetAll.onclick = () => {
        if (!confirm('سيتم مسح كل العدادات وحالة السبحة. متابعة؟')) return;
        Object.keys(localStorage).filter(k => k.startsWith('count_') || k === 'dhikr_tasbih')
            .forEach(k => localStorage.removeItem(k));
        state.tasbihCount = 0;
        updateTasbihUI();
        renderAllAdhkar();
        showToast('تم تصفير كل شيء ✓');
    };
}

/* ---- PWA Install ---- */
function setupPWA() {
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        state.installPrompt = e;
        const btn = document.getElementById('install-btn');
        if (btn) btn.hidden = false;
    });
    const btn = document.getElementById('install-btn');
    if (btn) btn.onclick = async () => {
        if (!state.installPrompt) return;
        state.installPrompt.prompt();
        const { outcome } = await state.installPrompt.userChoice;
        if (outcome === 'accepted') showToast('شكراً لتثبيت التطبيق');
        state.installPrompt = null;
        btn.hidden = true;
    };
}

/* ---- Utilities ---- */
function updateHijriDate() {
    const el = document.getElementById('hijri-date');
    if (!el) return;
    try {
        const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
            day: 'numeric', month: 'long', year: 'numeric'
        }).format(new Date());
        el.textContent = hijri + ' هـ';
    } catch {
        el.textContent = new Date().toLocaleDateString('ar-EG');
    }
}

function setupScrollTop() {
    const btn = document.getElementById('scroll-top-btn');
    if (!btn) return;
    const containers = [
        ...document.querySelectorAll('.swiper-slide'),
        document.getElementById('overlay-quran-reader'),
        document.getElementById('overlay-search')
    ].filter(Boolean);

    const toggle = (el) => {
        btn.classList.toggle('hidden', !(el.scrollTop > 300));
    };

    containers.forEach(el => el.addEventListener('scroll', () => toggle(el), { passive: true }));

    btn.onclick = () => {
        document.querySelectorAll('.swiper-slide').forEach(s => s.scrollTo({ top: 0, behavior: 'smooth' }));
        document.getElementById('overlay-quran-reader').scrollTo({ top: 0, behavior: 'smooth' });
        document.getElementById('overlay-search').scrollTo({ top: 0, behavior: 'smooth' });
    };
}