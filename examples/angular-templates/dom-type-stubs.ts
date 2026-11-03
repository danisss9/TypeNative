// Ambient DOM types the Angular compiler references but never executes in a
// native binary: the Trusted Types API does not exist there, and every use
// is guarded by `globalThis['trustedTypes']`, which is undefined. Declared
// as real (empty-shaped) interfaces so the compiled Go types exist.

export interface TrustedScript {}

export interface TrustedTypePolicy {
  createScript(script: string, ...args: unknown[]): TrustedScript;
}

export interface TrustedTypePolicyFactory {
  createPolicy(
    policyName: string,
    policyOptions: {
      createScript?: (script: string, ...args: unknown[]) => TrustedScript;
      createScriptURL?: (scriptURL: string, ...args: unknown[]) => string;
      [key: string]: unknown;
    },
  ): TrustedTypePolicy;
}
