// Copyright (C) 2025-2026 INOV - Instituto de Engenharia de Sistemas e Computadores Inovação
// SPDX-License-Identifier: Apache-2.0

import { nextTick, ref, watch, effectScope } from 'vue';
import { isFunction, isNonEmptyArray, isObject } from '@sindresorhus/is';

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

// script.src is a Trusted Types sink. The js-api-loader wraps its URL the same
// way but does not export the helper, so this is a copy under its own name.
const TRUSTED_TYPES_POLICY_NAME = 'vue-google-maps-loader';

const passThroughPolicy = { createScriptURL: (url) => url };

let scriptUrlPolicy = null;

const getScriptUrlPolicy = () => {
	if (isObject(scriptUrlPolicy)) return scriptUrlPolicy;

	const { trustedTypes } = globalThis;

	if (!trustedTypes) {
		scriptUrlPolicy = passThroughPolicy;
		return scriptUrlPolicy;
	}

	try {
		scriptUrlPolicy = trustedTypes.createPolicy(TRUSTED_TYPES_POLICY_NAME, {
			createScriptURL: (url) => url,
		});
	} catch (error) {
		// Unsupported, or the name is not allowed by the page's `trusted-types`
		// directive. The pass-through only works where nothing is enforced.
		log('Trusted Types policy unavailable:', error);
		scriptUrlPolicy = passThroughPolicy;
	}

	return scriptUrlPolicy;
};

// Adapted from the bootstrap code of @googlemaps/js-api-loader 2.1.3, which
// cannot be reused as is: setOptions() only runs once, and a reload needs a
// second call. It also installs a stand-in importLibrary that loops forever
// when Google answers with an error payload (js-api-loader issue #1304), so
// the first load goes through here as well.
// It is no longer a dependency; diff against the tag below to pick up
// upstream changes.
// https://github.com/googlemaps/js-api-loader/blob/v2.1.3/src/bootstrap.js
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
		script.src = getScriptUrlPolicy().createScriptURL(
			`https://maps.googleapis.com/maps/api/js?${searchParams}`,
		);
		script.onerror = () => reject(new Error('The Maps API could not load'));
		script.nonce = document.querySelector('script[nonce]')?.nonce || '';
		window.google.maps.__ib__ = resolve;
		document.head.append(script);
	});
};

const loadLibraries = async (libraries) => {
	log('Load Libraries:', libraries);
	// Missing when the script ran but did not deliver the API, e.g. Google
	// answered with an error payload
	const { maps } = window.google;
	if (!isFunction(maps.importLibrary)) {
		throw new Error('The Maps API could not load');
	}
	await Promise.all(libraries.map((lib) => maps.importLibrary(lib)));
	return window.google;
};

// Class selectors only. The three suffixes carry an obfuscated prefix that
// changes between API releases.
const MAPS_STYLE_SELECTORS = [
	/\.gm-[\w-]+/,
	/\.[\w-]+-checkbox-menu-item/,
	/\.[\w-]+-marker-view/,
	/\.[\w-]+-keyboard-shortcuts-view/,
];

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
		if (MAPS_STYLE_SELECTORS.some((selector) => selector.test(content))) {
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
	const options = { ...apiOptions, libraries };

	const load = async (language) => {
		await bootstrap({ ...options, language });
		return loadLibraries(libraries);
	};

	const scope = effectScope(true);
	store = scope.run(() => {
		const isAvailable = ref(true);
		const hasFailed = ref(false);
		const apiPromise = ref(null);

		const startLoad = (language) => {
			const promise = load(language);
			hasFailed.value = false;
			apiPromise.value = promise;

			// Also keeps a failed load from surfacing as an unhandled rejection
			// before a consumer awaits apiPromise. Consumers still see the
			// rejection.
			promise.catch(() => {
				// A load since replaced no longer counts
				if (apiPromise.value === promise) hasFailed.value = true;
			});
		};

		startLoad(locale.value);

		// The reload waiting to start, shared by every call made meanwhile
		let pending = null;

		const startReload = async () => {
			try {
				// Wait for a previous load to settle, ignoring failures so that a
				// failed load does not block future reloads
				await apiPromise.value.catch(() => {});

				// Notify maps components that a reload is to be made
				isAvailable.value = false;
				await nextTick();

				// Reload the Maps API in the locale current by now
				unloadMaps();
				startLoad(locale.value);

				// Notify maps components that a new Maps API is available
				isAvailable.value = true;
			} finally {
				pending = null;
			}
		};

		const reload = () => {
			pending ??= startReload();
			return pending;
		};

		watch(locale, reload);

		return { isAvailable, hasFailed, apiPromise, reload };
	});

	return store;
};
