ember-swappable-service
==============================================================================

An alternative base case for [Ember Services][ember-services] to facilitate
the "swappable" services pattern.

[ember-services]: https://guides.emberjs.com/release/services/


Compatibility
------------------------------------------------------------------------------

* Ember.js v3.24 or above
* Ember CLI v3.24 or above
* Node.js v14 or above


Installation
------------------------------------------------------------------------------

```
ember install ember-swappable-service
```


Usage
------------------------------------------------------------------------------

Suppose you have this service for reading and writing user preferences data in
your Ember app:

```js
// app/services/preferences.js

import Service from '@ember/service';

export default class PreferencesService extends Service {
  /**
   * Reads a preference item.
   *
   * @public
   * @param {String} preference - The name of the preference item.
   * @returns {unknown} The preference item's value, or null.
   */
  read(preference) {
    let key = this._key(preference);
    let encoded = this._get(key);
    return this._decode(encoded);
  }

  /**
   * Writes a preference item.
   *
   * @public
   * @param {String} preference - The name of the preference item.
   * @param {unknown} value - The value of the preference item.
   * @returns {void}
   */
  write(preference, value) {
    let key = this._key(preference);
    let encoded = this._encode(value);
    this._set(key, encoded);
  }

  /**
   * Gets the value associated with the storage key.
   *
   * @param {String} key - The storage key.
   * @returns {String} The stored value, or null.
   */
  _get(key) {
    return localStorage.getItem(key);
  }

  /**
   * Sets the value associated with the storage key.
   *
   * @param {String} key - The storage key.
   * @param {String} value - The value to store.
   * @returns {void}
   */
  _set(key, value) {
    localStorage.setItem(key, value);
  }

  /**
   * Expands the preference name into a key appropriate storage key.
   *
   * @param {String} preference - The name of the preference item.
   * @returns {String} The storage key.
   */
  _key(preference) {
    return `pref:${preference}`;
  }

  /**
   * Encode a preference item into a format suitable for storage.
   *
   * @param {unknown} item - The preference item to encode.
   * @returns {String} The encoded value.
   */
  _encode(item) {
    return JSON.stringify(item);
  }

  /**
   * Decode a preference item from the storage format.
   *
   * @param {unknown} value - The encoded value.
   * @returns {String} The decoded preference item.
   */
  _decode(value) {
    return JSON.parse(value);
  }
}
```

The public API of this service consist of the `read` and `write` methods for
accessing the preferences, which is ultimately persisted into `localStorage`.

This service works great, but presents some challenges in testing – both in
terms of testing to service _itself_, but also causes some problems in testing
other parts of the apps that uses this service.

Normally, Ember is responsible for creating a "clean slate" environment for
running each test case, taking care of setting up, tearing down and cleaning
up the relevant context and application states between each run. Without this,
the changes to application states by one test case will leak into the rest,
potentially causing non-deterministic failures.

In the case of this service, because the preferences stored by this service is
persisted into `localStorage`, they will survive Ember's clean up efforts.
These differences in initial conditions could ultimately cause the code to
behave differently between test runs, causing non-deterministic failures.

To solve this, we could [mock the service][mocking-services] in the tests to
avoid using `localStorage`. This works, but the API to do this is today is
generally a bit clumsy, involves knowledge in the otherwise uncommonly used
"owner registrations" API that increasingly feel foreign to most users, and
generally requires knowing where precisely the problem exists and setting up
the mocks for those test cases specifically, when in reality, it would be an
error for _any_ tests to be accessing `localStorage` this way, whether the
problem it may cause is noticed immediately or not.

[mocking-services]: https://guides.emberjs.com/release/tutorial/part-2/service-injection/#toc_mocking-services-in-tests

### Swappable Services

This addon solves these issues by providing a much more convenient and natural
way to facilitate this. Let's see it in action.

First, we will change the import path from the example:

```js
// app/services/preferences.js

import Service from 'ember-swappable-service';

export default class PreferencesService extends Service {
  // ...everything else is unchanged...
}
```

The `Service` class provided by this addon is mostly<sup>1</sup> a drop-in
replacement from the `@ember/service` base class, allowing our service to
work exactly the same without any other changes.

> <sup>1</sup> The main difference is that the base class provided here does
> _not_ inherit from `Ember.Object`. This doesn't typically cause any issues
> for modern, idiomatic code.

The next step is to add this new file:

```js
// app/services/preferences/-testing.js

import PreferencesService from '../preferences';

export default class TestingPreferencesService extends PreferencesService {
  /**
   * In tests, preference items are stored in an in-memory JavaScript `Map`
   * instead of `localStorage`. Since the service is torn down, destroyed
   * and recreated between tests, any stored preference items won't leak
   * between tests.
   *
   * @private
   * @type {Map<String, String>}
   */
  _storage = new Map();

  /** @override */
  _get(key) {
    return this._storage.get(key) ?? null;
  }

  /** @override */
  _set(key, value) {
    this._storage.set(key, value);
  }
}
```

Here, we created a _variant_ of our `PreferencesService` that uses in-memory
storage rather than `localStorage`.

By following the [naming convention](#naming-conventions) to place our class
at `app/services/preferences/-testing.js`, the addon will automatically pick
up and recognize this is a variant of the "preferences" service for use during
testing.

Anytime this service is used in a test, through a `@service preferences`
declaration, or through a call to `owner.lookup('service:preferences')`, this
variant of our service will be _swapped in_, preventing accidental leakages.
Best of all, the addon will also take care of [stripping](#code-stripping)
this extra code from the build when it is not needed.

### Naming Conventions

This _swappable services_ pattern is not only useful in testing. For example,
it may be useful to have a development variant of your session service that
bypasses some of the more cumbersome steps (2FA, CAPTCHAs) that would normally
take to authenticate a user in production.

In addition to the "testing" variant we saw above, this addon also tries to
look for a few other possible variants depending on the build and runtime
context. Here is a complete list:

* **testing** (`app/services/foo/-testing.js`) – only when running tests (when
  `Ember.testing` is `true`)
* **development**, **test**, **production**
  (`app/services/foo/-{development,test,production}.js`) – only in that
  specific environment (`--environment` or `EMBER_ENV`)
* **debug** (`app/services/foo/-debug.js`) - only in debug builds (where calls
  to `assert` and `runInDebug` in `@ember/debug` would have run)
* **default** (`app/services/foo/-default.js`)
* The "main" service file (`app/services/foo.js`)

These possible variants are searched in the order they are listed here when
the relevant conditions are met.

For example, when developing using the `ember server` under the default
settings, the addon will try to look for the "debug", "development" and
"default" variants, (`app/services/foo/-{debug,development,default}.js`),
in that order. That is, if both the "development" and "default" variant are
present, the "development" variant will be used. On the other hand, if none of
the candidates are found, then the "main" service file (`app/services/foo.js`)
is used.

Note that the "testing" variant is not merely a synonym for the "test" variant
and the "debug" is likewise not synonymous with the "development". While the
`ember test` command runs the build it in the test environment by default, it
is possible to override that. For instance, `ember test -e production` will
run the tests in the production environment.

Here are a few more examples:

| | testing | development | test | production | debug | default |
|---|---|---|---|---|---|---|
| `ember s` | Maybe | Yes | | | Yes | Yes |
| `ember s -prod` | | | | Yes | | Yes |
| `ember test` | Yes | | Yes | | Yes | Yes |
| `ember test -e production` | Yes | | | Yes | | Yes |

### Abstract Services Pattern

Once you start adopting the swappable services pattern, you may find it useful
to enforce a stronger separation between the service _interface_ (definition
of what the service does) and its _implementations_.

For example, let's say we need a GeoLocation service. We will define its
interface in the "main" service file, like so:

```js
// app/services/geolocation.js

import { AbstractService } from 'ember-swappable-services';

/**
 * A object representing the coordinates of a Geolocation.
 *
 * @typedef {Object} Geolocation
 * @property {number} latitude - The latitude.
 * @property {number} longitude - The longitude.
 */

/** @abstract */
export default class GeolocationService extends AbstractService {
  /**
   * Returns the user's current position.
   *
   * @public
   * @abstract
   * @returns {Promise<Geolocation>} The user's current position.
   */
  async getCurrentPosition() {
    throw new Error('not implemented');
  }
}
```

Here, we focused on defining what the service _does_ – what methods are
available – without actually providing an implementation, as we are expecting
them to be provided by the variants which we will get to soon.

Note that we are importing the `AbstractService` base class from the addon.
This signals that the `GeolocationService` class here is an _abstract_ class
that is not intended for direct use. If not variants can be found, an error
will be thrown instead.

Speaking of which, lets define a few variants, or _implementations_, for this
service:

```js
// app/services/geolocation/-default.js

import GeolocationService from '../geolocation';

/**
 * The default implementation wraps the browser's Geolocation API into the
 * required async API.
 */
export default class DefaultGeoLocationService extends GeolocationService {
  constructor(owner, geolocation = navigator.geolocation) {
    /**
     * By default, this is an alias to the browser's navigator.geolocation
     * object. By making this a parameter in the constructor, it allows us to
     * unit test the service, since there is still a small but non-trivial
     * amount of code here that we will otherwise only ever run in production.
     */
    this._geolocation = geolocation;
  }

  /** @override */
  async getCurrentPosition() {
    return new Promise((resolve, reject) => {
      this._geolocation.getCurrentPosition(
        function onSuccess({ latitude, longitude}) {
          resolve({ latitude, longitude });
        },
        function onError(error) {
          reject(error);
        }
      );
    });
  }
}
```

```js
// app/services/geolocation/-development.js

import GeolocationService from '../geolocation';

/**
 * In development, we cannot use the browser's Geolocation API as it only
 * works over HTTPS. Instead, we will use ip-api.com to obtain an estimate
 * based on our IP address.
 */
export default class DevelopmentGeoLocationService extends GeolocationService {
  /** @override */
  async getCurrentPosition() {
    let result = await fetch('http://ip-api.com/json/');
    return result.json();
  }
}
```

```js
// app/services/geolocation/-testing.js

import GeolocationService from '../geolocation';

/**
 * A object representing the coordinates of a Geolocation.
 *
 * @typedef {Object} Geolocation
 * @property {number} latitude - The latitude.
 * @property {number} longitude - The longitude.
 */

/**
 * In tests, we provide an additional API for the developer to simulate any
 * position they need.
 */
export default class TestingGeoLocationService extends GeolocationService {
  /**
   * @private
   * @type {Geolocation | null}
   */
  _position = null;

  /**
   * Sets the current position.
   *
   * @public
   * @param {Geolocation | null} position – The Geolocation to simulate.
   * @returns {void}
   */
  setCurrentPosition(position) {
    this._position = position;
  }

  /** @override */
  async getCurrentPosition() {
    if (this._position) {
      return this._position;
    } else {
      throw new Error('Geolocation unavailable');
    }
  }
}
```

By separating out the interface of the service from its implementations, it
makes it easier to understand the scope and responsibilities of the service
without the distractions of any private implementation details. It also makes
clear what are the methods an implementation is required to provide.

Note that it is also possible and often beneficial to include shared behavior
in the abstract class. For example, we can refactor the `PreferencesService`
example into the abstract service pattern like so:

```js
// app/services/preferences.js

import { AbstractService } from 'ember-swappable-services';

/** @abstract */
export default class PreferencesService extends AbstractService {
  /**
   * Reads a preference item.
   *
   * @public
   * @param {String} preference - The name of the preference item.
   * @returns {unknown} The preference item's value, or null.
   */
  read(preference) {
    let key = this._key(preference);
    let encoded = this._get(key);
    return this._decode(encoded);
  }

  /**
   * Writes a preference item.
   *
   * @public
   * @param {String} preference - The name of the preference item.
   * @param {unknown} value - The value of the preference item.
   * @returns {void}
   */
  write(preference, value) {
    let key = this._key(preference);
    let encoded = this._encode(value);
    this._set(key, encoded);
  }

  /**
   * Gets the value associated with the storage key.
   *
   * @abstract
   * @param {String} key - The storage key.
   * @returns {String} The stored value, or null.
   */
  _get(key) {
    throw new Error("`_get()` must be implemented by a subclass.");
  }

  /**
   * Sets the value associated with the storage key.
   *
   * @abstract
   * @param {String} key - The storage key.
   * @param {String} value - The value to store.
   * @returns {void}
   */
  _set(key, value) {
    throw new Error("`_set()` must be implemented by a subclass.");
  }

  /**
   * Expands the preference name into a key appropriate storage key.
   *
   * @protected
   * @param {String} preference - The name of the preference item.
   * @returns {String} The storage key.
   */
  _key(preference) {
    return `pref:${preference}`;
  }

  /**
   * Encode a preference item into a format suitable for storage.
   *
   * @protected
   * @param {unknown} item - The preference item to encode.
   * @returns {String} The encoded value.
   */
  _encode(item) {
    return JSON.stringify(item);
  }

  /**
   * Decode a preference item from the storage format.
   *
   * @protected
   * @param {unknown} value - The encoded value.
   * @returns {String} The decoded preference item.
   */
  _decode(value) {
    return JSON.parse(value);
  }
}
```

```js
// app/services/preferences/-default.js

import PreferencesService from '../preferences';

export default class DefaultPreferencesService extends PreferencesService {
  /** @override */
  _get(key) {
    return localStorage.get(key);
  }

  /** @override */
  _set(key, value) {
    localStorage.set(key, value);
  }
}
```

Here, the abstract class both defined the public interface and also provided
some of the logic that can be shared between the implementations. This allows
the implementations to focus on the core functionalities that genuinely needs
to be different between the variants, which also improves test coverage as
more of the code that makes up the service can be exercised in tests.

### Custom Variants

Sometimes, it is useful to have additional variants of a service in addition
to the [built-in conventions](#naming-conventions).

Arbitrary custom variants can be placed in the same folder for the service,
with a leading dash in their filename similar to the built-in variants. In
order to select them for use, the static `candidates` field can be overridden
to include these custom variants:

```js
class FooService extends Service {
  static candidates = ['my-variant', 'other-variant'];
}
```

In this example, only "my-variant" and "other-variant" will be tried. Any
other variants (including "default", etc) are completely ignored.

Alternatively, the default candidates can be preserved, like so:

```js
class FooService extends SwappableService {
  static get candidates() {
    let candidates = [];

    if (ENV.staging === true) {
      candidates.push('dogfood');
    }

    if (window.location.search.includes('experiment-opt-in')) {
      candidates.push('experimental');
    }

    return [candidates, ...super.candidates];
  }
}
```

### Code Stripping

Out of the box, this addon is configured to remove the unnecessary variants
from the build where they are not needed. For example, when building for the
production environment (`ember build -prod`), only the "production" and
"default" variants will be kept in the build.

However, this only applies to [conventional variants](#naming-conventions).
By default, the addon will not remove any custom variants from the build as it
cannot safely determine whether they will be needed.

To exclude custom variants from the build, you can provide additional glob
patterns (relative to `app/services`) in `ember-cli-build.js`. For example:

```js
// ember-cli-build.js

'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');

module.exports = function (defaults) {
  let env = EmberApp.env();
  let excludedServices = [];

  if (env === 'production') {
    excludedServices.push('foo/-bar.js');
    excludedServices.push('**/-experimental.js');
  }

  let app = new EmberApp(defaults, {
    services: {
      exclude: excludedServices,
    },
  });

  return app.toTree();
}
```

### Embroider Support

This addon works with [Embroider][embroider] out-of-the-box.

By default, Embroider includes all the files from the services directory,
since Embroider cannot easily determine where each service is used. This
allows the addon's default resolution strategy (looking up variants from the
owner at runtime) to work without further configuration.

However, it is possible to [configure Embroider][embroider-config] to load
service files statically. In this case, you may find it desirable or even
necessary to override the default resolution logic to be more static. The
`Service` base class provides a `resolve` hook that you can override for this
purpose.

```js
import { importSync, isTesting, macroCondition } from '@embroider/macros';
import Service from 'ember-swappable-services';

export default class FooService extends Service {
  static resolve(_owner, fullName, candidates) {
    let variants = {
      default: importSync('./foo/-default').default;
    };

    if (macroCondition(isTesting())) {
      variants['testing'] = importSync('./foo/-testing').default;
    }

    if (macroCondition(isDevelopingApp())) {
      variants['debug'] = importSync('./foo/-debug').default;
    }

    if (macroCondition(getOwnConfig().includeExperimentalService)) {
      variants['experimental'] = importSync('./foo/-experimental').default;
    }

    for (let candidate of candidates) {
      if (candidate in variants) {
        return variants[candidate];
      }
    }

    return null;
  }

  // ...
}
```

[embroider]: https://github.com/embroider-build/embroider/
[embroider-config]: https://github.com/embroider-build/embroider/blob/5499be4def72c9f91a2e4fe312a22b903e2451ab/packages/core/src/options.ts#L38-L60

### TypeScript Support

This addon fully supports [TypeScript][typescript], assuming the application
is [set up to compile TypeScript][ember-cli-typescript]. The addon ships with
[type definitions][types] for the provided base classes.

[typescript]: https://www.typescriptlang.org
[ember-cli-typescript]: https://github.com/typed-ember/ember-cli-typescript
[types]: ./addon/index.d.ts

When implementing the [abstract service pattern](#abstract-services-pattern),
TypeScript uses can take advantage of the language's built-in support for
abstract classes, with abstract properties or methods enforced by the type
checker:

```ts
import { AbstractService } from 'ember-swappable-services';

export interface User {
  name: string;
}

export default abstract class SessionService extends AbstractService {
  abstract currentUser: User | null;

  isLoggedIn(): boolean {
    return this.currentUser === null;
  }

  logout(): void {
    this.currentUser = null;
  }
}
```

TypeScript files that follow the [naming convention](#naming-conventions)
(but with `.ts` or `.d.ts` extensions) will still benefit from the built-in
[code stripping](#code-stripping) support. However, when `exclude`-ing
[custom variants](#custom-variants), be sure to adjust the glob patterns to
account for the different file extensions.


Contributing
------------------------------------------------------------------------------

See the [Contributing](CONTRIBUTING.md) guide for details.


License
------------------------------------------------------------------------------

This project is licensed under the [MIT License](LICENSE.md).
