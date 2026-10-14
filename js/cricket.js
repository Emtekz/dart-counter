// Cricket: Zahlen 15–20 und Bull schließen (3 Treffer), Punkte auf offene Zahlen sammeln.
// Varianten: Standard, Cut-Throat (Punkte gehen an die Gegner), ohne Punkte. Teams wie im X01.
import { uid } from './store.js';
import { throwOf } from './checkout.js';

export const CRICKET_NUMS = [20, 19, 18, 17, 16, 15, 25];

const emptyMarks = () => Object.fromEntries(CRICKET_NUMS.map(n => [n, 0]));

export function newCricket(config, players, sides) {
  const st = {
    type: 'cricket', id: uid(), started: Date.now(), config, players,
    sides: sides.map(s => ({ ...s, ptr: 0, legs: 0 })),
    legStarter: 0, legNo: 1, legsTotal: 0,
    stats: players.map(() => ({ darts: 0, marks: 0, visits: 0, legsWon: 0 })),
    finished: false, winner: null, last: null, legEvent: null,
  };
  startLeg(st);
  return st;
}

function startLeg(st) {
  st.leg = {
    marks: st.sides.map(emptyMarks),
    pts: st.sides.map(() => 0),
    turn: st.legStarter,
    cur: [],
  };
}

export function cricketActive(st) {
  const S = st.sides[st.leg.turn];
  return S.members[S.ptr];
}

const closedAll = m => CRICKET_NUMS.every(n => m[n] >= 3);
/** Zahl ist „tot“, wenn alle Seiten sie geschlossen haben. */
export const isDead = (st, n) => st.leg.marks.every(m => m[n] >= 3);

function legWonBy(st, side) {
  const L = st.leg, mode = st.config.mode;
  if (!closedAll(L.marks[side])) return false;
  const others = L.pts.filter((_, i) => i !== side);
  if (mode === 'noscore') return true;
  if (mode === 'cutthroat') return L.pts[side] <= Math.min(...others);
  return L.pts[side] >= Math.max(...others);
}

/** Einen Dart werten. t = Wurf { n, m, label } (n = 0 oder andere Zahl = kein Cricket-Feld). Gibt die Aufnahme zurück, wenn sie endet. */
export function throwCricket(st, t) {
  const L = st.leg, side = L.turn, S = st.sides[side], pi = S.members[S.ptr], ps = st.stats[pi];
  const n = CRICKET_NUMS.includes(t.n) ? t.n : 0;
  const hits = n ? (n === 25 ? Math.min(t.m, 2) : t.m) : 0;
  let gained = 0;
  if (hits) {
    const before = L.marks[side][n];
    const extra = Math.max(0, before + hits - 3);
    L.marks[side][n] = Math.min(3, before + hits);
    ps.marks += hits;
    if (extra && st.config.mode !== 'noscore') {
      const open = L.marks.map((m, i) => i !== side && m[n] < 3);
      if (open.some(Boolean)) {
        gained = extra * n;
        if (st.config.mode === 'cutthroat') open.forEach((o, i) => { if (o) L.pts[i] += gained; });
        else L.pts[side] += gained;
      }
    }
  }
  ps.darts++;
  L.cur.push({ label: n ? t.label : (t.v ? t.label : '0'), hits, gained });
  if (legWonBy(st, side)) return endVisit(st, true);
  if (L.cur.length === 3) return endVisit(st, false);
  return null;
}

function endVisit(st, won) {
  const L = st.leg, side = L.turn, S = st.sides[side], pi = S.members[S.ptr];
  st.stats[pi].visits++;
  const visit = {
    side, pi, labels: L.cur.map(d => d.label),
    marks: L.cur.reduce((a, d) => a + d.hits, 0),
    points: L.cur.reduce((a, d) => a + d.gained, 0),
    won, at: Date.now(),
  };
  st.last = visit;
  L.cur = [];
  S.ptr = (S.ptr + 1) % S.members.length;
  if (won) {
    S.legs++;
    st.legsTotal++;
    S.members.forEach(m => st.stats[m].legsWon++);
    if (S.legs >= st.config.legs) {
      st.finished = true;
      st.winner = side;
      st.ended = Date.now();
    } else {
      st.legEvent = { side, at: Date.now() };
      st.legNo++;
      st.legStarter = (st.legStarter + 1) % st.sides.length;
      startLeg(st);
    }
  } else {
    L.turn = (side + 1) % st.sides.length;
  }
  return visit;
}

export const mpr = s => (s.darts ? (s.marks / s.darts) * 3 : 0);

export function cricketResults(st) {
  return st.players.map((p, i) => {
    const s = st.stats[i];
    const side = st.sides.findIndex(x => x.members.includes(i));
    const won = side === st.winner;
    return {
      metric: +mpr(s).toFixed(2), better: 'high', unit: 'MPR',
      detail: `${won ? 'Sieg' : 'Niederlage'} · ${s.marks} Marks in ${s.darts} Darts`,
      marks: s.marks, darts: s.darts, won, side, legsWon: s.legsWon, rank: won ? 1 : 2,
    };
  });
}

/* ---------- Dartbot-Strategie ---------- */

/** Ziel für den nächsten Bot-Dart: erst eigene Zahlen schließen, bei Rückstand auf offenen Zahlen punkten. */
export function cricketBotTarget(st) {
  const L = st.leg, side = L.turn, mine = L.marks[side], mode = st.config.mode;
  const others = L.marks.filter((_, i) => i !== side);
  const myPts = L.pts[side];
  const oppBest = mode === 'cutthroat' ? Math.min(...L.pts.filter((_, i) => i !== side)) : Math.max(...L.pts.filter((_, i) => i !== side));
  const behind = mode === 'cutthroat' ? myPts > oppBest : myPts < oppBest;
  const aim = n => (n === 25 ? throwOf(25, 2) : throwOf(n, 3));
  // Punkten, wenn im Rückstand und eine eigene geschlossene Zahl beim Gegner noch offen ist
  if (mode !== 'noscore' && behind) {
    const score = CRICKET_NUMS.find(n => mine[n] >= 3 && others.some(m => m[n] < 3));
    if (score) return aim(score);
  }
  // Sonst die höchste noch offene Zahl schließen
  const open = CRICKET_NUMS.find(n => mine[n] < 3);
  if (open) return aim(open);
  const score = CRICKET_NUMS.find(n => others.some(m => m[n] < 3));
  return aim(score || 20);
}
