// Copyright (C) 2025-2026 INOV - Instituto de Engenharia de Sistemas e Computadores Inovação
// SPDX-License-Identifier: Apache-2.0

import { nextTick, ref, watch, effectScope } from 'vue';
import { setOptions, importLibrary } from '@googlemaps/js-api-loader';
import { isNonEmptyArray, isObject } from '@sindresorhus/is';

let store = null;

const log = (...args) => {
	if (import.meta.env?.DEV) {
		console.log(`[GoogleMapsLoader]`, ...args);
	}
};

// Nodes present in <head> when the current load started. Anything matching
// the Maps patterns that is not in this set was injected by the Maps API and
// is ours to remove; anything in it belongs to the host app.
let headNodesBeforeLoad = new Set();

const snapshotHead = () => {
	headNodesBeforeLoad = new Set(document.head.children);
};

// Imported and adapted from @googlemaps/js-api-loader's bootstrap code.
// The js-api-loader does not allow calling setOptions() more than once, so we use this
// adapted bootstrap function to be able to reload the Maps API.
// Original bootstrap code: https://github.com/googlemaps/js-api-loader/blob/main/src/bootstrap.js
// js-api-loader doc: https://github.com/googlemaps/js-api-loader/blob/main/README.md#documentation
const bootstrap = async (bootstrapParams) => {
	log('Bootstrap:', bootstrapParams);
	snapshotHead();
	window.google = window.google || {};
	window.google.maps = window.google.maps || {};

	const toSnakeCase = (str) =>
		str.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);

	await new Promise((resolve, reject) => {
		const script = document.createElement('script');
		const searchParams = new URLSearchParams();

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

	const wasInjected = (el) => !headNodesBeforeLoad.has(el);

	// Remove script and link tags
	const nodes = document.head.querySelectorAll(
		'script[src*="maps.googleapis.com"], link[href*="fonts.googleapis.com"]',
	);
	nodes.forEach((el) => {
		if (wasInjected(el)) el.remove();
	});

	// Remove style tags
	const styleNodes = document.head.querySelectorAll('style:not([type])');
	styleNodes.forEach((el) => {
		if (!wasInjected(el)) return;
		const content = el.textContent || '';
		if (
			content.includes('gm-') ||
			content.includes('-checkbox-menu-item') ||
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
	snapshotHead();
	setOptions(options);
	const promise = loadLibraries(libraries);

	const scope = effectScope(true);
	store = scope.run(() => {
		const isAvailable = ref(true);
		const apiPromise = ref(promise);

		watch(locale, async (language) => {
			// Wait for a previous load to settle, ignoring failures so that a
			// failed load does not block future reloads
			await apiPromise.value.catch(() => {});

			// Skip if the locale has already changed again
			if (locale.value !== language) return;

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
