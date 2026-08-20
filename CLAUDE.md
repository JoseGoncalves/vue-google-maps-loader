# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run lint      # ESLint with auto-fix
npm run format    # Prettier formatting (single quotes, single attribute per line)
```

There are no build or test scripts — this is a source-only package published directly from `src/`.

## Architecture

This is a minimal Vue 3 composable library with a single exported function: `useGoogleMapsLoader`.

**Entry point:** `src/index.js` re-exports from `src/googleMapsLoader.js`.

**Core logic** (`src/googleMapsLoader.js`):
- `useGoogleMapsLoader(apiOptions, locale)` — a singleton composable (uses a module-level `store` variable; subsequent calls return the same instance)
- Calls `setOptions()` + `importLibrary()` from `@googlemaps/js-api-loader` on first call
- Watches the reactive `locale` ref; on change: sets `isAvailable = false`, unloads Maps API from DOM, re-bootstraps with the new language, then sets `isAvailable = true`
- `bootstrap()` is a custom reimplementation of `@googlemaps/js-api-loader`'s internal bootstrap — required because the upstream loader does not support calling `setOptions()` more than once. It is adapted from tag `v2.1.1` — diff against that tag when bumping the dependency
- `bootstrap()` assigns the script URL via a Trusted Types policy (`vue-google-maps-loader`), mirroring upstream's `setScriptSrc()` helper, which is not exported. Without it, reloads throw on pages enforcing `require-trusted-types-for 'script'` even though the initial load (which goes through `setOptions()`) succeeds
- `unloadMaps()` removes Google Maps script/link/style tags from `document.head` and deletes `window.google.maps`
- Uses `effectScope(true)` to isolate the reactive scope

**Returns:** `{ isAvailable: Ref<boolean>, apiPromise: Ref<Promise<typeof google>> }`

**Type declarations:** `src/googleMapsLoader.d.ts` — hand-written TypeScript declarations (no build step).

**Constraints:**
- Incompatible with Google Maps Web Components (custom elements can't be re-registered after unload)
- Browser-only — reads `document` synchronously on call, so it throws under SSR
