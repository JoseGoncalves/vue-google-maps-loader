# vue-google-maps-loader

[![NPM Version](https://img.shields.io/npm/v/vue-google-maps-loader)](https://www.npmjs.com/package/vue-google-maps-loader)
[![NPM License](https://img.shields.io/npm/l/vue-google-maps-loader)](https://opensource.org/license/apache-2-0)
[![NPM Downloads](https://img.shields.io/npm/dm/vue-google-maps-loader?cacheSeconds=10800)](https://npm-stat.com/charts.html?package=vue-google-maps-loader)

A Vue 3 composable to dynamically load and reload the **Google Maps JavaScript API** with localization support.

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

## ⚡ Usage

### With vue3-google-map

```vue
<script setup>
import { useI18n } from 'vue-i18n';
import { GoogleMap } from 'vue3-google-map';
import { useGoogleMapsLoader } from 'vue-google-maps-loader';

// Access your app's current locale via vue-i18n
const { locale } = useI18n();

// Google Maps API options
const apiOptions = { key: import.meta.env.VITE_GOOGLE_API_KEY };

// Initialize the loader with reactive i18n locale
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
