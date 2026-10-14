// Cloud-Synchronisation über Firebase (Google-Anmeldung + Firestore).
// Spieler und Spiele liegen unter users/{uid}/players/{id} und users/{uid}/games/{id}.
// Lokale Änderungen werden per Diff gegen den zuletzt synchronisierten Stand hochgeladen.
import { db, saveLocal, onSave } from './store.js';
import { firebaseConfig } from './firebase-config.js';

const BASE = 'https://www.gstatic.com/firebasejs/13.0.0/';
const KINDS = ['players', 'games'];

export const sync = {
  configured: !!firebaseConfig?.apiKey,
  ready: false,
  user: null,
  status: 'off', // off | signedout | connecting | synced | pending | offline | error
  error: null,
};

let A, F, auth, fs, uid = null, onChange = () => {};
let unsubs = [], timer = null;
const shadow = { players: new Map(), games: new Map() };
const meta = { players: null, games: null };

const enc = x => JSON.stringify(x);
const col = kind => F.collection(fs, 'users', uid, kind);

export async function initSync(rerender) {
  onChange = rerender;
  if (!sync.configured) return;
  try {
    const [app, a, f] = await Promise.all([
      import(BASE + 'firebase-app.js'),
      import(BASE + 'firebase-auth.js'),
      import(BASE + 'firebase-firestore.js'),
    ]);
    A = a;
    F = f;
    const appInst = app.initializeApp(firebaseConfig);
    auth = A.getAuth(appInst);
    fs = F.initializeFirestore(appInst, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
    onSave(schedulePush);
    A.getRedirectResult(auth).catch(fail);
    A.onAuthStateChanged(auth, user => {
      stop();
      sync.user = user ? { uid: user.uid, email: user.email, name: user.displayName } : null;
      sync.status = user ? 'connecting' : 'signedout';
      sync.ready = true;
      onChange(true);
      if (user) start(user.uid).catch(fail);
    });
  } catch (e) {
    fail(e);
  }
}

async function start(id) {
  uid = id;
  // Erstabgleich: lokale Einträge, die in der Cloud fehlen, hochladen
  const remote = await Promise.all(KINDS.map(k => F.getDocs(col(k))));
  const ops = [];
  KINDS.forEach((k, i) => {
    const ids = new Set(remote[i].docs.map(d => d.id));
    for (const x of db[k]) if (!ids.has(x.id)) ops.push([k, x]);
  });
  for (let i = 0; i < ops.length; i += 400) {
    const batch = F.writeBatch(fs);
    for (const [k, x] of ops.slice(i, i + 400)) batch.set(F.doc(col(k), x.id), { json: enc(x), t: Date.now() });
    await batch.commit();
  }
  if (uid !== id) return;
  for (const k of KINDS) {
    unsubs.push(F.onSnapshot(col(k), { includeMetadataChanges: true }, snap => applySnapshot(k, snap), fail));
  }
}

function applySnapshot(kind, snap) {
  if (timer) { clearTimeout(timer); push(); }
  const items = snap.docs.map(d => JSON.parse(d.data().json));
  items.sort(kind === 'games' ? (a, b) => a.date - b.date : (a, b) => a.created - b.created);
  const before = enc(db[kind]);
  db[kind] = items;
  shadow[kind] = new Map(items.map(x => [x.id, enc(x)]));
  meta[kind] = { pending: snap.metadata.hasPendingWrites, cache: snap.metadata.fromCache };
  const m = KINDS.map(k => meta[k]);
  sync.status = m.some(x => !x) ? 'connecting' : m.some(x => x.pending) ? 'pending' : m.some(x => x.cache) ? 'offline' : 'synced';
  sync.error = null;
  saveLocal();
  onChange(before !== enc(items));
}

function schedulePush() {
  if (!uid) return;
  clearTimeout(timer);
  timer = setTimeout(push, 400);
}

function push() {
  timer = null;
  if (!uid) return;
  for (const k of KINDS) {
    const cur = new Map(db[k].map(x => [x.id, enc(x)]));
    for (const [id, json] of cur) {
      if (shadow[k].get(id) !== json) F.setDoc(F.doc(col(k), id), { json, t: Date.now() }).catch(fail);
    }
    for (const id of shadow[k].keys()) {
      if (!cur.has(id)) F.deleteDoc(F.doc(col(k), id)).catch(fail);
    }
    shadow[k] = cur;
  }
}

function stop() {
  if (timer) { clearTimeout(timer); push(); }
  unsubs.forEach(u => u());
  unsubs = [];
  uid = null;
  KINDS.forEach(k => { shadow[k] = new Map(); meta[k] = null; });
}

function fail(e) {
  console.error('Sync-Fehler', e);
  sync.status = 'error';
  sync.error = e?.code || e?.message || String(e);
  onChange(false);
}

export async function signIn() {
  const provider = new A.GoogleAuthProvider();
  try {
    await A.signInWithPopup(auth, provider);
  } catch (e) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(e.code)) {
      await A.signInWithRedirect(auth, provider);
    } else if (e.code !== 'auth/popup-closed-by-user') {
      fail(e);
    }
  }
}

export function signOut() {
  stop();
  return A.signOut(auth);
}

export function statusText() {
  return {
    off: 'Nicht eingerichtet', signedout: 'Nicht angemeldet', connecting: 'Verbinde …', synced: 'Synchronisiert',
    pending: 'Wird übertragen …', offline: 'Offline – Änderungen werden später übertragen', error: 'Fehler',
  }[sync.status];
}
