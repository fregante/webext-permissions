export async function getManifestPermissions(): Promise<Required<chrome.permissions.Permissions>> {
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
	const manifestPermissions = await getManifestPermissions();

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
