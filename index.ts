// This is the default because it’s easier to explain that both exports are synchronous, while still offering a `*Sync()` version where possible.
export async function getManifestPermissions(): Promise<Required<chrome.permissions.Permissions>> {
	return getManifestPermissionsSync();
}

export function getManifestPermissionsSync(): Required<chrome.permissions.Permissions> {
	const manifest = chrome.runtime.getManifest();
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

export async function getAdditionalPermissions(): Promise<Required<chrome.permissions.Permissions>> {
	const manifestPermissions = getManifestPermissionsSync();

	return new Promise(resolve => {
		chrome.permissions.getAll(currentPermissions => {
			const additionalPermissions: Required<chrome.permissions.Permissions> = {
				origins: [],
				permissions: []
			};

			for (const origin of currentPermissions.origins ?? []) {
				if (!manifestPermissions.origins.includes(origin)) {
					additionalPermissions.origins.push(origin);
				}
			}

			for (const permission of currentPermissions.permissions ?? []) {
				if (!manifestPermissions.permissions.includes(permission)) {
					additionalPermissions.permissions.push(permission);
				}
			}

			resolve(additionalPermissions);
		});
	});
}
