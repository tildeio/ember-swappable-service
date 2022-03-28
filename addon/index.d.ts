/**
 * Base class for implementing swappable services.
 */
export default class Service {
  private static isServiceFactory: true;
  private static _candidates: string[] | null;
  private static create<Class extends typeof Service>(
    this: Class, props: Record<PropertyKey, unknown>
  ): InstanceType<Class>;

  /**
   * An ordered list of candidate varients to search for.
   *
   * The default candidates, depending on the build context, consist of:
   *
   * - "testing" – only when running tests (when `Ember.testing` is `true`)
   * - "development", "test" or "production" – only in that specific
   *   environment (`--environment` or `EMBER_ENV`)
   * - "debug" – only in debug builds (where calls to `assert` and `runInDebug`
   *   in `@ember/debug` would have run)
   * - "default"
   *
   * These respective varients (e.g. `app/services/foo/-debug.js`) are searched
   * in the order they are listed here when the relevant conditions are met.
   *
   * For example, when developing using the `ember server` under the default
   * settings, the addon will try to look for the "debug", "development" and
   * "default" varients, (`app/services/foo/-{debug,development,default}.js`),
   * in that order. That is, if both the "development" and "default" varient
   * are present, the "development" varient will be used. On the other hand, if
   * none of the candidates are found, then the "main" service file
   * (`app/services/foo.js`) is used.
   *
   * Note that the "testing" varient is not merely a synonym for the "test"
   * varient and the "debug" is likewise not synonymous with the "development".
   * While the `ember test` command runs the build it in the test environment
   * by default, it is possible to override that. For instance,
   * `ember test -e production` will run the tests in the production
   * environment.
   *
   * The default order can be changed by assigning a different value to the
   * {@link candidates} static field on the class. For example:
   *
   * ```js
   * class FooService extends Service {
   *   static candidates = ['my-varient', 'other-varient'];
   * }
   * ```
   *
   * In this example, only "my-varient" and "other-varient" will be tried. Any
   * other varients (including "default", etc) are completely ignored.
   *
   * Alternatively, the default candidates can be preserved, like so:
   *
   * ```js
   * class FooService extends SwappableService {
   *   static get candidates() {
   *     let candidates = [];
   *
   *     if (ENV.staging === true) {
   *       candidates.push('dogfood');
   *     }
   *
   *     if (window.location.search.includes('experiment-opt-in')) {
   *       candidates.push('experimental');
   *     }
   *
   *     return [candidates, ...super.candidates];
   *   }
   * }
   * ```
   */
  static candidates: string[];

  /**
   * A hook for overriding how varient classes are resolved.
   *
   * By default, the varient classes are searched/resolved by performing
   * lookups on the owner at runtime. This only work when all the available
   * varient classes/factories are registered with the container/owner.
   *
   * In more restrictive build environments this may not be possible or
   * desirable, so this hook exists to allow for overriding that behavior. This
   * can potentially make the resolution more friendly to static (build-time)
   * analysis (for example by using `importSync()` from @embroider/macros) and
   * enable removing unused varients from the build, without using the manual
   * configurations in `ember-cli-build.js`.
   *
   * @param owner – The Owner, either the application or the parent engine.
   * @param fullName – The full name of the service, e.g. `service:foo`.
   * @param candidates – The list of {@link candidates}.
   * @returns The resolved class, or `null` if none can be found.
   */
  protected static resolve<Class extends typeof Service>(
    this: Class, owner: unknown, fullName: string, candidates: string[]
  ): Class | null;

  /**
   * Whether this service class is considered abstract and is not intended to
   * be instantiated directly.
   *
   * When looking up a service, either with a `@service foo` declaration or
   * with `owner.lookup('service:foo')`, the "main" class at (the default
   * export from `app/services/foo.js`) will try to resolve and instantiate one
   * of the available varients (those at `app/services/foo/-*.js`) from the
   * list of {@link candidates}.
   *
   * By default, when no available varients can be resolved, the "main" class
   * will be instantiated, which allows the {@link Service} class to act as a
   * drop-in replacement for regular Ember services.
   *
   * This may be undesriable when using the abstract service pattern, where the
   * "main" class exists only to define the service's interface. In this case,
   * it would be unexpected for the "main" abstract class to be instantiated
   * when no varients/implementations can be found.
   *
   * Setting {@link isAbstract} to `true` would cause an error to be thrown in
   * these circumstances. As a convenience, there is a {@link AbstractService}
   * class with this value already set to `true`, which is useful in apps where
   * this is a common pattern.
   *
   * @default false
   */
  protected static isAbstract: boolean;

  /**
   * The default constructor.
   *
   * @param owner – The Owner, either the application or the parent engine.
   */
  constructor(owner: unknown);
}

/**
 * A subclass of {@link Service} with the {@link Service.isAbstract isAbstract}
 * flag set to `true`.
 */
export class AbstractService extends Service {
  protected static readonly isAbstract: true;
}
