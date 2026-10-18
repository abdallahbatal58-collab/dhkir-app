/* ============================================
   ذِكْر | V16 Core Engine (Full)
   ============================================ */

const state = {
    currentPage: 'home',
    isSidebarOpen: false,
    searchQuery: '',
    tasbihCount: 0,
    tasbihTarget: 33,
    qiblaBearing: 0,
    currentRotation: 0
};

const settings = {
    darkMode: localStorage.getItem('dhikr_dark') === 'true',
    fontScale: localStorage.getItem('dhikr_font') || '1',
    cardStyle: localStorage.getItem('dhikr_card') || 'classic',
    resetCounter: localStorage.getItem('dhikr_reset') !== 'false',
    autoNext: localStorage.getItem('dhikr_autonext') === 'true'
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.getElementById('splash').classList.add('hide');
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
    setupSwipeGestures(); // السحب الدائري الجديد
    setupScrollTop();
    updateHijriDate();
}

// --- الإعدادات ---
function applySettings() {
    if (settings.darkMode) {
        document.body.classList.add('dark');
        document.getElementById('theme-btn').innerHTML = '<i class="fa-solid fa-sun"></i>';
        if(document.getElementById('set-dark')) document.getElementById('set-dark').checked = true;
    } else {
        document.body.classList.remove('dark');
        document.getElementById('theme-btn').innerHTML = '<i class="fa-solid fa-moon"></i>';
    }

    document.documentElement.style.setProperty('--font-scale', settings.fontScale);
    if(document.getElementById('set-font')) document.getElementById('set-font').value = settings.fontScale;

    document.body.classList.remove('style-classic', 'style-glass', 'style-minimal');
    document.body.classList.add(`style-${settings.cardStyle}`);
    if(document.getElementById('set-card-style')) document.getElementById('set-card-style').value = settings.cardStyle;

    if(document.getElementById('set-reset-counter')) document.getElementById('set-reset-counter').checked = settings.resetCounter;
    if(document.getElementById('set-auto-next')) document.getElementById('set-auto-next').checked = settings.autoNext;
}

function setupSettingsUI() {
    document.getElementById('theme-btn').onclick = () => {
        settings.darkMode = !settings.darkMode;
        localStorage.setItem('dhikr_dark', settings.darkMode);
        applySettings();
    };

    const setDark = document.getElementById('set-dark');
    if(setDark) setDark.onchange = (e) => {
        settings.darkMode = e.target.checked;
        localStorage.setItem('dhikr_dark', settings.darkMode);
        applySettings();
    };

    const setFont = document.getElementById('set-font');
    if(setFont) setFont.oninput = (e) => {
        settings.fontScale = e.target.value;
        localStorage.setItem('dhikr_font', settings.fontScale);
        document.documentElement.style.setProperty('--font-scale', settings.fontScale);
    };

    const setCard = document.getElementById('set-card-style');
    if(setCard) setCard.onchange = (e) => {
        settings.cardStyle = e.target.value;
        localStorage.setItem('dhikr_card', settings.cardStyle);
        applySettings();
    };

    const setReset = document.getElementById('set-reset-counter');
    if(setReset) setReset.onchange = (e) => {
        settings.resetCounter = e.target.checked;
        localStorage.setItem('dhikr_reset', settings.resetCounter);
    };

    const setNext = document.getElementById('set-auto-next');
    if(setAutoNext) setNext.onchange = (e) => {
        settings.autoNext = e.target.checked;
        localStorage.setItem('dhikr_autonext', settings.autoNext);
    };
}

// --- التنقل ---
function navigateTo(pageId) {
    if (settings.resetCounter && state.currentPage !== pageId) {
        resetAdhkarCounters();
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) targetPage.classList.add('active');
    state.currentPage = pageId;

    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.toggle('active', a.dataset.target === pageId));
    document.querySelectorAll('#bottom-nav button[data-target]').forEach(b => b.classList.toggle('active', b.dataset.target === pageId));

    closeSidebar();
    document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

function setupNavigation() {
    document.querySelectorAll('[data-target]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(btn.dataset.target);
        });
    });

    document.getElementById('menu-btn').onclick = openSidebar;
    document.getElementById('more-btn').onclick = openSidebar;
    document.getElementById('sidebar-overlay').onclick = closeSidebar;
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

// --- السحب باللمس (Infinite Loop) ---
function setupSwipeGestures() {
    let startX = 0, startY = 0;
    const mainContent = document.getElementById('main-content');
    const pagesOrder = ['home', 'quran', 'morning', 'evening', 'tasbih', 'duas']; 

    mainContent.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, { passive: true });

    mainContent.addEventListener('touchend', e => {
        let endX = e.changedTouches[0].clientX;
        let endY = e.changedTouches[0].clientY;
        let diffX = startX - endX;
        let diffY = startY - endY;

        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 70) {
            if (startX > window.innerWidth - 50 && diffX < -70) {
                openSidebar();
                return;
            }

            if (!state.isSidebarOpen) {
                let currentIndex = pagesOrder.indexOf(state.currentPage);
                if (currentIndex === -1) return;

                if (diffX > 70) {
                    currentIndex = (currentIndex + 1) % pagesOrder.length;
                    navigateTo(pagesOrder[currentIndex]);
                } else if (diffX < -70) {
                    currentIndex = (currentIndex - 1 + pagesOrder.length) % pagesOrder.length;
                    navigateTo(pagesOrder[currentIndex]);
                }
            }
        }
    }, { passive: true });
}

// --- عرض الأذكار ---
function renderAllAdhkar() {
    const categories = ['morning', 'evening', 'sleep', 'wake', 'duas'];
    categories.forEach(cat => {
        const container = document.getElementById(`list-${cat}`);
        if (!container) return;
        const items = ADHKAR_DATA.filter(d => d.category === cat);
        container.innerHTML = items.map(item => generateCardHTML(item)).join('');
    });
}

function generateCardHTML(item) {
    let headerHTML = '';
    if (item.type === 'surah') headerHTML = `<p class="basmala">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>`;
    else if (item.type === 'ayah') headerHTML = `<p class="istiadha">أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ</p>`;

    let bodyClass = (item.type === 'surah' || item.type === 'ayah') ? 'quran-text' : 'adhkar-text';
    let counterBtn = '';
    if (item.category !== 'duas') {
        counterBtn = `<button class="btn-dhikr ripple" onclick="incrementDhikr(this, '${item.id}', ${item.count})">التكرار (0/${item.count})</button>`;
    }

    return `
        <div class="adhkar-card" id="card-${item.id}">
            <div class="card-header">${headerHTML}</div>
            <div class="${bodyClass}">${item.text}</div>
            <div class="dua-ref">${item.source || ''}</div>
            ${counterBtn}
        </div>
    `;
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
            btn.innerHTML = '<i class="fa-solid fa-check"></i> تم بحمد الله'; 
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }
    }
};

function resetAdhkarCounters() {
    ADHKAR_DATA.forEach(item => {
        localStorage.setItem(`count_${item.id}`, 0);
        const btn = document.querySelector(`#card-${item.id} .btn-dhikr`);
        if (btn) {
            btn.classList.remove('done');
            btn.textContent = `التكرار (0/${item.count})`;
        }
    });
}

// --- البحث ---
function setupSearch() {
    const form = document.getElementById('search-form');
    if (!form) return;
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        executeSearch();
    });
}

function normalizeArabic(text) {
    if (!text) return '';
    return text.replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[\u064B-\u065F]/g, '').trim().toLowerCase();
}

function executeSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (query.length === 0) return;
    const normalizedQuery = normalizeArabic(query);
    
    const results = ADHKAR_DATA.filter(item => {
        const matchText = normalizeArabic(item.text).includes(normalizedQuery);
        const matchTitle = item.title ? normalizeArabic(item.title).includes(normalizedQuery) : false;
        return matchText || matchTitle;
    });

    const container = document.getElementById('list-search');
    if (results.length > 0) {
        container.innerHTML = results.map(item => generateCardHTML(item)).join('');
    } else {
        container.innerHTML = `<div style="text-align:center; padding: 50px 20px; color: var(--text-muted);"><p>لا توجد نتائج لبحثك عن "${query}"</p></div>`;
    }
    navigateTo('search');
}

// --- السبحة ---
function setupTasbih() {
    const select = document.getElementById('tasbih-select');
    const targetSelect = document.getElementById('tasbih-target');
    const circle = document.getElementById('tasbih-btn');
    if (!select) return;

    select.innerHTML = TASBIH_ITEMS.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');
    
    function resetTasbih() {
        state.tasbihCount = 0; 
        circle.classList.remove('completed');
        document.getElementById('tasbih-count').textContent = 0;
    }

    select.onchange = () => { 
        document.getElementById('tasbih-text').textContent = TASBIH_ITEMS[select.value].name; 
        resetTasbih();
    };

    targetSelect.onchange = () => {
        if(targetSelect.value === 'custom') { 
            let val = prompt('أدخل العدد:', '50'); 
            state.tasbihTarget = (val && !isNaN(val)) ? parseInt(val) : 33; 
        } else { state.tasbihTarget = parseInt(targetSelect.value); }
        document.getElementById('tasbih-max').textContent = '/' + state.tasbihTarget; 
        resetTasbih();
    };

    circle.onclick = () => {
        if(state.tasbihCount < state.tasbihTarget) {
            state.tasbihCount++; 
            if(navigator.vibrate) navigator.vibrate(15);
            if(state.tasbihCount === state.tasbihTarget) { 
                if(navigator.vibrate) navigator.vibrate([100, 50, 100]); 
                circle.classList.add('completed');
            }
            document.getElementById('tasbih-count').textContent = state.tasbihCount;
        }
    };
    document.getElementById('reset-tasbih').onclick = resetTasbih;
}

// --- القبلة ---
function setupQibla() {
    const btn = document.getElementById('btn-qibla'), arrow = document.getElementById('qibla-arrow'), angleText = document.getElementById('qibla-angle-text');
    if (!btn) return;

    btn.onclick = async () => {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري التحديد...';
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            try { await DeviceOrientationEvent.requestPermission(); } catch (error) {}
        }
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const lat = pos.coords.latitude, lng = pos.coords.longitude, kaabaLat = 21.4225, kaabaLng = 39.8262;
                const dLon = (kaabaLng - lng) * Math.PI / 180;
                const y = Math.sin(dLon) * Math.cos(kaabaLat * Math.PI / 180);
                const x = Math.cos(lat * Math.PI / 180) * Math.sin(kaabaLat * Math.PI / 180) - Math.sin(lat * Math.PI / 180) * Math.cos(kaabaLat * Math.PI / 180) * Math.cos(dLon);
                state.qiblaBearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
                angleText.textContent = `اتجاه القبلة: ${Math.round(state.qiblaBearing)}°`;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> البوصلة تعمل';
                startCompass();
            }, () => { alert('الرجاء السماح بالموقع.'); btn.innerHTML = 'إعادة المحاولة'; }, { enableHighAccuracy: true });
        }
    };

    function startCompass() {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
        window.addEventListener('deviceorientation', handleOrientation, true);
        function handleOrientation(event) {
            let compassHeading = event.webkitCompassHeading ? event.webkitCompassHeading : (event.alpha !== null ? 360 - event.alpha : null);
            if (compassHeading !== null) {
                let targetRotation = state.qiblaBearing - compassHeading;
                let diff = targetRotation - state.currentRotation;
                while (diff > 180) diff -= 360;
                while (diff < -180) diff += 360;
                state.currentRotation += diff * 0.15; 
                arrow.style.transform = `rotate(${state.currentRotation}deg)`;
            }
        }
    }
}

// --- أدوات مساعدة ---
function updateHijriDate() {
    const dateEl = document.getElementById('hijri-date');
    if (dateEl) dateEl.textContent = new Intl.DateTimeFormat('ar-SA-u-ca-islamic').format(new Date());
}

function setupScrollTop() {
    const mainContent = document.getElementById('main-content');
    const scrollTopBtn = document.getElementById('scroll-top-btn');
    mainContent.addEventListener('scroll', () => {
        if (mainContent.scrollTop > 300) scrollTopBtn.classList.remove('hidden');
        else scrollTopBtn.classList.add('hidden');
    });
    scrollTopBtn.addEventListener('click', () => mainContent.scrollTo({ top: 0, behavior: 'smooth' }));
}