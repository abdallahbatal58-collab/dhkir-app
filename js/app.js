document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => document.getElementById('splash').classList.add('hide'), 1500);
    init();
});

function init() {
    loadTheme();
    renderData();
    setupNavigation();
    setupSwipeMenu();
    setupTasbih();
    setupQibla();
}

function navigateTo(targetId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(`page-${targetId}`);
    if(targetPage) targetPage.classList.add('active');

    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.toggle('active', a.dataset.target === targetId));
    document.querySelectorAll('#bottom-nav button[data-target]').forEach(b => b.classList.toggle('active', b.dataset.target === targetId));

    closeMenu();
    document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

function setupNavigation() {
    document.querySelectorAll('[data-target]').forEach(btn => {
        btn.addEventListener('click', (e) => { e.preventDefault(); navigateTo(btn.dataset.target); });
    });
    document.getElementById('menu-btn').onclick = openMenu;
    document.getElementById('more-btn').onclick = openMenu;
    document.getElementById('sidebar-overlay').onclick = closeMenu;
}

function openMenu() { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-overlay').classList.add('show'); }
function closeMenu() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').classList.remove('show'); }

function setupSwipeMenu() {
    let startX = 0;
    document.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, {passive: true});
    document.addEventListener('touchend', e => {
        let endX = e.changedTouches[0].clientX;
        if (startX > window.innerWidth - 60 && (startX - endX) > 60) openMenu();
        if (startX < 250 && (endX - startX) > 60 && document.getElementById('sidebar').classList.contains('open')) closeMenu();
    }, {passive: true});
}

function setupTasbih() {
    let count = 0, max = 33;
    const select = document.getElementById('tasbih-select');
    const target = document.getElementById('tasbih-target');
    select.innerHTML = TASBIH_ITEMS.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');
    
    select.onchange = () => { document.getElementById('tasbih-text').textContent = TASBIH_ITEMS[select.value].name; count = 0; updateCounter(); };
    target.onchange = () => {
        if(target.value === 'custom') { let val = prompt('أدخل العدد:', '50'); max = (val && !isNaN(val)) ? parseInt(val) : 33; } 
        else { max = parseInt(target.value); }
        document.getElementById('tasbih-max').textContent = '/' + max; count = 0; updateCounter();
    };
    document.getElementById('tasbih-btn').onclick = () => {
        count++; if(navigator.vibrate) navigator.vibrate(20);
        if(count >= max) { if(navigator.vibrate) navigator.vibrate([100, 50, 100]); count = 0; alert('تم إكمال العدد!'); }
        updateCounter();
    };
    document.getElementById('reset-tasbih').onclick = () => { count = 0; updateCounter(); };
    function updateCounter() { document.getElementById('tasbih-count').textContent = count; }
}

function setupQibla() {
    const btn = document.getElementById('btn-qibla'), arrow = document.getElementById('qibla-arrow'), angleText = document.getElementById('qibla-angle-text');
    let qiblaBearing = 0;
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
                qiblaBearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
                angleText.textContent = `اتجاه القبلة: ${Math.round(qiblaBearing)}°`;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> البوصلة تعمل';
                startCompass(qiblaBearing);
            }, () => { alert('الرجاء السماح بالوصول للموقع.'); btn.innerHTML = 'إعادة المحاولة'; }, { enableHighAccuracy: true });
        }
    };
    function startCompass(qiblaDeg) {
        window.addEventListener('deviceorientationabsolute', handleOrientation, true);
        window.addEventListener('deviceorientation', handleOrientation, true);
        function handleOrientation(event) {
            let compassHeading = event.webkitCompassHeading ? event.webkitCompassHeading : (event.alpha !== null ? 360 - event.alpha : null);
            if (compassHeading !== null) arrow.style.transform = `rotate(${qiblaDeg - compassHeading}deg)`;
        }
    }
}

function loadTheme() {
    const isDark = localStorage.getItem('dark') === 'true';
    if(isDark) document.body.classList.add('dark');
    const toggle = () => {
        document.body.classList.toggle('dark');
        const darkMode = document.body.classList.contains('dark');
        localStorage.setItem('dark', darkMode);
        document.getElementById('theme-btn').innerHTML = darkMode ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
    };
    document.getElementById('theme-btn').onclick = toggle;
    document.getElementById('set-dark').onchange = toggle;
    document.getElementById('set-dark').checked = isDark;
    if(isDark) document.getElementById('theme-btn').innerHTML = '<i class="fa-solid fa-sun"></i>';
}

// --- المحرك الذكي للعرض (UI Generator Engine) ---
function generateCardHTML(item, index, prefix) {
    let headerHTML = '';
    
    // هندسة البسملة والاستعاذة
    if (item.type === 'surah') {
        headerHTML = `<p class="basmala">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>`;
    } else if (item.type === 'ayah') {
        headerHTML = `<p class="istiadha">أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ</p>`;
    }

    let bodyClass = (item.type === 'surah' || item.type === 'ayah') ? 'quran-text' : 'adhkar-text';
    
    let content = `
        <div class="card-header">${headerHTML}</div>
        <div class="${bodyClass}">${item.text}</div>
    `;

    if (prefix !== 'dua') {
        content += `<button class="btn-dhikr ripple" onclick="countDhikr(this, ${item.count || 1}, '${prefix}_${index}')">التكرار (0/${item.count || 1})</button>`;
    }
    return content;
}

function renderData() {
    document.getElementById('hijri-date').textContent = new Intl.DateTimeFormat('ar-SA-u-ca-islamic').format(new Date());
    
    const buildList = (data, id, prefix) => {
        const container = document.getElementById(id);
        if (!container) return;
        container.innerHTML = data.map((d, i) => `
            <div class="adhkar-card">
                ${generateCardHTML(d, i, prefix)}
            </div>
        `).join('');
    };
    
    buildList(MORNING_ADHKAR, 'list-morning', 'm');
    buildList(EVENING_ADHKAR, 'list-evening', 'e');
    buildList(SLEEP_ADHKAR, 'list-sleep', 's');
    
    // الأدعية
    const duasContainer = document.getElementById('list-duas');
    if(duasContainer) {
        duasContainer.innerHTML = DUAS.map((d, i) => `
            <div class="adhkar-card">
                <div style="color:var(--gold);font-weight:bold;margin-bottom:8px;font-size:1.2rem;text-align:center;"><i class="fa-solid fa-star"></i> ${d.title}</div>
                ${generateCardHTML(d, i, 'dua')}
                <div class="dua-ref">${d.ref || ''}</div>
            </div>
        `).join('');
    }

    const namesGrid = document.getElementById('list-names');
    if(namesGrid) {
        namesGrid.innerHTML = ALLAH_NAMES.map(n => `
            <div class="adhkar-card name-card">
                <div class="name-ar">${n.ar}</div>
                <div class="name-meaning">${n.meaning}</div>
            </div>
        `).join('');
    }
}

window.countDhikr = (btn, max, key) => {
    let cur = parseInt(localStorage.getItem(key) || 0);
    if(cur < max) {
        cur++; localStorage.setItem(key, cur); if(navigator.vibrate) navigator.vibrate(20);
        btn.textContent = `التكرار (${cur}/${max})`;
        if(cur === max) { btn.classList.add('done'); btn.innerHTML = '<i class="fa-solid fa-check"></i> تم بحمد الله'; }
    }
};