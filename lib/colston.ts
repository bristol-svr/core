import type { ErrorLike, Server, Serve } from 'bun';
import Router from './router';
import Context from './context';
import { compose, bunRequest, formatPrefix, check, methods2String, response, trimLastSlash } from './utils';
import type { Middleware, IServerOptions, BunRequest } from './types';

export default class Colston {
  readonly #router: Router;
  readonly #options: IServerOptions = {};
  readonly #middleware: Array<Middleware> = [];
  private readonly cache = new Map<string, any>();
  private merged: boolean = false;

  /**
   *
   * @description overloaded constructor
   * @param {object} options
   */
  constructor(options: IServerOptions = {}) {
    this.#options = options;
    this.#router = new Router();
  }

  /**
   *
   * @description internal error handler
   * @param error
   * @returns response
   */
  public error<T extends ErrorLike = ErrorLike>(error: T | Error): Response | undefined | never | Promise<Response | undefined | never> {
    console.debug(error);
    const err = JSON.stringify(error);
    throw Error(err);
  }

  /**
   *
   * @param key
   * @param value
   */
  public set(key: string, value: any): void {
    this.cache.set(key, value);
  }

  /**
   *
   * @param {string} key
   * @return {boolean} true | false
   */
  public has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   *
   * @description HTTP GET method
   * @param {string} key
   * @returns {(number | string | Colston )}
   */
  public get(key: string): number;
  public get(key: string): string;
  public get(key: string): undefined;
  public get(path: string, ...cb: Array<Middleware>): Colston;
  public get(path: string, ...cb: Array<Middleware>): any {
    if (!cb.length) {
      return this.cache.get(path);
    }

    this.#router.get(path, ...cb);
    return this;
  }

  /**
   *
   * @description HTTP POST method
   * @param {string} path
   * @param {Array<Mi>} cb
   * @returns {Colston} this
   */
  public post(path: string, ...cb: Array<Middleware>): Colston {
    this.#router.post(path, ...cb);
    return this;
  }

  /**
   *
   * @description HTTP PATCH method
   * @param {string} path
   * @param {Array<Mi>} cb
   * @returns {Colston}
   */
  public patch(path: string, ...cb: Array<Middleware>): Colston {
    this.#router.patch(path, ...cb);
    return this;
  }

  /**
   *
   * @description HTTP PUT method
   * @param {string} path
   * @param {Array<Mi>} cb
   * @returns {Colston} this
   */
  public put(path: string, ...cb: Array<Middleware>): Colston {
    this.#router.put(path, ...cb);
    return this;
  }

  /**
   *
   * @description HTTP TRACE method
   * @param {string} path
   * @param {Array<Mi>} cb
   * @returns {Colston} this
   */
  public trace(path: string, ...cb: Array<Middleware>): Colston {
    this.#router.trace(path, ...cb);
    return this;
  }

  /**
   *
   * @description HTTP OPTIONS method
   * @param {string} path
   * @param {Array<Middleware>} cb
   * @returns {Colston} this
   */
  public options(path: string, ...cb: Array<Middleware>): Colston {
    this.#router.options(path, ...cb);
    return this
  }

  /**
   *
   * @description HTTP CONNECT method
   * @param {string} path
   * @param {Array<Middleware>} cb
   * @returns {Colston} this
   */
  public connect(path: string, ...cb: Array<Middleware>): Colston {
    this.#router.connect(path, ...cb);
    return this;
  }

  /**
   *
   * @description HTTP DELETE method
   * @param {string} path
   * @param {Array<Mi>} cb
   * @returns {Colston} this
   */
  public delete(path: string, ...cb: Array<Middleware>): Colston {
    this.#router.delete(path, ...cb);
    return this;
  }

  /**
   *
   * @description add level middlewares
   * @param {Array<Function>} cb
   */
  public use(...cb: Array<Middleware>): void {
    this.#middleware.push(...cb);
  }

  /**
   *
   * @description Router instance collator
   * @param {Array<Router>} routes
   * @returns {Colston} this
   */
  public all(...routes: Array<Router>): Colston {
    /**
     * unify all routes into a single
     * router instance
     */
    this.merged = true;
    routes = [this.#router, ...routes];

    for (let i = 0; i < routes.length; i++) {
      for (let j = 0; j < routes[i].routeTable.length; j++) {
        const { method, path, cb } = routes[i].routeTable[j];

        // check, format and validate app router prefix
        const appPrefix = formatPrefix(this.#options.prefix);
        if (this.#options.prefix && appPrefix[0] !== '/')
          throw new Error('Invalid path, routes prefix must start with ' + '/');

        const _path = appPrefix + path;
        const opts = { ...this.#options, ...routes[i].getOptions() };

        let __path = _path;
        if (opts.ignoreTrailingSlash) __path = trimLastSlash(__path);
        this.#router.mount(method, __path, ...cb);
        // console.log(__path, opts.ignoreTrailingSlash);
      }
    }

    return this;
  }

  /**
   *
   * @description bun fetch function
   * @param {Request} request bun request object
   * @returns {Response} response bun response object
   */
  private async fetch(request: Request): Promise<Response | void> {
    try {
      const req: BunRequest = await bunRequest(request);
      const context = new Context(req, this.#options);

      const path = req.path;
      let method = req.method;

      // reassign HEAD requests to a GET for same URL
      if (method.toUpperCase() == 'HEAD') method = 'GET';
      const qualifiedRoute = this.#router.find(method, path);

      // handle 404 for OPTIONS requests
      const isOptions = method.toUpperCase() == 'OPTIONS';
      if (qualifiedRoute['callback'] == null && !isOptions) {
        return response(context);
      }

      const middleware = qualifiedRoute['callback'];
      const _middleware = middleware?.slice();
      const handler = _middleware?.pop() as Function;

      context.req.query = req.query;
      context.req.params = qualifiedRoute.params;

      // alias
      context.request.query = req.query;
      context.request.params = qualifiedRoute.params;

      /**
       * compose all app-level middleware
       */
      const rs: Response | void = await compose(context, this.#middleware);
      if (rs) return rs;

      // compose all route-level middleware fn
      const res: Response | void = await compose(context, _middleware);
      if (res) return res;

      // handle OPTIONS request if no handler was registered
      if (isOptions && !handler) {
        const routeInstance = this.#router.instance();
        const nodes = routeInstance.match(req.path);

        // handle 404 for parent route without an orphan child methods.
        if (!nodes || !check(nodes.node)) {
          return response(context);
        }

        const o = methods2String(nodes.node);
        const _opts = {
          status: 200,
          statusText: 'OK',
          headers: {
            Allow: o,
            'Content-Type': 'text/plain'
          }
        }

        return response(context, o, _opts);
      }

      // execute final handler if all went well
      return handler(context) as Response;
    } catch (e: unknown) {
      this.error(e as ErrorLike);
    }
  }

  /**
   *
   * @deprecated this method is deprecated use '.listen()' instead
   * @description bun http server entry function
   * @returns bun server (serve) instance
   */
  public start<T extends number | Function>(port?: T, cb?: Function): Server {
    return this.listen(port, cb);
  }

  /**
   *
   * @description bun http server entry function
   * @returns bun server (serve) instance
   */
  public listen<T extends number | Function>(port?: T, cb?: Function): Server {
    if (!this.merged) this.all();

    const error = this.#options?.error || this.error;
    if (typeof port == 'function') { cb = port; port = undefined }
    if (typeof cb == 'function') cb();

    /** Bun serve function */
    const self = this;
    return Bun.serve({
      unix: self.#options?.unix || '',
      port: port || self.#options?.port,
      development: self.#options?.env == 'development',
      lowMemoryMode: self.#options?.lowMemoryMode,
      hostname: self.#options?.hostname,
      tls: self.#options?.tls,
      keyFile: self.#options?.keyFile,
      certFile: self.#options?.certFile,
      passphrase: self.#options?.passphrase,
      caFile: self.#options?.caFile,
      dhParamsFile: self.#options?.dhParamsFile,

      // instance methods
      error: error.bind(self),
      fetch: self.fetch.bind(self)
    } as Serve);
  }
}
