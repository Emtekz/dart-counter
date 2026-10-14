// X01-Spiellogik (301/501/701 …) mit Legs/Sets, Double/Master Out, Double In und Teams.
import { checkoutRoute, finishOk } from './checkout.js';
import { uid } from './store.js';

const IMPOSSIBLE = new Set([163, 166, 169, 172, 173, 175, 176, 178, 179]);

export function validTotal(s) {
  return Number.isInteger(s) && s >= 0 && s <= 180 && !IMPOSSIBLE.has(s);
}

function emptyStats() {
  return { darts: 0, points: 0, f9d: 0, f9p: 0, s180: 0, s140: 0, s100: 0, high: 0, highCo: 0, coDone: 0, coAtt: 0, legsWon: 0, bestLeg: null };
}

/**
 * players: [{ name, playerId|null, kind: 'human'|'guest'|'bot', level?, color }]
 * sides:   [{ name, members: [playerIndex, ...] }]
 */
export function newX01(config, players, sides) {
  const st = {
    type: 'x01', id: uid(), started: Date.now(), config, players,
    sides: sides.map(s => ({ ...s, ptr: 0, legs: 0, sets: 0 })),
    legStarter: 0, legNo: 1, legsTotal: 0,
    stats: players.map(emptyStats),
    finished: false, winner: null, last: null, legEvent: null,
  };
  startLeg(st);
  return st;
}

function startLeg(st) {
  st.leg = {
    rem: st.sides.map(() => st.config.start),
    opened: st.sides.map(() => st.config.in !== 'double'),
    turn: st.legStarter,
    cur: [],
    pv: {},
    sideDarts: st.sides.map(() => 0),
  };
}

export function activeIndex(st) {
  const s = st.sides[st.leg.turn];
  return s.members[s.ptr];
}

export function curScore(st) {
  return st.leg.cur.reduce((a, d) => a + d.score, 0);
}

/** Aufnahme abschließen. score = gezählte Punkte, darts = geworfene Darts. */
function commit(st, score, darts, bust, labels) {
  const L = st.leg, side = L.turn, S = st.sides[side], pi = S.members[S.ptr], ps = st.stats[pi];
  const out = st.config.out;
  const before = L.rem[side];
  const couldFinish = L.opened[side] && checkoutRoute(before, 3, out) !== null;
  if (!bust) {
    const after = before - score;
    if (after < 0 || (after === 1 && out !== 'single')) bust = true;
  }
  const pts = bust ? 0 : score;
  const nv = (L.pv[pi] = (L.pv[pi] || 0) + 1);
  ps.darts += darts;
  ps.points += pts;
  if (nv <= 3) { ps.f9d += darts; ps.f9p += pts; }
  if (pts === 180) ps.s180++;
  else if (pts >= 140) ps.s140++;
  else if (pts >= 100) ps.s100++;
  ps.high = Math.max(ps.high, pts);
  if (couldFinish) ps.coAtt++;
  L.sideDarts[side] += darts;
  if (!bust) {
    L.rem[side] -= pts;
    if (pts > 0) L.opened[side] = true;
  }
  const checkout = !bust && L.rem[side] === 0;
  st.last = { side, pi, score: pts, darts, bust, checkout, before, labels: labels || null, at: Date.now() };
  L.cur = [];
  S.ptr = (S.ptr + 1) % S.members.length;
  if (checkout) {
    ps.coDone++;
    ps.highCo = Math.max(ps.highCo, before);
    finishLeg(st, side);
  } else {
    L.turn = (side + 1) % st.sides.length;
  }
  return st.last;
}

function finishLeg(st, side) {
  const S = st.sides[side];
  const darts = st.leg.sideDarts[side];
  st.legsTotal++;
  for (const m of S.members) {
    const ps = st.stats[m];
    ps.legsWon++;
    if (ps.bestLeg == null || darts < ps.bestLeg) ps.bestLeg = darts;
  }
  S.legs++;
  let setWon = false;
  if (st.config.format === 'sets') {
    if (S.legs >= st.config.legs) {
      S.sets++;
      setWon = true;
      st.sides.forEach(s => (s.legs = 0));
      if (S.sets >= st.config.sets) return endMatch(st, side);
    }
  } else if (S.legs >= st.config.legs) {
    return endMatch(st, side);
  }
  st.legEvent = { side, darts, checkout: st.last.before, setWon, at: Date.now() };
  st.legNo++;
  st.legStarter = (st.legStarter + 1) % st.sides.length;
  startLeg(st);
}

function endMatch(st, side) {
  st.finished = true;
  st.winner = side;
  st.ended = Date.now();
}

/** Eingabe als Gesamtpunktzahl einer Aufnahme. */
export function submitTotal(st, score, darts = 3) {
  return commit(st, score, darts, false, null);
}

/** Eingabe Dart für Dart. Gibt die Aufnahme zurück, sobald sie abgeschlossen ist. */
export function throwDart(st, t) {
  const L = st.leg, side = L.turn, out = st.config.out;
  const opened = L.opened[side] || L.cur.some(d => d.score > 0);
  const counted = opened || t.m === 2;
  const v = counted ? t.v : 0;
  L.cur.push({ label: t.v === 0 ? '0' : t.label, score: v });
  const total = curScore(st);
  const after = L.rem[side] - total;
  const n = L.cur.length;
  const labels = L.cur.map(d => d.label);
  if (after < 0 || (after === 1 && out !== 'single') || (after === 0 && !finishOk(t, out))) {
    return commit(st, total, n, true, labels);
  }
  if (after === 0 || n === 3) return commit(st, total, n, false, labels);
  return null;
}

/** Zusammenfassung pro Spieler für die Historie. */
export function x01Results(st) {
  return st.players.map((p, i) => {
    const side = st.sides.findIndex(s => s.members.includes(i));
    return { ...st.stats[i], legsPlayed: st.legsTotal, won: side === st.winner, side };
  });
}

export function avg(points, darts) {
  return darts ? (points / darts) * 3 : 0;
}
