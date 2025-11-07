# vue-google-maps-loader

A Vue 3 composable to dynamically load and reload the **Google Maps JavaScript API** with localization support.

## ✨ Features

- Reloads the Maps API dynamically when language changes
- Uses the official `@googlemaps/js-api-loader` under the hood
- Compatible with Vue 3’s Composition API

## 🚀 Installation

```sh
npm install vue-google-maps-loader
```

## ⚡ Usage

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
const { isAvailable, mapsPromise } = useGoogleMapsLoader(apiOptions, locale);
</script>

<template>
	<div v-if="isAvailable">
		<GoogleMap
			:api-promise="mapsPromise"
			:center="{ lat: 38.725282, lng: -9.149996 }"
			:zoom="12"
			style="width: 100%; height: 500px"
		/>
	</div>
	<div v-else>
		Reloading Google Maps API…
	</div>
</template>
