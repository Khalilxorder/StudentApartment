type MapsLibrary = 'places' | 'marker';

export const DEFAULT_MAP_CENTER = Object.freeze({
	lat: 47.4979,
	lng: 19.0402,
});

export const DEFAULT_MAP_LIBRARIES: ReadonlyArray<MapsLibrary> = Object.freeze([
	'places',
	'marker',
]);

export const DEFAULT_FALLBACK_MESSAGE =
	'⚠️ Maps API Key Missing\nPlease add your Google Maps API key to proceed';

const MISSING_API_KEY_ERROR =
	'MISSING REQUIRED ENV VAR: NEXT_PUBLIC_MAPS_API_KEY\n' +
	'Please add it to your .env.local file:\n' +
	'NEXT_PUBLIC_MAPS_API_KEY=your-google-maps-api-key\n' +
	'Get it from: https://console.cloud.google.com/apis/credentials';

const INVALID_API_KEY_WARNING =
	'Google Maps API keys usually start with "AIza". Double-check that your key is valid.';

const DEPRECATED_ENV_WARNING =
	'Detected NEXT_PUBLIC_Maps_API_KEY. Use NEXT_PUBLIC_MAPS_API_KEY (uppercase MAPS).';

export interface MapsConfigOptions {
	/** Whether a missing API key should be treated as an error. Defaults to NODE_ENV === "production". */
	requireApiKey?: boolean;
	/** Optional logger – defaults to console. */
	logger?: Pick<Console, 'error' | 'warn'>;
	/** Skip logging when true (useful for tests). */
	silent?: boolean;
}

export interface MapsConfigResult {
	apiKey: string;
	mapId?: string;
	libraries: MapsLibrary[];
	defaultCenter: typeof DEFAULT_MAP_CENTER;
	fallbackMessage: string;
	warnings: string[];
	errors: string[];
	hasErrors: boolean;
}

export function getMapsConfig(options: MapsConfigOptions = {}): MapsConfigResult {
	const {
		requireApiKey = process.env.NODE_ENV === 'production',
		logger = console,
		silent = false,
	} = options;

	const warnings: string[] = [];
	const errors: string[] = [];

		const rawKey = process.env.NEXT_PUBLIC_MAPS_API_KEY ?? '';
		let apiKey = rawKey.trim();

		const envKeys = Object.keys(process.env);
		const lowercaseTarget = 'next_public_maps_api_key';
		const hasCanonicalKey = envKeys.includes('NEXT_PUBLIC_MAPS_API_KEY');
		const hasIncorrectlyCasedKey = envKeys.some(
			(key) => key !== 'NEXT_PUBLIC_MAPS_API_KEY' && key.toLowerCase() === lowercaseTarget
		);

		if (hasIncorrectlyCasedKey) {
			if (!hasCanonicalKey) {
				apiKey = '';
				warnings.push(DEPRECATED_ENV_WARNING);
			} else {
				warnings.push(`${DEPRECATED_ENV_WARNING} Remove the legacy variable to avoid confusion.`);
			}
		}

	if (!apiKey) {
		const message = MISSING_API_KEY_ERROR;
		if (requireApiKey) {
			errors.push(message);
		} else {
			warnings.push(message);
		}
	} else if (!apiKey.startsWith('AIza')) {
		warnings.push(INVALID_API_KEY_WARNING);
	}

	const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID?.trim();
	if (mapId && mapId.length < 5) {
		warnings.push('NEXT_PUBLIC_GOOGLE_MAP_ID looks too short – did you copy the full Map ID?');
	}

	if (!silent) {
		warnings.forEach((warning) => logger.warn?.(warning));
		errors.forEach((error) => logger.error?.(error));
	}

	return {
		apiKey,
		mapId: mapId || undefined,
		libraries: [...DEFAULT_MAP_LIBRARIES],
		defaultCenter: DEFAULT_MAP_CENTER,
		fallbackMessage: DEFAULT_FALLBACK_MESSAGE,
		warnings,
		errors,
		hasErrors: errors.length > 0,
	};
}
