// Trainingsspiele: Around the Clock, Bob's 27, Power Scoring, Doppeltraining, Checkout 121.
import { uid } from './store.js';
import { validTotal } from './x01.js';
import { minDarts } from './checkout.js';

// Bereiche für Zufalls-Checkouts
export const RCHECK_RANGES = { '2-40': [2, 40], '41-80': [41, 80], '61-100': [61, 100], '101-170': [101, 170], '2-170': [2, 170] };

const ALL_DOUBLES = [...Array.from({ length: 20 }, (_, i) => i + 1), 25];

export const dlabel = n => (n === 25 ? 'Bull' : 'D' + n);

export function newTraining(type, config, players) {
  const st = { type, id: uid(), started: Date.now(), config, players, turn: 0, round: 1, finished: false, cur: [], last: null };
  if (type === 'atc') {
    st.targets = [...Array.from({ length: 20 }, (_, i) => i + 1), ...(config.bull ? [25] : [])];
    st.ps = players.map(() => ({ idx: 0, darts: 0, hits: 0, done: false }));
  } else if (type === 'bobs27') {
    st.targets = ALL_DOUBLES;
    st.ps = players.map(() => ({ score: 27, idx: 0, hits: 0, darts: 0, done: false, out: false, per: {} }));
  } else if (type === 'power') {
    st.ps = players.map(() => ({ total: 0, n: 0, high: 0, visits: [], done: false }));
  } else if (type === 'doubles') {
    if (config.mode === 'seq') st.targets = ALL_DOUBLES;
    else if (config.mode === 'random') st.targets = Array.from({ length: config.rounds }, () => ALL_DOUBLES[Math.floor(Math.random() * 21)]);
    else st.targets = Array(config.rounds).fill(config.target);
    st.ps = players.map(() => ({ idx: 0, hits: 0, darts: 0, per: {}, done: false }));
  } else if (type === 'rcheck') {
    // Für alle Spieler dieselben Zufalls-Restwerte – nur Werte, die mit den Darts pro Checkout checkbar sind
    const [lo, hi] = RCHECK_RANGES[config.range] || [2, 170];
    const ok = [];
    for (let n = lo; n <= hi; n++) { const md = minDarts(n, 'double'); if (md && md <= Math.min(3, config.darts)) ok.push(n); }
    st.targets = Array.from({ length: config.count }, () => ok[Math.floor(Math.random() * ok.length)]);
    st.ps = players.map(() => ({ idx: 0, rem: st.targets[0], visit: 0, success: 0, darts: 0, successDarts: 0, done: false }));
  } else if (type === 'c121') {
    const lives = config.lives || 3;
    st.ps = players.map(() => ({ target: 121, rem: 121, visit: 0, checkpoint: 121, lives, success: 0, best: 0, darts: 0, done: false }));
  }
  return st;
}

function advance(st) {
  const n = st.players.length;
  st.cur = [];
  for (let i = 1; i <= n; i++) {
    const j = (st.turn + i) % n;
    if (!st.ps[j].done) {
      if (j <= st.turn) st.round++;
      st.turn = j;
      return;
    }
  }
  st.finished = true;
  st.ended = Date.now();
}

/**
 * Eingabe je Spiel:
 *  atc:     0 = daneben, 1/2/3 = Treffer (bei "Sprünge" Single/Double/Triple)
 *  bobs27 / doubles: Anzahl Treffer 0–3
 *  power / c121: Punktzahl der Aufnahme
 */
export function trainingInput(st, val) {
  const p = st.ps[st.turn], name = st.players[st.turn].name;
  switch (st.type) {
    case 'atc': {
      p.darts++;
      if (val > 0) {
        p.hits++;
        p.idx = Math.min(st.targets.length, p.idx + (st.config.jumps ? val : 1));
      }
      st.cur.push(val);
      if (p.idx >= st.targets.length) {
        p.done = true;
        st.last = { text: `${name} ist durch – ${p.darts} Darts`, good: true };
        advance(st);
      } else if (st.cur.length === 3) {
        st.last = { text: `${name}: ${st.cur.filter(v => v > 0).length} Treffer`, good: st.cur.some(v => v > 0) };
        advance(st);
      }
      break;
    }
    case 'bobs27': {
      const t = st.targets[p.idx];
      const v = t === 25 ? 50 : t * 2;
      p.darts += 3;
      p.hits += val;
      const pt = (p.per[t] = p.per[t] || [0, 0]);
      pt[0] += val;
      pt[1] += 3;
      const delta = val === 0 ? -v : val * v;
      p.score += delta;
      p.idx++;
      st.last = { text: `${name}: ${dlabel(t)} ${val}× → ${delta > 0 ? '+' : ''}${delta}`, good: val > 0 };
      if (st.config.elim && p.score < 0) { p.out = true; p.done = true; st.last.text += ' – ausgeschieden'; }
      if (p.idx >= st.targets.length) p.done = true;
      advance(st);
      break;
    }
    case 'power': {
      if (!validTotal(val)) return false;
      p.total += val;
      p.n++;
      p.high = Math.max(p.high, val);
      p.visits.push(val);
      st.last = { text: `${name}: ${val}`, good: val >= 100 };
      if (p.n >= st.config.rounds) p.done = true;
      advance(st);
      break;
    }
    case 'doubles': {
      const t = st.targets[p.idx];
      p.hits += val;
      p.darts += 3;
      const per = (p.per[t] = p.per[t] || [0, 0]);
      per[0] += val;
      per[1] += 3;
      p.idx++;
      st.last = { text: `${name}: ${dlabel(t)} ${val}/3`, good: val > 0 };
      if (p.idx >= st.targets.length) p.done = true;
      advance(st);
      break;
    }
    case 'rcheck': {
      if (!validTotal(val)) return false;
      const maxDarts = st.config.darts || 6;
      p.visit++;
      p.darts += 3;
      const used = p.visit * 3, target = st.targets[p.idx];
      const after = p.rem - val;
      const next = () => {
        p.idx++;
        p.visit = 0;
        if (p.idx >= st.targets.length) p.done = true;
        else p.rem = st.targets[p.idx];
      };
      if (after === 0) {
        p.success++;
        p.successDarts += used;
        st.last = { text: `${name} checkt ${target} in ${used} Darts! ✔`, good: true };
        next();
      } else {
        const bust = after < 0 || after === 1;
        if (!bust) p.rem = after;
        if (used >= maxDarts) {
          st.last = { text: `${name}: ${target} nicht gecheckt`, good: false };
          next();
        } else {
          st.last = { text: `${name}: ${bust ? 'Bust' : val} · noch ${maxDarts - used} Darts`, good: false };
        }
      }
      advance(st);
      break;
    }
    case 'c121': {
      if (!validTotal(val)) return false;
      const maxDarts = st.config.darts || 9;
      const cpLimit = st.config.checkpoint || 0;
      p.visit++;
      p.darts += 3;
      const used = p.visit * 3;
      const after = p.rem - val;
      if (after === 0) {
        p.success++;
        p.best = Math.max(p.best, p.target);
        let msg = `${name} checkt ${p.target} in ${used} Darts! ✔`;
        if (cpLimit && used <= cpLimit) {
          p.checkpoint = p.target;
          msg += ` Checkpoint ${p.target}`;
        }
        st.last = { text: msg, good: true };
        p.target++;
        nextTarget(p);
      } else {
        const bust = after < 0 || after === 1;
        if (!bust) p.rem = after;
        if (used >= maxDarts) {
          p.lives--;
          let msg = `${name}: ${p.target} nicht gecheckt – noch ${p.lives} Leben`;
          if (st.config.onFail !== 'stay') {
            p.target = p.checkpoint;
            msg += ` · zurück auf ${p.checkpoint}`;
          }
          nextTarget(p);
          if (p.lives <= 0) { p.done = true; msg = `${name}: keine Leben mehr – höchstes Ziel ${p.best || '–'}`; }
          st.last = { text: msg, good: false };
        } else {
          st.last = { text: `${name}: ${bust ? 'Bust' : val} · noch ${maxDarts - used} Darts`, good: false };
        }
      }
      advance(st);
      break;
    }
  }
  return true;
}

function nextTarget(p) {
  p.visit = 0;
  p.rem = p.target;
}

/** Ergebnis je Spieler: metric (Hauptwert), Ranking und Detailtext. */
export function trainingResults(st) {
  const res = st.players.map((pl, i) => {
    const p = st.ps[i];
    switch (st.type) {
      case 'atc': return { metric: p.darts, better: 'low', unit: 'Darts', detail: `${pct(p.hits, p.darts)} Trefferquote`, hits: p.hits, darts: p.darts };
      case 'bobs27': return { metric: p.score, better: 'high', unit: 'Punkte', detail: `${p.out ? 'ausgeschieden · ' : ''}${pct(p.hits, p.darts)} Doppelquote`, hits: p.hits, darts: p.darts };
      case 'power': return { metric: +(p.n ? p.total / p.n : 0).toFixed(1), better: 'high', unit: 'Ø', detail: `${p.total} Punkte · Höchste ${p.high}`, total: p.total };
      case 'doubles': return { metric: +(p.darts ? (p.hits / p.darts) * 100 : 0).toFixed(1), better: 'high', unit: '%', detail: `${p.hits}/${p.darts} Doppel getroffen`, hits: p.hits, darts: p.darts };
      case 'rcheck': return { metric: +((p.success / st.targets.length) * 100).toFixed(1), better: 'high', unit: '%', detail: `${p.success}/${st.targets.length} gecheckt${p.success ? ` · Ø ${(p.successDarts / p.success).toFixed(1).replace('.', ',')} Darts` : ''}`, success: p.success };
      case 'c121': return { metric: p.best, better: 'high', unit: 'Ziel', detail: `${p.success} Checks · ${p.darts} Darts · Checkpoint ${p.checkpoint}`, best: p.best, success: p.success };
    }
  });
  if (st.type === 'doubles' || st.type === 'bobs27') {
    res.forEach((r, i) => {
      const per = st.ps[i].per || {};
      r.dbl = Object.fromEntries(Object.entries(per).map(([k, v]) => [k, v[0]]));
      r.dblAtt = Object.fromEntries(Object.entries(per).map(([k, v]) => [k, v[1]]));
    });
  }
  const sorted = [...res.keys()].sort((a, b) => (res[a].better === 'low' ? res[a].metric - res[b].metric : res[b].metric - res[a].metric));
  sorted.forEach((idx, r) => (res[idx].rank = r + 1));
  return res;
}

export function pct(a, b) {
  return b ? Math.round((a / b) * 100) + ' %' : '–';
}

export function variantOf(type, c) {
  switch (type) {
    case 'atc': {
      const m = { single: 'Beliebig', double: 'Doubles', triple: 'Triples' }[c.mode];
      return { key: `atc-${c.mode}${c.bull ? '-bull' : ''}${c.jumps ? '-jump' : ''}`, label: `Around the Clock · ${m}${c.bull ? ' + Bull' : ''}${c.jumps ? ' · Sprünge' : ''}` };
    }
    case 'bobs27': return { key: 'bobs27', label: "Bob's 27" };
    case 'power': return { key: `power-${c.rounds}`, label: `Power Scoring · ${c.rounds} Aufnahmen` };
    case 'doubles': {
      const m = c.mode === 'seq' ? 'D1 → Bull' : c.mode === 'random' ? `Zufällig (${c.rounds})` : `${dlabel(c.target)} (${c.rounds})`;
      return { key: `doubles-${c.mode}${c.mode === 'fixed' ? '-' + c.target : ''}`, label: `Doppeltraining · ${m}` };
    }
    case 'rcheck': return {
      key: `rcheck-${c.range}-${c.darts}-${c.count}`,
      label: `Zufalls-Checkouts · ${c.range.replace('-', '–')} · ${c.darts} Darts`,
    };
    case 'c121': return {
      key: `c121-${c.darts}-${c.lives}-${c.checkpoint || 0}-${c.onFail}`,
      label: `Checkout 121 · ${c.darts} Darts · ${c.lives} Leben${c.checkpoint ? ` · Checkpoint ≤ ${c.checkpoint}` : ''}`,
    };
  }
}
