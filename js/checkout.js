// Checkout-Rechner: findet den empfohlenen Finish-Weg für einen Restwert.

export const THROWS = [];
for (let n = 20; n >= 1; n--) THROWS.push({ n, m: 3, v: n * 3, label: 'T' + n });
for (let n = 20; n >= 1; n--) THROWS.push({ n, m: 1, v: n, label: String(n) });
for (let n = 20; n >= 1; n--) THROWS.push({ n, m: 2, v: n * 2, label: 'D' + n });
THROWS.push({ n: 25, m: 1, v: 25, label: '25' }, { n: 25, m: 2, v: 50, label: 'Bull' });

export const MISS = { n: 0, m: 0, v: 0, label: '0' };

export function throwOf(n, m) {
  if (n === 0) return MISS;
  if (n === 25) return m >= 2 ? THROWS[THROWS.length - 1] : THROWS[THROWS.length - 2];
  return THROWS.find(t => t.n === n && t.m === m);
}

// Beliebte Doppel bekommen niedrige Kosten
const DOUBLE_COST = { 20: 0, 16: 0, 18: 1, 12: 1, 10: 1, 8: 1, 14: 2, 6: 2, 4: 2, 25: 3, 2: 3, 1: 4 };

function setupCost(t) {
  if (t.m === 1) return t.n === 25 ? 4 : 1;
  if (t.m === 3) return t.n >= 18 ? 2 : t.n >= 15 ? 3 : 4;
  return 6; // Doppel als Vorbereitung vermeiden
}

export function finishOk(t, out) {
  if (out === 'single') return t.v > 0;
  if (out === 'master') return t.m >= 2;
  return t.m === 2;
}

function finishCost(t, out) {
  if (out === 'single') return t.m === 1 ? 0 : t.m === 2 ? 1 : 2;
  if (t.m === 2) return DOUBLE_COST[t.n] ?? 3;
  return 3 + (20 - t.n) / 10; // Triple-Finish bei Master Out
}

const memo = new Map();

/** Liefert den besten Finish-Weg (Array von Würfen) mit max. `darts` Darts oder null. */
export function checkoutRoute(rem, darts = 3, out = 'double') {
  const key = rem + '|' + darts + '|' + out;
  if (memo.has(key)) return memo.get(key);
  let best = null;
  if (rem > 0 && rem <= 180) {
    const fins = THROWS.filter(t => finishOk(t, out));
    for (let k = 1; k <= darts && !best; k++) {
      let bestCost = Infinity;
      for (const f of fins) {
        const need = rem - f.v;
        if (k === 1) {
          if (need === 0) {
            const c = finishCost(f, out);
            if (c < bestCost) { bestCost = c; best = [f]; }
          }
        } else if (k === 2) {
          for (const a of THROWS) {
            if (a.v !== need) continue;
            const c = setupCost(a) + finishCost(f, out);
            if (c < bestCost) { bestCost = c; best = [a, f]; }
          }
        } else {
          for (const a of THROWS) {
            if (a.v >= need) continue;
            for (const b of THROWS) {
              if (a.v + b.v !== need || b.v > a.v) continue;
              const c = setupCost(a) + setupCost(b) + finishCost(f, out);
              if (c < bestCost) { bestCost = c; best = [a, b, f]; }
            }
          }
        }
      }
    }
  }
  memo.set(key, best);
  return best;
}

export function canFinish(rem, out = 'double', darts = 3) {
  return checkoutRoute(rem, darts, out) !== null;
}

export function minDarts(rem, out = 'double') {
  const r = checkoutRoute(rem, 3, out);
  return r ? r.length : null;
}
