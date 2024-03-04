import { Errorlike, Server, Serve, ErrorLike, Hash } from "bun"
import Context from './context'

declare global {
    interface ResponseInit {
        headers?: Record<string, string>
    }
    interface Headers {
        // [key: string]: string;
        origin: string | Function | RegExp;
    }
    interface Request {
        query: Record<string, any>;
        params: Record<string, string> | Array<{ [key: string]: string }>;
        // body: object | string | any;
        verb: string;
        // headers: Headers & { origin: string | Function | RegExp } & Record<string, any>;
        [key: string]: any;
    };
    // interface HeadersInit {
    //     ETag?: string | undefined
    // }
    interface Response {
        [key: string]: any
    }
    // interface routington {}
}
interface ResponseInit {
    headers?: Record<string, string>
}

export type BasicCredentials = {
    username: string;
    password: string;
};

export type TError = (error: ErrorLike | Error) => Response | null | never | Promise<Response | null | never>;
export declare interface IServerOptions {
    env?: 'development' | 'production';
    port?: number;
    hostname?: string;
    unix?: string;
    prefix?: string;
    ignoreTrailingSlash?: boolean;
    eTag?: boolean;
    prefix?: string;
    maxRequestBodySize?: number;
    error?: TError;
    /**
     * This sets `OPENSSL_RELEASE_BUFFERS` to 1.
     * It reduces overall performance but saves some memory.
     * @default false
     */
    lowMemoryMode?: boolean;
    keyFile?: string;
    certFile?: string;
    passphrase?: string;
    caFile?: string;
    dhParamsFile?: string;

    tls?: {
        key?: TLSKey;
        cert?: TLSCert;
        ca?: TLSCa;
        passphrase?: TLSPassphrase;
        dhParamsFile?: TLSDhParamsFile;
    };
};

export type ETBgodyType = WithImplicitCoercion<string> | { [Symbol.toPrimitive](hint: "string"): string; }
type WithImplicitCoercion<T> =
    | T
    | {
        valueOf(): T;
    };
export type BufferEncoding =
    | "ascii"
    | "utf8"
    | "utf-8"
    | "utf16le"
    | "utf-16le"
    | "ucs2"
    | "ucs-2"
    | "base64"
    | "base64url"
    | "latin1"
    | "binary"
    | "hex";

export type TLSCert =
    | string
    | TypedArray
    | BunFile
    | Array<string | TypedArray | BunFile>;

export type TLSCa =
    | string
    | TypedArray
    | BunFile
    | Array<string | TypedArray | BunFile>;

export type TLSKey =
    | string
    | TypedArray
    | BunFile
    | Array<string | TypedArray | BunFile>;

export type TLSPassphrase = string;
export type TLSDhParamsFile = string;
export type ETagOptions = { weak: boolean };

export type MethodType =
    | 'GET'
    | 'HEAD'
    | 'POST'
    | 'PUT'
    | 'PATCH'
    | 'DELETE'
    | 'CONNECT'
    | 'OPTIONS'
    | 'TRACE';

export type BunRequest<T = any> = {
    method: string;
    path: string;
    headers: Headers & { [key: string]: any };
    params: { [key: string]: any };
    query: { [key: string]: any };
    body: T;
    originalUrl: string;
    hostname: string;
    host: string;
    [key: string]: any;

    bodyUsed: boolean;
    cache: RequestCache;
    credential: RequestCredentials;
    destination: RequestDestination;
    integrity: string;
    keepalive: boolean;
    mode: RequestMode;
    redirect: RequestRedirect;
    url: string;
    referrer: string;
    verb: string;
    referrerPolicy: ReferrerPolicy;
    signal: AbortSignal;

    origin: string;
    href: string;
    protocol: string;
    host: string;

    arrayBuffer(): Promise<ArrayBuffer>;
    blob(): Promise<Blob>;
    clone(): Request;
    formdata(): Promise<FormData>;
    json(): Promise<any>;
    text(): Promise<string>;
}

export type TRouterOptions = {
    prefix?: string;
    ignoreTrailingSlash?: boolean;
}

export type methods = Array<MethodType>;
export type compose = (context: Context, middlewares?: Array<Middleware>) => Promise<void>;
export type Route = { callback: Array<Middleware> | null; params: { [key: string]: string } }
export declare type Middleware = (context: Context, next: Next) => Response | void | Promise<Response | void>;
export declare type Next = <T = ErrorLike>(error?: T) => Promise<void> | void;
export declare class Router {
    #private;
    readonly trees: Record<string, Node>;
    readonly callbacks: Array<Middleware>;
    readonly routeTable: Array<{
        method: MethodType;
        path: string;
        cb: Array<Middleware>;
    }>;
    constructor(options?: TRouterOptions);
    /**
     *
     * @description register HTTP GET method
     * @param path
     * @returns {Router} this
     */
    get(path: string, ...cb: Array<Middleware>): Router;
    /**
     *
     * @description register HTTP POST method
     * @param path
     * @param cb
     * @returns {this} Router
     */
    post(path: string, ...cb: Array<Middleware>): Router;
    /**
     *
     * @description register HTTP PATCH method
     * @param path
     * @param cb
     * @returns {this} Router
     */
    patch(path: string, ...cb: Array<Middleware>): Router;
    /**
     *
     * @description register HTTP PUT method
     * @param path
     * @param cb
     * @returns {this} Router
     */
    put(path: string, ...cb: Array<Middleware>): Router;
    /**
     *
     * @description register HTTP TRACE method
     * @param path
     * @param cb
     * @returns {Router} this
     */
    trace(path: string, ...cb: Array<Middleware>): Router;
    /**
     *
     * @description register HTTP OPTIONS method
     * @param path
     * @param cb
     * @returns {Router} this
     */
    options(path: string, ...cb: Array<Middleware>): Router;
    /**
     *
     * @description register HTTP CONNECT method
     * @param path
     * @param cb
     * @returns {ROuter} this
     */
    connect(path: string, ...cb: Array<Middleware>): Router;
    /**
     *
     * @description register HTTP DELETE method
     * @param path
     * @param cb
     * @returns {this} Router
     */
    delete(path: string, ...cb: Array<Middleware>): Router;
    /**
     *
     * @param method
     * @param path
     * @returns {Route} route
     */
    find(method: string, path: string): Route;
    register(method: MethodType, path: string, ...cb: Array<Middleware>): Router;
}

export type normalize = (list: Array<{ [key: string]: string }>) => { [key: string]: string };
export default class Colston {
    #private;
    readonly routeTable: Router;
    readonly middleware: Array<Function>;
    private readonly cache;
    /**
     *
     * @description overloaded constructor
     * @param {object} options
     */
    constructor(options?: IServerOptions);
    /**
     *
     * @description internal error handler
     * @param error
     * @returns response
     */
    // error(error: Errorlike): Response | never | null | Promise<Response | undefined | null>;
    public error<T extends TError>(cb?: ErrorCallback<T, Response | never | undefined>): ErrorCallback<T, Response | never | undefined>;
    /**
     *
     * @param key
     * @param value
     */
    set(key: string, value: any): void;
    /**
     *
     * @param {string} key
     * @return {boolean} true | false
     */
    has(key: string): boolean;
    /**
     * @description HTTP GET method
     * @param {string} key
     * @returns {(number | string | Colston )}
     */
    get(key: string): number;
    get(key: string): string;
    get(path: string, ...cb: Array<Middleware>): Colston;
    /**
     *
     * @description HTTP POST method
     * @param {string} path
     * @param {Array<Functions>} cb
     * @returns {Colston} this
     */
    post(path: string, ...cb: Array<Middleware>): Colston;
    /**
     *
     * @description HTTP PATCH method
     * @param {string} path
     * @param {Array<Functions>} cb
     * @returns {Colston}
     */
    patch(path: string, ...cb: Array<Middleware>): Colston;
    /**
     * @description HTTP PUT method
     * @param {string} path
     * @param {Array<Functions>} cb
     * @returns {Colston} this
     */
    put(path: string, ...cb: Array<Middleware>): Colston;
    /**
     * @description HTTP TRACE method
     * @param {string} path
     * @param {Array<Functions>} cb
     * @returns {Colston} this
     */
    trace(path: string, ...cb: Array<Middleware>): Colston;
    /**
     *
     * @description HTTP OPTIONS method
     * @param {string} path
     * @param {Array<Functions>} cb
     * @returns {Colston} this
     */
    option(path: string, ...cb: Array<Middleware>): Colston;
    /**
     *
     * @description HTTP CONNECT method
     * @param {string} path
     * @param {Array<Functions>} cb
     * @returns {Colston} this
     */
    connect(path: string, ...cb: Array<Middleware>): Colston;
    /**
     *
     * @description HTTP DELETE method
     * @param {string} path
     * @param {Array<Functions>} cb
     * @returns {Colston} this
     */
    delete(path: string, ...cb: Array<Middleware>): Colston;
    /**
     * @description add level middlewares
     * @param {Array<Function>} cb
     */
    use(...cb: Array<Middleware>): void;
    /**
     *
     * @description Router instance collator
     * @param {Array<Router>} routes
     * @returns {Colston} this
     */
    all(path?: string, ...routes: Array<Router>): Colston;
    /**
     *
     * @description bun fetch function
     * @param {Request} request bun request object
     * @returns {Response} response bun response object
     */
    private fetch;
    /**
     * @deprecated this method is deprecated use '.listen' instead
     * @description bun http server entry function
     * @returns bun server (serve) instance
     */
    start(port?: number, cb?: Function): Server;
    /**
     * @description bun http server entry function
     * @returns bun server (serve) instance
     */
    listen(port?: number, cb?: Function): Server;
}
