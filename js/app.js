import { db, save, uid, getPlayer, addPlayer, deletePlayer, exportData, importData, resetAll, COLORS } from './store.js';
import { newX01, submitTotal, throwDart, activeIndex, curScore, x01Results, validTotal, avg } from './x01.js';
import { newTraining, trainingInput, trainingResults, variantOf, dlabel, pct } from './training.js';
import { checkoutRoute, minDarts, throwOf } from './checkout.js';
import { chooseTarget, throwAt, BOT_LEVELS } from './bot.js';
import { x01Agg, trainingAgg, gamesOf, trainingBoards, rangeStart, x01Matches, trainingHistory, bucketUnit, bucketRange, groupBy } from './stats.js';
import { lineChart, barChart, resetCharts, chartWidth } from './charts.js';
import { sync, initSync, signIn, signOut, statusText } from './sync.js';
import { rulesHtml } from './rules.js';
import { AVATARS, avatar, avatarSvg } from './avatars.js';
import { caller, englishVoices, onVoices, warmUp } from './caller.js';

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
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>',
  team: '<circle cx="7" cy="8" r="2.6"/><circle cx="17" cy="8" r="2.6"/><path d="M2.5 18c.5-2.7 2.2-4.2 4.5-4.2s4 1.5 4.5 4.2M12.5 18c.5-2.7 2.2-4.2 4.5-4.2s4 1.5 4.5 4.2"/>',
  cloud: '<path d="M7 18a5 5 0 1 1 .9-9.9A6 6 0 0 1 19 10a4 4 0 0 1-1 8z"/>',
};
const icon = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

/* ---------- Spieldefinitionen ---------- */

const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => [a + i, String(a + i)]);
const DOUBLE_CHOICES = [...Array.from({ length: 20 }, (_, i) => [i + 1, 'D' + (i + 1)]), [25, 'Bull']];

const GAMES = {
  x01: {
    name: 'X01', cat: 'match', desc: '301 · 501 · 701 mit Legs, Sets, Double Out', bots: true, teams: true,
    defaults: { start: 501, in: 'single', out: 'double', format: 'legs', legs: 3, sets: 3, throwOff: 'order' },
    options: [
      { key: 'start', label: 'Startpunkte', choices: [[101, '101'], [301, '301'], [501, '501'], [701, '701'], [901, '901']] },
      { key: 'in', label: 'Check-In', choices: [['single', 'Straight In'], ['double', 'Double In']] },
      { key: 'out', label: 'Check-Out', choices: [['double', 'Double Out'], ['single', 'Single Out'], ['master', 'Master Out']] },
      { key: 'format', label: 'Format', choices: [['legs', 'Legs'], ['sets', 'Sets']] },
      { key: 'legs', label: o => (o.format === 'sets' ? 'Legs pro Set (First to)' : 'Legs (First to)'), choices: range(1, 7) },
      { key: 'sets', label: 'Sets (First to)', choices: range(1, 5), show: o => o.format === 'sets' },
      { key: 'throwOff', label: 'Wer beginnt?', choices: [['order', 'Reihenfolge'], ['bull', 'Ausbullen']] },
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

const ui = { setup: null, input: '', mod: 1, modal: null, botTimer: null, statsSort: 'avg', range: 'all', wake: null };

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
    <div class="modal ${m.sheet ? 'sheet' : ''}" role="dialog" aria-modal="true">
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


/* ---------- Rendering ---------- */

function render() {
  const r = route.name;
  if (r !== 'game') stopBot();
  resetCharts();
  let html;
  switch (r) {
    case 'play': html = route.arg && GAMES[route.arg] ? viewSetup(route.arg) : (go('#/'), ''); break;
    case 'bulloff': html = ui.bull ? viewBullOff() : (go('#/'), ''); break;
    case 'game': html = db.current ? viewGame() : (go('#/'), ''); break;
    case 'result': html = viewResult(route.arg); break;
    case 'players': html = viewPlayers(); break;
    case 'player': html = viewPlayer(route.arg); break;
    case 'stats': html = viewStats(); break;
    case 'settings': html = viewSettings(); break;
    default: html = viewHome();
  }
  const inGame = r === 'game';
  const flow = r === 'play' || r === 'bulloff';
  app.innerHTML = inGame ? html : `<main class="page ${flow ? 'with-cta' : ''}">${html}</main>${flow ? '' : nav(r)}`;
  if (r === 'bulloff') scheduleBullBot();
  document.body.classList.toggle('in-game', inGame);
  if (inGame) { scheduleBot(); keepAwake(); } else releaseAwake();
}

function nav(r) {
  const item = (hash, name, ic, label) =>
    `<a href="${hash}" class="nav-item ${r === name || (name === 'players' && r === 'player') ? 'active' : ''}">${icon(ic)}<span>${label}</span></a>`;
  return `<nav class="nav">
    ${item('#/', 'home', 'target', 'Spielen')}
    ${item('#/players', 'players', 'users', 'Spieler')}
    ${item('#/stats', 'stats', 'chart', 'Statistik')}
    ${item('#/settings', 'settings', 'settings', 'Optionen')}
  </nav>`;
}

const pageHead = (title, back, extra = '') => `<header class="page-head">
  ${back ? `<a class="icon-btn" href="${back}" aria-label="Zurück">${icon('back')}</a>` : ''}
  <h1>${title}</h1>${extra}</header>`;

const dot = color => `<span class="dot" style="--c:${color}"></span>`;

/** Kleines Profil-Symbol eines Spielers (leer, wenn keins gewählt ist). */
const miniIcon = pid => {
  const ic = pid && getPlayer(pid)?.icon;
  return ic ? avatarSvg(ic).replace('class="ico"', 'class="ico xs pico"') : '';
};

/* ---------- Start (Spiel-Hub) ---------- */

const X01_MODES = [
  ['solo', 'user', 'Solo', 'allein üben'],
  ['versus', 'users', 'Gegner', 'mit Freunden'],
  ['bot', 'bot', 'Dartbot', () => `Stufe ${db.settings.lastBot || 5}`],
  ['doubles', 'team', 'Doppel', 'Team gegen Team'],
];

function viewHome() {
  const cur = db.current?.state;
  const recent = db.games.slice(-3).reverse();
  const start = homeStart();
  const trainings = Object.entries(GAMES).filter(([, g]) => g.cat === 'training');
  return `
  <header class="hero">
    <div class="hero-stripes" aria-hidden="true"></div>
    <div class="kicker">Dart Counter</div>
    <h1 class="hero-title">Game<span>On.</span></h1>
  </header>

  ${cur ? `<a class="go-bar" href="#/game">
      <span><small>Weiterspielen</small>${esc(gameTitle(cur))}</span>${icon('play', 'go-ico')}</a>
    <div class="go-sub"><span class="muted">${esc(cur.players.map(p => p.name).join(' · '))}</span>
      <button class="link-btn" data-action="discard-current">Verwerfen</button></div>` : ''}

  <section class="block">
    <div class="block-head"><h2>X01 <em>Match</em></h2>${infoBtn('x01')}</div>
    <div class="score-pick" role="group" aria-label="Startpunkte">${[301, 501, 701].map(v =>
      `<button class="${start === v ? 'on' : ''}" data-action="home-start" data-v="${v}">${v}</button>`).join('')}</div>
    <div class="mode-grid">${X01_MODES.map(([k, ic, label, sub]) => `
      <button class="mode-tile" data-action="setup" data-type="x01" data-preset="${k}">
        ${icon(ic)}<b>${label}</b><span>${typeof sub === 'function' ? sub() : sub}</span></button>`).join('')}
    </div>
  </section>

  <section class="block">
    <div class="block-head"><h2>Training</h2></div>
    <div class="strips">${trainings.map(([k, g]) => `
      <div class="strip">
        <button class="strip-main" data-action="setup" data-type="${k}">
          <span class="strip-n">${GAME_ART[k]}</span>
          <span class="strip-text"><b>${g.name}</b><span>${g.desc}</span></span>
        </button>
        ${infoBtn(k)}
      </div>`).join('')}
    </div>
  </section>

  ${!db.players.length ? `<a class="panel empty-cta" href="#/players">${icon('user')}<div><b>Spielerprofile anlegen</b>
    <div class="muted small">Dann werden Averages, Checkout-Quoten und Trainingsbestwerte für jeden Spieler gespeichert.</div></div></a>` : ''}

  ${recent.length ? `<section class="block">
    <div class="block-head"><h2>Zuletzt</h2><a class="text-link" href="#/stats">Alle Spiele</a></div>
    <div class="list">${recent.map(gameRow).join('')}</div></section>` : ''}`;
}

const infoBtn = type => `<button class="icon-btn info-btn" data-action="rules" data-type="${type}" aria-label="So funktioniert ${esc(GAMES[type].name)}" title="Regeln & Erklärung">${icon('info')}</button>`;

function homeStart() {
  return db.settings.lastSetup?.x01?.opts?.start || 501;
}

/** Aktuelle Einrichtung sofort merken – bleibt bis zur nächsten Änderung erhalten. */
function rememberSetup() {
  const s = ui.setup;
  db.settings.lastSetup = { ...db.settings.lastSetup, [s.type]: { opts: s.opts, parts: s.parts, teams: s.teams } };
  save();
}

function showRules(type) {
  openModal({ title: `So funktioniert ${GAMES[type].name}`, html: rulesHtml(type), sheet: true, buttons: [{ label: 'Verstanden', cls: 'primary' }] });
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
  if (st.type === 'x01') return x01Summary(st.config);
  return variantOf(st.type, st.config).label;
}

function x01Summary(c) {
  const out = { double: 'Double Out', single: 'Single Out', master: 'Master Out' }[c.out];
  return `${c.start} · ${c.in === 'double' ? 'Double In · ' : ''}${out} · First to ${c.format === 'sets' ? `${c.sets} Sets` : `${c.legs} Leg${c.legs > 1 ? 's' : ''}`}`;
}

/* ---------- Spiel einrichten ---------- */

function initSetup(type) {
  const def = GAMES[type];
  const last = db.settings.lastSetup?.[type];
  const parts = (last?.parts || [])
    .filter(p => p.kind !== 'human' || getPlayer(p.playerId))
    .filter(p => def.bots || p.kind !== 'bot');
  if (!parts.length && db.players[0]) parts.push(partFromPlayer(db.players[0]));
  ui.setup = { type, opts: { ...def.defaults, ...(last?.opts || {}) }, parts, teams: !!(last?.teams && def.teams) };
}

/** Voreinstellungen aus den Schnellwahl-Knöpfen der Startseite. */
function applyPreset(preset) {
  const s = ui.setup;
  s.opts.start = homeStart();
  const people = s.parts.filter(p => p.kind !== 'bot');
  const first = people[0] || (db.players[0] ? partFromPlayer(db.players[0]) : { kind: 'guest', name: 'Spieler 1' });
  const lvl = db.settings.lastBot || 5;
  if (preset === 'solo') { s.parts = [first]; s.teams = false; }
  if (preset === 'versus') { s.parts = people.length ? people : [first]; s.teams = false; }
  if (preset === 'bot') { s.parts = [first, { kind: 'bot', name: `Dartbot ${lvl}`, level: lvl }]; s.teams = false; }
  if (preset === 'doubles') { s.teams = true; }
  s.parts.forEach((p, i) => (p.team = i % 2));
}

const partFromPlayer = p => ({ kind: 'human', playerId: p.id, name: p.name, team: 0 });

function partName(p) {
  if (p.kind === 'human') return getPlayer(p.playerId)?.name || p.name;
  return p.name;
}
function partColor(p, i) {
  if (p.kind === 'human') return getPlayer(p.playerId)?.color || COLORS[i % COLORS.length];
  if (p.kind === 'bot') return '#94a3b8';
  return COLORS[i % COLORS.length];
}

function viewSetup(type) {
  if (!ui.setup || ui.setup.type !== type) initSetup(type);
  const s = ui.setup, def = GAMES[type];
  const opts = def.options.filter(o => !o.show || o.show(s.opts)).map(o => `
    <div class="opt"><label>${typeof o.label === 'function' ? o.label(s.opts) : o.label}</label>
    <div class="seg ${o.choices.length > 6 ? 'wrap' : ''}">${o.choices.map(([v, l]) =>
      `<button class="${s.opts[o.key] === v ? 'on' : ''}" data-action="opt" data-key="${o.key}" data-value="${J(v)}">${l}</button>`).join('')}</div></div>`).join('');

  // Spieler-Auswahl: Profile antippen (Reihenfolge = Wurfreihenfolge), Gäste/Bots mit ✕ entfernen
  const selectedChips = s.parts.map((p, i) => (p.kind === 'human'
    ? `<button class="pchip on" data-action="toggle-player" data-id="${p.playerId}" style="--c:${partColor(p, i)}" aria-pressed="true"><span class="num">${i + 1}</span>${miniIcon(p.playerId)}${esc(partName(p))}</button>`
    : `<button class="pchip on" data-action="part-del" data-i="${i}" style="--c:${partColor(p, i)}" aria-label="${esc(partName(p))} entfernen">
      <span class="num">${i + 1}</span>${p.kind === 'bot' ? icon('bot', 'xs') + ' ' : ''}${esc(partName(p))}${icon('x', 'xs')}</button>`)).join('');
  const otherChips = db.players.filter(p => !s.parts.some(x => x.playerId === p.id))
    .map(p => `<button class="pchip" data-action="toggle-player" data-id="${p.id}" style="--c:${p.color}">${miniIcon(p.id) || dot(p.color)}${esc(p.name)}</button>`).join('');

  const teamBox = t => `<div class="team-box t${t}"><div class="team-title">Team ${t + 1}</div>
    ${s.parts.map((p, i) => (p.team === t ? `<button class="team-member" data-action="part-team" data-i="${i}">${dot(partColor(p, i))}${esc(partName(p))}<span class="muted">⇄</span></button>` : '')).join('') || '<span class="muted small">leer</span>'}</div>`;

  const err = setupError();
  const startLabel = type === 'x01' ? `${s.opts.start} starten` : `${def.name} starten`;
  return `${pageHead(def.name, '#/', `<button class="btn ghost sm" data-action="rules" data-type="${type}">${icon('info')} Regeln</button>`)}

  <section class="card">
    <div class="row between"><h3>Wer spielt?</h3>${s.parts.length > 1 ? `<button class="btn ghost sm" data-action="shuffle">${icon('shuffle')} Mischen</button>` : ''}</div>
    <p class="muted small">${db.players.length ? 'Tippe die Spieler in der Wurfreihenfolge an.' : 'Füge Gäste hinzu oder lege ein Profil an, um Statistiken zu speichern.'}</p>
    <div class="pick">${selectedChips}${otherChips}</div>
    <div class="add-row">
      <button class="chip add" data-action="dlg-guest">${icon('plus', 'xs')} Gast</button>
      <button class="chip add" data-action="dlg-profile">${icon('plus', 'xs')} Neues Profil</button>
      ${def.bots ? `<button class="chip add" data-action="dlg-bot">${icon('plus', 'xs')} Dartbot</button>` : ''}
    </div>
    ${def.teams && s.parts.length > 1 ? `<div class="seg full"><button class="${!s.teams ? 'on' : ''}" data-action="teams" data-value="false">Jeder gegen jeden</button><button class="${s.teams ? 'on' : ''}" data-action="teams" data-value="true">Doppel (Teams)</button></div>` : ''}
    ${s.teams ? `<div class="teams">${teamBox(0)}${teamBox(1)}</div><p class="muted small">Antippen wechselt das Team. Geworfen wird abwechselnd: A1 → B1 → A2 → B2.</p>` : ''}
  </section>

  <section class="card">
    <h3>Einstellungen</h3>
    ${opts}
  </section>

  <div class="setup-cta">
    ${err ? `<div class="cta-hint">${err}</div>` : ''}
    <button class="btn primary big full" data-action="start" ${err ? 'disabled' : ''}>${icon('play')} ${startLabel}</button>
  </div>`;
}

function setupError() {
  const s = ui.setup;
  if (!s.parts.length) return 'Wähle mindestens einen Spieler aus.';
  if (s.parts.length > 8) return 'Maximal 8 Teilnehmer.';
  if (!GAMES[s.type].bots && s.parts.some(p => p.kind === 'bot')) return 'Den Dartbot gibt es nur im X01.';
  if (s.parts.every(p => p.kind === 'bot')) return 'Mindestens ein Mensch muss mitspielen.';
  if (s.teams) {
    const a = s.parts.filter(p => p.team === 0).length, b = s.parts.length - a;
    if (!a || !b) return 'Beide Teams brauchen mindestens einen Spieler.';
  }
  return '';
}

function startFromSetup() {
  const s = ui.setup;
  if (setupError()) return;
  rememberSetup();
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
    if (s.opts.throwOff === 'bull' && sides.length > 1) {
      ui.bull = { opts: { ...s.opts }, players, sides, res: sides.map(() => null), active: sides.map((_, i) => i), winner: null };
      return go('#/bulloff');
    }
    st = newX01({ ...s.opts }, players, sides);
  } else {
    st = newTraining(s.type, { ...s.opts }, players);
  }
  launch(st);
}

function launch(st, announce = true) {
  db.current = { state: st, undo: [] };
  save();
  if (st.type === 'x01' && announce) caller.gameOn(st.players[activeIndex(st)].name);
  go('#/game');
}

/* ---------- Ausbullen ---------- */

const BULL_RANK = { bull: 3, outer: 2, miss: 1 };
const BULL_LABEL = { bull: 'Bullseye', outer: 'Single Bull', miss: 'Daneben' };

const contestantName = (b, i) => b.sides[i].members.map(m => b.players[m].name).join(' & ');
const contestantThrower = (b, i) => b.players[b.sides[i].members[0]];

function bullStatus(b) {
  if (b.winner != null) return { winner: b.winner };
  if (b.active.some(i => b.res[i] == null)) return {};
  const best = Math.max(...b.active.map(i => BULL_RANK[b.res[i]]));
  const top = b.active.filter(i => BULL_RANK[b.res[i]] === best);
  return top.length === 1 ? { winner: top[0] } : { tie: top };
}

function viewBullOff() {
  const b = ui.bull, stt = bullStatus(b);
  const rows = b.sides.map((S, i) => {
    const pl = contestantThrower(b, i), r = b.res[i], out = !b.active.includes(i);
    const right = out ? '<span class="muted">raus</span>'
      : r ? `<span class="bull-res ${r}">${BULL_LABEL[r]}</span>`
      : pl.kind === 'bot' ? `<span class="muted">${icon('bot', 'xs')} wirft …</span>`
      : `<div class="bull-btns">
          <button class="bull-btn bull" data-action="bull-res" data-i="${i}" data-r="bull">Bull</button>
          <button class="bull-btn outer" data-action="bull-res" data-i="${i}" data-r="outer">25</button>
          <button class="bull-btn miss" data-action="bull-res" data-i="${i}" data-r="miss">Daneben</button></div>`;
    return `<div class="bull-row ${stt.winner === i ? 'win' : ''} ${out ? 'out' : ''}" style="--pc:${b.players[S.members[0]].color}">
      <div class="bull-name">${S.members.length > 1 ? `<small>${esc(S.name)} · wirft: ${esc(pl.name)}</small>` : ''}<b>${esc(contestantName(b, i))}</b></div>${right}</div>`;
  }).join('');
  const tie = stt.tie ? `<section class="card bull-tie"><h3>Gleichstand!</h3>
      <p class="muted small">Wer war näher am Bull? Antippen – oder die Beteiligten werfen nochmal.</p>
      <div class="chips">${stt.tie.map(i => `<button class="chip" data-action="bull-pick" data-i="${i}">${esc(contestantName(b, i))} war näher</button>`).join('')}</div>
      <button class="btn" data-action="bull-again">${icon('undo')} Nochmal werfen</button></section>` : '';
  return `${pageHead('Ausbullen', '#/play/x01')}
    <p class="muted">Jeder wirft einen Dart aufs Bull. Wer am nächsten dran ist, beginnt das Match.</p>
    <div class="bull-list">${rows}</div>
    ${tie}
    <div class="setup-cta">
      ${stt.winner == null ? `<div class="cta-hint">${stt.tie ? 'Gleichstand auflösen …' : 'Ergebnisse eintragen …'}</div>` : ''}
      <button class="btn primary big full" data-action="bull-start" ${stt.winner == null ? 'disabled' : ''}>${icon('play')} ${stt.winner == null ? 'Anwurf ausbullen' : `${esc(contestantName(b, stt.winner))} beginnt`}</button>
    </div>`;
}

function scheduleBullBot() {
  const b = ui.bull;
  if (!b || ui.bullTimer || route.name !== 'bulloff') return;
  const i = b.active.find(k => b.res[k] == null && contestantThrower(b, k).kind === 'bot');
  if (i == null) return;
  ui.bullTimer = setTimeout(() => {
    ui.bullTimer = null;
    if (route.name !== 'bulloff' || ui.bull !== b) return;
    const hit = throwAt(throwOf(25, 2), contestantThrower(b, i).level, true);
    b.res[i] = hit.n === 25 ? (hit.m === 2 ? 'bull' : 'outer') : 'miss';
    render();
  }, 900);
}

function startAfterBull() {
  const b = ui.bull, { winner } = bullStatus(b);
  if (winner == null) return;
  const sides = [...b.sides.slice(winner), ...b.sides.slice(0, winner)];
  const st = newX01(b.opts, b.players, sides);
  ui.bull = null;
  caller.bullWinner(contestantName({ ...b, sides }, 0));
  launch(st, false);
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
  <button class="icon-btn" data-action="rules" data-type="${db.current.state.type}" aria-label="Regeln" title="Regeln">${icon('info')}</button>
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
  const actSide = L.turn;
  const actRem = L.rem[actSide] - curScore(st);
  const actOpened = L.opened[actSide] || L.cur.some(d => d.score > 0);
  const route = actOpened ? checkoutRoute(actRem, 3 - L.cur.length, c.out) : null;

  const rows = st.sides.map((S, si) => {
    const isAct = si === actSide;
    const rem = L.rem[si] - (isAct ? curScore(st) : 0);
    const mi = S.members[S.ptr];
    const ps = st.stats[mi];
    const color = st.players[S.members[0]].color;
    const names = S.members.map((m, k) => `<span class="${k === S.ptr ? 'cur' : ''}">${st.players[m].kind === 'bot' ? icon('bot', 'xs') : miniIcon(st.players[m].playerId)}${esc(st.players[m].name)}</span>`).join('<i>&</i>');
    const last = L.lastScores?.[si];
    return `<div class="sb-row ${isAct ? 'act' : ''}" style="--pc:${color}">
      <div class="sb-name"><span class="sb-names">${names}</span>
        <span class="sb-meta">Ø ${f1(avg(ps.points, ps.darts))} · ${L.sideDarts[si]} Darts${last != null ? ` · Letzte ${last}` : ''}${!L.opened[si] ? ' · Double In' : ''}</span></div>
      ${sets ? `<div class="sb-box set">${S.sets}</div>` : ''}
      <div class="sb-box">${S.legs}</div>
      <div class="sb-score">${rem}</div>
    </div>`;
  }).join('');

  const player = st.players[act];
  const slots = [0, 1, 2].map(i => `<span class="slot ${L.cur[i] ? 'filled' : ''}">${L.cur[i] ? L.cur[i].label : ''}</span>`).join('');
  const lastTxt = st.last ? `${esc(st.players[st.last.pi].name)}: ${st.last.labels ? st.last.labels.join(' · ') + ' = ' : ''}${st.last.bust ? '<b class="bad">Bust</b>' : `<b>${st.last.score}</b>`}` : '';

  let pad;
  if (bot) pad = `<div class="pad bot-pad"><div class="bot-think">${icon('bot')}<b>${esc(player.name)}</b> wirft …</div><div class="slots">${slots}</div></div>`;
  else if (db.settings.inputMode === 'darts') pad = dartPad(st);
  else pad = keypad(x01Quick(st));

  return `<div class="game x01">
    ${gameBar(gameTitle(st), sub)}
    <div class="scoreboard n${Math.min(st.sides.length, 5)}">
      <div class="sb-legend"><span></span>${sets ? '<span>Sets</span>' : ''}<span>Legs</span><span></span></div>
      ${rows}
    </div>
    <div class="sb-info">
      <div class="sb-turn">${dot(player.color)}<b>${esc(player.name)}</b><span>am Wurf</span>
        ${db.settings.inputMode === 'darts' || bot ? `<span class="slots">${slots}</span>` : ''}</div>
      <div class="sb-route">${route ? route.map(t => `<span>${t.label}</span>`).join('') : ''}</div>
      ${lastTxt ? `<div class="sb-last">${lastTxt}</div>` : ''}
    </div>
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
    return `<div class="sb-row ${i === st.turn && !st.finished ? 'act' : ''} ${q.done ? 'done' : ''}" style="--pc:${x.color}">
      <div class="sb-name"><span class="sb-names"><span class="cur">${miniIcon(x.playerId)}${esc(x.name)}</span></span><span class="sb-meta">${sub}</span></div>
      <div class="sb-score sm">${main}</div></div>`;
  }).join('');

  let focus = '', pad = '';
  switch (st.type) {
    case 'atc': {
      const t = st.targets[p.idx];
      focus = focusPanel('Ziel', targetLabel(st, t), `${p.idx + 1} / ${st.targets.length}`);
      pad = st.config.jumps
        ? hitButtons([[0, 'Daneben', 'miss'], [1, 'Single'], [2, 'Double'], [3, 'Triple']])
        : hitButtons([[0, 'Daneben', 'miss'], [1, 'Treffer', 'hit']]);
      break;
    }
    case 'bobs27': {
      const t = st.targets[p.idx];
      focus = focusPanel(`Runde ${p.idx + 1}/21`, dlabel(t), `Punkte <b>${p.score}</b> · Wert ${t === 25 ? 50 : t * 2}`);
      pad = hitButtons([[0, '0', 'miss'], [1, '1'], [2, '2'], [3, '3']], 'Treffer');
      break;
    }
    case 'power':
      focus = focusPanel('Aufnahme', `${p.n + 1}<small>/${st.config.rounds}</small>`, `Gesamt <b>${p.total}</b> · Ø ${f1(p.n ? p.total / p.n : 0)}`);
      pad = keypad([60, 81, 85, 100, 140, 180].map(v => ({ v, label: String(v) })));
      break;
    case 'doubles': {
      const t = st.targets[p.idx];
      focus = focusPanel(`Ziel ${p.idx + 1}/${st.targets.length}`, dlabel(t), `Quote ${pct(p.hits, p.darts)}`);
      pad = hitButtons([[0, '0', 'miss'], [1, '1'], [2, '2'], [3, '3']], 'Treffer (3 Darts)');
      break;
    }
    case 'c121': {
      const route = checkoutRoute(p.rem, 3, 'double');
      focus = focusPanel(`Ziel ${p.target} · Aufnahme ${p.visit + 1}/3`, p.rem,
        `<span class="sb-route inline">${route ? route.map(t => `<span>${t.label}</span>`).join('') : ''}</span>`);
      pad = keypad(route ? [{ v: p.rem, label: `Check ${p.rem}`, cls: 'accent' }] : []);
      break;
    }
  }
  const slots = st.type === 'atc' ? `<span class="slots">${[0, 1, 2].map(i => `<span class="slot ${st.cur[i] != null ? (st.cur[i] > 0 ? 'filled hit' : 'filled') : ''}">${st.cur[i] != null ? (st.cur[i] > 0 ? '✔' : '✕') : ''}</span>`).join('')}</span>` : '';
  return `<div class="game training">
    ${gameBar(variantOf(st.type, st.config).label, st.players.length > 1 ? `Runde ${st.round}` : '')}
    <div class="scoreboard n${Math.min(st.players.length, 5)}">${rows}</div>
    <div class="focus" style="--pc:${pl.color}">
      ${st.players.length > 1 ? `<div class="focus-who">${dot(pl.color)}<b>${esc(pl.name)}</b> am Wurf</div>` : ''}
      ${focus}
      <div class="focus-foot">${slots}<span class="sb-last">${st.last ? `<span class="${st.last.good ? 'good' : ''}">${esc(st.last.text)}</span>` : ''}</span></div>
    </div>
    ${pad}
  </div>`;
}

const focusPanel = (label, big, sub) => `<div class="focus-label">${label}</div><div class="focus-big">${big}</div><div class="focus-sub">${sub}</div>`;

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
    if (!st.finished && st.legEvent) {
      const S = st.sides[st.legEvent.side];
      const who = S.members.map(m => st.players[m].name).join(' & ');
      toast(`${icon('trophy')} <b>${esc(who)}</b> gewinnt ${st.legEvent.setWon ? 'das Set' : 'das Leg'}<br><span class="small">${st.legEvent.darts} Darts · Checkout ${st.legEvent.checkout}</span>`, 'big', 2600);
      caller.leg(who, legBefore, st.legEvent.setWon);
    }
    return;
  }
  if (v.bust) {
    caller.score(0, true);
    toast('Bust!', 'bad');
  } else {
    caller.score(v.score);
    if (v.score === 180) toast('🎯 ONE HUNDRED AND EIGHTY!', 'big', 2200);
  }
  // Ansager: „Paul, you require 121“, wenn der nächste Spieler checken kann
  const side = L.turn, rem = L.rem[side];
  if (L.opened[side] && checkoutRoute(rem, 3, st.config.out)) caller.require(st.players[activeIndex(st)].name, rem);
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
    caller.match(w.members.map(m => st.players[m].name).join(' and '));
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
  if (st.type === 'x01') caller.gameOn(st.players[activeIndex(st)].name);
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
    return `<a class="list-row" href="#/player/${p.id}">${avatar(p)}
      <span class="grow"><b>${esc(p.name)}</b><span class="muted small">${a.games} Matches · ${t} Trainings</span></span>
      <span class="tmain">${a.darts ? f1(a.avg) : '–'}<small> Ø</small></span></a>`;
  }).join('')}</div>` : '<p class="muted center">Noch keine Spieler angelegt.</p>'}`;
}

function viewPlayer(id) {
  const p = getPlayer(id);
  if (!p) return `${pageHead('Spieler', '#/players')}<p class="muted">Spieler nicht gefunden.</p>`;
  const a = x01Agg(id), tr = trainingAgg(id), games = gamesOf(id).slice(-10).reverse();
  const tile = (label, value, sub = '') => `<div class="stat"><div class="stat-v">${value}</div><div class="stat-l">${label}</div>${sub ? `<div class="muted small">${sub}</div>` : ''}</div>`;
  return `${pageHead(`${avatar(p)}${esc(p.name)}`, '#/players',
    `<button class="icon-btn" data-action="rename-player" data-id="${id}" aria-label="Umbenennen">${icon('edit')}</button>`)}
  <section class="card">
    <h3>Symbol</h3>
    <div class="icon-pick">
      <button class="${!p.icon ? 'on' : ''}" style="--c:${p.color}" data-action="player-icon" data-id="${id}" data-icon="" title="Anfangsbuchstabe" aria-label="Anfangsbuchstabe">${esc(p.name.charAt(0).toUpperCase())}</button>
      ${Object.entries(AVATARS).map(([k, [label]]) => `<button class="${p.icon === k ? 'on' : ''}" style="--c:${p.color}" data-action="player-icon" data-id="${id}" data-icon="${k}" title="${label}" aria-label="${label}">${avatarSvg(k)}</button>`).join('')}
    </div>
    <h3>Farbe</h3>
    <div class="swatches">${COLORS.map(c => `<button class="swatch ${c === p.color ? 'on' : ''}" style="--c:${c}" data-action="player-color" data-id="${id}" data-c="${c}" aria-label="Farbe ${c}"></button>`).join('')}</div>
  </section>

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
`
    : '<p class="muted">Noch keine X01-Matches.</p>'}

  <h3 class="section-title">Verlauf</h3>
  ${playerCharts(id)}

  <h3 class="section-title">Training</h3>
  ${tr.length ? `<div class="list">${tr.map(e => `<div class="list-row static"><span class="badge train">${GAME_ART[e.type]}</span>
    <span class="grow"><b>${esc(e.label)}</b><span class="muted small">${e.count}× gespielt · Schnitt ${f1(e.mean)} ${e.unit}</span></span>
    <span class="tmain">${fm(e.best)}<small> ${e.unit}</small></span></div>`).join('')}</div><p class="muted small">Rechts: Bestwert</p>` : '<p class="muted">Noch keine Trainings.</p>'}

  <h3 class="section-title">Letzte Spiele</h3>
  ${games.length ? `<div class="list">${games.map(gameRow).join('')}</div>` : '<p class="muted">–</p>'}

  <button class="btn ghost danger-text" data-action="delete-player" data-id="${id}">${icon('trash')} Spieler löschen</button>`;
}

/* ---------- Diagramme ---------- */

const DAY = 86400000;
const RANGES = [['30', '30 Tage'], ['90', '90 Tage'], ['365', '1 Jahr'], ['all', 'Alles']];

// Per Validator geprüft (Kontrast, Farbfehlsichtigkeit) gegen die Kartenflächen beider Designs
const CHART_COLORS = {
  dark: { avg: '#ef233c', f9: '#3987e5', ramp: ['#a3263a', '#dc2a44', '#ff7a88'] },
  light: { avg: '#dc1f36', f9: '#2a78d6', ramp: ['#ec7d8a', '#d63046', '#8f0d20'] },
};
const pal = () => CHART_COLORS.dark;

const rangeBar = () => `<div class="filter-row"><div class="seg">${RANGES.map(([v, l]) =>
  `<button class="${ui.range === v ? 'on' : ''}" data-action="range" data-v="${v}">${l}</button>`).join('')}</div></div>`;

const shortDate = ts => new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
const fullDate = ts => new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

function periodPoints(keys, unit) {
  const pts = keys.map(k => unit === 'month'
    ? { label: new Date(k).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }), tick: new Date(k).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }) }
    : { label: `Woche ${fullDate(k)} – ${fullDate(k + 6 * DAY)}`, tick: shortDate(k) });
  pts.header = unit === 'month' ? 'Monat' : 'Woche ab';
  return pts;
}

const chartCard = (title, sub, body) => `<section class="card chart-card"><div class="chart-head"><h3>${title}</h3>${sub ? `<span class="muted small">${sub}</span>` : ''}</div>${body}</section>`;
const axisNum = (v, axis) => (axis ? f0(v) : f1(v));

function multiWidth() {
  const page = Math.min(window.innerWidth, 920) - 32;
  return Math.max(220, window.innerWidth >= 640 ? Math.floor((page - 10) / 2) - 34 : page - 34);
}

function playerCharts(pid) {
  const since = rangeStart(ui.range);
  const ms = x01Matches(pid, since);
  const tr = trainingHistory(pid, since).filter(e => e.rows.length >= 2);
  const C = pal();
  let html = rangeBar();

  if (ms.length >= 2) {
    const pts = ms.map(m => ({ label: `${fmtDate(m.date)}${m.opp ? ' · vs. ' + m.opp : ''} · ${m.won ? 'Sieg' : 'Niederlage'}`, tick: shortDate(m.date) }));
    pts.header = 'Match';
    html += chartCard('Average je Match', `${ms.length} Matches`, lineChart({
      points: pts, fmt: axisNum, ariaLabel: `3-Dart-Average und First-9-Average der letzten ${ms.length} Matches`,
      series: [{ name: '3-Dart-Ø', color: C.avg, values: ms.map(m => m.avg) }, { name: 'First 9 Ø', color: C.f9, values: ms.map(m => m.f9) }],
    }));

    const dates = ms.map(m => m.date), unit = bucketUnit(dates), keys = bucketRange(dates, unit), groups = groupBy(ms, unit);
    const per = unit === 'month' ? 'Monat' : 'Woche';
    const sum = (k, f) => (groups.get(k) || []).reduce((a, m) => a + m[f], 0);
    const co = keys.map(k => (sum(k, 'coAtt') ? (sum(k, 'coDone') / sum(k, 'coAtt')) * 100 : null));
    html += chartCard(`Checkout-Quote je ${per}`, 'erfolgreiche Checks / Aufnahmen mit checkbarem Rest', barChart({
      points: periodPoints(keys, unit), max: 100, ariaLabel: `Checkout-Quote je ${per}`,
      fmt: (v, axis) => (axis ? v + ' %' : Math.round(v) + ' %'),
      capLabel: (i, t) => Math.round(t) + ' %',
      series: [{ name: 'Checkout-Quote', color: C.avg, values: co }],
    }));

    const hs = ['s100', 's140', 's180'].map(f => keys.map(k => sum(k, f)));
    if (hs.some(s => s.some(v => v > 0))) {
      html += chartCard(`Hohe Aufnahmen je ${per}`, '', barChart({
        points: periodPoints(keys, unit), ariaLabel: `Anzahl Aufnahmen ab 100, ab 140 und 180er je ${per}`,
        fmt: v => f0(v), capLabel: (i, t) => t,
        series: [{ name: '100–139', color: C.ramp[0], values: hs[0] }, { name: '140–179', color: C.ramp[1], values: hs[1] }, { name: '180', color: C.ramp[2], values: hs[2] }],
      }));
    }
  } else if (ms.length === 1) {
    html += '<p class="muted small">Ab 2 X01-Matches im gewählten Zeitraum erscheinen hier Verlaufsdiagramme.</p>';
  }

  if (tr.length) {
    html += `<div class="multiples">${tr.map(e => {
      const pts = e.rows.map(r => ({ label: fmtDate(r.date), tick: shortDate(r.date) }));
      pts.header = 'Datum';
      const best = e.better === 'low' ? Math.min(...e.rows.map(r => r.metric)) : Math.max(...e.rows.map(r => r.metric));
      return chartCard(esc(e.label), `Bestwert ${fm(best)} ${e.unit}${e.better === 'low' ? ' · weniger ist besser' : ''}`, lineChart({
        points: pts, width: multiWidth(), height: 160, area: true, ariaLabel: `${e.label}: Verlauf in ${e.unit}`,
        fmt: (v, axis) => (axis ? f0(v) : fm(v) + (e.unit === 'Ø' ? '' : ' ' + e.unit)),
        series: [{ name: e.unit, color: C.avg, values: e.rows.map(r => r.metric) }],
      }));
    }).join('')}</div>`;
  }

  if (ms.length < 2 && !tr.length) {
    html += `<p class="muted small">${ui.range === 'all' ? 'Noch zu wenige Spiele für Diagramme – ab 2 Matches bzw. 2 Trainings derselben Art geht’s los.' : 'Im gewählten Zeitraum gibt es zu wenige Spiele.'}</p>`;
  }
  return html;
}

function compareChart() {
  const since = rangeStart(ui.range);
  const ps = db.players.map(p => ({ p, ms: x01Matches(p.id, since) })).filter(x => x.ms.length).sort((a, b) => b.ms.length - a.ms.length).slice(0, 8);
  const dates = ps.flatMap(x => x.ms.map(m => m.date));
  if (!ps.length) return `${rangeBar()}<p class="muted small">Keine X01-Matches im gewählten Zeitraum.</p>`;
  const unit = bucketUnit(dates), keys = bucketRange(dates, unit);
  if (keys.length < 2) return `${rangeBar()}<p class="muted small">Der Average-Vergleich erscheint, sobald Matches aus mindestens zwei ${unit === 'month' ? 'Monaten' : 'Wochen'} vorliegen.</p>`;
  const series = ps.map(({ p, ms }) => {
    const g = groupBy(ms, unit);
    return {
      name: p.name, color: p.color,
      values: keys.map(k => {
        const rows = g.get(k);
        if (!rows) return null;
        const d = rows.reduce((a, m) => a + m.darts, 0);
        return d ? (rows.reduce((a, m) => a + m.points, 0) / d) * 3 : null;
      }),
    };
  });
  return rangeBar() + chartCard(`Average je ${unit === 'month' ? 'Monat' : 'Woche'}`, 'alle Spieler im Vergleich', lineChart({
    points: periodPoints(keys, unit), series, fmt: axisNum, ariaLabel: 'Average-Verlauf aller Spieler im Vergleich', endName: true,
  }));
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

  ${rows.length ? `<h3 class="section-title">Verlauf</h3>${compareChart()}` : ''}

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
    <div class="opt"><label>Caller (englische Ansage wie im TV)</label>${seg('speech', [[false, 'Aus'], [true, 'An']])}
      <p class="muted small">Sagt Scores an („One hundred and eighty!“), Checkouts („Paul, you require 121“) und „Game shot“.</p></div>
    ${'speechSynthesis' in window ? `<div class="opt"><label>Stimme</label>
      <div class="row gap wrap"><select id="caller-voice" class="input grow">
        <option value="">Automatisch (natürlichste Stimme)</option>
        ${englishVoices().map(v => `<option value="${esc(v.voiceURI)}" ${db.settings.callerVoice === v.voiceURI ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}
      </select><button class="btn" data-action="caller-test">Probehören</button></div></div>
    <div class="opt"><label>Tonhöhe · <span class="muted">${f1(db.settings.callerPitch ?? 0.8)}</span></label>
      <input type="range" id="caller-pitch" class="range" min="0.5" max="1.3" step="0.05" value="${db.settings.callerPitch ?? 0.8}"></div>
    <div class="opt"><label>Tempo · <span class="muted">${f1(db.settings.callerRate ?? 1)}</span></label>
      <input type="range" id="caller-rate" class="range" min="0.7" max="1.4" step="0.05" value="${db.settings.callerRate ?? 1}">
      <p class="muted small">Tipp: Eine männliche britische Stimme klingt am ehesten nach Caller (z. B. „Ryan“, „George“, „Daniel“ oder „Google UK English Male“). Stimmen mit „Online“ oder „Google“ im Namen klingen natürlicher, laden aber übers Internet und kommen leicht verzögert – Stimmen ohne diesen Zusatz liegen auf dem Gerät und sind sofort da. Auf dem iPhone unter Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen eine „Erweitert“-Stimme (Englisch UK) laden.</p></div>` : ''}
  </section>
  ${syncCard()}
  <section class="card">
    <h3>Daten</h3>
    <p class="muted small">${sync.user ? 'Spieler und Spiele werden zusätzlich in deinem Cloud-Konto gespeichert.' : 'Alle Daten liegen lokal in diesem Browser.'} Mit dem Export sicherst du alles als Datei; beim Import werden die Daten mit den vorhandenen zusammengeführt.</p>
    <div class="row gap wrap">
      <button class="btn" data-action="export">Exportieren</button>
      <label class="btn">Importieren<input type="file" accept="application/json,.json" id="import-file" hidden></label>
      <button class="btn ghost danger-text" data-action="reset">Alles löschen</button>
    </div>
  </section>
  <p class="muted small center">Dart Counter · ${db.players.length} Spieler · ${db.games.length} Spiele gespeichert</p>`;
}

function syncCard() {
  let body;
  if (!sync.configured) {
    body = '<p class="muted small">Noch nicht eingerichtet. Sobald die Firebase-Konfiguration in <code>js/firebase-config.js</code> eingetragen ist, kannst du dich hier anmelden und Spieler &amp; Statistiken auf Handy, Tablet und Laptop teilen.</p>';
  } else if (!sync.ready && sync.status !== 'error') {
    body = '<p class="muted small">Lade …</p>';
  } else if (!sync.user) {
    body = `<p class="muted small">Melde dich auf allen Geräten mit demselben Google-Konto an – Spieler, Spiele und Statistiken werden dann automatisch abgeglichen. Vorhandene Daten auf diesem Gerät werden dabei übernommen.</p>
      <button class="btn primary" data-action="sync-login">${icon('cloud')} Mit Google anmelden</button>`;
  } else {
    body = `<div class="row gap wrap"><span class="grow"><b>${esc(sync.user.name || sync.user.email)}</b><span class="muted small block">${esc(sync.user.email || '')}</span></span>
      <button class="btn ghost" data-action="sync-logout">Abmelden</button></div>
      <p class="muted small">Ein laufendes Spiel bleibt auf dem Gerät, auf dem es gespielt wird. Sobald es beendet ist, erscheint es überall.</p>`;
  }
  return `<section class="card"><div class="row between"><h3>Synchronisation</h3>${sync.configured ? syncPill() : ''}</div>${body}
    ${sync.error ? `<p class="small bad">Fehler: ${esc(sync.error)}</p>` : ''}</section>`;
}

const syncPill = () => `<span class="sync-pill ${sync.status}" data-sync-status>${icon('cloud', 'xs')} ${statusText()}</span>`;

function onSyncChange(dataChanged) {
  if (dataChanged || route.name === 'settings') return render();
  document.querySelectorAll('[data-sync-status]').forEach(el => (el.outerHTML = syncPill()));
}

/* ---------- Event-Handling ---------- */

const actions = {
  'modal-close': (d, el, e) => { if (e.target === el) closeModal(); },
  'modal-btn': d => pressModal(+d.i),
  'discard-current': () => confirmBox('Spiel verwerfen?', 'Das laufende Spiel wird ohne Wertung beendet.', 'Verwerfen', () => { db.current = null; save(); render(); }),
  setup: d => {
    initSetup(d.type);
    if (d.preset) applyPreset(d.preset);
    go('#/play/' + d.type);
  },
  'home-start': d => {
    const last = db.settings.lastSetup?.x01 || {};
    db.settings.lastSetup = { ...db.settings.lastSetup, x01: { ...last, opts: { ...GAMES.x01.defaults, ...last.opts, start: +d.v } } };
    save();
    render();
  },
  rules: d => showRules(d.type),
  opt: d => {
    ui.setup.opts[d.key] = JSON.parse(d.value);
    rememberSetup();
    render();
  },
  teams: d => {
    ui.setup.teams = JSON.parse(d.value);
    ui.setup.parts.forEach((p, i) => (p.team = i % 2));
    render();
  },
  'part-team': d => { const p = ui.setup.parts[+d.i]; p.team = 1 - p.team; render(); },
  'part-del': d => { ui.setup.parts.splice(+d.i, 1); render(); },
  shuffle: () => {
    const a = ui.setup.parts;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    render();
  },
  'toggle-player': d => {
    const a = ui.setup.parts;
    const i = a.findIndex(p => p.kind === 'human' && p.playerId === d.id);
    if (i >= 0) a.splice(i, 1);
    else a.push({ ...partFromPlayer(getPlayer(d.id)), team: a.length % 2 });
    render();
  },
  'dlg-guest': () => {
    const n = ui.setup.parts.filter(p => p.kind === 'guest').length + 1;
    openModal({
      title: 'Gast hinzufügen',
      html: `<input id="dlg-name" class="input full" placeholder="Gast ${n}" maxlength="20" autocomplete="off"><p class="muted small">Gäste spielen mit, ihre Statistik wird aber nicht gespeichert.</p>`,
      buttons: [{ label: 'Abbrechen', cls: 'ghost' }, {
        label: 'Hinzufügen', cls: 'primary', fn: v => {
          ui.setup.parts.push({ kind: 'guest', name: (v['dlg-name'] || '').trim() || `Gast ${n}`, team: ui.setup.parts.length % 2 });
          render();
        },
      }],
    });
  },
  'dlg-profile': () => openModal({
    title: 'Neues Spielerprofil',
    html: '<input id="dlg-name" class="input full" placeholder="Name" maxlength="20" autocomplete="off"><p class="muted small">Für Profile werden Averages, Checkouts und Trainingswerte dauerhaft gespeichert.</p>',
    buttons: [{ label: 'Abbrechen', cls: 'ghost' }, {
      label: 'Anlegen', cls: 'primary', fn: v => {
        const name = (v['dlg-name'] || '').trim();
        if (!name) return toast('Bitte einen Namen eingeben');
        if (db.players.some(p => p.name.toLowerCase() === name.toLowerCase())) return toast('Name existiert bereits', 'bad');
        const p = addPlayer(name);
        ui.setup.parts.push({ ...partFromPlayer(p), team: ui.setup.parts.length % 2 });
        render();
      },
    }],
  }),
  'dlg-bot': () => openModal({
    title: 'Dartbot hinzufügen', text: 'Wähle die Spielstärke. Die Zahl ist der ungefähre 3-Dart-Average des Bots.', grid: true,
    buttons: BOT_LEVELS.map((b, i) => ({
      label: `Stufe ${i + 1} · Ø ${b.avg}`, cls: (db.settings.lastBot || 5) === i + 1 ? 'primary' : '',
      fn: () => {
        const lvl = i + 1;
        db.settings.lastBot = lvl;
        const same = ui.setup.parts.filter(p => p.kind === 'bot' && p.level === lvl).length;
        ui.setup.parts.push({ kind: 'bot', name: `Dartbot ${lvl}${same ? ' (' + (same + 1) + ')' : ''}`, level: lvl, team: ui.setup.parts.length % 2 });
        save();
        render();
      },
    })),
  }),
  start: () => startFromSetup(),
  'bull-res': d => { ui.bull.res[+d.i] = d.r; render(); },
  'bull-pick': d => { ui.bull.winner = +d.i; render(); },
  'bull-again': () => {
    const b = ui.bull, { tie } = bullStatus(b);
    b.active = tie;
    tie.forEach(i => (b.res[i] = null));
    render();
  },
  'bull-start': () => startAfterBull(),

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
  'player-icon': d => { getPlayer(d.id).icon = d.icon || null; save(); render(); },
  'player-color': d => { getPlayer(d.id).color = d.c; save(); render(); },
  'delete-player': d => confirmBox('Spieler löschen?', 'Das Profil wird entfernt. Gespielte Spiele bleiben in der Historie erhalten.', 'Löschen', () => {
    deletePlayer(d.id);
    go('#/players');
  }),
  sort: d => { ui.statsSort = d.k; render(); },
  'caller-test': () => caller.test(),
  range: d => { ui.range = d.v; render(); },
  setting: d => { db.settings[d.key] = JSON.parse(d.value); save(); render(); },
  export: () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dart-counter-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
  'sync-login': () => signIn(),
  'sync-logout': () => confirmBox('Abmelden?', 'Die Daten bleiben auf diesem Gerät und in der Cloud erhalten, werden aber nicht mehr abgeglichen.', 'Abmelden', () => signOut(), false),
  reset: () => confirmBox('Alle Daten löschen?', sync.user
    ? 'Spieler, Spiele und Einstellungen werden unwiderruflich gelöscht – auch in der Cloud und damit auf allen Geräten.'
    : 'Spieler, Spiele und Einstellungen werden unwiderruflich gelöscht.', 'Alles löschen', () => { resetAll(); go('#/'); }),
};

document.addEventListener('click', e => {
  warmUp();
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
  if (e.target.id === 'caller-pitch' || e.target.id === 'caller-rate') {
    db.settings[e.target.id === 'caller-pitch' ? 'callerPitch' : 'callerRate'] = +e.target.value;
    save();
    caller.test();
    return render();
  }
  if (e.target.id === 'caller-voice') { db.settings.callerVoice = e.target.value || null; save(); caller.test(); return; }
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

let lastChartW = chartWidth(), resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const w = chartWidth();
    if (w !== lastChartW && ['player', 'stats'].includes(route.name)) { const y = window.scrollY; render(); window.scrollTo(0, y); }
    lastChartW = w;
  }, 200);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && route.name === 'game') { ui.wake = null; keepAwake(); }
});

onVoices(() => { if (route.name === 'settings') render(); });
render();
initSync(onSyncChange);

// Immer die aktuelle Version laden (und offline weiterspielen können)
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
