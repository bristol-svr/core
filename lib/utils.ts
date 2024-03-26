import { MethodType, BunRequest, ETagOptions, ETBgodyType } from './types';
import type { Middleware, Route } from './types';
import Context from './context';
import { ErrorLike } from 'bun';
import etag from 'etag'

export const NON_ERROR_RANGE = 399;
export const METHODS: Array<MethodType> =
  [
    'GET',
    'HEAD',
    'POST',
    'PUT',
    'DELETE',
    'CONNECT',
    'OPTIONS',
    'TRACE',
    'PATCH',
    // special method
    'WS'
  ];

export const NOT_FOUND: Route = { callback: null, params: {} };
export function trimLastSlash(path: string): string {
  const _path = path;
  if (_path.length > 1 && _path.charCodeAt(_path.length - 1) === 47) {
    return _path.slice(0, -1);
  }
  return path;
}

export function normalize(list: Array<{ [key: string]: string }>) {
  const result: { [key: string]: string } = {};
  for (let i = 0; i < list.length; i++) {
    const key = list[i].key;
    result[key] = list[i].value;
  }

  return result;
}

export async function compose(
  context: Context,
  middlewares: Array<Middleware> = []
): Promise<Response | void> {
  return new Promise(function (resolve, reject) {
    let res: any = null, prevIndex: number = -1;
    async function dispatch(index: number) {
      /**
       * check if `next` was call more than
       * once in the same middleware function
       */
      if (index == prevIndex) return reject('next() function called multiple times');
      prevIndex = index;
      if (index < middlewares.length) {
        let nextCalled = false;

        const middleware = middlewares[index];
        const next = async <T = ErrorLike>(err?: T) => {
          if (err) reject(err);

          nextCalled = true;
          dispatch(index + 1);
        };

        res = await middleware(context, next);
        if (res) return res; else if (!nextCalled) return null;
      } else {
        return null;
      }
    }

    let index = 0;
    resolve(dispatch(index));
  });
}

export async function bunRequest(
  req: Request
): Promise<BunRequest> {
  const {
    host,
    origin,
    href,
    protocol,
    port,
    hostname,
    search,
    pathname,
    hash,
    password,
    username,
    searchParams
  } = new URL(req.url);

  const _req: BunRequest = {
    method: req.method,
    path: pathname,
    query: {},
    params: {},
    headers: new Headers(req.headers),
    originalUrl: req.url,
    hostname: hostname,
    body: req.body,
    host: host,

    arrayBuffer: req.arrayBuffer,
    blob: req.blob,
    bodyUsed: req.bodyUsed,
    cache: req.cache,
    clone: req.clone,
    credentials: req.credentials,
    destination: req.destination,
    formData: req.formData,
    integrity: req.integrity,
    json: req.json,
    keepalive: req.keepalive,
    mode: req.mode,
    redirect: req.redirect,
    referrer: req.referrer,
    referrerPolicy: req.referrerPolicy,
    signal: req.signal,
    text: req.text,
    url: req.url,
    verb: req.verb,

    origin: origin,
    href: href,
    protocol: protocol,
    username: username,
    password: password,
    port: port,
    pathname: pathname,
    search: search,
    searchParams: searchParams,
    hash: hash,
  }

  // append query params
  searchParams.forEach((v, k) => {
    _req.query[k] = v;
  })

  // receive request body as string
  const bodyStr = await req.text();
  _req.text = () => Promise.resolve(bodyStr);

  try {
    _req.body = JSON.parse(bodyStr);
    _req.json = () => Promise.resolve(_req.body);
  } catch (err) {
    _req.body = bodyStr;
  }

  _req.clone = () => req.clone();
  Object.keys(_req).forEach(v => {
    if (['blob', 'arrayBuffer', 'formData'].includes(v)) {
      _req[v] = async () => _req.clone()[v]();
    }
  })

  // append headers
  req.headers.forEach((v, k) => {
    _req.headers[k] = v;
  });

  return _req;
}

export function generateETag(
  body: ETBgodyType,
  encoding: BufferEncoding,
  options: ETagOptions = { weak: true }
) {
  var buf = !Buffer.isBuffer(body)
    ? Buffer.from(body, encoding) : body;

  return etag(buf, options);
}

export function formatPrefix(prefix: string | undefined): string {
  return prefix && prefix.endsWith('/') ? prefix.slice(0, -1) : prefix || '';
}

export function __res(ctx: Context, o?: any, options?: ResponseInit): Response {
  let status = 404;
  let statusText = 'Not Found';
  o = o || `Cannot ${ctx.req.method} ${ctx.req.path}`;
  return ctx.response(o, {
    status,
    statusText,
    ...options,
    headers: {
      'Content-Type': 'text/plain',
      ...options?.headers
    }
  });
}

export function check(o: object): boolean {
  return METHODS.some(v => {
    return (
      Object.keys(o).includes(v)
    )
  });
}

export function methods2String(node: object): string {
  const _methods = (Object.keys(node) as MethodType[])
    .filter((v): v is MethodType =>
      METHODS.includes(v.toUpperCase() as MethodType));

  return _methods.includes('GET') ?
    [..._methods, 'HEAD'].sort().join(',') : _methods.join(',');
}

// export function removeUndefined(obj: Record<string, any>) {
//   return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v != undefined));
// }

// export function basic(header: string): BasicCredentials | null {
//   if (header.startsWith('Basic ')) {
//     // Need to decode base64
//     header = atob(header);

//     const sp = header.indexOf(':', 6);
//     if (sp === -1) return null;

//     return {
//       username: header.substring(6, sp),
//       password: header.substring(sp + 1)
//     }
//   }

//   return null;
// }

// export function bearer(header: string): string | null {
//   return header.startsWith('Bearer ')
//     ? header.substring(7) : null;
// }
