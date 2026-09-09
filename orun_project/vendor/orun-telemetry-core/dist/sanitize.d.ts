/**
 * Sanitização defensiva: telemetria NUNCA deve carregar secrets.
 * Roda antes de qualquer AgentErrorPayload sair do processo local,
 * seguindo o princípio "Secrets via abstração" do orun-secrets skill.
 */
export declare function sanitizeMessage(message: string, maxLength?: number): string;
export declare function sanitizeError(error: unknown): {
    errorCode: string;
    sanitizedMessage: string;
};
