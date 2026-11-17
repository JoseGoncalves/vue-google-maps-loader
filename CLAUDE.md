# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run lint      # ESLint with auto-fix
npm run format    # Prettier formatting (single quotes, single attribute per line)
npm run --silent release:notes [-- <version>]   # A version's CHANGELOG.md section, for a GitHub release
```

There are no build or test scripts — this is a source-only package published directly from `src/`.

## Releasing

`CHANGELOG.md` is the only place release notes are written; the GitHub release body is generated from it. A release is: move the Unreleased entries under a dated version heading and update the compare links, bump the version (`npm version <x.y.z> --no-git-tag-version`), commit as `Release <x.y.z>`, tag `v<x.y.z>` (annotated, message `<x.y.z>`), push `main` and the tag, `npm publish`, then:

```sh
npm run --silent release:notes | gh release create v<x.y.z> --title <x.y.z> --notes-file -
```

## Architecture

This is a minimal Vue 3 composable library with a single exported function: `useGoogleMapsLoader`.

**Entry point:** `src/index.js` re-exports from `src/googleMapsLoader.js`.

**Core logic** (`src/googleMapsLoader.js`):
- `useGoogleMapsLoader(apiOptions, locale)` — a singleton composable (uses a module-level `store` variable; subsequent calls return the same instance)
- Loads the API through its own `bootstrap()` on first call and on every reload, then calls `google.maps.importLibrary()` for each library. `@googlemaps/js-api-loader` is not a dependency: `APIOptions` is declared in the `.d.ts`, and `@types/google.maps` is a direct dependency for the `typeof google` return type
- `startLoad()` begins a load, stores it in `apiPromise` and tracks its outcome in `hasFailed` (a load since replaced is ignored)
- `reload()` waits for the load in progress to settle, sets `isAvailable = false`, unloads Maps API from DOM, re-bootstraps in the current `locale`, then sets `isAvailable = true`. Calls made before the new load starts share one reload (`pending`). The `locale` watcher calls it, and it is returned so an app can retry a failed load
- `bootstrap()` is a custom reimplementation of `@googlemaps/js-api-loader`'s internal bootstrap — required because the upstream loader does not support calling `setOptions()` more than once, and because its stand-in `importLibrary` loops forever (tab freeze) when Google answers with an error payload (upstream issue #1304). It is adapted from tag `v2.1.3` — diff upstream against that tag from time to time, and update the tag reference when porting changes
- `bootstrap()` assigns the script URL via a Trusted Types policy (`vue-google-maps-loader`), mirroring upstream's `setScriptSrc()` helper, which is not exported. Without it, loads throw on pages enforcing `require-trusted-types-for 'script'`
- `unloadMaps()` removes Google Maps script/link/style tags from `document.head` and deletes `window.google.maps`
- `unloadMaps()` only removes nodes injected since the last `snapshotHead()` call (host app nodes present beforehand are untouched), and matches style tags by class selector (`MAPS_STYLE_SELECTORS`) rather than substring, to avoid catching an app's own styles that merely mention `gm-` in a comment or string
- Uses `effectScope(true)` to isolate the reactive scope

**Returns:** `{ isAvailable: Ref<boolean>, hasFailed: Ref<boolean>, apiPromise: Ref<Promise<typeof google>>, reload: () => Promise<void> }`

**Type declarations:** `src/googleMapsLoader.d.ts` — hand-written TypeScript declarations (no build step).

**Constraints:**
- Incompatible with Google Maps Web Components (custom elements can't be re-registered after unload)
- Browser-only — reads `document` synchronously on call, so it throws under SSR
