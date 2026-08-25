# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Match the Maps styles by class selector when unloading, instead of by substring. An application style that mentions `gm-` in a comment, a string or a `url()` is no longer removed.

### Changed

- Documented that a reload removes an application's own `<style>` when its content matches Google's class names, and how to re-add it.
- Updated ESLint to `^10.9.1`.

## [2.2.1] - 2026-08-20

### Fixed

- Load the Maps API script through a Trusted Types policy (`vue-google-maps-loader`), so locale reloads no longer throw on pages enforcing `require-trusted-types-for 'script'`. The initial load already worked, because it goes through `@googlemaps/js-api-loader`, which registers its own policy.
- Mark load promises as handled, so a failed load with no consumer attached is no longer reported as an unhandled rejection. Consumers still see the rejection through `apiPromise`.

### Changed

- Documented what an `apiPromise` rejection means, restructured the API section of the README, and split out compatibility notes.

## [2.2.0] - 2026-08-19

### Fixed

- Guard the `import.meta.env` access in the development logger. It is Vite-specific, and since this package publishes raw source, consumers on webpack, Rollup, Node SSR, or Jest got a `TypeError` on the first log call.
- Recover from failed loads on locale change. A rejected `apiPromise` is never reassigned, so after any failed load the watcher threw while awaiting it and never reloaded again.
- Only remove `<head>` nodes injected by the Maps API. Unloading removed every `fonts.googleapis.com` link in `<head>`, including the host application's own.

### Changed

- Updated `@googlemaps/js-api-loader` to `^2.1.1` and `@sindresorhus/is` to `^8.1.0`.
- Applied SPDX license headers consistently across sources.
- Documented `apiPromise` rejection behaviour and the browser-only (no SSR) constraint, and corrected the `isAvailable` semantics and the `version` option in the README.

## [2.1.5] - 2026-03-05

### Fixed

- Removed a duplicate `libraries` query parameter from the bootstrap script URL.
- Skip stale locale reloads: if the locale changes again while a reload is in flight, the outdated reload is abandoned.

### Changed

- Broadened the `vue` peer dependency from `^3.3.0` to `^3.2.0`.
- Fixed the `types`/`import` condition ordering in the `exports` map.
- Updated dependencies (ESLint v10, `eslint-plugin-vue`, `globals`, Prettier).

## [2.1.4] - 2025-12-10

### Changed

- Broadened the `vue3-google-map` optional peer dependency from `^0.25.0` to `>=0.25.0 <1.0.0`.
- Normalized `repository.url` in `package.json`.

## [2.1.3] - 2025-12-03

### Added

- Added the `repository` field to `package.json`.

### Changed

- Updated dependencies.

## [2.1.2] - 2025-11-14

### Changed

- Made `vue3-google-map` an optional peer dependency, so installs no longer warn when it is not used.
- Expanded the usage documentation in the README.

## [2.1.1] - 2025-11-09

### Fixed

- Unloading now also removes injected style tags whose content matches `-checkbox-menu-item`, which were previously left behind in `<head>` after a locale reload.

### Changed

- Replaced the abbreviated LICENSE with the full Apache-2.0 text and added license headers to the sources.
- Added badges and links to the README.

## [2.1.0] - 2025-11-08

### Added

- Development-only logging under the `[GoogleMapsLoader]` prefix, gated on `import.meta.env.DEV`.

### Changed

- On a locale change, `apiPromise` is now reassigned immediately with a promise covering both the re-bootstrap and the library load, instead of only after the bootstrap had resolved. Consumers observe the new promise as soon as the reload starts.
- Removed the unused `@vitejs/plugin-vue` development dependency.

## [2.0.0] - 2025-11-07

### Changed

- **Breaking:** renamed the returned `mapsPromise` to `apiPromise`.
- Updated the package keywords.

## [1.0.0] - 2025-11-07

### Added

- Initial release: `useGoogleMapsLoader(apiOptions, locale)`, a singleton composable returning `isAvailable` and `mapsPromise`, which reloads the Google Maps JavaScript API when the locale ref changes and removes the script, link, and style nodes the API injects into `<head>`.

[unreleased]: https://github.com/JoseGoncalves/vue-google-maps-loader/compare/v2.2.1...HEAD
[2.2.1]: https://github.com/JoseGoncalves/vue-google-maps-loader/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/JoseGoncalves/vue-google-maps-loader/compare/v2.1.5...v2.2.0
[2.1.5]: https://github.com/JoseGoncalves/vue-google-maps-loader/compare/v2.1.4...v2.1.5
[2.1.4]: https://github.com/JoseGoncalves/vue-google-maps-loader/compare/v2.1.3...v2.1.4
[2.1.3]: https://github.com/JoseGoncalves/vue-google-maps-loader/compare/v2.1.2...v2.1.3
[2.1.2]: https://github.com/JoseGoncalves/vue-google-maps-loader/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/JoseGoncalves/vue-google-maps-loader/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/JoseGoncalves/vue-google-maps-loader/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/JoseGoncalves/vue-google-maps-loader/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/JoseGoncalves/vue-google-maps-loader/releases/tag/v1.0.0
