// persistence.js
// Remembers the last opened file (and last custom font, if one was
// uploaded) in the browser's IndexedDB, entirely on-device — nothing here
// ever leaves the browser, same as everything else in this app. This is
// what lets a phone user close the tab, come back later, and pick up
// exactly where they left off instead of digging through Downloads again.
//
// "Last file" stays single-slot on purpose — that's the fast, default
// "pick up where I left off" case, and doesn't need to be more than one
// slot. "Recent files" below is a genuine multi-slot addition on top of
// that, for the times someone wants to jump back to a file from earlier
// in the week, not just the very last one.

const YATHAROOP_DB_NAME = 'yatharoop-store';
const YATHAROOP_DB_VERSION = 1;
const STORE_NAME = 'lastSession';

function openYatharoopDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB not available')); return; }
    const req = indexedDB.open(YATHAROOP_DB_NAME, YATHAROOP_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(record) {
  try {
    const db = await openYatharoopDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('यथारूप: सेव नहीं हो सका (जगह की कमी या ब्राउज़र समर्थन नहीं) —', err);
    return false;
  }
}

async function idbGet(key) {
  try {
    const db = await openYatharoopDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return null;
  }
}

async function idbDelete(key) {
  try {
    const db = await openYatharoopDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    return false;
  }
}

// ---- Public API ----
function saveLastFile(fileName, arrayBuffer) {
  return idbPut({ key: 'lastFile', fileName, data: arrayBuffer, savedAt: Date.now() });
}
function getLastFile() {
  return idbGet('lastFile');
}
function clearLastFile() {
  return idbDelete('lastFile');
}

function saveLastFont(fontLabel, arrayBuffer) {
  return idbPut({ key: 'lastFont', fontLabel, data: arrayBuffer, savedAt: Date.now() });
}
function getLastFont() {
  return idbGet('lastFont');
}
function clearLastFont() {
  return idbDelete('lastFont');
}

async function clearSavedSession() {
  await clearLastFile();
  await clearLastFont();
}

// ---- Recent files (multi-slot, additive to the single "last file") ----
// A small manifest key (RECENT_INDEX_KEY) holds just the lightweight list
// — {id, fileName, savedAt} — while each file's actual bytes live under
// their own 'recent:<id>' key. This means listing recent files never has
// to load the (potentially large) byte content of files you're not
// opening right now — only the one entry actually being resumed pays that
// cost.
const RECENT_INDEX_KEY = 'recentFilesIndex';
const MAX_RECENT_FILES = 5;

async function getRecentFilesIndex() {
  const record = await idbGet(RECENT_INDEX_KEY);
  return (record && Array.isArray(record.entries)) ? record.entries : [];
}

async function addRecentFile(fileName, arrayBuffer) {
  const id = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const ok = await idbPut({ key: 'recent:' + id, data: arrayBuffer, fileName, savedAt: Date.now() });
  if (!ok) return false;

  let entries = await getRecentFilesIndex();
  // Reopening a file you already had in the list bumps it to the top
  // instead of listing the same name twice.
  entries = entries.filter(e => e.fileName !== fileName);
  entries.unshift({ id, fileName, savedAt: Date.now() });

  const dropped = entries.slice(MAX_RECENT_FILES);
  entries = entries.slice(0, MAX_RECENT_FILES);
  await idbPut({ key: RECENT_INDEX_KEY, entries });

  // Don't let dropped-off-the-end entries' byte content sit around
  // forever using up storage nobody can reach anymore.
  for (const d of dropped) { await idbDelete('recent:' + d.id); }
  return true;
}

async function getRecentFileData(id) {
  return idbGet('recent:' + id);
}

async function removeRecentFile(id) {
  await idbDelete('recent:' + id);
  let entries = await getRecentFilesIndex();
  entries = entries.filter(e => e.id !== id);
  await idbPut({ key: RECENT_INDEX_KEY, entries });
}

async function clearAllRecentFiles() {
  const entries = await getRecentFilesIndex();
  for (const e of entries) { await idbDelete('recent:' + e.id); }
  await idbDelete(RECENT_INDEX_KEY);
}

