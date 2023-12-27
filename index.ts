import {excludeDuplicatePatterns, patternToRegex} from 'webext-patterns';

export function normalizeManifestPermissions(
	manifest = chrome.runtime.getManifest(),
): Required<chrome.permissions.Permissions> {
	const manifestPermissions: Required<chrome.permissions.Permissions> = {
		origins: [],
		permissions: [],
	};

	const list = new Set([
		...(manifest.permissions ?? []),
		...(manifest.content_scripts ?? []).flatMap(config => config.matches ?? []),
	]);

	// https://github.com/mozilla/gecko-dev/blob/c0fc8c4852e927b0ae75d893d35772b8c60ee06b/toolkit/components/extensions/Extension.jsm#L738-L743
	if (
		manifest.devtools_page
		// @ts-expect-error it can't be specified, but it's reported when requested
		&& !manifest.optional_permissions?.includes('devtools')
	) {
		list.add('devtools');
	}

	for (const permission of list) {
		if (permission.includes('://')) {
			manifestPermissions.origins.push(permission);
		} else {
			manifestPermissions.permissions.push(permission);
		}
	}

	return manifestPermissions;
}

type OriginsOptions = {
	strictOrigins?: boolean;
};

const hostRegex = /:[/][/][*.]*([^/]+)/; // Extracts the wildcard-less hostname
function parseDomain(origin: string): string {
	return origin.split(hostRegex)[1]!;
}

type AdditionalPermissionsOptions = OriginsOptions & {
	manifest?: chrome.runtime.Manifest;
};

export async function queryAdditionalPermissions(
	options?: OriginsOptions,
): Promise<Required<chrome.permissions.Permissions>> {
	return new Promise(resolve => {
		chrome.permissions.getAll(currentPermissions => {
			resolve(
				extractAdditionalPermissions(currentPermissions, options),
			);
		});
	});
}

export function extractAdditionalPermissions(
	currentPermissions: chrome.permissions.Permissions,
	{
		manifest,
		strictOrigins = true,
	}: AdditionalPermissionsOptions = {},
): Required<chrome.permissions.Permissions> {
	const manifestPermissions = normalizeManifestPermissions(manifest);
	const additionalPermissions: Required<chrome.permissions.Permissions> = {
		origins: [],
		permissions: [],
	};

	for (const origin of currentPermissions.origins ?? []) {
		if (manifestPermissions.origins.includes(origin)) {
			continue;
		}

		if (!strictOrigins) {
			const domain = parseDomain(origin);
			const isDomainInManifest = manifestPermissions.origins
				.some(manifestOrigin => parseDomain(manifestOrigin) === domain);

			if (isDomainInManifest) {
				continue;
			}
		}

		additionalPermissions.origins.push(origin);
	}

	for (const permission of currentPermissions.permissions ?? []) {
		if (!manifestPermissions.permissions.includes(permission)) {
			additionalPermissions.permissions.push(permission);
		}
	}

	return additionalPermissions;
}

export function isUrlPermittedByManifest(origin: string): boolean {
	return _isUrlPermittedByManifest(origin, chrome.runtime.getManifest());
}

export function _isUrlPermittedByManifest(
	origin: string,
	manifest: chrome.runtime.Manifest,
): boolean {
	const manifestPermissions = normalizeManifestPermissions(manifest);
	const originsRegex = patternToRegex(...manifestPermissions.origins);
	return originsRegex.test(origin);
}

export function dropOverlappingPermissions({origins, permissions}: chrome.permissions.Permissions): chrome.permissions.Permissions {
	const result: chrome.permissions.Permissions = {};
	if (origins) {
		result.origins = excludeDuplicatePatterns(origins);
	}

	if (permissions) {
		result.permissions = [...permissions];
	}

	return result;
}
