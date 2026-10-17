document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => document.getElementById('splash').classList.add('hide'), 1500);
    init();
});

// الأقسام بالترتيب عشان السحب
const pageOrder = ['home', 'morning', 'evening', 'tasbih', 'qibla', 'duas', 'names', 'settings'];
let currentIndex = 0;
const wrapper = document.getElementById('pages-wrapper');

function init() {
    loadTheme();
    renderData();
    setupTasbih();
    setupSwipeAndNav();
}

// --- التنقل والسحب (Swipe Engine) ---
function goToPage(index) {
    if(index < 0 || index >= pageOrder.length) return;
    currentIndex = index;
    wrapper.style.transform = `translateX(${currentIndex * 20}%)`; // 20% لأن العرض 500%
    
    const targetPage = pageOrder[index];
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.toggle('active', a.dataset.page === targetPage));
    document.querySelectorAll('#bottom-nav button').forEach(b => b.classList.toggle('active', b.dataset.page === targetPage));
    
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
}

function setupSwipeAndNav() {
    // أزرار التنقل
    document.querySelectorAll('[data-page], [data-go]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const page = btn.dataset.page || btn.dataset.go;
            const idx = pageOrder.indexOf(page);
            if(idx !== -1) goToPage(idx);
        });
    });

    // فتح القائمة
    document.getElementById('menu-btn').onclick = () => { document.getElementById('sidebar').classList.add('open'); document.getElementById('overlay').classList.add('show'); };
    document.getElementById('more-btn').onclick = () => { document.getElementById('sidebar').classList.add('open'); document.getElementById('overlay').classList.add('show'); };
    document.getElementById('overlay').onclick = () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('show'); };

    // محرك السحب
    let startX = 0, startY = 0;
    wrapper.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
    }, {passive: true});

    wrapper.addEventListener('touchend', e => {
        let diffX = e.changedTouches[0].clientX - startX;
        let diffY = e.changedTouches[0].clientY - startY;

        // التأكد إن الحركة أفقية مش رأسية (عشان الصفحة متتحركش بالغلط)
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
            if (diffX > 0 && currentIndex > 0) goToPage(currentIndex - 1); // سحب لليمين
            else if (diffX < 0 && currentIndex < pageOrder.length - 1) goToPage(currentIndex + 1); // سحب للشمال
        }
    }, {passive: true});
}

// --- السبحة الاحترافية ---
let currentTasbihCount = 0;
let maxTasbih = 33;

function setupTasbih() {
    const select = document.getElementById('tasbih-select');
    const targetSelect = document.getElementById('tasbih-target');
    
    // تعبئة الأذكار
    select.innerHTML = TASBIH_ITEMS.map((t, i) => `<option value="${i}">${t.name}</option>`).join('');
    
    select.addEventListener('change', () => {
        document.getElementById('tasbih-text').textContent = TASBIH_ITEMS[select.value].name;
        document.getElementById('tasbih-max').textContent = '/' + TASBIH_ITEMS[select.value].target;
        maxTasbih = TASBIH_ITEMS[select.value].target;
        currentTasbihCount = 0;
        updateCounter();
    });

    targetSelect.addEventListener('change', () => {
        if(targetSelect.value === 'custom') {
            let custom = prompt('أدخل العدد الذي تريده:', '50');
            if(custom && !isNaN(custom)) { maxTasbih = parseInt(custom); }
            else { targetSelect.value = '33'; maxTasbih = 33; }
        } else {
            maxTasbih = parseInt(targetSelect.value);
        }
        document.getElementById('tasbih-max').textContent = '/' + maxTasbih;
        currentTasbihCount = 0;
        updateCounter();
    });

    document.getElementById('tasbih-btn').addEventListener('click', () => {
        currentTasbihCount++;
        if(navigator.vibrate) navigator.vibrate(30);
        if(currentTasbihCount >= maxTasbih) {
            if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
            currentTasbihCount = 0;
            setTimeout(() => alert('أكملت العدد المطلوب! تقبل الله.'), 100);
        }
        updateCounter();
    });

    document.getElementById('reset-tasbih').addEventListener('click', () => {
        currentTasbihCount = 0; updateCounter();
    });
}

function updateCounter() {
    document.getElementById('tasbih-count').textContent = currentTasbihCount;
}

// --- البوصلة (البوصلة الحقيقية) ---
document.getElementById('btn-qibla').addEventListener('click', () => {
    const btn = document.getElementById('btn-qibla');
    btn.textContent = 'جاري التحديد...';
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const kaabaLat = 21.4225;
            const kaabaLng = 39.8262;
            
            // حساب الزاوية
            const dLon = (kaabaLng - lng) * Math.PI / 180;
            const lat1 = lat * Math.PI / 180;
            const lat2 = kaabaLat * Math.PI / 180;
            const y = Math.sin(dLon) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
            let brng = Math.atan2(y, x) * 180 / Math.PI;
            brng = (brng + 360) % 360;
            
            document.getElementById('qibla-angle-text').textContent = `القبلة: ${Math.round(brng)}°`;
            document.getElementById('qibla-arrow').style.transform = `rotate(${brng}deg)`;
            btn.textContent = 'تحديث القبلة';
            
            // تفعيل حساس الحركة (لو المتصفح بيدعم)
            if (window.DeviceOrientationEvent) {
                window.addEventListener('deviceorientationabsolute', (e) => {
                    if(e.alpha !== null) {
                        // معادلة دمج حركة الهاتف مع اتجاه القبلة
                        document.getElementById('qibla-arrow').style.transform = `rotate(${brng - e.alpha}deg)`;
                    }
                });
            }
        }, () => {
            alert('يجب السماح بالوصول للموقع لتحديد القبلة');
            btn.textContent = 'تحديد اتجاه القبلة';
        });
    }
});

// --- باقي الدوال (الثيم، البيانات، التاريخ) ---
function loadTheme() {
    const isDark = localStorage.getItem('dark') === 'true';
    if(isDark) document.body.classList.add('dark');
    document.getElementById('theme-btn').onclick = () => {
        document.body.classList.toggle('dark');
        localStorage.setItem('dark', document.body.classList.contains('dark'));
    };
    document.getElementById('set-dark').checked = isDark;
    document.getElementById('set-dark').onchange = () => {
        document.body.classList.toggle('dark');
        localStorage.setItem('dark', document.body.classList.contains('dark'));
    };
}

function renderData() {
    // التاريخ
    document.getElementById('hijri-date').textContent = new Intl.DateTimeFormat('ar-SA-u-ca-islamic').format(new Date());
    
    // الأذكار
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

    // الأدعية
    document.getElementById('list-duas').innerHTML = DUAS.map(d => `
        <div class="adhkar-card"><div style="color:var(--gold);font-weight:bold;margin-bottom:5px">${d.title}</div><div class="adhkar-text">${d.text}</div></div>
    `).join('');

    // الأسماء
    document.getElementById('list-names').innerHTML = ALLAH_NAMES.slice(0, 40).map(n => `
        <div class="adhkar-card" style="text-align:center"><div style="font-family:'Amiri';font-size:1.5rem;color:var(--primary)">${n.ar}</div></div>
    `).join('');
}

window.countDhikr = (btn, max, key) => {
    let cur = parseInt(localStorage.getItem(key) || 0);
    if(cur < max) {
        cur++;
        localStorage.setItem(key, cur);
        if(navigator.vibrate) navigator.vibrate(20);
        btn.textContent = `التكرار (${cur}/${max})`;
        if(cur === max) { btn.classList.add('done'); btn.textContent = '✓ تم'; }
    }
};