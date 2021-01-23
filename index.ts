// This is the default because it’s easier to explain that both exports are synchronous, while still offering a `*Sync()` version where possible.
export async function getManifestPermissions(): Promise<Required<chrome.permissions.Permissions>> {
	return getManifestPermissionsSync();
}

export function getManifestPermissionsSync(): Required<chrome.permissions.Permissions> {
	return _getManifestPermissionsSync(chrome.runtime.getManifest());
}

export function _getManifestPermissionsSync(manifest: chrome.runtime.Manifest): Required<chrome.permissions.Permissions> {
	const manifestPermissions: Required<chrome.permissions.Permissions> = {
		origins: [],
		permissions: []
	};

	const list = new Set([
		...(manifest.permissions ?? []),
		...(manifest.content_scripts ?? []).flatMap(config => config.matches ?? [])
	]);

	for (const permission of list) {
		if (permission.includes('://')) {
			manifestPermissions.origins.push(permission);
		} else {
			manifestPermissions.permissions.push(permission);
		}
	}

	return manifestPermissions;
}

interface Options {
	strictOrigins?: boolean;
}

const hostRegex = /:[/][/][*.]*([^/]+)/; // Extracts the wildcard-less hostname
function parseDomain(origin: string): string {
	return origin.split(hostRegex)[1]!;
}

export async function getAdditionalPermissions(options?: Options): Promise<Required<chrome.permissions.Permissions>> {
	return new Promise(resolve => {
		chrome.permissions.getAll(currentPermissions => {
			const manifestPermissions = getManifestPermissionsSync();
			resolve(_getAdditionalPermissions(manifestPermissions, currentPermissions, options));
		});
	});
}

export async function _getAdditionalPermissions(
	manifestPermissions: Required<chrome.permissions.Permissions>,
	currentPermissions: chrome.permissions.Permissions,
	{strictOrigins = true}: Options = {}
): Promise<Required<chrome.permissions.Permissions>> {
	const additionalPermissions: Required<chrome.permissions.Permissions> = {
		origins: [],
		permissions: []
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
