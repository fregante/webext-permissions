import {readFileSync} from 'node:fs';
import test from 'ava';
import {
	normalizeManifestPermissions,
	extractAdditionalPermissions,
	isUrlPermittedByManifest,
	dropOverlappingPermissions,
} from '../index.js';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url)));

const manifest = readJson('./fixtures/manifest.json');
const atStart = readJson('./fixtures/reported-at-start.json');
const afterAddition = readJson('./fixtures/reported-after-addition.json');

test('normalizeManifestPermissions', t => {
	t.deepEqual(normalizeManifestPermissions(manifest), {
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

test('extractAdditionalPermissions at install', t => {
	t.deepEqual(extractAdditionalPermissions(atStart, {manifest}), {
		origins: [],
		permissions: [],
	});
});

test('extractAdditionalPermissions after added permissions', t => {
	t.deepEqual(extractAdditionalPermissions(afterAddition, {manifest}), {
		origins: [
			'https://*.github.com/*',
			'https://git.example.com/*',
		],
		permissions: [
			'someOtherPermission',
		],
	});
});

test('extractAdditionalPermissions after added permissions, loose origin check', t => {
	t.deepEqual(extractAdditionalPermissions(afterAddition, {manifest, strictOrigins: false}), {
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

// This is identical to the internal normalizeManifestPermissions, which is already tested
test('extractAdditionalPermissions', t => {
	t.pass();
});

test('isUrlPermittedByManifest ', t => {
	/* eslint-disable camelcase */
	t.is(isUrlPermittedByManifest('https://ghe.github.com/*', manifest), true);
	t.is(isUrlPermittedByManifest('https://github.com/contacts/', manifest), true);
	t.is(isUrlPermittedByManifest('https://other.github.com/contacts/', manifest), false);
	t.is(isUrlPermittedByManifest('https://example.com/contacts/', {
		content_scripts: [
			{
				matches: [
					'https://*/*',
				],
			},
		],
	}), true);
	t.is(isUrlPermittedByManifest('http://insecure.com/', {
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
