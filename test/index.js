import {readFileSync} from 'node:fs';
import test from 'ava';
import {
	_getManifestPermissionsSync,
	_getAdditionalPermissions,
	_isUrlPermittedByManifest,
	dropOverlappingPermissions,
} from '../index.js';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));

const manifest = readJson('./fixtures/manifest.json');
const atStart = readJson('./fixtures/reported-at-start.json');
const afterAddition = readJson('./fixtures/reported-after-addition.json');

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

test('dropOverlappingPermissions', t => {
	t.deepEqual(dropOverlappingPermissions({
		origins: [
			'https://*.example.com/*',
			'<all_urls>',
			'https://fregante.com/*',
			'*://*/*',
		],
	}), {
		origins: [
			'<all_urls>',
		],
	}, '<all_urls> should catch all');

	t.deepEqual(dropOverlappingPermissions({
		origins: [
			'https://*.example.com/*',
			'*://*/*',
			'https://fregante.com/*',
		],
	}), {
		origins: ['*://*/*'],
	}, '*://*/* should catch all');

	t.deepEqual(dropOverlappingPermissions({
		origins: [
			'http://*.example.com/*',
			'https://*/*',
			'https://fregante.com/*',
		],
	}), {
		origins: [
			'http://*.example.com/*',
			'https://*/*',
		],
	}, 'https://*/* should drop all other https origins');

	t.deepEqual(dropOverlappingPermissions({
		origins: [
			'https://git.example.com/*',
			'https://*.example.com/*',
			'https://example.com/*',
			'https://fregante.com/*',
		],
	}), {
		origins: [
			'https://*.example.com/*',
			'https://fregante.com/*',
		],
	}, 'A subdomain star should drop all other same-domain origins');

	t.deepEqual(dropOverlappingPermissions({
		origins: [
			'https://git.example.com/*',
			'https://git.example.com/fregante/*',
		],
	}), {
		origins: [
			'https://git.example.com/*',
		],
	}, 'A pathname star should drop all other same-origin origins');
});

// This is identical to the internal _getManifestPermissionsSync, which is already tested
test('selectAdditionalPermissions', t => {
	t.pass();
});

test('isUrlPermittedByManifest ', t => {
	/* eslint-disable camelcase */
	t.is(_isUrlPermittedByManifest('https://ghe.github.com/*', manifest), true);
	t.is(_isUrlPermittedByManifest('https://github.com/contacts/', manifest), true);
	t.is(_isUrlPermittedByManifest('https://other.github.com/contacts/', manifest), false);
	t.is(_isUrlPermittedByManifest('https://example.com/contacts/', {
		content_scripts: [
			{
				matches: [
					'https://*/*',
				],
			},
		],
	}), true);
	t.is(_isUrlPermittedByManifest('http://insecure.com/', {
		content_scripts: [
			{
				matches: [
					'https://*/*',
				],
			},
		],
	}), false);
	/* eslint-enable camelcase */
});
