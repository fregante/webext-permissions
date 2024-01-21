/* eslint-disable @typescript-eslint/naming-convention */
import {test, describe, assert} from 'vitest';
import manifest2 from '../test-fixtures/manifest-v2.json' with {type: 'json'};
import manifest3 from '../test-fixtures/manifest-v3.json' with {type: 'json'};
import atStart from '../test-fixtures/reported-at-start.json' with {type: 'json'};
import afterAddition from '../test-fixtures/reported-after-addition.json' with {type: 'json'};
import {
	normalizeManifestPermissions,
	extractAdditionalPermissions,
	isUrlPermittedByManifest,
	dropOverlappingPermissions,
} from './index.js';

// AVA compatibility layer
const t = {
	deepEqual: assert.deepEqual,
	is: assert.equal,
	pass() {
		assert(true);
	},
};

describe.each([
	['manifest v2', manifest2 as chrome.runtime.ManifestV2],
	['manifest v3', manifest3 as chrome.runtime.ManifestV3],
])('%s', (_, manifest) => {
	test('normalizeManifestPermissions', () => {
		t.deepEqual(normalizeManifestPermissions(manifest), {
			origins: [
				'https://github.com/*',
				'*://api.github.com/*',
				'https://*.hassubdomains.com/*',
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

	test('extractAdditionalPermissions at install', () => {
		t.deepEqual(extractAdditionalPermissions(atStart, {manifest}), {
			origins: [],
			permissions: [],
		});
	});

	test('extractAdditionalPermissions after added permissions', () => {
		t.deepEqual(extractAdditionalPermissions(afterAddition, {manifest}), {
			origins: [
				'https://*.github.com/*',
				'https://git.example.com/*',
				// According to the documentation, strictOrigins is only concerned
				// with widening of permissions, not narrowing.  Therefore
				// This should exclude https://subdomain.hassubdomains.com/*
				// because it's not an additional permission relative to
				// https://*.hassubdomains.com/* which is already in the manifest.
			],
			permissions: [
				'someOtherPermission',
			],
		});
	});

	test('extractAdditionalPermissions after added permissions, loose origin check', () => {
		t.deepEqual(extractAdditionalPermissions(afterAddition, {manifest, strictOrigins: false}), {
			origins: [
				'https://git.example.com/*',
			],
			permissions: [
				'someOtherPermission',
			],
		});
	});

	test('dropOverlappingPermissions', () => {
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
			permissions: [],
		}, '<all_urls> should catch all');

		t.deepEqual(dropOverlappingPermissions({
			origins: [
				'https://*.example.com/*',
				'*://*/*',
				'https://fregante.com/*',
			],
		}), {
			origins: ['*://*/*'],
			permissions: [],
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
			permissions: [],
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
			permissions: [],
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
			permissions: [],
		}, 'A pathname star should drop all other same-origin origins');
	});

	// This is identical to the internal normalizeManifestPermissions, which is already tested
	test('extractAdditionalPermissions', () => {
		t.pass();
	});

	test('isUrlPermittedByManifest ', () => {
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
		} as chrome.runtime.Manifest), true);
		t.is(isUrlPermittedByManifest('http://insecure.com/', {
			content_scripts: [
				{
					matches: [
						'https://*/*',
					],
				},
			],
		} as chrome.runtime.Manifest), false);
		t.is(isUrlPermittedByManifest('https://hassubdomains.com/', manifest), true);
		t.is(isUrlPermittedByManifest('https://hassubdomains.com/foo/', manifest), true);
		t.is(isUrlPermittedByManifest('https://subdomain.hassubdomains.com/', manifest), true);
		t.is(isUrlPermittedByManifest('https://subdomain.hassubdomains.com/foo/', manifest), true);
	});
},
);
