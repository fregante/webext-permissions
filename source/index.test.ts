/* eslint-disable @typescript-eslint/naming-convention -- Manifest keys use snake_case */
import {test, describe} from 'node:test';
import assert from 'node:assert/strict';
import manifest2 from '../test-fixtures/manifest-v2.json' with {type: 'json'};
import manifest3 from '../test-fixtures/manifest-v3.json' with {type: 'json'};
import atStart from '../test-fixtures/reported-at-start.json' with {type: 'json'};
import afterAddition from '../test-fixtures/reported-after-addition.json' with {type: 'json'};
import afterRemoval from '../test-fixtures/reported-after-removal.json' with {type: 'json'};
import {
	normalizeManifestPermissions,
	diffPermissions,
	isUrlPermittedByManifest,
	dropOverlappingPermissions,
} from './index.js';

const manifests = [
	['manifest v2', manifest2 as chrome.runtime.ManifestV2],
	['manifest v3', manifest3 as chrome.runtime.ManifestV3],
] as const;

for (const [name, manifest] of manifests) {
	describe(name, () => {
		test('normalizeManifestPermissions', () => {
			assert.deepEqual(normalizeManifestPermissions(manifest), {
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

		test('diffPermissions at install', () => {
			assert.equal(diffPermissions(atStart as chrome.permissions.Permissions, {manifest}).added, undefined);
		});

		test('diffPermissions after added permissions', () => {
			assert.deepEqual(diffPermissions(afterAddition as chrome.permissions.Permissions, {manifest}).added, {
				origins: [
					'https://*.github.com/*',
					'https://git.example.com/*',
				],
				permissions: [
					'someOtherPermission',
				],
			});
		});

		test('diffPermissions after added permissions, loose origin check', () => {
			assert.deepEqual(diffPermissions(afterAddition as chrome.permissions.Permissions, {manifest, strictOrigins: false}).added, {
				origins: [
					'https://git.example.com/*',
				],
				permissions: [
					'someOtherPermission',
				],
			});
		});

		test('diffPermissions after removed origins', () => {
			const {added, removed} = diffPermissions(afterRemoval as chrome.permissions.Permissions, {manifest});

			assert.deepEqual(added, {
				origins: [
					'https://git.example.com/*',
				],
				permissions: [
					'someOtherPermission',
				],
			});

			assert.deepEqual(removed, [
				'https://github.com/*',
				'https://gist.github.com/*',
			]);
		});

		test('diffPermissions with missing origins and permissions keys', () => {
			assert.deepEqual(diffPermissions({}, {manifest}), {
				removed: normalizeManifestPermissions(manifest).origins,
			});
		});

		test('diffPermissions without changes', () => {
			assert.deepEqual(diffPermissions(normalizeManifestPermissions(manifest), {manifest}), {});
		});

		test('diffPermissions only includes the changed parts', () => {
			assert.deepEqual(diffPermissions({
				...normalizeManifestPermissions(manifest),
				origins: [...normalizeManifestPermissions(manifest).origins, 'https://git.example.com/*'],
			}, {manifest}), {
				added: {origins: ['https://git.example.com/*']},
			});
		});

		test('diffPermissions strictOrigins', () => {
			// Like Safari, https://github.com/fregante/webext-permissions/issues/1
			const current = {origins: ['*://github.com/*']};

			assert.equal(diffPermissions(current, {manifest}).removed?.includes('https://github.com/*'), true);
			assert.equal(diffPermissions(current, {manifest, strictOrigins: false}).removed?.includes('https://github.com/*'), false);
		});

		test('dropOverlappingPermissions', () => {
			assert.deepEqual(dropOverlappingPermissions({
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

			assert.deepEqual(dropOverlappingPermissions({
				origins: [
					'https://*.example.com/*',
					'*://*/*',
					'https://fregante.com/*',
				],
			}), {
				origins: ['*://*/*'],
				permissions: [],
			}, '*://*/* should catch all');

			assert.deepEqual(dropOverlappingPermissions({
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

			assert.deepEqual(dropOverlappingPermissions({
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

			assert.deepEqual(dropOverlappingPermissions({
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

		test('isUrlPermittedByManifest', () => {
			assert.equal(isUrlPermittedByManifest('https://ghe.github.com/*', manifest), true);
			assert.equal(isUrlPermittedByManifest('https://github.com/contacts/', manifest), true);
			assert.equal(isUrlPermittedByManifest('https://other.github.com/contacts/', manifest), false);
			assert.equal(isUrlPermittedByManifest('https://example.com/contacts/', {
				content_scripts: [
					{
						matches: [
							'https://*/*',
						],
					},
				],
			} as chrome.runtime.Manifest), true);
			assert.equal(isUrlPermittedByManifest('http://insecure.com/', {
				content_scripts: [
					{
						matches: [
							'https://*/*',
						],
					},
				],
			} as chrome.runtime.Manifest), false);
			assert.equal(isUrlPermittedByManifest('https://hassubdomains.com/', manifest), true);
			assert.equal(isUrlPermittedByManifest('https://hassubdomains.com/foo/', manifest), true);
			assert.equal(isUrlPermittedByManifest('https://subdomain.hassubdomains.com/', manifest), true);
			assert.equal(isUrlPermittedByManifest('https://subdomain.hassubdomains.com/foo/', manifest), true);
		});
	});
}
