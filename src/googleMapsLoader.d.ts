// Copyright (C) 2025 INOV - Instituto de Engenharia de Sistemas e Computadores Inovação
// All rights reserved.

import type { Ref } from 'vue';
import type { APIOptions } from '@googlemaps/js-api-loader';

export interface UseGoogleMapsLoaderReturn {
	isAvailable: Ref<boolean>;
	mapsPromise: Ref<Promise<typeof google>>;
}

/**
 * A Vue 3 composable that dynamically loads and reloads the
 * Google Maps JavaScript API, supporting reactive locale changes.
 */
export function useGoogleMapsLoader(
	apiOptions: APIOptions,
	locale: Ref<string>,
): UseGoogleMapsLoaderReturn;
