import getServiceFullName from 'ember-swappable-service/-get-service-full-name';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | -get-service-full-name', function (hooks) {
  setupTest(hooks);

  test('it works', function (assert) {
    let factory = {
      isServiceFactory: true,

      create(props) {
        let fullName = getServiceFullName(props);
        return { fullName };
      },
    };

    this.owner.register('service:foo', factory);
    this.owner.register('service:bar/baz', factory);

    assert.deepEqual(this.owner.lookup('service:foo'), {
      fullName: 'service:foo',
    });

    assert.deepEqual(this.owner.lookup('service:bar/baz'), {
      fullName: 'service:bar/baz',
    });
  });
});
