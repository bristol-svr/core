import { BunRequest, IServerOptions } from './types';
import { generateETag, NON_ERROR_RANGE } from './utils';

export default class Context {
  // index signatures
  [key: string]: any;
  req: BunRequest;
  request: BunRequest;
  #method: string;
  locals: Record<string, any> = {};
  #config: IServerOptions | undefined;
  #fresh: boolean = true;

  // colston response options
  private options: ResponseInit | Record<string, any> = {};

  constructor(request: BunRequest, config?: IServerOptions) {
    this.req = request;
    this.request = request;
    this.#config = config;
    this.options.headers = new Headers();
    this.#method = request.method;
  }

  /**
   *
   * @description status text setter method
   * @param {string} text
   * @returns
   */
  statusText(text: string): Context {
    this.#fresh = false;
    this.options.statusText = text;
    return this;
  }

  /**
   *
   * @description status setter method
   * @param {number} code
   * @returns
   */
  public status(code: number): Context {
    this.#fresh = false;
    this.options.status = code;
    return this;
  }

  /**
   * @description add options
   * @param option ResponseInit
   * @returns this
   */
  public option(options: ResponseInit = {}): Context {
    this.#fresh = false;
    this.options = { ...this.options, ...options };
    return this;
  }

  /**
   * @description headers objects
   * @returns {HeadersInit | Record<string, string>} headers
   */
  public get headers(): HeadersInit | Record<string, string> {
    return this.options.headers || {};
  }

  /**
   * @description header
   * @param option ResponseInit
   * @returns this
   */
  public get header() {
    return {
      set: (key: string, value: string): void => { this.setHeader(key, value); },
      get: (key: string): string => this.options.headers[key],
      append: (key: string, value: string): void => {
        if (!key || !value)
          throw new Error('Headers key or value should not be empty');

        if (!(typeof key == 'string' || typeof value == 'string')) {
          try {
            key = JSON.stringify(key);
            value = JSON.stringify(value);
          } catch (err) {
            throw err;
          }
        }

        const header = this.options.headers;
        if (header[key]) this.options.headers[key] + value;
        // TODO should we create the key if it doesn't exist?
        // else {
        //   this.setHeader(key, value);
        // }
      }
    }
  }

  /**
   * header
   * ctx.headers['date']
   * ctx.headers.get('date')
   */
  setHeader(key: string, value: string): Context {
    this.#fresh = false;
    if (!key || !value) {
      throw new Error('Headers key or value should not be empty');
    }

    const headers = this.options.headers;
    if (!headers) {
      this.options.headers = { [key]: value };
    }

    this.options.headers[key] = value;
    return this;
  }

  /**
   *
   * @warning method might behave unexpectedly
   * @param raw
   * @returns {Response} raw
   */
  public raw(raw: any, options: ResponseInit = {}): Response {
    return this.response(raw, { headers: { 'Content-Type': '' }, ...options });
  }

  /**
   *
   * @description head method
   * @param options ResponseInit
   * @returns
   */
  public head(options: ResponseInit = {}): Response {
    return this.response('', { headers: { 'Content-Type': 'application/json' }, ...options });
  }

  /**
   * 
   * @param {string | any } body
   * @param {ResponseInit} option 
   */
  public send(body: string, option: ResponseInit): Response;
  public send(body: any, options: ResponseInit = {}): Response {
    return this.response(body, { headers: { 'Content-Type': 'text/html' }, ...options })
  }

  /**
   * @description json method
   * @param {object | any} body
   * @returns void
   */
  public json(body: object, option?: ResponseInit): Response;
  public json(body: any, options: ResponseInit = {}): Response {
    return this.response(body, { headers: { 'Content-Type': 'application/json' }, ...options })
  }

  /**
   * @description text method
   * @param {string} text
   * @param options
   * @returns Response
   */
  public text(text: string, options: ResponseInit = {}): Response {
    return this.response(text, { headers: { 'Content-Type': 'text/plain' }, ...options })
  }

  /**
   * @description render an html/string to a view
   * @param {string} view
   * @param options
   */
  public render(view: string, options: ResponseInit = {}): Response | never {
    if (typeof view == 'string') {
      return this.response(view, Object.assign(this.option, {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }, options));
    }

    try {
      return this.response(JSON.stringify(view), {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      });
    } catch (e) {
      throw Error(e as any);
    }
  }

  /**
   * @description response handler
   * @param {*} o
   * @param option ResponseInit
   * @returns this
   */
  public response(o: any, options: ResponseInit = {}): Response {
    if (typeof o == 'object') o = JSON.stringify(o);
    options = {
      status: 200,
      statusText: 'OK',
      ...options,
      ...this.options,
      headers: {
        'Content-Length': String(Buffer.from(JSON.stringify(o)).length),
        'X-Powered-By': 'Colstonjs',
        ...options.headers,
        ...this.options.headers
      }
    }

    if (this.#config?.eTag && options.status && (options.status <= NON_ERROR_RANGE)) {
      // @ts-ignore
      options.headers.ETag = generateETag(typeof o == 'string' ? o : JSON.stringify(o), 'utf8');
    }

    // reset headers
    if (!this.#fresh) { this.options = {}; this.#fresh = true; }
    if (this.#method.toUpperCase() == 'HEAD') o = '';

    return new Response(o, { ...options });
  }
}
