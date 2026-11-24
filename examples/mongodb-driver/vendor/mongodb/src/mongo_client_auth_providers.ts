import { type AuthProvider } from './cmap/auth/auth_provider';
import { type AuthMechanismProperties } from './cmap/auth/mongo_credentials';
import { Plain } from './cmap/auth/plain';
import { AuthMechanism } from './cmap/auth/providers';
import { ScramSHA1, ScramSHA256 } from './cmap/auth/scram';
import { MongoInvalidArgumentError } from './error';

/** @internal */
const AUTH_PROVIDERS = new Map<
  AuthMechanism | string,
  (authMechanismProperties: AuthMechanismProperties) => AuthProvider
>([
  [AuthMechanism.MONGODB_PLAIN, (_props: AuthMechanismProperties): AuthProvider => new Plain()],
  [AuthMechanism.MONGODB_SCRAM_SHA1, (_props: AuthMechanismProperties): AuthProvider => new ScramSHA1()],
  [AuthMechanism.MONGODB_SCRAM_SHA256, (_props: AuthMechanismProperties): AuthProvider => new ScramSHA256()]
]);

/**
 * Create a set of providers per client
 * to avoid sharing the provider's cache between different clients.
 * @internal
 */
export class MongoClientAuthProviders {
  private existingProviders: Map<AuthMechanism | string, AuthProvider> = new Map();

  getOrCreateProvider(
    name: AuthMechanism | string,
    authMechanismProperties: AuthMechanismProperties
  ): AuthProvider {
    const authProvider = this.existingProviders.get(name);
    if (authProvider) {
      return authProvider;
    }

    const providerFunction = AUTH_PROVIDERS.get(name);
    if (!providerFunction) {
      throw new MongoInvalidArgumentError(`authMechanism ${name} not supported`);
    }

    const provider = providerFunction(authMechanismProperties);
    this.existingProviders.set(name, provider);
    return provider;
  }
}
