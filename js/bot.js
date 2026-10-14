// Dartbot: simuliert Würfe mit normalverteilter Streuung auf einem echten Board-Modell.
import { THROWS, MISS, checkoutRoute, finishOk, throwOf } from './checkout.js';

const ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// Streuung (mm) je Stufe – per Simulation kalibriert auf ungefähre 3-Dart-Averages (501 Double Out).
// Im Finish-Bereich (Doppel oder Rest <= 60) wirft der Bot konzentrierter (dsigma).
export const BOT_LEVELS = [
  { sigma: 54.2, dsigma: 29.8, avg: 25 },
  { sigma: 36.2, dsigma: 21.6, avg: 32 },
  { sigma: 24.4, dsigma: 15.6, avg: 40 },
  { sigma: 19.4, dsigma: 13.3, avg: 48 },
  { sigma: 15.5, dsigma: 11.3, avg: 56 },
  { sigma: 13.1, dsigma: 10.2, avg: 64 },
  { sigma: 11.3, dsigma: 9.3, avg: 72 },
  { sigma: 9.3, dsigma: 8.1, avg: 81 },
  { sigma: 7.7, dsigma: 7.0, avg: 91 },
  { sigma: 6.5, dsigma: 6.2, avg: 100 },
];

function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function aimPoint(t) {
  if (t.n === 25) return [0, 0];
  const i = ORDER.indexOf(t.n);
  const ang = (90 - i * 18) * Math.PI / 180;
  const r = t.m === 3 ? 103 : t.m === 2 ? 166 : 134;
  return [r * Math.cos(ang), r * Math.sin(ang)];
}

export function scoreAt(x, y) {
  const r = Math.hypot(x, y);
  if (r > 170) return MISS;
  if (r <= 6.35) return throwOf(25, 2);
  if (r <= 15.9) return throwOf(25, 1);
  const ang = Math.atan2(y, x) * 180 / Math.PI;
  const idx = ((Math.round((90 - ang) / 18) % 20) + 20) % 20;
  const n = ORDER[idx];
  const m = r >= 99 && r <= 107 ? 3 : r >= 162 ? 2 : 1;
  return throwOf(n, m);
}

export function throwAt(target, level, finishing = false) {
  const L = BOT_LEVELS[level - 1];
  const sigma = finishing || target.m === 2 ? L.dsigma : L.sigma;
  const [x, y] = aimPoint(target);
  return scoreAt(x + gauss() * sigma, y + gauss() * sigma);
}

const T20 = throwOf(20, 3), T19 = throwOf(19, 3), D20 = throwOf(20, 2);

/** Wählt das Ziel für den nächsten Dart. */
export function chooseTarget(rem, dartsLeft, out, opened) {
  if (!opened) return D20;
  const route = checkoutRoute(rem, dartsLeft, out);
  if (route) return route[0];
  if (rem >= 99) return rem - 60 === 1 && out !== 'single' ? T19 : T20;
  // Stellwurf: Rest so legen, dass ein gutes Finish bleibt
  let best = T20, bestCost = Infinity;
  for (const t of THROWS) {
    const left = rem - t.v;
    if (left < 0 || (left <= 1 && out !== 'single')) continue;
    if (left === 0 && !finishOk(t, out)) continue;
    const r1 = checkoutRoute(left, 1, out);
    const r2 = r1 ? null : checkoutRoute(left, 2, out);
    let c = t.m === 1 ? (t.n === 25 ? 3 : 0) : t.m === 3 ? 2 : 4;
    c += r1 ? 0 : r2 ? 6 : 12;
    if (c < bestCost) { bestCost = c; best = t; }
  }
  return best;
}
