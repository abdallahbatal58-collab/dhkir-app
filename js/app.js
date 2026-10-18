const state = { currentPage: 'home', isSidebarOpen: false, tasbihCount: 0, tasbihTarget: 33, qiblaBearing: 0, currentRotation: 0 };
const settings = {
    darkMode: localStorage.getItem('dhikr_dark') === 'true',
    fontScale: localStorage.getItem('dhikr_font') || '1',
    resetCounter: localStorage.getItem('dhikr_reset') !== 'false'
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { document.getElementById('splash').classList.add('hide'); initApp(); }, 1500);
});

function initApp() {
    applySettings(); renderAllAdhkar(); setupNavigation(); setupSearch(); setupSettingsUI();
    setupTasbih(); setupQibla(); setupSwipeGestures(); setupScrollTop(); updateHijriDate();
    loadQuranSurahs(); // تحميل القرآن
}

function applySettings() {
    if (settings.darkMode) { document.body.classList.add('dark'); document.getElementById('theme-btn').innerHTML = '<i class="fa-solid fa-sun"></i>'; if(document.getElementById('set-dark')) document.getElementById('set-dark').checked = true; }
    else { document.body.classList.remove('dark'); document.getElementById('theme-btn').innerHTML = '<i class="fa-solid fa-moon"></i>'; }
    document.documentElement.style.setProperty('--font-scale', settings.fontScale);
    if(document.getElementById('set-font')) document.getElementById('set-font').value = settings.fontScale;
    if(document.getElementById('set-reset-counter')) document.getElementById('set-reset-counter').checked = settings.resetCounter;
}

function setupSettingsUI() {
    document.getElementById('theme-btn').onclick = () => { settings.darkMode = !settings.darkMode; localStorage.setItem('dhikr_dark', settings.darkMode); applySettings(); };
    if(document.getElementById('set-dark')) document.getElementById('set-dark').onchange = (e) => { settings.darkMode = e.target.checked; localStorage.setItem('dhikr_dark', settings.darkMode); applySettings(); };
    if(document.getElementById('set-font')) document.getElementById('set-font').oninput = (e) => { settings.fontScale = e.target.value; localStorage.setItem('dhikr_font', settings.fontScale); document.documentElement.style.setProperty('--font-scale', settings.fontScale); };
    if(document.getElementById('set-reset-counter')) document.getElementById('set-reset-counter').onchange = (e) => { settings.resetCounter = e.target.checked; localStorage.setItem('dhikr_reset', settings.resetCounter); };
}

function navigateTo(pageId) {
    if (settings.resetCounter && state.currentPage !== pageId) resetAdhkarCounters();
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${pageId}`);
    if (target) target.classList.add('active');
    state.currentPage = pageId;
    document.querySelectorAll('.nav-group a').forEach(a => a.classList.toggle('active', a.dataset.target === pageId));
    document.querySelectorAll('#bottom-nav button[data-target]').forEach(b => b.classList.toggle('active', b.dataset.target === pageId));
    closeSidebar();
    document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

function setupNavigation() {
    document.querySelectorAll('[data-target]').forEach(btn => {
        btn.addEventListener('click', (e) => { e.preventDefault(); navigateTo(btn.dataset.target); });
    });
    document.getElementById('menu-btn').onclick = openSidebar;
    document.getElementById('more-btn').onclick = openSidebar;
    document.getElementById('sidebar-overlay').onclick = closeSidebar;
}

function openSidebar() { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-overlay').classList.add('show'); state.isSidebarOpen = true; }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.remove('show'); state.isSidebarOpen = false; }

function setupSwipeGestures() {
    let startX = 0, startY = 0;
    const main = document.getElementById('main-content');
    const pages = ['home', 'quran', 'morning', 'evening', 'tasbih', 'duas'];
    main.addEventListener('touchstart', e => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }, { passive: true });
    main.addEventListener('touchend', e => {
        let diffX = startX - e.changedTouches[0].clientX, diffY = startY - e.changedTouches[0].clientY;
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 70) {
            if (startX > window.innerWidth - 50 && diffX < -70) { openSidebar(); return; }
            if (!state.isSidebarOpen) {
                let idx = pages.indexOf(state.currentPage);
                if (idx === -1) return;
                if (diffX > 70) navigateTo(pages[(idx + 1) % pages.length]);
                else if (diffX < -70) navigateTo(pages[(idx - 1 + pages.length) % pages.length]);
            }
        }
    }, { passive: true });
}

function renderAllAdhkar() {
    ['morning', 'evening', 'sleep', 'wake', 'duas'].forEach(cat => {
        const c = document.getElementById(`list-${cat}`);
        if(c) c.innerHTML = ADHKAR_DATA.filter(d => d.category === cat).map(generateCardHTML).join('');
    });
}

function generateCardHTML(item) {
    let header = item.type === 'surah' ? `<p class="basmala">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>` : (item.type === 'ayah' ? `<p class="istiadha">أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ</p>` : '');
    let body = (item.type === 'surah' || item.type === 'ayah') ? 'quran-text' : 'adhkar-text';
    let btn = item.category !== 'duas' ? `<button class="btn-dhikr" onclick="incrementDhikr(this, '${item.id}', ${item.count})">التكرار (0/${item.count})</button>` : '';
    return `<div class="adhkar-card" id="card-${item.id}"><div class="card-header">${header}</div><div class="${body}">${item.text}</div><div class="dua-ref">${item.source}</div>${btn}</div>`;
}

window.incrementDhikr = (btn, id, max) => {
    let cur = parseInt(localStorage.getItem(`count_${id}`) || 0);
    if (cur < max) {
        cur++; localStorage.setItem(`count_${id}`, cur);
        if (navigator.vibrate) navigator.vibrate(15);
        btn.textContent = `التكرار (${cur}/${max})`;
        if (cur === max) { btn.classList.add('done'); btn.innerHTML = '✓ تم'; if (navigator.vibrate) navigator.vibrate([100, 50, 100]); }
    }
};

function resetAdhkarCounters() {
    ADHKAR_DATA.forEach(i => {
        localStorage.setItem(`count_${i.id}`, 0);
        const b = document.querySelector(`#card-${i.id} .btn-dhikr`);
        if(b) { b.classList.remove('done'); b.textContent = `التكرار (0/${i.count})`; }
    });
}

function setupSearch() {
    const form = document.getElementById('search-form');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); executeSearch(); });
}

function normalize(text) { return text ? text.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[\u064B-\u065F]/g, '').trim() : ''; }

function executeSearch() {
    const q = document.getElementById('search-input').value.trim();
    if (!q) return;
    const nq = normalize(q);
    const results = ADHKAR_DATA.filter(i => normalize(i.text).includes(nq));
    document.getElementById('list-search').innerHTML = results.length ? results.map(generateCardHTML).join('') : `<div class="loading-text">لا توجد نتائج</div>`;
    navigateTo('search');
}

// محرك القرآن
async function loadQuranSurahs() {
    const container = document.getElementById('list-quran');
    try {
        const res = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await res.json();
        if (data.code === 200) {
            container.innerHTML = data.data.map(s => `
                <div class="adhkar-card">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div><h3 style="color:var(--gold); font-family:'Amiri'; font-size:1.4rem;">${s.name}</h3><p style="color:var(--text-muted); font-size:0.9rem;">${s.numberOfAyahs} آية</p></div>
                        <div style="background:var(--primary); color:var(--gold); width:40px; height:40px; display:flex; justify-content:center; align-items:center; border-radius:50%; font-weight:bold;">${s.number}</div>
                    </div>
                </div>`).join('');
        }
    } catch (e) { container.innerHTML = '<p class="loading-text">تأكد من اتصالك بالإنترنت لتحميل القرآن.</p>'; }
}

function setupTasbih() {
    const select = document.getElementById('tasbih-select');
    const target = document.getElementById('tasbih-target');
    const circle = document.getElementById('tasbih-btn');
    if (!select) return;
    select.innerHTML = TASBIH_ITEMS.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');
    const reset = () => { state.tasbihCount = 0; document.getElementById('tasbih-count').textContent = 0; };
    select.onchange = () => { document.getElementById('tasbih-text').textContent = TASBIH_ITEMS[select.value].name; reset(); };
    target.onchange = () => { state.tasbihTarget = target.value === 'custom' ? parseInt(prompt('أدخل العدد:', '50') || 33) : parseInt(target.value); document.getElementById('tasbih-max').textContent = '/' + state.tasbihTarget; reset(); };
    circle.onclick = () => { if(state.tasbihCount < state.tasbihTarget) { state.tasbihCount++; document.getElementById('tasbih-count').textContent = state.tasbihCount; if(navigator.vibrate) navigator.vibrate(15); } };
    document.getElementById('reset-tasbih').onclick = reset;
}

function setupQibla() {
    const btn = document.getElementById('btn-qibla');
    if (!btn) return;
    btn.onclick = async () => {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحديد...';
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const lat = pos.coords.latitude, lng = pos.coords.longitude, kLat = 21.4225, kLng = 39.8262;
                const dLon = (kLng - lng) * Math.PI / 180;
                const y = Math.sin(dLon) * Math.cos(kLat * Math.PI / 180);
                const x = Math.cos(lat * Math.PI / 180) * Math.sin(kLat * Math.PI / 180) - Math.sin(lat * Math.PI / 180) * Math.cos(kLat * Math.PI / 180) * Math.cos(dLon);
                state.qiblaBearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
                document.getElementById('qibla-angle-text').textContent = `القبلة: ${Math.round(state.qiblaBearing)}°`;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> البوصلة تعمل';
                window.addEventListener('deviceorientationabsolute', (e) => {
                    let h = e.webkitCompassHeading || (360 - e.alpha);
                    if(h) document.getElementById('qibla-arrow').style.transform = `rotate(${state.qiblaBearing - h}deg)`;
                });
            }, () => { alert('الرجاء السماح بالموقع'); btn.innerHTML = 'إعادة المحاولة'; });
        }
    };
}

function updateHijriDate() { const d = document.getElementById('hijri-date'); if(d) d.textContent = new Intl.DateTimeFormat('ar-SA-u-ca-islamic').format(new Date()); }
function setupScrollTop() { const mc = document.getElementById('main-content'), b = document.getElementById('scroll-top-btn'); mc.addEventListener('scroll', () => { mc.scrollTop > 300 ? b.classList.remove('hidden') : b.classList.add('hidden'); }); b.onclick = () => mc.scrollTo({top:0, behavior:'smooth'}); }