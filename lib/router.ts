// @ts-ignore
import routington from 'routington';
import { METHODS, NOT_FOUND, formatPrefix } from './utils';
import { MethodType, Middleware, Route, TRouterOptions } from './types';

export default class Router {
  #options: TRouterOptions = {};
  readonly #trie: Record<string, any> = {};
  readonly #callbacks: Array<Middleware> = [];
  readonly routeTable: Array<{ method: MethodType, path: string, cb: Array<Middleware> }> = []

  constructor(options?: TRouterOptions) {
    if (!(this instanceof Router)) {
      return new Router(options);
    }

    this.#callbacks = [];
    this.#trie = routington();
    this.#options = { ...options };
  }

  /**
   *
   * @description register HTTP GET method
   * @param path
   * @returns {Router} this
   */
  public get(path: string, ...cb: Array<Middleware>): Router {
    this.register('GET', path, ...cb);
    return this;
  }

  /**
   *
   * @description register HTTP POST method
   * @param path
   * @param cb
   * @returns {this} Router
   */
  public post(path: string, ...cb: Array<Middleware>): Router {
    this.register('POST', path, ...cb);
    return this;
  }

  /**
   *
   * @description register HTTP PATCH method
   * @param path
   * @param cb
   * @returns {this} Router
   */
  public patch(path: string, ...cb: Array<Middleware>): Router {
    this.register('PATCH', path, ...cb);
    return this;
  }

  /**
   *
   * @description register HTTP PUT method
   * @param path
   * @param cb
   * @returns {this} Router
   */
  public put(path: string, ...cb: Array<Middleware>): Router {
    this.register('PUT', path, ...cb);
    return this;
  }

  /**
   *
   * @description register HTTP TRACE method
   * @param path
   * @param cb
   * @returns {Router} this
   */
  public trace(path: string, ...cb: Array<Middleware>): Router {
    this.register('TRACE', path, ...cb);
    return this;
  }

  /**
   *
   * @description register HTTP OPTIONS method
   * @param path
   * @param cb
   * @returns {Router} this
   */
  public options(path: string, ...cb: Array<Middleware>): Router {
    this.register('OPTIONS', path, ...cb);
    return this;
  }

  /**
   *
   * @description register HTTP CONNECT method
   * @param path
   * @param cb
   * @returns {ROuter} this
   */
  public connect(path: string, ...cb: Array<Middleware>): Router {
    this.register('CONNECT', path, ...cb);
    return this;
  }

  /**
   *
   * @description register HTTP DELETE method
   * @param path
   * @param cb
   * @returns {this} Router
   */
  public delete(path: string, ...cb: Array<Middleware>): Router {
    this.register('DELETE', path, ...cb);
    return this;
  }

  /**
   * match registered route with a given path
   * @param method
   * @param path
   * @returns {Route} route
   */
  public find(method: string, path: string): Route {
    const match = this.#trie.match(path);
    if (match) {
      const node = match.node;
      const cb = node[method];

      return {
        params: match.param,
        callback: cb
      }
    }

    // 404
    return NOT_FOUND;
  }


  /**
   *
   * @param {string} method
   * @param {string} path
   * @param {Array<Middleware>} cb
   * @returns {Router} Router
   */
  public register(method: MethodType, path: string, ...cb: Array<Middleware>): Router {
    if (path[0] !== '/') throw new Error('Invalid path, route path must start with ' + '/');
    if (!cb.length) throw new Error('Invalid route ' + path + ', at least one middleware function is required');
    if (METHODS.indexOf(method) === -1) throw new Error('Invalid HTTP method, Accepted methods are: ' + METHODS.join(' '));



    // check if there is a route prefix
    const prefix = formatPrefix(this.#options.prefix);
    if (prefix && prefix[0] !== '/') throw new Error('Invalid path, routes prefix must start with ' + '/');
    else {
      path = prefix + path;
    }

    cb.unshift(...this.#callbacks);
    this.routeTable.push({ method, path, cb });
    return this;
  }

  /**
   *
   * @param {string} method
   * @param {string} path
   * @param {Array<Router>} cb
   * @returns {Router} Router
   */
  public mount(method: MethodType, path: string, ...cb: Array<Middleware>): Router {
    /**
     * define path in the trie
     */
    const node = this.#trie.define(path)[0];

    // attach method and middleware to node
    node[method] = node[method] || [];
    node[method].push(...cb);

    return this;
  }

  /**
   * returns trie node object
   * @returns {*} trie
   */
  public instance(): any {
    return this.#trie;
  }

  /**
   * set router instance options
   * @param {void} options
   */
  public setOptions(options: TRouterOptions): void {
    this.#options = { ...this.#options, ...options };
  }

  /**
   * get router instance options
   * @returns {TRouterOptions} options
   */
  public getOptions(): TRouterOptions {
    return this.#options;
  }
}
