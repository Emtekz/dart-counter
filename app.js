'use strict';

/* ================= Konstanten ================= */
const STORAGE_KEY = 'dartcounter.v1';
const PROFILES_KEY = 'dartcounter.profiles.v1';
const STATE_VERSION = 2;
const MAX_PLAYERS = 8;
const MAX_UNDO = 300;
const MAX_HISTORY = 100;
const IMPOSSIBLE_TOTALS = new Set([163, 166, 169, 172, 173, 175, 176, 178, 179]);
const OUT_LABELS = { single: 'Single Out', double: 'Double Out', master: 'Master Out' };
const OUT_SHORT = { single: 'SO', double: 'DO', master: 'MO' };

/* ================= Checkout-Rechner ================= */
function makeDart(base, mult) {
  return { base, mult, value: base * mult };
}

function dartLabel(d) {
  if (d.base === 0) return 'Miss';
  if (d.base === 25) return d.mult === 2 ? 'Bull' : '25';
  return (d.mult === 3 ? 'T' : d.mult === 2 ? 'D' : '') + d.base;
}

const NUMS = Array.from({ length: 20 }, (_, i) => 20 - i);
const TRIPLES = NUMS.map(n => makeDart(n, 3));
const SINGLES = [...NUMS.map(n => makeDart(n, 1)), makeDart(25, 1)];
const BULL = makeDart(25, 2);
// Bevorzugte Doppel zuerst
const DOUBLES = [20, 16, 18, 12, 10, 8, 14, 6, 4, 2, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1].map(n => makeDart(n, 2));
const FINISHERS = {
  double: [...DOUBLES, BULL],
  master: [...DOUBLES, BULL, ...TRIPLES],
  single: [...SINGLES, ...DOUBLES, BULL, ...TRIPLES],
};
const SETUP_BY_VALUE = new Map();
for (const d of [...TRIPLES, ...SINGLES, BULL, ...DOUBLES]) {
  if (!SETUP_BY_VALUE.has(d.value)) SETUP_BY_VALUE.set(d.value, d);
}
const FIRST_DARTS = [...TRIPLES, BULL, ...SINGLES];

/** Liefert einen Checkout-Weg (Array von Darts) oder null. */
function findCheckout(score, dartsLeft, outMode) {
  if (score <= 0 || score > 180 || dartsLeft < 1) return null;
  const fin = FINISHERS[outMode];
  for (const f of fin) if (f.value === score) return [f];
  if (dartsLeft >= 2) {
    for (const f of fin) {
      const s = SETUP_BY_VALUE.get(score - f.value);
      if (s) return [s, f];
    }
  }
  if (dartsLeft >= 3) {
    for (const a of FIRST_DARTS) {
      const rest = score - a.value;
      if (rest <= 0) continue;
      for (const f of fin) {
        const s = SETUP_BY_VALUE.get(rest - f.value);
        if (s) return [a, s, f];
      }
    }
  }
  return null;
}

/* ================= Dartbot ================= */
// Segmente im Uhrzeigersinn, beginnend oben
const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
// Radien in mm (Turnierscheibe)
const R = { bull: 6.35, outerBull: 15.9, trebleIn: 99, trebleOut: 107, doubleIn: 162, doubleOut: 170 };
// Streuung (Standardabweichung in mm) je Stufe, per Simulation (501 DO) auf den 3-Dart-Schnitt kalibriert
const BOT_LEVELS = [
  { sigma: 32.9, avg: 25 },
  { sigma: 22.2, avg: 35 },
  { sigma: 17.5, avg: 45 },
  { sigma: 14.1, avg: 55 },
  { sigma: 12.1, avg: 62 },
  { sigma: 10.6, avg: 70 },
  { sigma: 9.3, avg: 78 },
  { sigma: 8.0, avg: 86 },
  { sigma: 6.8, avg: 95 },
  { sigma: 5.7, avg: 105 },
];
const T20 = makeDart(20, 3);
const SETUP_TARGETS = [...TRIPLES.slice(0, 4), ...SINGLES];

function gauss() {
  let u = 0, v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function aimPoint(d) {
  if (d.base === 25) return [0, 0];
  const r = d.mult === 3 ? (R.trebleIn + R.trebleOut) / 2
    : d.mult === 2 ? (R.doubleIn + R.doubleOut) / 2
      : 58; // dickes Single-Feld innen
  const a = BOARD_ORDER.indexOf(d.base) * 18 * Math.PI / 180;
  return [r * Math.sin(a), r * Math.cos(a)];
}

function hitAt(x, y) {
  const r = Math.hypot(x, y);
  if (r <= R.bull) return makeDart(25, 2);
  if (r <= R.outerBull) return makeDart(25, 1);
  if (r > R.doubleOut) return makeDart(0, 1);
  const deg = (Math.atan2(x, y) * 180 / Math.PI + 360 + 9) % 360;
  const base = BOARD_ORDER[Math.floor(deg / 18)];
  const mult = r >= R.trebleIn && r <= R.trebleOut ? 3 : r >= R.doubleIn ? 2 : 1;
  return makeDart(base, mult);
}

function throwAt(target, sigma) {
  const [x, y] = aimPoint(target);
  return hitAt(x + gauss() * sigma, y + gauss() * sigma);
}

/** Worauf zielt der Bot bei diesem Rest? */
function botTarget(score, dartsLeft, out) {
  const co = findCheckout(score, dartsLeft, out);
  if (co) return co[0];
  const minRest = out === 'single' ? 1 : 2;
  if (score > 110) return T20;
  // Rest so stellen, dass danach ein Finish möglich ist
  for (const t of SETUP_TARGETS) {
    const rest = score - t.value;
    if (rest >= minRest && findCheckout(rest, 2, out)) return t;
  }
  for (const t of SETUP_TARGETS) {
    if (score - t.value >= minRest) return t;
  }
  return makeDart(1, 1);
}

/* ================= Profile ================= */
let profiles = [];

function emptyTotals() {
  return {
    games: 0, wins: 0, legsPlayed: 0, legsWon: 0, points: 0, darts: 0,
    s180: 0, s140: 0, s100: 0, highOut: 0, bestLeg: null,
    f9Points: 0, f9Darts: 0, coAttempts: 0, coHits: 0,
  };
}

function loadProfiles() {
  try {
    const data = JSON.parse(localStorage.getItem(PROFILES_KEY));
    if (data && Array.isArray(data.profiles)) profiles = data.profiles.map(normalizeProfile).filter(Boolean);
  } catch (e) {
    console.warn('Konnte Profile nicht laden', e);
  }
}

function saveProfiles() {
  try {
    localStorage.setItem(PROFILES_KEY, JSON.stringify({ version: 1, profiles }));
  } catch (e) {
    console.warn('Profile speichern fehlgeschlagen', e);
  }
}

function normalizeProfile(p) {
  if (!p || typeof p.id !== 'string' || typeof p.name !== 'string') return null;
  return {
    id: p.id,
    name: p.name.slice(0, 20),
    created: p.created || Date.now(),
    totals: { ...emptyTotals(), ...(p.totals || {}) },
    history: Array.isArray(p.history) ? p.history.slice(0, MAX_HISTORY) : [],
  };
}

const findProfile = id => profiles.find(p => p.id === id);

function createProfile(name) {
  name = name.trim().slice(0, 20);
  if (!name) return null;
  if (profiles.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    toast(`„${name}“ gibt es schon`, true);
    return null;
  }
  const p = normalizeProfile({ id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name });
  profiles.push(p);
  saveProfiles();
  return p;
}

/** Abgeschlossenes Match in die Profile übernehmen (einmalig). */
function recordMatch() {
  if (!state || state.recorded || state.pending?.type !== 'match') return;
  state.recorded = true;
  const winner = state.pending.winner;
  const s = state.settings;
  state.players.forEach((p, i) => {
    const prof = p.profileId && findProfile(p.profileId);
    if (!prof) return;
    const t = prof.totals;
    const st = p.stats;
    t.games++;
    if (i === winner) t.wins++;
    t.legsPlayed += state.leg;
    t.legsWon += p.legs;
    for (const k of ['points', 'darts', 's180', 's140', 's100', 'f9Points', 'f9Darts', 'coAttempts', 'coHits']) t[k] += st[k];
    t.highOut = Math.max(t.highOut, st.highOut);
    if (st.bestLeg !== null && (t.bestLeg === null || st.bestLeg < t.bestLeg)) t.bestLeg = st.bestLeg;
    const others = state.players.filter((_, j) => j !== i);
    prof.history.unshift({
      date: Date.now(),
      start: s.start,
      outMode: s.outMode,
      won: i === winner,
      legs: p.legs,
      oppLegs: Math.max(0, ...others.map(o => o.legs)),
      opponents: others.map(o => o.name),
      avg: Number(avg(st)),
      f9: st.f9Darts ? Number(((st.f9Points / st.f9Darts) * 3).toFixed(1)) : null,
      darts: st.darts,
      s180: st.s180,
      highOut: st.highOut,
    });
    prof.history.length = Math.min(prof.history.length, MAX_HISTORY);
  });
  saveProfiles();
  save();
}

/* ================= Zustand ================= */
let settings = { start: 501, outMode: 'double', legs: 3, inputMode: 'darts' };
// Einträge: {type:'profile', id} | {type:'guest', name} | {type:'bot', level}
let setupPlayers = [{ type: 'guest', name: 'Spieler 1' }, { type: 'guest', name: 'Spieler 2' }];
let state = null;
let undoStack = [];
const ui = { mult: 1, buffer: '', modal: null };

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!data) return;
    if (data.settings) settings = { ...settings, ...data.settings };
    if (Array.isArray(data.setupPlayers)) {
      setupPlayers = data.setupPlayers.filter(sp => sp.type !== 'profile' || findProfile(sp.id));
    } else if (Array.isArray(data.playerNames)) {
      setupPlayers = data.playerNames.map(name => ({ type: 'guest', name }));
    }
    if (data.state && data.state.version === STATE_VERSION) {
      state = data.state;
      if (Array.isArray(data.undo)) undoStack = data.undo;
    }
  } catch (e) {
    console.warn('Konnte gespeicherten Stand nicht laden', e);
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      settings, setupPlayers, state, undo: undoStack.slice(-MAX_UNDO),
    }));
  } catch (e) {
    console.warn('Speichern fehlgeschlagen', e);
  }
}

function freshStats() {
  return {
    points: 0, darts: 0, s180: 0, s140: 0, s100: 0, highOut: 0, bestLeg: null,
    f9Points: 0, f9Darts: 0, coAttempts: 0, coHits: 0,
  };
}

function setupLabel(sp) {
  if (sp.type === 'profile') return findProfile(sp.id)?.name ?? 'Unbekannt';
  if (sp.type === 'bot') return `Dartbot ${sp.level}`;
  return sp.name.trim() || 'Gast';
}

function newGame(starter = 0) {
  const s = { ...settings };
  state = {
    version: STATE_VERSION,
    settings: s,
    players: setupPlayers.map(sp => ({
      name: setupLabel(sp),
      profileId: sp.type === 'profile' ? sp.id : null,
      bot: sp.type === 'bot' ? sp.level : null,
      score: s.start, legs: 0, legDarts: 0, legTurns: 0, last: null, stats: freshStats(),
    })),
    matchStarter: starter,
    legStarter: starter,
    current: starter,
    leg: 1,
    turn: { startScore: s.start, darts: [] },
    pending: null,
    recorded: false,
  };
  undoStack = [];
  ui.mult = 1;
  ui.buffer = '';
}

const cur = () => state.players[state.current];
const humanTurn = () => state && !state.pending && !cur().bot;

function pushUndo() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > MAX_UNDO) undoStack.shift();
}

function undo() {
  if (!undoStack.length) return;
  clearTimeout(botTimer);
  // Bot-Würfe überspringen, bis wieder ein Mensch dran ist
  do {
    state = JSON.parse(undoStack.pop());
  } while (undoStack.length && !state.pending && cur().bot);
  ui.buffer = '';
  ui.mult = 1;
  commit();
}

function commit() {
  save();
  render();
  scheduleBot();
}

/* ================= Spiellogik ================= */
function recordTurn(p, bust, darts, dartCount) {
  const total = bust ? 0 : state.turn.startScore - p.score;
  p.stats.points += total;
  if (!bust) {
    if (total === 180) p.stats.s180++;
    else if (total >= 140) p.stats.s140++;
    else if (total >= 100) p.stats.s100++;
  }
  if (p.legTurns < 3) {
    p.stats.f9Points += total;
    p.stats.f9Darts += dartCount;
  }
  p.legTurns++;
  p.last = { total, bust, darts: darts ? darts.map(dartLabel) : null };
}

function advance() {
  state.current = (state.current + 1) % state.players.length;
  state.turn = { startScore: cur().score, darts: [] };
}

function legWon() {
  const p = cur();
  p.legs++;
  p.stats.highOut = Math.max(p.stats.highOut, state.turn.startScore);
  if (p.stats.bestLeg === null || p.legDarts < p.stats.bestLeg) p.stats.bestLeg = p.legDarts;
  state.pending = {
    type: p.legs >= state.settings.legs ? 'match' : 'leg',
    winner: state.current,
    checkout: state.turn.startScore,
    darts: p.legDarts,
  };
  vibrate([60, 40, 120]);
}

function nextLeg() {
  pushUndo();
  const n = state.players.length;
  for (const p of state.players) {
    p.score = state.settings.start;
    p.legDarts = 0;
    p.legTurns = 0;
    p.last = null;
  }
  state.leg++;
  state.legStarter = (state.legStarter + 1) % n;
  state.current = state.legStarter;
  state.turn = { startScore: state.settings.start, darts: [] };
  state.pending = null;
  commit();
}

function isBust(newScore, finishingDart) {
  const out = state.settings.outMode;
  if (newScore < 0) return true;
  if (out !== 'single' && newScore === 1) return true;
  if (newScore === 0 && finishingDart) {
    if (out === 'double' && finishingDart.mult !== 2) return true;
    if (out === 'master' && finishingDart.mult === 1) return true;
  }
  return false;
}

function addDart(base, mult) {
  if (!state || state.pending) return;
  if (base === 25 && mult === 3) return;
  pushUndo();
  const p = cur();
  const d = makeDart(base, mult);
  // Checkout-Versuch: Rest wäre mit diesem einen Dart checkbar
  if (findCheckout(p.score, 1, state.settings.outMode)) p.stats.coAttempts++;
  state.turn.darts.push(d);
  p.stats.darts++;
  p.legDarts++;
  const newScore = p.score - d.value;

  if (isBust(newScore, d)) {
    p.score = state.turn.startScore;
    recordTurn(p, true, state.turn.darts, state.turn.darts.length);
    toast(p.bot ? `${p.name}: BUST` : 'BUST!', true);
    vibrate([30, 30, 30]);
    advance();
  } else {
    p.score = newScore;
    if (newScore === 0) {
      p.stats.coHits++;
      recordTurn(p, false, state.turn.darts, state.turn.darts.length);
      legWon();
    } else if (state.turn.darts.length === 3) {
      recordTurn(p, false, state.turn.darts, 3);
      advance();
    }
  }
  ui.mult = 1;
  vibrate(10);
  commit();
}

function previewTotal(n) {
  const start = state.turn.startScore;
  const newScore = start - n;
  if (n > 180 || IMPOSSIBLE_TOTALS.has(n)) return { invalid: true };
  if (isBust(newScore)) return { bust: true };
  if (newScore === 0) {
    const co = findCheckout(start, 3, state.settings.outMode);
    if (!co) return { invalid: true };
    return { finish: true, minDarts: co.length };
  }
  return { rest: newScore };
}

function submitTotal(n) {
  if (!humanTurn()) return;
  const res = previewTotal(n);
  if (res.invalid) {
    toast(n > 180 ? 'Maximal 180 Punkte' : `${n} ist nicht möglich`, true);
    return;
  }
  pushUndo();
  const p = cur();
  ui.buffer = '';

  if (res.bust) {
    p.stats.darts += 3;
    p.legDarts += 3;
    recordTurn(p, true, null, 3);
    toast('BUST!', true);
    vibrate([30, 30, 30]);
    advance();
  } else if (res.finish) {
    p.score = 0;
    if (res.minDarts === 3) {
      finishWithDarts(3, false);
      return;
    }
    state.pending = { type: 'checkoutDarts', minDarts: res.minDarts };
  } else {
    p.score = res.rest;
    p.stats.darts += 3;
    p.legDarts += 3;
    recordTurn(p, false, null, 3);
    advance();
  }
  vibrate(10);
  commit();
}

function finishWithDarts(k, withUndo = true) {
  if (withUndo) pushUndo();
  const p = cur();
  p.stats.darts += k;
  p.legDarts += k;
  p.stats.coHits++;
  recordTurn(p, false, null, k);
  state.pending = null;
  legWon();
  commit();
}

/* ================= Bot-Steuerung ================= */
let botTimer = null;

function scheduleBot() {
  clearTimeout(botTimer);
  if (!state || state.pending || ui.modal || $('game').hidden) return;
  if (!cur().bot) return;
  botTimer = setTimeout(botThrow, state.turn.darts.length ? 650 : 1000);
}

function botThrow() {
  if (!state || state.pending || ui.modal || $('game').hidden) return;
  const p = cur();
  if (!p.bot) return;
  const level = BOT_LEVELS[p.bot - 1] || BOT_LEVELS[4];
  const target = botTarget(p.score, 3 - state.turn.darts.length, state.settings.outMode);
  const hit = throwAt(target, level.sigma);
  addDart(hit.base, hit.mult);
}

/* ================= Rendering ================= */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const avg = st => (st.darts ? (st.points / st.darts) * 3 : 0).toFixed(1);
const f9avg = st => (st.f9Darts ? (st.f9Points / st.f9Darts) * 3 : 0).toFixed(1);
const pct = (a, b) => (b ? Math.round((a / b) * 100) + ' %' : '–');
const fmtDate = ts => new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });

function showScreen(name) {
  for (const id of ['setup', 'game', 'stats']) $(id).hidden = id !== name;
  window.scrollTo(0, 0);
}

function renderSetup() {
  $('player-list').innerHTML = setupPlayers.length ? setupPlayers.map((sp, i) => {
    let main, extra;
    if (sp.type === 'guest') {
      main = `<input type="text" class="name-input" value="${esc(sp.name)}" data-index="${i}" maxlength="20" placeholder="Gast" aria-label="Name Spieler ${i + 1}">`;
      extra = '<span class="badge">Gast</span>';
    } else if (sp.type === 'profile') {
      main = `<span class="pr-name">${esc(setupLabel(sp))}</span>`;
      extra = '<span class="badge profile">Profil</span>';
    } else {
      main = '<span class="pr-name">🤖 Bot</span>';
      extra = `<select class="bot-level" data-index="${i}" aria-label="Bot-Stärke">${BOT_LEVELS.map((l, k) =>
        `<option value="${k + 1}"${sp.level === k + 1 ? ' selected' : ''}>Lvl ${k + 1} · Ø ${l.avg}</option>`).join('')}</select>`;
    }
    return `
      <div class="player-row">
        <span class="num">${i + 1}</span>
        ${main}${extra}
        <button type="button" class="icon-btn small" data-action="move-up" data-index="${i}" aria-label="Nach oben"${i ? '' : ' disabled'}>↑</button>
        <button type="button" class="icon-btn small" data-action="remove-player" data-index="${i}" aria-label="Entfernen">✕</button>
      </div>`;
  }).join('') : '<p class="muted">Noch keine Spieler – füge Spieler oder einen Dartbot hinzu.</p>';

  const full = setupPlayers.length >= MAX_PLAYERS;
  $('add-player').disabled = full;
  $('add-bot').disabled = full;
  $('start-game').disabled = !setupPlayers.length;

  document.querySelectorAll('.option-group').forEach(group => {
    const key = group.dataset.setting;
    group.querySelectorAll('button').forEach(b => {
      b.classList.toggle('selected', String(settings[key]) === b.dataset.value);
    });
  });

  $('resume-game').hidden = !(state && state.pending?.type !== 'match');
  renderModal();
}

function render() {
  if (!state) return;
  const s = state.settings;
  $('game-info').textContent = `${s.start} · ${OUT_LABELS[s.outMode]} · First to ${s.legs} · Leg ${state.leg}`;
  $('toggle-input').textContent = s.inputMode === 'darts' ? '123' : 'T20';
  $('toggle-input').title = s.inputMode === 'darts' ? 'Zur Summen-Eingabe wechseln' : 'Zur Dart-Eingabe wechseln';
  $('undo-btn').disabled = !undoStack.length;
  renderBoard();
  renderInput();
  renderModal();
}

function renderBoard() {
  const board = $('scoreboard');
  const out = state.settings.outMode;
  board.classList.toggle('many', state.players.length > 2);
  board.innerHTML = state.players.map((p, i) => {
    const active = i === state.current && !state.pending;
    const winner = state.pending && state.pending.winner === i;
    let checkout = '';
    if (active && p.score <= 170) {
      const co = findCheckout(p.score, 3 - state.turn.darts.length, out);
      if (co) checkout = co.map(dartLabel).join(' · ');
    }
    let last = '';
    if (p.last) {
      last = p.last.bust ? 'BUST' : `Letzte: ${p.last.total}`;
      if (p.last.darts) last += ` (${p.last.darts.join(' ')})`;
    }
    return `
      <div class="player-card${active ? ' active' : ''}${winner ? ' winner' : ''}">
        <div class="pc-head">
          <span class="pc-name">${i === state.legStarter ? '<span class="pc-starter" title="Anwurf">●</span>' : ''}${p.bot ? '🤖 ' : ''}${esc(p.name)}</span>
          <span class="pc-legs">Legs ${p.legs}</span>
        </div>
        <div class="pc-score">${p.score}</div>
        <div class="pc-checkout">${checkout}</div>
        <div class="pc-last${p.last?.bust ? ' bust' : ''}">${esc(last)}</div>
        <div class="pc-stats">
          <span>Ø ${avg(p.stats)}</span>
          <span>Darts ${p.legDarts}</span>
        </div>
      </div>`;
  }).join('');
  board.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
}

function renderInput() {
  const dartsMode = state.settings.inputMode === 'darts';
  const botActive = !state.pending && !!cur().bot;
  $('dart-pad').hidden = !dartsMode;
  $('total-pad').hidden = dartsMode;
  $('input-area').classList.toggle('locked', botActive);

  const banner = $('bot-banner');
  banner.hidden = !botActive;
  if (botActive) {
    const thrown = state.turn.darts.map(dartLabel).join(' · ');
    banner.textContent = `🤖 ${cur().name} wirft…${thrown ? '  ' + thrown : ''}`;
  }

  if (dartsMode) {
    const darts = state.turn.darts;
    const slots = [0, 1, 2].map(i => {
      const d = darts[i];
      if (!d) return `<div class="slot empty">–</div>`;
      const cls = d.mult === 3 ? ' t' : d.mult === 2 ? ' d' : '';
      return `<div class="slot${cls}">${dartLabel(d)}</div>`;
    }).join('');
    const sum = darts.reduce((a, d) => a + d.value, 0);
    $('turn-display').innerHTML = `${slots}<div class="turn-sum">${sum}</div>`;

    document.querySelectorAll('.mod').forEach(b => b.classList.toggle('on', Number(b.dataset.mult) === ui.mult));
    const grid = $('num-grid');
    grid.classList.toggle('m2', ui.mult === 2);
    grid.classList.toggle('m3', ui.mult === 3);
    grid.querySelector('.bull').disabled = ui.mult === 3;
    grid.querySelector('.bull').textContent = ui.mult === 2 ? 'Bull 50' : ui.mult === 3 ? '–' : '25';
  } else {
    const buf = $('total-buffer');
    buf.textContent = ui.buffer || '0';
    buf.classList.toggle('placeholder', !ui.buffer);
    const prev = $('total-preview');
    prev.className = 'total-preview';
    if (!ui.buffer) {
      prev.textContent = `${cur().name}: Rest ${state.turn.startScore}`;
    } else {
      const res = previewTotal(Number(ui.buffer));
      if (res.invalid) { prev.textContent = 'ungültig'; prev.classList.add('bust'); }
      else if (res.bust) { prev.textContent = 'BUST'; prev.classList.add('bust'); }
      else if (res.finish) { prev.textContent = 'CHECKOUT!'; prev.classList.add('finish'); }
      else prev.textContent = `Rest ${res.rest}`;
    }
  }
}

function buildNumGrid() {
  const nums = Array.from({ length: 20 }, (_, i) => i + 1);
  $('num-grid').innerHTML =
    nums.map(n => `<button type="button" class="key n" data-action="dart" data-base="${n}">${n}</button>`).join('') +
    `<button type="button" class="key bull span2" data-action="dart" data-base="25">25</button>
     <button type="button" class="key miss span2" data-action="dart" data-base="0">Miss</button>
     <button type="button" class="key undo" data-action="undo" aria-label="Rückgängig">↶</button>`;
}

function statsTable() {
  const ps = state.players;
  const row = (label, fn) => `<tr><td>${label}</td>${ps.map(p => `<td>${fn(p)}</td>`).join('')}</tr>`;
  return `
    <div class="table-wrap">
      <table class="stats-table">
        <thead><tr><th></th>${ps.map(p => `<th>${esc(p.name)}</th>`).join('')}</tr></thead>
        <tbody>
          ${row('Legs', p => p.legs)}
          ${row('3-Dart-Ø', p => avg(p.stats))}
          ${row('First 9 Ø', p => f9avg(p.stats))}
          ${row('Darts', p => p.stats.darts)}
          ${row('180', p => p.stats.s180)}
          ${row('140+', p => p.stats.s140)}
          ${row('100+', p => p.stats.s100)}
          ${row('Doppelquote', p => p.stats.coAttempts ? `${pct(p.stats.coHits, p.stats.coAttempts)} (${p.stats.coHits}/${p.stats.coAttempts})` : '–')}
          ${row('Höchstes Finish', p => p.stats.highOut || '–')}
          ${row('Bestes Leg', p => p.stats.bestLeg ? p.stats.bestLeg + ' Darts' : '–')}
        </tbody>
      </table>
    </div>`;
}

/* ----- Statistik-Seite ----- */
function renderStats() {
  const list = $('profile-list');
  if (!profiles.length) {
    list.innerHTML = '<div class="card"><p class="muted">Noch keine Spieler angelegt. Lege unten einen Spieler an – seine Spiele werden dann automatisch ausgewertet.</p></div>';
  } else {
    list.innerHTML = [...profiles].sort((a, b) => b.totals.games - a.totals.games || a.name.localeCompare(b.name)).map(p => {
      const t = p.totals;
      return `
        <button type="button" class="profile-card" data-action="open-profile" data-id="${p.id}">
          <span class="pf-name">${esc(p.name)}</span>
          <span class="pf-stats">
            <span><b>${t.games}</b> Spiele</span>
            <span><b>${pct(t.wins, t.games)}</b> Siege</span>
            <span>Ø <b>${avg(t)}</b></span>
          </span>
        </button>`;
    }).join('');
  }
  renderModal();
}

function sparkline(values) {
  if (values.length < 2) return '';
  const w = 300, h = 70, pad = 6;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    pad + (i / (values.length - 1)) * (w - 2 * pad),
    h - pad - ((v - min) / span) * (h - 2 * pad),
  ]);
  const line = pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return `
    <div class="spark">
      <div class="spark-head"><span>Ø-Verlauf (letzte ${values.length} Spiele)</span><span>${min.toFixed(1)} – ${max.toFixed(1)}</span></div>
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
        <polyline points="${line}" fill="none" stroke="var(--green-l)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
        <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="3.5" fill="var(--green-l)"/>
      </svg>
    </div>`;
}

function profileModal(id) {
  const p = findProfile(id);
  if (!p) return '';
  const t = p.totals;
  const rows = [
    ['Spiele', t.games],
    ['Siege', t.games ? `${t.wins} (${pct(t.wins, t.games)})` : '–'],
    ['Legs gewonnen', t.legsPlayed ? `${t.legsWon} / ${t.legsPlayed} (${pct(t.legsWon, t.legsPlayed)})` : '–'],
    ['3-Dart-Ø', avg(t)],
    ['First 9 Ø', f9avg(t)],
    ['Doppelquote', t.coAttempts ? `${pct(t.coHits, t.coAttempts)} (${t.coHits}/${t.coAttempts})` : '–'],
    ['180', t.s180],
    ['140+', t.s140],
    ['100+', t.s100],
    ['Höchstes Finish', t.highOut || '–'],
    ['Bestes Leg', t.bestLeg ? t.bestLeg + ' Darts' : '–'],
    ['Geworfene Darts', t.darts],
  ];
  const trend = p.history.slice(0, 20).reverse().map(h => h.avg);
  const games = p.history.slice(0, 25).map(h => `
    <li class="game-item ${h.won ? 'won' : 'lost'}">
      <span class="gi-result">${h.won ? 'S' : 'N'}</span>
      <span class="gi-main">
        <span>vs ${esc(h.opponents.join(', ') || '–')}</span>
        <span class="muted">${fmtDate(h.date)} · ${h.start} ${OUT_SHORT[h.outMode] || ''}${h.highOut ? ' · Finish ' + h.highOut : ''}</span>
      </span>
      <span class="gi-side"><b>${h.legs}:${h.oppLegs}</b><span class="muted">Ø ${h.avg.toFixed(1)}</span></span>
    </li>`).join('');
  return `
    <h2>${esc(p.name)}</h2>
    ${sparkline(trend)}
    <div class="table-wrap">
      <table class="stats-table kv">
        <tbody>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</tbody>
      </table>
    </div>
    ${games ? `<h3 class="section-title">Letzte Spiele</h3><ul class="game-list">${games}</ul>` : '<p>Noch keine abgeschlossenen Spiele.</p>'}
    <div class="actions">
      <button type="button" class="btn secondary" data-action="rename-profile" data-id="${p.id}">Umbenennen</button>
      <button type="button" class="btn danger" data-action="delete-profile" data-id="${p.id}">Löschen</button>
    </div>
    <button type="button" class="btn primary" data-action="close-modal">Schließen</button>`;
}

function pickerModal() {
  const used = new Set(setupPlayers.filter(sp => sp.type === 'profile').map(sp => sp.id));
  const avail = profiles.filter(p => !used.has(p.id)).sort((a, b) => a.name.localeCompare(b.name));
  const list = avail.length
    ? `<div class="pick-list">${avail.map(p => `
        <button type="button" class="pick-item" data-action="pick-profile" data-id="${p.id}">
          <span>${esc(p.name)}</span>
          <span class="muted">${p.totals.games} Spiele · Ø ${avg(p.totals)}</span>
        </button>`).join('')}</div>`
    : `<p>${profiles.length ? 'Alle gespeicherten Spieler sind schon dabei.' : 'Noch keine gespeicherten Spieler.'}</p>`;
  return `
    <h2>Spieler hinzufügen</h2>
    ${list}
    <form class="inline-form" data-form="new-profile">
      <input name="name" type="text" placeholder="Neuer Spieler" maxlength="20" required autocomplete="off">
      <button class="btn primary" type="submit">Anlegen</button>
    </form>
    <div class="actions">
      <button type="button" class="btn secondary" data-action="add-guest">Als Gast (ohne Statistik)</button>
      <button type="button" class="btn secondary" data-action="close-modal">Abbrechen</button>
    </div>`;
}

function menuModal() {
  return `
    <h2>Menü</h2>
    ${statsTable()}
    <div class="actions column">
      <button type="button" class="btn primary" data-action="close-modal">Weiterspielen</button>
      <button type="button" class="btn secondary" data-action="restart">Spiel neu starten</button>
      <button type="button" class="btn danger" data-action="home">Zum Hauptmenü</button>
    </div>
    <p class="hint">Nur beendete Spiele werden in die Spieler-Statistik übernommen.</p>`;
}

function pendingModal() {
  const pd = state.pending;
  if (pd.type === 'checkoutDarts') {
    const btns = [1, 2, 3].filter(k => k >= pd.minDarts)
      .map(k => `<button type="button" class="btn primary" data-action="co-darts" data-darts="${k}">${k} Dart${k > 1 ? 's' : ''}</button>`).join('');
    return `
      <div class="big-icon">🎯</div>
      <h2>Checkout!</h2>
      <p>Mit wie vielen Darts wurde gecheckt?</p>
      <div class="actions">${btns}</div>
      <button type="button" class="btn secondary" data-action="undo">Abbrechen</button>`;
  }
  const w = state.players[pd.winner];
  const isMatch = pd.type === 'match';
  const hasProfiles = state.players.some(p => p.profileId);
  return `
    <div class="big-icon">${isMatch ? '🏆' : '🎯'}</div>
    <h2>${w.bot ? '🤖 ' : ''}${esc(w.name)} gewinnt ${isMatch ? 'das Spiel!' : `Leg ${state.leg}!`}</h2>
    <p>Checkout ${pd.checkout} · ${pd.darts} Darts</p>
    ${isMatch ? statsTable() : ''}
    ${isMatch && hasProfiles ? '<p class="hint">Die Statistik wird gespeichert, sobald du „Revanche“ oder „Hauptmenü“ wählst.</p>' : ''}
    <div class="actions">
      <button type="button" class="btn secondary" data-action="undo">↶ Rückgängig</button>
      ${isMatch
        ? `<button type="button" class="btn primary" data-action="rematch">Revanche</button>
           <button type="button" class="btn secondary" data-action="home">Hauptmenü</button>`
        : `<button type="button" class="btn primary" data-action="next-leg">Nächstes Leg</button>`}
    </div>`;
}

function renderModal() {
  const m = ui.modal;
  let html = '';
  if (m) {
    if (m.type === 'menu' && state) html = menuModal();
    else if (m.type === 'picker') html = pickerModal();
    else if (m.type === 'profile') html = profileModal(m.id);
    if (!html) ui.modal = null;
  }
  if (!html && !$('game').hidden && state?.pending) html = pendingModal();

  $('overlay').hidden = !html;
  if (html) $('modal').innerHTML = html;
}

function openModal(modal) {
  ui.modal = modal;
  clearTimeout(botTimer);
  renderModal();
  $('modal').scrollTop = 0;
}

function closeModal() {
  ui.modal = null;
  renderModal();
  scheduleBot();
}

let toastTimer;
function toast(msg, error = false) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.toggle('error', error);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1400);
}

function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

/* ================= Bildschirm wach halten ================= */
let wakeLock = null;
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator && !$('game').hidden) wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) { /* nicht unterstützt / verweigert */ }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') requestWakeLock();
});

/* ================= Navigation ================= */
function startGame(starter = 0) {
  ui.modal = null;
  newGame(starter);
  showScreen('game');
  commit();
  requestWakeLock();
}

function goHome() {
  clearTimeout(botTimer);
  recordMatch();
  ui.modal = null;
  if (state && state.pending?.type === 'match') { state = null; undoStack = []; }
  save();
  showScreen('setup');
  renderSetup();
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}

/* ================= Export / Import ================= */
function exportProfiles() {
  const blob = new Blob([JSON.stringify({ app: 'dart-counter', version: 1, exported: new Date().toISOString(), profiles }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `dart-counter-statistik-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importProfiles(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const incoming = (Array.isArray(data) ? data : data.profiles || []).map(normalizeProfile).filter(Boolean);
      if (!incoming.length) throw new Error('keine Profile');
      let added = 0, updated = 0;
      for (const p of incoming) {
        const i = profiles.findIndex(x => x.id === p.id);
        if (i >= 0) { profiles[i] = p; updated++; } else { profiles.push(p); added++; }
      }
      saveProfiles();
      renderStats();
      toast(`${added} neu, ${updated} aktualisiert`);
    } catch (e) {
      toast('Datei konnte nicht gelesen werden', true);
    }
  };
  reader.readAsText(file);
}

/* ================= Events ================= */
function handleAction(btn) {
  const a = btn.dataset.action;
  switch (a) {
    case 'mult':
      ui.mult = ui.mult === Number(btn.dataset.mult) ? 1 : Number(btn.dataset.mult);
      renderInput();
      break;
    case 'dart': {
      if (!humanTurn()) return;
      const base = Number(btn.dataset.base);
      addDart(base, base === 0 ? 1 : ui.mult);
      break;
    }
    case 'undo':
      undo();
      break;
    case 'digit':
      if (ui.buffer.length < 3) ui.buffer = (ui.buffer + btn.dataset.value).replace(/^0+(?=\d)/, '');
      renderInput();
      break;
    case 'back':
      ui.buffer = ui.buffer.slice(0, -1);
      renderInput();
      break;
    case 'ok':
      submitTotal(Number(ui.buffer || 0));
      break;
    case 'quick':
      submitTotal(Number(btn.dataset.value));
      break;
    case 'co-darts':
      finishWithDarts(Number(btn.dataset.darts));
      break;
    case 'next-leg':
      nextLeg();
      break;
    case 'toggle-input':
      if (state.turn.darts.length) {
        toast('Erst die angefangene Aufnahme beenden', true);
        break;
      }
      state.settings.inputMode = settings.inputMode = state.settings.inputMode === 'darts' ? 'total' : 'darts';
      ui.buffer = '';
      commit();
      break;
    case 'menu':
      openModal({ type: 'menu' });
      break;
    case 'close-modal':
      closeModal();
      break;
    case 'restart':
      if (confirm('Spiel wirklich neu starten? Der aktuelle Stand geht verloren.')) startGame(state.matchStarter);
      break;
    case 'rematch': {
      recordMatch();
      startGame((state.matchStarter + 1) % state.players.length);
      break;
    }
    case 'home':
      goHome();
      break;

    // Setup
    case 'open-picker':
      openModal({ type: 'picker' });
      break;
    case 'pick-profile':
      if (setupPlayers.length < MAX_PLAYERS) setupPlayers.push({ type: 'profile', id: btn.dataset.id });
      ui.modal = null;
      save();
      renderSetup();
      break;
    case 'add-guest':
      setupPlayers.push({ type: 'guest', name: `Gast ${setupPlayers.filter(sp => sp.type === 'guest').length + 1}` });
      ui.modal = null;
      save();
      renderSetup();
      break;
    case 'add-bot':
      if (setupPlayers.length < MAX_PLAYERS) setupPlayers.push({ type: 'bot', level: 5 });
      save();
      renderSetup();
      break;
    case 'remove-player':
      setupPlayers.splice(Number(btn.dataset.index), 1);
      save();
      renderSetup();
      break;
    case 'move-up': {
      const i = Number(btn.dataset.index);
      [setupPlayers[i - 1], setupPlayers[i]] = [setupPlayers[i], setupPlayers[i - 1]];
      save();
      renderSetup();
      break;
    }

    // Statistik
    case 'open-stats':
      showScreen('stats');
      renderStats();
      break;
    case 'go-setup':
      ui.modal = null;
      showScreen('setup');
      renderSetup();
      break;
    case 'open-profile':
      openModal({ type: 'profile', id: btn.dataset.id });
      break;
    case 'rename-profile': {
      const p = findProfile(btn.dataset.id);
      const name = p && prompt('Neuer Name:', p.name);
      if (!name || !name.trim()) break;
      if (profiles.some(x => x !== p && x.name.toLowerCase() === name.trim().toLowerCase())) {
        toast('Name existiert bereits', true);
        break;
      }
      p.name = name.trim().slice(0, 20);
      saveProfiles();
      renderStats();
      break;
    }
    case 'delete-profile': {
      const p = findProfile(btn.dataset.id);
      if (!p || !confirm(`„${p.name}“ und alle Statistiken wirklich löschen?`)) break;
      profiles = profiles.filter(x => x !== p);
      setupPlayers = setupPlayers.filter(sp => !(sp.type === 'profile' && sp.id === p.id));
      saveProfiles();
      save();
      ui.modal = null;
      renderStats();
      break;
    }
    case 'export':
      if (!profiles.length) { toast('Keine Spieler zum Exportieren', true); break; }
      exportProfiles();
      break;
    case 'import':
      $('import-file').click();
      break;
  }
}

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (btn && !btn.disabled) handleAction(btn);
});

$('overlay').addEventListener('click', e => {
  if (e.target === $('overlay') && ui.modal) closeModal();
});

document.addEventListener('submit', e => {
  const form = e.target.closest('[data-form="new-profile"]');
  if (!form) return;
  e.preventDefault();
  const p = createProfile(form.elements.name.value);
  if (!p) return;
  form.reset();
  if (ui.modal?.type === 'picker') {
    setupPlayers.push({ type: 'profile', id: p.id });
    ui.modal = null;
    save();
    renderSetup();
  } else {
    renderStats();
  }
  toast(`${p.name} angelegt`);
});

$('player-list').addEventListener('input', e => {
  if (e.target.matches('.name-input')) {
    setupPlayers[Number(e.target.dataset.index)].name = e.target.value;
    save();
  }
});

$('player-list').addEventListener('change', e => {
  if (e.target.matches('.bot-level')) {
    setupPlayers[Number(e.target.dataset.index)].level = Number(e.target.value);
    save();
  }
});

$('import-file').addEventListener('change', e => {
  const file = e.target.files[0];
  if (file) importProfiles(file);
  e.target.value = '';
});

document.querySelectorAll('.option-group').forEach(group => {
  group.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const key = group.dataset.setting;
    settings[key] = isNaN(b.dataset.value) ? b.dataset.value : Number(b.dataset.value);
    save();
    renderSetup();
  });
});

$('start-game').addEventListener('click', () => {
  if (!setupPlayers.length) return;
  if (state && state.pending?.type !== 'match' && !confirm('Das laufende Spiel wird verworfen. Neues Spiel starten?')) return;
  startGame(0);
});

$('resume-game').addEventListener('click', () => {
  showScreen('game');
  commit();
  requestWakeLock();
});

// Tastatur (Desktop)
document.addEventListener('keydown', e => {
  if (e.target.matches('input, select')) return;
  if (e.key === 'Escape' && ui.modal) { closeModal(); return; }
  if ($('game').hidden || ui.modal) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if (e.key === 'Escape') { openModal({ type: 'menu' }); return; }
  if (state.pending) {
    if (e.key === 'Enter' && state.pending.type === 'leg') nextLeg();
    return;
  }
  if (!humanTurn()) return;
  if (state.settings.inputMode === 'total') {
    if (/^\d$/.test(e.key)) {
      if (ui.buffer.length < 3) ui.buffer = (ui.buffer + e.key).replace(/^0+(?=\d)/, '');
      renderInput();
    } else if (e.key === 'Backspace') {
      ui.buffer = ui.buffer.slice(0, -1);
      renderInput();
    } else if (e.key === 'Enter') {
      submitTotal(Number(ui.buffer || 0));
    }
  } else {
    const k = e.key.toLowerCase();
    if (k === 'd' || k === 't' || k === 's') {
      ui.mult = { s: 1, d: 2, t: 3 }[k];
      renderInput();
    } else if (k === 'm' || k === '0') {
      addDart(0, 1);
    }
  }
});

/* ================= Start ================= */
buildNumGrid();
loadProfiles();
load();
recordMatch(); // falls die Seite nach Spielende neu geladen wurde
showScreen('setup');
renderSetup();
