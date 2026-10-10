'use strict';

/* ================= Konstanten ================= */
const STORAGE_KEY = 'dartcounter.v1';
const MAX_PLAYERS = 8;
const MAX_UNDO = 300;
const IMPOSSIBLE_TOTALS = new Set([163, 166, 169, 172, 173, 175, 176, 178, 179]);
const OUT_LABELS = { single: 'Single Out', double: 'Double Out', master: 'Master Out' };

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

/* ================= Zustand ================= */
let settings = { start: 501, outMode: 'double', legs: 3, inputMode: 'darts' };
let playerNames = ['Spieler 1', 'Spieler 2'];
let state = null;
let undoStack = [];
const ui = { mult: 1, buffer: '', menu: false };

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!data) return;
    if (data.settings) settings = { ...settings, ...data.settings };
    if (Array.isArray(data.playerNames) && data.playerNames.length) playerNames = data.playerNames;
    if (data.state) state = data.state;
    if (Array.isArray(data.undo)) undoStack = data.undo;
  } catch (e) {
    console.warn('Konnte gespeicherten Stand nicht laden', e);
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      settings, playerNames, state, undo: undoStack.slice(-MAX_UNDO),
    }));
  } catch (e) {
    console.warn('Speichern fehlgeschlagen', e);
  }
}

function freshStats() {
  return { points: 0, darts: 0, s180: 0, s140: 0, s100: 0, highOut: 0, bestLeg: null };
}

function newGame(starter = 0) {
  const s = { ...settings };
  state = {
    settings: s,
    players: playerNames.map(name => ({
      name, score: s.start, legs: 0, legDarts: 0, last: null, stats: freshStats(),
    })),
    matchStarter: starter,
    legStarter: starter,
    current: starter,
    leg: 1,
    turn: { startScore: s.start, darts: [] },
    pending: null,
  };
  undoStack = [];
  ui.mult = 1;
  ui.buffer = '';
}

const cur = () => state.players[state.current];

function pushUndo() {
  undoStack.push(JSON.stringify(state));
  if (undoStack.length > MAX_UNDO) undoStack.shift();
}

function undo() {
  if (!undoStack.length) return;
  state = JSON.parse(undoStack.pop());
  ui.buffer = '';
  ui.mult = 1;
  commit();
}

function commit() {
  save();
  render();
}

/* ================= Spiellogik ================= */
function recordTurn(p, bust, darts) {
  const total = bust ? 0 : state.turn.startScore - p.score;
  p.stats.points += total;
  if (!bust) {
    if (total === 180) p.stats.s180++;
    else if (total >= 140) p.stats.s140++;
    else if (total >= 100) p.stats.s100++;
  }
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
  state.turn.darts.push(d);
  p.stats.darts++;
  p.legDarts++;
  const newScore = p.score - d.value;

  if (isBust(newScore, d)) {
    p.score = state.turn.startScore;
    recordTurn(p, true, state.turn.darts);
    toast('BUST!', true);
    vibrate([30, 30, 30]);
    advance();
  } else {
    p.score = newScore;
    if (newScore === 0) {
      recordTurn(p, false, state.turn.darts);
      legWon();
    } else if (state.turn.darts.length === 3) {
      recordTurn(p, false, state.turn.darts);
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
  if (!state || state.pending) return;
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
    recordTurn(p, true, null);
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
    recordTurn(p, false, null);
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
  recordTurn(p, false, null);
  state.pending = null;
  legWon();
  commit();
}

/* ================= Rendering ================= */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const avg = st => (st.darts ? (st.points / st.darts) * 3 : 0).toFixed(1);

function showScreen(name) {
  $('setup').hidden = name !== 'setup';
  $('game').hidden = name !== 'game';
}

function renderSetup() {
  $('player-list').innerHTML = playerNames.map((name, i) => `
    <div class="player-row">
      <span class="num">${i + 1}</span>
      <input type="text" value="${esc(name)}" data-index="${i}" maxlength="20" placeholder="Spieler ${i + 1}" aria-label="Name Spieler ${i + 1}">
      ${i > 0 ? `<button type="button" class="icon-btn" data-action="move-up" data-index="${i}" aria-label="Nach oben">↑</button>` : ''}
      ${playerNames.length > 1 ? `<button type="button" class="icon-btn" data-action="remove-player" data-index="${i}" aria-label="Entfernen">✕</button>` : ''}
    </div>`).join('');
  $('add-player').hidden = playerNames.length >= MAX_PLAYERS;

  document.querySelectorAll('.option-group').forEach(group => {
    const key = group.dataset.setting;
    group.querySelectorAll('button').forEach(b => {
      b.classList.toggle('selected', String(settings[key]) === b.dataset.value);
    });
  });

  $('resume-game').hidden = !(state && state.pending?.type !== 'match');
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
          <span class="pc-name">${i === state.legStarter ? '<span class="pc-starter" title="Anwurf">●</span>' : ''}${esc(p.name)}</span>
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
  $('dart-pad').hidden = !dartsMode;
  $('total-pad').hidden = dartsMode;

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
      prev.textContent = `${esc(cur().name)}: Rest ${state.turn.startScore}`;
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
          ${row('Darts', p => p.stats.darts)}
          ${row('180', p => p.stats.s180)}
          ${row('140+', p => p.stats.s140)}
          ${row('100+', p => p.stats.s100)}
          ${row('Höchstes Finish', p => p.stats.highOut || '–')}
          ${row('Bestes Leg', p => p.stats.bestLeg ? p.stats.bestLeg + ' Darts' : '–')}
        </tbody>
      </table>
    </div>`;
}

function renderModal() {
  const overlay = $('overlay');
  const modal = $('modal');
  let html = '';

  if (ui.menu) {
    html = `
      <h2>Menü</h2>
      ${statsTable()}
      <div class="actions column">
        <button type="button" class="btn primary" data-action="close-menu">Weiterspielen</button>
        <button type="button" class="btn secondary" data-action="restart">Spiel neu starten</button>
        <button type="button" class="btn danger" data-action="home">Zum Hauptmenü</button>
      </div>`;
  } else if (state.pending) {
    const pd = state.pending;
    if (pd.type === 'checkoutDarts') {
      const btns = [1, 2, 3].filter(k => k >= pd.minDarts)
        .map(k => `<button type="button" class="btn primary" data-action="co-darts" data-darts="${k}">${k} Dart${k > 1 ? 's' : ''}</button>`).join('');
      html = `
        <div class="big-icon">🎯</div>
        <h2>Checkout!</h2>
        <p>Mit wie vielen Darts wurde gecheckt?</p>
        <div class="actions">${btns}</div>
        <button type="button" class="btn secondary" data-action="undo">Abbrechen</button>`;
    } else {
      const w = state.players[pd.winner];
      const isMatch = pd.type === 'match';
      html = `
        <div class="big-icon">${isMatch ? '🏆' : '🎯'}</div>
        <h2>${esc(w.name)} gewinnt ${isMatch ? 'das Spiel!' : `Leg ${state.leg}!`}</h2>
        <p>Checkout ${pd.checkout} · ${pd.darts} Darts</p>
        ${isMatch ? statsTable() : ''}
        <div class="actions">
          <button type="button" class="btn secondary" data-action="undo">↶ Rückgängig</button>
          ${isMatch
            ? `<button type="button" class="btn primary" data-action="rematch">Revanche</button>
               <button type="button" class="btn secondary" data-action="home">Hauptmenü</button>`
            : `<button type="button" class="btn primary" data-action="next-leg">Nächstes Leg</button>`}
        </div>`;
    }
  }

  overlay.hidden = !html;
  if (html) modal.innerHTML = html;
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
  newGame(starter);
  showScreen('game');
  commit();
  requestWakeLock();
}

function goHome() {
  ui.menu = false;
  if (state && state.pending?.type === 'match') { state = null; undoStack = []; }
  save();
  $('overlay').hidden = true;
  showScreen('setup');
  renderSetup();
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
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
      state.settings.inputMode = state.settings.inputMode === 'darts' ? 'total' : 'darts';
      settings.inputMode = state.settings.inputMode;
      if (state.turn.darts.length && state.settings.inputMode === 'total') {
        toast('Angefangene Aufnahme bitte erst fertig werfen', true);
        state.settings.inputMode = settings.inputMode = 'darts';
      }
      ui.buffer = '';
      commit();
      break;
    case 'menu':
      ui.menu = true;
      renderModal();
      break;
    case 'close-menu':
      ui.menu = false;
      renderModal();
      break;
    case 'restart':
      if (confirm('Spiel wirklich neu starten? Der aktuelle Stand geht verloren.')) {
        ui.menu = false;
        startGame(state.matchStarter);
      }
      break;
    case 'rematch':
      startGame((state.matchStarter + 1) % state.players.length);
      break;
    case 'home':
      goHome();
      break;
    case 'remove-player':
      playerNames.splice(Number(btn.dataset.index), 1);
      save();
      renderSetup();
      break;
    case 'move-up': {
      const i = Number(btn.dataset.index);
      [playerNames[i - 1], playerNames[i]] = [playerNames[i], playerNames[i - 1]];
      save();
      renderSetup();
      break;
    }
  }
}

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-action]');
  if (btn && !btn.disabled) handleAction(btn);
});

$('player-list').addEventListener('input', e => {
  if (e.target.matches('input')) {
    playerNames[Number(e.target.dataset.index)] = e.target.value;
    save();
  }
});

$('add-player').addEventListener('click', () => {
  if (playerNames.length >= MAX_PLAYERS) return;
  playerNames.push(`Spieler ${playerNames.length + 1}`);
  save();
  renderSetup();
  const inputs = $('player-list').querySelectorAll('input');
  inputs[inputs.length - 1].select();
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
  playerNames = playerNames.map((n, i) => n.trim() || `Spieler ${i + 1}`);
  startGame(0);
});

$('resume-game').addEventListener('click', () => {
  showScreen('game');
  render();
  requestWakeLock();
});

// Tastatur (Desktop)
document.addEventListener('keydown', e => {
  if ($('game').hidden || e.target.matches('input')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); return; }
  if (e.key === 'Escape') { ui.menu = !ui.menu; renderModal(); return; }
  if (ui.menu || state.pending) {
    if (e.key === 'Enter' && state.pending?.type === 'leg') nextLeg();
    return;
  }
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
load();
renderSetup();
showScreen('setup');
