// OIDC authentication is not part of this example. Only the types that
// MongoClient's credentials reference remain.
export type OIDCCallbackFunction = (params: any) => Promise<any>;
export type OIDCCallbackParams = any;
export type IdPInfo = any;
export type Workflow = any;
export const OIDC_WORKFLOWS = new Map<string, () => any>();
export class MongoDBOIDC {
  [key: string]: any;
  constructor(..._args: any[]) {}
}
