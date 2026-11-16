/* EventEase – vanilla JS, data persisted in localStorage */
(() => {
  'use strict';
  const ADMIN_PASSCODE = 'admin123';           // change this to your own passcode
  const K = { events: 'eventease_events', regs: 'eventease_regs' };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CATS = ['Technical', 'Cultural', 'Workshops', 'Competitions'];
  const ART = { Technical: ['#4c1d95', '#2563eb', '💻'], Cultural: ['#be185d', '#7c3aed', '🎭'], Workshops: ['#0f766e', '#6d28d9', '🛠️'], Competitions: ['#b45309', '#9333ea', '🏆'] };

  /* ---------- storage ---------- */
  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now() + '' + Math.random()).slice(0, 8);
  const dayOffset = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

  function seed() {
    if (localStorage.getItem(K.events)) return;
    save(K.events, [
      { id: uid(), name: 'CodeSprint Hackathon', category: 'Technical', date: dayOffset(12), time: '09:00', venue: 'Innovation Lab, Block A', description: 'A 24-hour build marathon. Form a team, pick a problem statement and ship a working prototype.' },
      { id: uid(), name: 'Rangmanch Cultural Night', category: 'Cultural', date: dayOffset(18), time: '18:30', venue: 'Main Auditorium', description: 'Dance, music and drama performances from student clubs, followed by an open-mic round.' },
      { id: uid(), name: 'Cloud Security Workshop', category: 'Workshops', date: dayOffset(8), time: '10:30', venue: 'Seminar Hall 2', description: 'Hands-on session on IAM, least privilege and securing storage buckets on a free-tier cloud account.' },
      { id: uid(), name: 'Capture the Flag Challenge', category: 'Competitions', date: dayOffset(25), time: '14:00', venue: 'Computer Centre', description: 'Solve web, crypto and forensics puzzles against the clock. Teams of up to three.' },
      { id: uid(), name: 'Intro to Web Development', category: 'Workshops', date: dayOffset(15), time: '11:00', venue: 'Room 204', description: 'Build and deploy your first responsive website with HTML, CSS and JavaScript in one afternoon.' },
      { id: uid(), name: 'Tech Quiz Championship', category: 'Competitions', date: dayOffset(30), time: '15:30', venue: 'Conference Hall', description: 'Three rounds on programming, hardware and tech history. Top three teams win prizes.' }
    ]);
    save(K.regs, []);
  }
  const getEvents = () => load(K.events, []).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const getRegs = () => load(K.regs, []);

  /* ---------- helpers ---------- */
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = d => new Date(d + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const fmtTime = t => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; };
  const fmtStamp = iso => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const isPast = e => new Date(`${e.date}T${e.time}`) < new Date();
  const eventById = id => getEvents().find(e => e.id === id);
  function art(e) {
    if (e.image) return e.image;
    const [a, b, icon] = ART[e.category] || ART.Technical;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="600" height="340" fill="url(#g)"/><circle cx="500" cy="60" r="130" fill="#fff" opacity=".07"/><circle cx="90" cy="320" r="100" fill="#fff" opacity=".06"/><text x="300" y="215" font-size="110" text-anchor="middle">${icon}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  let toastT;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }

  /* ---------- routing ---------- */
  const VIEWS = ['home', 'register', 'confirmation', 'admin'];
  function route() {
    let h = (location.hash || '#home').slice(1);
    const scrollEvents = h === 'events';
    if (scrollEvents) h = 'home';
    if (!VIEWS.includes(h)) h = 'home';
    if (h === 'confirmation' && !sessionStorage.getItem('ee_last')) h = 'home';
    VIEWS.forEach(v => { $('#view-' + v).hidden = v !== h; });
    $$('nav a').forEach(a => a.classList.toggle('active', a.dataset.nav === (scrollEvents ? 'events' : h)));
    $('#menu').classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false');
    if (h === 'home') renderHome();
    if (h === 'register') renderRegisterForm();
    if (h === 'confirmation') renderConfirmation();
    if (h === 'admin') renderAdmin();
    if (scrollEvents) $('#events').scrollIntoView(); else window.scrollTo(0, 0);
  }

  /* ---------- home ---------- */
  let filter = 'All', query = '';
  function renderChips() {
    $('#chips').innerHTML = ['All', ...CATS].map(c => `<button class="chip ${c === filter ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('');
  }
  function renderHome() {
    const evs = getEvents();
    $('#stat-events').textContent = evs.filter(e => !isPast(e)).length;
    $('#stat-regs').textContent = getRegs().length;
    renderChips();
    const q = query.trim().toLowerCase();
    const list = evs.filter(e => (filter === 'All' || e.category === filter) && (!q || (e.name + e.venue + e.description).toLowerCase().includes(q)));
    $('#event-grid').innerHTML = list.length ? list.map(e => `
      <article class="card event">
        <div class="img-wrap"><img src="${esc(art(e))}" alt="${esc(e.name)}" loading="lazy" onerror="this.onerror=null;this.src='${art({ category: e.category })}'"><span class="tag">${esc(e.category)}</span></div>
        <div class="event-body">
          <h3>${esc(e.name)}</h3>
          <div class="meta">📅 ${fmtDate(e.date)} &nbsp; 🕒 ${fmtTime(e.time)}</div>
          <div class="meta">📍 ${esc(e.venue)}</div>
          <p>${esc(e.description)}</p>
          ${isPast(e) ? '<button class="btn" disabled>Event ended</button>' : `<button class="btn" data-reg="${e.id}">Register Now</button>`}
        </div>
      </article>`).join('') : '<div class="empty">No events match your search. Try another category.</div>';
  }
  $('#chips').addEventListener('click', e => { const b = e.target.closest('[data-cat]'); if (b) { filter = b.dataset.cat; renderHome(); } });
  $('#search').addEventListener('input', e => { query = e.target.value; renderHome(); });
  $('#event-grid').addEventListener('click', e => {
    const b = e.target.closest('[data-reg]'); if (!b) return;
    sessionStorage.setItem('ee_pick', b.dataset.reg); location.hash = '#register';
  });

  /* ---------- registration ---------- */
  const form = $('#reg-form');
  function renderRegisterForm() {
    const upcoming = getEvents().filter(e => !isPast(e));
    const pick = sessionStorage.getItem('ee_pick') || $('#f-event').value;
    $('#f-event').innerHTML = '<option value="">Choose an event</option>' + upcoming.map(e => `<option value="${e.id}">${esc(e.name)} – ${fmtDate(e.date)}</option>`).join('');
    if (upcoming.some(e => e.id === pick)) $('#f-event').value = pick;
    sessionStorage.removeItem('ee_pick');
    showPreview();
  }
  function showPreview() {
    const e = eventById($('#f-event').value);
    $('#reg-preview').innerHTML = e ? `<b>${esc(e.name)}</b><br>${fmtDate(e.date)}, ${fmtTime(e.time)} · ${esc(e.venue)}` : '';
  }
  $('#f-event').addEventListener('change', showPreview);

  const rules = {
    name: v => v.length < 3 ? 'Enter your full name (at least 3 characters).' : !/^[\p{L} .'-]+$/u.test(v) ? 'Use letters only in your name.' : '',
    email: v => !v ? 'Enter your email address.' : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? 'Enter a valid email, like name@example.com.' : '',
    phone: v => { const d = v.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, ''); return /^[6-9]\d{9}$/.test(d) ? '' : 'Enter a valid 10-digit mobile number.'; },
    org: v => v.length < 2 ? 'Enter your college or organisation.' : '',
    event: v => !v ? 'Select an event to register for.' : ''
  };
  function setErr(name, msg) {
    const f = form.elements[name]; f.classList.toggle('invalid', !!msg);
    $(`.err[data-for="${name}"]`).textContent = msg;
  }
  Object.keys(rules).forEach(n => form.elements[n].addEventListener('blur', () => setErr(n, rules[n](form.elements[n].value.trim()))));

  function newRegId() {
    const ids = new Set(getRegs().map(r => r.id)); let id;
    do { id = 'EE-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 7).toUpperCase(); } while (ids.has(id));
    return id;
  }
  form.addEventListener('submit', ev => {
    ev.preventDefault();
    let ok = true;
    const data = {};
    Object.keys(rules).forEach(n => { data[n] = form.elements[n].value.trim(); const m = rules[n](data[n]); setErr(n, m); if (m) ok = false; });
    if (!ok) { form.querySelector('.invalid')?.focus(); return; }
    const e = eventById(data.event);
    if (!e || isPast(e)) { setErr('event', 'This event is no longer available.'); return; }
    const regs = getRegs();
    if (regs.some(r => r.eventId === e.id && r.email.toLowerCase() === data.email.toLowerCase())) {
      setErr('email', 'This email is already registered for this event.'); return;
    }
    const reg = { id: newRegId(), name: data.name, email: data.email, phone: data.phone, org: data.org, eventId: e.id, eventName: e.name, eventDate: e.date, eventTime: e.time, venue: e.venue, createdAt: new Date().toISOString() };
    regs.push(reg); save(K.regs, regs);
    sessionStorage.setItem('ee_last', reg.id);
    form.reset(); $$('.err', form).forEach(x => x.textContent = '');
    location.hash = '#confirmation';
  });

  function renderConfirmation() {
    const r = getRegs().find(x => x.id === sessionStorage.getItem('ee_last'));
    if (!r) { location.hash = '#home'; return; }
    $('#confirm-card').innerHTML = `
      <div class="check">✓</div>
      <h2>You're registered!</h2>
      <p class="muted">Keep your registration ID handy. You'll need it at the venue.</p>
      <div class="rid">${esc(r.id)}</div>
      <dl>
        <dt>Name</dt><dd>${esc(r.name)}</dd>
        <dt>Email</dt><dd>${esc(r.email)}</dd>
        <dt>Phone</dt><dd>${esc(r.phone)}</dd>
        <dt>College / Org</dt><dd>${esc(r.org)}</dd>
        <dt>Event</dt><dd>${esc(r.eventName)}</dd>
        <dt>When</dt><dd>${fmtDate(r.eventDate)}, ${fmtTime(r.eventTime)}</dd>
        <dt>Venue</dt><dd>${esc(r.venue)}</dd>
        <dt>Registered on</dt><dd>${fmtStamp(r.createdAt)}</dd>
      </dl>
      <div class="hero-actions"><button class="btn" onclick="window.print()">Print confirmation</button><a class="btn ghost" href="#home">Browse more events</a></div>`;
  }

  /* ---------- admin ---------- */
  const isAdmin = () => sessionStorage.getItem('ee_admin') === '1';
  function renderAdmin() {
    $('#admin-login').hidden = isAdmin(); $('#admin-panel').hidden = !isAdmin();
    if (!isAdmin()) return;
    const evs = getEvents(), regs = getRegs();
    $('#k-events').textContent = evs.length; $('#k-regs').textContent = regs.length;
    $('#k-today').textContent = regs.filter(r => r.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length;
    renderParticipants(); 
    $('#e-table tbody').innerHTML = evs.length ? evs.map(e => `<tr>
      <td>${esc(e.name)}</td><td>${esc(e.category)}</td><td>${fmtDate(e.date)}, ${fmtTime(e.time)}</td><td>${esc(e.venue)}</td>
      <td>${regs.filter(r => r.eventId === e.id).length}</td>
      <td><button class="btn danger sm" data-del-event="${e.id}">Remove</button></td></tr>`).join('') : '<tr><td colspan="6"><div class="empty">No events yet. Add one above.</div></td></tr>';
  }
  function renderParticipants() {
    const q = $('#p-search').value.trim().toLowerCase();
    const regs = getRegs().filter(r => !q || (r.name + r.email + r.eventName + r.id).toLowerCase().includes(q)).reverse();
    $('#p-table tbody').innerHTML = regs.length ? regs.map(r => `<tr>
      <td>${esc(r.id)}</td><td>${esc(r.name)}</td><td>${esc(r.email)}</td><td>${esc(r.eventName)}</td><td>${fmtStamp(r.createdAt)}</td>
      <td><button class="btn danger sm" data-del-reg="${r.id}">Delete</button></td></tr>`).join('') : '<tr><td colspan="6"><div class="empty">No participants found.</div></td></tr>';
  }
  $('#p-search').addEventListener('input', renderParticipants);
  $('#login-form').addEventListener('submit', e => {
    e.preventDefault();
    if ($('#admin-pass').value === ADMIN_PASSCODE) { sessionStorage.setItem('ee_admin', '1'); $('#admin-pass').value = ''; $('#login-err').textContent = ''; renderAdmin(); }
    else $('#login-err').textContent = 'Incorrect passcode. Try again.';
  });
  $('#logout').addEventListener('click', () => { sessionStorage.removeItem('ee_admin'); renderAdmin(); });
  $('#admin-panel').addEventListener('click', e => {
    const de = e.target.closest('[data-del-event]'), dr = e.target.closest('[data-del-reg]');
    if (de) {
      const ev = eventById(de.dataset.delEvent);
      if (confirm(`Remove "${ev.name}"? Existing registrations for it will be kept.`)) { save(K.events, getEvents().filter(x => x.id !== ev.id)); toast('Event removed'); renderAdmin(); }
    }
    if (dr && confirm('Delete this registration?')) { save(K.regs, getRegs().filter(x => x.id !== dr.dataset.delReg)); toast('Registration deleted'); renderAdmin(); }
  });
  $('#event-form').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target, d = Object.fromEntries(new FormData(f).entries());
    Object.keys(d).forEach(k => d[k] = d[k].trim());
    const err = $('#event-err');
    if (!d.name || !d.date || !d.time || !d.venue || !d.description) { err.textContent = 'Fill in name, date, time, venue and description.'; return; }
    if (new Date(`${d.date}T${d.time}`) < new Date()) { err.textContent = 'Choose a date and time in the future.'; return; }
    if (d.image && !/^https?:\/\//i.test(d.image)) { err.textContent = 'Image URL must start with http:// or https://'; return; }
    err.textContent = '';
    const evs = load(K.events, []); evs.push({ id: uid(), ...d }); save(K.events, evs);
    f.reset(); toast('Event added'); renderAdmin();
  });
  $('#export-csv').addEventListener('click', () => {
    const regs = getRegs(); if (!regs.length) { toast('No registrations to export'); return; }
    const cols = ['id', 'name', 'email', 'phone', 'org', 'eventName', 'createdAt'];
    const csv = [cols.join(','), ...regs.map(r => cols.map(c => `"${String(r[c]).replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'eventease-registrations.csv'; a.click();
  });

  /* ---------- init ---------- */
  $('#burger').addEventListener('click', () => { const o = $('#menu').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', o); });
  $('#yr').textContent = new Date().getFullYear();
  window.addEventListener('hashchange', route);
  seed(); route();
})();
