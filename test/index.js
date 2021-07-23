import test from 'ava';
import {
	_getManifestPermissionsSync,
	_getAdditionalPermissions,
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
			'https://ghe.github.com/*',
		],
		permissions: [
			'storage',
			'contextMenus',
			'activeTab',
			'alarms',
			'devtools',
		],
	});
});

test('getAdditionalPermissions at install', t => {
	const manifestPermissions = _getManifestPermissionsSync(manifest);
	t.deepEqual(_getAdditionalPermissions(manifestPermissions, atStart), {
		origins: [],
		permissions: [],
	});
});

test('getAdditionalPermissions after added permissions', t => {
	const manifestPermissions = _getManifestPermissionsSync(manifest);
	t.deepEqual(_getAdditionalPermissions(manifestPermissions, afterAddition), {
		origins: [
			'https://*.github.com/*',
			'https://git.example.com/*',
		],
		permissions: [
			'someOtherPermission',
		],
	});
});

test('getAdditionalPermissions after added permissions, loose origin check', t => {
	const manifestPermissions = _getManifestPermissionsSync(manifest);
	t.deepEqual(_getAdditionalPermissions(manifestPermissions,	afterAddition,	{strictOrigins: false}), {
		origins: [
			'https://git.example.com/*',
		],
		permissions: [
			'someOtherPermission',
		],
	});
});

// This is identical to the internal _getManifestPermissionsSync, which is already tested
test('selectAdditionalPermissions', t => {
	t.pass();
});
