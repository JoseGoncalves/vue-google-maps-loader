// Copyright (C) 2025 INOV - Instituto de Engenharia de Sistemas e Computadores Inovação
// All rights reserved.

import { nextTick, ref, watch, effectScope } from 'vue';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { isNonEmptyArray, isObject } from '@sindresorhus/is';

let store = null;

// Imported and adapted from @googlemaps/js-api-loader's bootstrap code.
// The js-api-loader does not allow calling setOptions() more than once, so we use this
// adapted bootstrap function to be able to reload the Maps API.
// Original bootstrap code: https://github.com/googlemaps/js-api-loader/blob/main/src/bootstrap.js
// js-api-loader doc: https://github.com/googlemaps/js-api-loader/blob/main/README.md#documentation
const bootstrap = async (bootstrapParams) => {
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
	await Promise.all(libraries.map((lib) => importLibrary(lib)));
	return window.google;
};

const unloadMaps = () => {
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
			await bootstrap({ ...options, language });
			apiPromise.value = loadLibraries(libraries);

			// Notify maps components that a new Maps API is available
			isAvailable.value = true;
		});

		return { isAvailable, apiPromise };
	});

	return store;
};
