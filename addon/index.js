import {
  dependencySatisfies,
  getOwnConfig,
  importSync,
  isTesting,
  macroCondition,
} from '@embroider/macros';
import { getOwner, setOwner } from '@ember/application';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import getServiceFullName from './-get-service-full-name';
import resolveVarient from './-resolve-varient';

export default class Service {
  static isServiceFactory = true;

  static isAbstract = false;

  static _candidates = null;

  static get candidates() {
    if (this._candidates !== null) {
      return this._candidates;
    }

    let candidates = [getOwnConfig().env, 'default'];

    if (DEBUG) {
      candidates.splice(1, 0, 'debug');
    }

    if (macroCondition(isTesting())) {
      if (macroCondition(dependencySatisfies('ember-source', '>= 3.27.0'))) {
        if (importSync('ember').default.testing) {
          candidates.unshift('testing');
        }
      } else {
        if (window.Ember.testing) {
          candidates.unshift('testing');
        }
      }
    }

    return candidates;
  }

  static set candidates(candidates) {
    this._candidates = candidates;
  }

  static resolve(owner, fullName, candidates) {
    return resolveVarient(owner, fullName, candidates) ?? this;
  }

  static create(props) {
    let owner = getOwner(props);
    let fullName = getServiceFullName(props);
    let { candidates } = this;

    assert(
      `expected ${this}.candidates to be an non-empty array of strings`,
      Array.isArray(candidates) &&
      candidates.length > 0 &&
      candidates.every((c) => typeof c === 'string')
    );

    let Class = this.resolve(owner, fullName, candidates);

    if (Class === this && this.isAbstract) {
      Class = null;
    }

    if (Class) {
      return new Class(owner);
    } else {
      throw new Error(
        `No available implementation for '${fullName}', ` +
        `tried ${candidates.join(', ')}`
      );
    }
  }

  constructor(owner) {
    setOwner(this, owner);
  }
}

export class AbstractService extends Service {
  static get isAbstract() {
    return true;
  }
}
