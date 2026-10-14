// Langzeit-Statistiken aus der Spielhistorie berechnen.
import { db } from './store.js';

const SUM_KEYS = ['darts', 'points', 'f9d', 'f9p', 's180', 's140', 's100', 'coDone', 'coAtt', 'legsWon', 'legsPlayed'];

export function x01Agg(pid) {
  const a = { games: 0, wins: 0, high: 0, highCo: 0, bestLeg: null, trend: [] };
  SUM_KEYS.forEach(k => (a[k] = 0));
  for (const g of db.games) {
    if (g.type !== 'x01') continue;
    g.players.forEach((p, i) => {
      if (p.playerId !== pid) return;
      const r = g.results[i];
      a.games++;
      if (r.won) a.wins++;
      SUM_KEYS.forEach(k => (a[k] += r[k] || 0));
      a.high = Math.max(a.high, r.high);
      a.highCo = Math.max(a.highCo, r.highCo);
      if (r.bestLeg != null && (a.bestLeg == null || r.bestLeg < a.bestLeg)) a.bestLeg = r.bestLeg;
      if (r.darts) a.trend.push({ date: g.date, avg: (r.points / r.darts) * 3 });
    });
  }
  a.avg = a.darts ? (a.points / a.darts) * 3 : 0;
  a.f9 = a.f9d ? (a.f9p / a.f9d) * 3 : 0;
  a.coRate = a.coAtt ? (a.coDone / a.coAtt) * 100 : null;
  a.winRate = a.games ? (a.wins / a.games) * 100 : null;
  return a;
}

/** Trainingsergebnisse eines Spielers, gruppiert nach Variante. */
export function trainingAgg(pid) {
  const map = new Map();
  for (const g of db.games) {
    if (g.type === 'x01') continue;
    g.players.forEach((p, i) => {
      if (p.playerId !== pid) return;
      const r = g.results[i];
      let e = map.get(g.variant.key);
      if (!e) map.set(g.variant.key, (e = { key: g.variant.key, label: g.variant.label, type: g.type, count: 0, sum: 0, best: null, better: r.better, unit: r.unit, last: null }));
      e.count++;
      e.sum += r.metric;
      if (e.best == null || (r.better === 'low' ? r.metric < e.best : r.metric > e.best)) e.best = r.metric;
      e.last = r.metric;
    });
  }
  return [...map.values()].map(e => ({ ...e, mean: e.sum / e.count }));
}

export function gamesOf(pid) {
  return db.games.filter(g => g.players.some(p => p.playerId === pid));
}

/** Bestenlisten über alle Trainingsvarianten. */
export function trainingBoards() {
  const boards = new Map();
  for (const pl of db.players) {
    for (const e of trainingAgg(pl.id)) {
      let b = boards.get(e.key);
      if (!b) boards.set(e.key, (b = { key: e.key, label: e.label, better: e.better, unit: e.unit, rows: [] }));
      b.rows.push({ player: pl, best: e.best, mean: e.mean, count: e.count });
    }
  }
  for (const b of boards.values()) b.rows.sort((x, y) => (b.better === 'low' ? x.best - y.best : y.best - x.best));
  return [...boards.values()];
}
