// fileSystemAccess.ts
//
// Chromium-only (desktop Chrome/Edge, and Chrome on Android). Silently
// absent in Firefox and everything on iOS (Safari's engine, forced on all
// iOS browsers including "Chrome" for iOS) — there is no polyfill for
// that, it's a real platform gap, not a bug. Every function here is safe
// to call regardless of support: check isFileSystemAccessSupported()
// first, and the rest either no-ops or rejects cleanly rather than
// throwing a ReferenceError into the rest of the app.
//
// What this buys over the existing IndexedDB byte-snapshot in
// persistence.js: that snapshot is a frozen COPY from the moment the file
// was opened — reopening it later shows stale content if the real file on
// disk changed since. A FileSystemFileHandle is a live reference: asking
// it for the file again re-reads current content from disk. Where this
// API isn't supported, the byte-snapshot approach remains the fallback —
// this module is a strict addition, not a replacement.

// ---- Ambient type declarations ----
// This TypeScript version's bundled DOM lib already declares
// FileSystemHandle/FileSystemFileHandle — but an older/partial version of
// them, missing the permissions methods and window.showOpenFilePicker
// entirely. These are declaration-merging AUGMENTATIONS (only the missing
// members), not full redeclarations — a full redeclaration is what
// caused the "cannot simultaneously extend" conflict the first time
// around. If a future TypeScript version's lib.dom.d.ts already has these,
// this becomes a harmless duplicate and can be deleted.

interface FileSystemFileHandle {
  queryPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission(descriptor?: { mode?: 'read' | 'readwrite' }): Promise<PermissionState>;
}

interface Window {
  showOpenFilePicker?(options?: {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    types?: { description?: string; accept: Record<string, string[]> }[];
  }): Promise<FileSystemFileHandle[]>;
}

declare function idbPut(record: Record<string, unknown>): Promise<boolean>;
declare function idbGet(key: string): Promise<Record<string, unknown> | null>;
declare function idbDelete(key: string): Promise<boolean>;



const FILE_HANDLE_KEY = 'lastFileHandle';

function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.showOpenFilePicker === 'function';
}

// Must be called directly inside a click handler — browsers require a
// user gesture to show this picker, and separately require one again
// later for requestPermission(). Calling this from anywhere else (e.g.
// after an awaited fetch) will silently fail in most browsers.
async function pickExcelFileViaFileSystemAccess(): Promise<FileSystemFileHandle | null> {
  if (!isFileSystemAccessSupported()) return null;
  try {
    const [handle] = await window.showOpenFilePicker!({
      multiple: false,
      excludeAcceptAllOption: false,
      types: [
        {
          description: 'Excel files',
          accept: {
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          },
        },
      ],
    });
    return handle;
  } catch (err) {
    // AbortError = user cancelled the picker — not a real error.
    if ((err as DOMException)?.name !== 'AbortError') {
      console.warn('File System Access picker failed:', err);
    }
    return null;
  }
}

async function saveLastFileHandle(handle: FileSystemFileHandle): Promise<boolean> {
  return idbPut({ key: FILE_HANDLE_KEY, handle, savedAt: Date.now() });
}

async function getLastFileHandle(): Promise<FileSystemFileHandle | null> {
  const record = await idbGet(FILE_HANDLE_KEY);
  if (!record || !record.handle) return null;
  return record.handle as FileSystemFileHandle;
}

async function clearLastFileHandle(): Promise<boolean> {
  return idbDelete(FILE_HANDLE_KEY);
}

// Permission state without prompting — safe to call on page load with no
// user gesture. 'granted' means the caller can read the file immediately;
// 'prompt' means requestPermission() is needed, and THAT must happen
// inside a click handler (see readFileHandleWithPermission below).
async function checkFileHandlePermission(handle: FileSystemFileHandle): Promise<PermissionState> {
  try {
    return await handle.queryPermission({ mode: 'read' });
  } catch (err) {
    return 'denied';
  }
}

// Call this from a click handler when checkFileHandlePermission() came
// back as anything other than 'granted'. Requests permission (shows the
// browser's own prompt) and, if granted, reads the file.
async function readFileHandleWithPermission(
  handle: FileSystemFileHandle
): Promise<{ data: Uint8Array; name: string } | null> {
  try {
    let state = await handle.queryPermission({ mode: 'read' });
    if (state !== 'granted') {
      state = await handle.requestPermission({ mode: 'read' });
    }
    if (state !== 'granted') return null;

    const file = await handle.getFile();
    const buffer = await file.arrayBuffer();
    return { data: new Uint8Array(buffer), name: file.name };
  } catch (err) {
    // Most common real-world case: the file was moved, renamed, or
    // deleted since the handle was saved. Treat as "can't resume" rather
    // than a hard error — the caller should fall back to asking the user
    // to pick again.
    console.warn('Could not read saved file handle (file may have moved):', err);
    return null;
  }
}
