const state = { currentPage: 'home', isSidebarOpen: false, tasbihCount: 0, tasbihTarget: 33, qiblaBearing: 0 };
const settings = {
    darkMode: localStorage.getItem('dhikr_dark') === 'true',
    fontScale: localStorage.getItem('dhikr_font') || '24',
    resetCounter: localStorage.getItem('dhikr_reset') !== 'false'
};

const pageMap = [
    'home', 'morning', 'evening', 'sleep', 'wake', 'duas', 'tasbih', 'quran', 'qibla', 'settings'
];

let swiper;

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { 
        const splash = document.getElementById('splash');
        if(splash) splash.classList.add('hide'); 
        initApp(); 
    }, 1500);
});

function initApp() {
    applySettings(); renderAllAdhkar(); setupSwiper(); setupNavigation(); 
    setupSearch(); setupSettingsUI(); setupTasbih(); setupQibla(); 
    setupScrollTop(); updateHijriDate(); loadQuranSurahs();
}

function setupSwiper() {
    swiper = new Swiper('.swiper', {
        direction: 'horizontal',
        loop: false,
        speed: 350,
        resistanceRatio: 0.85,
        on: {
            slideChange: function () {
                updateNavState(this.activeIndex);
                const currentId = pageMap[this.activeIndex];
                if (settings.resetCounter && state.currentPage !== currentId) {
                    resetAdhkarCounters();
                }
                state.currentPage = currentId;
            }
        }
    });
}

function updateNavState(index) {
    const targetId = pageMap[index];
    document.querySelectorAll('#bottom-nav button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.target === targetId);
    });
    const activeBtn = document.querySelector('#bottom-nav button.active');
    if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
    document.querySelectorAll('.nav-group a').forEach(a => {
        a.classList.toggle('active', a.dataset.target === targetId);
    });
    closeSidebar();
}

function navigateTo(pageId) {
    const index = pageMap.indexOf(pageId);
    if (index !== -1 && swiper) {
        swiper.slideTo(index);
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-group a').forEach(btn => {
        btn.addEventListener('click', (e) => { e.preventDefault(); navigateTo(btn.dataset.target); });
    });
    document.querySelectorAll('.card[data-target]').forEach(btn => {
        btn.addEventListener('click', () => navigateTo(btn.dataset.target));
    });
    document.querySelectorAll('#bottom-nav button').forEach(btn => {
        btn.addEventListener('click', () => navigateTo(btn.dataset.target));
    });
    document.getElementById('menu-btn').onclick = openSidebar;
    document.getElementById('sidebar-overlay').onclick = closeSidebar;
    document.getElementById('close-reader').onclick = () => {
        document.getElementById('overlay-quran-reader').classList.remove('active');
    };
    document.getElementById('close-search').onclick = () => {
        document.getElementById('overlay-search').classList.remove('active');
    };
}

function openSidebar() { 
    document.getElementById('sidebar').classList.add('open'); 
    document.getElementById('sidebar-overlay').classList.add('show'); 
    state.isSidebarOpen = true; 
}
function closeSidebar() { 
    document.getElementById('sidebar').classList.remove('open'); 
    document.getElementById('sidebar-overlay').classList.remove('show'); 
    state.isSidebarOpen = false; 
}

function applySettings() {
    if (settings.darkMode) { 
        document.body.classList.add('dark'); 
        document.getElementById('theme-btn').innerHTML = '<i class="fa-solid fa-sun"></i>'; 
        document.getElementById('set-dark').checked = true; 
    } else { 
        document.body.classList.remove('dark'); 
        document.getElementById('theme-btn').innerHTML = '<i class="fa-solid fa-moon"></i>'; 
    }
    document.documentElement.style.setProperty('--base-font-size', settings.fontScale + 'px');
    document.getElementById('set-font').value = settings.fontScale;
    document.getElementById('set-reset-counter').checked = settings.resetCounter;
}

function setupSettingsUI() {
    document.getElementById('theme-btn').onclick = () => { settings.darkMode = !settings.darkMode; localStorage.setItem('dhikr_dark', settings.darkMode); applySettings(); };
    document.getElementById('set-dark').onchange = (e) => { settings.darkMode = e.target.checked; localStorage.setItem('dhikr_dark', settings.darkMode); applySettings(); };
    document.getElementById('set-font').oninput = (e) => { settings.fontScale = e.target.value; localStorage.setItem('dhikr_font', settings.fontScale); document.documentElement.style.setProperty('--base-font-size', settings.fontScale + 'px'); };
    document.getElementById('set-reset-counter').onchange = (e) => { settings.resetCounter = e.target.checked; localStorage.setItem('dhikr_reset', settings.resetCounter); };
}

function renderAllAdhkar() {
    ['morning', 'evening', 'sleep', 'wake', 'duas'].forEach(cat => {
        const c = document.getElementById(`list-${cat}`);
        if(c) c.innerHTML = ADHKAR_DATA.filter(d => d.category === cat).map(generateCardHTML).join('');
    });
}

function generateCardHTML(item) {
    let header = item.type === 'surah' ? `<p class="basmala">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>` : (item.type === 'ayah' ? `<p class="istiadha">أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ</p>` : '');
    let body = (item.type === 'surah' || item.type === 'ayah') ? 'adhkar-text' : 'adhkar-text';
    let btn = item.category !== 'duas' ? `<button class="btn-dhikr" onclick="incrementDhikr(this, '${item.id}', ${item.count})">التكرار (0/${item.count})</button>` : '';
    return `<div class="adhkar-card" id="card-${item.id}"><div class="card-header">${header}</div><div class="${body}">${item.text}</div><div class="dua-ref">${item.source || ''}</div>${btn}</div>`;
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
    const searchContainer = document.getElementById('list-search');
    if(searchContainer) searchContainer.innerHTML = results.length ? results.map(generateCardHTML).join('') : `<div class="loading-text">لا توجد نتائج مطابقة</div>`;
    document.getElementById('overlay-search').classList.add('active');
}

// --- محرك القرآن (تم تحسينه ليعمل دائماً) ---
async function loadQuranSurahs() {
    const container = document.getElementById('list-quran');
    if(!container) return;
    try {
        const res = await fetch('https://api.alquran.cloud/v1/surah');
        const data = await res.json();
        if (data.code === 200) {
            container.innerHTML = data.data.map(s => `
                <div class="adhkar-card" style="cursor:pointer;" onclick="openSurah(${s.number}, '${s.name}')">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div><h3 style="color:var(--gold); font-family:'Amiri Quran'; font-size:1.4rem;">${s.name}</h3><p style="color:var(--text-muted); font-size:0.9rem;">${s.numberOfAyahs} آية</p></div>
                        <div style="background:var(--primary); color:var(--gold); width:40px; height:40px; display:flex; justify-content:center; align-items:center; border-radius:50%; font-weight:bold;">${s.number}</div>
                    </div>
                </div>`).join('');
        }
    } catch (e) { 
        container.innerHTML = '<p class="loading-text">تأكد من اتصالك بالإنترنت لتحميل الفهرس.</p>'; 
    }
}

function formatTajweed(text) {
    return text.replace(/<tajweed class=([a-z_]+)>/g, '<span class="$1">').replace(/<\/tajweed>/g, '</span>');
}

async function openSurah(number, name) {
    const title = document.getElementById('reader-title');
    if(title) title.textContent = name;
    
    const container = document.getElementById('list-quran-verses');
    if(!container) return;
    container.innerHTML = '<p class="loading-text" style="color:var(--gold);"><i class="fa-solid fa-spinner fa-spin"></i> جاري تحميل الآيات...</p>';
    
    document.getElementById('overlay-quran-reader').classList.add('active');

    let success = false;

    // المحاولة الأولى: Quran.com (Tajweed)
    try {
        const res = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani_tajweed?chapter_number=${number}`);
        const data = await res.json();
        
        if (data.verses && data.verses.length > 0) {
            let versesHTML = '';
            if (number !== 1 && number !== 9) {
                versesHTML += `<div style="text-align:center; margin-bottom: 20px;"><span style="font-family:'Amiri Quran', serif; font-size:calc(var(--base-font-size) + 2px); color:var(--gold);">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</span></div>`;
            }
            versesHTML += data.verses.map(v => {
                const formattedText = formatTajweed(v.text_uthmani_tajweed);
                const ayahNum = v.verse_key.split(':')[1];
                return `<span>${formattedText}</span> <span class="verse-number">${ayahNum}</span> `;
            }).join('');
            container.innerHTML = versesHTML;
            success = true;
        }
    } catch (e) { console.log("Quran.com API failed, switching to fallback..."); }

    // المحاولة الثانية: AlQuran Cloud (Fallback)
    if (!success) {
        try {
            const fallbackRes = await fetch(`https://api.alquran.cloud/v1/surah/${number}/quran-tajweed`);
            const fallbackData = await fallbackRes.json();
            if (fallbackData.code === 200) {
                const ayahs = fallbackData.data.ayahs;
                let versesHTML = '';
                if (number !== 1 && number !== 9) {
                    versesHTML += `<div style="text-align:center; margin-bottom: 20px;"><span style="font-family:'Amiri Quran', serif; font-size:calc(var(--base-font-size) + 2px); color:var(--gold);">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</span></div>`;
                }
                versesHTML += ayahs.map(a => {
                    const formattedText = formatTajweed(a.text);
                    return `<span>${formattedText}</span> <span class="verse-number">${a.numberInSurah}</span> `;
                }).join('');
                container.innerHTML = versesHTML;
                success = true;
            }
        } catch (e) { console.log("Fallback API also failed."); }
    }

    if (!success) {
        container.innerHTML = '<p class="loading-text">تعذر تحميل الآيات. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.</p>';
    } else {
        document.getElementById('overlay-quran-reader').scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// --- السبحة والقبلة ---
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
function setupScrollTop() { 
    const btn = document.getElementById('scroll-top-btn'); if(!btn) return;
    document.querySelectorAll('.swiper-slide').forEach(slide => {
        slide.addEventListener('scroll', () => { if(slide.scrollTop > 300) btn.classList.remove('hidden'); else btn.classList.add('hidden'); });
    });
    btn.onclick = () => { const active = document.querySelector('.swiper-slide-active'); if(active) active.scrollTo({top:0, behavior:'smooth'}); };
}