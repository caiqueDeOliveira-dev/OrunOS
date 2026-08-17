import { type ProviderDefinition, type ProviderId } from "../schema";
/**
 * Registry final, validado — cada entrada passou pelo Zod schema,
 * então `requiresLocalRuntime` e outros defaults já estão preenchidos.
 */
export declare const PROVIDER_REGISTRY: Record<ProviderId, ProviderDefinition>;
export declare function getProvider(id: ProviderId): ProviderDefinition;
export declare function listFreeProviders(): ProviderDefinition[];
export declare function listPaidProviders(): ProviderDefinition[];
export declare function listSubscriptionProviders(): ProviderDefinition[];
/** Providers gratuitos que rodam sem nenhuma credencial (bom pro combo "sempre funciona"). */
export declare function listNoAuthFreeProviders(): ProviderDefinition[];
