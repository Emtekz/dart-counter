import { db, save, uid, getPlayer, addPlayer, deletePlayer, exportData, importData, resetAll, COLORS } from './store.js';
import { newX01, submitTotal, throwDart, activeIndex, curScore, x01Results, validTotal, avg } from './x01.js';
import { newTraining, trainingInput, trainingResults, variantOf, dlabel, pct } from './training.js';
import { checkoutRoute, minDarts, throwOf } from './checkout.js';
import { chooseTarget, throwAt, BOT_LEVELS } from './bot.js';
import { x01Agg, trainingAgg, gamesOf, trainingBoards } from './stats.js';

/* ---------- Hilfsfunktionen ---------- */

const app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const f1 = n => (n ?? 0).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const f0 = n => Math.round(n ?? 0).toLocaleString('de-DE');
const dash = (v, fmt = x => x) => (v == null || Number.isNaN(v) ? '–' : fmt(v));
const fmtDate = ts => new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' }) + ' ' + new Date(ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
const fm = v => (Number.isInteger(v) ? v : f1(v));
const J = v => esc(JSON.stringify(v));

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.6c2 .7 3.2 2.5 3.6 5.4"/>',
  chart: '<path d="M3 21h18"/><rect x="5" y="11" width="3" height="7" rx="1"/><rect x="10.5" y="5" width="3" height="13" rx="1"/><rect x="16" y="14" width="3" height="4" rx="1"/>',
  settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  up: '<path d="m18 15-6-6-6 6"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 13v2M15 13v2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  play: '<path d="M7 4v16l13-8z"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
  keypad: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h.01M12 8h.01M16 8h.01M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01"/>',
  dart: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>',
};
const icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

/* ---------- Spieldefinitionen ---------- */

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => [a + i, String(a + i)]);
const DOUBLE_CHOICES = [...Array.from({ length: 20 }, (_, i) => [i + 1, 'D' + (i + 1)]), [25, 'Bull']];

const GAMES = {
  x01: {
    name: 'X01', cat: 'match', desc: '301 · 501 · 701 mit Legs, Sets, Double Out', bots: true, teams: true,
    defaults: { start: 501, in: 'single', out: 'double', format: 'legs', legs: 3, sets: 3 },
    options: [
      { key: 'start', label: 'Startpunkte', choices: [[101, '101'], [301, '301'], [501, '501'], [701, '701'], [901, '901']] },
      { key: 'in', label: 'Check-In', choices: [['single', 'Straight In'], ['double', 'Double In']] },
      { key: 'out', label: 'Check-Out', choices: [['double', 'Double Out'], ['single', 'Single Out'], ['master', 'Master Out']] },
      { key: 'format', label: 'Format', choices: [['legs', 'Legs'], ['sets', 'Sets']] },
      { key: 'legs', label: o => (o.format === 'sets' ? 'Legs pro Set (First to)' : 'Legs (First to)'), choices: range(1, 7) },
      { key: 'sets', label: 'Sets (First to)', choices: range(1, 5), show: o => o.format === 'sets' },
    ],
  },
  atc: {
    name: 'Around the Clock', cat: 'training', desc: 'Triff 1 bis 20 der Reihe nach',
    defaults: { mode: 'single', bull: true, jumps: false },
    options: [
      { key: 'mode', label: 'Gültige Treffer', choices: [['single', 'Beliebig'], ['double', 'Nur Doubles'], ['triple', 'Nur Triples']] },
      { key: 'bull', label: 'Bull zum Abschluss', choices: [[true, 'Ja'], [false, 'Nein']] },
      { key: 'jumps', label: 'Sprünge (Double +2, Triple +3)', choices: [[false, 'Aus'], [true, 'An']], show: o => o.mode === 'single' },
    ],
  },
  bobs27: {
    name: "Bob's 27", cat: 'training', desc: 'Doppel D1 bis Bull, Start mit 27 Punkten',
    defaults: { elim: true },
    options: [{ key: 'elim', label: 'Ausscheiden unter 0 Punkten', choices: [[true, 'Ja'], [false, 'Nein']] }],
  },
  power: {
    name: 'Power Scoring', cat: 'training', desc: 'Maximale Punkte in festen Aufnahmen',
    defaults: { rounds: 10 },
    options: [{ key: 'rounds', label: 'Aufnahmen', choices: [[5, '5'], [10, '10'], [20, '20'], [33, '33']] }],
  },
  doubles: {
    name: 'Doppeltraining', cat: 'training', desc: '3 Darts je Doppel – die Quote zählt',
    defaults: { mode: 'seq', rounds: 20, target: 16 },
    options: [
      { key: 'mode', label: 'Ablauf', choices: [['seq', 'D1 → Bull'], ['random', 'Zufällig'], ['fixed', 'Ein Doppel']] },
      { key: 'rounds', label: 'Aufnahmen', choices: [[10, '10'], [20, '20'], [30, '30']], show: o => o.mode !== 'seq' },
      { key: 'target', label: 'Doppel', choices: DOUBLE_CHOICES, show: o => o.mode === 'fixed' },
    ],
  },
  c121: {
    name: 'Checkout 121', cat: 'training', desc: '121 in 9 Darts checken – dann geht’s höher',
    defaults: { attempts: 10, onFail: 'stay' },
    options: [
      { key: 'attempts', label: 'Versuche', choices: [[5, '5'], [10, '10'], [20, '20']] },
      { key: 'onFail', label: 'Bei Fehlversuch', choices: [['stay', 'Ziel bleibt'], ['reset', 'Zurück auf 121']] },
    ],
  },
};

const GAME_ART = {
  x01: '501', atc: '1→20', bobs27: '27', power: '180', doubles: 'D16', c121: '121',
};

/* ---------- UI-Zustand ---------- */

const ui = { setup: null, input: '', mod: 1, modal: null, botTimer: null, statsSort: 'avg', wake: null };

let route = parseHash();
window.addEventListener('hashchange', () => {
  route = parseHash();
  ui.input = '';
  ui.mod = 1;
  render();
  window.scrollTo(0, 0);
});

function parseHash() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { name: parts[0] || 'home', arg: parts[1] };
}

function go(hash) {
  if (location.hash === hash) render();
  else location.hash = hash;
}

/* ---------- Toast, Modal, Sprache ---------- */

let toastTimer;
function toast(msg, kind = '', ms = 1800) {
  const el = document.getElementById('toast');
  el.innerHTML = msg;
  el.className = 'toast show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.className = 'toast'), ms);
}

function openModal(m) {
  ui.modal = m;
  renderModal();
}
function closeModal() {
  ui.modal = null;
  renderModal();
  if (route.name === 'game') scheduleBot();
}
function renderModal() {
  const root = document.getElementById('modal-root');
  const m = ui.modal;
  if (!m) { root.innerHTML = ''; return; }
  root.innerHTML = `<div class="modal-back" data-action="modal-close">
    <div class="modal" role="dialog" aria-modal="true">
      <h3>${esc(m.title)}</h3>
      ${m.html ? m.html : m.text ? `<p class="muted">${esc(m.text)}</p>` : ''}
      <div class="modal-btns ${m.grid ? 'grid' : ''}">${m.buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-action="modal-btn" data-i="${i}">${esc(b.label)}</button>`).join('')}</div>
    </div></div>`;
  root.querySelector('input')?.focus();
}
function pressModal(i) {
  const b = ui.modal?.buttons[i];
  const vals = {};
  document.querySelectorAll('#modal-root input').forEach(inp => (vals[inp.id] = inp.value));
  closeModal();
  b?.fn?.(vals);
}
function confirmBox(title, text, okLabel, onOk, danger = true) {
  openModal({ title, text, buttons: [{ label: 'Abbrechen', cls: 'ghost' }, { label: okLabel, cls: danger ? 'danger' : 'primary', fn: onOk }] });
}

function say(text) {
  if (!db.settings.speech || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text));
  u.lang = 'de-DE';
  u.rate = 1.05;
  speechSynthesis.speak(u);
}

/* ---------- Rendering ---------- */

function render() {
  document.documentElement.dataset.theme = db.settings.theme;
  const r = route.name;
  if (r !== 'game') stopBot();
  let html;
  switch (r) {
    case 'play': html = route.arg && GAMES[route.arg] ? viewSetup(route.arg) : viewPlay(); break;
    case 'game': html = db.current ? viewGame() : (go('#/'), ''); break;
    case 'result': html = viewResult(route.arg); break;
    case 'players': html = viewPlayers(); break;
    case 'player': html = viewPlayer(route.arg); break;
    case 'stats': html = viewStats(); break;
    case 'settings': html = viewSettings(); break;
    default: html = viewHome();
  }
  const inGame = r === 'game';
  app.innerHTML = inGame ? html : `<main class="page">${html}</main>${nav(r)}`;
  document.body.classList.toggle('in-game', inGame);
  if (inGame) { scheduleBot(); keepAwake(); } else releaseAwake();
}

function nav(r) {
  const item = (hash, name, ic, label) =>
    `<a href="${hash}" class="nav-item ${r === name || (name === 'players' && r === 'player') ? 'active' : ''}">${icon(ic)}<span>${label}</span></a>`;
  return `<nav class="nav">
    ${item('#/', 'home', 'home', 'Start')}
    ${item('#/play', 'play', 'target', 'Spielen')}
    ${item('#/players', 'players', 'users', 'Spieler')}
    ${item('#/stats', 'stats', 'chart', 'Statistik')}
    ${item('#/settings', 'settings', 'settings', 'Optionen')}
  </nav>`;
}

const pageHead = (title, back, extra = '') => `<header class="page-head">
  ${back ? `<a class="icon-btn" href="${back}" aria-label="Zurück">${icon('back')}</a>` : ''}
  <h1>${title}</h1>${extra}</header>`;

const dot = color => `<span class="dot" style="--c:${color}"></span>`;

/* ---------- Start ---------- */

function viewHome() {
  const cur = db.current?.state;
  const recent = db.games.slice(-5).reverse();
  return `
  <header class="brand-head">
    <img src="icons/logo.png" alt="" class="logo"><div><div class="brand">Dart Counter</div><div class="muted small">Zählen. Trainieren. Besser werden.</div></div>
  </header>

  ${cur ? `<section class="card resume">
      <div><div class="eyebrow">Laufendes Spiel</div><div class="resume-title">${esc(gameTitle(cur))}</div>
      <div class="muted small">${esc(cur.players.map(p => p.name).join(' · '))}</div></div>
      <div class="row gap"><button class="btn ghost" data-action="discard-current">Verwerfen</button><a class="btn primary" href="#/game">${icon('play')} Weiter</a></div>
    </section>` : ''}

  <section class="hero card">
    <img src="icons/icon-512.png" alt="" class="hero-board">
    <div>
      <h2>Bereit für den nächsten Wurf?</h2>
      <p class="muted">X01-Matches allein, mit Freunden, im Doppel oder gegen den Dartbot – plus Trainingsspiele mit Statistiken für jeden Spieler.</p>
    </div>
    <a href="#/play" class="btn primary big">${icon('target')} Neues Spiel</a>
  </section>

  <h3 class="section-title">Schnellstart</h3>
  <div class="tiles">
    <button class="tile" data-action="quick" data-q="solo"><span class="tile-art">501</span><b>501 Solo</b><span class="muted small">Freies Training</span></button>
    <button class="tile" data-action="quick" data-q="bot"><span class="tile-art">${icon('bot')}</span><b>501 vs. Bot</b><span class="muted small">Stufe ${db.settings.lastBot || 5}</span></button>
    <a class="tile" href="#/play/atc"><span class="tile-art">1→20</span><b>Around the Clock</b><span class="muted small">Training</span></a>
    <a class="tile" href="#/play/doubles"><span class="tile-art">D16</span><b>Doppeltraining</b><span class="muted small">Training</span></a>
  </div>

  <h3 class="section-title">Spieler</h3>
  ${db.players.length ? `<div class="chips">${db.players.map(p => {
    const a = x01Agg(p.id);
    return `<a class="chip big" href="#/player/${p.id}">${dot(p.color)}<b>${esc(p.name)}</b><span class="muted">Ø ${a.darts ? f1(a.avg) : '–'}</span></a>`;
  }).join('')}<a class="chip big add" href="#/players">${icon('plus')} Spieler</a></div>`
    : `<a class="card empty-cta" href="#/players">${icon('user')}<div><b>Lege Spielerprofile an</b><div class="muted small">So werden Averages, Checkout-Quoten und Trainingsbestwerte für jeden Spieler gespeichert.</div></div></a>`}

  <h3 class="section-title">Letzte Spiele</h3>
  ${recent.length ? `<div class="list">${recent.map(gameRow).join('')}</div>` : '<p class="muted">Noch keine Spiele gespielt.</p>'}
  `;
}

function gameRow(g) {
  const names = g.type === 'x01'
    ? g.sides.map(s => `${s.members.map(m => esc(g.players[m].name)).join(' & ')}${g.winner != null ? ` <b>${g.config.format === 'sets' ? s.sets : s.legs}</b>` : ''}`).join('<span class="muted"> : </span>')
    : g.players.map((p, i) => `${esc(p.name)} <b>${fm(g.results[i].metric)}</b>`).join(' · ');
  return `<a class="list-row" href="#/result/${g.id}">
    <span class="badge ${g.type === 'x01' ? 'match' : 'train'}">${g.type === 'x01' ? g.config.start : GAME_ART[g.type]}</span>
    <span class="grow"><span class="row-title">${esc(g.variant.label)}</span><span class="muted small">${names}</span></span>
    <span class="muted small nowrap">${fmtDate(g.date)}</span></a>`;
}

function gameTitle(st) {
  if (st.type === 'x01') {
    const c = st.config;
    const out = { double: 'Double Out', single: 'Single Out', master: 'Master Out' }[c.out];
    return `${c.start} · ${c.in === 'double' ? 'Double In · ' : ''}${out} · First to ${c.format === 'sets' ? `${c.sets} Sets` : `${c.legs} Leg${c.legs > 1 ? 's' : ''}`}`;
  }
  return variantOf(st.type, st.config).label;
}

/* ---------- Spielauswahl & Setup ---------- */

function viewPlay() {
  const card = ([k, g]) => `<a class="game-card ${g.cat}" href="#/play/${k}">
    <span class="game-art">${GAME_ART[k]}</span>
    <span><b>${g.name}</b><span class="muted small">${g.desc}</span></span></a>`;
  const entries = Object.entries(GAMES);
  return `${pageHead('Neues Spiel')}
    <h3 class="section-title">Match</h3>
    <div class="game-grid">${entries.filter(([, g]) => g.cat === 'match').map(card).join('')}</div>
    <p class="muted small hint">Solo, gegeneinander, im Doppel (2 vs 2) oder gegen den Dartbot.</p>
    <h3 class="section-title">Training</h3>
    <div class="game-grid">${entries.filter(([, g]) => g.cat === 'training').map(card).join('')}</div>`;
}

function initSetup(type) {
  const def = GAMES[type];
  const last = db.settings.lastSetup?.[type];
  const parts = (last?.parts || [])
    .filter(p => p.kind !== 'human' || getPlayer(p.playerId))
    .filter(p => def.bots || p.kind !== 'bot');
  if (!parts.length && db.players[0]) parts.push(partFromPlayer(db.players[0]));
  ui.setup = { type, opts: { ...def.defaults, ...(last?.opts || {}) }, parts, teams: !!(last?.teams && def.teams) };
}

const partFromPlayer = p => ({ kind: 'human', playerId: p.id, name: p.name, team: 0 });

function partName(p) {
  if (p.kind === 'human') return getPlayer(p.playerId)?.name || p.name;
  return p.name;
}
function partColor(p, i) {
  if (p.kind === 'human') return getPlayer(p.playerId)?.color || COLORS[i % COLORS.length];
  if (p.kind === 'bot') return '#94a3b8';
  return '#cbd5e1';
}

function viewSetup(type) {
  if (!ui.setup || ui.setup.type !== type) initSetup(type);
  const s = ui.setup, def = GAMES[type];
  const opts = def.options.filter(o => !o.show || o.show(s.opts)).map(o => `
    <div class="opt"><label>${typeof o.label === 'function' ? o.label(s.opts) : o.label}</label>
    <div class="seg ${o.choices.length > 6 ? 'wrap' : ''}">${o.choices.map(([v, l]) =>
      `<button class="${s.opts[o.key] === v ? 'on' : ''}" data-action="opt" data-key="${o.key}" data-value="${J(v)}">${l}</button>`).join('')}</div></div>`).join('');

  const unused = db.players.filter(p => !s.parts.some(x => x.playerId === p.id));
  const partsHtml = s.parts.map((p, i) => `
    <div class="part">
      ${dot(partColor(p, i))}
      <span class="grow"><b>${esc(partName(p))}</b> <span class="muted small">${p.kind === 'bot' ? `Dartbot · ~Ø ${BOT_LEVELS[p.level - 1].avg}` : p.kind === 'guest' ? 'Gast (ohne Statistik)' : 'Profil'}</span></span>
      ${s.teams ? `<button class="team-tag t${p.team}" data-action="part-team" data-i="${i}">Team ${p.team + 1}</button>` : ''}
      ${i > 0 ? `<button class="icon-btn sm" data-action="part-up" data-i="${i}" aria-label="Nach oben">${icon('up')}</button>` : ''}
      <button class="icon-btn sm" data-action="part-del" data-i="${i}" aria-label="Entfernen">${icon('x')}</button>
    </div>`).join('');

  const err = setupError();
  return `${pageHead(def.name, '#/play')}
  <section class="card"><h3>Einstellungen</h3>${opts}</section>

  <section class="card">
    <div class="row between"><h3>Teilnehmer</h3>${s.parts.length > 1 ? `<button class="btn ghost sm" data-action="shuffle">${icon('shuffle')} Mischen</button>` : ''}</div>
    ${def.teams ? `<div class="seg full"><button class="${!s.teams ? 'on' : ''}" data-action="teams" data-value="false">Jeder gegen jeden</button><button class="${s.teams ? 'on' : ''}" data-action="teams" data-value="true">Doppel (Teams)</button></div>` : ''}
    <div class="parts">${partsHtml || '<p class="muted">Noch niemand dabei.</p>'}</div>
    ${s.teams ? '<p class="muted small">Im Doppel spielen die Teams abwechselnd, innerhalb eines Teams wechseln sich die Spieler ab (A1 → B1 → A2 → B2).</p>' : ''}

    <div class="add-block">
      ${unused.length ? `<div class="label">Profile</div><div class="chips">${unused.map(p => `<button class="chip" data-action="add-profile" data-id="${p.id}">${dot(p.color)}${esc(p.name)} ${icon('plus', 'xs')}</button>`).join('')}</div>` : ''}
      <div class="label">Gast oder neues Profil</div>
      <div class="row gap"><input id="guest-name" class="input grow" placeholder="Name" maxlength="20" autocomplete="off">
        <button class="btn" data-action="add-guest">Gast</button><button class="btn" data-action="add-new-profile">Profil</button></div>
      ${def.bots ? `<div class="label">Dartbot</div>
      <div class="row gap"><select id="bot-level" class="input grow">${BOT_LEVELS.map((b, i) => `<option value="${i + 1}" ${(db.settings.lastBot || 5) === i + 1 ? 'selected' : ''}>Stufe ${i + 1} · ~Ø ${b.avg}</option>`).join('')}</select>
        <button class="btn" data-action="add-bot">${icon('bot')} Bot</button></div>` : ''}
    </div>
  </section>

  <div class="sticky-cta">
    ${err ? `<div class="muted small center">${err}</div>` : ''}
    <button class="btn primary big full" data-action="start" ${err ? 'disabled' : ''}>${icon('play')} Spiel starten</button>
  </div>`;
}

function setupError() {
  const s = ui.setup;
  if (!s.parts.length) return 'Füge mindestens einen Teilnehmer hinzu.';
  if (s.parts.length > 8) return 'Maximal 8 Teilnehmer.';
  if (!GAMES[s.type].bots && s.parts.some(p => p.kind === 'bot')) return 'Bots gibt es nur im X01.';
  if (s.teams) {
    const a = s.parts.filter(p => p.team === 0).length, b = s.parts.length - a;
    if (!a || !b) return 'Beide Teams brauchen mindestens einen Spieler.';
  }
  return '';
}

function startFromSetup() {
  const s = ui.setup;
  if (setupError()) return;
  db.settings.lastSetup = { ...db.settings.lastSetup, [s.type]: { opts: s.opts, parts: s.parts, teams: s.teams } };
  const players = s.parts.map((p, i) => ({
    name: partName(p), playerId: p.kind === 'human' ? p.playerId : null, kind: p.kind, level: p.level || null, color: partColor(p, i),
  }));
  let st;
  if (s.type === 'x01') {
    let sides;
    if (s.teams) {
      sides = [0, 1].map(t => {
        const members = s.parts.map((p, i) => (p.team === t ? i : -1)).filter(i => i >= 0);
        return { name: `Team ${t + 1}`, members };
      });
    } else sides = players.map((p, i) => ({ name: p.name, members: [i] }));
    st = newX01({ ...s.opts }, players, sides);
  } else {
    st = newTraining(s.type, { ...s.opts }, players);
  }
  db.current = { state: st, undo: [] };
  save();
  go('#/game');
}

/* ---------- Spielansicht ---------- */

function viewGame() {
  const st = db.current.state;
  return st.type === 'x01' ? viewX01(st) : viewTraining(st);
}

const gameBar = (title, sub) => `<div class="game-bar">
  <button class="icon-btn" data-action="quit" aria-label="Spiel verlassen">${icon('x')}</button>
  <div class="game-title"><b>${esc(title)}</b>${sub ? `<span class="muted small">${sub}</span>` : ''}</div>
  ${db.current.state.type === 'x01' ? `<button class="icon-btn" data-action="toggle-input" title="Eingabeart wechseln" aria-label="Eingabeart wechseln">${icon(db.settings.inputMode === 'total' ? 'dart' : 'keypad')}</button>` : ''}
  <button class="icon-btn" data-action="undo" aria-label="Rückgängig">${icon('undo')}</button>
</div>`;

function isBotTurn(st) {
  if (st.type !== 'x01' || st.finished) return false;
  return st.players[activeIndex(st)].kind === 'bot';
}

function viewX01(st) {
  const L = st.leg, c = st.config, act = activeIndex(st);
  const bot = isBotTurn(st);
  const sets = c.format === 'sets';
  const sub = `${sets ? `Set ${st.sides.reduce((a, s) => a + s.sets, 0) + 1} · ` : ''}Leg ${st.legNo}`;
  const boards = st.sides.map((S, si) => {
    const isAct = si === L.turn;
    const rem = L.rem[si] - (isAct ? curScore(st) : 0);
    const dartsLeft = isAct ? 3 - L.cur.length : 3;
    const route = L.opened[si] || (isAct && L.cur.some(d => d.score > 0)) ? checkoutRoute(rem, dartsLeft, c.out) : null;
    const mi = S.members[S.ptr];
    const ps = st.stats[mi];
    const color = st.players[S.members[0]].color;
    const names = S.members.map((m, k) => `<span class="${k === S.ptr ? 'cur' : ''}">${st.players[m].kind === 'bot' ? icon('bot', 'xs') : ''}${esc(st.players[m].name)}</span>`).join('<span class="muted"> & </span>');
    const last = L.lastScores?.[si];
    return `<div class="board ${isAct ? 'active' : ''}" style="--pc:${color}">
      <div class="b-head"><span class="b-name">${names}</span>
        <span class="b-legs">${sets ? `<span title="Sets">S ${S.sets}</span>` : ''}<span title="Legs">L ${S.legs}</span></span></div>
      <div class="b-rem">${rem}</div>
      <div class="b-route">${route ? route.map(t => `<span>${t.label}</span>`).join('') : !L.opened[si] ? '<span class="muted">Double In</span>' : '&nbsp;'}</div>
      <div class="b-stats"><span>Ø ${f1(avg(ps.points, ps.darts))}</span><span>Darts ${L.sideDarts[si]}</span><span>Letzte ${last ?? '–'}</span></div>
    </div>`;
  }).join('');

  const player = st.players[act];
  const slots = [0, 1, 2].map(i => `<span class="slot ${L.cur[i] ? 'filled' : ''}">${L.cur[i] ? L.cur[i].label : ''}</span>`).join('');
  const lastTxt = st.last ? `${esc(st.players[st.last.pi].name)}: ${st.last.labels ? st.last.labels.join(' · ') + ' = ' : ''}${st.last.bust ? '<b class="bad">Bust</b>' : `<b>${st.last.score}</b>`}` : 'Viel Erfolg!';

  let pad;
  if (bot) pad = `<div class="pad bot-pad"><div class="bot-think">${icon('bot')}<b>${esc(player.name)}</b> wirft …</div><div class="slots">${slots}</div></div>`;
  else if (db.settings.inputMode === 'darts') pad = dartPad(st);
  else pad = keypad(x01Quick(st));

  return `<div class="game x01">
    ${gameBar(gameTitle(st), sub)}
    <div class="boards n${Math.min(st.sides.length, 4)}">${boards}</div>
    <div class="visit-bar"><span class="who">${dot(player.color)}<b>${esc(player.name)}</b> ist dran</span>
      ${db.settings.inputMode === 'darts' || bot ? `<span class="slots">${slots}</span>` : ''}
      <span class="last muted small">${lastTxt}</span></div>
    ${pad}
  </div>`;
}

function x01Quick(st) {
  const L = st.leg, rem = L.rem[L.turn];
  const quick = [26, 41, 45, 60, 81, 85, 100, 140, 180].map(v => ({ v, label: String(v) }));
  const out = [];
  if (L.opened[L.turn] && checkoutRoute(rem, 3, st.config.out)) out.push({ v: rem, label: `Check ${rem}`, cls: 'accent' });
  return [...out, ...quick].slice(0, 9);
}

function keypad(quick = []) {
  return `<div class="pad keypad">
    <div class="kp-top">
      <div class="kp-display ${ui.input ? '' : 'empty'}">${ui.input || '0'}</div>
      ${quick.length ? `<div class="kp-quick">${quick.map(q => `<button class="${q.cls || ''}" data-action="kp-quick" data-v="${q.v}">${q.label}</button>`).join('')}</div>` : ''}
    </div>
    <div class="kp-grid">
      ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-action="kp" data-v="${n}">${n}</button>`).join('')}
      <button class="muted-key" data-action="kp-del" aria-label="Löschen">⌫</button>
      <button data-action="kp" data-v="0">0</button>
      <button class="ok" data-action="kp-ok">OK</button>
    </div></div>`;
}

function dartPad() {
  const m = ui.mod;
  return `<div class="pad dartpad">
    <div class="dp-mods">
      <button class="${m === 2 ? 'on d' : ''}" data-action="mod" data-v="2">Double</button>
      <button class="${m === 3 ? 'on t' : ''}" data-action="mod" data-v="3">Triple</button>
    </div>
    <div class="dp-grid">${Array.from({ length: 20 }, (_, i) => `<button data-action="dart" data-n="${i + 1}">${m === 2 ? 'D' : m === 3 ? 'T' : ''}${i + 1}</button>`).join('')}</div>
    <div class="dp-row">
      <button data-action="dart" data-n="25" data-m="1">25</button>
      <button data-action="dart" data-n="25" data-m="2">Bull</button>
      <button class="miss" data-action="dart" data-n="0">Miss</button>
      <button class="muted-key" data-action="undo">⌫</button>
    </div></div>`;
}

/* ---------- Trainingsansicht ---------- */

function viewTraining(st) {
  const p = st.ps[st.turn], pl = st.players[st.turn];
  const rows = st.players.map((x, i) => {
    const q = st.ps[i];
    let main, sub;
    switch (st.type) {
      case 'atc': main = q.done ? '✔' : targetLabel(st, st.targets[q.idx]); sub = `${q.darts} Darts · ${pct(q.hits, q.darts)}`; break;
      case 'bobs27': main = q.score; sub = q.out ? 'ausgeschieden' : q.done ? 'fertig' : `nächstes ${dlabel(st.targets[q.idx])}`; break;
      case 'power': main = q.total; sub = `${q.n}/${st.config.rounds} · Ø ${f1(q.n ? q.total / q.n : 0)}`; break;
      case 'doubles': main = pct(q.hits, q.darts); sub = `${q.hits}/${q.darts} · ${q.done ? 'fertig' : `${q.idx + 1}/${st.targets.length}`}`; break;
      case 'c121': main = q.success; sub = q.done ? 'fertig' : `Ziel ${q.target} · Versuch ${q.attempt + 1}/${st.config.attempts}`; break;
    }
    return `<div class="trow ${i === st.turn && !st.finished ? 'active' : ''} ${q.done ? 'done' : ''}" style="--pc:${x.color}">
      ${dot(x.color)}<span class="grow"><b>${esc(x.name)}</b><span class="muted small">${sub}</span></span><span class="tmain">${main}</span></div>`;
  }).join('');

  let focus = '', pad = '';
  switch (st.type) {
    case 'atc': {
      const t = st.targets[p.idx];
      focus = `<div class="focus-label">Ziel</div><div class="focus-big">${targetLabel(st, t)}</div><div class="muted">${p.idx + 1} / ${st.targets.length}</div>`;
      pad = st.config.jumps
        ? hitButtons([[0, 'Daneben', 'miss'], [1, 'Single'], [2, 'Double'], [3, 'Triple']])
        : hitButtons([[0, 'Daneben', 'miss'], [1, 'Treffer', 'hit']]);
      break;
    }
    case 'bobs27': {
      const t = st.targets[p.idx];
      focus = `<div class="focus-label">Ziel · Runde ${p.idx + 1}/21</div><div class="focus-big">${dlabel(t)}</div><div class="muted">Punkte: <b>${p.score}</b> · Wert ${t === 25 ? 50 : t * 2}</div>`;
      pad = hitButtons([[0, '0', 'miss'], [1, '1'], [2, '2'], [3, '3']], 'Treffer');
      break;
    }
    case 'power':
      focus = `<div class="focus-label">Aufnahme</div><div class="focus-big">${p.n + 1}<small>/${st.config.rounds}</small></div><div class="muted">Gesamt <b>${p.total}</b> · Ø ${f1(p.n ? p.total / p.n : 0)}</div>`;
      pad = keypad([60, 81, 85, 100, 140, 180].map(v => ({ v, label: String(v) })));
      break;
    case 'doubles': {
      const t = st.targets[p.idx];
      focus = `<div class="focus-label">Ziel · ${p.idx + 1}/${st.targets.length}</div><div class="focus-big">${dlabel(t)}</div><div class="muted">Quote ${pct(p.hits, p.darts)}</div>`;
      pad = hitButtons([[0, '0', 'miss'], [1, '1'], [2, '2'], [3, '3']], 'Treffer (3 Darts)');
      break;
    }
    case 'c121': {
      const route = checkoutRoute(p.rem, 3, 'double');
      focus = `<div class="focus-label">Ziel ${p.target} · Aufnahme ${p.visit + 1}/3</div><div class="focus-big">${p.rem}</div>
        <div class="b-route center">${route ? route.map(t => `<span>${t.label}</span>`).join('') : '&nbsp;'}</div>`;
      pad = keypad(route ? [{ v: p.rem, label: `Check ${p.rem}`, cls: 'accent' }] : []);
      break;
    }
  }
  const slots = st.type === 'atc' ? `<span class="slots">${[0, 1, 2].map(i => `<span class="slot ${st.cur[i] != null ? (st.cur[i] > 0 ? 'filled hit' : 'filled') : ''}">${st.cur[i] != null ? (st.cur[i] > 0 ? '✔' : '✕') : ''}</span>`).join('')}</span>` : '';
  return `<div class="game training">
    ${gameBar(variantOf(st.type, st.config).label, st.players.length > 1 ? `Runde ${st.round}` : '')}
    <div class="tboards">${rows}</div>
    <div class="focus card" style="--pc:${pl.color}">${st.players.length > 1 ? `<div class="who">${dot(pl.color)}<b>${esc(pl.name)}</b></div>` : ''}${focus}</div>
    <div class="visit-bar">${slots}<span class="last muted small">${st.last ? `<span class="${st.last.good ? 'good' : ''}">${esc(st.last.text)}</span>` : 'Viel Erfolg!'}</span></div>
    ${pad}
  </div>`;
}

function targetLabel(st, t) {
  if (t == null) return '✔';
  if (t === 25) return st.config.mode === 'single' ? 'Bull' : 'Bull';
  return (st.config.mode === 'double' ? 'D' : st.config.mode === 'triple' ? 'T' : '') + t;
}

function hitButtons(list, label = '') {
  return `<div class="pad hits">${label ? `<div class="label center">${label}</div>` : ''}
    <div class="hit-grid n${list.length}">${list.map(([v, l, cls]) => `<button class="${cls || ''}" data-action="hit" data-v="${v}">${l}</button>`).join('')}</div></div>`;
}

/* ---------- Aktionen im Spiel ---------- */

function snapshot() {
  const cur = db.current;
  cur.undo.push(JSON.stringify(cur.state));
  if (cur.undo.length > 80) cur.undo.shift();
}

function act(fn) {
  const st = db.current.state;
  const legBefore = st.legNo;
  snapshot();
  const res = fn(st);
  if (res === false) { db.current.undo.pop(); return; }
  if (st.type === 'x01' && res) onVisit(st, res, legBefore);
  ui.input = '';
  if (st.finished) return finishGame();
  save();
  render();
}

function onVisit(st, v, legBefore) {
  const L = st.leg;
  if (st.legNo === legBefore) {
    L.lastScores = L.lastScores || {};
    L.lastScores[v.side] = v.bust ? 'Bust' : v.score;
  }
  if (v.checkout) {
    say('Game shot');
    if (!st.finished && st.legEvent) {
      const S = st.sides[st.legEvent.side];
      const who = S.members.map(m => st.players[m].name).join(' & ');
      toast(`${icon('trophy')} <b>${esc(who)}</b> gewinnt ${st.legEvent.setWon ? 'das Set' : 'das Leg'}<br><span class="small">${st.legEvent.darts} Darts · Checkout ${st.legEvent.checkout}</span>`, 'big', 2600);
    }
  } else if (v.bust) {
    say('Bust');
    toast('Bust!', 'bad');
  } else {
    say(v.score === 0 ? 'No score' : v.score);
    if (v.score === 180) toast('🎯 ONE HUNDRED AND EIGHTY!', 'big', 2200);
  }
}

function undo() {
  const cur = db.current;
  if (!cur) return;
  stopBot();
  if (!cur.undo.length) return toast('Nichts zum Rückgängigmachen');
  do {
    cur.state = JSON.parse(cur.undo.pop());
  } while (cur.undo.length && isBotTurn(cur.state));
  ui.input = '';
  save();
  render();
}

function submitKeypad(value) {
  const st = db.current.state;
  const raw = value ?? (ui.input === '' ? null : parseInt(ui.input, 10));
  if (raw == null) return;
  if (st.type === 'x01') {
    if (!validTotal(raw)) { ui.input = ''; render(); return toast('Ungültige Punktzahl', 'bad'); }
    const L = st.leg, rem = L.rem[L.turn], out = st.config.out;
    if (raw === rem) {
      if (!checkoutRoute(rem, 3, out)) { ui.input = ''; render(); return toast(`${rem} ist nicht checkbar`, 'bad'); }
      const md = minDarts(rem, out);
      if (md < 3) {
        const opts = [1, 2, 3].filter(d => d >= md);
        return openModal({
          title: `Checkout ${rem}!`, text: 'Mit wie vielen Darts?', grid: true,
          buttons: opts.map(d => ({ label: `${d} Dart${d > 1 ? 's' : ''}`, cls: 'primary', fn: () => act(s => submitTotal(s, raw, d)) })),
        });
      }
      return act(s => submitTotal(s, raw, 3));
    }
    return act(s => submitTotal(s, raw, 3));
  }
  act(s => trainingInput(s, raw) ? true : (toast('Ungültige Punktzahl', 'bad'), false));
}

function finishGame() {
  const st = db.current.state;
  const results = st.type === 'x01' ? x01Results(st) : trainingResults(st);
  const rec = {
    id: st.id, type: st.type, variant: st.type === 'x01' ? { key: `x01-${st.config.start}`, label: gameTitle(st) } : variantOf(st.type, st.config),
    date: st.started, ended: st.ended || Date.now(), config: st.config,
    players: st.players.map(p => ({ name: p.name, playerId: p.playerId, kind: p.kind, level: p.level, color: p.color })),
    sides: st.sides?.map(s => ({ name: s.name, members: s.members, legs: s.legs, sets: s.sets })),
    winner: st.winner ?? null, results,
    teams: st.type === 'x01' && st.sides.some(s => s.members.length > 1),
  };
  db.games.push(rec);
  db.current = null;
  save();
  if (st.type === 'x01') {
    const w = st.sides[st.winner];
    say(`Game shot and the match. ${w.members.map(m => st.players[m].name).join(' und ')}`);
  }
  go('#/result/' + rec.id);
}

/* ---------- Dartbot ---------- */

function scheduleBot() {
  const st = db.current?.state;
  if (!st || ui.botTimer || ui.modal || !isBotTurn(st)) return;
  ui.botTimer = setTimeout(() => {
    ui.botTimer = null;
    if (route.name !== 'game' || ui.modal || !db.current || !isBotTurn(db.current.state)) return;
    const s = db.current.state, L = s.leg, side = L.turn;
    const pl = s.players[activeIndex(s)];
    const rem = L.rem[side] - curScore(s);
    const opened = L.opened[side] || L.cur.some(d => d.score > 0);
    const target = chooseTarget(rem, 3 - L.cur.length, s.config.out, opened);
    const hit = throwAt(target, pl.level, rem <= 60);
    act(x => throwDart(x, hit));
  }, db.current.state.leg.cur.length ? 650 : 900);
}

function stopBot() {
  clearTimeout(ui.botTimer);
  ui.botTimer = null;
}

async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !ui.wake) ui.wake = await navigator.wakeLock.request('screen');
  } catch { /* nicht unterstützt */ }
}
function releaseAwake() {
  ui.wake?.release?.();
  ui.wake = null;
}

/* ---------- Ergebnis ---------- */

function viewResult(id) {
  const g = db.games.find(x => x.id === id);
  if (!g) return `${pageHead('Ergebnis', '#/')}<p class="muted">Spiel nicht gefunden.</p>`;
  let body;
  if (g.type === 'x01') {
    const w = g.sides[g.winner];
    const score = g.sides.map(s => (g.config.format === 'sets' ? s.sets : s.legs)).join(' : ');
    const rows = g.players.map((p, i) => ({ p, r: g.results[i] }));
    const stat = (label, fn) => `<tr><th>${label}</th>${rows.map(({ r }) => `<td>${fn(r)}</td>`).join('')}</tr>`;
    body = `<section class="card winner" style="--pc:${g.players[w.members[0]].color}">
        ${icon('trophy', 'lg')}<div><div class="eyebrow">Sieger</div><div class="winner-name">${esc(w.members.map(m => g.players[m].name).join(' & '))}</div>
        <div class="muted">${esc(g.variant.label)}</div></div><div class="final-score">${score}</div></section>
      <section class="card"><h3>Match-Statistik</h3><div class="table-wrap"><table class="stats-table">
        <thead><tr><th></th>${rows.map(({ p }) => `<th>${dot(p.color)}${esc(p.name)}</th>`).join('')}</tr></thead><tbody>
        ${stat('3-Dart-Ø', r => f1(avg(r.points, r.darts)))}
        ${stat('First 9 Ø', r => f1(avg(r.f9p, r.f9d)))}
        ${stat('Legs', r => r.legsWon)}
        ${stat('Darts', r => r.darts)}
        ${stat('Checkout-Quote', r => (r.coAtt ? Math.round((r.coDone / r.coAtt) * 100) + ' %' : '–'))}
        ${stat('Höchstes Finish', r => r.highCo || '–')}
        ${stat('Bestes Leg', r => (r.bestLeg ? r.bestLeg + ' Darts' : '–'))}
        ${stat('Höchste Aufnahme', r => r.high)}
        ${stat('180er', r => r.s180)}
        ${stat('140+', r => r.s140)}
        ${stat('100+', r => r.s100)}
        </tbody></table></div>
        <p class="muted small">Checkout-Quote = erfolgreiche Checks / Aufnahmen mit checkbarem Rest.</p></section>`;
  } else {
    const order = g.results.map((r, i) => ({ r, p: g.players[i] })).sort((a, b) => a.r.rank - b.r.rank);
    body = `<section class="card winner" style="--pc:${order[0].p.color}">${icon('trophy', 'lg')}<div><div class="eyebrow">${g.players.length > 1 ? 'Sieger' : 'Ergebnis'}</div>
      <div class="winner-name">${esc(order[0].p.name)}</div><div class="muted">${esc(g.variant.label)}</div></div>
      <div class="final-score">${fm(order[0].r.metric)}<small> ${order[0].r.unit}</small></div></section>
      <section class="card"><h3>Rangliste</h3><div class="list">${order.map(({ r, p }) => `<div class="list-row static">
        <span class="rank">${r.rank}</span>${dot(p.color)}<span class="grow"><b>${esc(p.name)}</b><span class="muted small">${esc(r.detail)}</span></span>
        <span class="tmain">${fm(r.metric)}<small> ${r.unit}</small></span></div>`).join('')}</div></section>`;
  }
  return `${pageHead('Ergebnis', '#/', `<span class="muted small">${fmtDate(g.date)}</span>`)}
    ${body}
    <div class="row gap wrap">
      <button class="btn primary" data-action="rematch" data-id="${g.id}">${icon('play')} Revanche</button>
      <a class="btn" href="#/play">Neues Spiel</a>
      <a class="btn ghost" href="#/">Startseite</a>
      <button class="btn ghost danger-text" data-action="delete-game" data-id="${g.id}">${icon('trash')} Löschen</button>
    </div>`;
}

function rematch(id) {
  const g = db.games.find(x => x.id === id);
  if (!g) return;
  const players = g.players.map(p => ({ ...p, name: p.playerId ? getPlayer(p.playerId)?.name || p.name : p.name }));
  let st;
  if (g.type === 'x01') {
    // Anwurf wechselt: Seitenreihenfolge rotieren
    const sides = g.sides.map(s => ({ name: s.name, members: s.members }));
    sides.push(sides.shift());
    st = newX01({ ...g.config }, players, sides);
  } else {
    st = newTraining(g.type, { ...g.config }, players);
  }
  db.current = { state: st, undo: [] };
  save();
  go('#/game');
}

/* ---------- Spieler ---------- */

function viewPlayers() {
  return `${pageHead('Spieler')}
  <section class="card">
    <h3>Neuer Spieler</h3>
    <form class="row gap" data-form="add-player"><input id="new-player" class="input grow" placeholder="Name" maxlength="20" autocomplete="off" required>
    <button class="btn primary" type="submit">${icon('plus')} Anlegen</button></form>
  </section>
  ${db.players.length ? `<div class="list">${db.players.map(p => {
    const a = x01Agg(p.id), t = trainingAgg(p.id).reduce((s, e) => s + e.count, 0);
    return `<a class="list-row" href="#/player/${p.id}"><span class="avatar" style="--c:${p.color}">${esc(p.name[0]?.toUpperCase() || '?')}</span>
      <span class="grow"><b>${esc(p.name)}</b><span class="muted small">${a.games} Matches · ${t} Trainings</span></span>
      <span class="tmain">${a.darts ? f1(a.avg) : '–'}<small> Ø</small></span></a>`;
  }).join('')}</div>` : '<p class="muted center">Noch keine Spieler angelegt.</p>'}`;
}

function viewPlayer(id) {
  const p = getPlayer(id);
  if (!p) return `${pageHead('Spieler', '#/players')}<p class="muted">Spieler nicht gefunden.</p>`;
  const a = x01Agg(id), tr = trainingAgg(id), games = gamesOf(id).slice(-10).reverse();
  const tile = (label, value, sub = '') => `<div class="stat"><div class="stat-v">${value}</div><div class="stat-l">${label}</div>${sub ? `<div class="muted small">${sub}</div>` : ''}</div>`;
  return `${pageHead(`<span class="avatar" style="--c:${p.color}">${esc(p.name[0]?.toUpperCase())}</span>${esc(p.name)}`, '#/players',
    `<button class="icon-btn" data-action="rename-player" data-id="${id}" aria-label="Umbenennen">${icon('edit')}</button>`)}
  <div class="swatches">${COLORS.map(c => `<button class="swatch ${c === p.color ? 'on' : ''}" style="--c:${c}" data-action="player-color" data-id="${id}" data-c="${c}" aria-label="Farbe ${c}"></button>`).join('')}</div>

  <h3 class="section-title">X01</h3>
  ${a.games ? `<div class="stat-grid">
    ${tile('3-Dart-Average', f1(a.avg))}
    ${tile('First 9 Ø', f1(a.f9))}
    ${tile('Matches', a.games, `${a.wins} Sieg${a.wins === 1 ? "" : "e"} · ${dash(a.winRate, v => Math.round(v) + ' %')}`)}
    ${tile('Checkout-Quote', dash(a.coRate, v => Math.round(v) + ' %'), `${a.coDone}/${a.coAtt}`)}
    ${tile('Höchstes Finish', a.highCo || '–')}
    ${tile('Bestes Leg', a.bestLeg ? a.bestLeg + ' Darts' : '–')}
    ${tile('Höchste Aufnahme', a.high)}
    ${tile('180er', a.s180, `140+: ${a.s140} · 100+: ${a.s100}`)}
    ${tile('Legs gewonnen', a.legsWon, `von ${a.legsPlayed}`)}
  </div>
  ${a.trend.length > 1 ? `<section class="card"><h3>Average-Verlauf</h3>${trendChart(a.trend.slice(-30), p.color)}</section>` : ''}`
    : '<p class="muted">Noch keine X01-Matches.</p>'}

  <h3 class="section-title">Training</h3>
  ${tr.length ? `<div class="list">${tr.map(e => `<div class="list-row static"><span class="badge train">${GAME_ART[e.type]}</span>
    <span class="grow"><b>${esc(e.label)}</b><span class="muted small">${e.count}× gespielt · Schnitt ${f1(e.mean)} ${e.unit}</span></span>
    <span class="tmain">${fm(e.best)}<small> ${e.unit}</small></span></div>`).join('')}</div><p class="muted small">Rechts: Bestwert</p>` : '<p class="muted">Noch keine Trainings.</p>'}

  <h3 class="section-title">Letzte Spiele</h3>
  ${games.length ? `<div class="list">${games.map(gameRow).join('')}</div>` : '<p class="muted">–</p>'}

  <button class="btn ghost danger-text" data-action="delete-player" data-id="${id}">${icon('trash')} Spieler löschen</button>`;
}

function trendChart(points, color) {
  const W = 320, H = 120, P = 22;
  const vals = points.map(p => p.avg);
  const min = Math.floor(Math.min(...vals) / 5) * 5, max = Math.ceil(Math.max(...vals) / 5) * 5 || 5;
  const span = max - min || 5;
  const x = i => P + (i * (W - P - 6)) / (vals.length - 1);
  const y = v => 8 + (H - 24) * (1 - (v - min) / span);
  const line = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return `<svg class="trend" viewBox="0 0 ${W} ${H}" role="img" aria-label="Average-Verlauf der letzten ${vals.length} Matches">
    <line x1="${P}" x2="${W - 6}" y1="${y(max)}" y2="${y(max)}" class="grid"/><line x1="${P}" x2="${W - 6}" y1="${y(min)}" y2="${y(min)}" class="grid"/>
    <text x="0" y="${y(max) + 4}" class="axis">${max}</text><text x="0" y="${y(min) + 4}" class="axis">${min}</text>
    <line x1="${P}" x2="${W - 6}" y1="${y(mean)}" y2="${y(mean)}" class="mean"/>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3" fill="${color}"><title>${f1(v)} – ${fmtDate(points[i].date)}</title></circle>`).join('')}
    <text x="${W - 6}" y="${H - 2}" class="axis" text-anchor="end">Ø ${f1(mean)} · letzte ${vals.length} Matches</text>
  </svg>`;
}

/* ---------- Statistik ---------- */

function viewStats() {
  const cols = [
    ['avg', 'Ø', a => (a.darts ? f1(a.avg) : '–')],
    ['f9', 'F9', a => (a.darts ? f1(a.f9) : '–')],
    ['games', 'Sp.', a => a.games],
    ['wins', 'Siege', a => a.wins],
    ['coRate', 'CO %', a => dash(a.coRate, v => Math.round(v))],
    ['highCo', 'Finish', a => a.highCo || '–'],
    ['s180', '180', a => a.s180],
  ];
  const rows = db.players.map(p => ({ p, a: x01Agg(p.id) })).filter(r => r.a.games);
  const k = ui.statsSort;
  rows.sort((x, y) => (y.a[k] ?? -1) - (x.a[k] ?? -1));
  const boards = trainingBoards();
  return `${pageHead('Statistik')}
  <section class="card"><h3>X01-Rangliste</h3>
  ${rows.length ? `<div class="table-wrap"><table class="stats-table lb"><thead><tr><th>#</th><th class="left">Spieler</th>${cols.map(([key, l]) => `<th><button class="sort ${k === key ? 'on' : ''}" data-action="sort" data-k="${key}">${l}</button></th>`).join('')}</tr></thead>
    <tbody>${rows.map(({ p, a }, i) => `<tr><td>${i + 1}</td><td class="left"><a href="#/player/${p.id}">${dot(p.color)}${esc(p.name)}</a></td>${cols.map(([, , fn]) => `<td>${fn(a)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    : '<p class="muted">Noch keine X01-Matches mit Profilen.</p>'}</section>

  <h3 class="section-title">Trainings-Bestenlisten</h3>
  ${boards.length ? `<div class="board-grid">${boards.map(b => `<section class="card"><h4>${esc(b.label)}</h4>
    ${b.rows.slice(0, 5).map((r, i) => `<div class="lb-row"><span class="rank">${i + 1}</span>${dot(r.player.color)}<span class="grow">${esc(r.player.name)}</span><b>${fm(r.best)}</b><span class="muted small">${b.unit}</span></div>`).join('')}</section>`).join('')}</div>`
    : '<p class="muted">Noch keine Trainingsergebnisse.</p>'}

  <h3 class="section-title">Alle Spiele (${db.games.length})</h3>
  ${db.games.length ? `<div class="list">${db.games.slice().reverse().slice(0, 50).map(gameRow).join('')}</div>` : '<p class="muted">–</p>'}`;
}

/* ---------- Einstellungen ---------- */

function viewSettings() {
  const s = db.settings;
  const seg = (key, choices) => `<div class="seg">${choices.map(([v, l]) => `<button class="${s[key] === v ? 'on' : ''}" data-action="setting" data-key="${key}" data-value="${J(v)}">${l}</button>`).join('')}</div>`;
  return `${pageHead('Optionen')}
  <section class="card">
    <div class="opt"><label>X01-Eingabe</label>${seg('inputMode', [['total', 'Gesamtpunkte'], ['darts', 'Einzeldarts']])}
      <p class="muted small">Auch im Spiel über das Symbol oben rechts umschaltbar.</p></div>
    <div class="opt"><label>Sprachansage (Scores, Game Shot)</label>${seg('speech', [[false, 'Aus'], [true, 'An']])}</div>
    <div class="opt"><label>Design</label>${seg('theme', [['dark', 'Dunkel'], ['light', 'Hell']])}</div>
  </section>
  <section class="card">
    <h3>Daten</h3>
    <p class="muted small">Alle Daten liegen nur lokal in diesem Browser. Mit Export/Import kannst du sie sichern oder auf ein anderes Gerät übertragen.</p>
    <div class="row gap wrap">
      <button class="btn" data-action="export">Exportieren</button>
      <label class="btn">Importieren<input type="file" accept="application/json,.json" id="import-file" hidden></label>
      <button class="btn ghost danger-text" data-action="reset">Alles löschen</button>
    </div>
  </section>
  <p class="muted small center">Dart Counter · ${db.players.length} Spieler · ${db.games.length} Spiele gespeichert</p>`;
}

/* ---------- Event-Handling ---------- */

const actions = {
  'modal-close': (d, el, e) => { if (e.target === el) closeModal(); },
  'modal-btn': d => pressModal(+d.i),
  'discard-current': () => confirmBox('Spiel verwerfen?', 'Das laufende Spiel wird ohne Wertung beendet.', 'Verwerfen', () => { db.current = null; save(); render(); }),
  quick: d => {
    const me = db.players[0];
    const parts = me ? [partFromPlayer(me)] : [{ kind: 'guest', name: 'Spieler 1', team: 0 }];
    if (d.q === 'bot') {
      const lvl = db.settings.lastBot || 5;
      parts.push({ kind: 'bot', name: `Dartbot ${lvl}`, level: lvl, team: 1 });
    }
    ui.setup = { type: 'x01', opts: { ...GAMES.x01.defaults, ...(db.settings.lastSetup?.x01?.opts || {}), start: 501 }, parts, teams: false };
    startFromSetup();
  },
  opt: d => { ui.setup.opts[d.key] = JSON.parse(d.value); render(); },
  teams: d => {
    ui.setup.teams = JSON.parse(d.value);
    ui.setup.parts.forEach((p, i) => (p.team = i % 2));
    render();
  },
  'part-team': d => { const p = ui.setup.parts[+d.i]; p.team = 1 - p.team; render(); },
  'part-up': d => { const a = ui.setup.parts, i = +d.i; [a[i - 1], a[i]] = [a[i], a[i - 1]]; render(); },
  'part-del': d => { ui.setup.parts.splice(+d.i, 1); render(); },
  shuffle: () => {
    const a = ui.setup.parts;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    render();
  },
  'add-profile': d => { const p = getPlayer(d.id); ui.setup.parts.push({ ...partFromPlayer(p), team: ui.setup.parts.length % 2 }); render(); },
  'add-guest': () => {
    const el = document.getElementById('guest-name');
    const name = el.value.trim() || `Gast ${ui.setup.parts.filter(p => p.kind === 'guest').length + 1}`;
    ui.setup.parts.push({ kind: 'guest', name, team: ui.setup.parts.length % 2 });
    render();
  },
  'add-new-profile': () => {
    const el = document.getElementById('guest-name');
    const name = el.value.trim();
    if (!name) { el.focus(); return toast('Bitte einen Namen eingeben'); }
    if (db.players.some(p => p.name.toLowerCase() === name.toLowerCase())) return toast('Name existiert bereits', 'bad');
    const p = addPlayer(name);
    ui.setup.parts.push({ ...partFromPlayer(p), team: ui.setup.parts.length % 2 });
    render();
  },
  'add-bot': () => {
    const lvl = +document.getElementById('bot-level').value;
    db.settings.lastBot = lvl;
    const same = ui.setup.parts.filter(p => p.kind === 'bot' && p.level === lvl).length;
    ui.setup.parts.push({ kind: 'bot', name: `Dartbot ${lvl}${same ? ' (' + (same + 1) + ')' : ''}`, level: lvl, team: ui.setup.parts.length % 2 });
    save();
    render();
  },
  start: () => startFromSetup(),

  quit: () => openModal({
    title: 'Spiel verlassen?', text: 'Du kannst das Spiel später auf der Startseite fortsetzen oder es jetzt verwerfen.',
    buttons: [
      { label: 'Weiterspielen', cls: 'ghost' },
      { label: 'Verwerfen', cls: 'danger', fn: () => { db.current = null; save(); go('#/'); } },
      { label: 'Pausieren', cls: 'primary', fn: () => go('#/') },
    ],
  }),
  undo: () => undo(),
  'toggle-input': () => {
    db.settings.inputMode = db.settings.inputMode === 'total' ? 'darts' : 'total';
    if (db.current?.state.leg?.cur.length && db.settings.inputMode === 'total') {
      // angefangene Einzeldart-Aufnahme verwerfen
      db.current.state.leg.cur = [];
    }
    save();
    render();
  },
  kp: d => { if (ui.input.length < 3) ui.input = (ui.input + d.v).replace(/^0+(?=\d)/, ''); render(); },
  'kp-del': () => { ui.input = ui.input.slice(0, -1); render(); },
  'kp-ok': () => submitKeypad(),
  'kp-quick': d => submitKeypad(+d.v),
  mod: d => { ui.mod = ui.mod === +d.v ? 1 : +d.v; render(); },
  dart: d => {
    const n = +d.n;
    const t = n === 0 ? throwOf(0, 0) : throwOf(n, d.m ? +d.m : ui.mod);
    ui.mod = 1;
    act(st => throwDart(st, t));
  },
  hit: d => act(st => trainingInput(st, +d.v)),

  rematch: d => rematch(d.id),
  'delete-game': d => confirmBox('Spiel löschen?', 'Das Spiel wird aus der Historie und allen Statistiken entfernt.', 'Löschen', () => {
    db.games = db.games.filter(g => g.id !== d.id);
    save();
    go('#/stats');
  }),
  'rename-player': d => {
    const p = getPlayer(d.id);
    openModal({
      title: 'Spieler umbenennen', html: `<input id="rename-input" class="input full" value="${esc(p.name)}" maxlength="20">`,
      buttons: [{ label: 'Abbrechen', cls: 'ghost' }, {
        label: 'Speichern', cls: 'primary', fn: vals => {
          const v = vals['rename-input']?.trim();
          if (v) { p.name = v; save(); render(); }
        },
      }],
    });
  },
  'player-color': d => { getPlayer(d.id).color = d.c; save(); render(); },
  'delete-player': d => confirmBox('Spieler löschen?', 'Das Profil wird entfernt. Gespielte Spiele bleiben in der Historie erhalten.', 'Löschen', () => {
    deletePlayer(d.id);
    go('#/players');
  }),
  sort: d => { ui.statsSort = d.k; render(); },
  setting: d => { db.settings[d.key] = JSON.parse(d.value); save(); render(); },
  export: () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dart-counter-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  reset: () => confirmBox('Alle Daten löschen?', 'Spieler, Spiele und Einstellungen werden unwiderruflich gelöscht.', 'Alles löschen', () => { resetAll(); go('#/'); }),
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el || el.disabled) return;
  const fn = actions[el.dataset.action];
  if (fn) fn(el.dataset, el, e);
});

document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form="add-player"]');
  if (!f) return;
  e.preventDefault();
  const el = document.getElementById('new-player');
  const name = el.value.trim();
  if (!name) return;
  if (db.players.some(p => p.name.toLowerCase() === name.toLowerCase())) return toast('Name existiert bereits', 'bad');
  addPlayer(name);
  toast(`${esc(name)} angelegt`);
  render();
  document.getElementById('new-player')?.focus();
});

document.addEventListener('change', e => {
  if (e.target.id !== 'import-file') return;
  const file = e.target.files[0];
  if (!file) return;
  file.text().then(txt => {
    try {
      importData(txt);
      toast('Daten importiert');
      render();
    } catch (err) {
      toast('Import fehlgeschlagen: ' + esc(err.message), 'bad', 3000);
    }
  });
});

document.addEventListener('keydown', e => {
  if (ui.modal) {
    if (e.key === 'Escape') closeModal();
    if (e.key === 'Enter') {
      const i = ui.modal.buttons.length - 1;
      if (ui.modal.buttons[i].fn) { e.preventDefault(); pressModal(i); }
    }
    return;
  }
  if (route.name !== 'game' || !db.current || e.target.matches('input, select, textarea')) return;
  const st = db.current.state;
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); return undo(); }
  if (isBotTurn(st)) return;
  const usesKeypad = (st.type === 'x01' && db.settings.inputMode === 'total') || st.type === 'power' || st.type === 'c121';
  if (usesKeypad) {
    if (/^\d$/.test(e.key)) actions.kp({ v: e.key });
    else if (e.key === 'Backspace') actions['kp-del']();
    else if (e.key === 'Enter') submitKeypad();
  } else if (st.type !== 'x01') {
    const max = st.type === 'atc' ? (st.config.jumps ? 3 : 1) : 3;
    if (/^\d$/.test(e.key) && +e.key <= max) act(s => trainingInput(s, +e.key));
    else if (e.key === 'Backspace') undo();
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && route.name === 'game') { ui.wake = null; keepAwake(); }
});

render();
