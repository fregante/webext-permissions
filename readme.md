# webext-additional-permissions [![Travis build status](https://api.travis-ci.com/fregante/webext-additional-permissions.svg?branch=master)](https://travis-ci.com/fregante/webext-additional-permissions) [![npm version](https://img.shields.io/npm/v/webext-additional-permissions.svg)](https://www.npmjs.com/package/webext-additional-permissions)

> WebExtensions module: Get any optional permissions that users have granted you.

`chrome.permissions.getAll()` will report all permissions, whether they're part of the manifest’s `permissions` field or if they've been granted later via `chrome.permissions.request`.

`webext-additional-permissions` will return the same `Permissions` object but it will only include any permissions that the user might have granted to the extension.

Compatible with Chrome 69+ and Firefox 62+ (both released in September 2018.)

## Install

You can just download the [standalone bundle](https://packd.fregante.now.sh/webext-additional-permissions@latest?name=getAdditionalPermissions) (it might take a minute to download) and include the file in your `manifest.json`, or:

```sh
npm install webext-additional-permissions
```

```js
// This module is only offered as a ES Module
import getAdditionalPermissions from 'webext-additional-permissions';
```

## Usage

```json
// example manifest.json
{
	"permissions": [
		"https://google.com/*"
		"storage"
	],
	"optional_permissions": [
		"https://*/*"
	]
}
```

```js
import getAdditionalPermissions from 'webext-additional-permissions';

(async () => {
	const newPermissions = await getAdditionalPermissions();
	// => {origins: [], permissions: []}
})();

async function onGrantPermissionButtonClick() {
	await browser.permissions.request({origins: ['https://facebook.com/*']});

	// Regular `browser` API: returns manifest permissions and new permissions
	const allPermissions = await browser.permissions.getAll();
	// => {origins: ['https://google.com/*', 'https://facebook.com/*'], permissions: ['storage']}

	// This module: only the new permission is returned
	const newPermissions = await getAdditionalPermissions();
	// => {origins: ['https://facebook.com/*'], permissions: []}
}
```

## API

### getAdditionalPermissions()

Returns a promise that resolves with a `Permission` object like `chrome.permissions.getAll` and `browser.permissions.getAll`, but only includes the optional permissions that the user granted you.

## Related

* [webext-options-sync](https://github.com/fregante/webext-options-sync) - Helps you manage and autosave your extension's options.
* [webext-domain-permission-toggle](https://github.com/fregante/webext-domain-permission-toggle) - Browser-action context menu to request permission for the current tab.
* [webext-dynamic-content-scripts](https://github.com/fregante/webext-dynamic-content-scripts) - Automatically inject your `content_scripts` on custom domains.
* [webext-detect-page](https://github.com/fregante/webext-detect-page) - Detects where the current browser extension code is being run.
* [webext-content-script-ping](https://github.com/fregante/webext-content-script-ping) - One-file interface to detect whether your content script have loaded.
* [`Awesome WebExtensions`](https://github.com/fregante/Awesome-WebExtensions): A curated list of awesome resources for Web Extensions development.

## License

MIT © [Federico Brigante](https://bfred.it)
