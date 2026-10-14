// Trainingsspiele: Around the Clock, Bob's 27, Power Scoring, Doppeltraining, Checkout 121.
import { uid } from './store.js';
import { canFinish } from './checkout.js';
import { validTotal } from './x01.js';

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
  } else if (type === 'c121') {
    st.ps = players.map(() => ({ target: 121, rem: 121, visit: 0, attempt: 0, success: 0, best: 0, darts: 0, done: false }));
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
    case 'c121': {
      if (!validTotal(val)) return false;
      p.visit++;
      p.darts += 3;
      const after = p.rem - val;
      let msg;
      if (after === 0) {
        p.success++;
        p.best = Math.max(p.best, p.target);
        msg = `${name} checkt ${p.target}! ✔`;
        p.target++;
        nextAttempt(st, p);
        st.last = { text: msg, good: true };
      } else {
        if (after > 1) p.rem = after; // sonst Bust
        if (p.visit >= 3) {
          msg = `${name}: ${p.target} nicht gecheckt`;
          if (st.config.onFail === 'reset') p.target = 121;
          nextAttempt(st, p);
        } else msg = `${name}: ${after < 0 || after === 1 ? 'Bust' : val}`;
        st.last = { text: msg, good: false };
      }
      advance(st);
      break;
    }
  }
  return true;
}

function nextAttempt(st, p) {
  p.attempt++;
  p.visit = 0;
  p.rem = p.target;
  if (p.attempt >= st.config.attempts) p.done = true;
}

export function c121CanFinish(rem) {
  return canFinish(rem, 'double');
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
      case 'c121': return { metric: p.success, better: 'high', unit: 'Checks', detail: `Höchstes Ziel ${p.best || '–'} · ${p.attempt} Versuche`, best: p.best };
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
    case 'c121': return { key: `c121-${c.attempts}`, label: `Checkout 121 · ${c.attempts} Versuche` };
  }
}
