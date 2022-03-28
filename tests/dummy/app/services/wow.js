import SwappableService from 'ember-swappable-service';

export default class WowService extends SwappableService {
  static candidates = ['ignored', 'not-ignored'];

  get name() {
    throw new Error('not implemented');
  }
}
