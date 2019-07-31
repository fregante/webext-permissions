export default async function getAdditionalPermissions(): Promise<Required<chrome.permissions.Permissions>> {
	return new Promise(resolve => {
		const manifest = chrome.runtime.getManifest();
		chrome.permissions.getAll(currentPermissions => {
			const manifestPermissions = [
				...(manifest.permissions || []),
				...(manifest.content_scripts || []).flatMap(config => config.matches || [])
			];

			const additionalPermissions: Required<chrome.permissions.Permissions> = {
				origins: [],
				permissions: []
			};

			for (const origin of currentPermissions.origins || []) {
				if (!manifestPermissions.includes(origin)) {
					additionalPermissions.origins.push(origin);
				}
			}

			for (const permission of currentPermissions.permissions || []) {
				if (!manifestPermissions.includes(permission)) {
					additionalPermissions.permissions.push(permission);
				}
			}

			resolve(additionalPermissions);
		});
	});
}
