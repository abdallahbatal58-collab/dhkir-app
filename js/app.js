let currentTasbihIndex = 0; let currentCounter = 0;
const STORAGE = {
  get(k, d) { try { const v = localStorage.getItem('d_' + k); return v ? JSON.parse(v) : d; } catch(e) { return d; } },
  set(k, v) { try { localStorage.setItem('d_' + k, JSON.stringify(v)); } catch(e) {} }
};

window.addEventListener('load', () => {
  setTimeout(() => { document.getElementById('splash').classList.add('hide'); init(); }, 2000);
});

function init() {
  if (STORAGE.get('dark', false)) document.body.classList.add('dark');
  renderMorning(); renderEvening(); renderDuas(); renderQuran(); renderNames(); renderTasbih();
  setupEvents(); updateDailyVerse(); updateGreeting();
}

function updateGreeting() {
  const h = new Date().getHours();
  const el = document.getElementById('greeting-text');
  if(el) el.textContent = h < 12 ? 'صباح الخير ☀️' : (h < 17 ? 'نهارك سعيد 🌤️' : 'مساء الخير 🌙');
}

function updateDailyVerse() {
  const verses = [
    "﴿ فَاذْكُرُونِي أَذْكُرْكُمْ ﴾", "﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾", "﴿ وَاذْكُر رَّبَّكَ إِذَا نَسِيتَ ﴾"
  ];
  const el = document.getElementById('daily-verse');
  if(el) el.textContent = verses[new Date().getDate() % verses.length];
}

function renderAdhkar(data, id, key) {
  const c = document.getElementById(id); if(!c) return;
  c.innerHTML = data.map((item, i) => `
    <div class="adhkar-card">
      <div class="adhkar-text">${item.text}</div>
      <button class="adhkar-btn" onclick="countAdhkar(this, ${i}, '${key}', ${item.count})">تسبيح (${STORAGE.get(key+i, 0)}/${item.count})</button>
    </div>
  `).join('');
}
function countAdhkar(btn, idx, key, max) {
  let cur = STORAGE.get(key+idx, 0) + 1;
  if(cur >= max) { cur = max; btn.textContent = '✓ تم بحمد الله'; btn.style.background = '#d4af37'; btn.style.color = '#0d3b2e'; }
  else btn.textContent = `تسبيح (${cur}/${max})`;
  STORAGE.set(key+idx, cur); if(navigator.vibrate) navigator.vibrate(20);
}

function renderMorning() { renderAdhkar(MORNING_ADHKAR, 'morning-list', 'm_'); }
function renderEvening() { renderAdhkar(EVENING_ADHKAR, 'evening-list', 'e_'); }

function renderDuas() {
  const c = document.getElementById('duas-list'); if(!c) return;
  c.innerHTML = DUAS.map(d => `
    <div class="dua-card"><div class="dua-title">${d.title}</div><div class="dua-text">${d.text}</div></div>
  `).join('');
}

function renderQuran() {
  const c = document.getElementById('quran-list'); if(!c) return;
  c.innerHTML = QURAN_SURAHS.slice(0, 10).map(s => `
    <div class="dua-card" onclick="window.open('https://quran.com/${s.num}')">
      <div class="dua-title">سورة ${s.name}</div>
    </div>
  `).join('');
}

function renderNames() {
  const c = document.getElementById('names-grid'); if(!c) return;
  c.innerHTML = ALLAH_NAMES.slice(0, 20).map(n => `
    <div class="dua-card" style="text-align:center"><div class="dua-title" style="font-size:1.5em">${n.ar}</div></div>
  `).join('');
}

function renderTasbih() {
  const c = document.getElementById('tasbih-selector'); if(!c) return;
  c.innerHTML = TASBIH_ITEMS.map((t, i) => `<button class="tasbih-action ${i===0?'active':''}" onclick="setTasbih(${i}, this)">${t.name}</button>`).join('');
  updateTasbihUI();
}
function setTasbih(i, btn) {
  currentTasbihIndex = i; currentCounter = 0;
  document.querySelectorAll('#tasbih-selector button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active'); updateTasbihUI();
}
function updateTasbihUI() {
  const item = TASBIH_ITEMS[currentTasbihIndex];
  document.getElementById('tasbih-dhikr').textContent = item.name;
  document.getElementById('tasbih-counter').textContent = currentCounter;
  document.getElementById('tasbih-target').textContent = 'الهدف: ' + item.target;
}

async function fetchPrayerTimes() {
  const locEl = document.getElementById('prayer-location'); if(!locEl) return;
  try {
    const res = await fetch('https://api.aladhan.com/v1/timingsByCity?city=Cairo&country=Egypt&method=5');
    const data = await res.json(); const t = data.data.timings;
    locEl.textContent = "القاهرة، مصر";
    ['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'].forEach(p => {
      const el = document.getElementById('time-' + p); if(el) el.textContent = t[p].split(' ')[0];
    });
  } catch(e) { locEl.textContent = "تعذر جلب المواقيت"; }
}

function setupEvents() {
  document.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const page = btn.dataset.page;
      if(page === 'more') { document.getElementById('drawer').classList.add('open'); document.getElementById('overlay').classList.add('show'); return; }
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const target = document.getElementById('page-' + page); if(target) target.classList.add('active');
      document.getElementById('drawer').classList.remove('open'); document.getElementById('overlay').classList.remove('show');
      if(page === 'prayers') fetchPrayerTimes();
      window.scrollTo(0,0);
    });
  });

  document.getElementById('overlay').onclick = () => {
    document.getElementById('drawer').classList.remove('open'); document.getElementById('overlay').classList.remove('show');
  };

  document.getElementById('theme-btn').onclick = () => {
    document.body.classList.toggle('dark');
    STORAGE.set('dark', document.body.classList.contains('dark'));
  };

  document.getElementById('tasbih-btn').onclick = () => {
    const item = TASBIH_ITEMS[currentTasbihIndex];
    currentCounter++;
    if(currentCounter >= item.target) { currentCounter = 0; if(navigator.vibrate) navigator.vibrate([100, 50, 100]); }
    else if(navigator.vibrate) navigator.vibrate(20);
    updateTasbihUI();
  };

  document.getElementById('qibla-start').onclick = () => {
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude, lon = pos.coords.longitude;
      const brng = Math.atan2(Math.sin((39.8262-lon)*Math.PI/180)*Math.cos(21.4225*Math.PI/180), Math.cos(lat*Math.PI/180)*Math.sin(21.4225*Math.PI/180)-Math.sin(lat*Math.PI/180)*Math.cos(21.4225*Math.PI/180)*Math.cos((39.8262-lon)*Math.PI/180)) * 180 / Math.PI;
      document.getElementById('qibla-angle').textContent = Math.round(brng);
      document.getElementById('qibla-needle').style.transform = `rotate(${brng}deg)`;
    });
  };

  document.getElementById('notify-btn').onclick = async () => {
    const p = await Notification.requestPermission();
    if(p === 'granted') alert('تم تفعيل الإشعارات بنجاح!');
  };
}