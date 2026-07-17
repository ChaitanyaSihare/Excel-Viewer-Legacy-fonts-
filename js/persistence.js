// persistence.js
// Remembers the last opened file (and last custom font, if one was
// uploaded) in the browser's IndexedDB, entirely on-device — nothing here
// ever leaves the browser, same as everything else in this app. This is
// what lets a phone user close the tab, come back later, and pick up
// exactly where they left off instead of digging through Downloads again.
//
// Single-slot design on purpose: this app is "open one file, read it,
// export it" — not a document library. One saved file + one saved font is
// enough to solve "I lost my place," without the complexity of a real
// multi-file history the app doesn't otherwise need.

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
