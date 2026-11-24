// A small stand-in for `mongodb-connection-string-url` (which ships only
// compiled JavaScript). It exposes the subset of the upstream `ConnectionString`
// API the driver's connection-string parser reads: `hosts`, `isSRV`,
// `pathname`, `username`, `password` and `searchParams`, parsed over the
// platform URL. See examples/mongodb-driver/VENDOR.md.
//
// Upstream makes URLSearchParams keys case-insensitive by swapping prototypes;
// TypeNative has no prototype mutation, so keys keep the case the URI used.
// The driver lower-cases keys when it validates them.
import { URL } from 'node:url';

const DUMMY_HOSTNAME = '__typenative_placeholder__';

export default class ConnectionString {
  #url: URL;
  #hosts: string[] = [];
  #isSRV: boolean = false;

  constructor(uri: string, _options?: { looseValidation?: boolean }) {
    const srv = uri.startsWith('mongodb+srv://');
    const scheme = srv ? 'mongodb+srv' : 'mongodb';
    if (!uri.startsWith(`${scheme}://`)) {
      throw new Error(
        'Invalid scheme, expected connection string to start with "mongodb://" or "mongodb+srv://"'
      );
    }
    const rest = uri.slice(scheme.length + 3);
    const at = rest.lastIndexOf('@');
    const userinfo = at >= 0 ? rest.slice(0, at) : '';
    const afterUser = at >= 0 ? rest.slice(at + 1) : rest;
    const slash = afterUser.indexOf('/');
    const hostPart = slash >= 0 ? afterUser.slice(0, slash) : afterUser;
    const tail = slash >= 0 ? afterUser.slice(slash) : '';
    if (hostPart === '') {
      throw new Error('Protocol and host list are required in the uri');
    }
    this.#hosts = hostPart.split(',');
    this.#isSRV = srv;
    const authority = userinfo === '' ? DUMMY_HOSTNAME : `${userinfo}@${DUMMY_HOSTNAME}`;
    this.#url = new URL(`${scheme}://${authority}${tail}`);
  }

  get hosts(): string[] {
    return this.#hosts;
  }
  set hosts(list: string[]) {
    this.#hosts = list;
  }

  get isSRV(): boolean {
    return this.#isSRV;
  }

  get pathname(): string {
    return this.#url.pathname;
  }
  set pathname(value: string) {
    this.#url.pathname = value;
  }

  get username(): string {
    return this.#url.username;
  }
  get password(): string {
    return this.#url.password;
  }
  get protocol(): string {
    return this.#url.protocol;
  }
  get searchParams(): URLSearchParams {
    return this.#url.searchParams;
  }

  toString(): string {
    return this.#url.toString().split(DUMMY_HOSTNAME).join(this.#hosts.join(','));
  }

  clone(): ConnectionString {
    return new ConnectionString(this.toString(), { looseValidation: true });
  }

  redact(): ConnectionString {
    return this.clone();
  }

  typedSearchParams<T extends {}>(): URLSearchParams {
    return this.#url.searchParams;
  }
}
