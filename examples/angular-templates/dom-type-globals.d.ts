// Ambient declarations for the checker: the Trusted Types DOM API, which the
// Angular compiler references but never runs in a native binary (every use
// is guarded by `globalThis['trustedTypes']`, undefined there). The Go side
// of these types comes from dom-type-stubs.ts, imported by main.ts.

declare interface TrustedScript {}

declare interface TrustedTypePolicy {
  createScript(script: string, ...args: unknown[]): TrustedScript;
}

declare interface TrustedTypePolicyFactory {
  createPolicy(
    policyName: string,
    policyOptions: {
      createScript?: (script: string, ...args: unknown[]) => TrustedScript;
      createScriptURL?: (scriptURL: string, ...args: unknown[]) => string;
      [key: string]: unknown;
    },
  ): TrustedTypePolicy;
}
