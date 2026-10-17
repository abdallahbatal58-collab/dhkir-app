document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => document.getElementById('splash').classList.add('hide'), 1500);
    init();
});

function init() {
    loadTheme();
    renderData();
    setupNavigation();
    setupSwipeMenu(); // سحب القائمة الجانبية فقط
    setupTasbih();
    setupQibla();
}

// --- التنقل السليم (Hide/Show) ---
function navigateTo(targetId) {
    // إخفاء كل الصفحات
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // إظهار الصفحة المطلوبة
    const targetPage = document.getElementById(`page-${targetId}`);
    if(targetPage) targetPage.classList.add('active');

    // تحديث الأزرار النشطة
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.toggle('active', a.dataset.target === targetId));
    document.querySelectorAll('#bottom-nav button[data-target]').forEach(b => b.classList.toggle('active', b.dataset.target === targetId));

    // غلق القائمة
    closeMenu();
    
    // الرجوع لأعلى الصفحة
    document.getElementById('main-content').scrollTo({ top: 0, behavior: 'smooth' });
}

function setupNavigation() {
    document.querySelectorAll('[data-target]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(btn.dataset.target);
        });
    });

    document.getElementById('menu-btn').onclick = openMenu;
    document.getElementById('more-btn').onclick = openMenu;
    document.getElementById('sidebar-overlay').onclick = closeMenu;
}

function openMenu() {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').classList.add('show');
}
function closeMenu() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('show');
}

// --- السحب الذكي لفتح القائمة (Edge Swipe) ---
function setupSwipeMenu() {
    let startX = 0;
    document.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
    }, {passive: true});

    document.addEventListener('touchend', e => {
        let endX = e.changedTouches[0].clientX;
        // لو السحب بدأ من يمين الشاشة (أول 50 بكسل) وسحب لليسار
        if (startX > window.innerWidth - 50 && (startX - endX) > 60) {
            openMenu();
        }
        // لو القائمة مفتوحة وسحبنا لليمين نقفلها
        if (startX < 250 && (endX - startX) > 60 && document.getElementById('sidebar').classList.contains('open')) {
            closeMenu();
        }
    }, {passive: true});
}

// --- باقي الوظائف ---
function setupTasbih() {
    let count = 0, max = 33;
    const select = document.getElementById('tasbih-select');
    const target = document.getElementById('tasbih-target');
    
    select.innerHTML = TASBIH_ITEMS.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');
    
    select.onchange = () => {
        document.getElementById('tasbih-text').textContent = TASBIH_ITEMS[select.value].name;
        count = 0; updateCounter();
    };

    target.onchange = () => {
        if(target.value === 'custom') {
            let val = prompt('أدخل العدد:', '50');
            max = (val && !isNaN(val)) ? parseInt(val) : 33;
        } else { max = parseInt(target.value); }
        document.getElementById('tasbih-max').textContent = '/' + max;
        count = 0; updateCounter();
    };

    document.getElementById('tasbih-btn').onclick = () => {
        count++;
        if(navigator.vibrate) navigator.vibrate(20);
        if(count >= max) {
            if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
            count = 0; alert('تم إكمال العدد!');
        }
        updateCounter();
    };
    document.getElementById('reset-tasbih').onclick = () => { count = 0; updateCounter(); };

    function updateCounter() { document.getElementById('tasbih-count').textContent = count; }
}

function setupQibla() {
    document.getElementById('btn-qibla').onclick = () => {
        const btn = document.getElementById('btn-qibla');
        btn.textContent = 'جاري التحديد...';
        navigator.geolocation.getCurrentPosition(pos => {
            const lat = pos.coords.latitude, lng = pos.coords.longitude;
            const kaabaLat = 21.4225, kaabaLng = 39.8262;
            const dLon = (kaabaLng - lng) * Math.PI / 180;
            const y = Math.sin(dLon) * Math.cos(kaabaLat * Math.PI / 180);
            const x = Math.cos(lat * Math.PI / 180) * Math.sin(kaabaLat * Math.PI / 180) - Math.sin(lat * Math.PI / 180) * Math.cos(kaabaLat * Math.PI / 180) * Math.cos(dLon);
            let brng = Math.atan2(y, x) * 180 / Math.PI;
            brng = (brng + 360) % 360;
            
            document.getElementById('qibla-angle-text').textContent = `القبلة: ${Math.round(brng)}°`;
            document.getElementById('qibla-arrow').style.transform = `rotate(${brng}deg)`;
            btn.textContent = 'تحديث القبلة';
        }, () => { alert('الرجاء السماح بالوصول للموقع'); btn.textContent = 'تحديد'; });
    };
}

function loadTheme() {
    const isDark = localStorage.getItem('dark') === 'true';
    if(isDark) document.body.classList.add('dark');
    const toggle = () => {
        document.body.classList.toggle('dark');
        localStorage.setItem('dark', document.body.classList.contains('dark'));
    };
    document.getElementById('theme-btn').onclick = toggle;
    document.getElementById('set-dark').onchange = toggle;
    document.getElementById('set-dark').checked = isDark;
}

function renderData() {
    document.getElementById('hijri-date').textContent = new Intl.DateTimeFormat('ar-SA-u-ca-islamic').format(new Date());
    const buildList = (data, id, prefix) => {
        document.getElementById(id).innerHTML = data.map((d, i) => `
            <div class="adhkar-card">
                <div class="adhkar-text">${d.text}</div>
                <button class="btn-dhikr" onclick="countDhikr(this, ${d.count}, '${prefix}_${i}')">التكرار (0/${d.count})</button>
            </div>
        `).join('');
    };
    buildList(MORNING_ADHKAR, 'list-morning', 'm');
    buildList(EVENING_ADHKAR, 'list-evening', 'e');
    document.getElementById('list-duas').innerHTML = DUAS.map(d => `<div class="adhkar-card"><div style="color:var(--gold);font-weight:bold;margin-bottom:5px">${d.title}</div><div class="adhkar-text">${d.text}</div></div>`).join('');
    document.getElementById('list-names').innerHTML = ALLAH_NAMES.map(n => `<div class="adhkar-card"><div style="font-family:'Amiri';font-size:1.3rem;color:var(--primary)">${n.ar}</div><div style="font-size:0.8rem;color:var(--muted)">${n.meaning}</div></div>`).join('');
}
window.countDhikr = (btn, max, key) => {
    let cur = parseInt(localStorage.getItem(key) || 0);
    if(cur < max) {
        cur++; localStorage.setItem(key, cur); if(navigator.vibrate) navigator.vibrate(20);
        btn.textContent = `التكرار (${cur}/${max})`;
        if(cur === max) { btn.classList.add('done'); btn.textContent = '✓ تم'; }
    }
};