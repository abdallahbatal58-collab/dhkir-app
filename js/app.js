// ============================================
// ذِكْر | V5 Core Logic & Touch Interaction
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. إخفاء شاشة البداية
    setTimeout(() => {
        document.getElementById('splash-screen').classList.add('hidden');
        initApp();
    }, 2000);
});

function initApp() {
    loadTheme();
    renderData();
    setupNavigation();
    setupSwipeGestures();
    updateHijriDate();
}

// --- التنقل (Navigation) ---
const pages = document.querySelectorAll('.page');
const navLinks = document.querySelectorAll('.sidebar-nav a, #bottom-nav button[data-target]');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('sidebar-overlay');

function navigateTo(targetId) {
    // إخفاء كل الصفحات وإظهار المطلوبة
    pages.forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(`page-${targetId}`);
    if(targetPage) targetPage.classList.add('active');

    // تحديث الروابط النشطة
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.toggle('active', a.dataset.target === targetId));
    document.querySelectorAll('#bottom-nav button[data-target]').forEach(b => b.classList.toggle('active', b.dataset.target === targetId));

    // غلق القائمة الجانبية إن كانت مفتوحة
    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupNavigation() {
    // أزرار القائمة الجانبية
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', (e) => { e.preventDefault(); navigateTo(link.dataset.target); });
    });

    // أزرار الشريط السفلي
    document.querySelectorAll('#bottom-nav button[data-target]').forEach(btn => {
        btn.addEventListener('click', () => navigateTo(btn.dataset.target));
    });

    // كروت الصفحة الرئيسية
    document.querySelectorAll('.quick-card').forEach(card => {
        card.addEventListener('click', () => navigateTo(card.dataset.target));
    });

    // القائمة الجانبية فتح/غلق
    document.getElementById('menu-btn').addEventListener('click', () => { sidebar.classList.add('open'); overlay.classList.add('show'); });
    document.getElementById('more-btn').addEventListener('click', () => { sidebar.classList.add('open'); overlay.classList.add('show'); });
    overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('show'); });
}

// --- السحب باللمس (Swipe) ---
function setupSwipeGestures() {
    let touchStartX = 0;
    let touchEndX = 0;
    const appContent = document.getElementById('app-content');

    appContent.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
    appContent.addEventListener('touchend', e => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, {passive: true});

    function handleSwipe() {
        const swipeThreshold = 100;
        // فتح القائمة عند السحب لليمين من حافة الشاشة
        if (touchEndX - touchStartX > swipeThreshold && touchStartX < 50) {
            sidebar.classList.add('open'); overlay.classList.add('show');
        }
        // غلق القائمة عند السحب لليسار
        if (touchStartX - touchEndX > swipeThreshold && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open'); overlay.classList.remove('show');
        }
    }
}

// --- الوضع الليلي (Dark Mode) ---
function loadTheme() {
    const isDark = localStorage.getItem('dhikr_theme') === 'dark';
    if (isDark) document.body.classList.add('dark');
    document.getElementById('set-dark').checked = isDark;
    document.getElementById('theme-toggle').textContent = isDark ? '☀️' : '🌙';

    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
    document.getElementById('set-dark').addEventListener('change', toggleTheme);
}

function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('dhikr_theme', isDark ? 'dark' : 'light');
    document.getElementById('set-dark').checked = isDark;
    document.getElementById('theme-toggle').textContent = isDark ? '☀️' : '🌙';
}

// --- التاريخ الهجري ---
function updateHijriDate() {
    const date = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    document.getElementById('hijri-date').textContent = date;
    
    const hour = new Date().getHours();
    let greet = "أهلاً بك";
    if (hour >= 4 && hour < 12) greet = "صباح الخير ☀️";
    else if (hour >= 12 && hour < 17) greet = "نهارك سعيد 🌤️";
    else greet = "مساء الخير 🌙";
    document.getElementById('greeting-text').textContent = greet;
}

// --- بيانات العرض (ملاحظة: تأكد أن ملف data.js به المتغيرات MORNING_ADHKAR, EVENING_ADHKAR, DUAS, ALLAH_NAMES) ---
function renderData() {
    // الأذكار
    const renderAdhkar = (data, containerId, prefix) => {
        const container = document.getElementById(containerId);
        if(!container) return;
        container.innerHTML = data.map((item, i) => `
            <div class="adhkar-card">
                <div class="adhkar-text">${item.text}</div>
                <button class="adhkar-btn" onclick="countDhikr(this, ${item.count}, '${prefix}_${i}')">التكرار: 0/${item.count}</button>
            </div>
        `).join('');
    };
    renderAdhkar(MORNING_ADHKAR, 'list-morning', 'm');
    renderAdhkar(EVENING_ADHKAR, 'list-evening', 'e');

    // الأدعية
    const duasContainer = document.getElementById('list-duas');
    if(duasContainer && typeof DUAS !== 'undefined') {
        duasContainer.innerHTML = DUAS.map(d => `
            <div class="adhkar-card">
                <div class="adhkar-text" style="font-family:'Tajawal'; font-weight:bold; font-size:1.1em; color:var(--gold);">${d.title}</div>
                <div class="adhkar-text" style="font-size:1.2em;">${d.text}</div>
            </div>
        `).join('');
    }
    
    // أسماء الله
    const namesGrid = document.getElementById('names-grid');
    if(namesGrid && typeof ALLAH_NAMES !== 'undefined') {
        namesGrid.style.display = 'grid';
        namesGrid.style.gridTemplateColumns = '1fr 1fr';
        namesGrid.style.gap = '10px';
        namesGrid.innerHTML = ALLAH_NAMES.slice(0, 30).map(n => `
            <div class="adhkar-card" style="text-align:center; padding:15px;">
                <div style="font-family:'Amiri'; font-size:1.4em; color:var(--primary); font-weight:bold;">${n.ar}</div>
                <div style="font-size:0.8em; color:var(--text-muted); margin-top:5px;">${n.meaning}</div>
            </div>
        `).join('');
    }
}

// --- الأذكار (عداد التكرار) ---
function countDhikr(btn, max, key) {
    let current = parseInt(localStorage.getItem(`dhikr_${key}`) || 0);
    if (current < max) {
        current++;
        localStorage.setItem(`dhikr_${key}`, current);
        if (navigator.vibrate) navigator.vibrate(30);
        
        btn.textContent = `التكرار: ${current}/${max}`;
        if (current === max) {
            btn.classList.add('done');
            btn.textContent = '✓ تم بحمد الله';
            if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }
    }
}