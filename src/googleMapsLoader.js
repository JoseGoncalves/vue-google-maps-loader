// Copyright (C) 2025 INOV - Instituto de Engenharia de Sistemas e Computadores Inovação
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { nextTick, ref, watch, effectScope } from 'vue';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { isNonEmptyArray, isObject } from '@sindresorhus/is';

let store = null;

const log = (...args) => {
	if (import.meta.env.DEV) {
		console.log(`[GoogleMapsLoader]`, ...args);
	}
};

// Imported and adapted from @googlemaps/js-api-loader's bootstrap code.
// The js-api-loader does not allow calling setOptions() more than once, so we use this
// adapted bootstrap function to be able to reload the Maps API.
// Original bootstrap code: https://github.com/googlemaps/js-api-loader/blob/main/src/bootstrap.js
// js-api-loader doc: https://github.com/googlemaps/js-api-loader/blob/main/README.md#documentation
const bootstrap = async (bootstrapParams) => {
	log('Bootstrap:', bootstrapParams);
	window.google = window.google || {};
	window.google.maps = window.google.maps || {};

	const toSnakeCase = (str) =>
		str.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);

	await new Promise((resolve, reject) => {
		const script = document.createElement('script');
		const searchParams = new URLSearchParams();
		const { libraries } = bootstrapParams;

		searchParams.set('libraries', [...libraries].join(','));
		Object.keys(bootstrapParams).forEach((key) => {
			searchParams.set(toSnakeCase(key), bootstrapParams[key]);
		});
		searchParams.set('callback', 'google.maps.__ib__');
		script.src = `https://maps.googleapis.com/maps/api/js?${searchParams}`;
		script.onerror = () => reject(new Error('The Maps API could not load'));
		script.nonce = document.querySelector('script[nonce]')?.nonce || '';
		window.google.maps.__ib__ = resolve;
		document.head.append(script);
	});
};

const loadLibraries = async (libraries) => {
	log('Load Libraries:', libraries);
	await Promise.all(libraries.map((lib) => importLibrary(lib)));
	return window.google;
};

const unloadMaps = () => {
	log('Unload Maps');

	// Remove script and link tags
	const nodes = document.head.querySelectorAll(
		'script[src*="maps.googleapis.com"], link[href*="fonts.googleapis.com"]',
	);
	nodes.forEach((el) => el.remove());

	// Remove style tags
	const styleNodes = document.head.querySelectorAll('style:not([type])');
	styleNodes.forEach((el) => {
		const content = el.textContent || '';
		if (
			content.includes('gm-') ||
			content.includes('-marker-view') ||
			content.includes('-keyboard-shortcuts-view')
		) {
			el.remove();
		}
	});

	// Delete global object
	if (isObject(window.google?.maps)) delete window.google.maps;
};

export const useGoogleMapsLoader = (apiOptions, locale) => {
	if (isObject(store)) return store;

	const { libraries: apiLibs } = apiOptions;
	const libraries = isNonEmptyArray(apiLibs) ? apiLibs : ['core'];
	const options = { ...apiOptions, libraries, language: locale.value };
	log('Set Options:', options);
	setOptions(options);
	const promise = loadLibraries(libraries);

	const scope = effectScope(true);
	store = scope.run(() => {
		const isAvailable = ref(true);
		const apiPromise = ref(promise);

		watch(locale, async (language) => {
			// Wait for a previous load to finish
			await apiPromise.value;

			// Notify maps components that a reload is to be made
			isAvailable.value = false;
			await nextTick();

			// Reload the Maps API with the new language
			unloadMaps();
			apiPromise.value = (async () => {
				await bootstrap({ ...options, language });
				return loadLibraries(libraries);
			})();

			// Notify maps components that a new Maps API is available
			isAvailable.value = true;
		});

		return { isAvailable, apiPromise };
	});

	return store;
};
