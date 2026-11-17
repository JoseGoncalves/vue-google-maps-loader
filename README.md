# vue-google-maps-loader

[![NPM Version](https://img.shields.io/npm/v/vue-google-maps-loader)](https://www.npmjs.com/package/vue-google-maps-loader)
[![NPM License](https://img.shields.io/npm/l/vue-google-maps-loader)](https://opensource.org/license/apache-2-0)
[![NPM Downloads](https://img.shields.io/npm/dm/vue-google-maps-loader?cacheSeconds=10800)](https://npm-stat.com/charts.html?package=vue-google-maps-loader)

A Vue 3 composable for loading the **Google Maps JavaScript API** with reactive locale switching.

## ✨ Features

- Takes the same options as the official [@googlemaps/js-api-loader](https://github.com/googlemaps/js-api-loader), without depending on it
- Vue 3 Composition API ready
- Works seamlessly with [vue3-google-map](https://github.com/inocan-group/vue3-google-map) via the `:api-promise` prop
- Cleans up injected scripts, links, and styles
- Automatically reloads Maps API when the locale changes

## 🤔 Why use this?

The official `@googlemaps/js-api-loader` doesn't support:

- **Locale switching** - Can't reload the API with a different language at runtime
- **Vue reactivity** - No integration with Vue's reactive system

This composable solves these issues with a loader of its own, adapted from the official one, that integrates with Vue 3 reactivity and handles dynamic reloads. You do not need to install `@googlemaps/js-api-loader`.

## 🚀 Installation

```sh
npm install vue-google-maps-loader
```

## 📖 API

```ts
useGoogleMapsLoader(apiOptions: APIOptions, locale: Ref<string>): {
  isAvailable: Ref<boolean>;
  hasFailed: Ref<boolean>;
  apiPromise: Ref<Promise<typeof google>>;
  reload: () => Promise<void>;
}
```

### Parameters

- **`apiOptions`** — The same options `@googlemaps/js-api-loader` accepts (e.g. `key`, `libraries`, `v`). See the [full list of options](https://github.com/googlemaps/js-api-loader#documentation). The `APIOptions` type is exported from this package. Defaults `libraries` to `['core']` if not specified.
- **`locale`** — Any reactive `Ref<string>` with a [BCP 47 language tag](https://developers.google.com/maps/faq#languagesupport). The Maps API reloads automatically when this value changes.

### Returns

- **`isAvailable`** — `false` briefly during a locale reload (so dependent components unmount and remount with the new API), `true` otherwise. Await `apiPromise` for actual load completion.
- **`hasFailed`** — `true` once the latest load has failed, i.e. when `apiPromise` has rejected. Back to `false` as soon as another load starts.
- **`apiPromise`** — Resolves to the `google` global once the API is loaded, or rejects if the API fails to load. Updates on each reload.
- **`reload`** — Unloads the Maps API and loads it again in the current locale, exactly as a locale change does. It first waits for a load in progress to settle, and calls made while one reload is waiting share it. The returned promise resolves once the new load has started; await `apiPromise` for its outcome.

### Call it once

`useGoogleMapsLoader` is a singleton. Only the first call initializes the loader — subsequent calls return the same instance regardless of the arguments passed. Call it once at the app or plugin level and use the returned refs anywhere in your app.

### Handling load errors

`apiPromise` rejects only when the API never loaded at all: a network error, a request blocked by a browser extension or by `script-src`, or Google answering the request with an error instead of the API. `hasFailed` turns `true` at the same moment. A later locale change tries again, and so does `reload()`:

```vue
<script setup>
const { isAvailable, hasFailed, apiPromise, reload } = useGoogleMapsLoader(
	apiOptions,
	locale,
);
</script>

<template>
	<div v-if="hasFailed">
		The map could not load.
		<button @click="reload">Retry</button>
	</div>
	<GoogleMap
		v-else-if="isAvailable"
		:api-promise="apiPromise"
	/>
</template>
```

Key problems do not reject. Google serves a working script for an invalid, unauthorized or unbilled key, so the promise resolves and `isAvailable` stays `true`. Those failures arrive later, as a `console.error` naming the cause (e.g. `InvalidKeyMapError`), a call to `window.gm_authFailure` if you define one, and an error overlay on the map. See [Error messages](https://developers.google.com/maps/documentation/javascript/error-messages).

## ⚡ Usage

### With vue3-google-map

```vue
<script setup>
import { useI18n } from 'vue-i18n';
import { GoogleMap } from 'vue3-google-map';
import { useGoogleMapsLoader } from 'vue-google-maps-loader';

const { locale } = useI18n();

const apiOptions = { key: import.meta.env.VITE_GOOGLE_API_KEY };

const { isAvailable, apiPromise } = useGoogleMapsLoader(apiOptions, locale);
</script>

<template>
	<GoogleMap
		v-if="isAvailable"
		:api-promise="apiPromise"
		:center="{ lat: 38.725282, lng: -9.149996 }"
		:zoom="12"
		style="width: 100%; height: 500px"
	/>
</template>
```

### Standalone

```vue
<script setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGoogleMapsLoader } from 'vue-google-maps-loader';

const { locale } = useI18n();

const apiOptions = { key: import.meta.env.VITE_GOOGLE_API_KEY };

const { isAvailable, apiPromise } = useGoogleMapsLoader(apiOptions, locale);

const mapElement = ref(null);

watch(
	isAvailable,
	async (available) => {
		if (!available) return;

		const google = await apiPromise.value;

		new google.maps.Map(mapElement.value, {
			center: { lat: 38.725282, lng: -9.149996 },
			zoom: 12,
		});
	},
	{ immediate: true },
);
</script>

<template>
	<div
		ref="mapElement"
		style="width: 100%; height: 500px"
	/>
</template>
```

`locale` can be any `Ref<string>` — this example uses `vue-i18n`, but any reactive ref works.

## 🧩 Compatibility

### Server-side rendering

Browser-only. The composable reads `document` synchronously, so calling it during server-side rendering throws `ReferenceError: document is not defined`. Under Nuxt or a similar SSR setup, call it from client-only code — inside `onMounted`, or from a `.client` component.

### Content Security Policy

The Maps API script URL is assigned through a [Trusted Types](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API) policy named `vue-google-maps-loader`. If your page enforces `require-trusted-types-for 'script'` **and** restricts policy names with a `trusted-types` directive, allow that name:

```
Content-Security-Policy: require-trusted-types-for 'script'; trusted-types vue-google-maps-loader
```

Pages that enforce Trusted Types without a `trusted-types` directive need no changes.

### App styles that match Google's

Reloading removes `<style>` tags that appeared in `document.head` after the most recent load began and that mention Google's internal class names, such as `gm-`. A stylesheet of your own can match — hiding a control with `.gm-style-cc { display: none }` is the usual case — and is removed along with Google's.

Only untyped tags are considered: a `<style>` carrying a `type` attribute is skipped, as are tags already present when the load began and stylesheets loaded through a `<link>`. That covers most apps — Vite, for one, gives your own component styles a `type` in development. What stays exposed is an untyped `<style>` injected at runtime, from CSS-in-JS or from a dependency's styles routed through your bundler. Re-add it once the reload completes:

```js
watch(isAvailable, (available) => {
	if (available) injectMapStyles();
});
```

The same goes for Google Fonts. Maps injects its own `<link>` to `fonts.googleapis.com`, so one of yours added to `document.head` after the load began is removed with it. Declare it in `index.html`, or re-add it the same way.

## ⚠️ Disclaimer

- **Unofficial reload technique** — Reloading the Maps API works by manually removing Google's injected scripts, stylesheets, and styles from the DOM and deleting `window.google.maps`. This relies on internal implementation details that are not part of the Google Maps JavaScript API and are not guaranteed to remain stable across future updates.

- **Rapid locale changes** — Changing the locale twice within about a second can leave the map controls in the previous language, or without labels. The unloaded Maps API stays in memory and may still fetch one of its modules, which the newly loaded API then takes for its own. The next locale change corrects it.

- **Incompatible with Google Maps Web Components** — This loader cannot be used alongside [Google Maps Web Components](https://mapsplatform.google.com/resources/blog/build-maps-faster-web-components/) (e.g. `<gmp-map>`), because custom elements cannot be unregistered once defined, making the reload strategy ineffective in those environments.
