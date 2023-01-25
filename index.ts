import {excludeDuplicatePatterns, patternToRegex} from 'webext-patterns';

export async function getManifestPermissions(): Promise<
Required<chrome.permissions.Permissions>
> {
	return getManifestPermissionsSync();
}

export function getManifestPermissionsSync(): Required<chrome.permissions.Permissions> {
	return _getManifestPermissionsSync(chrome.runtime.getManifest());
}

export function _getManifestPermissionsSync(
	manifest: chrome.runtime.Manifest,
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

type Options = {
	strictOrigins?: boolean;
};

const hostRegex = /:[/][/][*.]*([^/]+)/; // Extracts the wildcard-less hostname
function parseDomain(origin: string): string {
	return origin.split(hostRegex)[1]!;
}

export async function selectAdditionalPermissions(
	permissions: chrome.permissions.Permissions,
	options?: Options,
): Promise<Required<chrome.permissions.Permissions>> {
	return selectAdditionalPermissionsSync(permissions, options);
}

export function selectAdditionalPermissionsSync(
	permissions: chrome.permissions.Permissions,
	options?: Options,
): Required<chrome.permissions.Permissions> {
	const manifestPermissions = getManifestPermissionsSync();
	return _getAdditionalPermissions(manifestPermissions, permissions, options);
}

export async function getAdditionalPermissions(
	options?: Options,
): Promise<Required<chrome.permissions.Permissions>> {
	return new Promise(resolve => {
		chrome.permissions.getAll(currentPermissions => {
			const manifestPermissions = getManifestPermissionsSync();
			resolve(
				_getAdditionalPermissions(
					manifestPermissions,
					currentPermissions,
					options,
				),
			);
		});
	});
}

export function _getAdditionalPermissions(
	manifestPermissions: Required<chrome.permissions.Permissions>,
	currentPermissions: chrome.permissions.Permissions,
	{strictOrigins = true}: Options = {},
): Required<chrome.permissions.Permissions> {
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
	const manifestPermissions = _getManifestPermissionsSync(manifest);
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
