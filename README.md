# vue-google-maps-loader

[![NPM Version](https://img.shields.io/npm/v/vue-google-maps-loader)](https://www.npmjs.com/package/vue-google-maps-loader)
[![NPM License](https://img.shields.io/npm/l/vue-google-maps-loader)](https://opensource.org/license/apache-2-0)
[![NPM Downloads](https://img.shields.io/npm/dm/vue-google-maps-loader?cacheSeconds=10800)](https://npm-stat.com/charts.html?package=vue-google-maps-loader)

A Vue 3 composable for loading the **Google Maps JavaScript API** with reactive locale switching.

## ✨ Features

- Built on the official [@googlemaps/js-api-loader](https://github.com/googlemaps/js-api-loader)
- Vue 3 Composition API ready
- Works seamlessly with [vue3-google-map](https://github.com/inocan-group/vue3-google-map) via the `:api-promise` prop
- Cleans up injected scripts, links, and styles
- Automatically reloads Maps API when the locale changes

## 🤔 Why use this?

The official `@googlemaps/js-api-loader` doesn't support:

- **Locale switching** - Can't reload the API with a different language at runtime
- **Vue reactivity** - No integration with Vue's reactive system

This composable solves these issues by wrapping the loader with Vue 3 reactivity and handling dynamic reloads.

## 🚀 Installation

```sh
npm install vue-google-maps-loader
```

## 📖 API

```ts
useGoogleMapsLoader(apiOptions: APIOptions, locale: Ref<string>): {
  isAvailable: Ref<boolean>;
  apiPromise: Ref<Promise<typeof google>>;
}
```

- **`apiOptions`** — Options passed to `@googlemaps/js-api-loader` (e.g. `key`, `libraries`, `v`). See the [full list of options](https://github.com/googlemaps/js-api-loader#documentation). Defaults `libraries` to `['core']` if not specified.
- **`locale`** — Any reactive `Ref<string>` with a [BCP 47 language tag](https://developers.google.com/maps/faq#languagesupport). The Maps API reloads automatically when this value changes.
- **`isAvailable`** — `false` briefly during a locale reload (so dependent components unmount and remount with the new API), `true` otherwise. Await `apiPromise` for actual load completion.
- **`apiPromise`** — Resolves to the `google` global once the API is loaded, or rejects if loading fails (invalid key, blocked or failed script). Updates on each reload.

> **Note:** `useGoogleMapsLoader` is a singleton. Only the first call initializes the loader — subsequent calls return the same instance regardless of the arguments passed. Call it once at the app or plugin level and use the returned refs anywhere in your app.

> **Note:** Browser-only. The composable reads `document` synchronously, so calling it during server-side rendering throws `ReferenceError: document is not defined`. Under Nuxt or a similar SSR setup, call it from client-only code — inside `onMounted`, or from a `.client` component.

> **Note:** Reloading assigns the Maps API script URL through a [Trusted Types](https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API) policy named `vue-google-maps-loader`. If your page enforces `require-trusted-types-for 'script'` **and** restricts policy names with a `trusted-types` directive, allow that name alongside the one `@googlemaps/js-api-loader` registers for the initial load:
>
> ```
> Content-Security-Policy: require-trusted-types-for 'script'; trusted-types @googlemaps/js-api-loader vue-google-maps-loader
> ```
>
> Pages that enforce Trusted Types without a `trusted-types` directive need no changes.

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
		:api-promise
		:center="{ lat: 38.725282, lng: -9.149996 }"
		:zoom="12"
		style="width: 100%; height: 500px"
	/>
</template>
```

### Standalone

```vue
<script setup>
import { useTemplateRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGoogleMapsLoader } from 'vue-google-maps-loader';

const { locale } = useI18n();

const apiOptions = { key: import.meta.env.VITE_GOOGLE_API_KEY };

const { isAvailable, apiPromise } = useGoogleMapsLoader(apiOptions, locale);

const mapElement = useTemplateRef('map-element');

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
		ref="map-element"
		style="width: 100%; height: 500px"
	/>
</template>
```

`locale` can be any `Ref<string>` — this example uses `vue-i18n`, but any reactive ref works.

## ⚠️ Disclaimer

- **Unofficial reload technique** — Reloading the Maps API works by manually removing Google's injected scripts, stylesheets, and styles from the DOM and deleting `window.google.maps`. This relies on internal implementation details that are not part of the Google Maps JavaScript API and are not guaranteed to remain stable across future updates.

- **Incompatible with Google Maps Web Components** — This loader cannot be used alongside [Google Maps Web Components](https://mapsplatform.google.com/resources/blog/build-maps-faster-web-components/) (e.g. `<gmp-map>`), because custom elements cannot be unregistered once defined, making the reload strategy ineffective in those environments.
