import resolveVariant from 'ember-swappable-service/-resolve-variant';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

class FooService {
  static isServiceFactory = true;
}

class BarService {
  static isServiceFactory = true;
}

class BazService {
  static isServiceFactory = true;
}

class BarBazService {
  static isServiceFactory = true;
}

module('Unit | -resolve-variant', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:foo', FooService);
    this.owner.register('service:foo/-bar', BarService);
    this.owner.register('service:foo/-baz', BazService);
    this.owner.register('service:foo/bar/-baz', BarBazService);

    this.owner.register('service:nested/foo', FooService);
    this.owner.register('service:nested/foo/-bar', BarService);
  });

  test('single candidate', function (assert) {
    assert.strictEqual(
      resolveVariant(this.owner, 'service:foo', ['bar']),
      BarService,
      "resolving ['bar']"
    );

    assert.strictEqual(
      resolveVariant(this.owner, 'service:foo', ['baz']),
      BazService,
      "resolving ['baz']"
    );

    assert.strictEqual(
      resolveVariant(this.owner, 'service:foo', ['bar/baz']),
      BarBazService,
      "resolving ['bar/baz']"
    );
  });

  test('multiple candidates', function (assert) {
    assert.strictEqual(
      resolveVariant(this.owner, 'service:foo', ['bar', 'baz']),
      BarService,
      "resolving ['bar', 'baz']"
    );

    assert.strictEqual(
      resolveVariant(this.owner, 'service:foo', ['baz', 'bar']),
      BazService,
      "resolving ['baz', 'bar']"
    );

    assert.strictEqual(
      resolveVariant(this.owner, 'service:foo', ['foo', 'bar']),
      BarService,
      "resolving ['foo', 'bar']"
    );
  });

  test('unknown candidates', function (assert) {
    assert.strictEqual(
      resolveVariant(this.owner, 'service:foo', []),
      null,
      'resolving []'
    );

    assert.strictEqual(
      resolveVariant(this.owner, 'service:foo', ['foo']),
      null,
      "resolving ['foo']"
    );
  });

  test('nested fullName', function (assert) {
    assert.strictEqual(
      resolveVariant(this.owner, 'service:nested/foo', ['bar']),
      BarService,
      "resolving ['bar']"
    );
  });

  test('invalid fullName', function (assert) {
    assert.throws(
      () => resolveVariant(this.owner, 'foo', ['bar']),
      /expected 'foo' to be a service name/
    );

    assert.throws(
      () => resolveVariant(this.owner, 'service:bar', ['baz']),
      /expected 'service:bar' to be registered/
    );
  });
});
