import { assert } from '@ember/debug';

/**
 * Given an Owner, the fullName of a service and the candidate variants, find
 * the first available variant (the resolved class), or `null` if none can be
 * found.
 */
export default function resolveVariant(owner, fullName, candidates) {
  assert(
    'expected owner to be an object',
    owner !== null && typeof owner === 'object'
  );

  assert(
    'expected owner.hasRegistration to be a function',
    typeof owner.hasRegistration === 'function'
  );

  assert(
    'expected owner.factoryFor to be a function',
    typeof owner.factoryFor === 'function'
  );

  assert(
    `expected '${fullName}' to be a service name`,
    typeof fullName === 'string' && fullName.startsWith('service:')
  );

  assert(
    `expected '${fullName}' to be registered`,
    owner.hasRegistration(fullName)
  );

  assert(
    'expected candidates to be an array of strings',
    Array.isArray(candidates) && candidates.every((c) => typeof c === 'string')
  );

  for (let candidate of candidates) {
    let parts = candidate.split('/');
    parts.push(`-${parts.pop()}`);

    let candidateFullName = `${fullName}/${parts.join('/')}`;

    if (owner.hasRegistration(candidateFullName)) {
      let factory = owner.factoryFor(candidateFullName);

      assert(
        `expected '${candidateFullName}' to be a valid factory`,
        factory !== null &&
        typeof factory === 'object' &&
        typeof factory.class === 'function'
      );

      return factory.class;
    }
  }

  return null;
}
