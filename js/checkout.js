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

// Beliebte Doppel bekommen niedrige Kosten (orientiert an gängigen Profi-Checkout-Tabellen)
const DOUBLE_COST = { 20: 0, 16: 0, 18: 1, 12: 1, 10: 1, 8: 1, 14: 2, 6: 2, 4: 2, 2: 3, 1: 4, 25: 3.5 };

function setupCost(t) {
  if (t.m === 1) return t.n === 25 ? 3.2 : t.n >= 9 ? 1 : 1.5; // große Singles sind sichere Stellwürfe
  if (t.m === 3) return t.n >= 17 ? 2 : t.n >= 15 ? 3 : 5; // kleine Triples vermeiden
  return t.n === 25 ? 4 : 7; // Doppel als Vorbereitung vermeiden (Bull nur, wenn nötig – z. B. 170)
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

/**
 * Alle sinnvollen Finish-Wege mit der kleinstmöglichen Dartzahl (max. `darts`), nach Güte sortiert.
 * prefer: Lieblingsdoppel (z. B. 16 oder 25 für Bull) wird beim Ausmachen bevorzugt.
 */
export function checkoutRoutes(rem, darts = 3, out = 'double', { prefer = null, limit = 3 } = {}) {
  const key = [rem, darts, out, prefer, limit].join('|');
  if (memo.has(key)) return memo.get(key);
  let found = [];
  if (rem > 0 && rem <= 180) {
    const fins = THROWS.filter(t => finishOk(t, out));
    const fc = f => finishCost(f, out) - (prefer && f.n === prefer && f.m === 2 ? 1.5 : 0);
    for (let k = 1; k <= darts && !found.length; k++) {
      for (const f of fins) {
        const need = rem - f.v;
        if (k === 1) {
          if (need === 0) found.push({ c: fc(f), r: [f] });
        } else if (k === 2) {
          for (const a of THROWS) if (a.v === need) found.push({ c: setupCost(a) + fc(f), r: [a, f] });
        } else {
          for (const a of THROWS) {
            if (a.v >= need) continue;
            for (const b of THROWS) {
              if (a.v + b.v === need && b.v <= a.v) found.push({ c: setupCost(a) + setupCost(b) + fc(f), r: [a, b, f] });
            }
          }
        }
      }
    }
  }
  const seen = new Set();
  const out_ = found.sort((x, y) => x.c - y.c).map(x => x.r).filter(r => {
    const k = r.map(t => t.label).join(' ');
    return !seen.has(k) && seen.add(k);
  }).slice(0, limit);
  memo.set(key, out_);
  return out_;
}

// Standard-Checkout-Tabelle (Double Out), wie sie Profis spielen.
const CHART_SRC = `170 T20 T20 Bull|167 T20 T19 Bull|164 T20 T18 Bull|161 T20 T17 Bull|160 T20 T20 D20|158 T20 T20 D19|157 T20 T19 D20|156 T20 T20 D18|155 T20 T19 D19|154 T20 T18 D20|153 T20 T19 D18|152 T20 T20 D16|151 T20 T17 D20|150 T20 T18 D18|149 T20 T19 D16|148 T20 T20 D14|147 T20 T17 D18|146 T20 T18 D16|145 T20 T15 D20|144 T20 T20 D12|143 T20 T17 D16|142 T20 T14 D20|141 T20 T19 D12|140 T20 T20 D10|139 T20 T13 D20|138 T20 T18 D12|137 T20 T19 D10|136 T20 T20 D8|135 T20 T17 D12|134 T20 T14 D16|133 T20 T19 D8|132 T20 T16 D12|131 T20 T13 D16|130 T20 T20 D5|129 T19 T16 D12|128 T18 T14 D16|127 T20 T17 D8|126 T19 T19 D6|125 25 T20 D20|124 T20 T16 D8|123 T19 T16 D9|122 T18 T20 D4|121 T20 11 Bull|120 T20 20 D20|119 T19 T12 D13|118 T20 18 D20|117 T20 17 D20|116 T20 16 D20|115 T20 15 D20|114 T20 14 D20|113 T20 13 D20|112 T20 12 D20|111 T20 19 D16|110 T20 Bull|109 T20 9 D20|108 T20 16 D16|107 T19 Bull|106 T20 10 D18|105 T20 13 D16|104 T18 Bull|103 T20 3 D20|102 T20 10 D16|101 T17 Bull|100 T20 D20|99 T19 10 D16|98 T20 D19|97 T19 D20|96 T20 D18|95 T19 D19|94 T18 D20|93 T19 D18|92 T20 D16|91 T17 D20|90 T20 D15|89 T19 D16|88 T20 D14|87 T17 D18|86 T18 D16|85 T15 D20|84 T20 D12|83 T17 D16|82 Bull D16|81 T19 D12|80 T20 D10|79 T19 D11|78 T18 D12|77 T19 D10|76 T20 D8|75 T17 D12|74 T14 D16|73 T19 D8|72 T16 D12|71 T13 D16|70 T18 D8|69 T19 D6|68 T20 D4|67 T17 D8|66 T10 D18|65 T19 D4|64 T16 D8|63 T13 D12|62 T10 D16|61 T15 D8|60 20 D20|59 19 D20|58 18 D20|57 17 D20|56 16 D20|55 15 D20|54 14 D20|53 13 D20|52 12 D20|51 19 D16|50 10 D20|49 17 D16|48 16 D16|47 15 D16|46 6 D20|45 13 D16|44 12 D16|43 3 D20|42 10 D16|41 9 D16|39 7 D16|37 5 D16|35 3 D16|33 1 D16|31 15 D8|29 13 D8|27 11 D8|25 9 D8|23 7 D8|21 5 D8|19 3 D8|17 1 D8|15 7 D4|13 5 D4|11 3 D4|9 1 D4|7 3 D2|5 1 D2|3 1 D1`;
const CHART = new Map();
const parseThrow = l => (l === 'Bull' ? throwOf(25, 2) : l === '25' ? throwOf(25, 1)
  : l[0] === 'T' ? throwOf(+l.slice(1), 3) : l[0] === 'D' ? throwOf(+l.slice(1), 2) : throwOf(+l, 1));
for (const e of CHART_SRC.split('|')) {
  const [n, ...ts] = e.split(' ');
  CHART.set(+n, ts.map(parseThrow));
}
for (let n = 2; n <= 40; n += 2) CHART.set(n, [throwOf(n / 2, 2)]);

// „Saubere“ Wege: Vorbereitung nur über Singles, große Triples (ab T15) oder 25/Bull
const clean = r => r.slice(0, -1).every(t => t.m === 1 || t.n === 25 || (t.m === 3 && t.n >= 15));

/**
 * Empfohlener Finish-Weg (Array von Würfen) mit max. `darts` Darts oder null.
 * Double Out: Standard-Tabelle, sofern mit den verbleibenden Darts spielbar; sonst Berechnung.
 * prefer: Lieblingsdoppel – wird genommen, wenn es einen gleich kurzen Weg darüber gibt.
 */
export function checkoutRoute(rem, darts = 3, out = 'double', prefer = null) {
  const calc = checkoutRoutes(rem, darts, out, { limit: 40 });
  if (!calc.length) return null;
  if (prefer) {
    const len = calc[0].length;
    const fav = calc.find(r => r.length === len && r[r.length - 1].n === prefer && r[r.length - 1].m === 2 && clean(r));
    if (fav) return fav;
  }
  const std = out === 'double' ? CHART.get(rem) : null;
  if (std && std.length <= darts && std.length <= calc[0].length + (rem === 50 ? 1 : 0)) return std;
  return calc[0];
}

/** Empfohlener Weg plus Alternativen (ohne Duplikate). */
export function checkoutOptions(rem, darts = 3, out = 'double', prefer = null, limit = 3) {
  const main = checkoutRoute(rem, darts, out, prefer);
  if (!main) return [];
  const key = r => r.map(t => t.label).join(' ');
  const rest = checkoutRoutes(rem, darts, out, { prefer, limit: 30 }).filter(r => key(r) !== key(main) && clean(r));
  return [main, ...rest].slice(0, limit);
}

export function canFinish(rem, out = 'double', darts = 3) {
  return checkoutRoute(rem, darts, out) !== null;
}

export function minDarts(rem, out = 'double') {
  const r = checkoutRoutes(rem, 3, out, { limit: 1 })[0];
  return r ? r.length : null;
}
