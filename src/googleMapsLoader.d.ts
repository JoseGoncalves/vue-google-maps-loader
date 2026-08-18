// Copyright (C) 2025-2026 INOV - Instituto de Engenharia de Sistemas e Computadores Inovação
// SPDX-License-Identifier: Apache-2.0

import type { Ref } from 'vue';
import type { APIOptions } from '@googlemaps/js-api-loader';

export interface UseGoogleMapsLoaderReturn {
	isAvailable: Ref<boolean>;
	apiPromise: Ref<Promise<typeof google>>;
}

/**
 * A Vue 3 composable that dynamically loads and reloads the
 * Google Maps JavaScript API, supporting reactive locale changes.
 */
export function useGoogleMapsLoader(
	apiOptions: APIOptions,
	locale: Ref<string>,
): UseGoogleMapsLoaderReturn;
