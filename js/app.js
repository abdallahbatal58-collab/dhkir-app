/* ═══════════════════════════════════════════════════════════════
   ذِكْر | Main Application v3.0.0
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const pageMap = ['home','morning','evening','sleep','wake','duas','favorites','stats','asmah','tasbih','quran','qibla','settings'];

const state = {
    currentPage: 'home',
    tasbihCount: 0,
    tasbihTarget: 33,
    tasbihIndex: 0,
    qiblaBearing: 0,
    orientationListener: null,
    installPrompt: null,
    prayerTimes: null,
    lastFocused: null
};

const settings = {
    darkMode: localStorage.getItem('dhikr_dark') === 'true',
    fontScale: parseInt(localStorage.getItem('dhikr_font') || '24', 10),
    adhkarScale: parseInt(localStorage.getItem('dhikr_adhkar_font') || '20', 10),
    resetCounter: localStorage.getItem('dhikr_reset') !== 'false'
};

const TASBIH_CIRCUMFERENCE = 2 * Math.PI * 112; // 703.7

let swiper = null;

/* ═══════════════════ Bootstrap ═══════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash');
        if (splash) splash.classList.add('hide');
        initApp();
    }, 1200);
});

function initApp() {
    applyTheme();
    applyFontScales();
    setupSwiper();
    setupNavigation();
    setupSearch();
    setupSettingsUI();
    setupTasbih();
    setupQibla();
    setupScrollTop();
    setupPWA();
    setupFocusTrap();
    renderAllAdhkar();
    renderFavorites();
    renderStats();
    renderAsma();
    updateHijriDate();
    loadQuranSurahs();
    loadPrayerTimes();
    updateContinueReading();
    handleUrlParams();
}

/* ═══════════════════ Theme & Fonts ═══════════════════ */
function applyTheme() {
    document.documentElement.dataset.theme = settings.darkMode ? 'dark' : 'light';
    const btn = document.getElementById('theme-btn');
    if (btn) btn.querySelector('use').setAttribute('href', settings.darkMode ? '#i-sunrise' : '#i-moon');
    const setDark = document.getElementById('set-dark');
    if (setDark) setDark.checked = settings.darkMode;
    const meta = document.querySelector('meta[name="theme-color"]:not([media])');
    if (meta) meta.setAttribute('content', settings.darkMode ? '#050e0a' : '#0a3d2a');
}

function applyFontScales() {
    document.documentElement.style.setProperty('--quran-size', settings.fontScale + 'px');
    document.documentElement.style.setProperty('--adhkar-size', settings.adhkarScale + 'px');
    const setFont = document.getElementById('set-font');
    if (setFont) setFont.value = settings.fontScale;
    const setAdhkarFont = document.getElementById('set-adhkar-font');
    if (setAdhkarFont) setAdhkarFont.value = settings.adhkarScale;
}

/* ═══════════════════ Swiper ═══════════════════ */
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
                if (settings.resetCounter && oldPage !== newPage && isAdhkarPage(oldPage)) {
                    resetAdhkarCounters(oldPage);
                }
                state.currentPage = newPage;
                updateNavState(newPage);
                updateUrlParam(newPage);
                if (newPage === 'favorites') renderFavorites();
                if (newPage === 'stats') renderStats();
            }
        }
    });
}

function isAdhkarPage(page) {
    return ['morning','evening','sleep','wake','duas','prayer','mosque','food','travel','ruqyah'].includes(page);
}

function updateNavState(pageId) {
    document.querySelectorAll('#bottom-nav button').forEach(btn => {
        const active = btn.dataset.target === pageId;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-current', active ? 'page' : 'false');
    });
    document.querySelectorAll('.nav-group a').forEach(a => {
        a.classList.toggle('active', a.dataset.target === pageId);
    });
    closeSidebar();
}

function navigateTo(pageId) {
    const idx = pageMap.indexOf(pageId);
    if (idx !== -1 && swiper) swiper.slideTo(idx);
}

/* ═══════════════════ Navigation ═══════════════════ */
function setupNavigation() {
    // Event delegation على كل روابط التنقل
    document.addEventListener('click', (e) => {
        const navBtn = e.target.closest('[data-target]');
        if (!navBtn) return;
        const target = navBtn.dataset.target;
        if (target && pageMap.includes(target)) {
            e.preventDefault();
            navigateTo(target);
        }
    });

    document.getElementById('menu-btn').onclick = openSidebar;
    document.getElementById('sidebar-overlay').onclick = closeSidebar;
    document.getElementById('close-reader').onclick = closeReader;
    document.getElementById('close-search').onclick = () => { closeSearch(); document.getElementById('search-input').value = ''; };
    document.getElementById('theme-btn').onclick = toggleTheme;

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') { closeSidebar(); closeReader(); closeSearch(); }
    });

    document.getElementById('continue-reading')?.addEventListener('click', () => {
        const last = JSON.parse(localStorage.getItem('dhikr_last_read') || 'null');
        if (last) openSurah(last.number, last.name);
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

/* ═══════════════════ Focus Trap للنوافذ ═══════════════════ */
function setupFocusTrap() {
    ['overlay-search', 'overlay-quran-reader'].forEach(id => {
        const overlay = document.getElementById(id);
        if (!overlay) return;
        overlay.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') return;
            const focusables = overlay.querySelectorAll('button, a, input, [tabindex]:not([tabindex="-1"])');
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
            else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        });
    });
}

/* ═══════════════════ URL Params ═══════════════════ */
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

/* ═══════════════════ Adhkar Rendering ═══════════════════ */
function renderAllAdhkar() {
    const categories = ['morning','evening','sleep','wake','duas','prayer','mosque','food','travel','ruqyah'];
    categories.forEach(cat => {
        const el = document.getElementById(`list-${cat}`);
        if (!el) return;
        const items = ADHKAR_DATA.filter(d => d.category === cat);
        el.innerHTML = items.length ? items.map(generateCardHTML).join('') :
            `<div class="empty-state"><svg class="icon"><use href="#i-hands"/></svg><h3>لا توجد أذكار</h3><p>سيتم إضافتها قريباً</p></div>`;
    });

    // Event delegation للأزرار
    document.getElementById('main-content')?.addEventListener('click', handleCardClick);
}

function generateCardHTML(item) {
    const header = item.type === 'surah'
        ? `<p class="basmala">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>`
        : (item.type === 'ayah' ? `<p class="istiadha">أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ</p>` : '');

    const btn = item.count > 1
        ? `<button class="btn-dhikr" data-action="increment" data-id="${item.id}" data-max="${item.count}">التكرار (0/${item.count})</button>`
        : '';

    const isFav = isFavorite(item.id);
    return `
        <article class="adhkar-card" id="card-${item.id}">
            ${header ? `<div class="card-header">${header}</div>` : ''}
            <div class="adhkar-text">${item.text}</div>
            <div class="dua-ref">${item.source || ''}</div>
            <div class="adhkar-actions">
                ${btn}
                <button class="btn-fav ${isFav ? 'active' : ''}" data-action="favorite" data-id="${item.id}" aria-label="المفضلة">
                    <svg class="icon"><use href="#i-star"/></svg>
                </button>
                <button class="btn-util" data-action="copy" data-id="${item.id}" aria-label="نسخ">
                    <svg class="icon"><use href="#i-copy"/></svg>
                </button>
                <button class="btn-util" data-action="share" data-id="${item.id}" aria-label="مشاركة">
                    <svg class="icon"><use href="#i-share"/></svg>
                </button>
            </div>
        </article>`;
}

function handleCardClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if (action === 'increment') incrementDhikr(btn, id, parseInt(btn.dataset.max, 10));
    else if (action === 'favorite') toggleFavorite(btn, id);
    else if (action === 'copy') copyDhikr(id);
    else if (action === 'share') shareDhikr(id);
}

function incrementDhikr(btn, id, max) {
    let cur = parseInt(localStorage.getItem(`count_${id}`) || 0, 10);
    if (cur >= max) return;
    cur++;
    localStorage.setItem(`count_${id}`, cur);
    if (navigator.vibrate) navigator.vibrate(12);
    btn.textContent = `التكرار (${cur}/${max})`;
    trackDhikr();
    if (cur === max) {
        btn.classList.add('done');
        btn.innerHTML = `<svg class="icon" style="display:inline-block;vertical-align:middle;width:1em;height:1em"><use href="#i-check"/></svg> تم`;
        if (navigator.vibrate) navigator.vibrate([80,40,80]);
    }
}

function resetAdhkarCounters(category) {
    if (!category) return;
    ADHKAR_DATA.filter(i => i.category === category).forEach(i => {
        localStorage.removeItem(`count_${i.id}`);
        const b = document.querySelector(`#card-${i.id} .btn-dhikr`);
        if (b && i.count > 1) {
            b.classList.remove('done');
            b.textContent = `التكرار (0/${i.count})`;
        }
    });
}

async function copyDhikr(id) {
    const item = ADHKAR_DATA.find(x => x.id === id);
    if (!item) return;
    try {
        await navigator.clipboard.writeText(`${item.text}\n\n${item.source || ''}\n\n— من تطبيق ذِكْر`);
        showToast('تم النسخ ✓');
    } catch { showToast('تعذر النسخ'); }
}

async function shareDhikr(id) {
    const item = ADHKAR_DATA.find(x => x.id === id);
    if (!item) return;
    const text = `${item.text}\n\n${item.source || ''}\n\n— من تطبيق ذِكْر`;
    if (navigator.share) {
        try { await navigator.share({ title: 'ذِكْر', text }); } catch {}
    } else {
        try { await navigator.clipboard.writeText(text); showToast('تم النسخ للمشاركة'); } catch {}
    }
}

/* ═══════════════════ Favorites ═══════════════════ */
function getFavorites() {
    try { return JSON.parse(localStorage.getItem('dhikr_favorites') || '[]'); }
    catch { return []; }
}
function isFavorite(id) { return getFavorites().includes(id); }
function toggleFavorite(btn, id) {
    let favs = getFavorites();
    if (favs.includes(id)) {
        favs = favs.filter(f => f !== id);
        btn.classList.remove('active');
        showToast('أُزيل من المفضلة');
    } else {
        favs.push(id);
        btn.classList.add('active');
        showToast('أُضيف للمفضلة ★');
    }
    localStorage.setItem('dhikr_favorites', JSON.stringify(favs));
    if (state.currentPage === 'favorites') renderFavorites();
}
function renderFavorites() {
    const el = document.getElementById('list-favorites');
    if (!el) return;
    const favs = getFavorites();
    if (!favs.length) {
        el.innerHTML = `<div class="empty-state">
            <svg class="icon"><use href="#i-star"/></svg>
            <h3>لا توجد مفضلة بعد</h3>
            <p>اضغط ★ في أي ذكر لحفظه هنا</p>
        </div>`;
        return;
    }
    el.innerHTML = favs.map(id => ADHKAR_DATA.find(x => x.id === id)).filter(Boolean).map(generateCardHTML).join('');
}

/* ═══════════════════ Stats ═══════════════════ */
function getStats() {
    try {
        return JSON.parse(localStorage.getItem('dhikr_stats') || '{}');
    } catch { return {}; }
}

function trackDhikr() {
    const stats = getStats();
    const today = new Date().toDateString();
    stats.total = (stats.total || 0) + 1;
    stats.daily = stats.daily || {};
    stats.daily[today] = (stats.daily[today] || 0) + 1;
    // حساب الـ streak
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (stats.lastDay === yesterday || stats.lastDay === today) {
        // استمرار
        if (stats.lastDay !== today) stats.streak = (stats.streak || 0) + 1;
    } else {
        stats.streak = 1;
    }
    stats.lastDay = today;
    localStorage.setItem('dhikr_stats', JSON.stringify(stats));
}

function renderStats() {
    const el = document.getElementById('stats-container');
    if (!el) return;
    const stats = getStats();
    const today = new Date().toDateString();
    const todayCount = (stats.daily && stats.daily[today]) || 0;
    const total = stats.total || 0;
    const streak = stats.streak || 0;

    // حساب الأسبوع الأخير
    const last7 = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toDateString();
        last7.push({ day: d, count: (stats.daily && stats.daily[d]) || 0 });
    }
    const maxCount = Math.max(...last7.map(d => d.count), 1);

    el.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${todayCount}</div>
                <div class="stat-label">أذكار اليوم</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${total}</div>
                <div class="stat-label">المجموع الكلي</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${streak}</div>
                <div class="stat-label">أيام متتالية 🔥</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${getFavorites().length}</div>
                <div class="stat-label">المفضلة ★</div>
            </div>
        </div>
        <div class="settings-group">
            <h3 class="settings-title">آخر 7 أيام</h3>
            <div class="settings-card" style="padding: var(--s-4)">
                <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:var(--s-1);height:120px">
                    ${last7.map(d => `
                        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
                            <div style="width:100%;background:var(--accent);border-radius:4px;height:${Math.max((d.count / maxCount) * 100, 4)}%;min-height:4px;opacity:${d.count ? 1 : 0.2}"></div>
                            <div style="font-size:0.6rem;color:var(--text-muted)">${d.day.split(' ')[0]}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

/* ═══════════════════ Asma ul Husna ═══════════════════ */
function renderAsma() {
    const el = document.getElementById('asma-grid');
    if (!el) return;
    el.innerHTML = ASMA_UL_HUSNA.map((name, i) => `
        <div class="asma-item">
            <div style="font-size:0.65rem;color:var(--text-muted);font-family:var(--font-body);margin-bottom:4px">${i + 1}</div>
            ${name}
        </div>
    `).join('');
}

/* ═══════════════════ Search ═══════════════════ */
function setupSearch() {
    const form = document.getElementById('search-form');
    if (!form) return;
    form.addEventListener('submit', e => { e.preventDefault(); executeSearch(); });

    const input = document.getElementById('search-input');
    let debounce;
    input.addEventListener('input', () => {
        clearTimeout(debounce);
        if (input.value.trim().length < 2) return;
        debounce = setTimeout(() => executeSearch(true), 350);
    });
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

function executeSearch(silent = false) {
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
        : `<div class="empty-state">
            <svg class="icon"><use href="#i-search"/></svg>
            <h3>لا نتائج</h3>
            <p>لم نجد "${q}"</p>
        </div>`;
    if (!silent) {
        document.getElementById('overlay-search').classList.add('active');
        document.getElementById('overlay-search').scrollTop = 0;
    }
}

/* ═══════════════════ Quran ═══════════════════ */
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
        <button class="adhkar-card" style="cursor:pointer;text-align:right;width:100%" data-surah="${s.number}" data-name="${s.name}">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                    <h3 style="color:var(--accent);font-family:'Amiri Quran';font-size:1.5rem;margin-bottom:4px">${s.name}</h3>
                    <p style="color:var(--text-muted);font-size:0.85rem">${s.numberOfAyahs} آية · ${s.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}</p>
                </div>
                <div class="surah-number-circle">${s.number}</div>
            </div>
        </button>
    `).join('');
    container.querySelectorAll('[data-surah]').forEach(btn => {
        btn.addEventListener('click', () => openSurah(parseInt(btn.dataset.surah, 10), btn.dataset.name));
    });
}

function formatTajweed(text) {
    return (text || '')
        .replace(/<tajweed class=([a-z_]+)>/g, '<span class="$1">')
        .replace(/<\/tajweed>/g, '</span>');
}

async function openSurah(number, name) {
    document.getElementById('reader-title').textContent = name;
    localStorage.setItem('dhikr_last_read', JSON.stringify({ number, name }));
    updateContinueReading();

    const container = document.getElementById('list-quran-verses');
    container.innerHTML = '<p class="loading-text"><span class="spinner-sm"></span> جاري تحميل الآيات...</p>';
    document.getElementById('overlay-quran-reader').classList.add('active');
    document.getElementById('overlay-quran-reader').scrollTop = 0;

    let ok = false;
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
    } catch (e) {}

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
        } catch (e) {}
    }

    if (!ok) container.innerHTML = '<p class="loading-text">تعذر تحميل الآيات. تأكد من اتصالك بالإنترنت.</p>';
}

function updateContinueReading() {
    const card = document.getElementById('continue-reading');
    const title = document.getElementById('continue-title');
    if (!card || !title) return;
    const last = JSON.parse(localStorage.getItem('dhikr_last_read') || 'null');
    if (last) {
        card.hidden = false;
        title.textContent = last.name;
    } else {
        card.hidden = true;
    }
}

/* ═══════════════════ Prayer Times ═══════════════════ */
async function loadPrayerTimes() {
    const today = new Date().toDateString();
    const cached = localStorage.getItem('dhikr_prayer_cache');
    const cachedDate = localStorage.getItem('dhikr_prayer_date');
    if (cached && cachedDate === today) {
        try { renderPrayerTimes(JSON.parse(cached)); } catch {}
    }
    try {
        const coords = await getCurrentPosition().catch(() => null);
        const date = new Date();
        const d = `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()}`;
        let url;
        if (coords) {
            url = `https://api.aladhan.com/v1/timings/${d}?latitude=${coords.lat}&longitude=${coords.lng}&method=4`;
        } else {
            url = `https://api.aladhan.com/v1/timingsByCity/${d}?city=Mecca&country=SA&method=4`;
        }
        const res = await fetch(url);
        const data = await res.json();
        if (data.code === 200) {
            localStorage.setItem('dhikr_prayer_cache', JSON.stringify(data.data.timings));
            localStorage.setItem('dhikr_prayer_date', today);
            renderPrayerTimes(data.data.timings);
        }
    } catch (e) {}
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject('no geo');
        navigator.geolocation.getCurrentPosition(
            pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
            reject,
            { timeout: 5000, maximumAge: 3600000 }
        );
    });
}

function renderPrayerTimes(timings) {
    if (!timings) return;
    const strip = document.getElementById('prayer-strip');
    if (!strip) return;
    const prayers = ['Fajr','Dhuhr','Asr','Maghrib','Isha'];
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    let activeSet = false;
    prayers.forEach(p => {
        const el = strip.querySelector(`[data-prayer="${p}"]`);
        if (!el) return;
        const t = timings[p] || '—';
        el.textContent = formatTime(t);
        const item = el.closest('.prayer-item');
        if (item) {
            const [h, m] = t.split(':').map(n => parseInt(n, 10));
            const tMin = h * 60 + m;
            if (!activeSet && tMin > nowMin) {
                item.classList.add('active');
                activeSet = true;
            } else {
                item.classList.remove('active');
            }
        }
    });
}

function formatTime(t) {
    if (!t || !t.includes(':')) return t;
    const [h, m] = t.split(':');
    const hh = parseInt(h, 10);
    const suffix = hh >= 12 ? 'م' : 'ص';
    const h12 = hh > 12 ? hh - 12 : (hh === 0 ? 12 : hh);
    return `${h12}:${m} ${suffix}`;
}

/* ═══════════════════ Tasbih ═══════════════════ */
function setupTasbih() {
    const select = document.getElementById('tasbih-select');
    const target = document.getElementById('tasbih-target');
    const circle = document.getElementById('tasbih-btn');
    if (!select) return;

    select.innerHTML = TASBIH_ITEMS.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');

    try {
        const saved = JSON.parse(localStorage.getItem('dhikr_tasbih') || '{}');
        if (saved.index != null) { state.tasbihIndex = saved.index; select.value = saved.index; }
        if (saved.count != null) state.tasbihCount = saved.count;
        if (saved.target != null) {
            state.tasbihTarget = saved.target;
            target.value = [33, 100, 500, 1000].includes(saved.target) ? String(saved.target) : 'custom';
        }
    } catch {}

    updateTasbihUI();

    select.onchange = () => {
        state.tasbihIndex = parseInt(select.value, 10);
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
        trackDhikr();
        if (navigator.vibrate) navigator.vibrate(12);
        updateTasbihUI();
        saveTasbih();
        if (state.tasbihCount === state.tasbihTarget) {
            circle.classList.add('completed');
            setTimeout(() => circle.classList.remove('completed'), 700);
            if (navigator.vibrate) navigator.vibrate([100,50,100,50,200]);
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

    const ring = document.getElementById('tasbih-progress');
    if (ring) {
        const progress = state.tasbihCount / state.tasbihTarget;
        ring.style.strokeDashoffset = TASBIH_CIRCUMFERENCE * (1 - progress);
    }
}

function saveTasbih() {
    localStorage.setItem('dhikr_tasbih', JSON.stringify({
        count: state.tasbihCount,
        target: state.tasbihTarget,
        index: state.tasbihIndex
    }));
}

/* ═══════════════════ Qibla ═══════════════════ */
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
    document.getElementById('compass-ring')?.classList.add('rotating');

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

/* ═══════════════════ Settings ═══════════════════ */
function setupSettingsUI() {
    const setDark = document.getElementById('set-dark');
    const setFont = document.getElementById('set-font');
    const setAdhkarFont = document.getElementById('set-adhkar-font');
    const setReset = document.getElementById('set-reset-counter');
    const resetAll = document.getElementById('reset-all-btn');
    const shareApp = document.getElementById('share-app-btn');

    if (setDark) setDark.onchange = e => {
        settings.darkMode = e.target.checked;
        localStorage.setItem('dhikr_dark', settings.darkMode);
        applyTheme();
    };
    if (setFont) setFont.oninput = e => {
        settings.fontScale = parseInt(e.target.value, 10);
        localStorage.setItem('dhikr_font', settings.fontScale);
        applyFontScales();
    };
    if (setAdhkarFont) setAdhkarFont.oninput = e => {
        settings.adhkarScale = parseInt(e.target.value, 10);
        localStorage.setItem('dhikr_adhkar_font', settings.adhkarScale);
        applyFontScales();
    };
    if (setReset) {
        setReset.checked = settings.resetCounter;
        setReset.onchange = e => {
            settings.resetCounter = e.target.checked;
            localStorage.setItem('dhikr_reset', settings.resetCounter);
        };
    }
    if (resetAll) resetAll.onclick = () => {
        if (!confirm('سيتم مسح كل العدادات والمفضلة والإحصائيات. متابعة؟')) return;
        Object.keys(localStorage).filter(k =>
            k.startsWith('count_') || k === 'dhikr_tasbih' || k === 'dhikr_stats' || k === 'dhikr_favorites'
        ).forEach(k => localStorage.removeItem(k));
        state.tasbihCount = 0;
        updateTasbihUI();
        renderAllAdhkar();
        renderFavorites();
        renderStats();
        showToast('تم تصفير كل شيء ✓');
    };
    if (shareApp) shareApp.onclick = async () => {
        const data = { title: 'ذِكْر', text: 'تطبيق ذِكْر — أذكار وأدعية', url: location.origin };
        if (navigator.share) { try { await navigator.share(data); } catch {} }
        else { try { await navigator.clipboard.writeText(location.href); showToast('تم نسخ الرابط'); } catch {} }
    };
}

/* ═══════════════════ PWA ═══════════════════ */
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

/* ═══════════════════ Utilities ═══════════════════ */
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
    document.querySelectorAll('.swiper-slide, .overlay-page').forEach(el => {
        el.addEventListener('scroll', () => {
            btn.classList.toggle('hidden', !(el.scrollTop > 300));
        }, { passive: true });
    });
    btn.onclick = () => {
        document.querySelectorAll('.swiper-slide, .overlay-page').forEach(s =>
            s.scrollTo({ top: 0, behavior: 'smooth' })
        );
    };
}

function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timeout);
    t._timeout = setTimeout(() => t.classList.remove('show'), 2400);
}