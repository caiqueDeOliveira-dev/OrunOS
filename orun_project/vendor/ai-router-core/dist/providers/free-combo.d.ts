import { type Combo } from "../schema";
/**
 * Combo 100% gratuito, pronto pra usar assim que você tiver as API keys
 * free cadastradas (Groq, Gemini, GitHub Models, Cerebras) + Ollama local
 * como fallback final que NUNCA falha (roda na sua máquina).
 *
 * Ordem pensada por: (1) qualidade, (2) velocidade, (3) generosidade
 * do rate-limit, deixando o Ollama local como rede de segurança.
 *
 * Construído via ComboSchema.parse() em vez de literal — assim os defaults
 * novos (rtkEnabled, cacheEnabled, cacheSimilarityThreshold) são preenchidos
 * automaticamente sem precisar repetir aqui toda vez que o schema crescer.
 */
/**
 * Combo principal — inspirado no "free-forever" do 9Router: Kiro
 * (Claude 4.5 / GLM-5 / MiniMax grátis via OAuth, ~50 créditos/mês) →
 * OpenCode Free (sem cadastro) → Vertex AI ($300 créditos GCP) → Ollama
 * local como rede de segurança que NUNCA falha. É o combo padrão do app.
 */
export declare const FREE_FOREVER_COMBO: Combo;
export declare const FREE_DEFAULT_COMBO: Combo;
/** Variante só com providers que não pedem NENHUM cadastro (Ollama + OpenCode Free). */
export declare const FREE_NO_SIGNUP_COMBO: Combo;
/**
 * O OpenRouter é cadastrado como tier="paid" no registry (a CONTA é
 * pay-as-you-go), mas ele hospeda dezenas de modelos com sufixo ":free"
 * que não cobram nada — desde que você use exatamente esses IDs de
 * modelo. Esse combo isola só os gratuitos, então mesmo cadastrando sua
 * key paga do OpenRouter aqui, esse combo específico nunca vai gerar
 * custo (só falha se TODOS os modelos ":free" estiverem sobrecarregados).
 */
export declare const FREE_OPENROUTER_MODELS_COMBO: Combo;
/** Combo com TODOS os providers 100% gratuitos do registry, pra maximizar chance de sucesso sem gastar nada. */
export declare const FREE_MAX_COVERAGE_COMBO: Combo;
export declare const BUILTIN_FREE_COMBOS: Combo[];
