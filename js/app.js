const state = { currentPage: 'home', isSidebarOpen: false, tasbihCount: 0, tasbihTarget: 33, qiblaBearing: 0, currentRotation: 0 };
const settings = {
    darkMode: localStorage.getItem('dhikr_dark') === 'true',
    fontScale: localStorage.getItem('dhikr_font') || '24',
    resetCounter: localStorage.getItem('dhikr_reset') !== 'false'
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => { 
        const splash = document.getElementById('splash');
        if(splash) splash.classList.add('hide'); 
        initApp(); 
    }, 1500);
});

function initApp() {
    applySettings(); 
    renderAllAdhkar(); 
    setupNavigation(); 
    setupSearch(); 
    setupSettingsUI();
    setupTasbih(); 
    setupQibla(); 
    setupSwipeGestures(); // محرك اللمس
    setupScrollTop(); 
    updateHijriDate();
    loadQuranSurahs(); // تحميل الفهرس
}

// --- الإعدادات ---
function applySettings() {
    if (settings.darkMode) { 
        document.body.classList.add('dark'); 
        const themeBtn = document.getElementById('theme-btn');
        if(themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>'; 
        if(document.getElementById('set-dark')) document.getElementById('set-dark').checked = true; 
    } else { 
        document.body.classList.remove('dark'); 
        const themeBtn = document.getElementById('theme-btn');
        if(themeBtn) themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>'; 
    }
    document.documentElement.style.setProperty('--base-font-size', settings.fontScale + 'px');
    if(document.getElementById('set-font')) document.getElementById('set-font').value = settings.fontScale;
    if(document.getElementById('set-reset-counter')) document.getElementById('set-reset-counter').checked = settings.resetCounter;
}

function setupSettingsUI() {
    const themeBtn = document.getElementById('theme-btn');
    if(themeBtn) {
        themeBtn.onclick = () => { 
            settings.darkMode = !settings.darkMode; 
            localStorage.setItem('dhikr_dark', settings.darkMode); 
            applySettings(); 
        };
    }
    
    const setDark = document.getElementById('set-dark');
    if(setDark) {
        setDark.onchange = (e) => { 
            settings.darkMode = e.target.checked; 
            localStorage.setItem('dhikr_dark', settings.darkMode); 
            applySettings(); 
        };
    }
    
    const setFont = document.getElementById('set-font');
    if(setFont) {
        setFont.oninput = (e) => { 
            settings.fontScale = e.target.value; 
            localStorage.setItem('dhikr_font', settings.fontScale); 
            document.documentElement.style.setProperty('--base-font-size', settings.fontScale + 'px'); 
        };
    }
    
    const setReset = document.getElementById('set-reset-counter');
    if(setReset) {
        setReset.onchange = (e) => { 
            settings.resetCounter = e.target.checked; 
            localStorage.setItem('dhikr_reset', settings.resetCounter); 
        };
    }
}

// --- التنقل الأساسي ---
function navigateTo(pageId) {
    if (settings.resetCounter && state.currentPage !== pageId) resetAdhkarCounters();
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`page-${pageId}`);
    if (target) target.classList.add('active');
    
    state.currentPage = pageId;
    
    document.querySelectorAll('.nav-group a').forEach(a => a.classList.toggle('active', a.dataset.target === pageId));
    document.querySelectorAll('#bottom-nav button[data-target]').forEach(b => b.classList.toggle('active', b.dataset.target === pageId));
    
    closeSidebar();
    const mainContent = document.getElementById('main-content');
    if(mainContent) mainContent.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupNavigation() {
    document.querySelectorAll('[data-target]').forEach(btn => {
        btn.addEventListener('click', (e) => { e.preventDefault(); navigateTo(btn.dataset.target); });
    });
    
    const menuBtn = document.getElementById('menu-btn');
    if(menuBtn) menuBtn.onclick = openSidebar;
    
    const moreBtn = document.getElementById('more-btn');
    if(moreBtn) moreBtn.onclick = openSidebar;
    
    const overlay = document.getElementById('sidebar-overlay');
    if(overlay) overlay.onclick = closeSidebar;
    
    const backToQuran = document.getElementById('back-to-quran');
    if(backToQuran) backToQuran.onclick = () => navigateTo('quran');
}

function openSidebar() { 
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if(sidebar) sidebar.classList.add('open'); 
    if(overlay) overlay.classList.add('show'); 
    state.isSidebarOpen = true; 
}

function closeSidebar() { 
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if(sidebar) sidebar.classList.remove('open'); 
    if(overlay) overlay.classList.remove('show'); 
    state.isSidebarOpen = false; 
}

// --- محرك اللمس (Swipe Engine) المصحح 100% ليتبع الإصبع ---
function setupSwipeGestures() {
    let startX = 0, startY = 0;
    const main = document.getElementById('main-content');
    const pages = ['home', 'quran', 'morning', 'evening', 'tasbih', 'duas'];
    
    main.addEventListener('touchstart', e => { 
        startX = e.touches[0].clientX; 
        startY = e.touches[0].clientY; 
    }, { passive: true });
    
    main.addEventListener('touchend', e => {
        let endX = e.changedTouches[0].clientX;
        let endY = e.changedTouches[0].clientY;
        
        let diffX = endX - startX; // موجب = سحب لليمين، سالب = سحب لليسار
        let diffY = endY - startY;
        
        // لو السحب أفقي (تجاهل التمرير الرأسي)
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 60) {
            
            // 1. فتح القائمة الجانبية (سحب من الحافة اليمنى)
            if (startX > window.innerWidth - 50 && diffX < 0) { // سحب لليسار من اليمين
                openSidebar(); 
                return; 
            }
            
            // 2. إغلاق القائمة الجانبية لو مفتوحة (سحب لليمين)
            if (state.isSidebarOpen) {
                if (diffX > 60) closeSidebar();
                return;
            }
            
            // 3. التنقل بين الصفحات بناءً على اتجاه الإصبع
            if (!state.isSidebarOpen && state.currentPage !== 'quran-reader') {
                let idx = pages.indexOf(state.currentPage);
                if (idx === -1) return; 
                
                // إنت بتسحب صباعك ناحية الشمال (diffX < 0) => الصفحة تتقلب ناحية الشمال (Next)
                if (diffX < 0) {
                    navigateTo(pages[(idx + 1) % pages.length]);
                } 
                // إنت بتسحب صباعك ناحية اليمين (diffX > 0) => الصفحة تتقلب ناحية اليمين (Prev)
                else if (diffX > 0) {
                    navigateTo(pages[(idx - 1 + pages.length) % pages.length]);
                }
            }
        }
    }, { passive: true });
}

// --- عرض الأذكار ---
function renderAllAdhkar() {
    ['morning', 'evening', 'sleep', 'wake', 'duas'].forEach(cat => {
        const c = document.getElementById(`list-${cat}`);
        if(c) c.innerHTML = ADHKAR_DATA.filter(d => d.category === cat).map(generateCardHTML).join('');
    });
}

function generateCardHTML(item) {
    let header = item.type === 'surah' ? `<p class="basmala">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>` : (item.type === 'ayah' ? `<p class="istiadha">أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ</p>` : '');
    let body = (item.type === 'surah' || item.type === 'ayah') ? 'adhkar-text' : 'adhkar-text'; // استخدمنا نفس الكلاس لتوحيد الشكل
    let btn = item.category !== 'duas' ? `<button class="btn-dhikr" onclick="incrementDhikr(this, '${item.id}', ${item.count})">التكرار (0/${item.count})</button>` : '';
    
    return `<div class="adhkar-card" id="card-${item.id}">
                <div class="card-header">${header}</div>
                <div class="${body}">${item.text}</div>
                <div class="dua-ref">${item.source || ''}</div>
                ${btn}
            </div>`;
}

window.incrementDhikr = (btn, id, max) => {
    let cur = parseInt(localStorage.getItem(`count_${id}`) || 0);
    if (cur < max) {
        cur++; 
        localStorage.setItem(`count_${id}`, cur);
        if (navigator.vibrate) navigator.vibrate(15);
        btn.textContent = `التكرار (${cur}/${max})`;
        if (cur === max) { 
            btn.classList.add('done'); 
            btn.innerHTML = '✓ تم'; 
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]); 
        }
    }
};

function resetAdhkarCounters() {
    ADHKAR_DATA.forEach(i => {
        localStorage.setItem(`count_${i.id}`, 0);
        const b = document.querySelector(`#card-${i.id} .btn-dhikr`);
        if(b) { b.classList.remove('done'); b.textContent = `التكرار (0/${i.count})`; }
    });
}

// --- البحث ---
function setupSearch() {
    const form = document.getElementById('search-form');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); executeSearch(); });
}

function normalize(text) { 
    return text ? text.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[\u064B-\u065F]/g, '').trim() : ''; 
}

function executeSearch() {
    const q = document.getElementById('search-input').value.trim();
    if (!q) return;
    const nq = normalize(q);
    const results = ADHKAR_DATA.filter(i => normalize(i.text).includes(nq));
    const searchContainer = document.getElementById('list-search');
    if(searchContainer) {
        searchContainer.innerHTML = results.length ? results.map(generateCardHTML).join('') : `<div class="loading-text">لا توجد نتائج مطابقة</div>`;
    }
    navigateTo('search');
}

// --- محرك القرآن (المصحف العثماني) ---
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
    } catch (e) { container.innerHTML = '<p class="loading-text">تأكد من اتصالك بالإنترنت لتحميل الفهرس.</p>'; }
}

async function openSurah(number, name) {
    navigateTo('quran-reader');
    const title = document.getElementById('reader-title');
    if(title) title.textContent = name;
    
    const container = document.getElementById('list-quran-verses');
    if(!container) return;
    container.innerHTML = '<p class="loading-text" style="color:var(--gold);"><i class="fa-solid fa-spinner fa-spin"></i> جاري تحميل الآيات...</p>';
    
    try {
        // جلب النص العثماني
        const res = await fetch(`https://api.alquran.cloud/v1/surah/${number}/quran-uthmani`);
        const data = await res.json();
        if (data.code === 200) {
            const ayahs = data.data.ayahs;
            let versesHTML = '';
            
            // البسملة في بداية السورة (إلا التوبة والفاتحة)
            if (number !== 1 && number !== 9) {
                versesHTML += `<div style="text-align:center; margin-bottom: 20px;"><span style="font-family:'Amiri Quran', serif; font-size:calc(var(--base-font-size) + 4px); color:var(--gold);">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</span></div>`;
            }

            versesHTML += ayahs.map(a => `
                <span>${a.text}</span> <span class="verse-number">${a.numberInSurah}</span> 
            `).join('');
            
            container.innerHTML = versesHTML;
            const mainContent = document.getElementById('main-content');
            if(mainContent) mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (e) {
        container.innerHTML = '<p class="loading-text">تعذر تحميل الآيات. تأكد من اتصالك بالإنترنت.</p>';
    }
}

// --- السبحة والقبلة ---
function setupTasbih() {
    const select = document.getElementById('tasbih-select');
    const target = document.getElementById('tasbih-target');
    const circle = document.getElementById('tasbih-btn');
    if (!select) return;
    
    select.innerHTML = TASBIH_ITEMS.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');
    
    const reset = () => { state.tasbihCount = 0; const c = document.getElementById('tasbih-count'); if(c) c.textContent = 0; };
    
    select.onchange = () => { 
        const txt = document.getElementById('tasbih-text');
        if(txt) txt.textContent = TASBIH_ITEMS[select.value].name; 
        reset(); 
    };
    
    if(target) {
        target.onchange = () => { 
            state.tasbihTarget = target.value === 'custom' ? parseInt(prompt('أدخل العدد:', '50') || 33) : parseInt(target.value); 
            const max = document.getElementById('tasbih-max');
            if(max) max.textContent = '/' + state.tasbihTarget; 
            reset(); 
        };
    }
    
    if(circle) {
        circle.onclick = () => { 
            if(state.tasbihCount < state.tasbihTarget) { 
                state.tasbihCount++; 
                const c = document.getElementById('tasbih-count');
                if(c) c.textContent = state.tasbihCount; 
                if(navigator.vibrate) navigator.vibrate(15); 
            } 
        };
    }
    
    const resetBtn = document.getElementById('reset-tasbih');
    if(resetBtn) resetBtn.onclick = reset;
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
                
                const angleTxt = document.getElementById('qibla-angle-text');
                if(angleTxt) angleTxt.textContent = `القبلة: ${Math.round(state.qiblaBearing)}°`;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> البوصلة تعمل';
                
                window.addEventListener('deviceorientationabsolute', (e) => {
                    let h = e.webkitCompassHeading || (360 - e.alpha);
                    if(h) {
                        const arrow = document.getElementById('qibla-arrow');
                        if(arrow) arrow.style.transform = `rotate(${state.qiblaBearing - h}deg)`;
                    }
                });
            }, () => { alert('الرجاء السماح بالموقع'); btn.innerHTML = 'إعادة المحاولة'; });
        }
    };
}

// --- أدوات مساعدة ---
function updateHijriDate() { 
    const d = document.getElementById('hijri-date'); 
    if(d) d.textContent = new Intl.DateTimeFormat('ar-SA-u-ca-islamic').format(new Date()); 
}

function setupScrollTop() { 
    const mc = document.getElementById('main-content'), b = document.getElementById('scroll-top-btn'); 
    if(mc && b) {
        mc.addEventListener('scroll', () => { 
            mc.scrollTop > 300 ? b.classList.remove('hidden') : b.classList.add('hidden'); 
        }); 
        b.onclick = () => mc.scrollTo({top:0, behavior:'smooth'}); 
    }
}