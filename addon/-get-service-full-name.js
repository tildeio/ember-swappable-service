import { assert } from '@ember/debug';

/**
 * Extracts the full name of a service from the `props` passed to the `create`
 * method on the factory. This function depends on private implementation
 * details in Ember and could easily break without warning between versions!
 */
export default function getServiceFullName(props) {
  assert(
    'expected props to be an object',
    props !== null && typeof props === 'object'
  );

  let initFactorySymbol = Object.getOwnPropertySymbols(props).find((s) =>
    s.toString().includes('INIT_FACTORY')
  );

  assert('expected props to include INIT_FACTORY symbol', initFactorySymbol);

  let initFactory = props[initFactorySymbol];

  assert(
    'expected initFactory to be an object',
    initFactory !== null && typeof initFactory === 'object'
  );

  assert(
    'expected initFactory to have a fullName property',
    'fullName' in initFactory
  );

  let { fullName } = initFactory;

  assert('expected fullName to be a string', typeof fullName === 'string');

  assert(
    `expected fullName to start with "service:", was ${fullName}`,
    fullName.startsWith('service:')
  );

  return fullName;
}
