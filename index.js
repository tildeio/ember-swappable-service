'use strict';

const funnel = require('broccoli-funnel');
const SilentError = require('silent-error');
const { inspect } = require('util');

module.exports = {
  name: require('./package').name,

  options: {
    '@embroider/macros': {
      setOwnConfig: {},
    },
  },

  included(parent) {
    this._super.included.apply(this, arguments);

    let env = this.app.env;
    let isDebug = !this.app.isProduction;
    let isTesting = this.app.tests;

    this.options['@embroider/macros'].setOwnConfig.env = env;

    if (parent !== this.app) {
      return;
    }

    let exclude = [];

    if (!isDebug) {
      exclude.push('**/-debug.{js,ts,d.ts}');
    }

    if (!isTesting) {
      exclude.push('**/-testing.{js,ts,d.ts}');
    }

    if (env !== 'development') {
      exclude.push('**/-development.{js,ts,d.ts}');
    }

    if (env !== 'test') {
      exclude.push('**/-test.{js,ts,d.ts}');
    }

    if (env !== 'production') {
      exclude.push('**/-production.{js,ts,d.ts}');
    }

    let userExcludes = this.app.options.services?.exclude ?? [];

    if (
      !Array.isArray(userExcludes) ||
      !userExcludes.every((glob) => typeof glob === 'string')
    ) {
      throw new SilentError(
        'Invalid config in ember-cli-build.js: ' +
          'services.exclude must be an array of glob patterns. ' +
          `Found ${inspect(userExcludes)} instead.`
      );
    }

    exclude.push(...userExcludes);

    this.app.trees.app = funnel(this.app.trees.app, {
      annotation: 'ember-swappable-service',
      exclude: exclude.map((glob) => `services/${glob}`),
    });
  },
};
