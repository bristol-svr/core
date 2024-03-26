import { Errorlike, Server, Serve, ErrorLike, Hash, ServerWebSocket, WebSocketCompressor, TLSServeOptions, WebSocketHandler } from 'bun';
import Context from './context'
import WebSocketContext from './websocket';

declare global {
	interface ResponseInit {
		headers?: Record<string, string>
	}
	interface Headers {
		origin: string | Function | RegExp;
	}
	interface Request {
		query: Record<string, any>;
		params: Record<string, string> | Array<{ [key: string]: string }>;
		verb: string;
		[key: string]: any;
	};
	interface Response {
		[key: string]: any
	}
}
interface ResponseInit {
	headers?: Record<string, string>
}

export type BasicCredentials = {
	username: string;
	password: string;
};

export type TErrorResponse = Response | never | undefined | Promise<Response | never | undefined>;
export interface IServerOptions {
	env?: 'development' | 'production';
	port?: number;
	hostname?: string;
	unix?: string;
	/**
	 * This sets `OPENSSL_RELEASE_BUFFERS` to 1.
	 * It reduces overall performance but saves some memory.
	 * @default false
	 */
	lowMemoryMode?: boolean;
	prefix?: string;
	ignoreTrailingSlash?: boolean;
	eTag?: boolean;
	reusePort?: boolean;
	maxRequestBodySize?: number;
	error?<T extends ErrorLike, U extends TErrorResponse>(error: T): U;
	fetch?(request: Request, server?: Server): Server,
	websocket?: {
		// message: (ws: ServerWebSocket, message: string | ArrayBuffer | Uint8Array) => IWebSocketResponse;
		// open?: (ws: ServerWebSocket) => IWebSocketResponse;
		// close?: (ws: ServerWebSocket) => IWebSocketResponse;
		// error?: (ws: ServerWebSocket, error: Error) => IWebSocketResponse;
		// drain?: (ws: ServerWebSocket) => IWebSocketResponse;
		// ping?(data: Buffer): IWebSocketResponse;
		// pong?(data: Buffer): IWebSocketResponse;

		maxPayloadLength?: number; // default: 16 * 1024 * 1024 = 16 MB
		idleTimeout?: number; // default: 120 (seconds)
		backpressureLimit?: number; // default: 1024 * 1024 = 1 MB
		closeOnBackpressureLimit?: boolean; // default: false
		sendPings?: boolean; // default: true
		publishToSelf?: boolean; // default: false

		perMessageDeflate?: | boolean | {
			compress?: boolean | WebSocketCompressor;
			decompress?: boolean | WebSocketCompressor;
		};
	};

	tls?: {
		keyFile?: string;
		certFile?: string;
		passphrase?: string;
		caFile?: string;
		dhParamsFile?: string;
	}
};

export type ETBgodyType = WithImplicitCoercion<string> | { [Symbol.toPrimitive](hint: "string"): string; }
type WithImplicitCoercion<T> =
	| T
	| {
		valueOf(): T;
	};

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
	| 'TRACE'
	| 'WS';

export type BunRequest<T = any> = {
	[key: string]: any;
	method: string;
	path: string;
	headers: Headers & { [key: string]: any };
	params: { [key: string]: any };
	query: { [key: string]: any };
	body: T;
	originalUrl: string;
	hostname: string;
	host: string;

	bodyUsed: boolean;
	cache: RequestCache;
	credentials: RequestCredentials;
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

	arrayBuffer(): Promise<ArrayBuffer>;
	blob(): Promise<Blob>;
	clone(): Request;
	formData(): Promise<FormData>;
	json(): Promise<any>;
	text(): Promise<string>;
}

export interface IWebSocketData { [key: string]: any; ctx: Context }
export type IWebSocketResponse = Promise<number | void> | number | void
// export interface IWebSocketHandler<T extends IWebSocketData> extends WebSocketHandler {
// export interface IWebSocketHandler<T extends IWebSocketData> extends WebSocketHandler {
// 	open?(ws: ServerWebSocket<T>): IWebSocketResponse | void;
// 	close?(ws: ServerWebSocket<T>): IWebSocketResponse;
// 	message?(ws: ServerWebSocket<T>, msg: string | Uint8Array): IWebSocketResponse;
// 	drain?(ws: ServerWebSocket<T>): IWebSocketResponse;
// 	ping?(ws: ServerWebSocket<T>, data: Buffer): IWebSocketResponse;
// 	pong?(ws: ServerWebSocket<T>, data: Buffer): IWebSocketResponse;
// 	/**
// 	 * Runs as middleware before the connection upgrade
// 	 *
// 	 * @param ctx The Context from the route handler
// 	 * @returns The final Context object before the upgrade
// 	 */
// 	// upgrade?(ctx: WebSocketContext): Promise<WebSocketContext> | WebSocketContext;
// 	before?(ctx: Context, ws?: ServerWebSocket<T>): Promise<Context | undefined> | Context | undefined;
// }

export interface IWebSocketHandler<T = any> {
	open?(ws: ServerWebSocket<T>): IWebSocketResponse;
	close?(ws: ServerWebSocket<T>): IWebSocketResponse;
	message?(ws: ServerWebSocket<T>, msg: string | Uint8Array): IWebSocketResponse;
	drain?(ws: ServerWebSocket<T>): IWebSocketResponse;
	ping?(ws: ServerWebSocket<T>, data: Buffer): IWebSocketResponse;
	pong?(ws: ServerWebSocket<T>, data: Buffer): IWebSocketResponse;
	/**
	 * Runs as middleware before the connection upgrade
	 *
	 * @param ctx The Context from the route handler
	 * @returns The final Context object before the upgrade
	 */
	// upgrade?(ctx: WebSocketContext): Promise<WebSocketContext> | WebSocketContext;
	before?(ctx: Context, ws?: ServerWebSocket<T>): Promise<Context | undefined> | Context | undefined;
	upgrade?(ctx?: Context): Record<string, any>;
}

export interface IRouterOptions { prefix?: string }
export type methods = Array<MethodType>;
export type compose = (context: Context, middlewares?: Array<Middleware>) => Promise<void>;
export type Route = { callback: Array<Middleware> | null; params: { [key: string]: string } }
export type Middleware<T = any> = (context: T, next: Next) => Response | void | Promise<Response | void>;
export type Next = <T = ErrorLike>(error?: T) => Promise<void> | void;
export type Handler = (context: Context) => Response | void | Promise<Response | void>;