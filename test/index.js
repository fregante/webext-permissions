import test from 'ava';
import {
	_getManifestPermissionsSync,
	_getAdditionalPermissions
} from '../index.js';

import manifest from './fixtures/manifest.json';
import atStart from './fixtures/reported-at-start.json';
import afterAddition from './fixtures/reported-after-addition.json';

test('getManifestPermissions', t => {
	t.deepEqual(_getManifestPermissionsSync(manifest), {
		origins: [
			'https://github.com/*',
			'https://api.github.com/*',
			'https://gist.github.com/*',
			'https://ghe.github.com/*'
		],
		permissions: [
			'storage',
			'contextMenus',
			'activeTab',
			'alarms'
		]
	});
});

test('getAdditionalPermissions at install', async t => {
	const manifestPermissions = _getManifestPermissionsSync(manifest);
	t.deepEqual(await _getAdditionalPermissions(manifestPermissions, atStart), {
		origins: [],
		permissions: []
	});
});

test('getAdditionalPermissions after added permissions', async t => {
	const manifestPermissions = _getManifestPermissionsSync(manifest);
	t.deepEqual(await _getAdditionalPermissions(manifestPermissions, afterAddition), {
		origins: [
			'https://*.github.com/*',
			'https://git.example.com/*'
		],
		permissions: [
			'someOtherPermission'
		]
	});
});

test('getAdditionalPermissions after added permissions, loose origin check', async t => {
	const manifestPermissions = _getManifestPermissionsSync(manifest);
	t.deepEqual(await _getAdditionalPermissions(manifestPermissions,	afterAddition,	{strictOrigins: false}), {
		origins: [
			'https://git.example.com/*'
		],
		permissions: [
			'someOtherPermission'
		]
	});
});
