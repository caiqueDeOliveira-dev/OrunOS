export type Language = "pt" | "en" | "es" | "fr";

export const LANGUAGE_OPTIONS: { value: Language; label: string; flag: string }[] = [
  { value: "pt", label: "Português", flag: "🇧🇷" },
  { value: "en", label: "English", flag: "🇺🇸" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
];

export const LOCALE_MAP: Record<Language, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
};

export const SPEECH_LANG_MAP: Record<Language, string> = {
  pt: "pt-BR",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
};

type TranslationKeys = {
  // Boot sequence
  bootInitializing: string;
  bootMemoryEngine: string;
  bootAIModels: string;
  bootInitializingHampton: string;
  bootConnectingLocal: string;
  bootConnectingCloud: string;
  bootLoadingProjects: string;
  bootLoadingUserMemory: string;
  bootPreparingInterface: string;
  bootSystemReady: string;
  bootSequence: string;
  bootLoading: string;

  // Splash screen
  splashBrand: string;
  splashSolutions: string;

  // Agent roles
  agentCentralIntelligence: string;
  agentCodeEngineering: string;
  agentUIUX: string;
  agent3DModeling: string;
  agentResearchAnalysis: string;
  agentHealthMonitoring: string;
  agentDietNutrition: string;
  agentFitnessTraining: string;
  agentBudgetInvestments: string;
  agentLearningEducation: string;
  agentLanguagesCulture: string;
  agentVideoProduction: string;
  agentAudioMusic: string;
  agentAutomationBots: string;
  agentImageCamera: string;
  agentSpeechAudio: string;
  agentKnowledgeMemory: string;
  agentOSConfig: string;

  // Navigation
  navHome: string;
  navAgents: string;
  navProjects: string;
  navStudio: string;
  navMemory: string;
  navAutomation: string;
  navFiles: string;

  // Sidebar
  sidebarHistory: string;
  sidebarSettings: string;
  sidebarProfile: string;

  // Status bar
  statusNativeAI: string;
  statusConnected: string;

  // Home screen
  homeWelcomeBack: string;
  homeHowCanIHelp: string;
  homeCloudModels: string;
  homeActiveMemory: string;
  homeListening: string;
  homeThinking: string;
  homeSpeaking: string;
  homeStop: string;
  homeMuteVoice: string;
  homeEnableVoice: string;
  homeNewConversation: string;
  homeErrorAccess: string;
  homeErrorAccessShort: string;

  // Hampton replies (browser mode)
  reply1: string;
  reply2: string;
  reply3: string;
  reply4: string;
  reply5: string;

  // Settings panel
  settingsTitle: string;
  settingsBrowserWarning: string;
  settingsModel: string;
  settingsOllamaModelsError: string;
  settingsRefreshModels: string;
  settingsOllamaUrl: string;
  settingsOllamaNote: string;
  settingsApiKeySaved: string;
  settingsApiKeyPlaceholder: string;
  settingsApiKeyPlaceholderGithub: string;
  settingsApiKeyKeepPlaceholder: string;
  settingsApiKeyNote: string;
  settingsSystemPrompt: string;
  settingsFallbackProvider: string;
  settingsFallbackNone: string;
  settingsModelName: string;
  settingsRunInBackground: string;
  settingsWakeWord: string;
  settingsWakeWordBeta: string;
  settingsWakeWordNote: string;
  settingsWhatsAppConnector: string;
  settingsCheckUpdates: string;
  settingsLatestVersion: string;
  settingsUpdateAvailable: string;
  settingsDownloadingUpdate: string;
  settingsRestartInstall: string;
  settingsUpdateFailed: string;
  settingsModelsPerAgent: string;
  settingsUsageToday: string;
  settingsTestConnection: string;
  settingsSave: string;
  settingsError: string;
  settingsOpenCodeZenNote: string;
  settingsLanguage: string;

  // Agent models panel
  agentModelsTitle: string;
  agentModelsDescription: string;
  agentModelsSpecialized: string;
  agentModelsDefaultPersona: string;
  agentModelsDefault: string;
  agentModelsModelName: string;
  agentModelsCustomPersona: string;
  agentModelsDailySchedule: string;
  agentModelsSendEveryDayAt: string;
  agentModelsPersonaPlaceholder: string;
  agentModelsSaved: string;
  agentModelsSave: string;

  // Model picker
  modelPickerHint: string;
  modelPickerLoading: string;
  modelPickerNotFound: string;

  // Usage panel
  usageTitle: string;
  usageBrowserWarning: string;
  usageLoading: string;
  usageNoRequests: string;
  usageTotalRequests: string;
  usageTokenNote: string;
  usageVoiceTTS: string;

  // Automation panel
  automationTitle: string;
  automationN8nNote1: string;
  automationN8nNote2: string;
  automationBrowserWarning: string;
  automationApiKeySaved: string;
  automationApiKeyKeep: string;
  automationApiKeyPlaceholder: string;
  automationTestConnection: string;
  automationConnected: string;
  automationAutoTrigger: string;
  automationAutoTriggerNote1: string;
  automationAutoTriggerNote2: string;
  automationSavedTitle: string;
  automationNoneYet: string;
  automationNamePlaceholder: string;
  automationDescPlaceholder: string;
  automationAdd: string;
  automationTriggerNote: string;
  automationHeaderName: string;
  automationHeaderValue: string;
  automationSend: string;
  automationError: string;

  // Voices picker
  voicesLoadError: string;
  voicesPreview: string;
  voicesHeader: string;
  voicesHint: string;
  voicesApiKeySaved: string;
  voicesAzureRegion: string;
  voicesLocalUrl: string;
  voicesSaveRefresh: string;
  voicesLoading: string;
  voicesPiperNote: string;
  voicesNotFound: string;

  // WhatsApp panel
  whatsappBrowserWarning: string;
  whatsappDisclaimer1: string;
  whatsappDisclaimer2: string;
  whatsappScanInstruction: string;
  whatsappConnecting: string;
  whatsappConnected: string;
  whatsappListenChat: string;
  whatsappAutoFill: string;
  whatsappFoodPhotoNote: string;
  whatsappTextNote: string;

  // Conversation list
  conversationNew: string;
  conversationBrowserWarning: string;
  conversationLoading: string;
  conversationEmpty: string;

  // Chat input
  chatImageAttached: string;
  chatAttachPhoto: string;
  chatPlaceholder: string;
  chatDisclaimer: string;

  // Message bubble
  messageEditResend: string;
  messageRegenerate: string;

  // Common
  commonNone: string;
  commonLoading: string;
  commonError: string;
};

export const translations: Record<Language, TranslationKeys> = {
  pt: {
    // Boot sequence
    bootInitializing: "Inicializando Orun OS...",
    bootMemoryEngine: "Carregando Motor de Memória...",
    bootAIModels: "Carregando Modelos de IA...",
    bootInitializingHampton: "Inicializando Hampton...",
    bootConnectingLocal: "Conectando IA Local...",
    bootConnectingCloud: "Conectando IA na Nuvem...",
    bootLoadingProjects: "Carregando Projetos...",
    bootLoadingUserMemory: "Carregando Memória do Usuário...",
    bootPreparingInterface: "Preparando Interface...",
    bootSystemReady: "Sistema Pronto.",
    bootSequence: "SEQUÊNCIA DE INICIALIZAÇÃO",
    bootLoading: "CARREGANDO",

    // Splash screen
    splashBrand: "Grupo Orun",
    splashSolutions: "Soluções Tecnológicas",

    // Agent roles
    agentCentralIntelligence: "Inteligência Central",
    agentCodeEngineering: "Código & Engenharia",
    agentUIUX: "UI/UX & Visual",
    agent3DModeling: "3D & Modelagem",
    agentResearchAnalysis: "Pesquisa & Análise",
    agentHealthMonitoring: "Monitoramento de Saúde",
    agentDietNutrition: "Dieta & Nutrição",
    agentFitnessTraining: "Fitness & Treino",
    agentBudgetInvestments: "Orçamento & Investimentos",
    agentLearningEducation: "Aprendizado & Educação",
    agentLanguagesCulture: "Idiomas & Cultura",
    agentVideoProduction: "Produção de Vídeo",
    agentAudioMusic: "Áudio & Música",
    agentAutomationBots: "Automação & Bots",
    agentImageCamera: "IA de Imagem & Câmera",
    agentSpeechAudio: "Fala & Áudio",
    agentKnowledgeMemory: "Conhecimento & Memória",
    agentOSConfig: "SO & Configuração",

    // Navigation
    navHome: "Início",
    navAgents: "Agentes",
    navProjects: "Projetos",
    navStudio: "Estúdio",
    navMemory: "Memória",
    navAutomation: "Automação",
    navFiles: "Arquivos",

    // Sidebar
    sidebarHistory: "Histórico de Conversas",
    sidebarSettings: "Configurações",
    sidebarProfile: "Perfil",

    // Status bar
    statusNativeAI: "IA Nativa",
    statusConnected: "Conectado",

    // Home screen
    homeWelcomeBack: "Bem-vindo de volta, Caique.",
    homeHowCanIHelp: "Como posso te ajudar hoje?",
    homeCloudModels: "Modelos na Nuvem",
    homeActiveMemory: "Memória Ativa",
    homeListening: "● Escutando",
    homeThinking: "● Pensando",
    homeSpeaking: "● Falando",
    homeStop: "■ Parar",
    homeMuteVoice: "Silenciar respostas por voz",
    homeEnableVoice: "Ativar respostas por voz",
    homeNewConversation: "Nova Conversa",
    homeErrorAccess: "Não foi possível acessar o motor de IA. Verifique Configurações → Motor de IA para confirmar que o provider está configurado.",
    homeErrorAccessShort: "Não foi possível acessar o motor de IA. Verifique Configurações → Motor de IA.",

    // Hampton replies
    reply1: "Entendido. Estou processando sua solicitação com toda a inteligência disponível em todos os modelos.",
    reply2: "Analisando o contexto agora. Vou fornecer a resposta mais precisa e útil possível.",
    reply3: "Sua consulta foi recebida. Sintetizando informações de todos os sistemas de conhecimento conectados.",
    reply4: "Executando análise profunda. Permita-me um momento para formular a resposta ideal para você.",
    reply5: "Processamento concluído. Aqui está o que encontrei com base na sua solicitação e no contexto atual.",

    // Settings panel
    settingsTitle: "Configurações do Motor de IA",
    settingsBrowserWarning: "Executando no navegador — as configurações só funcionam no aplicativo Electron empacotado.",
    settingsModel: "Modelo",
    settingsOllamaModelsError: "não foi possível listar — o Ollama está rodando?",
    settingsRefreshModels: "Atualizar modelos instalados",
    settingsOllamaUrl: "Ollama URL",
    settingsOllamaNote: "Requer o Ollama rodando localmente (ollama.com). Nenhum dado sai desta máquina.",
    settingsApiKeySaved: "salva • criptografada",
    settingsApiKeyPlaceholderGithub: "github_pat_...",
    settingsApiKeyPlaceholder: "sk-...",
    settingsApiKeyKeepPlaceholder: "•••••••••••••••• (deixe em branco para manter)",
    settingsApiKeyNote: "Armazenado criptografado nesta máquina via keychain do SO. Nunca enviado para outro lugar exceto a API oficial de",
    settingsSystemPrompt: "Prompt do sistema (persona de Hampton)",
    settingsFallbackProvider: "Provider de fallback (usado automaticamente se o principal falhar)",
    settingsFallbackNone: "Nenhum",
    settingsModelName: "nome do modelo",
    settingsRunInBackground: "Manter rodando em segundo plano",
    settingsWakeWord: "Diga \"Hampton\" ou \"Orun\" para conversar",
    settingsWakeWordBeta: "(beta)",
    settingsWakeWordNote: "Usa o reconhecimento de voz embutido do navegador — o áudio é enviado para os servidores do Google para transcrição, não processado localmente.",
    settingsWhatsAppConnector: "Conector WhatsApp",
    settingsCheckUpdates: "Verificar atualizações",
    settingsLatestVersion: "Você está na versão mais recente.",
    settingsUpdateAvailable: "Atualização disponível — baixando…",
    settingsDownloadingUpdate: "Baixando atualização…",
    settingsRestartInstall: "Reiniciar e instalar atualização",
    settingsUpdateFailed: "Falha ao verificar atualizações.",
    settingsModelsPerAgent: "Modelos por agente",
    settingsUsageToday: "Uso hoje",
    settingsTestConnection: "Testar conexão",
    settingsSave: "Salvar",
    settingsError: "Erro desconhecido",
    settingsOpenCodeZenNote: "Acesso a GPT 5.x, Claude 4.x, Gemini 3.x e mais",
    settingsLanguage: "Idioma",

    // Agent models panel
    agentModelsTitle: "Agentes",
    agentModelsDescription: "Modelo + persona por agente, além de uma agenda diária opcional (ex: Personal Trainer toda manhã).",
    agentModelsSpecialized: "Apenas Nutritionist e Personal Trainer têm comportamento especializado real agora — os demais usam",
    agentModelsDefaultPersona: "sua persona padrão até receberem lógica real também.",
    agentModelsDefault: "Padrão",
    agentModelsModelName: "nome do modelo",
    agentModelsCustomPersona: "Persona personalizada",
    agentModelsDailySchedule: "Agenda diária",
    agentModelsSendEveryDayAt: "Enviar todo dia às",
    agentModelsPersonaPlaceholder: "Persona personalizada para",
    agentModelsSaved: "Salvo ✓",
    agentModelsSave: "Salvar",

    // Model picker
    modelPickerHint: "Clique duas vezes em um provider para ver seus modelos.",
    modelPickerLoading: "Carregando modelos…",
    modelPickerNotFound: "Nenhum modelo encontrado. Digite um manualmente nas Configurações se necessário.",

    // Usage panel
    usageTitle: "Uso Hoje",
    usageBrowserWarning: "O rastreamento de uso só funciona no aplicativo Electron empacotado.",
    usageLoading: "Carregando…",
    usageNoRequests: "Nenhuma requisição hoje. Envie uma mensagem para Hampton e volte aqui.",
    usageTotalRequests: "requisição(ões) no total em todos os providers hoje.",
    usageTokenNote: "As contagens de tokens vêm do relatório de cada provider — alguns (como Ollama) só reportam depois que uma resposta termina.",
    usageVoiceTTS: "Voz (TTS)",

    // Automation panel
    automationTitle: "Automação — n8n",
    automationN8nNote1: "Orun OS não inclui o n8n — é um aplicativo separado que você hospeda (Docker) ou roda no n8n Cloud.",
    automationN8nNote2: "Isso conecta a uma instância que você já possui em execução.",
    automationBrowserWarning: "Executando no navegador — isso só funciona no aplicativo Electron empacotado.",
    automationApiKeySaved: "salva • criptografada",
    automationApiKeyKeep: "deixe em branco para manter",
    automationApiKeyPlaceholder: "n8n → Configurações → n8n API → Criar",
    automationTestConnection: "Testar conexão e listar workflows",
    automationConnected: "Conectado — {count} workflow(s) encontrado(s).",
    automationAutoTrigger: "Permitir que Hampton dispare automações automaticamente",
    automationAutoTriggerNote1: "Hampton decidirá sozinho, no meio da conversa, quando uma automação salva abaixo se encaixa no que você pediu.",
    automationAutoTriggerNote2: "Ele só pode escolher da lista que você define — não pode inventar novas URLs de webhook.",
    automationSavedTitle: "Automações salvas",
    automationNoneYet: "Nenhuma ainda — adicione uma abaixo.",
    automationNamePlaceholder: "Nome (ex: enviar_email)",
    automationDescPlaceholder: "O que faz (Hampton lê isso para decidir quando usar)",
    automationAdd: "Adicionar automação",
    automationTriggerNote: "Disparar um workflow (nó Webhook)",
    automationHeaderName: "Nome do header (opcional)",
    automationHeaderValue: "Valor do header",
    automationSend: "Enviar",
    automationError: "Erro desconhecido",

    // Voices picker
    voicesLoadError: "Falha ao carregar vozes — verifique sua API key/configuração abaixo.",
    voicesPreview: "Olá, essa é a minha voz.",
    voicesHeader: "/vozes",
    voicesHint: "Clique duas vezes em um provider para ver suas vozes. Clique uma vez para ouvir, duas vezes para selecionar.",
    voicesApiKeySaved: "API key salva • criptografada (deixe em branco para manter)",
    voicesAzureRegion: "Região Azure (ex: eastus)",
    voicesLocalUrl: "URL do servidor local",
    voicesSaveRefresh: "Salvar e atualizar vozes",
    voicesLoading: "Carregando vozes…",
    voicesPiperNote: "Piper não tem API de listagem de vozes — escolha a voz/modelo no servidor; isso apenas usa o que estiver configurado.",
    voicesNotFound: "Nenhuma voz encontrada.",

    // WhatsApp panel
    whatsappBrowserWarning: "Só funciona no aplicativo Electron empacotado.",
    whatsappDisclaimer1: "Usa uma biblioteca não oficial de protocolo WhatsApp Web (Baileys), não a API oficial da Meta.",
    whatsappDisclaimer2: "Isso viola os Termos de Serviço do WhatsApp — risco baixo para uso pessoal, mas não zero.",
    whatsappScanInstruction: "WhatsApp → Dispositivos conectados → Conectar dispositivo → escaneie isso.",
    whatsappConnecting: "Conectando…",
    whatsappConnected: "Conectado",
    whatsappListenChat: "Chat que o Orun OS escuta",
    whatsappAutoFill: "Preenchido automaticamente com seu próprio chat ao conectar",
    whatsappFoodPhotoNote: "Envie para si mesmo uma foto de comida neste chat e o agente Nutritionist responde com calorias.",
    whatsappTextNote: "Mensagens de texto vão para Hampton. Apenas este chat é processado.",

    // Conversation list
    conversationNew: "Nova conversa",
    conversationBrowserWarning: "O histórico só está disponível no aplicativo Electron empacotado.",
    conversationLoading: "Carregando…",
    conversationEmpty: "Nenhuma conversa ainda.",

    // Chat input
    chatImageAttached: "Imagem anexada",
    chatAttachPhoto: "Anexar uma foto (ex: uma refeição para o agente Nutritionist)",
    chatPlaceholder: "Pergunte qualquer coisa ao Hampton... (tente /vozes ou /model)",
    chatDisclaimer: "Hampton pode cometer erros. Sempre verifique informações importantes.",

    // Message bubble
    messageEditResend: "Editar e reenviar",
    messageRegenerate: "Regenerar",

    // Common
    commonNone: "Nenhum",
    commonLoading: "Carregando…",
    commonError: "Erro desconhecido",
  },

  en: {
    // Boot sequence
    bootInitializing: "Initializing Orun OS...",
    bootMemoryEngine: "Loading Memory Engine...",
    bootAIModels: "Loading AI Models...",
    bootInitializingHampton: "Initializing Hampton...",
    bootConnectingLocal: "Connecting Local AI...",
    bootConnectingCloud: "Connecting Cloud AI...",
    bootLoadingProjects: "Loading Projects...",
    bootLoadingUserMemory: "Loading User Memory...",
    bootPreparingInterface: "Preparing Interface...",
    bootSystemReady: "System Ready.",
    bootSequence: "BOOT SEQUENCE",
    bootLoading: "LOADING",

    // Splash screen
    splashBrand: "Grupo Orun",
    splashSolutions: "Technological Solutions",

    // Agent roles
    agentCentralIntelligence: "Central Intelligence",
    agentCodeEngineering: "Code & Engineering",
    agentUIUX: "UI/UX & Visual",
    agent3DModeling: "3D & Modeling",
    agentResearchAnalysis: "Research & Analysis",
    agentHealthMonitoring: "Health Monitoring",
    agentDietNutrition: "Diet & Nutrition",
    agentFitnessTraining: "Fitness & Training",
    agentBudgetInvestments: "Budgeting & Investments",
    agentLearningEducation: "Learning & Education",
    agentLanguagesCulture: "Languages & Culture",
    agentVideoProduction: "Video Production",
    agentAudioMusic: "Audio & Music",
    agentAutomationBots: "Automation & Bots",
    agentImageCamera: "Image AI & Camera",
    agentSpeechAudio: "Speech & Audio",
    agentKnowledgeMemory: "Knowledge & Memory",
    agentOSConfig: "OS & Configuration",

    // Navigation
    navHome: "Home",
    navAgents: "Agents",
    navProjects: "Projects",
    navStudio: "Studio",
    navMemory: "Memory",
    navAutomation: "Automation",
    navFiles: "Files",

    // Sidebar
    sidebarHistory: "Conversation History",
    sidebarSettings: "Settings",
    sidebarProfile: "Profile",

    // Status bar
    statusNativeAI: "Native AI",
    statusConnected: "Connected",

    // Home screen
    homeWelcomeBack: "Welcome back, Caique.",
    homeHowCanIHelp: "How can I help you today?",
    homeCloudModels: "Cloud Models",
    homeActiveMemory: "Active Memory",
    homeListening: "● Listening",
    homeThinking: "● Thinking",
    homeSpeaking: "● Speaking",
    homeStop: "■ Stop",
    homeMuteVoice: "Mute voice replies",
    homeEnableVoice: "Enable voice replies",
    homeNewConversation: "New Conversation",
    homeErrorAccess: "Could not access the AI engine. Check Settings → AI Engine to confirm the provider is configured.",
    homeErrorAccessShort: "Could not access the AI engine. Check Settings → AI Engine.",

    // Hampton replies
    reply1: "Understood. I'm processing your request with all the intelligence available across all models.",
    reply2: "Analyzing the context now. I'll provide the most accurate and helpful response possible.",
    reply3: "Your query has been received. Synthesizing information from all connected knowledge systems.",
    reply4: "Running deep analysis. Allow me a moment to formulate the ideal response for you.",
    reply5: "Processing complete. Here's what I found based on your request and the current context.",

    // Settings panel
    settingsTitle: "AI Engine Settings",
    settingsBrowserWarning: "Running in browser — settings only work in the packaged Electron app.",
    settingsModel: "Model",
    settingsOllamaModelsError: "could not list — is Ollama running?",
    settingsRefreshModels: "Refresh installed models",
    settingsOllamaUrl: "Ollama URL",
    settingsOllamaNote: "Requires Ollama running locally (ollama.com). No data leaves this machine.",
    settingsApiKeySaved: "saved • encrypted",
    settingsApiKeyPlaceholderGithub: "github_pat_...",
    settingsApiKeyPlaceholder: "sk-...",
    settingsApiKeyKeepPlaceholder: "•••••••••••••••• (leave blank to keep)",
    settingsApiKeyNote: "Stored encrypted on this machine via OS keychain. Never sent anywhere except the official",
    settingsSystemPrompt: "System prompt (Hampton's persona)",
    settingsFallbackProvider: "Fallback provider (used automatically if the primary fails)",
    settingsFallbackNone: "None",
    settingsModelName: "model name",
    settingsRunInBackground: "Keep running in background",
    settingsWakeWord: "Say \"Hampton\" or \"Orun\" to chat",
    settingsWakeWordBeta: "(beta)",
    settingsWakeWordNote: "Uses the browser's built-in voice recognition — audio is sent to Google servers for transcription, not processed locally.",
    settingsWhatsAppConnector: "WhatsApp Connector",
    settingsCheckUpdates: "Check for updates",
    settingsLatestVersion: "You are on the latest version.",
    settingsUpdateAvailable: "Update available — downloading…",
    settingsDownloadingUpdate: "Downloading update…",
    settingsRestartInstall: "Restart and install update",
    settingsUpdateFailed: "Failed to check for updates.",
    settingsModelsPerAgent: "Models per agent",
    settingsUsageToday: "Usage today",
    settingsTestConnection: "Test connection",
    settingsSave: "Save",
    settingsError: "Unknown error",
    settingsOpenCodeZenNote: "Access to GPT 5.x, Claude 4.x, Gemini 3.x and more",
    settingsLanguage: "Language",

    // Agent models panel
    agentModelsTitle: "Agents",
    agentModelsDescription: "Model + persona per agent, plus an optional daily schedule (e.g., Personal Trainer every morning).",
    agentModelsSpecialized: "Only Nutritionist and Personal Trainer have real specialized behavior now — the rest use",
    agentModelsDefaultPersona: "their default persona until they receive real logic too.",
    agentModelsDefault: "Default",
    agentModelsModelName: "model name",
    agentModelsCustomPersona: "Custom persona",
    agentModelsDailySchedule: "Daily schedule",
    agentModelsSendEveryDayAt: "Send every day at",
    agentModelsPersonaPlaceholder: "Custom persona for",
    agentModelsSaved: "Saved ✓",
    agentModelsSave: "Save",

    // Model picker
    modelPickerHint: "Double-click a provider to see its models.",
    modelPickerLoading: "Loading models…",
    modelPickerNotFound: "No models found. Enter one manually in Settings if needed.",

    // Usage panel
    usageTitle: "Usage Today",
    usageBrowserWarning: "Usage tracking only works in the packaged Electron app.",
    usageLoading: "Loading…",
    usageNoRequests: "No requests today. Send a message to Hampton and come back.",
    usageTotalRequests: "request(s) total across all providers today.",
    usageTokenNote: "Token counts come from each provider's report — some (like Ollama) only report after a response finishes.",
    usageVoiceTTS: "Voice (TTS)",

    // Automation panel
    automationTitle: "Automation — n8n",
    automationN8nNote1: "Orun OS does not include n8n — it is a separate app you host (Docker) or run on n8n Cloud.",
    automationN8nNote2: "This connects to an instance you already have running.",
    automationBrowserWarning: "Running in browser — this only works in the packaged Electron app.",
    automationApiKeySaved: "saved • encrypted",
    automationApiKeyKeep: "leave blank to keep",
    automationApiKeyPlaceholder: "n8n → Settings → n8n API → Create",
    automationTestConnection: "Test connection and list workflows",
    automationConnected: "Connected — {count} workflow(s) found.",
    automationAutoTrigger: "Allow Hampton to trigger automations automatically",
    automationAutoTriggerNote1: "Hampton will decide on its own, mid-conversation, when a saved automation below fits what you asked.",
    automationAutoTriggerNote2: "It can only choose from the list you define — it cannot invent new webhook URLs.",
    automationSavedTitle: "Saved automations",
    automationNoneYet: "None yet — add one below.",
    automationNamePlaceholder: "Name (e.g., send_email)",
    automationDescPlaceholder: "What it does (Hampton reads this to decide when to use it)",
    automationAdd: "Add automation",
    automationTriggerNote: "Trigger a workflow (Webhook node)",
    automationHeaderName: "Header name (optional)",
    automationHeaderValue: "Header value",
    automationSend: "Send",
    automationError: "Unknown error",

    // Voices picker
    voicesLoadError: "Failed to load voices — check your API key/configuration below.",
    voicesPreview: "Hello, this is my voice.",
    voicesHeader: "/voices",
    voicesHint: "Double-click a provider to see its voices. Click once to listen, twice to select.",
    voicesApiKeySaved: "API key saved • encrypted (leave blank to keep)",
    voicesAzureRegion: "Azure region (e.g., eastus)",
    voicesLocalUrl: "Local server URL",
    voicesSaveRefresh: "Save and refresh voices",
    voicesLoading: "Loading voices…",
    voicesPiperNote: "Piper has no voice listing API — choose the voice/model on the server; this just uses whatever is configured.",
    voicesNotFound: "No voices found.",

    // WhatsApp panel
    whatsappBrowserWarning: "Only works in the packaged Electron app.",
    whatsappDisclaimer1: "Uses an unofficial WhatsApp Web protocol library (Baileys), not Meta's official API.",
    whatsappDisclaimer2: "This violates WhatsApp's Terms of Service — low risk for personal use, but not zero.",
    whatsappScanInstruction: "WhatsApp → Linked devices → Link a device → scan this.",
    whatsappConnecting: "Connecting…",
    whatsappConnected: "Connected",
    whatsappListenChat: "Chat that Orun OS listens to",
    whatsappAutoFill: "Auto-filled with your own chat upon connecting",
    whatsappFoodPhotoNote: "Send yourself a food photo in this chat and the Nutritionist agent responds with calories.",
    whatsappTextNote: "Text messages go to Hampton. Only this chat is processed.",

    // Conversation list
    conversationNew: "New conversation",
    conversationBrowserWarning: "History is only available in the packaged Electron app.",
    conversationLoading: "Loading…",
    conversationEmpty: "No conversations yet.",

    // Chat input
    chatImageAttached: "Attached image",
    chatAttachPhoto: "Attach a photo (e.g., a meal for the Nutritionist agent)",
    chatPlaceholder: "Ask Hampton anything... (try /voices or /model)",
    chatDisclaimer: "Hampton may make mistakes. Always verify important information.",

    // Message bubble
    messageEditResend: "Edit and resend",
    messageRegenerate: "Regenerate",

    // Common
    commonNone: "None",
    commonLoading: "Loading…",
    commonError: "Unknown error",
  },

  es: {
    // Boot sequence
    bootInitializing: "Inicializando Orun OS...",
    bootMemoryEngine: "Cargando Motor de Memoria...",
    bootAIModels: "Cargando Modelos de IA...",
    bootInitializingHampton: "Inicializando Hampton...",
    bootConnectingLocal: "Conectando IA Local...",
    bootConnectingCloud: "Conectando IA en la Nube...",
    bootLoadingProjects: "Cargando Proyectos...",
    bootLoadingUserMemory: "Cargando Memoria del Usuario...",
    bootPreparingInterface: "Preparando Interfaz...",
    bootSystemReady: "Sistema Listo.",
    bootSequence: "SECUENCIA DE INICIALIZACIÓN",
    bootLoading: "CARGANDO",

    // Splash screen
    splashBrand: "Grupo Orun",
    splashSolutions: "Soluciones Tecnológicas",

    // Agent roles
    agentCentralIntelligence: "Inteligencia Central",
    agentCodeEngineering: "Código e Ingeniería",
    agentUIUX: "UI/UX y Visual",
    agent3DModeling: "3D y Modelado",
    agentResearchAnalysis: "Investigación y Análisis",
    agentHealthMonitoring: "Monitoreo de Salud",
    agentDietNutrition: "Dieta y Nutrición",
    agentFitnessTraining: "Fitness y Entrenamiento",
    agentBudgetInvestments: "Presupuesto e Inversiones",
    agentLearningEducation: "Aprendizaje y Educación",
    agentLanguagesCulture: "Idiomas y Cultura",
    agentVideoProduction: "Producción de Video",
    agentAudioMusic: "Audio y Música",
    agentAutomationBots: "Automatización y Bots",
    agentImageCamera: "IA de Imagen y Cámara",
    agentSpeechAudio: "Habla y Audio",
    agentKnowledgeMemory: "Conocimiento y Memoria",
    agentOSConfig: "SO y Configuración",

    // Navigation
    navHome: "Inicio",
    navAgents: "Agentes",
    navProjects: "Proyectos",
    navStudio: "Estudio",
    navMemory: "Memoria",
    navAutomation: "Automatización",
    navFiles: "Archivos",

    // Sidebar
    sidebarHistory: "Historial de Conversaciones",
    sidebarSettings: "Configuraciones",
    sidebarProfile: "Perfil",

    // Status bar
    statusNativeAI: "IA Nativa",
    statusConnected: "Conectado",

    // Home screen
    homeWelcomeBack: "Bienvenido de vuelta, Caique.",
    homeHowCanIHelp: "¿Cómo puedo ayudarte hoy?",
    homeCloudModels: "Modelos en la Nube",
    homeActiveMemory: "Memoria Activa",
    homeListening: "● Escuchando",
    homeThinking: "● Pensando",
    homeSpeaking: "● Hablando",
    homeStop: "■ Detener",
    homeMuteVoice: "Silenciar respuestas por voz",
    homeEnableVoice: "Activar respuestas por voz",
    homeNewConversation: "Nueva Conversación",
    homeErrorAccess: "No se pudo acceder al motor de IA. Verifique Configuraciones → Motor de IA para confirmar que el proveedor está configurado.",
    homeErrorAccessShort: "No se pudo acceder al motor de IA. Verifique Configuraciones → Motor de IA.",

    // Hampton replies
    reply1: "Entendido. Estoy procesando tu solicitud con toda la inteligencia disponible en todos los modelos.",
    reply2: "Analizando el contexto ahora. Proporcionaré la respuesta más precisa y útil posible.",
    reply3: "Tu consulta ha sido recibida. Sintetizando información de todos los sistemas de conocimiento conectados.",
    reply4: "Ejecutando análisis profundo. Permíteme un momento para formular la respuesta ideal para ti.",
    reply5: "Procesamiento completo. Esto es lo que encontré basado en tu solicitud y el contexto actual.",

    // Settings panel
    settingsTitle: "Configuraciones del Motor de IA",
    settingsBrowserWarning: "Ejecutando en el navegador — las configuraciones solo funcionan en la aplicación Electron empaquetada.",
    settingsModel: "Modelo",
    settingsOllamaModelsError: "no se pudo listar — ¿Ollama está ejecutándose?",
    settingsRefreshModels: "Actualizar modelos instalados",
    settingsOllamaUrl: "URL de Ollama",
    settingsOllamaNote: "Requiere Ollama ejecutándose localmente (ollama.com). Ningún dato sale de esta máquina.",
    settingsApiKeySaved: "guardada • encriptada",
    settingsApiKeyPlaceholderGithub: "github_pat_...",
    settingsApiKeyPlaceholder: "sk-...",
    settingsApiKeyKeepPlaceholder: "•••••••••••••••• (deje en blanco para mantener)",
    settingsApiKeyNote: "Almacenado encriptado en esta máquina vía keychain del SO. Nunca enviado a otro lugar excepto la API oficial de",
    settingsSystemPrompt: "Prompt del sistema (persona de Hampton)",
    settingsFallbackProvider: "Proveedor de respaldo (usado automáticamente si el principal falla)",
    settingsFallbackNone: "Ninguno",
    settingsModelName: "nombre del modelo",
    settingsRunInBackground: "Mantener ejecutándose en segundo plano",
    settingsWakeWord: "Diga \"Hampton\" u \"Orun\" para conversar",
    settingsWakeWordBeta: "(beta)",
    settingsWakeWordNote: "Usa el reconocimiento de voz integrado del navegador — el audio se envía a los servidores de Google para transcripción, no se procesa localmente.",
    settingsWhatsAppConnector: "Conector WhatsApp",
    settingsCheckUpdates: "Buscar actualizaciones",
    settingsLatestVersion: "Estás en la versión más reciente.",
    settingsUpdateAvailable: "Actualización disponible — descargando…",
    settingsDownloadingUpdate: "Descargando actualización…",
    settingsRestartInstall: "Reiniciar e instalar actualización",
    settingsUpdateFailed: "Error al buscar actualizaciones.",
    settingsModelsPerAgent: "Modelos por agente",
    settingsUsageToday: "Uso hoy",
    settingsTestConnection: "Probar conexión",
    settingsSave: "Guardar",
    settingsError: "Error desconocido",
    settingsOpenCodeZenNote: "Acceso a GPT 5.x, Claude 4.x, Gemini 3.x y más",
    settingsLanguage: "Idioma",

    // Agent models panel
    agentModelsTitle: "Agentes",
    agentModelsDescription: "Modelo + persona por agente, además de una agenda diaria opcional (ej: Personal Trainer cada mañana).",
    agentModelsSpecialized: "Solo Nutritionist y Personal Trainer tienen comportamiento especializado real ahora — los demás usan",
    agentModelsDefaultPersona: "su persona predeterminada hasta que reciban lógica real también.",
    agentModelsDefault: "Predeterminado",
    agentModelsModelName: "nombre del modelo",
    agentModelsCustomPersona: "Persona personalizada",
    agentModelsDailySchedule: "Agenda diaria",
    agentModelsSendEveryDayAt: "Enviar todos los días a las",
    agentModelsPersonaPlaceholder: "Persona personalizada para",
    agentModelsSaved: "Guardado ✓",
    agentModelsSave: "Guardar",

    // Model picker
    modelPickerHint: "Haga doble clic en un proveedor para ver sus modelos.",
    modelPickerLoading: "Cargando modelos…",
    modelPickerNotFound: "No se encontraron modelos. Ingrese uno manualmente en Configuraciones si es necesario.",

    // Usage panel
    usageTitle: "Uso Hoy",
    usageBrowserWarning: "El seguimiento de uso solo funciona en la aplicación Electron empaquetada.",
    usageLoading: "Cargando…",
    usageNoRequests: "Sin solicitudes hoy. Envíe un mensaje a Hampton y vuelva aquí.",
    usageTotalRequests: "solicitud(es) en total en todos los proveedores hoy.",
    usageTokenNote: "Los conteos de tokens provienen del reporte de cada proveedor — algunos (como Ollama) solo reportan después de que una respuesta termina.",
    usageVoiceTTS: "Voz (TTS)",

    // Automation panel
    automationTitle: "Automatización — n8n",
    automationN8nNote1: "Orun OS no incluye n8n — es una aplicación separada que usted hospeda (Docker) o ejecuta en n8n Cloud.",
    automationN8nNote2: "Esto se conecta a una instancia que ya tiene en ejecución.",
    automationBrowserWarning: "Ejecutando en el navegador — esto solo funciona en la aplicación Electron empaquetada.",
    automationApiKeySaved: "guardada • encriptada",
    automationApiKeyKeep: "deje en blanco para mantener",
    automationApiKeyPlaceholder: "n8n → Configuraciones → n8n API → Crear",
    automationTestConnection: "Probar conexión y listar workflows",
    automationConnected: "Conectado — {count} workflow(s) encontrado(s).",
    automationAutoTrigger: "Permitir que Hampton dispare automatizaciones automáticamente",
    automationAutoTriggerNote1: "Hampton decidirá por sí solo, en medio de la conversación, cuando una automatización guardada a continuación se ajuste a lo que pediste.",
    automationAutoTriggerNote2: "Solo puede elegir de la lista que usted define — no puede inventar nuevas URLs de webhook.",
    automationSavedTitle: "Automatizaciones guardadas",
    automationNoneYet: "Ninguna aún — agregue una abajo.",
    automationNamePlaceholder: "Nombre (ej: enviar_email)",
    automationDescPlaceholder: "Qué hace (Hampton lee esto para decidir cuándo usarlo)",
    automationAdd: "Agregar automatización",
    automationTriggerNote: "Disparar un workflow (nodo Webhook)",
    automationHeaderName: "Nombre del header (opcional)",
    automationHeaderValue: "Valor del header",
    automationSend: "Enviar",
    automationError: "Error desconocido",

    // Voices picker
    voicesLoadError: "Error al cargar voces — verifique su API key/configuración a continuación.",
    voicesPreview: "Hola, esta es mi voz.",
    voicesHeader: "/voces",
    voicesHint: "Haga doble clic en un proveedor para ver sus voces. Haga clic una vez para escuchar, dos veces para seleccionar.",
    voicesApiKeySaved: "API key guardada • encriptada (deje en blanco para mantener)",
    voicesAzureRegion: "Región Azure (ej: eastus)",
    voicesLocalUrl: "URL del servidor local",
    voicesSaveRefresh: "Guardar y actualizar voces",
    voicesLoading: "Cargando voces…",
    voicesPiperNote: "Piper no tiene API de listado de voces — elija la voz/modelo en el servidor; esto solo usa lo que esté configurado.",
    voicesNotFound: "No se encontraron voces.",

    // WhatsApp panel
    whatsappBrowserWarning: "Solo funciona en la aplicación Electron empaquetada.",
    whatsappDisclaimer1: "Usa una biblioteca no oficial del protocolo WhatsApp Web (Baileys), no la API oficial de Meta.",
    whatsappDisclaimer2: "Esto viola los Términos de Servicio de WhatsApp — riesgo bajo para uso personal, pero no cero.",
    whatsappScanInstruction: "WhatsApp → Dispositivos vinculados → Vincular dispositivo → escanee esto.",
    whatsappConnecting: "Conectando…",
    whatsappConnected: "Conectado",
    whatsappListenChat: "Chat que Orun OS escucha",
    whatsappAutoFill: "Se llena automáticamente con su propio chat al conectar",
    whatsappFoodPhotoNote: "Envíese una foto de comida en este chat y el agente Nutritionist responde con calorías.",
    whatsappTextNote: "Los mensajes de texto van a Hampton. Solo este chat se procesa.",

    // Conversation list
    conversationNew: "Nueva conversación",
    conversationBrowserWarning: "El historial solo está disponible en la aplicación Electron empaquetada.",
    conversationLoading: "Cargando…",
    conversationEmpty: "Sin conversaciones aún.",

    // Chat input
    chatImageAttached: "Imagen adjunta",
    chatAttachPhoto: "Adjuntar una foto (ej: una comida para el agente Nutritionist)",
    chatPlaceholder: "Pregúntale algo a Hampton... (prueba /voces o /model)",
    chatDisclaimer: "Hampton puede cometer errores. Siempre verifique información importante.",

    // Message bubble
    messageEditResend: "Editar y reenviar",
    messageRegenerate: "Regenerar",

    // Common
    commonNone: "Ninguno",
    commonLoading: "Cargando…",
    commonError: "Error desconocido",
  },

  fr: {
    // Boot sequence
    bootInitializing: "Initialisation d'Orun OS...",
    bootMemoryEngine: "Chargement du Moteur de Mémoire...",
    bootAIModels: "Chargement des Modèles d'IA...",
    bootInitializingHampton: "Initialisation de Hampton...",
    bootConnectingLocal: "Connexion de l'IA Locale...",
    bootConnectingCloud: "Connexion de l'IA Cloud...",
    bootLoadingProjects: "Chargement des Projets...",
    bootLoadingUserMemory: "Chargement de la Mémoire Utilisateur...",
    bootPreparingInterface: "Préparation de l'Interface...",
    bootSystemReady: "Système Prêt.",
    bootSequence: "SÉQUENCE DE DÉMARRAGE",
    bootLoading: "CHARGEMENT",

    // Splash screen
    splashBrand: "Grupo Orun",
    splashSolutions: "Solutions Technologiques",

    // Agent roles
    agentCentralIntelligence: "Intelligence Centrale",
    agentCodeEngineering: "Code & Ingénierie",
    agentUIUX: "UI/UX & Visuel",
    agent3DModeling: "3D & Modélisation",
    agentResearchAnalysis: "Recherche & Analyse",
    agentHealthMonitoring: "Surveillance de la Santé",
    agentDietNutrition: "Régime & Nutrition",
    agentFitnessTraining: "Fitness & Entraînement",
    agentBudgetInvestments: "Budget & Investissements",
    agentLearningEducation: "Apprentissage & Éducation",
    agentLanguagesCulture: "Langues & Culture",
    agentVideoProduction: "Production Vidéo",
    agentAudioMusic: "Audio & Musique",
    agentAutomationBots: "Automatisation & Bots",
    agentImageCamera: "IA d'Image & Caméra",
    agentSpeechAudio: "Parole & Audio",
    agentKnowledgeMemory: "Connaissance & Mémoire",
    agentOSConfig: "OS & Configuration",

    // Navigation
    navHome: "Accueil",
    navAgents: "Agents",
    navProjects: "Projets",
    navStudio: "Studio",
    navMemory: "Mémoire",
    navAutomation: "Automatisation",
    navFiles: "Fichiers",

    // Sidebar
    sidebarHistory: "Historique des Conversations",
    sidebarSettings: "Paramètres",
    sidebarProfile: "Profil",

    // Status bar
    statusNativeAI: "IA Native",
    statusConnected: "Connecté",

    // Home screen
    homeWelcomeBack: "Bon retour, Caique.",
    homeHowCanIHelp: "Comment puis-je vous aider aujourd'hui ?",
    homeCloudModels: "Modèles Cloud",
    homeActiveMemory: "Mémoire Active",
    homeListening: "● Écoute",
    homeThinking: "● Réflexion",
    homeSpeaking: "● Parle",
    homeStop: "■ Arrêter",
    homeMuteVoice: "Couper les réponses vocales",
    homeEnableVoice: "Activer les réponses vocales",
    homeNewConversation: "Nouvelle Conversation",
    homeErrorAccess: "Impossible d'accéder au moteur d'IA. Vérifiez Paramètres → Moteur d'IA pour confirmer que le fournisseur est configuré.",
    homeErrorAccessShort: "Impossible d'accéder au moteur d'IA. Vérifiez Paramètres → Moteur d'IA.",

    // Hampton replies
    reply1: "Compris. Je traite votre demande avec toute l'intelligence disponible sur tous les modèles.",
    reply2: "Analyse du contexte en cours. Je vais fournir la réponse la plus précise et utile possible.",
    reply3: "Votre requête a été reçue. Synthèse des informations de tous les systèmes de connaissances connectés.",
    reply4: "Analyse approfondie en cours. Permettez-moi un instant pour formuler la réponse idéale pour vous.",
    reply5: "Traitement terminé. Voici ce que j'ai trouvé basé sur votre demande et le contexte actuel.",

    // Settings panel
    settingsTitle: "Paramètres du Moteur d'IA",
    settingsBrowserWarning: "Exécution dans le navigateur — les paramètres ne fonctionnent que dans l'application Electron empaquetée.",
    settingsModel: "Modèle",
    settingsOllamaModelsError: "impossible de lister — Ollama est-il en cours d'exécution ?",
    settingsRefreshModels: "Actualiser les modèles installés",
    settingsOllamaUrl: "URL Ollama",
    settingsOllamaNote: "Nécessite Ollama en cours d'exécution localement (ollama.com). Aucune donnée ne sort de cette machine.",
    settingsApiKeySaved: "sauvegardée • chiffrée",
    settingsApiKeyPlaceholderGithub: "github_pat_...",
    settingsApiKeyPlaceholder: "sk-...",
    settingsApiKeyKeepPlaceholder: "•••••••••••••••• (laissez vide pour conserver)",
    settingsApiKeyNote: "Stocké chiffré sur cette machine via le keychain du système. Jamais envoyé ailleurs que vers l'API officielle de",
    settingsSystemPrompt: "Prompt système (persona de Hampton)",
    settingsFallbackProvider: "Fournisseur de secours (utilisé automatiquement si le principal échoue)",
    settingsFallbackNone: "Aucun",
    settingsModelName: "nom du modèle",
    settingsRunInBackground: "Garder en arrière-plan",
    settingsWakeWord: "Dites \"Hampton\" ou \"Orun\" pour discuter",
    settingsWakeWordBeta: "(bêta)",
    settingsWakeWordNote: "Utilise la reconnaissance vocale intégrée du navigateur — l'audio est envoyé aux serveurs Google pour transcription, pas traité localement.",
    settingsWhatsAppConnector: "Connecteur WhatsApp",
    settingsCheckUpdates: "Vérifier les mises à jour",
    settingsLatestVersion: "Vous êtes sur la dernière version.",
    settingsUpdateAvailable: "Mise à jour disponible — téléchargement…",
    settingsDownloadingUpdate: "Téléchargement de la mise à jour…",
    settingsRestartInstall: "Redémarrer et installer la mise à jour",
    settingsUpdateFailed: "Échec de la vérification des mises à jour.",
    settingsModelsPerAgent: "Modèles par agent",
    settingsUsageToday: "Utilisation aujourd'hui",
    settingsTestConnection: "Tester la connexion",
    settingsSave: "Enregistrer",
    settingsError: "Erreur inconnue",
    settingsOpenCodeZenNote: "Accès à GPT 5.x, Claude 4.x, Gemini 3.x et plus",
    settingsLanguage: "Langue",

    // Agent models panel
    agentModelsTitle: "Agents",
    agentModelsDescription: "Modèle + persona par agent, plus un emploi du temps optionnel (ex: Personal Trainer chaque matin).",
    agentModelsSpecialized: "Seuls Nutritionist et Personal Trainer ont un vrai comportement spécialisé — les autres utilisent",
    agentModelsDefaultPersona: "leur persona par défaut jusqu'à ce qu'ils reçoivent aussi une vraie logique.",
    agentModelsDefault: "Par défaut",
    agentModelsModelName: "nom du modèle",
    agentModelsCustomPersona: "Persona personnalisée",
    agentModelsDailySchedule: "Emploi du temps",
    agentModelsSendEveryDayAt: "Envoyer chaque jour à",
    agentModelsPersonaPlaceholder: "Persona personnalisée pour",
    agentModelsSaved: "Enregistré ✓",
    agentModelsSave: "Enregistrer",

    // Model picker
    modelPickerHint: "Double-cliquez sur un fournisseur pour voir ses modèles.",
    modelPickerLoading: "Chargement des modèles…",
    modelPickerNotFound: "Aucun modèle trouvé. Entrez-en un manuellement dans les Paramètres si nécessaire.",

    // Usage panel
    usageTitle: "Utilisation Aujourd'hui",
    usageBrowserWarning: "Le suivi d'utilisation ne fonctionne que dans l'application Electron empaquetée.",
    usageLoading: "Chargement…",
    usageNoRequests: "Aucune requête aujourd'hui. Envoyez un message à Hampton et revenez ici.",
    usageTotalRequests: "requête(s) au total sur tous les fournisseurs aujourd'hui.",
    usageTokenNote: "Les comptages de tokens viennent du rapport de chaque fournisseur — certains (comme Ollama) ne rapportent qu'après qu'une réponse se termine.",
    usageVoiceTTS: "Voix (TTS)",

    // Automation panel
    automationTitle: "Automatisation — n8n",
    automationN8nNote1: "Orun OS n'inclut pas n8n — c'est une application séparée que vous hébergez (Docker) ou exécutez sur n8n Cloud.",
    automationN8nNote2: "Ceci se connecte à une instance que vous avez déjà en cours d'exécution.",
    automationBrowserWarning: "Exécution dans le navigateur — ceci ne fonctionne que dans l'application Electron empaquetée.",
    automationApiKeySaved: "sauvegardée • chiffrée",
    automationApiKeyKeep: "laissez vide pour conserver",
    automationApiKeyPlaceholder: "n8n → Paramètres → n8n API → Créer",
    automationTestConnection: "Tester la connexion et lister les workflows",
    automationConnected: "Connecté — {count} workflow(s) trouvé(s).",
    automationAutoTrigger: "Permettre à Hampton de déclencher les automatismes automatiquement",
    automationAutoTriggerNote1: "Hampton décidera de lui-même, au milieu de la conversation, quand une automatisme enregistrée ci-dessous correspond à ce que vous avez demandé.",
    automationAutoTriggerNote2: "Il ne peut choisir que dans la liste que vous définissez — il ne peut pas inventer de nouvelles URLs de webhook.",
    automationSavedTitle: "Automatismes enregistrés",
    automationNoneYet: "Aucun pour l'instant — ajoutez-en un ci-dessous.",
    automationNamePlaceholder: "Nom (ex: envoyer_email)",
    automationDescPlaceholder: "Ce qu'il fait (Hampton lit ceci pour décider quand l'utiliser)",
    automationAdd: "Ajouter un automatisme",
    automationTriggerNote: "Déclencher un workflow (nœud Webhook)",
    automationHeaderName: "Nom du header (optionnel)",
    automationHeaderValue: "Valeur du header",
    automationSend: "Envoyer",
    automationError: "Erreur inconnue",

    // Voices picker
    voicesLoadError: "Échec du chargement des voix — vérifiez votre API key/configuration ci-dessous.",
    voicesPreview: "Bonjour, c'est ma voix.",
    voicesHeader: "/voix",
    voicesHint: "Double-cliquez sur un fournisseur pour voir ses voix. Cliquez une fois pour écouter, deux fois pour sélectionner.",
    voicesApiKeySaved: "API key sauvegardée • chiffrée (laissez vide pour conserver)",
    voicesAzureRegion: "Région Azure (ex : eastus)",
    voicesLocalUrl: "URL du serveur local",
    voicesSaveRefresh: "Enregistrer et actualiser les voix",
    voicesLoading: "Chargement des voix…",
    voicesPiperNote: "Piper n'a pas d'API de listage des voix — choisissez la voix/le modèle sur le serveur ; ceci utilise juste ce qui est configuré.",
    voicesNotFound: "Aucune voix trouvée.",

    // WhatsApp panel
    whatsappBrowserWarning: "Ne fonctionne que dans l'application Electron empaquetée.",
    whatsappDisclaimer1: "Utilise une bibliothèque non officielle du protocole WhatsApp Web (Baileys), pas l'API officielle de Meta.",
    whatsappDisclaimer2: "Cela viole les Conditions d'Utilisation de WhatsApp — faible risque pour un usage personnel, mais pas zéro.",
    whatsappScanInstruction: "WhatsApp → Appareils liés → Connecter un appareil → scannez ceci.",
    whatsappConnecting: "Connexion…",
    whatsappConnected: "Connecté",
    whatsappListenChat: "Chat qu'Orun OS écoute",
    whatsappAutoFill: "Rempli automatiquement avec votre propre chat lors de la connexion",
    whatsappFoodPhotoNote: "Envoyez-vous une photo de nourriture dans ce chat et l'agent Nutritionist répond avec les calories.",
    whatsappTextNote: "Les messages texte vont à Hampton. Seul ce chat est traité.",

    // Conversation list
    conversationNew: "Nouvelle conversation",
    conversationBrowserWarning: "L'historique n'est disponible que dans l'application Electron empaquetée.",
    conversationLoading: "Chargement…",
    conversationEmpty: "Aucune conversation pour l'instant.",

    // Chat input
    chatImageAttached: "Image jointe",
    chatAttachPhoto: "Joindre une photo (ex: un repas pour l'agent Nutritionist)",
    chatPlaceholder: "Demandez quelque chose à Hampton... (essayez /voix ou /model)",
    chatDisclaimer: "Hampton peut faire des erreurs. Vérifiez toujours les informations importantes.",

    // Message bubble
    messageEditResend: "Modifier et renvoyer",
    messageRegenerate: "Régénérer",

    // Common
    commonNone: "Aucun",
    commonLoading: "Chargement…",
    commonError: "Erreur inconnue",
  },
};
