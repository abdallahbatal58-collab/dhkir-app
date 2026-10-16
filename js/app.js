/* ============================================
   ذِكْر | منطق التطبيق الرئيسي
   ============================================ */

// ===== المتغيرات العامة =====
let currentPage = 'home';
let currentTasbihIndex = 0;
let currentCounter = 0;
let currentRound = 0;

// ===== تخزين محلي =====
const STORAGE = {
  get(key, def) {
    try {
      const v = localStorage.getItem('dhikr_' + key);
      return v ? JSON.parse(v) : def;
    } catch(e) { return def; }
  },
  set(key, val) {
    try { localStorage.setItem('dhikr_' + key, JSON.stringify(val)); } catch(e) {}
  }
};

// ===== اهتزاز =====
function vibrate(pattern = 30) {
  if (navigator.vibrate && STORAGE.get('vibrate', true)) {
    navigator.vibrate(pattern);
  }
}

// ===== شاشة البداية =====
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = document.getElementById('splash');
    if (splash) splash.classList.add('hide');
    init();
  }, 2200);
});

// ===== التهيئة العامة =====
function init() {
  loadSettings();
  renderMorning();
  renderEvening();
  renderDuas();
  renderQuran();
  renderNames();
  renderTasbihSelector();
  updateDailyVerse();
  updateGreeting();
  updateTasbihStats();
  setupEvents();
}

// ===== الإعدادات =====
function loadSettings() {
  const dark = STORAGE.get('dark', false);
  if (dark) document.body.classList.add('dark');
  const darkToggle = document.getElementById('set-dark');
  if (darkToggle) darkToggle.checked = dark;

  const fontSize = STORAGE.get('fontSize', 18);
  document.documentElement.style.fontSize = fontSize + 'px';
  const fontSlider = document.getElementById('set-font');
  if (fontSlider) fontSlider.value = fontSize;

  const vib = STORAGE.get('vibrate', true);
  const vibToggle = document.getElementById('set-vibrate');
  if (vibToggle) vibToggle.checked = vib;
}

// ===== التاريخ الهجري =====
function updateGreeting() {
  const now = new Date();
  const h = now.getHours();
  const greeting = document.getElementById('greeting-text');
  const sub = document.getElementById('greeting-sub');

  let text = '';
  let subText = '';
  if (h >= 4 && h < 12) {
    text = 'صباح الخير ☀️';
    subText = 'ابدأ يومك بذكر الله';
  } else if (h >= 12 && h < 17) {
    text = 'نهارك سعيد 🌤️';
    subText = 'لا تنس ذكر الله في كل حين';
  } else if (h >= 17 && h < 20) {
    text = 'مساء الخير 🌆';
    subText = 'أذكار المساء تحفظك';
  } else {
    text = 'ليلة طيبة 🌙';
    subText = 'اختم يومك بالذكر والاستغفار';
  }

  if (greeting) greeting.textContent = text;
  if (sub) sub.textContent = subText;

  // التاريخ الهجري (تقريبي)
  try {
    const hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(now);
    const el = document.getElementById('hijri-date');
    if (el) el.textContent = hijri;
  } catch(e) {
    const el = document.getElementById('hijri-date');
    if (el) el.textContent = 'تقبل الله أعمالكم';
  }
}

// ===== آية اليوم =====
function updateDailyVerse() {
  const day = new Date().getDate();
  const v = DAILY_VERSES[day % DAILY_VERSES.length];
  const verseEl = document.getElementById('daily-verse');
  const refEl = document.getElementById('daily-verse-ref');
  if (verseEl) verseEl.textContent = v.text;
  if (refEl) refEl.textContent = v.ref;
}

// ===== عرض الأذكار =====
function renderAdhkar(list, containerId, storageKey) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  list.forEach((item, idx) => {
    const done = STORAGE.get(storageKey + '_' + idx, 0);
    const card = document.createElement('div');
    card.className = 'adhkar-card';
    card.innerHTML = `
      <div class="adhkar-text">${item.text}</div>
      <div class="adhkar-footer">
        <span class="adhkar-count">التكرار: ${item.count}</span>
        <span class="adhkar-source">${item.source || ''}</span>
      </div>
      <button class="adhkar-btn ${done >= item.count ? 'done' : ''}" data-idx="${idx}" data-key="${storageKey}">
        ${done >= item.count ? '✓ تم بحمد الله' : `تسبيح (${done}/${item.count})`}
      </button>
    `;
    container.appendChild(card);
  });

  container.querySelectorAll('.adhkar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const key = btn.dataset.key;
      const item = list[idx];
      let cur = STORAGE.get(key + '_' + idx, 0);
      cur++;
      vibrate(20);
      if (cur >= item.count) {
        cur = item.count;
        btn.classList.add('done');
        btn.textContent = '✓ تم بحمد الله';
        vibrate([30, 50, 30]);
      } else {
        btn.textContent = `تسبيح (${cur}/${item.count})`;
      }
      STORAGE.set(key + '_' + idx, cur);
    });
  });
}

function renderMorning() {
  renderAdhkar(MORNING_ADHKAR, 'morning-list', 'morning');
}

function renderEvening() {
  renderAdhkar(EVENING_ADHKAR, 'evening-list', 'evening');
}

// ===== الأدعية =====
let currentDuaCat = 'quran';

function renderDuas() {
  const catsEl = document.getElementById('duas-cats');
  const listEl = document.getElementById('duas-list');
  if (!catsEl || !listEl) return;

  const cats = [
    { id: 'quran', label: '📖 من القرآن' },
    { id: 'nabawi', label: '🕌 من السنة' }
  ];

  catsEl.innerHTML = cats.map(c =>
    `<button class="dua-cat ${c.id === currentDuaCat ? 'active' : ''}" data-cat="${c.id}">${c.label}</button>`
  ).join('');

  catsEl.querySelectorAll('.dua-cat').forEach(btn => {
    btn.addEventListener('click', () => {
      currentDuaCat = btn.dataset.cat;
      renderDuas();
    });
  });

  const filtered = DUAS.filter(d => d.cat === currentDuaCat);
  listEl.innerHTML = filtered.map(d => `
    <div class="dua-card">
      <div class="dua-title">${d.title}</div>
      <div class="dua-text">${d.text}</div>
      <div class="dua-ref">${d.ref}</div>
    </div>
  `).join('');
}

// ===== القرآن =====
function renderQuran() {
  const el = document.getElementById('quran-list');
  if (!el) return;

  el.innerHTML = QURAN_SURAHS.map(s => `
    <div class="quran-surah" data-num="${s.num}">
      <div class="quran-surah-num">${s.num}</div>
      <div class="quran-surah-info">
        <div class="quran-surah-name">سورة ${s.name}</div>
        <div class="quran-surah-meta">${s.ayat} آية • ${s.type}</div>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.quran-surah').forEach(card => {
    card.addEventListener('click', () => {
      const num = card.dataset.num;
      openSurah(num);
    });
  });
}

function openSurah(num) {
  const url = `https://quran.com/${num}`;
  window.open(url, '_blank');
}

// ===== أسماء الله =====
function renderNames() {
  const el = document.getElementById('names-grid');
  if (!el) return;

  el.innerHTML = ALLAH_NAMES.map(n => `
    <div class="name-card">
      <div class="name-ar">${n.ar}</div>
      <div class="name-meaning">${n.meaning}</div>
    </div>
  `).join('');
}

// ===== السبحة =====
function renderTasbihSelector() {
  const el = document.getElementById('tasbih-selector');
  if (!el) return;

  el.innerHTML = TASBIH_ITEMS.map((t, i) =>
    `<button class="tasbih-chip ${i === currentTasbihIndex ? 'active' : ''}" data-idx="${i}">${t.name}</button>`
  ).join('');

  el.querySelectorAll('.tasbih-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      currentTasbihIndex = parseInt(chip.dataset.idx);
      currentCounter = 0;
      updateTasbihUI();
      document.querySelectorAll('.tasbih-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
    });
  });

  updateTasbihUI();
}

function updateTasbihUI() {
  const item = TASBIH_ITEMS[currentTasbihIndex];
  const dhikrEl = document.getElementById('tasbih-dhikr');
  const counterEl = document.getElementById('tasbih-counter');
  const targetEl = document.getElementById('tasbih-target');
  if (dhikrEl) dhikrEl.textContent = item.name;
  if (counterEl) counterEl.textContent = currentCounter;
  if (targetEl) targetEl.textContent = 'الهدف: ' + item.target;
}

function tasbihClick() {
  const item = TASBIH_ITEMS[currentTasbihIndex];
  currentCounter++;

  if (currentCounter >= item.target) {
    vibrate([50, 80, 50]);
    currentRound++;
    STORAGE.set('rounds', STORAGE.get('rounds', 0) + 1);
    currentCounter = 0;
    showToast(`🎉 أكملت ${item.target} من ${item.name}`);
  } else {
    vibrate(20);
  }

  const todayTotal = STORAGE.get('todayTotal', 0) + 1;
  STORAGE.set('todayTotal', todayTotal);
  const totalTotal = STORAGE.get('totalTotal', 0) + 1;
  STORAGE.set('totalTotal', totalTotal);

  updateTasbihUI();
  updateTasbihStats();
}

function updateTasbihStats() {
  const today = STORAGE.get('todayTotal', 0);
  const total = STORAGE.get('totalTotal', 0);
  const rounds = STORAGE.get('rounds', 0);
  const t = document.getElementById('today-total');
  const tt = document.getElementById('total-total');
  const r = document.getElementById('rounds-total');
  if (t) t.textContent = today;
  if (tt) tt.textContent = total;
  if (r) r.textContent = rounds;
}

// ===== القبلة =====
function initQibla() {
  const angleEl = document.getElementById('qibla-angle');
  const distEl = document.getElementById('qibla-distance');
  const needle = document.getElementById('qibla-needle');
  const btn = document.getElementById('qibla-start');

  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      showToast('المتصفح لا يدعم تحديد الموقع');
      return;
    }
    btn.textContent = 'جاري التحديد...';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const kaabaLat = 21.4225;
        const kaabaLon = 39.8262;

        // حساب اتجاه القبلة
        const dLon = (kaabaLon - lon) * Math.PI / 180;
        const lat1 = lat * Math.PI / 180;
        const lat2 = kaabaLat * Math.PI / 180;
        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        let brng = Math.atan2(y, x) * 180 / Math.PI;
        brng = (brng + 360) % 360;

        // حساب المسافة
        const R = 6371;
        const dLat = (kaabaLat - lat) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2)**2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const dist = R * c;

        if (angleEl) angleEl.textContent = brng.toFixed(1);
        if (distEl) distEl.textContent = dist.toFixed(0);
        if (needle) needle.style.transform = `rotate(${brng}deg)`;
        btn.textContent = 'تحديث الموقع';
        vibrate([30, 50, 30]);
      },
      (err) => {
        btn.textContent = 'فشل تحديد الموقع - حاول مجدداً';
        showToast('يجب السماح بالوصول للموقع');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// ===== التنقل بين الصفحات =====
function navigateTo(pageId) {
  if (pageId === 'more') {
    openDrawer();
    return;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + pageId);
  if (target) target.classList.add('active');
  currentPage = pageId;

  document.querySelectorAll('#bottom-nav button').forEach(b => {
    b.classList.toggle('active', b.dataset.page === pageId);
  });

  document.querySelectorAll('.drawer-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === pageId);
  });

  closeDrawer();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== القائمة الجانبية =====
function openDrawer() {
  document.getElementById('drawer').classList.add('open');
  document.getElementById('overlay').classList.add('show');
}

function closeDrawer() {
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

// ===== Toast =====
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%) translateY(20px);
      background: linear-gradient(135deg, #0d3b2e, #14563f); color: #d4af37;
      padding: 14px 24px; border-radius: 30px; font-family: 'Cairo', sans-serif;
      font-size: 0.95em; font-weight: 600; box-shadow: 0 8px 30px rgba(0,0,0,0.3);
      z-index: 9999; opacity: 0; transition: all 0.4s ease; border: 1px solid #d4af37;
      max-width: 90%; text-align: center;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  }, 50);
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
  }, 2500);
}

// ===== ربط الأحداث =====
function setupEvents() {
  // أزرار التنقل السفلية
  document.querySelectorAll('#bottom-nav button').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });

  // روابط القائمة الجانبية
  document.querySelectorAll('.drawer-nav a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(a.dataset.page);
    });
  });

  // بطاقات الصفحة الرئيسية
  document.querySelectorAll('.quick-card').forEach(c => {
    c.addEventListener('click', () => navigateTo(c.dataset.page));
  });

  // زر القائمة
  const menuBtn = document.getElementById('menu-btn');
  if (menuBtn) menuBtn.addEventListener('click', openDrawer);

  // الـ overlay
  const overlay = document.getElementById('overlay');
  if (overlay) overlay.addEventListener('click', closeDrawer);

  // زر الوضع الليلي
  const themeBtn = document.getElementById('theme-btn');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark');
      const isDark = document.body.classList.contains('dark');
      STORAGE.set('dark', isDark);
      document.getElementById('set-dark').checked = isDark;
      themeBtn.textContent = isDark ? '☀️' : '🌙';
      vibrate(20);
    });
  }

  // زر السبحة
  const tasbihBtn = document.getElementById('tasbih-btn');
  if (tasbihBtn) tasbihBtn.addEventListener('click', tasbihClick);

  // النقر على الشاشة في السبحة
  const tasbihDisplay = document.querySelector('.tasbih-display');
  if (tasbihDisplay) tasbihDisplay.addEventListener('click', tasbihClick);

  // تصفير السبحة
  const resetBtn = document.getElementById('tasbih-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('هل تريد تصفير العداد الحالي؟')) {
        currentCounter = 0;
        updateTasbihUI();
        vibrate(30);
      }
    });
  }

  // حفظ السبحة
  const saveBtn = document.getElementById('tasbih-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      showToast('💾 تم حفظ التقدم في السجل');
      vibrate([30, 50, 30]);
    });
  }

  // الاهتزاز
  const vibBtn = document.getElementById('tasbih-vibrate');
  if (vibBtn) {
    vibBtn.addEventListener('click', () => {
      const cur = STORAGE.get('vibrate', true);
      STORAGE.set('vibrate', !cur);
      vibBtn.classList.toggle('active', !cur);
      const toggle = document.getElementById('set-vibrate');
      if (toggle) toggle.checked = !cur;
      vibrate(30);
    });
  }

  // إعدادات - الوضع الليلي
  const setDark = document.getElementById('set-dark');
  if (setDark) {
    setDark.addEventListener('change', () => {
      document.body.classList.toggle('dark', setDark.checked);
      STORAGE.set('dark', setDark.checked);
      const themeBtnEl = document.getElementById('theme-btn');
      if (themeBtnEl) themeBtnEl.textContent = setDark.checked ? '☀️' : '🌙';
    });
  }

  // إعدادات - حجم الخط
  const setFont = document.getElementById('set-font');
  if (setFont) {
    setFont.addEventListener('input', () => {
      const val = setFont.value;
      document.documentElement.style.fontSize = val + 'px';
      STORAGE.set('fontSize', val);
    });
  }

  // إعدادات - الاهتزاز
  const setVib = document.getElementById('set-vibrate');
  if (setVib) {
    setVib.addEventListener('change', () => {
      STORAGE.set('vibrate', setVib.checked);
      const vibBtnEl = document.getElementById('tasbih-vibrate');
      if (vibBtnEl) vibBtnEl.classList.toggle('active', setVib.checked);
    });
  }

  // القبلة
  initQibla();

  // تصفير العداد اليومي عند بداية يوم جديد
  const lastDate = STORAGE.get('lastDate', '');
  const today = new Date().toDateString();
  if (lastDate !== today) {
    STORAGE.set('todayTotal', 0);
    STORAGE.set('lastDate', today);
  }
}

// ===== منع السحب للتحديث =====
document.addEventListener('touchmove', (e) => {
  if (e.touches.length > 1) e.preventDefault();
}, { passive: false });

// ===== اختصارات لوحة المفاتيح =====
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDrawer();
});