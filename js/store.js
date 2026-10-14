// Persistenz im localStorage: Spieler, Spielhistorie, Einstellungen, laufendes Spiel.

const KEY = 'dartcounter.v2';

const DEFAULTS = () => ({
  players: [],
  games: [],
  current: null,
  settings: { inputMode: 'total', theme: 'red', lastSetup: {} },
});

export const COLORS = ['#ef233c', '#3b82f6', '#f59e0b', '#22c55e', '#a855f7', '#eab308', '#14b8a6', '#ec4899', '#64748b', '#84cc16'];

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (!raw) return DEFAULTS();
    const d = DEFAULTS();
    return { ...d, ...raw, settings: { ...d.settings, ...raw.settings } };
  } catch {
    return DEFAULTS();
  }
}

export const db = load();

let saveHook = null;

/** Wird nach jedem save() aufgerufen (Cloud-Sync). */
export function onSave(fn) {
  saveHook = fn;
}

export function saveLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (e) {
    console.error('Speichern fehlgeschlagen', e);
  }
}

export function save() {
  saveLocal();
  saveHook?.();
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function getPlayer(id) {
  return db.players.find(p => p.id === id);
}

export function addPlayer(name) {
  const used = new Set(db.players.map(p => p.color));
  const color = COLORS.find(c => !used.has(c)) || COLORS[db.players.length % COLORS.length];
  const p = { id: uid(), name: name.trim(), color, created: Date.now() };
  db.players.push(p);
  save();
  return p;
}

export function deletePlayer(id) {
  db.players = db.players.filter(p => p.id !== id);
  save();
}

export function exportData() {
  return JSON.stringify({ app: 'dart-counter', version: 2, players: db.players, games: db.games, settings: db.settings }, null, 2);
}

export function importData(json) {
  const d = JSON.parse(json);
  if (!Array.isArray(d.players) || !Array.isArray(d.games)) throw new Error('Ungültige Datei');
  // Zusammenführen nach ID – importierte Einträge überschreiben gleiche IDs
  const merge = (cur, inc) => [...new Map([...cur, ...inc].map(x => [x.id, x])).values()];
  db.players = merge(db.players, d.players);
  db.games = merge(db.games, d.games).sort((a, b) => a.date - b.date);
  if (d.settings) db.settings = { ...db.settings, ...d.settings };
  save();
}

export function resetAll() {
  Object.assign(db, DEFAULTS());
  save();
}
