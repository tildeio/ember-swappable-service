import Ember from 'ember';
import Service from 'ember-swappable-service';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

let FooService;

module('Unit | SwappableService', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    FooService = class FooService extends Service {
      inspect() {
        throw new Error('`inspect` must be implemented');
      }

      prettyInspect() {
        return `#<${this.inspect()}>`;
      }
    };

    this.owner.register('service:foo', FooService);
  });

  hooks.afterEach(function () {
    // eslint-disable-next-line ember/no-ember-testing-in-module-scope
    Ember.testing = true;
    FooService = undefined;
  });

  test('no variants available (non-abstract)', function (assert) {
    assert.throws(
      () => this.owner.lookup('service:foo').inspect(),
      /`inspect` must be implemented/
    );
  });

  test('no variants available (abstract)', function (assert) {
    FooService.isAbstract = true;

    assert.throws(
      () => this.owner.lookup('service:foo').inspect(),
      /No available implementation for 'service:foo'/
    );
  });

  test('default variant is preferred', function (assert) {
    this.owner.register(
      'service:foo/-default',
      class extends FooService {
        inspect() {
          return 'Foo';
        }
      }
    );

    assert.strictEqual(this.owner.lookup('service:foo').inspect(), 'Foo');

    assert.strictEqual(
      this.owner.lookup('service:foo').prettyInspect(),
      '#<Foo>'
    );
  });

  test('during testing, testing variant is preferred', function (assert) {
    if (Ember.testing !== true) {
      throw new Error('Ember.testing is unexpectedly false');
    }

    this.owner.register(
      'service:foo/-default',
      class extends FooService {
        inspect() {
          return 'Foo';
        }
      }
    );

    this.owner.register(
      'service:foo/-testing',
      class extends FooService {
        inspect() {
          return 'Foo::Testing';
        }
      }
    );

    assert.strictEqual(
      this.owner.lookup('service:foo').inspect(),
      'Foo::Testing'
    );

    assert.strictEqual(
      this.owner.lookup('service:foo').prettyInspect(),
      '#<Foo::Testing>'
    );
  });

  test('outside of testing, default variant is preferred', function (assert) {
    // eslint-disable-next-line ember/no-ember-testing-in-module-scope
    Ember.testing = false;

    this.owner.register(
      'service:foo/-default',
      class extends FooService {
        inspect() {
          return 'Foo';
        }
      }
    );

    this.owner.register(
      'service:foo/-testing',
      class extends FooService {
        inspect() {
          return 'Foo::Testing';
        }
      }
    );

    assert.strictEqual(this.owner.lookup('service:foo').inspect(), 'Foo');

    assert.strictEqual(
      this.owner.lookup('service:foo').prettyInspect(),
      '#<Foo>'
    );
  });

  test('candidates can be set explicitly', function (assert) {
    FooService.candidates = ['bar'];

    this.owner.register(
      'service:foo/-default',
      class extends FooService {
        inspect() {
          return 'Foo';
        }
      }
    );

    this.owner.register(
      'service:foo/-bar',
      class extends FooService {
        inspect() {
          return 'Foo::Bar';
        }
      }
    );

    assert.strictEqual(this.owner.lookup('service:foo').inspect(), 'Foo::Bar');

    assert.strictEqual(
      this.owner.lookup('service:foo').prettyInspect(),
      '#<Foo::Bar>'
    );
  });

  test('candidates can be overridden', function (assert) {
    class BarService extends FooService {
      static get candidates() {
        return ['baz'];
      }
    }

    this.owner.register('service:bar', BarService);

    this.owner.register(
      'service:bar/-default',
      class extends BarService {
        inspect() {
          return 'Bar';
        }
      }
    );

    this.owner.register(
      'service:bar/-baz',
      class extends BarService {
        inspect() {
          return 'Bar::Baz';
        }
      }
    );

    assert.strictEqual(this.owner.lookup('service:bar').inspect(), 'Bar::Baz');

    assert.strictEqual(
      this.owner.lookup('service:bar').prettyInspect(),
      '#<Bar::Baz>'
    );
  });

  test('excluded variants are excluded from the build', function (assert) {
    assert.false(
      this.owner.hasRegistration('service:wow/-ignored'),
      'service:wow/-ignored should not be present'
    );

    assert.true(
      this.owner.hasRegistration('service:wow/-not-ignored'),
      'service:wow/-not-ignored should be present'
    );

    assert.strictEqual(this.owner.lookup('service:wow').name, 'not-ignored');
  });
});
