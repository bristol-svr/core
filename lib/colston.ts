import type { ErrorLike, Server, Serve, ServerWebSocket } from 'bun';
import Router from './router';
import Context from './context';
import WebSocketContext from './websocket';
import { compose, bunRequest, formatPrefix, check, methods2String, __res, trimLastSlash } from './utils';
import type { Middleware, IServerOptions, BunRequest, IWebSocketHandler, IWebSocketData, MethodType, TErrorResponse, Handler } from './types';

export default class Colston {
  #server!: Server;
  readonly #router: Router;
  readonly #options: IServerOptions = {};
  readonly #middleware: Array<Middleware> = [];
  private readonly cache = new Map<string, any>();
  private merged: boolean = false;
  private upgrade: ((ctx?: Context) => Record<string, any>) | undefined = () => ({});

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
  public error<T extends ErrorLike, U extends TErrorResponse>(error: T): U {
    console.debug(error);
    const err = JSON.stringify(error);
    throw err;
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
   * register a websocket route
   * @param {string} path
   * @param {WebSocketHandler} handler
   * @returns this
   */
  public ws(path: string, handler: IWebSocketHandler): Colston {
    const method: MethodType = 'WS';
    this.#router.ws(method, path, handler);

    // register the upgrade function if defined
    if (handler.upgrade) this.upgrade = handler.upgrade;

    return this;
  }

  /**
   *
   * handle all incoming websocket connetions
   * @param ws websocket connection
   * @returns {WebSocketHandler} handlers
   */
  private handleWs<T extends IWebSocketData>(ws: ServerWebSocket<T>): any {
    const path = ws.data.ctx.req.path;
    const route = this.#router.find('WS', path);

    // handle 404
    if (route['callback'] == null) return;

    const handler = route.callback[0] as IWebSocketHandler<T>;
    if (handler.before != null) Promise.resolve(handler.before(ws.data.ctx, ws)).catch(Promise.reject);

    return {
      open() { handler.open != null ? Promise.resolve(handler.open(ws)) : null },
      message(msg: string | Uint8Array) { handler.message == null ? null : Promise.resolve(handler.message(ws, msg)) },
      close() { handler.close != null ? Promise.resolve(handler.close(ws)) : null },
      drain() { handler.drain != null ? Promise.resolve(handler.drain(ws)) : null },

      ping(data: Buffer) { handler.ping != null ? Promise.resolve(handler.ping(ws, data)) : null },
      pong(data: Buffer) { handler.ping != null ? Promise.resolve(handler.ping(ws, data)) : null }
    }
  }

  /**
   *
   * @description Router instance collator
   * @param {Array<Router>} routes
   * @returns {Colston} this
   */
  public all(...routes: Array<Router>): Colston {
    /**
     * unify all routes into a
     * single router instance object
     */
    this.merged = true;
    routes = [this.#router, ...routes];

    for (let i = 0; i < routes.length; i++) {
      for (let j = 0; j < routes[i].routeTable.length; j++) {
        const { method, path, cb } = routes[i].routeTable[j];

        // check, format and validate app router prefix
        const appPrefix = formatPrefix(this.#options.prefix);
        if (this.#options.prefix && appPrefix[0] !== '/') {
          throw Error('Invalid path, routes prefix must start with ' + '/');
        }

        const _path = appPrefix + path;
        this.#router.mount(method, _path, ...cb);
      }
    }

    return this;
  }

  /**
   *
   * get the current server config options
   * @returns {IServerOptions} options
   */
  public getServerOptions(): IServerOptions {
    return this.#options;
  }

  /**
   * set the current server config options
   */
  public setServerOptions(options: IServerOptions): void {
    Object.assign(this.#options, options);
  }

  /**
   *
   * @description bun HTTP server instance
   * @returns {Server}
   */
  public get server(): Server {
    return this.#server;
  }

  /**
   *
   * @description bun HTTP server instance
   * @returns bun server (serve) instance
   */
  private serve<T extends Serve<IServerOptions>>(options: T): Server {
    this.#server = Bun.serve(options);
    return this.#server;
  }

  /**
   *
   * @description bun fetch function
   * @param {Request} request bun request object
   * @returns {Response} response bun response object
   */
  private async fetch(request: Request, server: Server): Promise<Response | void> {
    try {
      // enhance request object
      const req: BunRequest = await bunRequest(request),
        context = new Context(req),
        path = this.#options.ignoreTrailingSlash
          ? trimLastSlash(req.path) : req.path;

      /**
        * enforce object type for upgrade data
        */
      if (req.headers.get('upgrade') === 'websocket' && (
        typeof this.upgrade !== 'function' ||
        Object.prototype.toString.call(this.upgrade()) !== '[object Object]'
      )) throw Error('`upgrade()` must be a function that returns an object.');

      const ctx = new WebSocketContext(context).getContext();
      const data = { ctx, ...(this.upgrade ? this.upgrade(ctx) : {}) };

      // try to upgrade server
      if (server.upgrade(request, { data })) return;

      let method = req.method;

      /**
       * compose all app-level middleware
       */
      const rs: Response | void = await compose(context, this.#middleware);
      if (rs) return rs;

      // reassign HEAD requests to a GET for same URL
      if (method.toUpperCase() == 'HEAD') method = 'GET';
      const qualifiedRoute = this.#router.find(method, path);

      // handle 404 for OPTIONS requests
      const isOptions = method.toUpperCase() == 'OPTIONS';
      if (qualifiedRoute['callback'] == null && !isOptions) {
        return __res(context);
      }

      const middleware = qualifiedRoute['callback'],
        _middleware = middleware?.slice(),
        handler = _middleware?.pop() as Handler;

      context.req.query = req.query;
      context.req.params = qualifiedRoute.params;

      // alias
      context.request.query = req.query;
      context.request.params = qualifiedRoute.params;

      // compose all route-level middleware fn
      const res: Response | void = await compose(context, _middleware);
      if (res) return res;

      // handle OPTIONS request if no handler was registered
      if (isOptions && !handler) {
        const routeInstance = this.#router.instance();
        const nodes = routeInstance.match(path);

        // handle 404 for parent route without an orphan child methods.
        if (!nodes || !check(nodes.node)) {
          return __res(context);
        }

        const o = methods2String(nodes.node);
        return __res(context, o, {
          status: 200,
          statusText: 'OK',
          headers: {
            Allow: o,
            'Content-Type': 'text/plain'
          }
        });
      }

      // execute final handler if all went well
      return handler(context);
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

    /** Bun serve function */
    const self = this;
    const defaults = ({
      port: port || self.#options?.port,
      development: self.#options?.env == 'development',
      ...self.#options,
      tls: { ...self.#options?.tls },
      websocket: {
        ...self.#options.websocket,
        open(ws: ServerWebSocket<IWebSocketData>) { self.handleWs(ws)?.open() },
        message(ws: ServerWebSocket<IWebSocketData>, msg: string | Uint8Array) { self.handleWs(ws)?.message(msg) },
        close(ws: ServerWebSocket<IWebSocketData>) { self.handleWs(ws)?.close() },
        drain(ws: ServerWebSocket<IWebSocketData>) { self.handleWs(ws)?.drain() },

        ping(ws: ServerWebSocket<IWebSocketData>, data: Buffer) { self.handleWs(ws)?.ping(data) },
        pong(ws: ServerWebSocket<IWebSocketData>, data: Buffer) { self.handleWs(ws)?.pong(data) }
      },

      // instance methods
      error: error.bind(self),
      fetch: self.fetch.bind(self)
    } as Serve<IServerOptions>);

    const svr = this.serve(defaults);
    if (typeof cb == 'function') cb(svr);
    return svr;
  }
}
