# TypeScript here — scope and rules

TypeScript is used for **new modules only**, starting with `fileSystemAccess.ts`.
The existing hand-written files (`converter.js`, `ui.js`, `processor.js`,
`persistence.js`, `biffFontParser.js`, `converters/krutidev.js`, the `data/`
files) are **not** being converted and are not touched by this build step.
There was no strong reason to rewrite working, tested code just to add types
to it — the actual value of TypeScript here is catching the *next* bug of
the "silently called a function with the wrong number of arguments" kind
(see: `detectFontNameInFile` shipping for a while without its 4th parameter
wired in) in code that hasn't been written yet.

## How this fits the existing zero-build app

The app itself is still "open `index.html`, done" — nothing about that
changed. TypeScript only affects files under `ts/`:

```
ts/*.ts   --(tsc)-->   js/*.js
```

The compiled `.js` output is committed like any other file here and loaded
with a normal `<script src="js/fileSystemAccess.js"></script>` tag — same
as every other script in this project. Nobody who just wants to run the
site needs Node, npm, or TypeScript installed at all.

## If you're changing a `ts/` file

```
npm install      # first time only, pulls in the typescript compiler
npm run build     # compiles ts/ -> js/, once
npm run watch     # recompiles on save, while actively editing
```

Commit the compiled `.js` output alongside the `.ts` source — the site
loads the compiled file directly, so an un-built `.ts` change won't do
anything until `npm run build` has been run.

## Style rules for new `ts/` files

- No `import`/`export`. `tsconfig.json` uses `"module": "none"` on purpose,
  matching how every other file in this project works: plain global
  functions/consts, loaded in a fixed `<script>` order in `index.html`.
  This is a deliberate choice to avoid mixing two different loading models
  in one app — introduce ES modules only if the whole app moves to them
  together, not file-by-file.
- Wrap browser APIs that not every browser supports (like File System
  Access) in a top-level feature check, and give the rest of the app a
  plain boolean/function to test against rather than letting a
  `ReferenceError` happen elsewhere.
