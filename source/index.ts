import {removeRedundantPatterns, patternToRegex} from 'webext-patterns';

export function normalizeManifestPermissions(
	manifest = chrome.runtime.getManifest(),
): Required<chrome.permissions.Permissions> {
	const manifestPermissions: Required<chrome.permissions.Permissions> = {
		origins: [],
		permissions: [],
	};

	const list = new Set<string>([
		...(manifest.permissions ?? []),
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- Not sure why it's being a PITA
		...(manifest.host_permissions ?? []),
		...(manifest.content_scripts ?? []).flatMap(config => config.matches ?? []),
		// https://github.com/mozilla/gecko-dev/blob/c0fc8c4852e927b0ae75d893d35772b8c60ee06b/toolkit/components/extensions/Extension.jsm#L738-L743
		...(
			manifest.devtools_page !== undefined
			// @ts-expect-error it can't be specified, but it's reported when requested
			&& !manifest.optional_permissions?.includes('devtools')
				? ['devtools']
				: []
		),
	]);

	for (const permission of list) {
		if (permission === '<all_urls>' || permission.includes('://')) {
			manifestPermissions.origins.push(permission);
		} else {
			manifestPermissions.permissions.push(permission as chrome.runtime.ManifestPermission);
		}
	}

	return dropOverlappingPermissions(manifestPermissions);
}

type OriginsOptions = {
	strictOrigins?: boolean;
};

// eslint-disable-next-line require-unicode-regexp, regexp/prefer-named-capture-group -- `[/]` isn't valid with the `v` flag
const hostRegex = /:[/][/][*.]*([^/]+)/; // Extracts the wildcard-less hostname
function parseDomain(origin: string): string {
	return origin.split(hostRegex)[1]!;
}

type PermissionsOptions = OriginsOptions & {
	manifest?: chrome.runtime.Manifest;
};

// Empty parts are omitted
export type PermissionsDiff = {
	// Granted permissions that aren't in the manifest
	added?: chrome.permissions.Permissions;
	// Manifest origins that are no longer granted (users can only remove origins)
	removed?: string[];
};

function hasOrigin(origins: readonly string[], origin: string, isStrict: boolean): boolean {
	if (origins.includes(origin)) {
		return true;
	}

	if (isStrict) {
		return false;
	}

	const domain = parseDomain(origin);
	return origins.some(other => parseDomain(other) === domain);
}

export async function queryPermissionsDiff(
	options?: OriginsOptions,
): Promise<PermissionsDiff> {
	return new Promise(resolve => {
		chrome.permissions.getAll(currentPermissions => {
			resolve(diffPermissions(currentPermissions, options));
		});
	});
}

export function diffPermissions(
	currentPermissions: chrome.permissions.Permissions,
	{
		manifest,
		strictOrigins = true,
	}: PermissionsOptions = {},
): PermissionsDiff {
	const manifestPermissions = normalizeManifestPermissions(manifest);
	const currentOrigins = currentPermissions.origins ?? [];

	const addedOrigins = currentOrigins
		.filter(origin => !hasOrigin(manifestPermissions.origins, origin, strictOrigins));
	const addedPermissions = (currentPermissions.permissions ?? [])
		.filter(permission => !manifestPermissions.permissions.includes(permission));
	const removed = manifestPermissions.origins
		.filter(origin => !hasOrigin(currentOrigins, origin, strictOrigins));

	const added: chrome.permissions.Permissions = {
		...(addedOrigins.length > 0 && {origins: addedOrigins}),
		...(addedPermissions.length > 0 && {permissions: addedPermissions}),
	};

	return {
		...(Object.keys(added).length > 0 && {added}),
		...(removed.length > 0 && {removed}),
	};
}

export function isUrlPermittedByManifest(
	origin: string,
	manifest = chrome.runtime.getManifest(),
): boolean {
	const manifestPermissions = normalizeManifestPermissions(manifest);
	const originsRegex = patternToRegex(...manifestPermissions.origins);
	return originsRegex.test(origin);
}

export function dropOverlappingPermissions({origins, permissions}: chrome.permissions.Permissions): Required<chrome.permissions.Permissions> {
	return {
		origins: origins ? removeRedundantPatterns(origins) : [],
		permissions: permissions ? [...permissions] : [],
	};
}
