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
  agentAutomotive: string;
  agentSocialMedia: string;
  agentDesignVisual: string;
  agentAudiovisualContent: string;
  agentHealth: string;
  agentLearningLanguages: string;
  agentMarketingSocial: string;
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
  sidebarHome: string;

  // Status bar
  statusNativeAI: string;
  statusConnected: string;
  statusHamptonOnline: string;
  statusChangeModel: string;

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
  settings_wake_word: string;
  settings_wake_word_desc: string;
  settingsBackgroundListen: string;
  settingsBackgroundListenDesc: string;
  settingsWakeServiceRunning: string;
  settingsWakeServiceStopped: string;
  settingsWakeServiceRestart: string;
  settingsWakeServiceTest: string;
  settingsWakeDiagnosticPackages: string;
  settingsWakeDiagnosticPort: string;
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
  settingsTheme: string;
  settingsThemeDark: string;
  settingsThemeLight: string;
  settingsThemeSystem: string;
  settingsFalAiNote: string;
  settingsFalAiPlaceholder: string;
  settingsSaved: string;
  settingsHome: string;
  settingsTabAI: string;
  settingsTabIntegrations: string;
  settingsTabAppearance: string;
  settingsTabSystem: string;
  settingsVoiceSystem: string;
  settingsConversationalMode: string;
  settingsConversationalModeDesc: string;
  settingsNoiseSuppression: string;
  settingsNoiseSuppressionDesc: string;
  settingsResponseDelay: string;
  settingsResponseDelayDesc: string;
  settingsWhatsAppSection: string;
  settingsWhatsAppDesc: string;
  settingsPersonaSection: string;
  settingsAppearanceSection: string;
  settingsSecuritySection: string;
  settingsExecutionSection: string;
  settingsRunInBackgroundDesc: string;
  settingsStartWithWindows: string;
  settingsStartWithWindowsDesc: string;
  settingsAgentsSection: string;
  settingsUpdatesSection: string;
  settingsDownloading: string;
  closeWorkspace: string;
  loadingWorkspace: string;
  slashHistory: string;
  slashHistoryDesc: string;
  slashClear: string;
  slashClearDesc: string;
  slashSummarize: string;
  slashSummarizeDesc: string;
  slashExport: string;
  slashExportDesc: string;
  slashVoices: string;
  slashVoicesDesc: string;
  slashModel: string;
  slashModelDesc: string;
  slashMemory: string;
  slashMemoryDesc: string;
  slashAgents: string;
  slashAgentsDesc: string;
  slashHelp: string;
  slashHelpDesc: string;
  conversationSearchEmpty: string;
  onboardingWelcome: string;
  onboardingWelcomeSub: string;
  onboardingWelcomeDesc: string;
  onboardingProvider: string;
  onboardingProviderSub: string;
  onboardingProviderDesc: string;
  onboardingProviderFree: string;
  onboardingAgent: string;
  onboardingAgentSub: string;
  onboardingAgentDesc: string;
  onboardingAgentFeature1: string;
  onboardingAgentFeature2: string;
  onboardingAgentFeature3: string;
  onboardingAgentFeature4: string;
  onboardingReady: string;
  onboardingReadySub: string;
  onboardingReadyDesc: string;
  onboardingApiKey: string;
  onboardingKeyValid: string;
  onboardingKeyInvalid: string;
  onboardingSkip: string;
  onboardingDontShow: string;
  onboardingBack: string;
  onboardingNext: string;
  onboardingStart: string;
  errorBoundaryMessage: string;
  errorBoundaryReload: string;
  ariaStartDictation: string;
  ariaStopDictation: string;
  ariaSendMessage: string;
  offlineMessage: string;
  settingsBackupSection: string;
  settingsRestoreConfirm: string;
  ariaCancelEdit: string;
  ariaConfirmEdit: string;
  ariaEditMessage: string;
  ariaRegenerate: string;
  ariaDeleteProject: string;
  statusOnline: string;
  statusOffline: string;
  loadingConversation: string;
  encryptionWeakMode: string;
  close: string;
  skipToContent: string;
  // Profile panel
  profileTitle: string;
  profileName: string;
  profileNamePlaceholder: string;
  profilePhoto: string;
  profilePhotoChange: string;
  profilePhotoRemove: string;
  profileVoiceRecording: string;
  profileVoiceRecord: string;
  profileVoiceStop: string;
  profileVoiceUse: string;
  profileVoiceDelete: string;
  profileSaved: string;
  profileSave: string;
  conversations: string;
  slashCommands: string;

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
  voiceNoSTTFallback: string;

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
  whatsappHealthDesc: string;
  whatsappFinanceDesc: string;
  whatsappTrainerDesc: string;
  whatsappAssistantDesc: string;
  whatsappSocialDesc: string;
  whatsappTestSent: string;
  whatsappTestError: string;
  whatsappTestSendTo: string;
  whatsappJidHelp: string;

  // Conversation list
  conversationNew: string;
  conversationBrowserWarning: string;
  conversationLoading: string;
  conversationEmpty: string;
  conversationSearch: string;

  // Chat input
  chatImageAttached: string;
  chatAttachPhoto: string;
  chatPlaceholder: string;
  chatDisclaimer: string;
  chatFileTooLarge: string;
  chatUnsupportedFile: string;

  // Message bubble
  messageEditResend: string;
  messageRegenerate: string;

  // Message bubble — tool labels
  toolReadingFile: string;
  toolWritingFile: string;
  toolEditingFile: string;
  toolListingFiles: string;
  toolSearchingFiles: string;
  toolSearchingContent: string;
  toolRunningCommand: string;
  toolFetchingUrl: string;
  toolSavingMemory: string;
  toolSearchingMemory: string;
  toolSendingNotification: string;
  toolSchedulingTask: string;
  toolDone: string;
  toolWorking: string;

  // Schedules panel
  schedulesTitle: string;
  schedulesDescription: string;
  schedulesHealthGoals: string;
  schedulesCurrentWeight: string;
  schedulesTargetWeight: string;
  schedulesHeight: string;
  schedulesStartWeight: string;
  schedulesSaveGoals: string;
  schedulesSaved: string;
  schedulesWeightCurrent: string;
  schedulesWeightChange: string;
  schedulesWeightLost: string;
  schedulesTarget: string;
  schedulesRemaining: string;
  schedulesLogWeight: string;
  schedulesRegister: string;
  schedulesSocialMediaAuto: string;
  schedulesSocialMediaDesc: string;
  schedulesAutoEnable: string;
  schedulesStart: string;
  schedulesHourly: string;
  schedulesOtherAgents: string;
  schedulesFooter: string;
  schedulesHealth: string;
  schedulesHealthDesc: string;
  schedulesPersonalTrainer: string;
  schedulesPersonalTrainerDesc: string;
  schedulesPersonalAssistant: string;
  schedulesPersonalAssistantDesc: string;
  schedulesSocialMedia: string;
  schedulesSocialMediaAgentDesc: string;
  schedulesFinance: string;
  schedulesMarketing: string;

  // Agent data panel
  agentDataFinanceLog: string;
  agentDataHealthMetrics: string;
  agentDataCodeReviews: string;
  agentDataLearningProgress: string;
  agentDataVideoProjects: string;
  agentDataImage3D: string;
  agentDataMusicProjects: string;
  agentDataLoading: string;
  agentDataIncome: string;
  agentDataExpenses: string;
  agentDataBalance: string;
  agentDataNoTransactions: string;
  agentDataNoHealth: string;
  agentDataNoCodeReviews: string;
  agentDataNoLearning: string;
  agentDataNoVideo: string;
  agentDataNoGenerations: string;
  agentDataNoMusic: string;
  agentDataNoCreator: string;
  agentDataHealthLog: string;
  agentDataCreatorProjects: string;
  agentDataDesigns: string;
  agentDataNutritionToday: string;
  agentDataProtein: string;
  agentDataCarbs: string;
  agentDataFat: string;

  // Social media panel
  socialMediaStoriesDesc: string;
  socialMediaReelsDesc: string;
  socialMediaCarouselDesc: string;
  socialMediaTikTokDesc: string;
  socialMediaXPostDesc: string;
  socialMediaXThreadDesc: string;
  socialMediaHook1: string;
  socialMediaHook2: string;
  socialMediaHook3: string;
  socialMediaHook4: string;
  socialMediaHook5: string;
  socialMediaHook6: string;
  socialMediaHook7: string;
  socialMediaHook8: string;
  socialMediaImageUrl: string;
  socialMediaMediaUrl: string;
  socialMediaGeneratedPrompt: string;
  socialMediaCopied: string;
  socialMediaCopy: string;
  socialMediaPublish: string;

  // WhatsApp panel — automation
  wa_chat_personal_optional: string;
  wa_chat_personal_desc: string;
  wa_urgente_meeting: string;
  wa_option_notify: string;
  wa_option_task: string;
  wa_option_summary: string;
  wa_n8n_webhook_desc: string;
  wa_n8n_placeholder: string;
  wa_save: string;
  wa_broadcast_desc: string;
  wa_message_placeholder: string;
  wa_send_to_n_groups: string;
  wa_summary: string;

  // Social Media panel — additional
  social_topic_label: string;
  social_topic_placeholder: string;
  social_hook_label: string;
  social_photo_placeholder: string;

  // Common
  commonNone: string;
  commonLoading: string;
  commonError: string;

  // Command Palette
  commandPalettePlaceholder: string;
  commandPaletteNoResults: string;

  // Slash Commands
  slashHistorico: string;
  slashLimpar: string;
  slashResumir: string;
  slashExportar: string;
  slashMemoria: string;
  slashAgentes: string;
  slashAjuda: string;

  // Plugin System
  plugins: string;
  pluginsEmpty: string;
  pluginsLoad: string;
  pluginsUnload: string;
  pluginsLoaded: string;
  pluginsError: string;

  // MCP
  mcp: string;
  mcpEmpty: string;
  mcpAdd: string;
  mcpRemove: string;

  // Keyboard Shortcuts
  shortcutsTitle: string;

  // Skeleton
  skeletonLoading: string;
  skeletonLoadingMessages: string;
  skeletonLoadingAgents: string;
  skeletonLoadingSettings: string;

  // Agent Health
  agent_health_description: string;
  agent_health_tagline: string;
  agent_health_quick_action_meal_analysis_label: string;
  agent_health_quick_action_meal_analysis_prompt: string;
  agent_health_quick_action_workout_label: string;
  agent_health_quick_action_workout_prompt: string;
  agent_health_quick_action_log_weight_label: string;
  agent_health_quick_action_log_weight_prompt: string;
  agent_health_quick_action_view_goals_label: string;
  agent_health_quick_action_view_goals_prompt: string;
  agent_health_quick_action_schedule_appointment_label: string;
  agent_health_quick_action_schedule_appointment_prompt: string;
  agent_health_quick_action_exams_label: string;
  agent_health_quick_action_exams_prompt: string;
  agent_health_stat_bmi: string;
  agent_health_stat_steps_today: string;
  agent_health_stat_heart_rate: string;
  agent_health_stat_water: string;

  // Agent Finance
  agent_finance_description: string;
  agent_finance_tagline: string;
  agent_finance_quick_action_log_expense_label: string;
  agent_finance_quick_action_log_expense_prompt: string;
  agent_finance_quick_action_log_income_label: string;
  agent_finance_quick_action_log_income_prompt: string;
  agent_finance_quick_action_monthly_balance_label: string;
  agent_finance_quick_action_monthly_balance_prompt: string;
  agent_finance_quick_action_budget_label: string;
  agent_finance_quick_action_budget_prompt: string;
  agent_finance_quick_action_investments_label: string;
  agent_finance_quick_action_investments_prompt: string;
  agent_finance_quick_action_financial_goals_label: string;
  agent_finance_quick_action_financial_goals_prompt: string;
  agent_finance_stat_balance: string;
  agent_finance_stat_income: string;
  agent_finance_stat_expenses: string;
  agent_finance_stat_savings: string;

  // Agent Developer
  agent_developer_description: string;
  agent_developer_tagline: string;
  agent_developer_quick_action_review_code_label: string;
  agent_developer_quick_action_review_code_prompt: string;
  agent_developer_quick_action_debug_label: string;
  agent_developer_quick_action_debug_prompt: string;
  agent_developer_quick_action_new_feature_label: string;
  agent_developer_quick_action_new_feature_prompt: string;
  agent_developer_quick_action_code_review_label: string;
  agent_developer_quick_action_code_review_prompt: string;
  agent_developer_quick_action_architecture_label: string;
  agent_developer_quick_action_architecture_prompt: string;
  agent_developer_quick_action_tests_label: string;
  agent_developer_quick_action_tests_prompt: string;
  agent_developer_stat_commits: string;
  agent_developer_stat_issues: string;
  agent_developer_stat_prs: string;
  agent_developer_stat_uptime: string;

  // Agent Marketing
  agent_marketing_description: string;
  agent_marketing_tagline: string;
  agent_marketing_quick_action_viral_post_label: string;
  agent_marketing_quick_action_viral_post_prompt: string;
  agent_marketing_quick_action_campaign_label: string;
  agent_marketing_quick_action_campaign_prompt: string;
  agent_marketing_quick_action_persuasive_copy_label: string;
  agent_marketing_quick_action_persuasive_copy_prompt: string;
  agent_marketing_quick_action_storytelling_label: string;
  agent_marketing_quick_action_storytelling_prompt: string;
  agent_marketing_quick_action_metrics_analysis_label: string;
  agent_marketing_quick_action_metrics_analysis_prompt: string;
  agent_marketing_quick_action_calendar_label: string;
  agent_marketing_quick_action_calendar_prompt: string;
  agent_marketing_stat_reach: string;
  agent_marketing_stat_engagement: string;
  agent_marketing_stat_posts: string;
  agent_marketing_stat_leads: string;

  // Agent Designer
  agent_designer_description: string;
  agent_designer_tagline: string;
  agent_designer_quick_action_generate_image_label: string;
  agent_designer_quick_action_generate_image_prompt: string;
  agent_designer_quick_action_3d_model_label: string;
  agent_designer_quick_action_3d_model_prompt: string;
  agent_designer_quick_action_uiux_design_label: string;
  agent_designer_quick_action_uiux_design_prompt: string;
  agent_designer_quick_action_icons_label: string;
  agent_designer_quick_action_icons_prompt: string;
  agent_designer_quick_action_color_palette_label: string;
  agent_designer_quick_action_color_palette_prompt: string;
  agent_designer_quick_action_prototype_label: string;
  agent_designer_quick_action_prototype_prompt: string;
  agent_designer_stat_images: string;
  agent_designer_stat_3d_models: string;
  agent_designer_stat_prototypes: string;
  agent_designer_stat_styles: string;

  // Agent Creator
  agent_creator_description: string;
  agent_creator_tagline: string;
  agent_creator_quick_action_create_video_label: string;
  agent_creator_quick_action_create_video_prompt: string;
  agent_creator_quick_action_create_music_label: string;
  agent_creator_quick_action_create_music_prompt: string;
  agent_creator_quick_action_edit_video_label: string;
  agent_creator_quick_action_edit_video_prompt: string;
  agent_creator_quick_action_podcast_label: string;
  agent_creator_quick_action_podcast_prompt: string;
  agent_creator_quick_action_sound_effects_label: string;
  agent_creator_quick_action_sound_effects_prompt: string;
  agent_creator_quick_action_mixing_label: string;
  agent_creator_quick_action_mixing_prompt: string;
  agent_creator_stat_videos: string;
  agent_creator_stat_music: string;
  agent_creator_stat_podcasts: string;
  agent_creator_stat_hours: string;

  // Agent Teacher
  agent_teacher_description: string;
  agent_teacher_tagline: string;
  agent_teacher_quick_action_study_plan_label: string;
  agent_teacher_quick_action_study_plan_prompt: string;
  agent_teacher_quick_action_translate_label: string;
  agent_teacher_quick_action_translate_prompt: string;
  agent_teacher_quick_action_quiz_label: string;
  agent_teacher_quick_action_quiz_prompt: string;
  agent_teacher_quick_action_summary_label: string;
  agent_teacher_quick_action_summary_prompt: string;
  agent_teacher_quick_action_explain_label: string;
  agent_teacher_quick_action_explain_prompt: string;
  agent_teacher_quick_action_flashcards_label: string;
  agent_teacher_quick_action_flashcards_prompt: string;
  agent_teacher_stat_lessons: string;
  agent_teacher_stat_quizzes: string;
  agent_teacher_stat_languages: string;
  agent_teacher_stat_hours: string;

  // Agent Automation
  agent_automation_description: string;
  agent_automation_tagline: string;
  agent_automation_quick_action_create_workflow_label: string;
  agent_automation_quick_action_create_workflow_prompt: string;
  agent_automation_quick_action_config_bot_label: string;
  agent_automation_quick_action_config_bot_prompt: string;
  agent_automation_quick_action_test_webhook_label: string;
  agent_automation_quick_action_test_webhook_prompt: string;
  agent_automation_quick_action_list_automations_label: string;
  agent_automation_quick_action_list_automations_prompt: string;
  agent_automation_quick_action_trigger_agent_label: string;
  agent_automation_quick_action_trigger_agent_prompt: string;
  agent_automation_quick_action_monitor_label: string;
  agent_automation_quick_action_monitor_prompt: string;
  agent_automation_stat_workflows: string;
  agent_automation_stat_triggers: string;
  agent_automation_stat_executions: string;
  agent_automation_stat_success: string;

  // Agent System
  agent_system_description: string;
  agent_system_tagline: string;
  agent_system_quick_action_config_ai_label: string;
  agent_system_quick_action_config_ai_prompt: string;
  agent_system_quick_action_diagnose_label: string;
  agent_system_quick_action_diagnose_prompt: string;
  agent_system_quick_action_clear_cache_label: string;
  agent_system_quick_action_clear_cache_prompt: string;
  agent_system_quick_action_backup_label: string;
  agent_system_quick_action_backup_prompt: string;
  agent_system_quick_action_security_label: string;
  agent_system_quick_action_security_prompt: string;
  agent_system_quick_action_performance_label: string;
  agent_system_quick_action_performance_prompt: string;
  agent_system_stat_cpu: string;
  agent_system_stat_ram: string;
  agent_system_stat_disk: string;
  agent_system_stat_uptime: string;

  // Agent Automotive
  agent_automotive_description: string;
  agent_automotive_tagline: string;
  agent_automotive_quick_action_diagnostic_label: string;
  agent_automotive_quick_action_diagnostic_prompt: string;
  agent_automotive_quick_action_fines_inquiry_label: string;
  agent_automotive_quick_action_fines_inquiry_prompt: string;
  agent_automotive_quick_action_documents_label: string;
  agent_automotive_quick_action_documents_prompt: string;
  agent_automotive_quick_action_parts_label: string;
  agent_automotive_quick_action_parts_prompt: string;
  agent_automotive_quick_action_change_car_label: string;
  agent_automotive_quick_action_change_car_prompt: string;
  agent_automotive_quick_action_maintenance_label: string;
  agent_automotive_quick_action_maintenance_prompt: string;
  agent_automotive_stat_km: string;
  agent_automotive_stat_next_service: string;
  agent_automotive_stat_documents: string;
  agent_automotive_stat_fuel_consumption: string;

  // Agent Hampton
  agent_hampton_description: string;
  agent_hampton_tagline: string;
  agent_hampton_quick_action_chat_label: string;
  agent_hampton_quick_action_chat_prompt: string;
  agent_hampton_quick_action_web_search_label: string;
  agent_hampton_quick_action_web_search_prompt: string;
  agent_hampton_quick_action_analyze_label: string;
  agent_hampton_quick_action_analyze_prompt: string;
  agent_hampton_quick_action_automate_label: string;
  agent_hampton_quick_action_automate_prompt: string;
  agent_hampton_stat_messages: string;
  agent_hampton_stat_tools: string;
  agent_hampton_stat_memory: string;
  agent_hampton_stat_uptime: string;

  // Agent Page UI
  agent_quick_actions_title: string;
  agent_open_workspace: string;
  agent_chat_with_ai: string;
  agent_start_session: string;

  // Projects Panel
  projects_title: string;
  projects_filter_all: string;
  projects_filter_active: string;
  projects_filter_archived: string;
  projects_new_button: string;
  projects_name_placeholder: string;
  projects_description_placeholder: string;
  projects_create_button: string;
  projects_cancel_button: string;

  // Command Palette
  command_palette_home_label: string;
  command_palette_home_description: string;
  command_palette_section_navigation: string;
  command_palette_agents_label: string;
  command_palette_agents_description: string;
  command_palette_projects_label: string;
  command_palette_projects_description: string;
  command_palette_settings_label: string;
  command_palette_settings_description: string;
  command_palette_new_chat_label: string;
  command_palette_new_chat_description: string;
  command_palette_section_actions: string;
  command_palette_history_label: string;
  command_palette_history_description: string;
  command_palette_agent_description: string;
  command_palette_section_agents: string;
  command_palette_search_placeholder: string;
  command_palette_no_results: string;

  // Memory Panel
  memory_title: string;
  memory_search_placeholder: string;

  // Settings Panel
  settings_section_language: string;
  settings_section_ai_provider: string;
  settings_section_model: string;
  settings_section_connection: string;
  settings_ollama_url_desc: string;
  settings_api_key_label: string;
  settings_api_key_saved: string;
  settings_api_key_desc: string;
  settings_api_key_placeholder: string;
  settings_fallback_provider_label: string;
  settings_fallback_provider_desc: string;
  settings_none: string;
  settings_whatsapp_connector_label: string;
  settings_whatsapp_connector_desc: string;
  settings_section_tts: string;
  settings_tts_engine_label: string;
  settings_tts_engine_desc: string;
  settings_tts_voice_label: string;
  settings_tts_voice_desc: string;
  settings_tts_fallback_info: string;
  settings_agent_models_button: string;
  settings_usage_button: string;

  // Automotive Garage
  automotive_service_type_oil_change: string;
  automotive_service_type_general_revision: string;
  automotive_service_type_brakes: string;
  automotive_service_type_suspension: string;
  automotive_service_type_engine: string;
  automotive_service_type_transmission: string;
  automotive_service_type_electrical: string;
  automotive_service_type_air_conditioning: string;
  automotive_service_type_tires: string;
  automotive_service_type_alignment: string;
  automotive_service_type_balancing: string;
  automotive_service_type_other: string;
  automotive_expense_category_fuel: string;
  automotive_expense_category_parking: string;
  automotive_expense_category_toll: string;
  automotive_expense_category_fine: string;
  automotive_expense_category_insurance: string;
  automotive_expense_category_ipva: string;
  automotive_expense_category_registration: string;
  automotive_expense_category_wash: string;
  automotive_expense_category_accessories: string;
  automotive_expense_category_other: string;
  automotive_unknown_vehicle: string;
  automotive_nav_overview: string;
  automotive_nav_vehicles: string;
  automotive_nav_services: string;
  automotive_nav_expenses: string;
  automotive_header_title: string;
  automotive_header_subtitle: string;
  automotive_filter_label: string;
  automotive_filter_all: string;
  automotive_overview_stat_vehicles: string;
  automotive_overview_stat_services: string;
  automotive_overview_stat_total_expenses: string;
  automotive_overview_stat_total_services: string;
  automotive_overview_new_vehicle_title: string;
  automotive_overview_new_vehicle_desc: string;
  automotive_overview_new_service_title: string;
  automotive_overview_new_service_desc: string;
  automotive_overview_new_expense_title: string;
  automotive_overview_new_expense_desc: string;
  automotive_overview_recent_activity: string;
  automotive_overview_no_activity: string;
  automotive_vehicles_title: string;
  automotive_vehicles_add_button: string;
  automotive_vehicles_empty_title: string;
  automotive_vehicles_empty_desc: string;
  automotive_services_title: string;
  automotive_services_add_button: string;
  automotive_services_empty: string;
  automotive_services_no_shop: string;
  automotive_expenses_title: string;
  automotive_expenses_add_button: string;
  automotive_expenses_empty: string;
  automotive_modal_add_vehicle_title: string;
  automotive_field_name: string;
  automotive_field_name_placeholder: string;
  automotive_field_year: string;
  automotive_field_model: string;
  automotive_field_plate: string;
  automotive_field_color: string;
  automotive_field_color_placeholder: string;
  automotive_field_mileage: string;
  automotive_modal_add_vehicle_button: string;
  automotive_modal_add_service_title: string;
  automotive_field_vehicle: string;
  automotive_field_service_type: string;
  automotive_field_description: string;
  automotive_field_description_placeholder: string;
  automotive_field_cost: string;
  automotive_field_current_km: string;
  automotive_field_shop: string;
  automotive_modal_add_service_button: string;
  automotive_add_vehicle_first: string;
  automotive_modal_add_expense_title: string;
  automotive_field_category: string;
  automotive_field_expense_desc_placeholder: string;
  automotive_field_amount: string;
  automotive_modal_add_expense_button: string;

  // Developer IDE
  developer_ide_explorer_label: string;
  developer_ide_import_button: string;
  developer_ide_no_file_open: string;
  developer_ide_terminal_help: string;
  developer_ide_terminal_placeholder: string;
  developer_ide_terminal_label: string;
  developer_ide_show_terminal: string;

  // System Console
  system_console_welcome: string;
  system_console_help_title: string;
  system_console_help_help: string;
  system_console_help_clear: string;
  system_console_help_date: string;
  system_console_help_echo: string;
  system_console_help_uptime: string;
  system_console_help_version: string;
  system_console_help_agents: string;
  system_console_help_ram: string;
  system_console_help_clearmemory: string;
  system_console_uptime: string;
  system_console_version: string;
  system_console_agents_list_1: string;
  system_console_agents_list_2: string;
  system_console_agents_list_3: string;
  system_console_ram_device: string;
  system_console_ram_available: string;
  system_console_command_not_found: string;
  system_console_cleared: string;
  system_console_history_cleared: string;
  system_console_resource_cpu: string;
  system_console_resource_ram: string;
  system_console_resource_disk: string;
  system_console_placeholder: string;

  // Designer
  designer_template_instagram_post: string;
  designer_template_story: string;
  designer_template_thumbnail: string;
  designer_template_logo: string;
  designer_template_presentation: string;
  designer_shape_rectangle: string;
  designer_shape_circle: string;
  designer_shape_triangle: string;
  designer_shape_star: string;
  designer_shape_line: string;
  designer_icon_heart: string;
  designer_icon_bolt: string;
  designer_icon_sun: string;
  designer_tool_select: string;
  designer_tool_text: string;
  designer_tool_shape: string;
  designer_tool_image: string;
  designer_tool_draw: string;
  designer_tool_delete: string;
  designer_toast_png_copied: string;
  designer_toast_png_saved: string;
  designer_toast_svg_exported: string;
  designer_zoom_fit: string;
  designer_import_button: string;
  designer_export_button: string;
  designer_share_button: string;
  designer_tab_templates: string;
  designer_tab_elements: string;
  designer_tab_text: string;
  designer_tab_uploads: string;
  designer_tab_background: string;
  designer_templates_section_title: string;
  designer_elements_section_shapes: string;
  designer_elements_section_icons: string;
  designer_elements_section_decorative: string;
  designer_text_add_title: string;
  designer_text_add_subtitle: string;
  designer_text_add_body: string;
  designer_uploads_drag_here: string;
  designer_uploads_or_click: string;
  designer_background_solid_colors: string;
  designer_background_gradients: string;
  designer_panel_design_name: string;
  designer_panel_canvas_size: string;
  designer_panel_width: string;
  designer_panel_height: string;
  designer_panel_background_color: string;
  designer_panel_select_element_hint: string;
  designer_panel_position: string;
  designer_panel_size: string;
  designer_panel_rotation: string;
  designer_panel_opacity: string;
  designer_panel_text: string;
  designer_panel_font_size: string;
  designer_panel_font_family: string;
  designer_panel_style: string;
  designer_panel_text_color: string;
  designer_panel_fill_color: string;
  designer_panel_border_color: string;
  designer_panel_none: string;
  designer_panel_border_width: string;
  designer_panel_layer_order: string;
  designer_panel_bring_front: string;
  designer_panel_send_back: string;
  designer_canvas_drag_image: string;

  // Creator Audio
  creator_audio_deck: string;
  creator_audio_bpm: string;
  creator_audio_pitch: string;
  creator_audio_sync: string;
  creator_audio_cue: string;
  creator_audio_play: string;
  creator_audio_pause: string;
  creator_audio_stop: string;
  creator_audio_rec: string;
  creator_audio_mixer: string;
  creator_audio_master: string;
  creator_audio_crossfader: string;
  creator_audio_headphones: string;
  creator_audio_cue_mix: string;
  creator_audio_effects: string;
  creator_audio_samples: string;
  creator_audio_recording: string;
  creator_audio_format: string;
  creator_audio_quality: string;
  creator_audio_export: string;
  creator_audio_import: string;
  creator_audio_recording_status: string;
  creator_audio_ready: string;
  creator_audio_storage: string;
  creator_audio_tempo: string;
  creator_audio_hi: string;
  creator_audio_mid: string;
  creator_audio_lo: string;
  creator_audio_pan: string;
  creator_audio_wet: string;
  creator_audio_par_x: string;
  creator_audio_par_y: string;
  creator_audio_low: string;
  creator_audio_mid_freq: string;
  creator_audio_high: string;
  creator_audio_solo: string;
  creator_audio_mute: string;
  creator_audio_open: string;
  creator_audio_volume: string;
  creator_audio_none: string;
  creator_audio_imported: string;
  creator_audio_loaded: string;
  creator_audio_error_no_audio: string;
  // Creator Video
  creator_video_select: string;
  creator_video_trim: string;
  creator_video_split: string;
  creator_video_delete: string;
  creator_video_copy: string;
  creator_video_paste: string;
  creator_video_undo: string;
  creator_video_redo: string;
  creator_video_export: string;
  creator_video_media: string;
  creator_video_text: string;
  creator_video_effects: string;
  creator_video_transitions: string;
  creator_video_import: string;
  creator_video_mixer: string;
  creator_video_master: string;
  creator_video_position: string;
  creator_video_scale: string;
  creator_video_rotation: string;
  creator_video_blend_mode: string;
  creator_video_opacity: string;
  creator_video_volume: string;
  creator_video_fade_in: string;
  creator_video_fade_out: string;
  creator_video_font: string;
  creator_video_size: string;
  creator_video_color: string;
  creator_video_clip_info: string;
  creator_video_type: string;
  creator_video_track: string;
  creator_video_start: string;
  creator_video_duration: string;
  creator_video_safe_margins: string;
  creator_video_fullscreen: string;
  creator_video_timeline: string;
  creator_video_zoom_in: string;
  creator_video_zoom_out: string;
  creator_video_title: string;
  creator_video_subtitle: string;
  creator_video_caption: string;
  creator_video_solo: string;
  creator_video_mute: string;
  creator_video_visibility: string;
  creator_video_lock: string;
  // Export/Import panel
  exportImportTitle: string;
  exportSelectAll: string;
  exportDeselectAll: string;
  exportSelected: string;
  exportNoAgent: string;
  exportExporting: string;
  exportExportJSON: string;
  exportImporting: string;
  exportImportJSON: string;
  exportSuccess: string;
  exportError: string;
  exportFileNotSupported: string;
  exportConversations: string;
  exportFullBackup: string;
  exportFullDescription: string;
  // WhatsApp panel
  whatsappDailyLimit: string;
  whatsappConnect: string;
  whatsappSessionKept: string;
  whatsappAutoReconnect: string;
  whatsappYourGroups: string;
  whatsappNoGroupsFound: string;
  whatsappGroupsByAgent: string;
  whatsappJidCopyHelp: string;
  whatsappKeywords: string;
  whatsappKeywordsDesc: string;
  whatsappGenerate: string;
  whatsappAutoReply: string;
  whatsappAutoReplyDesc: string;
  whatsappNoGroupsConfigured: string;
  whatsappRetry: string;
  whatsappQueue: string;
  whatsappConfigTab: string;
  whatsappAutomationTab: string;
  whatsappScanWhatsApp: string;
  // AgentData panel
  agentDataDraft: string;
  agentDataRendering: string;
  agentDataProcessing: string;
  agentDataCompleted: string;
  agentDataFailed: string;
  agentDataCustom: string;
  // TitleBar
  titlebarMinimize: string;
  titlebarMaximize: string;
  titlebarClose: string;
  // VoiceOverlay
  voiceOverlayListening: string;
  voiceOverlayThinking: string;
  voiceOverlaySpeaking: string;
  // ChatInput
  chatInputCommands: string;
  // ConversationList
  conversationHistory: string;
  // SocialMedia panel
  socialMediaCreateViral: string;
  socialMediaWebhooksN8n: string;
  socialMediaConfigureWebhooks: string;
  socialMediaSaveWebhooks: string;
  socialMediaPlatform: string;
  socialMediaGenerating: string;
  socialMediaGenerateContent: string;
  socialMediaInstagramReqImage: string;
  socialMediaTiktokReqMedia: string;
  socialMediaPublishedSuccess: string;
  socialMediaPublishError: string;
  // Projects panel
  projectsNewProject: string;
  // Spotify integration
  settingsSpotifySection: string;
  settingsSpotifyClientId: string;
  settingsSpotifyClientSecret: string;
  settingsSpotifyConnect: string;
  settingsSpotifyDisconnect: string;
  settingsSpotifyConnected: string;
  settingsSpotifyNotConnected: string;
  settingsSpotifyPlay: string;
  settingsSpotifyPause: string;
  settingsSpotifyNowPlaying: string;
  settingsSpotifyDeviceLabel: string;
  settingsSpotifyDeviceDesc: string;
  settingsSpotifyNoDevice: string;
  settingsSpotifyAuthHelp: string;
  settingsSpotifyAuthHelpDesc: string;
  // Discord integration
  settingsDiscordSection: string;
  settingsDiscordToken: string;
  settingsDiscordConnect: string;
  settingsDiscordDisconnect: string;
  settingsDiscordConnected: string;
  settingsDiscordConnecting: string;
  settingsDiscordError: string;
  settingsDiscordGuild: string;
  settingsDiscordChannel: string;
  settingsDiscordAutoResponse: string;
  settingsDiscordAutoResponseDesc: string;
  settingsDiscordBotTokenHelp: string;
  settingsDiscordBotTokenHelpDesc: string;
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
    agentAutomotive: "Automotivo",
    agentSocialMedia: "Redes Sociais",
    agentImageCamera: "IA de Imagem & Câmera",
    agentSpeechAudio: "Fala & Áudio",
    agentKnowledgeMemory: "Conhecimento & Memória",
    agentOSConfig: "SO & Configuração",
    agentDesignVisual: "Design & Visual",
    agentAudiovisualContent: "Conteúdo Audiovisual",
    agentHealth: "Saúde",
    agentLearningLanguages: "Aprendizado & Idiomas",
    agentMarketingSocial: "Marketing & Social",

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
    sidebarHome: "Início",

    // Status bar
    statusNativeAI: "IA Nativa",
    statusConnected: "Conectado",
    statusHamptonOnline: "Hampton \u2022 Online",
    statusChangeModel: "Trocar modelo",

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
    settings_wake_word: "Palavra de Ativação",
    settings_wake_word_desc: "Ativação por voz (Beta)",
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
    settingsTheme: "Tema",
    settingsThemeDark: "Escuro",
    settingsThemeLight: "Claro",
    settingsThemeSystem: "Sistema",
    settingsFalAiNote: "(para geração de imagens)",
    settingsFalAiPlaceholder: "chave da API Fal.ai",
    settingsSaved: "Configurações salvas",
    settingsHome: "Início",
    settingsTabAI: "IA & Modelo",
    settingsTabIntegrations: "Integrações",
    settingsTabAppearance: "Aparência",
    settingsTabSystem: "Sistema",
    settingsVoiceSystem: "Sistema de Voz",
    settingsConversationalMode: "Modo Conversacional",
    settingsConversationalModeDesc: "Microfone abre automaticamente após a IA responder",
    settingsNoiseSuppression: "Supressão de Ruído",
    settingsNoiseSuppressionDesc: "Remove ruído de fundo durante gravação",
    settingsResponseDelay: "Delay de Resposta",
    settingsResponseDelayDesc: "Espera após parar de falar antes de enviar à IA",
    settingsWhatsAppSection: "WhatsApp",
    settingsWhatsAppDesc: "Configurar roteamento de mensagens",
    settingsPersonaSection: "Persona da IA",
    settingsAppearanceSection: "Tema",
    settingsSecuritySection: "Segurança",
    settingsExecutionSection: "Execução",
    settingsRunInBackgroundDesc: "Manter Orun rodando mesmo com janela fechada",
    settingsStartWithWindows: "Iniciar com o Windows",
    settingsStartWithWindowsDesc: "Abrir Orun automaticamente ao ligar o computador",
    settingsAgentsSection: "Agentes",
    settingsUpdatesSection: "Atualizações",
    settingsDownloading: "Baixando...",
    closeWorkspace: "Sair",
    loadingWorkspace: "Carregando workspace...",
    slashHistory: "Histórico",
    slashHistoryDesc: "Ver histórico de conversas",
    slashClear: "Limpar",
    slashClearDesc: "Limpar conversa atual",
    slashSummarize: "Resumir",
    slashSummarizeDesc: "Resumir conversa",
    slashExport: "Exportar",
    slashExportDesc: "Exportar conversa",
    slashVoices: "Vozes",
    slashVoicesDesc: "Configurar voz",
    slashModel: "Modelo",
    slashModelDesc: "Mudar modelo",
    slashMemory: "Memória",
    slashMemoryDesc: "Buscar na memória",
    slashAgents: "Agentes",
    slashAgentsDesc: "Ver agentes",
    slashHelp: "Ajuda",
    slashHelpDesc: "Ver comandos disponíveis",
    conversationSearchEmpty: "Nenhuma conversa encontrada",
    onboardingWelcome: "Bem-vindo ao Orun OS",
    onboardingWelcomeSub: "Seu assistente pessoal com IA",
    onboardingWelcomeDesc: "Vamos configurar tudo em poucos passos.",
    onboardingProvider: "Escolha um Provider",
    onboardingProviderSub: "Onde sua IA vai rodar",
    onboardingProviderDesc: "Selecione um provedor de IA e insira sua API key.",
    onboardingProviderFree: "Gratuito",
    onboardingAgent: "Conheça Hampton",
    onboardingAgentSub: "Seu primeiro agent",
    onboardingAgentDesc: "Hampton é seu assistente principal. Ele pode pesquisar na web, acessar seus arquivos e muito mais.",
    onboardingAgentFeature1: "Pesquisa na web em tempo real",
    onboardingAgentFeature2: "Acesso a seus arquivos locais",
    onboardingAgentFeature3: "Memória de conversas anteriores",
    onboardingAgentFeature4: "Comandos de voz",
    onboardingReady: "Tudo Pronto!",
    onboardingReadySub: "Comece a usar",
    onboardingReadyDesc: "Você está pronto para começar. Clique abaixo para iniciar sua primeira conversa.",
    onboardingApiKey: "Sua API key",
    onboardingKeyValid: "✓ Key válida!",
    onboardingKeyInvalid: "✗",
    onboardingSkip: "Pular",
    onboardingDontShow: "Não mostrar mais",
    onboardingBack: "Voltar",
    onboardingNext: "Próximo",
    onboardingStart: "Começar",
    errorBoundaryMessage: "Algo deu errado",
    errorBoundaryReload: "Recarregar",
    ariaStartDictation: "Iniciar ditado",
    ariaStopDictation: "Parar ditado",
    ariaSendMessage: "Enviar mensagem",
    offlineMessage: "Sem conexão com a internet",
    settingsBackupSection: "Backup & Restauração",
    settingsRestoreConfirm: "Restaurar este backup? O app será reiniciado.",
    ariaCancelEdit: "Cancelar edição",
    ariaConfirmEdit: "Confirmar edição",
    ariaEditMessage: "Editar mensagem",
    ariaRegenerate: "Regenerar resposta",
    ariaDeleteProject: "Excluir projeto",
    statusOnline: "Online",
    statusOffline: "Offline",
    loadingConversation: "Carregando conversa...",
    encryptionWeakMode: "Criptografia em modo fraco — chave salva em texto puro",
    close: "Fechar",
    skipToContent: "Pular para o conteúdo",
    // Profile panel
    profileTitle: "Meu Perfil",
    profileName: "Nome",
    profileNamePlaceholder: "Seu nome",
    profilePhoto: "Foto de perfil",
    profilePhotoChange: "Trocar foto",
    profilePhotoRemove: "Remover foto",
    profileVoiceRecording: "Gravação de voz",
    profileVoiceRecord: "Gravar voz",
    profileVoiceStop: "Parar gravação",
    profileVoiceUse: "Usar esta voz",
    profileVoiceDelete: "Excluir gravação",
    profileSaved: "Perfil salvo!",
    profileSave: "Salvar perfil",
    conversations: "Conversas",
    slashCommands: "Comandos",

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
    voiceNoSTTFallback: "(Mensagem de voz — configure STT em Configurações > Voz)",

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
    whatsappHealthDesc: "Envie fotos de comida para análise de calorias e nutrientes",
    whatsappFinanceDesc: "Envie comprovantes de PIX, cartão ou boleto para registrar nas finanças",
    whatsappTrainerDesc: "Treinos e atividades físicas",
    whatsappAssistantDesc: "Agenda e compromissos diários",
    whatsappSocialDesc: "Conteúdo para Instagram, TikTok e X",
    whatsappTestSent: "Mensagem de teste enviada para {name}!",
    whatsappTestError: "Erro: {error}",
    whatsappTestSendTo: "Enviar mensagem de teste para {name}",
    whatsappJidHelp: "Para obter o JID de um grupo: abra o grupo no WhatsApp → toque no nome do grupo → role até o final → o código é o JID.",

    // Social media panel
    socialMediaStoriesDesc: "15s por slide, 3-5 slides",
    socialMediaReelsDesc: "30-90s, hook forte",
    socialMediaCarouselDesc: "5-10 slides, um ponto cada",
    socialMediaTikTokDesc: "15-60s, ritmo rápido",
    socialMediaXPostDesc: "280 chars, tweet único",
    socialMediaXThreadDesc: "5-10 tweets encadeados",
    socialMediaHook1: "Isso foi APAGADO da história brasileira",
    socialMediaHook2: "Nunca te ensinaram isso na escola",
    socialMediaHook3: "A história que ninguém conta",
    socialMediaHook4: "O homem que o mundo esqueceu",
    socialMediaHook5: "Uma história que TODO brasileiro deveria saber",
    socialMediaHook6: "Isso mudou o mundo para sempre",
    socialMediaHook7: "A verdade que ninguém fala",
    socialMediaHook8: "A luta que continua até hoje",
    socialMediaImageUrl: "URL da Imagem (obrigatório)",
    socialMediaMediaUrl: "URL da Mídia (obrigatório)",
    socialMediaGeneratedPrompt: "Prompt Gerado",
    socialMediaCopied: "Copiado!",
    socialMediaCopy: "Copiar",
    socialMediaPublish: "Publicar",

    // Conversation list
    conversationNew: "Nova conversa",
    conversationBrowserWarning: "O histórico só está disponível no aplicativo Electron empacotado.",
    conversationLoading: "Carregando…",
    conversationEmpty: "Nenhuma conversa ainda.",
    conversationSearch: "Buscar conversas...",

    // Chat input
    chatImageAttached: "Imagem anexada",
    chatAttachPhoto: "Anexar uma foto (ex: uma refeição para o agente Nutritionist)",
    chatPlaceholder: "Pergunte qualquer coisa ao Hampton... (tente /vozes ou /model)",
    chatDisclaimer: "Hampton pode cometer erros. Sempre verifique informações importantes.",
    chatFileTooLarge: "Imagem muito grande. Tamanho máximo: 10 MB.",
    chatUnsupportedFile: "Tipo de arquivo não suportado. Envie apenas imagens.",

    // Message bubble
    messageEditResend: "Editar e reenviar",
    messageRegenerate: "Regenerar",

    // Message bubble — tool labels
    toolReadingFile: "Lendo arquivo",
    toolWritingFile: "Escrevendo arquivo",
    toolEditingFile: "Editando arquivo",
    toolListingFiles: "Listando arquivos",
    toolSearchingFiles: "Buscando arquivos",
    toolSearchingContent: "Buscando conteúdo",
    toolRunningCommand: "Executando comando",
    toolFetchingUrl: "Buscando URL",
    toolSavingMemory: "Salvando memória",
    toolSearchingMemory: "Buscando memória",
    toolSendingNotification: "Enviando notificação",
    toolSchedulingTask: "Agendando tarefa",
    toolDone: "feito",
    toolWorking: "processando...",

    // Schedules panel
    schedulesTitle: "Automações & Metas",
    schedulesDescription: "Configure horários diários para os agentes enviarem resumo no WhatsApp. Defina suas metas de peso.",
    schedulesHealthGoals: "Metas de Saúde",
    schedulesCurrentWeight: "Peso Atual (kg)",
    schedulesTargetWeight: "Meta de Peso (kg)",
    schedulesHeight: "Altura (cm)",
    schedulesStartWeight: "Peso Inicial (kg)",
    schedulesSaveGoals: "Salvar Metas",
    schedulesSaved: "✓ Salvo!",
    schedulesWeightCurrent: "Peso atual:",
    schedulesWeightChange: "Variação semanal:",
    schedulesWeightLost: "Total perdido:",
    schedulesTarget: "Meta:",
    schedulesRemaining: "restantes)",
    schedulesLogWeight: "Registrar peso (kg)",
    schedulesRegister: "Registrar",
    schedulesSocialMediaAuto: "Social Media Auto",
    schedulesSocialMediaDesc: "Envia ideias a cada hora: Carrossel, Stories, Reels, Post X e TikTok. Publica no grupo do WhatsApp.",
    schedulesAutoEnable: "Ativar envio automático",
    schedulesStart: "Início:",
    schedulesHourly: "(a cada hora)",
    schedulesOtherAgents: "Outros Agentes",
    schedulesFooter: "O Social Media envia ideias de conteúdo a cada hora para o grupo do WhatsApp. Os outros agentes enviam resumos diários no horário configurado.",
    schedulesHealth: "Saúde",
    schedulesHealthDesc: "Cardápio diário via WhatsApp",
    schedulesPersonalTrainer: "Personal Trainer",
    schedulesPersonalTrainerDesc: "Treino diário via WhatsApp",
    schedulesPersonalAssistant: "Assistente Pessoal",
    schedulesPersonalAssistantDesc: "Agenda diária via WhatsApp",
    schedulesSocialMedia: "Redes Sociais",
    schedulesSocialMediaAgentDesc: "Conteúdo diário para redes sociais",
    schedulesFinance: "Finanças",
    schedulesMarketing: "Marketing",

    // Agent data panel
    agentDataFinanceLog: "Registro Financeiro",
    agentDataHealthMetrics: "Métricas de Saúde",
    agentDataCodeReviews: "Revisões de Código",
    agentDataLearningProgress: "Progresso de Aprendizado",
    agentDataVideoProjects: "Projetos de Vídeo",
    agentDataImage3D: "Gerações de Imagem / 3D",
    agentDataMusicProjects: "Projetos de Música",
    agentDataLoading: "Carregando...",
    agentDataIncome: "Receitas",
    agentDataExpenses: "Despesas",
    agentDataBalance: "Saldo",
    agentDataNoTransactions: "Sem transações hoje. Converse com Finance para registrar despesas.",
    agentDataNoHealth: "Sem dados de saúde hoje. Converse com Health para registrar.",
    agentDataNoCodeReviews: "Sem revisões de código hoje. Converse com Developer para revisar código.",
    agentDataNoLearning: "Sem progresso de aprendizado hoje. Converse com Teacher para começar.",
    agentDataNoVideo: "Sem projetos de vídeo hoje. Converse com Video Editor para criar um.",
    agentDataNoGenerations: "Sem gerações hoje. Converse com 3D Designer para criar imagens ou modelos 3D.",
    agentDataNoMusic: "Sem projetos de música hoje. Converse com Music Producer para criar música.",
    agentDataNoCreator: "Sem projetos criativos hoje. Converse com Creator para criar.",
    agentDataHealthLog: "Registro de Saúde",
    agentDataCreatorProjects: "Projetos Criativos",
    agentDataDesigns: "Designs",
    agentDataNutritionToday: "Nutrição Hoje",
    agentDataProtein: "Proteína",
    agentDataCarbs: "Carboidratos",
    agentDataFat: "Gordura",

    // WhatsApp panel — automation
    wa_chat_personal_optional: "Chat Pessoal (opcional)",
    wa_chat_personal_desc: "Chat pessoal para mensagens diretas (opcional se já configurou os grupos acima).",
    wa_urgente_meeting: "urgente, reunião,meeting",
    wa_option_notify: "Notificar",
    wa_option_task: "Tarefa",
    wa_option_summary: "Resumo",
    wa_n8n_webhook_desc: "Mensagens recebidas são enviadas para o N8N automaticamente.",
    wa_n8n_placeholder: "https://seu-n8n.com/webhook/...",
    wa_save: "Salvar",
    wa_broadcast_desc: "Enviar mensagem para múltiplos grupos de uma vez (com delay anti-ban).",
    wa_message_placeholder: "Mensagem para enviar...",
    wa_send_to_n_groups: "Enviar para {count} grupo(s)",
    wa_summary: "Resumo",

    // Social Media panel — additional
    social_topic_label: "Tópico / Pessoa / Evento",
    social_topic_placeholder: "Ex: Thomas Sankara, Escravidão no Brasil, Angela Davis...",
    social_hook_label: "Gancho (opcional)",
    social_photo_placeholder: "https://exemplo.com/foto.jpg",

    // Common
    commonNone: "Nenhum",
    commonLoading: "Carregando…",
    commonError: "Erro desconhecido",

    // Command Palette
    commandPalettePlaceholder: "Buscar comandos, agentes, acoes...",
    commandPaletteNoResults: "Nenhum resultado",

    // Slash Commands
    slashHistorico: "Ver historico de conversas",
    slashLimpar: "Limpar conversa atual",
    slashResumir: "Resumir conversa",
    slashExportar: "Exportar conversa",
    slashMemoria: "Buscar na memoria",
    slashAgentes: "Ver agentes",
    slashAjuda: "Ver comandos disponiveis",

    // Plugin System
    plugins: "Plugins",
    pluginsEmpty: "Nenhum plugin instalado",
    pluginsLoad: "Carregar",
    pluginsUnload: "Descarregar",
    pluginsLoaded: "Plugin carregado",
    pluginsError: "Erro ao carregar plugin",

    // MCP
    mcp: "Servidores MCP",
    mcpEmpty: "Nenhum servidor MCP conectado",
    mcpAdd: "Adicionar servidor",
    mcpRemove: "Remover",

    // Keyboard Shortcuts
    shortcutsTitle: "Atalhos de Teclado",

    // Skeleton
    skeletonLoading: "Carregando...",
    skeletonLoadingMessages: "Carregando mensagens...",
    skeletonLoadingAgents: "Carregando agents...",
    skeletonLoadingSettings: "Carregando configurações...",

    // Agent Health
    agent_health_description: "Consultório Digital de Saúde",
    agent_health_tagline: "Cuidando da sua saúde com tecnologia e precisão",
    agent_health_quick_action_meal_analysis_label: "Análise de Refeição",
    agent_health_quick_action_meal_analysis_prompt: "Analise esta foto de comida e me diga os macros",
    agent_health_quick_action_workout_label: "Treino Personalizado",
    agent_health_quick_action_workout_prompt: "Crie um treino personalizado baseado no meu histórico",
    agent_health_quick_action_log_weight_label: "Registrar Peso",
    agent_health_quick_action_log_weight_prompt: "Quero registrar meu peso de hoje",
    agent_health_quick_action_view_goals_label: "Ver Metas",
    agent_health_quick_action_view_goals_prompt: "Mostre minhas metas de saúde e progresso",
    agent_health_quick_action_schedule_appointment_label: "Agendar Consulta",
    agent_health_quick_action_schedule_appointment_prompt: "Preciso agendar uma consulta",
    agent_health_quick_action_exams_label: "Exames",
    agent_health_quick_action_exams_prompt: "Quero registrar meus últimos exames",
    agent_health_stat_bmi: "IMC",
    agent_health_stat_steps_today: "Passos Hoje",
    agent_health_stat_heart_rate: "Batimentos",
    agent_health_stat_water: "Água",

    // Agent Finance
    agent_finance_description: "Escritório Financeiro Pessoal",
    agent_finance_tagline: "Controle total das suas finanças em um só lugar",
    agent_finance_quick_action_log_expense_label: "Registrar Gasto",
    agent_finance_quick_action_log_expense_prompt: "Quero registrar um gasto",
    agent_finance_quick_action_log_income_label: "Registrar Receita",
    agent_finance_quick_action_log_income_prompt: "Quero registrar uma receita",
    agent_finance_quick_action_monthly_balance_label: "Balanço Mensal",
    agent_finance_quick_action_monthly_balance_prompt: "Mostre o balanço financeiro deste mês",
    agent_finance_quick_action_budget_label: "Orçamento",
    agent_finance_quick_action_budget_prompt: "Crie um orçamento mensal inteligente",
    agent_finance_quick_action_investments_label: "Investimentos",
    agent_finance_quick_action_investments_prompt: "Analise meus investimentos",
    agent_finance_quick_action_financial_goals_label: "Metas Financeiras",
    agent_finance_quick_action_financial_goals_prompt: "Quero ver minhas metas financeiras",
    agent_finance_stat_balance: "Saldo",
    agent_finance_stat_income: "Receitas",
    agent_finance_stat_expenses: "Despesas",
    agent_finance_stat_savings: "Economia",

    // Agent Developer
    agent_developer_description: "Estação de Desenvolvimento",
    agent_developer_tagline: "Code, debug, deploy - tudo em um terminal imersivo",
    agent_developer_quick_action_review_code_label: "Revisar Código",
    agent_developer_quick_action_review_code_prompt: "Revise este código para mim e sugira melhorias",
    agent_developer_quick_action_debug_label: "Debugar",
    agent_developer_quick_action_debug_prompt: "Preciso de ajuda para debugar este erro",
    agent_developer_quick_action_new_feature_label: "Nova Feature",
    agent_developer_quick_action_new_feature_prompt: "Quero criar uma nova feature",
    agent_developer_quick_action_code_review_label: "Code Review",
    agent_developer_quick_action_code_review_prompt: "Faça um code review completo",
    agent_developer_quick_action_architecture_label: "Arquitetura",
    agent_developer_quick_action_architecture_prompt: "Me ajude a projetar a arquitetura",
    agent_developer_quick_action_tests_label: "Testes",
    agent_developer_quick_action_tests_prompt: "Crie testes unitários para este módulo",
    agent_developer_stat_commits: "Commits",
    agent_developer_stat_issues: "Issues",
    agent_developer_stat_prs: "PRs",
    agent_developer_stat_uptime: "Uptime",

    // Agent Marketing
    agent_marketing_description: "Estúdio de Marketing Digital",
    agent_marketing_tagline: "Crie conteúdo viral e conquiste suas redes sociais",
    agent_marketing_quick_action_viral_post_label: "Post Viral",
    agent_marketing_quick_action_viral_post_prompt: "Crie um post viral para Instagram",
    agent_marketing_quick_action_campaign_label: "Campanha",
    agent_marketing_quick_action_campaign_prompt: "Planeje uma campanha de marketing completa",
    agent_marketing_quick_action_persuasive_copy_label: "Copy Persuasiva",
    agent_marketing_quick_action_persuasive_copy_prompt: "Escreva uma copy persuasiva para vender",
    agent_marketing_quick_action_storytelling_label: "Storytelling",
    agent_marketing_quick_action_storytelling_prompt: "Crie um storytelling envolvente",
    agent_marketing_quick_action_metrics_analysis_label: "Análise de Métricas",
    agent_marketing_quick_action_metrics_analysis_prompt: "Analise as métricas das minhas redes",
    agent_marketing_quick_action_calendar_label: "Calendário",
    agent_marketing_quick_action_calendar_prompt: "Crie um calendário editorial",
    agent_marketing_stat_reach: "Alcance",
    agent_marketing_stat_engagement: "Engajamento",
    agent_marketing_stat_posts: "Posts",
    agent_marketing_stat_leads: "Leads",

    // Agent Designer
    agent_designer_description: "Ateliê de Design Criativo",
    agent_designer_tagline: "Transforme suas ideias em arte visual e experiências",
    agent_designer_quick_action_generate_image_label: "Gerar Imagem",
    agent_designer_quick_action_generate_image_prompt: "Gere uma imagem impressionante para mim",
    agent_designer_quick_action_3d_model_label: "Modelo 3D",
    agent_designer_quick_action_3d_model_prompt: "Crie um modelo 3D detalhado",
    agent_designer_quick_action_uiux_design_label: "UI/UX Design",
    agent_designer_quick_action_uiux_design_prompt: "Preciso de ajuda com design de interface",
    agent_designer_quick_action_icons_label: "Ícones",
    agent_designer_quick_action_icons_prompt: "Crie um set de ícones personalizados",
    agent_designer_quick_action_color_palette_label: "Paleta de Cores",
    agent_designer_quick_action_color_palette_prompt: "Sugira uma paleta de cores harmoniosa",
    agent_designer_quick_action_prototype_label: "Protótipo",
    agent_designer_quick_action_prototype_prompt: "Crie um protótipo interativo",
    agent_designer_stat_images: "Imagens",
    agent_designer_stat_3d_models: "Modelos 3D",
    agent_designer_stat_prototypes: "Protótipos",
    agent_designer_stat_styles: "Estilos",

    // Agent Creator
    agent_creator_description: "Estúdio de Produção Criativa",
    agent_creator_tagline: "Produza vídeos e músicas profissionais com IA",
    agent_creator_quick_action_create_video_label: "Criar Vídeo",
    agent_creator_quick_action_create_video_prompt: "Quero criar um vídeo profissional",
    agent_creator_quick_action_create_music_label: "Criar Música",
    agent_creator_quick_action_create_music_prompt: "Quero criar uma música original",
    agent_creator_quick_action_edit_video_label: "Editar Vídeo",
    agent_creator_quick_action_edit_video_prompt: "Preciso de ajuda com edição de vídeo",
    agent_creator_quick_action_podcast_label: "Podcast",
    agent_creator_quick_action_podcast_prompt: "Quero criar um podcast",
    agent_creator_quick_action_sound_effects_label: "Efeitos Sonoros",
    agent_creator_quick_action_sound_effects_prompt: "Preciso de efeitos sonoros",
    agent_creator_quick_action_mixing_label: "Mixagem",
    agent_creator_quick_action_mixing_prompt: "Ajude-me a mixar este áudio",
    agent_creator_stat_videos: "Vídeos",
    agent_creator_stat_music: "Músicas",
    agent_creator_stat_podcasts: "Podcasts",
    agent_creator_stat_hours: "Horas",

    // Agent Teacher
    agent_teacher_description: "Sala de Aula Virtual",
    agent_teacher_tagline: "Aprenda qualquer coisa com ensino personalizado por IA",
    agent_teacher_quick_action_study_plan_label: "Plano de Estudo",
    agent_teacher_quick_action_study_plan_prompt: "Crie um plano de estudo personalizado",
    agent_teacher_quick_action_translate_label: "Traduzir",
    agent_teacher_quick_action_translate_prompt: "Preciso traduzir um texto",
    agent_teacher_quick_action_quiz_label: "Quiz",
    agent_teacher_quick_action_quiz_prompt: "Crie um quiz para testar meus conhecimentos",
    agent_teacher_quick_action_summary_label: "Resumo",
    agent_teacher_quick_action_summary_prompt: "Resuma este conteúdo para mim",
    agent_teacher_quick_action_explain_label: "Explicar",
    agent_teacher_quick_action_explain_prompt: "Explique este conceito de forma simples",
    agent_teacher_quick_action_flashcards_label: "Flashcards",
    agent_teacher_quick_action_flashcards_prompt: "Crie flashcards para revisão",
    agent_teacher_stat_lessons: "Aulas",
    agent_teacher_stat_quizzes: "Quizzes",
    agent_teacher_stat_languages: "Idiomas",
    agent_teacher_stat_hours: "Horas",

    // Agent Automation
    agent_automation_description: "Centro de Automação Inteligente",
    agent_automation_tagline: "Conecte agentes, automatize tarefas e seja produtivo",
    agent_automation_quick_action_create_workflow_label: "Criar Workflow",
    agent_automation_quick_action_create_workflow_prompt: "Crie um workflow de automação entre agentes",
    agent_automation_quick_action_config_bot_label: "Config Bot",
    agent_automation_quick_action_config_bot_prompt: "Configure um bot para mim",
    agent_automation_quick_action_test_webhook_label: "Testar Webhook",
    agent_automation_quick_action_test_webhook_prompt: "Teste um webhook",
    agent_automation_quick_action_list_automations_label: "Listar Automações",
    agent_automation_quick_action_list_automations_prompt: "Liste todas as automações ativas",
    agent_automation_quick_action_trigger_agent_label: "Trigger Agent",
    agent_automation_quick_action_trigger_agent_prompt: "Dispare uma tarefa em outro agent",
    agent_automation_quick_action_monitor_label: "Monitorar",
    agent_automation_quick_action_monitor_prompt: "Monitore o status das automações",
    agent_automation_stat_workflows: "Workflows",
    agent_automation_stat_triggers: "Triggers",
    agent_automation_stat_executions: "Execuções",
    agent_automation_stat_success: "Sucesso",

    // Agent System
    agent_system_description: "Painel de Controle do Sistema",
    agent_system_tagline: "Configure e monitore todos os aspectos do Orun OS",
    agent_system_quick_action_config_ai_label: "Configurar IA",
    agent_system_quick_action_config_ai_prompt: "Quero configurar os parâmetros da IA",
    agent_system_quick_action_diagnose_label: "Diagnosticar",
    agent_system_quick_action_diagnose_prompt: "Diagnostique o estado do sistema",
    agent_system_quick_action_clear_cache_label: "Limpar Cache",
    agent_system_quick_action_clear_cache_prompt: "Limpe o cache do sistema",
    agent_system_quick_action_backup_label: "Backup",
    agent_system_quick_action_backup_prompt: "Faça um backup das configurações",
    agent_system_quick_action_security_label: "Segurança",
    agent_system_quick_action_security_prompt: "Verifique as configurações de segurança",
    agent_system_quick_action_performance_label: "Performance",
    agent_system_quick_action_performance_prompt: "Analise a performance do sistema",
    agent_system_stat_cpu: "CPU",
    agent_system_stat_ram: "RAM",
    agent_system_stat_disk: "Disco",
    agent_system_stat_uptime: "Uptime",

    // Agent Automotive
    agent_automotive_description: "Seu Consultor Automotivo",
    agent_automotive_tagline: "Diagnóstico, manutenção, documentos e preços - tudo para seu carro",
    agent_automotive_quick_action_diagnostic_label: "Diagnóstico",
    agent_automotive_quick_action_diagnostic_prompt: "Meu carro está com o seguinte problema: ",
    agent_automotive_quick_action_fines_inquiry_label: "Consulta Multas",
    agent_automotive_quick_action_fines_inquiry_prompt: "Verifique se tenho multas ou pendências no meu carro",
    agent_automotive_quick_action_documents_label: "Documentos",
    agent_automotive_quick_action_documents_prompt: "Quero verificar os documentos do meu carro",
    agent_automotive_quick_action_parts_label: "Peças",
    agent_automotive_quick_action_parts_prompt: "Pesquise o melhor preço para esta peça: ",
    agent_automotive_quick_action_change_car_label: "Trocar Carro",
    agent_automotive_quick_action_change_car_prompt: "Quero trocar de carro, me ajude a encontrar opções",
    agent_automotive_quick_action_maintenance_label: "Manutenção",
    agent_automotive_quick_action_maintenance_prompt: "Quero saber a manutenção preventiva do meu carro",
    agent_automotive_stat_km: "KM",
    agent_automotive_stat_next_service: "Próx. Troca",
    agent_automotive_stat_documents: "Documentos",
    agent_automotive_stat_fuel_consumption: "Consumo",

    // Agent Hampton
    agent_hampton_description: "Inteligência Central de Orun OS",
    agent_hampton_tagline: "Seu assistente pessoal com IA avançada e ferramentas poderosas",
    agent_hampton_quick_action_chat_label: "Conversar",
    agent_hampton_quick_action_chat_prompt: "",
    agent_hampton_quick_action_web_search_label: "Pesquisar Web",
    agent_hampton_quick_action_web_search_prompt: "Pesquise na web para mim",
    agent_hampton_quick_action_analyze_label: "Analisar",
    agent_hampton_quick_action_analyze_prompt: "Analise esta informação para mim",
    agent_hampton_quick_action_automate_label: "Automatizar",
    agent_hampton_quick_action_automate_prompt: "Crie uma automação para esta tarefa",
    agent_hampton_stat_messages: "Mensagens",
    agent_hampton_stat_tools: "Ferramentas",
    agent_hampton_stat_memory: "Memória",
    agent_hampton_stat_uptime: "Uptime",

    // Agent Page UI
    agent_quick_actions_title: "Ações Rápidas",
    agent_open_workspace: "Abrir Workspace",
    agent_chat_with_ai: "Chat com IA",
    agent_start_session: "Iniciar Consulta",

    // Projects Panel
    projects_title: "Projetos",
    projects_filter_all: "todos",
    projects_filter_active: "ativos",
    projects_filter_archived: "arquivados",
    projects_new_button: "Novo",
    projects_name_placeholder: "Nome do projeto",
    projects_description_placeholder: "Descrição (opcional)",
    projects_create_button: "Criar",
    projects_cancel_button: "Cancelar",

    // Command Palette
    command_palette_home_label: "Início",
    command_palette_home_description: "Voltar ao início",
    command_palette_section_navigation: "Navegação",
    command_palette_agents_label: "Agentes",
    command_palette_agents_description: "Ver todos os agentes",
    command_palette_projects_label: "Projetos",
    command_palette_projects_description: "Gerenciar projetos",
    command_palette_settings_label: "Configurações",
    command_palette_settings_description: "Abrir configurações",
    command_palette_new_chat_label: "Nova Conversa",
    command_palette_new_chat_description: "Iniciar nova conversa",
    command_palette_section_actions: "Ações",
    command_palette_history_label: "Histórico",
    command_palette_history_description: "Ver histórico de conversas",
    command_palette_agent_description: "Conversar com {name}",
    command_palette_section_agents: "Agentes",
    command_palette_search_placeholder: "Buscar comandos, agentes, ações...",
    command_palette_no_results: "Nenhum resultado para",

    // Memory Panel
    memory_title: "Memória",
    memory_search_placeholder: "Buscar memórias...",

    // Settings Panel
    settings_section_language: "Idioma",
    settings_section_ai_provider: "Provedor de IA",
    settings_section_model: "Modelo",
    settings_section_connection: "Conexão",
    settings_ollama_url_desc: "URL do servidor Ollama local",
    settings_api_key_label: "API Key",
    settings_api_key_saved: "(salva)",
    settings_api_key_desc: "Chave para {label}",
    settings_api_key_placeholder: "Cole sua chave...",
    settings_fallback_provider_label: "Fallback Provider",
    settings_fallback_provider_desc: "Usado se o principal falhar",
    settings_none: "Nenhum",
    settings_whatsapp_connector_label: "WhatsApp Connector",
    settings_whatsapp_connector_desc: "Configurar roteamento de mensagens",
    settings_section_tts: "Text-to-Speech",
    settings_tts_engine_label: "Engine",
    settings_tts_engine_desc: "Engine ativo: {engine}",
    settings_tts_voice_label: "Voz",
    settings_tts_voice_desc: "Voz selecionada para síntese",
    settings_tts_fallback_info: "Fallback automático: se o engine cloud falhar (tokens, quota, etc.), muda automaticamente para Piper → Bark (local, sem internet)",
    settings_agent_models_button: "Modelos por Agente",
    settings_usage_button: "Uso Hoje",
    settingsBackgroundListen: "Escuta em Background",
    settingsBackgroundListenDesc: "Microfone escuta 'OK Orun' 24/7 e abre o overlay automaticamente",
    settingsWakeServiceRunning: "Serviço ativo",
    settingsWakeServiceStopped: "Serviço parado",
    settingsWakeServiceRestart: "Reiniciar",
    settingsWakeServiceTest: "Diagnóstico",
    settingsWakeDiagnosticPackages: "Pacotes Python",
    settingsWakeDiagnosticPort: "Porta TCP 8081",

    // Automotive Garage
    automotive_service_type_oil_change: "Troca de Óleo",
    automotive_service_type_general_revision: "Revisão Geral",
    automotive_service_type_brakes: "Freios",
    automotive_service_type_suspension: "Suspensão",
    automotive_service_type_engine: "Motor",
    automotive_service_type_transmission: "Câmbio",
    automotive_service_type_electrical: "Elétrica",
    automotive_service_type_air_conditioning: "Ar Condicionado",
    automotive_service_type_tires: "Pneus",
    automotive_service_type_alignment: "Alinhamento",
    automotive_service_type_balancing: "Balanceamento",
    automotive_service_type_other: "Outro",
    automotive_expense_category_fuel: "Combustível",
    automotive_expense_category_parking: "Estacionamento",
    automotive_expense_category_toll: "Pedágio",
    automotive_expense_category_fine: "Multa",
    automotive_expense_category_insurance: "Seguro",
    automotive_expense_category_ipva: "IPVA",
    automotive_expense_category_registration: "Licenciamento",
    automotive_expense_category_wash: "Lavagem",
    automotive_expense_category_accessories: "Acessórios",
    automotive_expense_category_other: "Outro",
    automotive_unknown_vehicle: "Desconhecido",
    automotive_nav_overview: "Painel",
    automotive_nav_vehicles: "Veículos",
    automotive_nav_services: "Serviços",
    automotive_nav_expenses: "Gastos",
    automotive_header_title: "Oficina Premium",
    automotive_header_subtitle: "Consultor Automotivo",
    automotive_filter_label: "Filtrar",
    automotive_filter_all: "Todos",
    automotive_overview_stat_vehicles: "Veículos",
    automotive_overview_stat_services: "Serviços",
    automotive_overview_stat_total_expenses: "Gastos Total",
    automotive_overview_stat_total_services: "Serviços Total",
    automotive_overview_new_vehicle_title: "Novo Veículo",
    automotive_overview_new_vehicle_desc: "Adicionar carro",
    automotive_overview_new_service_title: "Novo Serviço",
    automotive_overview_new_service_desc: "Registrar manutenção",
    automotive_overview_new_expense_title: "Novo Gasto",
    automotive_overview_new_expense_desc: "Combustível, multa, etc",
    automotive_overview_recent_activity: "Atividade Recente",
    automotive_overview_no_activity: "Nenhuma atividade ainda",
    automotive_vehicles_title: "Meus Veículos",
    automotive_vehicles_add_button: "Adicionar",
    automotive_vehicles_empty_title: "Nenhum veículo",
    automotive_vehicles_empty_desc: "Clique em 'Adicionar' para começar",
    automotive_services_title: "Serviços",
    automotive_services_add_button: "Novo Serviço",
    automotive_services_empty: "Nenhum serviço",
    automotive_services_no_shop: "Sem oficina",
    automotive_expenses_title: "Gastos",
    automotive_expenses_add_button: "Novo Gasto",
    automotive_expenses_empty: "Nenhum gasto",
    automotive_modal_add_vehicle_title: "Adicionar Veículo",
    automotive_field_name: "Nome / Apelido *",
    automotive_field_name_placeholder: "Ex: Meu Corolla",
    automotive_field_year: "Ano *",
    automotive_field_model: "Modelo *",
    automotive_field_plate: "Placa",
    automotive_field_color: "Cor",
    automotive_field_color_placeholder: "Prata",
    automotive_field_mileage: "Quilometragem",
    automotive_modal_add_vehicle_button: "Adicionar Veículo",
    automotive_modal_add_service_title: "Novo Serviço",
    automotive_field_vehicle: "Veículo *",
    automotive_field_service_type: "Tipo de Serviço",
    automotive_field_description: "Descrição *",
    automotive_field_description_placeholder: "Ex: Troca de óleo 5W30",
    automotive_field_cost: "Custo (R$)",
    automotive_field_current_km: "KM atual",
    automotive_field_shop: "Oficina / Local",
    automotive_modal_add_service_button: "Registrar Serviço",
    automotive_add_vehicle_first: "Adicione um veículo primeiro",
    automotive_modal_add_expense_title: "Novo Gasto",
    automotive_field_category: "Categoria",
    automotive_field_expense_desc_placeholder: "Ex: Gasolina Comum",
    automotive_field_amount: "Valor (R$) *",
    automotive_modal_add_expense_button: "Registrar Gasto",

    // Developer IDE
    developer_ide_explorer_label: "Explorer",
    developer_ide_import_button: "+ Importar",
    developer_ide_no_file_open: "Nenhum arquivo aberto",
    developer_ide_terminal_help: "Comandos: help, clear, ls, cat, echo, pwd, date, version",
    developer_ide_terminal_placeholder: "Digite um comando...",
    developer_ide_terminal_label: "Terminal",
    developer_ide_show_terminal: "\u25B2 Terminal",

    // System Console
    system_console_welcome: "Orun OS System Console v1.0 \u2014 Digite 'help' para comandos",
    system_console_help_title: "Comandos disponíveis:",
    system_console_help_help: "help \u2014 Mostra esta ajuda",
    system_console_help_clear: "clear \u2014 Limpa o console",
    system_console_help_date: "date \u2014 Mostra data/hora atual",
    system_console_help_echo: "echo <texto> \u2014 Ecoa o texto",
    system_console_help_uptime: "uptime \u2014 Mostra uptime estimado",
    system_console_help_version: "version \u2014 Mostra versão do Orun OS",
    system_console_help_agents: "agents \u2014 Lista agentes disponíveis",
    system_console_help_ram: "ram \u2014 Mostra uso estimado de RAM",
    system_console_help_clearmemory: "clearmemory \u2014 Limpa histórico do console",
    system_console_uptime: "Uptime: {hrs}h {mins}m",
    system_console_version: "Orun OS v1.0.0 \u2014 Plugin System v1.0",
    system_console_agents_list_1: "Hampton, Developer, Designer, Creator",
    system_console_agents_list_2: "Health, Finance, Teacher, Marketing",
    system_console_agents_list_3: "Automation, System",
    system_console_ram_device: "RAM do Dispositivo: {ram}GB",
    system_console_ram_available: "RAM disponível estimada: {available}",
    system_console_command_not_found: "Comando não encontrado: {cmd}. Digite 'help' para comandos disponíveis.",
    system_console_cleared: "Console limpo.",
    system_console_history_cleared: "Histórico do console limpo.",
    system_console_resource_cpu: "CPU",
    system_console_resource_ram: "RAM",
    system_console_resource_disk: "Disco",
    system_console_placeholder: "Digite um comando...",

    // Designer
    designer_template_instagram_post: "Post Instagram",
    designer_template_story: "Story",
    designer_template_thumbnail: "Thumbnail",
    designer_template_logo: "Logo",
    designer_template_presentation: "Apresentação",
    designer_shape_rectangle: "Retângulo",
    designer_shape_circle: "Círculo",
    designer_shape_triangle: "Triângulo",
    designer_shape_star: "Estrela",
    designer_shape_line: "Linha",
    designer_icon_heart: "Coração",
    designer_icon_bolt: "Raio",
    designer_icon_sun: "Sol",
    designer_tool_select: "Selecionar",
    designer_tool_text: "Texto",
    designer_tool_shape: "Forma",
    designer_tool_image: "Imagem",
    designer_tool_draw: "Desenhar",
    designer_tool_delete: "Apagar",
    designer_toast_png_copied: "PNG copiado!",
    designer_toast_png_saved: "PNG salvo!",
    designer_toast_svg_exported: "SVG exportado!",
    designer_zoom_fit: "Ajustar",
    designer_import_button: "Importar",
    designer_export_button: "Exportar",
    designer_share_button: "Compartilhar",
    designer_tab_templates: "Modelos",
    designer_tab_elements: "Elementos",
    designer_tab_text: "Texto",
    designer_tab_uploads: "Uploads",
    designer_tab_background: "Fundo",
    designer_templates_section_title: "Tamanhos Predefinidos",
    designer_elements_section_shapes: "Formas",
    designer_elements_section_icons: "Ícones",
    designer_elements_section_decorative: "Decorativos",
    designer_text_add_title: "Adicionar título",
    designer_text_add_subtitle: "Adicionar subtítulo",
    designer_text_add_body: "Adicionar texto",
    designer_uploads_drag_here: "Arraste imagens aqui",
    designer_uploads_or_click: "ou clique para selecionar",
    designer_background_solid_colors: "Cores Sólidas",
    designer_background_gradients: "Gradientes",
    designer_panel_design_name: "Design",
    designer_panel_canvas_size: "Tamanho do Canvas",
    designer_panel_width: "Largura",
    designer_panel_height: "Altura",
    designer_panel_background_color: "Cor de Fundo",
    designer_panel_select_element_hint: "Selecione um elemento para editar suas propriedades",
    designer_panel_position: "Posição",
    designer_panel_size: "Tamanho",
    designer_panel_rotation: "Rotação",
    designer_panel_opacity: "Opacidade",
    designer_panel_text: "Texto",
    designer_panel_font_size: "Tamanho da Fonte",
    designer_panel_font_family: "Família da Fonte",
    designer_panel_style: "Estilo",
    designer_panel_text_color: "Cor do Texto",
    designer_panel_fill_color: "Cor de Preenchimento",
    designer_panel_border_color: "Cor da Borda",
    designer_panel_none: "Nenhuma",
    designer_panel_border_width: "Espessura da Borda",
    designer_panel_layer_order: "Ordem das Camadas",
    designer_panel_bring_front: "Trazer p/ frente",
    designer_panel_send_back: "Enviar p/ trás",
    designer_canvas_drag_image: "Arraste uma imagem",

    // Creator Audio
    creator_audio_deck: "Deck {deck}",
    creator_audio_bpm: "BPM",
    creator_audio_pitch: "Pitch",
    creator_audio_sync: "Sync",
    creator_audio_cue: "Cue",
    creator_audio_play: "Reproduzir",
    creator_audio_pause: "Pausar",
    creator_audio_stop: "Parar",
    creator_audio_rec: "Gravar",
    creator_audio_mixer: "Mixador",
    creator_audio_master: "Master",
    creator_audio_crossfader: "Crossfader",
    creator_audio_headphones: "Fones",
    creator_audio_cue_mix: "Cue Mix",
    creator_audio_effects: "Efeitos",
    creator_audio_samples: "Samples",
    creator_audio_recording: "Gravação",
    creator_audio_format: "Formato",
    creator_audio_quality: "Qualidade",
    creator_audio_export: "Exportar",
    creator_audio_import: "Importar",
    creator_audio_recording_status: "Gravando...",
    creator_audio_ready: "Pronto",
    creator_audio_storage: "Armazenamento",
    creator_audio_tempo: "Tempo",
    creator_audio_hi: "AG",
    creator_audio_mid: "MD",
    creator_audio_lo: "BW",
    creator_audio_pan: "Pan",
    creator_audio_wet: "WET",
    creator_audio_par_x: "PAR X",
    creator_audio_par_y: "PAR Y",
    creator_audio_low: "Low",
    creator_audio_mid_freq: "Mid",
    creator_audio_high: "High",
    creator_audio_solo: "S",
    creator_audio_mute: "M",
    creator_audio_open: "Abrir",
    creator_audio_volume: "Volume",
    creator_audio_none: "Nenhum",
    creator_audio_imported: "Importado",
    creator_audio_loaded: "Carregado",
    creator_audio_error_no_audio: "Nenhum áudio carregado",
    // Creator Video
    creator_video_select: "Selecionar",
    creator_video_trim: "Aparar",
    creator_video_split: "Dividir",
    creator_video_delete: "Excluir",
    creator_video_copy: "Copiar",
    creator_video_paste: "Colar",
    creator_video_undo: "Desfazer",
    creator_video_redo: "Refazer",
    creator_video_export: "Exportar",
    creator_video_media: "Mídia",
    creator_video_text: "Texto",
    creator_video_effects: "Efeitos",
    creator_video_transitions: "Transições",
    creator_video_import: "+ Importar",
    creator_video_mixer: "Mixador",
    creator_video_master: "Master",
    creator_video_position: "Posição",
    creator_video_scale: "Escala",
    creator_video_rotation: "Rotação",
    creator_video_blend_mode: "Modo de Mesclagem",
    creator_video_opacity: "Opacidade",
    creator_video_volume: "Volume",
    creator_video_fade_in: "Fade In",
    creator_video_fade_out: "Fade Out",
    creator_video_font: "Fonte",
    creator_video_size: "Tamanho",
    creator_video_color: "Cor",
    creator_video_clip_info: "Info do Clip",
    creator_video_type: "Tipo",
    creator_video_track: "Faixa",
    creator_video_start: "Início",
    creator_video_duration: "Duração",
    creator_video_safe_margins: "Margens Seguras",
    creator_video_fullscreen: "Tela Cheia",
    creator_video_timeline: "Linha do Tempo",
    creator_video_zoom_in: "Zoom +",
    creator_video_zoom_out: "Zoom -",
    creator_video_title: "Título",
    creator_video_subtitle: "Subtítulo",
    creator_video_caption: "Legenda",
    creator_video_solo: "Solo",
    creator_video_mute: "Mudo",
    creator_video_visibility: "Visibilidade",
    creator_video_lock: "Bloquear",
    // Export/Import panel
    exportImportTitle: "Exportar/Importar Conversas",
    exportSelectAll: "Selecionar Todas",
    exportDeselectAll: "Desmarcar Todas",
    exportSelected: "selecionadas",
    exportNoAgent: "Sem agente",
    exportExporting: "Exportando...",
    exportExportJSON: "Exportar JSON",
    exportImporting: "Importando...",
    exportImportJSON: "Importar JSON",
    exportSuccess: "Operação concluída!",
    exportError: "Erro na operação",
    exportFileNotSupported: "Formato de arquivo não suportado",
    exportConversations: "Conversas",
    exportFullBackup: "Backup Completo",
    exportFullDescription: "Exporta todas as conversas, configurações, agendamentos e memória dos agents em um único arquivo JSON.",
    // WhatsApp panel
    whatsappDailyLimit: "Limite Diário",
    whatsappConnect: "Conectar WhatsApp",
    whatsappSessionKept: "A sessão será mantida após a primeira conexão",
    whatsappAutoReconnect: "Auto-reconnect",
    whatsappYourGroups: "Seus Grupos",
    whatsappNoGroupsFound: "Nenhum grupo encontrado. Crie grupos no WhatsApp e clique atualizar.",
    whatsappGroupsByAgent: "Grupos por Agente",
    whatsappJidCopyHelp: "Copie o JID da lista acima e cole no campo do agente correspondente.",
    whatsappKeywords: "Palavras-chave",
    whatsappKeywordsDesc: "Quando palavras aparecerem nos grupos, dispara uma ação automática.",
    whatsappGenerate: "Gerar",
    whatsappAutoReply: "Auto-reply",
    whatsappAutoReplyDesc: "Mensagens nos grupos vinculados são processadas pela IA do agente correspondente e respondidas automaticamente. Datas mencionadas nas mensagens são detectadas e criam agendamentos automáticos.",
    whatsappNoGroupsConfigured: "Nenhum grupo configurado na aba Configuração",
    whatsappRetry: "Tentar novamente",
    whatsappQueue: "Fila",
    whatsappConfigTab: "Configuração",
    whatsappAutomationTab: "Automação",
    whatsappScanWhatsApp: "Escaneie com o WhatsApp",
    // AgentData panel
    agentDataDraft: "Rascunho",
    agentDataRendering: "Renderizando",
    agentDataProcessing: "Processando",
    agentDataCompleted: "Concluído",
    agentDataFailed: "Falhou",
    agentDataCustom: "personalizado",
    // TitleBar
    titlebarMinimize: "Minimizar",
    titlebarMaximize: "Maximizar",
    titlebarClose: "Fechar",
    // VoiceOverlay
    voiceOverlayListening: "ouvindo...",
    voiceOverlayThinking: "pensando...",
    voiceOverlaySpeaking: "falando...",
    // ChatInput
    chatInputCommands: "Comandos",
    // ConversationList
    conversationHistory: "Histórico",
    // SocialMedia panel
    socialMediaCreateViral: "Crie conteúdo viral para Instagram, TikTok e X focado em histórias apagadas e luta contra o racismo.",
    socialMediaWebhooksN8n: "Webhooks n8n",
    socialMediaConfigureWebhooks: "Configure as URLs dos webhooks n8n para publicar via Buffer. Payload: { text, imageUrl?, videoUrl?, format? }",
    socialMediaSaveWebhooks: "Salvar Webhooks",
    socialMediaPlatform: "Plataforma",
    socialMediaGenerating: "Gerando...",
    socialMediaGenerateContent: "Gerar Conteúdo",
    socialMediaInstagramReqImage: "Erro: Instagram requer uma URL de imagem",
    socialMediaTiktokReqMedia: "Erro: TikTok requer uma URL de video ou imagem",
    socialMediaPublishedSuccess: "Publicado com sucesso!",
    socialMediaPublishError: "Erro",
    // Projects panel
    projectsNewProject: "Novo projeto",
    // Spotify integration
    settingsSpotifySection: "Spotify",
    settingsSpotifyClientId: "Client ID",
    settingsSpotifyClientSecret: "Client Secret",
    settingsSpotifyConnect: "Conectar OAuth",
    settingsSpotifyDisconnect: "Desconectar",
    settingsSpotifyConnected: "Conectado",
    settingsSpotifyNotConnected: "Não conectado",
    settingsSpotifyPlay: "Reproduzir",
    settingsSpotifyPause: "Pausar",
    settingsSpotifyNowPlaying: "Tocando agora",
    settingsSpotifyDeviceLabel: "Dispositivo",
    settingsSpotifyDeviceDesc: "Selecionar dispositivo de reprodução",
    settingsSpotifyNoDevice: "Nenhum dispositivo encontrado",
    settingsSpotifyAuthHelp: "Criar app no developer.spotify.com",
    settingsSpotifyAuthHelpDesc: "Redirect URI: http://127.0.0.1:9222/callback",
    // Discord integration
    settingsDiscordSection: "Discord Bot",
    settingsDiscordToken: "Bot Token",
    settingsDiscordConnect: "Conectar",
    settingsDiscordDisconnect: "Desconectar",
    settingsDiscordConnected: "Conectado",
    settingsDiscordConnecting: "Conectando...",
    settingsDiscordError: "Erro de conexão",
    settingsDiscordGuild: "Servidor",
    settingsDiscordChannel: "Canal",
    settingsDiscordAutoResponse: "Auto-resposta",
    settingsDiscordAutoResponseDesc: "Marketing agent responde mensagens do Discord",
    settingsDiscordBotTokenHelp: "Criar bot em discord.com/developers",
    settingsDiscordBotTokenHelpDesc: "Copie o token do bot e cole abaixo",
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
    agentAutomotive: "Automotive",
    agentSocialMedia: "Social Media",
    agentImageCamera: "Image AI & Camera",
    agentSpeechAudio: "Speech & Audio",
    agentKnowledgeMemory: "Knowledge & Memory",
    agentOSConfig: "OS & Configuration",
    agentDesignVisual: "Design & Visual",
    agentAudiovisualContent: "Audiovisual Content",
    agentHealth: "Health",
    agentLearningLanguages: "Learning & Languages",
    agentMarketingSocial: "Marketing & Social",

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
    sidebarHome: "Home",

    // Status bar
    statusNativeAI: "Native AI",
    statusConnected: "Connected",
    statusHamptonOnline: "Hampton \u2022 Online",
    statusChangeModel: "Change model",

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
    settings_wake_word: "Wake Word",
    settings_wake_word_desc: "Voice activation (Beta)",
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
    settingsTheme: "Theme",
    settingsThemeDark: "Dark",
    settingsThemeLight: "Light",
    settingsThemeSystem: "System",
    settingsFalAiNote: "(for image generation)",
    settingsFalAiPlaceholder: "Fal.ai API key (for Social Media images)",
    settingsSaved: "Saved!",
    settingsHome: "Home",
    settingsTabAI: "AI & Model",
    settingsTabIntegrations: "Integrations",
    settingsTabAppearance: "Appearance",
    settingsTabSystem: "System",
    settingsVoiceSystem: "Voice System",
    settingsConversationalMode: "Conversational Mode",
    settingsConversationalModeDesc: "Mic auto-opens after AI finishes speaking",
    settingsNoiseSuppression: "Noise Suppression",
    settingsNoiseSuppressionDesc: "Remove background noise during recording",
    settingsResponseDelay: "Response Delay",
    settingsResponseDelayDesc: "Wait after stopping speech before sending to AI",
    settingsWhatsAppSection: "WhatsApp",
    settingsWhatsAppDesc: "Configure message routing",
    settingsPersonaSection: "AI Persona",
    settingsAppearanceSection: "Theme",
    settingsSecuritySection: "Security",
    settingsExecutionSection: "Execution",
    settingsRunInBackgroundDesc: "Keep Orun running even with window closed",
    settingsStartWithWindows: "Start with Windows",
    settingsStartWithWindowsDesc: "Open Orun automatically on computer startup",
    settingsAgentsSection: "Agents",
    settingsUpdatesSection: "Updates",
    settingsDownloading: "Downloading...",
    closeWorkspace: "Close",
    loadingWorkspace: "Loading workspace...",
    slashHistory: "History",
    slashHistoryDesc: "View conversation history",
    slashClear: "Clear",
    slashClearDesc: "Clear current conversation",
    slashSummarize: "Summarize",
    slashSummarizeDesc: "Summarize conversation",
    slashExport: "Export",
    slashExportDesc: "Export conversation",
    slashVoices: "Voices",
    slashVoicesDesc: "Configure voice",
    slashModel: "Model",
    slashModelDesc: "Change model",
    slashMemory: "Memory",
    slashMemoryDesc: "Search memory",
    slashAgents: "Agents",
    slashAgentsDesc: "View agents",
    slashHelp: "Help",
    slashHelpDesc: "View available commands",
    conversationSearchEmpty: "No conversations found",
    onboardingWelcome: "Welcome to Orun OS",
    onboardingWelcomeSub: "Your personal AI assistant",
    onboardingWelcomeDesc: "Let's set everything up in a few steps.",
    onboardingProvider: "Choose a Provider",
    onboardingProviderSub: "Where your AI will run",
    onboardingProviderDesc: "Select an AI provider and enter your API key.",
    onboardingProviderFree: "Free",
    onboardingAgent: "Meet Hampton",
    onboardingAgentSub: "Your first agent",
    onboardingAgentDesc: "Hampton is your main assistant. It can search the web, access your files, and much more.",
    onboardingAgentFeature1: "Real-time web search",
    onboardingAgentFeature2: "Access to your local files",
    onboardingAgentFeature3: "Memory of past conversations",
    onboardingAgentFeature4: "Voice commands",
    onboardingReady: "All Ready!",
    onboardingReadySub: "Start using",
    onboardingReadyDesc: "You're ready to get started. Click below to start your first conversation.",
    onboardingApiKey: "Your API key",
    onboardingKeyValid: "✓ Key valid!",
    onboardingKeyInvalid: "✗",
    onboardingSkip: "Skip",
    onboardingDontShow: "Don't show again",
    onboardingBack: "Back",
    onboardingNext: "Next",
    onboardingStart: "Get Started",
    errorBoundaryMessage: "Something went wrong",
    errorBoundaryReload: "Reload",
    ariaStartDictation: "Start dictation",
    ariaStopDictation: "Stop dictation",
    ariaSendMessage: "Send message",
    offlineMessage: "No internet connection",
    settingsBackupSection: "Backup & Restore",
    settingsRestoreConfirm: "Restore this backup? The app will restart.",
    ariaCancelEdit: "Cancel edit",
    ariaConfirmEdit: "Confirm edit",
    ariaEditMessage: "Edit message",
    ariaRegenerate: "Regenerate response",
    ariaDeleteProject: "Delete project",
    statusOnline: "Online",
    statusOffline: "Offline",
    loadingConversation: "Loading conversation...",
    encryptionWeakMode: "Encryption in weak mode — key saved as plaintext",
    close: "Close",
    skipToContent: "Skip to content",
    conversations: "Conversations",
    slashCommands: "Slash commands",
    // Profile panel
    profileTitle: "My Profile",
    profileName: "Name",
    profileNamePlaceholder: "Your name",
    profilePhoto: "Profile photo",
    profilePhotoChange: "Change photo",
    profilePhotoRemove: "Remove photo",
    profileVoiceRecording: "Voice recording",
    profileVoiceRecord: "Record voice",
    profileVoiceStop: "Stop recording",
    profileVoiceUse: "Use this voice",
    profileVoiceDelete: "Delete recording",
    profileSaved: "Profile saved!",
    profileSave: "Save profile",
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
    voiceNoSTTFallback: "(Voice message — configure STT in Settings > Voice)",

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
    whatsappHealthDesc: "Send food photos for calorie and nutrient analysis",
    whatsappFinanceDesc: "Send PIX, card or bank slip receipts to log in finances",
    whatsappTrainerDesc: "Workouts and physical activities",
    whatsappAssistantDesc: "Daily agenda and appointments",
    whatsappSocialDesc: "Content for Instagram, TikTok and X",
    whatsappTestSent: "Test message sent to {name}!",
    whatsappTestError: "Error: {error}",
    whatsappTestSendTo: "Send test message to {name}",
    whatsappJidHelp: "To get a group JID: open the group in WhatsApp → tap the group name → scroll to the bottom → the code is the JID.",

    // Social media panel
    socialMediaStoriesDesc: "15s per slide, 3-5 slides",
    socialMediaReelsDesc: "30-90s, strong hook",
    socialMediaCarouselDesc: "5-10 slides, one point each",
    socialMediaTikTokDesc: "15-60s, fast pace",
    socialMediaXPostDesc: "280 chars, single tweet",
    socialMediaXThreadDesc: "5-10 threaded tweets",
    socialMediaHook1: "This was ERASED from Brazilian history",
    socialMediaHook2: "They never taught you this in school",
    socialMediaHook3: "The story no one tells",
    socialMediaHook4: "The man the world forgot",
    socialMediaHook5: "A story EVERY Brazilian should know",
    socialMediaHook6: "This changed the world forever",
    socialMediaHook7: "The truth no one talks about",
    socialMediaHook8: "The struggle that continues today",
    socialMediaImageUrl: "Image URL (required)",
    socialMediaMediaUrl: "Media URL (required)",
    socialMediaGeneratedPrompt: "Generated Prompt",
    socialMediaCopied: "Copied!",
    socialMediaCopy: "Copy",
    socialMediaPublish: "Publish",

    // Conversation list
    conversationNew: "New conversation",
    conversationBrowserWarning: "History is only available in the packaged Electron app.",
    conversationLoading: "Loading…",
    conversationEmpty: "No conversations yet.",
    conversationSearch: "Search conversations...",

    // Chat input
    chatImageAttached: "Attached image",
    chatAttachPhoto: "Attach a photo (e.g., a meal for the Nutritionist agent)",
    chatPlaceholder: "Ask Hampton anything... (try /voices or /model)",
    chatDisclaimer: "Hampton may make mistakes. Always verify important information.",
    chatFileTooLarge: "Image too large. Maximum size: 10 MB.",
    chatUnsupportedFile: "Unsupported file type. Please send images only.",

    // Message bubble
    messageEditResend: "Edit and resend",
    messageRegenerate: "Regenerate",

    // Message bubble — tool labels
    toolReadingFile: "Reading file",
    toolWritingFile: "Writing file",
    toolEditingFile: "Editing file",
    toolListingFiles: "Listing files",
    toolSearchingFiles: "Searching files",
    toolSearchingContent: "Searching content",
    toolRunningCommand: "Running command",
    toolFetchingUrl: "Fetching URL",
    toolSavingMemory: "Saving memory",
    toolSearchingMemory: "Searching memory",
    toolSendingNotification: "Sending notification",
    toolSchedulingTask: "Scheduling task",
    toolDone: "done",
    toolWorking: "working...",

    // Schedules panel
    schedulesTitle: "Automations & Goals",
    schedulesDescription: "Set daily schedules for agents to send summaries on WhatsApp. Define your weight goals.",
    schedulesHealthGoals: "Health Goals",
    schedulesCurrentWeight: "Current Weight (kg)",
    schedulesTargetWeight: "Target Weight (kg)",
    schedulesHeight: "Height (cm)",
    schedulesStartWeight: "Starting Weight (kg)",
    schedulesSaveGoals: "Save Goals",
    schedulesSaved: "✓ Saved!",
    schedulesWeightCurrent: "Current weight:",
    schedulesWeightChange: "Weekly change:",
    schedulesWeightLost: "Total lost:",
    schedulesTarget: "Target:",
    schedulesRemaining: "remaining)",
    schedulesLogWeight: "Log weight (kg)",
    schedulesRegister: "Log",
    schedulesSocialMediaAuto: "Social Media Auto",
    schedulesSocialMediaDesc: "Sends content ideas hourly: Carousel, Stories, Reels, X Post and TikTok. Posts to WhatsApp group.",
    schedulesAutoEnable: "Enable auto posting",
    schedulesStart: "Start:",
    schedulesHourly: "(every hour)",
    schedulesOtherAgents: "Other Agents",
    schedulesFooter: "Social Media sends content ideas every hour to the WhatsApp group. Other agents send daily summaries at the configured time.",
    schedulesHealth: "Health",
    schedulesHealthDesc: "Daily meal plan via WhatsApp",
    schedulesPersonalTrainer: "Personal Trainer",
    schedulesPersonalTrainerDesc: "Daily workout via WhatsApp",
    schedulesPersonalAssistant: "Personal Assistant",
    schedulesPersonalAssistantDesc: "Daily agenda via WhatsApp",
    schedulesSocialMedia: "Social Media",
    schedulesSocialMediaAgentDesc: "Daily content for social media",
    schedulesFinance: "Finance",
    schedulesMarketing: "Marketing",

    // Agent data panel
    agentDataFinanceLog: "Finance Log",
    agentDataHealthMetrics: "Health Metrics",
    agentDataCodeReviews: "Code Reviews",
    agentDataLearningProgress: "Learning Progress",
    agentDataVideoProjects: "Video Projects",
    agentDataImage3D: "Image / 3D Generations",
    agentDataMusicProjects: "Music Projects",
    agentDataLoading: "Loading...",
    agentDataIncome: "Income",
    agentDataExpenses: "Expenses",
    agentDataBalance: "Balance",
    agentDataNoTransactions: "No transactions today. Chat with Finance to log expenses.",
    agentDataNoHealth: "No health data today. Chat with Health to log metrics.",
    agentDataNoCodeReviews: "No code reviews today. Chat with Developer to review code.",
    agentDataNoLearning: "No learning progress today. Chat with Teacher to start learning.",
    agentDataNoVideo: "No video projects today. Chat with Video Editor to create one.",
    agentDataNoGenerations: "No generations today. Chat with 3D Designer to create images or 3D models.",
    agentDataNoMusic: "No music projects today. Chat with Music Producer to create music.",
    agentDataNoCreator: "No creative projects today. Chat with Creator to start.",
    agentDataHealthLog: "Health Log",
    agentDataCreatorProjects: "Creative Projects",
    agentDataDesigns: "Designs",
    agentDataNutritionToday: "Nutrition Today",
    agentDataProtein: "Protein",
    agentDataCarbs: "Carbs",
    agentDataFat: "Fat",

    // WhatsApp panel — automation
    wa_chat_personal_optional: "Personal Chat (optional)",
    wa_chat_personal_desc: "Personal chat for direct messages (optional if you already configured the groups above).",
    wa_urgente_meeting: "urgent, meeting",
    wa_option_notify: "Notify",
    wa_option_task: "Task",
    wa_option_summary: "Summary",
    wa_n8n_webhook_desc: "Received messages are sent to N8N automatically.",
    wa_n8n_placeholder: "https://your-n8n.com/webhook/...",
    wa_save: "Save",
    wa_broadcast_desc: "Send a message to multiple groups at once (with anti-ban delay).",
    wa_message_placeholder: "Message to send...",
    wa_send_to_n_groups: "Send to {count} group(s)",
    wa_summary: "Summary",

    // Social Media panel — additional
    social_topic_label: "Topic / Person / Event",
    social_topic_placeholder: "e.g. Thomas Sankara, Slavery in Brazil, Angela Davis...",
    social_hook_label: "Hook (optional)",
    social_photo_placeholder: "https://example.com/photo.jpg",

    // Common
    commonNone: "None",
    commonLoading: "Loading…",
    commonError: "Unknown error",

    // Command Palette
    commandPalettePlaceholder: "Search commands, agents, actions...",
    commandPaletteNoResults: "No results",

    // Slash Commands
    slashHistorico: "View conversation history",
    slashLimpar: "Clear current conversation",
    slashResumir: "Summarize conversation",
    slashExportar: "Export conversation",
    slashMemoria: "Search memory",
    slashAgentes: "View agents",
    slashAjuda: "View available commands",

    // Plugin System
    plugins: "Plugins",
    pluginsEmpty: "No plugins installed",
    pluginsLoad: "Load",
    pluginsUnload: "Unload",
    pluginsLoaded: "Plugin loaded",
    pluginsError: "Error loading plugin",

    // MCP
    mcp: "MCP Servers",
    mcpEmpty: "No MCP servers connected",
    mcpAdd: "Add server",
    mcpRemove: "Remove",

    // Keyboard Shortcuts
    shortcutsTitle: "Keyboard Shortcuts",

    // Skeleton
    skeletonLoading: "Loading...",
    skeletonLoadingMessages: "Loading messages...",
    skeletonLoadingAgents: "Loading agents...",
    skeletonLoadingSettings: "Loading settings...",

    // Agent Health
    agent_health_description: "Digital Health Office",
    agent_health_tagline: "Caring for your health with technology and precision",
    agent_health_quick_action_meal_analysis_label: "Meal Analysis",
    agent_health_quick_action_meal_analysis_prompt: "Analyze this food photo and tell me the macros",
    agent_health_quick_action_workout_label: "Custom Workout",
    agent_health_quick_action_workout_prompt: "Create a custom workout based on my history",
    agent_health_quick_action_log_weight_label: "Log Weight",
    agent_health_quick_action_log_weight_prompt: "I want to log today's weight",
    agent_health_quick_action_view_goals_label: "View Goals",
    agent_health_quick_action_view_goals_prompt: "Show my health goals and progress",
    agent_health_quick_action_schedule_appointment_label: "Schedule Appointment",
    agent_health_quick_action_schedule_appointment_prompt: "I need to schedule an appointment",
    agent_health_quick_action_exams_label: "Exams",
    agent_health_quick_action_exams_prompt: "I want to log my latest exams",
    agent_health_stat_bmi: "BMI",
    agent_health_stat_steps_today: "Steps Today",
    agent_health_stat_heart_rate: "Heart Rate",
    agent_health_stat_water: "Water",

    // Agent Finance
    agent_finance_description: "Personal Finance Office",
    agent_finance_tagline: "Total control of your finances in one place",
    agent_finance_quick_action_log_expense_label: "Log Expense",
    agent_finance_quick_action_log_expense_prompt: "I want to log an expense",
    agent_finance_quick_action_log_income_label: "Log Income",
    agent_finance_quick_action_log_income_prompt: "I want to log income",
    agent_finance_quick_action_monthly_balance_label: "Monthly Balance",
    agent_finance_quick_action_monthly_balance_prompt: "Show this month's financial balance",
    agent_finance_quick_action_budget_label: "Budget",
    agent_finance_quick_action_budget_prompt: "Create a smart monthly budget",
    agent_finance_quick_action_investments_label: "Investments",
    agent_finance_quick_action_investments_prompt: "Analyze my investments",
    agent_finance_quick_action_financial_goals_label: "Financial Goals",
    agent_finance_quick_action_financial_goals_prompt: "I want to see my financial goals",
    agent_finance_stat_balance: "Balance",
    agent_finance_stat_income: "Income",
    agent_finance_stat_expenses: "Expenses",
    agent_finance_stat_savings: "Savings",

    // Agent Developer
    agent_developer_description: "Development Station",
    agent_developer_tagline: "Code, debug, deploy - all in an immersive terminal",
    agent_developer_quick_action_review_code_label: "Review Code",
    agent_developer_quick_action_review_code_prompt: "Review this code for me and suggest improvements",
    agent_developer_quick_action_debug_label: "Debug",
    agent_developer_quick_action_debug_prompt: "I need help debugging this error",
    agent_developer_quick_action_new_feature_label: "New Feature",
    agent_developer_quick_action_new_feature_prompt: "I want to create a new feature",
    agent_developer_quick_action_code_review_label: "Code Review",
    agent_developer_quick_action_code_review_prompt: "Do a complete code review",
    agent_developer_quick_action_architecture_label: "Architecture",
    agent_developer_quick_action_architecture_prompt: "Help me design the architecture",
    agent_developer_quick_action_tests_label: "Tests",
    agent_developer_quick_action_tests_prompt: "Create unit tests for this module",
    agent_developer_stat_commits: "Commits",
    agent_developer_stat_issues: "Issues",
    agent_developer_stat_prs: "PRs",
    agent_developer_stat_uptime: "Uptime",

    // Agent Marketing
    agent_marketing_description: "Digital Marketing Studio",
    agent_marketing_tagline: "Create viral content and conquer your social media",
    agent_marketing_quick_action_viral_post_label: "Viral Post",
    agent_marketing_quick_action_viral_post_prompt: "Create a viral post for Instagram",
    agent_marketing_quick_action_campaign_label: "Campaign",
    agent_marketing_quick_action_campaign_prompt: "Plan a complete marketing campaign",
    agent_marketing_quick_action_persuasive_copy_label: "Persuasive Copy",
    agent_marketing_quick_action_persuasive_copy_prompt: "Write persuasive copy to sell",
    agent_marketing_quick_action_storytelling_label: "Storytelling",
    agent_marketing_quick_action_storytelling_prompt: "Create engaging storytelling",
    agent_marketing_quick_action_metrics_analysis_label: "Metrics Analysis",
    agent_marketing_quick_action_metrics_analysis_prompt: "Analyze my social media metrics",
    agent_marketing_quick_action_calendar_label: "Calendar",
    agent_marketing_quick_action_calendar_prompt: "Create an editorial calendar",
    agent_marketing_stat_reach: "Reach",
    agent_marketing_stat_engagement: "Engagement",
    agent_marketing_stat_posts: "Posts",
    agent_marketing_stat_leads: "Leads",

    // Agent Designer
    agent_designer_description: "Creative Design Atelier",
    agent_designer_tagline: "Turn your ideas into visual art and experiences",
    agent_designer_quick_action_generate_image_label: "Generate Image",
    agent_designer_quick_action_generate_image_prompt: "Generate an impressive image for me",
    agent_designer_quick_action_3d_model_label: "3D Model",
    agent_designer_quick_action_3d_model_prompt: "Create a detailed 3D model",
    agent_designer_quick_action_uiux_design_label: "UI/UX Design",
    agent_designer_quick_action_uiux_design_prompt: "I need help with interface design",
    agent_designer_quick_action_icons_label: "Icons",
    agent_designer_quick_action_icons_prompt: "Create a custom icon set",
    agent_designer_quick_action_color_palette_label: "Color Palette",
    agent_designer_quick_action_color_palette_prompt: "Suggest a harmonious color palette",
    agent_designer_quick_action_prototype_label: "Prototype",
    agent_designer_quick_action_prototype_prompt: "Create an interactive prototype",
    agent_designer_stat_images: "Images",
    agent_designer_stat_3d_models: "3D Models",
    agent_designer_stat_prototypes: "Prototypes",
    agent_designer_stat_styles: "Styles",

    // Agent Creator
    agent_creator_description: "Creative Production Studio",
    agent_creator_tagline: "Produce professional videos and music with AI",
    agent_creator_quick_action_create_video_label: "Create Video",
    agent_creator_quick_action_create_video_prompt: "I want to create a professional video",
    agent_creator_quick_action_create_music_label: "Create Music",
    agent_creator_quick_action_create_music_prompt: "I want to create an original song",
    agent_creator_quick_action_edit_video_label: "Edit Video",
    agent_creator_quick_action_edit_video_prompt: "I need help with video editing",
    agent_creator_quick_action_podcast_label: "Podcast",
    agent_creator_quick_action_podcast_prompt: "I want to create a podcast",
    agent_creator_quick_action_sound_effects_label: "Sound Effects",
    agent_creator_quick_action_sound_effects_prompt: "I need sound effects",
    agent_creator_quick_action_mixing_label: "Mixing",
    agent_creator_quick_action_mixing_prompt: "Help me mix this audio",
    agent_creator_stat_videos: "Videos",
    agent_creator_stat_music: "Songs",
    agent_creator_stat_podcasts: "Podcasts",
    agent_creator_stat_hours: "Hours",

    // Agent Teacher
    agent_teacher_description: "Virtual Classroom",
    agent_teacher_tagline: "Learn anything with AI-powered personalized teaching",
    agent_teacher_quick_action_study_plan_label: "Study Plan",
    agent_teacher_quick_action_study_plan_prompt: "Create a personalized study plan",
    agent_teacher_quick_action_translate_label: "Translate",
    agent_teacher_quick_action_translate_prompt: "I need to translate a text",
    agent_teacher_quick_action_quiz_label: "Quiz",
    agent_teacher_quick_action_quiz_prompt: "Create a quiz to test my knowledge",
    agent_teacher_quick_action_summary_label: "Summary",
    agent_teacher_quick_action_summary_prompt: "Summarize this content for me",
    agent_teacher_quick_action_explain_label: "Explain",
    agent_teacher_quick_action_explain_prompt: "Explain this concept simply",
    agent_teacher_quick_action_flashcards_label: "Flashcards",
    agent_teacher_quick_action_flashcards_prompt: "Create flashcards for review",
    agent_teacher_stat_lessons: "Lessons",
    agent_teacher_stat_quizzes: "Quizzes",
    agent_teacher_stat_languages: "Languages",
    agent_teacher_stat_hours: "Hours",

    // Agent Automation
    agent_automation_description: "Intelligent Automation Center",
    agent_automation_tagline: "Connect agents, automate tasks and be productive",
    agent_automation_quick_action_create_workflow_label: "Create Workflow",
    agent_automation_quick_action_create_workflow_prompt: "Create an automation workflow between agents",
    agent_automation_quick_action_config_bot_label: "Config Bot",
    agent_automation_quick_action_config_bot_prompt: "Configure a bot for me",
    agent_automation_quick_action_test_webhook_label: "Test Webhook",
    agent_automation_quick_action_test_webhook_prompt: "Test a webhook",
    agent_automation_quick_action_list_automations_label: "List Automations",
    agent_automation_quick_action_list_automations_prompt: "List all active automations",
    agent_automation_quick_action_trigger_agent_label: "Trigger Agent",
    agent_automation_quick_action_trigger_agent_prompt: "Trigger a task in another agent",
    agent_automation_quick_action_monitor_label: "Monitor",
    agent_automation_quick_action_monitor_prompt: "Monitor automation status",
    agent_automation_stat_workflows: "Workflows",
    agent_automation_stat_triggers: "Triggers",
    agent_automation_stat_executions: "Executions",
    agent_automation_stat_success: "Success",

    // Agent System
    agent_system_description: "System Control Panel",
    agent_system_tagline: "Configure and monitor all aspects of Orun OS",
    agent_system_quick_action_config_ai_label: "Configure AI",
    agent_system_quick_action_config_ai_prompt: "I want to configure AI parameters",
    agent_system_quick_action_diagnose_label: "Diagnose",
    agent_system_quick_action_diagnose_prompt: "Diagnose the system status",
    agent_system_quick_action_clear_cache_label: "Clear Cache",
    agent_system_quick_action_clear_cache_prompt: "Clear the system cache",
    agent_system_quick_action_backup_label: "Backup",
    agent_system_quick_action_backup_prompt: "Create a backup of settings",
    agent_system_quick_action_security_label: "Security",
    agent_system_quick_action_security_prompt: "Check security settings",
    agent_system_quick_action_performance_label: "Performance",
    agent_system_quick_action_performance_prompt: "Analyze system performance",
    agent_system_stat_cpu: "CPU",
    agent_system_stat_ram: "RAM",
    agent_system_stat_disk: "Disk",
    agent_system_stat_uptime: "Uptime",

    // Agent Automotive
    agent_automotive_description: "Your Automotive Consultant",
    agent_automotive_tagline: "Diagnostics, maintenance, documents and prices - everything for your car",
    agent_automotive_quick_action_diagnostic_label: "Diagnostic",
    agent_automotive_quick_action_diagnostic_prompt: "My car has the following issue: ",
    agent_automotive_quick_action_fines_inquiry_label: "Fines Inquiry",
    agent_automotive_quick_action_fines_inquiry_prompt: "Check if I have fines or pending issues on my car",
    agent_automotive_quick_action_documents_label: "Documents",
    agent_automotive_quick_action_documents_prompt: "I want to check my car's documents",
    agent_automotive_quick_action_parts_label: "Parts",
    agent_automotive_quick_action_parts_prompt: "Search for the best price for this part: ",
    agent_automotive_quick_action_change_car_label: "Change Car",
    agent_automotive_quick_action_change_car_prompt: "I want to change cars, help me find options",
    agent_automotive_quick_action_maintenance_label: "Maintenance",
    agent_automotive_quick_action_maintenance_prompt: "I want to know the preventive maintenance for my car",
    agent_automotive_stat_km: "KM",
    agent_automotive_stat_next_service: "Next Service",
    agent_automotive_stat_documents: "Documents",
    agent_automotive_stat_fuel_consumption: "Consumption",

    // Agent Hampton
    agent_hampton_description: "Orun OS Central Intelligence",
    agent_hampton_tagline: "Your personal assistant with advanced AI and powerful tools",
    agent_hampton_quick_action_chat_label: "Chat",
    agent_hampton_quick_action_chat_prompt: "",
    agent_hampton_quick_action_web_search_label: "Web Search",
    agent_hampton_quick_action_web_search_prompt: "Search the web for me",
    agent_hampton_quick_action_analyze_label: "Analyze",
    agent_hampton_quick_action_analyze_prompt: "Analyze this information for me",
    agent_hampton_quick_action_automate_label: "Automate",
    agent_hampton_quick_action_automate_prompt: "Create an automation for this task",
    agent_hampton_stat_messages: "Messages",
    agent_hampton_stat_tools: "Tools",
    agent_hampton_stat_memory: "Memory",
    agent_hampton_stat_uptime: "Uptime",

    // Agent Page UI
    agent_quick_actions_title: "Quick Actions",
    agent_open_workspace: "Open Workspace",
    agent_chat_with_ai: "Chat with AI",
    agent_start_session: "Start Session",

    // Projects Panel
    projects_title: "Projects",
    projects_filter_all: "all",
    projects_filter_active: "active",
    projects_filter_archived: "archived",
    projects_new_button: "New",
    projects_name_placeholder: "Project name",
    projects_description_placeholder: "Description (optional)",
    projects_create_button: "Create",
    projects_cancel_button: "Cancel",

    // Command Palette
    command_palette_home_label: "Home",
    command_palette_home_description: "Go to home",
    command_palette_section_navigation: "Navigation",
    command_palette_agents_label: "Agents",
    command_palette_agents_description: "View all agents",
    command_palette_projects_label: "Projects",
    command_palette_projects_description: "Manage projects",
    command_palette_settings_label: "Settings",
    command_palette_settings_description: "Open settings",
    command_palette_new_chat_label: "New Chat",
    command_palette_new_chat_description: "Start new chat",
    command_palette_section_actions: "Actions",
    command_palette_history_label: "History",
    command_palette_history_description: "View conversation history",
    command_palette_agent_description: "Chat with {name}",
    command_palette_section_agents: "Agents",
    command_palette_search_placeholder: "Search commands, agents, actions...",
    command_palette_no_results: "No results for",

    // Memory Panel
    memory_title: "Memory",
    memory_search_placeholder: "Search memories...",

    // Settings Panel
    settings_section_language: "Language",
    settings_section_ai_provider: "AI Provider",
    settings_section_model: "Model",
    settings_section_connection: "Connection",
    settings_ollama_url_desc: "Local Ollama server URL",
    settings_api_key_label: "API Key",
    settings_api_key_saved: "(saved)",
    settings_api_key_desc: "Key for {label}",
    settings_api_key_placeholder: "Paste your key...",
    settings_fallback_provider_label: "Fallback Provider",
    settings_fallback_provider_desc: "Used if primary fails",
    settings_none: "None",
    settings_whatsapp_connector_label: "WhatsApp Connector",
    settings_whatsapp_connector_desc: "Configure message routing",
    settings_section_tts: "Text-to-Speech",
    settings_tts_engine_label: "Engine",
    settings_tts_engine_desc: "Active engine: {engine}",
    settings_tts_voice_label: "Voice",
    settings_tts_voice_desc: "Voice selected for synthesis",
    settings_tts_fallback_info: "Auto-fallback: if cloud engine fails (tokens, quota, etc.), switches to Piper → Bark (local, no internet)",
    settings_agent_models_button: "Models per Agent",
    settings_usage_button: "Usage Today",
    settingsBackgroundListen: "Background Listening",
    settingsBackgroundListenDesc: "Mic listens for 'OK Orun' 24/7 and opens the overlay automatically",
    settingsWakeServiceRunning: "Service running",
    settingsWakeServiceStopped: "Service stopped",
    settingsWakeServiceRestart: "Restart",
    settingsWakeServiceTest: "Diagnose",
    settingsWakeDiagnosticPackages: "Python packages",
    settingsWakeDiagnosticPort: "TCP port 8081",

    // Automotive Garage
    automotive_service_type_oil_change: "Oil Change",
    automotive_service_type_general_revision: "General Revision",
    automotive_service_type_brakes: "Brakes",
    automotive_service_type_suspension: "Suspension",
    automotive_service_type_engine: "Engine",
    automotive_service_type_transmission: "Transmission",
    automotive_service_type_electrical: "Electrical",
    automotive_service_type_air_conditioning: "Air Conditioning",
    automotive_service_type_tires: "Tires",
    automotive_service_type_alignment: "Alignment",
    automotive_service_type_balancing: "Balancing",
    automotive_service_type_other: "Other",
    automotive_expense_category_fuel: "Fuel",
    automotive_expense_category_parking: "Parking",
    automotive_expense_category_toll: "Toll",
    automotive_expense_category_fine: "Fine",
    automotive_expense_category_insurance: "Insurance",
    automotive_expense_category_ipva: "Vehicle Tax",
    automotive_expense_category_registration: "Registration",
    automotive_expense_category_wash: "Car Wash",
    automotive_expense_category_accessories: "Accessories",
    automotive_expense_category_other: "Other",
    automotive_unknown_vehicle: "Unknown",
    automotive_nav_overview: "Dashboard",
    automotive_nav_vehicles: "Vehicles",
    automotive_nav_services: "Services",
    automotive_nav_expenses: "Expenses",
    automotive_header_title: "Premium Workshop",
    automotive_header_subtitle: "Automotive Consultant",
    automotive_filter_label: "Filter",
    automotive_filter_all: "All",
    automotive_overview_stat_vehicles: "Vehicles",
    automotive_overview_stat_services: "Services",
    automotive_overview_stat_total_expenses: "Total Expenses",
    automotive_overview_stat_total_services: "Total Services",
    automotive_overview_new_vehicle_title: "New Vehicle",
    automotive_overview_new_vehicle_desc: "Add car",
    automotive_overview_new_service_title: "New Service",
    automotive_overview_new_service_desc: "Log maintenance",
    automotive_overview_new_expense_title: "New Expense",
    automotive_overview_new_expense_desc: "Fuel, fine, etc",
    automotive_overview_recent_activity: "Recent Activity",
    automotive_overview_no_activity: "No activity yet",
    automotive_vehicles_title: "My Vehicles",
    automotive_vehicles_add_button: "Add",
    automotive_vehicles_empty_title: "No vehicles",
    automotive_vehicles_empty_desc: "Click 'Add' to get started",
    automotive_services_title: "Services",
    automotive_services_add_button: "New Service",
    automotive_services_empty: "No services",
    automotive_services_no_shop: "No shop",
    automotive_expenses_title: "Expenses",
    automotive_expenses_add_button: "New Expense",
    automotive_expenses_empty: "No expenses",
    automotive_modal_add_vehicle_title: "Add Vehicle",
    automotive_field_name: "Name / Nickname *",
    automotive_field_name_placeholder: "e.g. My Corolla",
    automotive_field_year: "Year *",
    automotive_field_model: "Model *",
    automotive_field_plate: "Plate",
    automotive_field_color: "Color",
    automotive_field_color_placeholder: "Silver",
    automotive_field_mileage: "Mileage",
    automotive_modal_add_vehicle_button: "Add Vehicle",
    automotive_modal_add_service_title: "New Service",
    automotive_field_vehicle: "Vehicle *",
    automotive_field_service_type: "Service Type",
    automotive_field_description: "Description *",
    automotive_field_description_placeholder: "e.g. Oil change 5W30",
    automotive_field_cost: "Cost (R$)",
    automotive_field_current_km: "Current KM",
    automotive_field_shop: "Shop / Location",
    automotive_modal_add_service_button: "Log Service",
    automotive_add_vehicle_first: "Add a vehicle first",
    automotive_modal_add_expense_title: "New Expense",
    automotive_field_category: "Category",
    automotive_field_expense_desc_placeholder: "e.g. Regular Gas",
    automotive_field_amount: "Amount (R$) *",
    automotive_modal_add_expense_button: "Log Expense",

    // Developer IDE
    developer_ide_explorer_label: "Explorer",
    developer_ide_import_button: "+ Import",
    developer_ide_no_file_open: "No file open",
    developer_ide_terminal_help: "Commands: help, clear, ls, cat, echo, pwd, date, version",
    developer_ide_terminal_placeholder: "Type a command...",
    developer_ide_terminal_label: "Terminal",
    developer_ide_show_terminal: "\u25B2 Terminal",

    // System Console
    system_console_welcome: "Orun OS System Console v1.0 \u2014 Type 'help' for commands",
    system_console_help_title: "Available commands:",
    system_console_help_help: "help \u2014 Show this help",
    system_console_help_clear: "clear \u2014 Clear console",
    system_console_help_date: "date \u2014 Show current date/time",
    system_console_help_echo: "echo <text> \u2014 Echo text back",
    system_console_help_uptime: "uptime \u2014 Show estimated uptime",
    system_console_help_version: "version \u2014 Show Orun OS version",
    system_console_help_agents: "agents \u2014 List available agents",
    system_console_help_ram: "ram \u2014 Show estimated RAM usage",
    system_console_help_clearmemory: "clearmemory \u2014 Clear console history",
    system_console_uptime: "Uptime: {hrs}h {mins}m",
    system_console_version: "Orun OS v1.0.0 \u2014 Plugin System v1.0",
    system_console_agents_list_1: "Hampton, Developer, Designer, Creator",
    system_console_agents_list_2: "Health, Finance, Teacher, Marketing",
    system_console_agents_list_3: "Automation, System",
    system_console_ram_device: "Device RAM: {ram}GB",
    system_console_ram_available: "Estimated available RAM: {available}",
    system_console_command_not_found: "Command not found: {cmd}. Type 'help' for available commands.",
    system_console_cleared: "Console cleared.",
    system_console_history_cleared: "Console history cleared.",
    system_console_resource_cpu: "CPU",
    system_console_resource_ram: "RAM",
    system_console_resource_disk: "Disk",
    system_console_placeholder: "Type a command...",

    // Designer
    designer_template_instagram_post: "Instagram Post",
    designer_template_story: "Story",
    designer_template_thumbnail: "Thumbnail",
    designer_template_logo: "Logo",
    designer_template_presentation: "Presentation",
    designer_shape_rectangle: "Rectangle",
    designer_shape_circle: "Circle",
    designer_shape_triangle: "Triangle",
    designer_shape_star: "Star",
    designer_shape_line: "Line",
    designer_icon_heart: "Heart",
    designer_icon_bolt: "Bolt",
    designer_icon_sun: "Sun",
    designer_tool_select: "Select",
    designer_tool_text: "Text",
    designer_tool_shape: "Shape",
    designer_tool_image: "Image",
    designer_tool_draw: "Draw",
    designer_tool_delete: "Delete",
    designer_toast_png_copied: "PNG copied!",
    designer_toast_png_saved: "PNG saved!",
    designer_toast_svg_exported: "SVG exported!",
    designer_zoom_fit: "Fit",
    designer_import_button: "Import",
    designer_export_button: "Export",
    designer_share_button: "Share",
    designer_tab_templates: "Templates",
    designer_tab_elements: "Elements",
    designer_tab_text: "Text",
    designer_tab_uploads: "Uploads",
    designer_tab_background: "Background",
    designer_templates_section_title: "Preset Sizes",
    designer_elements_section_shapes: "Shapes",
    designer_elements_section_icons: "Icons",
    designer_elements_section_decorative: "Decorative",
    designer_text_add_title: "Add title",
    designer_text_add_subtitle: "Add subtitle",
    designer_text_add_body: "Add text",
    designer_uploads_drag_here: "Drag images here",
    designer_uploads_or_click: "or click to select",
    designer_background_solid_colors: "Solid Colors",
    designer_background_gradients: "Gradients",
    designer_panel_design_name: "Design",
    designer_panel_canvas_size: "Canvas Size",
    designer_panel_width: "Width",
    designer_panel_height: "Height",
    designer_panel_background_color: "Background Color",
    designer_panel_select_element_hint: "Select an element to edit its properties",
    designer_panel_position: "Position",
    designer_panel_size: "Size",
    designer_panel_rotation: "Rotation",
    designer_panel_opacity: "Opacity",
    designer_panel_text: "Text",
    designer_panel_font_size: "Font Size",
    designer_panel_font_family: "Font Family",
    designer_panel_style: "Style",
    designer_panel_text_color: "Text Color",
    designer_panel_fill_color: "Fill Color",
    designer_panel_border_color: "Border Color",
    designer_panel_none: "None",
    designer_panel_border_width: "Border Width",
    designer_panel_layer_order: "Layer Order",
    designer_panel_bring_front: "Bring to Front",
    designer_panel_send_back: "Send to Back",
    designer_canvas_drag_image: "Drag an image",

    // Creator Audio
    creator_audio_deck: "Deck {deck}",
    creator_audio_bpm: "BPM",
    creator_audio_pitch: "Pitch",
    creator_audio_sync: "Sync",
    creator_audio_cue: "Cue",
    creator_audio_play: "Play",
    creator_audio_pause: "Pause",
    creator_audio_stop: "Stop",
    creator_audio_rec: "REC",
    creator_audio_mixer: "Mixer",
    creator_audio_master: "Master",
    creator_audio_crossfader: "Crossfader",
    creator_audio_headphones: "Headphones",
    creator_audio_cue_mix: "Cue Mix",
    creator_audio_effects: "Effects",
    creator_audio_samples: "Samples",
    creator_audio_recording: "Recording",
    creator_audio_format: "Format",
    creator_audio_quality: "Quality",
    creator_audio_export: "Export",
    creator_audio_import: "Import",
    creator_audio_recording_status: "Recording...",
    creator_audio_ready: "Ready",
    creator_audio_storage: "Storage",
    creator_audio_tempo: "Tempo",
    creator_audio_hi: "HI",
    creator_audio_mid: "MD",
    creator_audio_lo: "LO",
    creator_audio_pan: "Pan",
    creator_audio_wet: "WET",
    creator_audio_par_x: "PAR X",
    creator_audio_par_y: "PAR Y",
    creator_audio_low: "Low",
    creator_audio_mid_freq: "Mid",
    creator_audio_high: "High",
    creator_audio_solo: "S",
    creator_audio_mute: "M",
    creator_audio_open: "Open",
    creator_audio_volume: "Volume",
    creator_audio_none: "None",
    creator_audio_imported: "Imported",
    creator_audio_loaded: "Loaded",
    creator_audio_error_no_audio: "No audio loaded",
    // Creator Video
    creator_video_select: "Select",
    creator_video_trim: "Trim",
    creator_video_split: "Split",
    creator_video_delete: "Delete",
    creator_video_copy: "Copy",
    creator_video_paste: "Paste",
    creator_video_undo: "Undo",
    creator_video_redo: "Redo",
    creator_video_export: "Export",
    creator_video_media: "Media",
    creator_video_text: "Text",
    creator_video_effects: "Effects",
    creator_video_transitions: "Transitions",
    creator_video_import: "+ Import",
    creator_video_mixer: "Mixer",
    creator_video_master: "Master",
    creator_video_position: "Position",
    creator_video_scale: "Scale",
    creator_video_rotation: "Rotation",
    creator_video_blend_mode: "Blend Mode",
    creator_video_opacity: "Opacity",
    creator_video_volume: "Volume",
    creator_video_fade_in: "Fade In",
    creator_video_fade_out: "Fade Out",
    creator_video_font: "Font",
    creator_video_size: "Size",
    creator_video_color: "Color",
    creator_video_clip_info: "Clip Info",
    creator_video_type: "Type",
    creator_video_track: "Track",
    creator_video_start: "Start",
    creator_video_duration: "Duration",
    creator_video_safe_margins: "Safe Margins",
    creator_video_fullscreen: "Fullscreen",
    creator_video_timeline: "Timeline",
    creator_video_zoom_in: "Zoom In",
    creator_video_zoom_out: "Zoom Out",
    creator_video_title: "Title",
    creator_video_subtitle: "Subtitle",
    creator_video_caption: "Caption",
    creator_video_solo: "Solo",
    creator_video_mute: "Mute",
    creator_video_visibility: "Visibility",
    creator_video_lock: "Lock",
    // Export/Import panel
    exportImportTitle: "Export/Import Conversations",
    exportSelectAll: "Select All",
    exportDeselectAll: "Deselect All",
    exportSelected: "selected",
    exportNoAgent: "No agent",
    exportExporting: "Exporting...",
    exportExportJSON: "Export JSON",
    exportImporting: "Importing...",
    exportImportJSON: "Import JSON",
    exportSuccess: "Operation completed!",
    exportError: "Operation failed",
    exportFileNotSupported: "Unsupported file format",
    exportConversations: "Conversations",
    exportFullBackup: "Full Backup",
    exportFullDescription: "Exports all conversations, settings, schedules, and agent memory into a single JSON file.",
    // WhatsApp panel
    whatsappDailyLimit: "Daily Limit",
    whatsappConnect: "Connect WhatsApp",
    whatsappSessionKept: "Session will be kept after first connection",
    whatsappAutoReconnect: "Auto-reconnect",
    whatsappYourGroups: "Your Groups",
    whatsappNoGroupsFound: "No groups found. Create groups in WhatsApp and click refresh.",
    whatsappGroupsByAgent: "Groups by Agent",
    whatsappJidCopyHelp: "Copy the JID from the list above and paste it in the corresponding agent field.",
    whatsappKeywords: "Keywords",
    whatsappKeywordsDesc: "When keywords appear in groups, an automatic action is triggered.",
    whatsappGenerate: "Generate",
    whatsappAutoReply: "Auto-reply",
    whatsappAutoReplyDesc: "Messages in linked groups are processed by the corresponding agent AI and replied automatically. Dates mentioned in messages are detected and create automatic schedules.",
    whatsappNoGroupsConfigured: "No groups configured in the Config tab",
    whatsappRetry: "Retry",
    whatsappQueue: "Queue",
    whatsappConfigTab: "Configuration",
    whatsappAutomationTab: "Automation",
    whatsappScanWhatsApp: "Scan with WhatsApp",
    // AgentData panel
    agentDataDraft: "Draft",
    agentDataRendering: "Rendering",
    agentDataProcessing: "Processing",
    agentDataCompleted: "Completed",
    agentDataFailed: "Failed",
    agentDataCustom: "custom",
    // TitleBar
    titlebarMinimize: "Minimize",
    titlebarMaximize: "Maximize",
    titlebarClose: "Close",
    // VoiceOverlay
    voiceOverlayListening: "listening...",
    voiceOverlayThinking: "thinking...",
    voiceOverlaySpeaking: "speaking...",
    // ChatInput
    chatInputCommands: "Commands",
    // ConversationList
    conversationHistory: "History",
    // SocialMedia panel
    socialMediaCreateViral: "Create viral content for Instagram, TikTok and X focused on erased stories and fight against racism.",
    socialMediaWebhooksN8n: "N8N Webhooks",
    socialMediaConfigureWebhooks: "Configure n8n webhook URLs to publish via Buffer. Payload: { text, imageUrl?, videoUrl?, format? }",
    socialMediaSaveWebhooks: "Save Webhooks",
    socialMediaPlatform: "Platform",
    socialMediaGenerating: "Generating...",
    socialMediaGenerateContent: "Generate Content",
    socialMediaInstagramReqImage: "Error: Instagram requires an image URL",
    socialMediaTiktokReqMedia: "Error: TikTok requires a video or image URL",
    socialMediaPublishedSuccess: "Published successfully!",
    socialMediaPublishError: "Error",
    // Projects panel
    projectsNewProject: "New project",
    // Spotify integration
    settingsSpotifySection: "Spotify",
    settingsSpotifyClientId: "Client ID",
    settingsSpotifyClientSecret: "Client Secret",
    settingsSpotifyConnect: "Connect OAuth",
    settingsSpotifyDisconnect: "Disconnect",
    settingsSpotifyConnected: "Connected",
    settingsSpotifyNotConnected: "Not connected",
    settingsSpotifyPlay: "Play",
    settingsSpotifyPause: "Pause",
    settingsSpotifyNowPlaying: "Now playing",
    settingsSpotifyDeviceLabel: "Device",
    settingsSpotifyDeviceDesc: "Select playback device",
    settingsSpotifyNoDevice: "No device found",
    settingsSpotifyAuthHelp: "Create app at developer.spotify.com",
    settingsSpotifyAuthHelpDesc: "Redirect URI: http://127.0.0.1:9222/callback",
    // Discord integration
    settingsDiscordSection: "Discord Bot",
    settingsDiscordToken: "Bot Token",
    settingsDiscordConnect: "Connect",
    settingsDiscordDisconnect: "Disconnect",
    settingsDiscordConnected: "Connected",
    settingsDiscordConnecting: "Connecting...",
    settingsDiscordError: "Connection error",
    settingsDiscordGuild: "Server",
    settingsDiscordChannel: "Channel",
    settingsDiscordAutoResponse: "Auto-response",
    settingsDiscordAutoResponseDesc: "Marketing agent responds to Discord messages",
    settingsDiscordBotTokenHelp: "Create bot at discord.com/developers",
    settingsDiscordBotTokenHelpDesc: "Copy bot token and paste below",
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
    agentAutomotive: "Automotriz",
    agentSocialMedia: "Redes Sociales",
    agentImageCamera: "IA de Imagen y Cámara",
    agentSpeechAudio: "Habla y Audio",
    agentKnowledgeMemory: "Conocimiento y Memoria",
    agentOSConfig: "SO y Configuración",
    agentDesignVisual: "Diseño & Visual",
    agentAudiovisualContent: "Contenido Audiovisual",
    agentHealth: "Salud",
    agentLearningLanguages: "Aprendizaje & Idiomas",
    agentMarketingSocial: "Marketing & Social",

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
    sidebarHome: "Inicio",

    // Status bar
    statusNativeAI: "IA Nativa",
    statusConnected: "Conectado",
    statusHamptonOnline: "Hampton \u2022 En línea",
    statusChangeModel: "Cambiar modelo",

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
    settings_wake_word: "Palabra de Activación",
    settings_wake_word_desc: "Activación por voz (Beta)",
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
    settingsTheme: "Tema",
    settingsThemeDark: "Oscuro",
    settingsThemeLight: "Claro",
    settingsThemeSystem: "Sistema",
    settingsFalAiNote: "(para generar imágenes)",
    settingsFalAiPlaceholder: "Clave Fal.ai (para imágenes en Social Media)",
    settingsSaved: "¡Guardado!",
    settingsHome: "Inicio",
    settingsTabAI: "IA y Modelo",
    settingsTabIntegrations: "Integraciones",
    settingsTabAppearance: "Apariencia",
    settingsTabSystem: "Sistema",
    settingsVoiceSystem: "Sistema de Voz",
    settingsConversationalMode: "Modo Conversacional",
    settingsConversationalModeDesc: "Micrófono se abre automáticamente después de que la IA hable",
    settingsNoiseSuppression: "Supresión de Ruido",
    settingsNoiseSuppressionDesc: "Elimina el ruido de fondo durante la grabación",
    settingsResponseDelay: "Retraso de Respuesta",
    settingsResponseDelayDesc: "Espera después de dejar de hablar antes de enviar a la IA",
    settingsWhatsAppSection: "WhatsApp",
    settingsWhatsAppDesc: "Configurar enrutamiento de mensajes",
    settingsPersonaSection: "Persona de la IA",
    settingsAppearanceSection: "Tema",
    settingsSecuritySection: "Seguridad",
    settingsExecutionSection: "Ejecución",
    settingsRunInBackgroundDesc: "Mantener Orun ejecutándose con la ventana cerrada",
    settingsStartWithWindows: "Iniciar con Windows",
    settingsStartWithWindowsDesc: "Abrir Orun automáticamente al encender la computadora",
    settingsAgentsSection: "Agentes",
    settingsUpdatesSection: "Actualizaciones",
    settingsDownloading: "Descargando...",
    closeWorkspace: "Cerrar",
    loadingWorkspace: "Cargando workspace...",
    slashHistory: "Historial",
    slashHistoryDesc: "Ver historial de conversaciones",
    slashClear: "Limpiar",
    slashClearDesc: "Limpiar conversación actual",
    slashSummarize: "Resumir",
    slashSummarizeDesc: "Resumir conversación",
    slashExport: "Exportar",
    slashExportDesc: "Exportar conversación",
    slashVoices: "Voces",
    slashVoicesDesc: "Configurar voz",
    slashModel: "Modelo",
    slashModelDesc: "Cambiar modelo",
    slashMemory: "Memoria",
    slashMemoryDesc: "Buscar en memoria",
    slashAgents: "Agentes",
    slashAgentsDesc: "Ver agentes",
    slashHelp: "Ayuda",
    slashHelpDesc: "Ver comandos disponibles",
    conversationSearchEmpty: "No se encontraron conversaciones",
    onboardingWelcome: "Bienvenido a Orun OS",
    onboardingWelcomeSub: "Tu asistente personal con IA",
    onboardingWelcomeDesc: "Vamos a configurar todo en unos pocos pasos.",
    onboardingProvider: "Elige un Proveedor",
    onboardingProviderSub: "Dondeará tu IA",
    onboardingProviderDesc: "Selecciona un proveedor de IA e ingresa tu API key.",
    onboardingProviderFree: "Gratis",
    onboardingAgent: "Conoce a Hampton",
    onboardingAgentSub: "Tu primer agente",
    onboardingAgentDesc: "Hampton es tu asistente principal. Puede buscar en la web, acceder a tus archivos y mucho más.",
    onboardingAgentFeature1: "Búsqueda web en tiempo real",
    onboardingAgentFeature2: "Acceso a tus archivos locales",
    onboardingAgentFeature3: "Memoria de conversaciones anteriores",
    onboardingAgentFeature4: "Comandos de voz",
    onboardingReady: "¡Todo Listo!",
    onboardingReadySub: "Comienza a usar",
    onboardingReadyDesc: "Estás listo para comenzar. Haz clic abajo para iniciar tu primera conversación.",
    onboardingApiKey: "Tu API key",
    onboardingKeyValid: "✓ ¡Key válida!",
    onboardingKeyInvalid: "✗",
    onboardingSkip: "Omitir",
    onboardingDontShow: "No mostrar de nuevo",
    onboardingBack: "Atrás",
    onboardingNext: "Siguiente",
    onboardingStart: "Comenzar",
    errorBoundaryMessage: "Algo salió mal",
    errorBoundaryReload: "Recargar",
    ariaStartDictation: "Iniciar dictado",
    ariaStopDictation: "Detener dictado",
    ariaSendMessage: "Enviar mensaje",
    offlineMessage: "Sin conexión a internet",
    settingsBackupSection: "Copia de Seguridad y Restauración",
    settingsRestoreConfirm: "¿Restaurar esta copia de seguridad? La app se reiniciará.",
    ariaCancelEdit: "Cancelar edición",
    ariaConfirmEdit: "Confirmar edición",
    ariaEditMessage: "Editar mensaje",
    ariaRegenerate: "Regenerar respuesta",
    ariaDeleteProject: "Eliminar proyecto",
    statusOnline: "En línea",
    statusOffline: "Sin conexión",
    loadingConversation: "Cargando conversación...",
    encryptionWeakMode: "Cifración en modo débil — clave guardada en texto plano",
    close: "Cerrar",
    skipToContent: "Saltar al contenido",
    conversations: "Conversaciones",
    slashCommands: "Comandos",
    // Profile panel
    profileTitle: "Mi Perfil",
    profileName: "Nombre",
    profileNamePlaceholder: "Tu nombre",
    profilePhoto: "Foto de perfil",
    profilePhotoChange: "Cambiar foto",
    profilePhotoRemove: "Eliminar foto",
    profileVoiceRecording: "Grabación de voz",
    profileVoiceRecord: "Grabar voz",
    profileVoiceStop: "Detener grabación",
    profileVoiceUse: "Usar esta voz",
    profileVoiceDelete: "Eliminar grabación",
    profileSaved: "¡Perfil guardado!",
    profileSave: "Guardar perfil",

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
    voiceNoSTTFallback: "(Mensaje de voz — configure STT en Configuración > Voz)",

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
    whatsappHealthDesc: "Envíe fotos de comida para análisis de calorías y nutrientes",
    whatsappFinanceDesc: "Envíe comprobantes de PIX, tarjeta o boleta para registrar en finanzas",
    whatsappTrainerDesc: "Entrenamientos y actividades físicas",
    whatsappAssistantDesc: "Agenda y compromisos diarios",
    whatsappSocialDesc: "Contenido para Instagram, TikTok y X",
    whatsappTestSent: "Mensaje de prueba enviado a {name}!",
    whatsappTestError: "Error: {error}",
    whatsappTestSendTo: "Enviar mensaje de prueba a {name}",
    whatsappJidHelp: "Para obtener el JID de un grupo: abra el grupo en WhatsApp → toque el nombre del grupo → desplácese hasta el final → el código es el JID.",

    // Social media panel
    socialMediaStoriesDesc: "15s por diapositiva, 3-5 diapositivas",
    socialMediaReelsDesc: "30-90s, gancho fuerte",
    socialMediaCarouselDesc: "5-10 diapositivas, un punto cada una",
    socialMediaTikTokDesc: "15-60s, ritmo rápido",
    socialMediaXPostDesc: "280 caracteres, tweet único",
    socialMediaXThreadDesc: "5-10 tweets encadenados",
    socialMediaHook1: "Esto fue BORRADO de la historia brasileña",
    socialMediaHook2: "Nunca te enseñaron esto en la escuela",
    socialMediaHook3: "La historia que nadie cuenta",
    socialMediaHook4: "El hombre que el mundo olvidó",
    socialMediaHook5: "Una historia que TODO brasileño debería saber",
    socialMediaHook6: "Esto cambió el mundo para siempre",
    socialMediaHook7: "La verdad que nadie habla",
    socialMediaHook8: "La lucha que continúa hasta hoy",
    socialMediaImageUrl: "URL de Imagen (obligatorio)",
    socialMediaMediaUrl: "URL de Medios (obligatorio)",
    socialMediaGeneratedPrompt: "Prompt Generado",
    socialMediaCopied: "¡Copiado!",
    socialMediaCopy: "Copiar",
    socialMediaPublish: "Publicar",

    // Conversation list
    conversationNew: "Nueva conversación",
    conversationBrowserWarning: "El historial solo está disponible en la aplicación Electron empaquetada.",
    conversationLoading: "Cargando…",
    conversationEmpty: "Sin conversaciones aún.",
    conversationSearch: "Buscar conversaciones...",

    // Chat input
    chatImageAttached: "Imagen adjunta",
    chatAttachPhoto: "Adjuntar una foto (ej: una comida para el agente Nutritionist)",
    chatPlaceholder: "Pregúntale algo a Hampton... (prueba /voces o /model)",
    chatDisclaimer: "Hampton puede cometer errores. Siempre verifique información importante.",
    chatFileTooLarge: "Imagen demasiado grande. Tamaño máximo: 10 MB.",
    chatUnsupportedFile: "Tipo de archivo no soportado. Envíe solo imágenes.",

    // Message bubble
    messageEditResend: "Editar y reenviar",
    messageRegenerate: "Regenerar",

    // Message bubble — tool labels
    toolReadingFile: "Leyendo archivo",
    toolWritingFile: "Escribiendo archivo",
    toolEditingFile: "Editando archivo",
    toolListingFiles: "Listando archivos",
    toolSearchingFiles: "Buscando archivos",
    toolSearchingContent: "Buscando contenido",
    toolRunningCommand: "Ejecutando comando",
    toolFetchingUrl: "Obteniendo URL",
    toolSavingMemory: "Guardando memoria",
    toolSearchingMemory: "Buscando memoria",
    toolSendingNotification: "Enviando notificación",
    toolSchedulingTask: "Programando tarea",
    toolDone: "hecho",
    toolWorking: "procesando...",

    // Schedules panel
    schedulesTitle: "Automatizaciones y Metas",
    schedulesDescription: "Configure horarios diarios para los agentes envíen resúmenes por WhatsApp. Defina sus metas de peso.",
    schedulesHealthGoals: "Metas de Salud",
    schedulesCurrentWeight: "Peso Actual (kg)",
    schedulesTargetWeight: "Meta de Peso (kg)",
    schedulesHeight: "Altura (cm)",
    schedulesStartWeight: "Peso Inicial (kg)",
    schedulesSaveGoals: "Guardar Metas",
    schedulesSaved: "¡Guardado!",
    schedulesWeightCurrent: "Peso actual:",
    schedulesWeightChange: "Variación semanal:",
    schedulesWeightLost: "Total perdido:",
    schedulesTarget: "Meta:",
    schedulesRemaining: "restantes)",
    schedulesLogWeight: "Registrar peso (kg)",
    schedulesRegister: "Registrar",
    schedulesSocialMediaAuto: "Social Media Auto",
    schedulesSocialMediaDesc: "Envía ideas de contenido cada hora: Carrusel, Stories, Reels, Post X y TikTok. Publica en el grupo de WhatsApp.",
    schedulesAutoEnable: "Activar envío automático",
    schedulesStart: "Inicio:",
    schedulesHourly: "(cada hora)",
    schedulesOtherAgents: "Otros Agentes",
    schedulesFooter: "Social Media envía ideas de contenido cada hora al grupo de WhatsApp. Los otros agentes envían resúmenes diarios en el horario configurado.",
    schedulesHealth: "Salud",
    schedulesHealthDesc: "Menú diario vía WhatsApp",
    schedulesPersonalTrainer: "Personal Trainer",
    schedulesPersonalTrainerDesc: "Entrenamiento diario vía WhatsApp",
    schedulesPersonalAssistant: "Asistente Personal",
    schedulesPersonalAssistantDesc: "Agenda diaria vía WhatsApp",
    schedulesSocialMedia: "Redes Sociales",
    schedulesSocialMediaAgentDesc: "Contenido diario para redes sociales",
    schedulesFinance: "Finanzas",
    schedulesMarketing: "Marketing",

    // Agent data panel
    agentDataFinanceLog: "Registro Financiero",
    agentDataHealthMetrics: "Métricas de Salud",
    agentDataCodeReviews: "Revisiones de Código",
    agentDataLearningProgress: "Progreso de Aprendizaje",
    agentDataVideoProjects: "Proyectos de Video",
    agentDataImage3D: "Generaciones de Imagen / 3D",
    agentDataMusicProjects: "Proyectos de Música",
    agentDataLoading: "Cargando...",
    agentDataIncome: "Ingresos",
    agentDataExpenses: "Gastos",
    agentDataBalance: "Saldo",
    agentDataNoTransactions: "Sin transacciones hoy. Converse con Finance para registrar gastos.",
    agentDataNoHealth: "Sin datos de salud hoy. Converse con Health para registrar.",
    agentDataNoCodeReviews: "Sin revisiones de código hoy. Converse con Developer para revisar código.",
    agentDataNoLearning: "Sin progreso de aprendizaje hoy. Converse con Teacher para comenzar.",
    agentDataNoVideo: "Sin proyectos de video hoy. Converse con Video Editor para crear uno.",
    agentDataNoGenerations: "Sin generaciones hoy. Converse con 3D Designer para crear imágenes o modelos 3D.",
    agentDataNoMusic: "Sin proyectos de música hoy. Converse con Music Producer para crear música.",
    agentDataNoCreator: "Sin proyectos creativos hoy. Converse con Creator para crear.",
    agentDataHealthLog: "Registro de Salud",
    agentDataCreatorProjects: "Proyectos Creativos",
    agentDataDesigns: "Diseños",
    agentDataNutritionToday: "Nutrición Hoy",
    agentDataProtein: "Proteína",
    agentDataCarbs: "Carbohidratos",
    agentDataFat: "Grasa",

    // WhatsApp panel — automation
    wa_chat_personal_optional: "Chat Personal (opcional)",
    wa_chat_personal_desc: "Chat personal para mensajes directos (opcional si ya configuró los grupos arriba).",
    wa_urgente_meeting: "urgente, reunión,meeting",
    wa_option_notify: "Notificar",
    wa_option_task: "Tarea",
    wa_option_summary: "Resumen",
    wa_n8n_webhook_desc: "Los mensajes recibidos se envían al N8N automáticamente.",
    wa_n8n_placeholder: "https://su-n8n.com/webhook/...",
    wa_save: "Guardar",
    wa_broadcast_desc: "Enviar mensaje a múltiples grupos a la vez (con retraso anti-ban).",
    wa_message_placeholder: "Mensaje a enviar...",
    wa_send_to_n_groups: "Enviar a {count} grupo(s)",
    wa_summary: "Resumen",

    // Social Media panel — additional
    social_topic_label: "Tópico / Persona / Evento",
    social_topic_placeholder: "Ej: Thomas Sankara, Esclavitud en Brasil, Angela Davis...",
    social_hook_label: "Gancho (opcional)",
    social_photo_placeholder: "https://ejemplo.com/foto.jpg",

    // Common
    commonNone: "Ninguno",
    commonLoading: "Cargando…",
    commonError: "Error desconocido",

    // Command Palette
    commandPalettePlaceholder: "Buscar comandos, agentes, acciones...",
    commandPaletteNoResults: "Sin resultados",

    // Slash Commands
    slashHistorico: "Ver historial de conversaciones",
    slashLimpar: "Limpiar conversacion actual",
    slashResumir: "Resumir conversacion",
    slashExportar: "Exportar conversacion",
    slashMemoria: "Buscar en memoria",
    slashAgentes: "Ver agentes",
    slashAjuda: "Ver comandos disponibles",

    // Plugin System
    plugins: "Plugins",
    pluginsEmpty: "Ningun plugin instalado",
    pluginsLoad: "Cargar",
    pluginsUnload: "Descargar",
    pluginsLoaded: "Plugin cargado",
    pluginsError: "Error al cargar plugin",

    // MCP
    mcp: "Servidores MCP",
    mcpEmpty: "Ningun servidor MCP conectado",
    mcpAdd: "Agregar servidor",
    mcpRemove: "Eliminar",

    // Keyboard Shortcuts
    shortcutsTitle: "Atajos de Teclado",

    // Skeleton
    skeletonLoading: "Cargando...",
    skeletonLoadingMessages: "Cargando mensajes...",
    skeletonLoadingAgents: "Cargando agentes...",
    skeletonLoadingSettings: "Cargando configuración...",

    // Agent Health
    agent_health_description: "Consultorio Digital de Salud",
    agent_health_tagline: "Cuidando de tu salud con tecnología y precisión",
    agent_health_quick_action_meal_analysis_label: "Análisis de Comida",
    agent_health_quick_action_meal_analysis_prompt: "Analiza esta foto de comida y dime los macros",
    agent_health_quick_action_workout_label: "Entrenamiento Personalizado",
    agent_health_quick_action_workout_prompt: "Crea un entrenamiento personalizado basado en mi historial",
    agent_health_quick_action_log_weight_label: "Registrar Peso",
    agent_health_quick_action_log_weight_prompt: "Quiero registrar mi peso de hoy",
    agent_health_quick_action_view_goals_label: "Ver Metas",
    agent_health_quick_action_view_goals_prompt: "Muestra mis metas de salud y progreso",
    agent_health_quick_action_schedule_appointment_label: "Agendar Cita",
    agent_health_quick_action_schedule_appointment_prompt: "Necesito agendar una cita",
    agent_health_quick_action_exams_label: "Exámenes",
    agent_health_quick_action_exams_prompt: "Quiero registrar mis últimos exámenes",
    agent_health_stat_bmi: "IMC",
    agent_health_stat_steps_today: "Pasos Hoy",
    agent_health_stat_heart_rate: "Pulso",
    agent_health_stat_water: "Agua",

    // Agent Finance
    agent_finance_description: "Oficina Financiera Personal",
    agent_finance_tagline: "Control total de tus finanzas en un solo lugar",
    agent_finance_quick_action_log_expense_label: "Registrar Gasto",
    agent_finance_quick_action_log_expense_prompt: "Quiero registrar un gasto",
    agent_finance_quick_action_log_income_label: "Registrar Ingreso",
    agent_finance_quick_action_log_income_prompt: "Quiero registrar un ingreso",
    agent_finance_quick_action_monthly_balance_label: "Balance Mensual",
    agent_finance_quick_action_monthly_balance_prompt: "Muestra el balance financiero de este mes",
    agent_finance_quick_action_budget_label: "Presupuesto",
    agent_finance_quick_action_budget_prompt: "Crea un presupuesto mensual inteligente",
    agent_finance_quick_action_investments_label: "Inversiones",
    agent_finance_quick_action_investments_prompt: "Analiza mis inversiones",
    agent_finance_quick_action_financial_goals_label: "Metas Financieras",
    agent_finance_quick_action_financial_goals_prompt: "Quiero ver mis metas financieras",
    agent_finance_stat_balance: "Saldo",
    agent_finance_stat_income: "Ingresos",
    agent_finance_stat_expenses: "Gastos",
    agent_finance_stat_savings: "Ahorro",

    // Agent Developer
    agent_developer_description: "Estación de Desarrollo",
    agent_developer_tagline: "Code, debug, deploy - todo en un terminal inmersivo",
    agent_developer_quick_action_review_code_label: "Revisar Código",
    agent_developer_quick_action_review_code_prompt: "Revisa este código para mí y sugiere mejoras",
    agent_developer_quick_action_debug_label: "Depurar",
    agent_developer_quick_action_debug_prompt: "Necesito ayuda para depurar este error",
    agent_developer_quick_action_new_feature_label: "Nueva Función",
    agent_developer_quick_action_new_feature_prompt: "Quiero crear una nueva función",
    agent_developer_quick_action_code_review_label: "Code Review",
    agent_developer_quick_action_code_review_prompt: "Haz un code review completo",
    agent_developer_quick_action_architecture_label: "Arquitectura",
    agent_developer_quick_action_architecture_prompt: "Ayúdame a diseñar la arquitectura",
    agent_developer_quick_action_tests_label: "Pruebas",
    agent_developer_quick_action_tests_prompt: "Crea pruebas unitarias para este módulo",
    agent_developer_stat_commits: "Commits",
    agent_developer_stat_issues: "Issues",
    agent_developer_stat_prs: "PRs",
    agent_developer_stat_uptime: "Uptime",

    // Agent Marketing
    agent_marketing_description: "Estudio de Marketing Digital",
    agent_marketing_tagline: "Crea contenido viral y conquista tus redes sociales",
    agent_marketing_quick_action_viral_post_label: "Post Viral",
    agent_marketing_quick_action_viral_post_prompt: "Crea un post viral para Instagram",
    agent_marketing_quick_action_campaign_label: "Campaña",
    agent_marketing_quick_action_campaign_prompt: "Planifica una campaña de marketing completa",
    agent_marketing_quick_action_persuasive_copy_label: "Copy Persuasiva",
    agent_marketing_quick_action_persuasive_copy_prompt: "Escribe un copy persuasivo para vender",
    agent_marketing_quick_action_storytelling_label: "Storytelling",
    agent_marketing_quick_action_storytelling_prompt: "Crea un storytelling envolvente",
    agent_marketing_quick_action_metrics_analysis_label: "Análisis de Métricas",
    agent_marketing_quick_action_metrics_analysis_prompt: "Analiza las métricas de mis redes",
    agent_marketing_quick_action_calendar_label: "Calendario",
    agent_marketing_quick_action_calendar_prompt: "Crea un calendario editorial",
    agent_marketing_stat_reach: "Alcance",
    agent_marketing_stat_engagement: "Engagement",
    agent_marketing_stat_posts: "Posts",
    agent_marketing_stat_leads: "Leads",

    // Agent Designer
    agent_designer_description: "Atelier de Diseño Creativo",
    agent_designer_tagline: "Transforma tus ideas en arte visual y experiencias",
    agent_designer_quick_action_generate_image_label: "Generar Imagen",
    agent_designer_quick_action_generate_image_prompt: "Genera una imagen impresionante para mí",
    agent_designer_quick_action_3d_model_label: "Modelo 3D",
    agent_designer_quick_action_3d_model_prompt: "Crea un modelo 3D detallado",
    agent_designer_quick_action_uiux_design_label: "UI/UX Design",
    agent_designer_quick_action_uiux_design_prompt: "Necesito ayuda con diseño de interfaz",
    agent_designer_quick_action_icons_label: "Iconos",
    agent_designer_quick_action_icons_prompt: "Crea un set de iconos personalizados",
    agent_designer_quick_action_color_palette_label: "Paleta de Colores",
    agent_designer_quick_action_color_palette_prompt: "Sugiere una paleta de colores armoniosa",
    agent_designer_quick_action_prototype_label: "Prototipo",
    agent_designer_quick_action_prototype_prompt: "Crea un prototipo interactivo",
    agent_designer_stat_images: "Imágenes",
    agent_designer_stat_3d_models: "Modelos 3D",
    agent_designer_stat_prototypes: "Prototipos",
    agent_designer_stat_styles: "Estilos",

    // Agent Creator
    agent_creator_description: "Estudio de Producción Creativa",
    agent_creator_tagline: "Produce videos y música profesionales con IA",
    agent_creator_quick_action_create_video_label: "Crear Video",
    agent_creator_quick_action_create_video_prompt: "Quiero crear un video profesional",
    agent_creator_quick_action_create_music_label: "Crear Música",
    agent_creator_quick_action_create_music_prompt: "Quiero crear una canción original",
    agent_creator_quick_action_edit_video_label: "Editar Video",
    agent_creator_quick_action_edit_video_prompt: "Necesito ayuda con edición de video",
    agent_creator_quick_action_podcast_label: "Podcast",
    agent_creator_quick_action_podcast_prompt: "Quiero crear un podcast",
    agent_creator_quick_action_sound_effects_label: "Efectos de Sonido",
    agent_creator_quick_action_sound_effects_prompt: "Necesito efectos de sonido",
    agent_creator_quick_action_mixing_label: "Mezcla",
    agent_creator_quick_action_mixing_prompt: "Ayúdame a mezclar este audio",
    agent_creator_stat_videos: "Vídeos",
    agent_creator_stat_music: "Músicas",
    agent_creator_stat_podcasts: "Podcasts",
    agent_creator_stat_hours: "Horas",

    // Agent Teacher
    agent_teacher_description: "Aula Virtual",
    agent_teacher_tagline: "Aprende cualquier cosa con enseñanza personalizada por IA",
    agent_teacher_quick_action_study_plan_label: "Plan de Estudio",
    agent_teacher_quick_action_study_plan_prompt: "Crea un plan de estudio personalizado",
    agent_teacher_quick_action_translate_label: "Traducir",
    agent_teacher_quick_action_translate_prompt: "Necesito traducir un texto",
    agent_teacher_quick_action_quiz_label: "Quiz",
    agent_teacher_quick_action_quiz_prompt: "Crea un quiz para probar mis conocimientos",
    agent_teacher_quick_action_summary_label: "Resumen",
    agent_teacher_quick_action_summary_prompt: "Resume este contenido para mí",
    agent_teacher_quick_action_explain_label: "Explicar",
    agent_teacher_quick_action_explain_prompt: "Explica este concepto de forma sencilla",
    agent_teacher_quick_action_flashcards_label: "Flashcards",
    agent_teacher_quick_action_flashcards_prompt: "Crea flashcards para repaso",
    agent_teacher_stat_lessons: "Clases",
    agent_teacher_stat_quizzes: "Quizzes",
    agent_teacher_stat_languages: "Idiomas",
    agent_teacher_stat_hours: "Horas",

    // Agent Automation
    agent_automation_description: "Centro de Automatización Inteligente",
    agent_automation_tagline: "Conecta agentes, automatiza tareas y sé productivo",
    agent_automation_quick_action_create_workflow_label: "Crear Workflow",
    agent_automation_quick_action_create_workflow_prompt: "Crea un workflow de automatización entre agentes",
    agent_automation_quick_action_config_bot_label: "Config Bot",
    agent_automation_quick_action_config_bot_prompt: "Configura un bot para mí",
    agent_automation_quick_action_test_webhook_label: "Probar Webhook",
    agent_automation_quick_action_test_webhook_prompt: "Prueba un webhook",
    agent_automation_quick_action_list_automations_label: "Listar Automatizaciones",
    agent_automation_quick_action_list_automations_prompt: "Lista todas las automatizaciones activas",
    agent_automation_quick_action_trigger_agent_label: "Trigger Agent",
    agent_automation_quick_action_trigger_agent_prompt: "Dispara una tarea en otro agente",
    agent_automation_quick_action_monitor_label: "Monitorear",
    agent_automation_quick_action_monitor_prompt: "Monitorea el estado de las automatizaciones",
    agent_automation_stat_workflows: "Workflows",
    agent_automation_stat_triggers: "Triggers",
    agent_automation_stat_executions: "Ejecuciones",
    agent_automation_stat_success: "Éxito",

    // Agent System
    agent_system_description: "Panel de Control del Sistema",
    agent_system_tagline: "Configure y monitoree todos los aspectos de Orun OS",
    agent_system_quick_action_config_ai_label: "Configurar IA",
    agent_system_quick_action_config_ai_prompt: "Quiero configurar los parámetros de la IA",
    agent_system_quick_action_diagnose_label: "Diagnosticar",
    agent_system_quick_action_diagnose_prompt: "Diagnosticar el estado del sistema",
    agent_system_quick_action_clear_cache_label: "Limpiar Caché",
    agent_system_quick_action_clear_cache_prompt: "Limpiar la caché del sistema",
    agent_system_quick_action_backup_label: "Copia de Seguridad",
    agent_system_quick_action_backup_prompt: "Crear una copia de seguridad de la configuración",
    agent_system_quick_action_security_label: "Seguridad",
    agent_system_quick_action_security_prompt: "Verificar la configuración de seguridad",
    agent_system_quick_action_performance_label: "Rendimiento",
    agent_system_quick_action_performance_prompt: "Analizar el rendimiento del sistema",
    agent_system_stat_cpu: "CPU",
    agent_system_stat_ram: "RAM",
    agent_system_stat_disk: "Disco",
    agent_system_stat_uptime: "Uptime",

    // Agent Automotive
    agent_automotive_description: "Su Consultor Automotriz",
    agent_automotive_tagline: "Diagnóstico, mantenimiento, documentos y precios - todo para su coche",
    agent_automotive_quick_action_diagnostic_label: "Diagnóstico",
    agent_automotive_quick_action_diagnostic_prompt: "Mi coche tiene el siguiente problema: ",
    agent_automotive_quick_action_fines_inquiry_label: "Consulta de Multas",
    agent_automotive_quick_action_fines_inquiry_prompt: "Verificar si tengo multas o pendientes en mi coche",
    agent_automotive_quick_action_documents_label: "Documentos",
    agent_automotive_quick_action_documents_prompt: "Quiero verificar los documentos de mi coche",
    agent_automotive_quick_action_parts_label: "Piezas",
    agent_automotive_quick_action_parts_prompt: "Buscar el mejor precio para esta pieza: ",
    agent_automotive_quick_action_change_car_label: "Cambiar Coche",
    agent_automotive_quick_action_change_car_prompt: "Quiero cambiar de coche, ayúdame a encontrar opciones",
    agent_automotive_quick_action_maintenance_label: "Mantenimiento",
    agent_automotive_quick_action_maintenance_prompt: "Quiero saber el mantenimiento preventivo de mi coche",
    agent_automotive_stat_km: "KM",
    agent_automotive_stat_next_service: "Próx. Cambio",
    agent_automotive_stat_documents: "Documentos",
    agent_automotive_stat_fuel_consumption: "Consumo",

    // Agent Hampton
    agent_hampton_description: "Inteligencia Central de Orun OS",
    agent_hampton_tagline: "Su asistente personal con IA avanzada y herramientas poderosas",
    agent_hampton_quick_action_chat_label: "Chatear",
    agent_hampton_quick_action_chat_prompt: "",
    agent_hampton_quick_action_web_search_label: "Buscar en Web",
    agent_hampton_quick_action_web_search_prompt: "Buscar en la web para mí",
    agent_hampton_quick_action_analyze_label: "Analizar",
    agent_hampton_quick_action_analyze_prompt: "Analizar esta información para mí",
    agent_hampton_quick_action_automate_label: "Automatizar",
    agent_hampton_quick_action_automate_prompt: "Crear una automatización para esta tarea",
    agent_hampton_stat_messages: "Mensajes",
    agent_hampton_stat_tools: "Herramientas",
    agent_hampton_stat_memory: "Memoria",
    agent_hampton_stat_uptime: "Uptime",

    // Agent Page UI
    agent_quick_actions_title: "Acciones Rápidas",
    agent_open_workspace: "Abrir Espacio de Trabajo",
    agent_chat_with_ai: "Chatear con IA",
    agent_start_session: "Iniciar Sesión",

    // Projects Panel
    projects_title: "Proyectos",
    projects_filter_all: "todos",
    projects_filter_active: "activos",
    projects_filter_archived: "archivados",
    projects_new_button: "Nuevo",
    projects_name_placeholder: "Nombre del proyecto",
    projects_description_placeholder: "Descripción (opcional)",
    projects_create_button: "Crear",
    projects_cancel_button: "Cancelar",

    // Command Palette
    command_palette_home_label: "Inicio",
    command_palette_home_description: "Volver al inicio",
    command_palette_section_navigation: "Navegación",
    command_palette_agents_label: "Agentes",
    command_palette_agents_description: "Ver todos los agentes",
    command_palette_projects_label: "Proyectos",
    command_palette_projects_description: "Gestionar proyectos",
    command_palette_settings_label: "Configuración",
    command_palette_settings_description: "Abrir configuración",
    command_palette_new_chat_label: "Nueva Conversación",
    command_palette_new_chat_description: "Iniciar nueva conversación",
    command_palette_section_actions: "Acciones",
    command_palette_history_label: "Historial",
    command_palette_history_description: "Ver historial de conversaciones",
    command_palette_agent_description: "Hablar con {name}",
    command_palette_section_agents: "Agentes",
    command_palette_search_placeholder: "Buscar comandos, agentes, acciones...",
    command_palette_no_results: "Ningún resultado para",

    // Memory Panel
    memory_title: "Memoria",
    memory_search_placeholder: "Buscar memorias...",

    // Settings Panel
    settings_section_language: "Idioma",
    settings_section_ai_provider: "Proveedor de IA",
    settings_section_model: "Modelo",
    settings_section_connection: "Conexión",
    settings_ollama_url_desc: "URL del servidor Ollama local",
    settings_api_key_label: "API Key",
    settings_api_key_saved: "(guardada)",
    settings_api_key_desc: "Clave para {label}",
    settings_api_key_placeholder: "Pega tu clave...",
    settings_fallback_provider_label: "Fallback Provider",
    settings_fallback_provider_desc: "Usado si el principal falla",
    settings_none: "Ninguno",
    settings_whatsapp_connector_label: "Conector WhatsApp",
    settings_whatsapp_connector_desc: "Configurar enrutamiento de mensajes",
    settings_section_tts: "Text-to-Speech",
    settings_tts_engine_label: "Motor",
    settings_tts_engine_desc: "Motor activo: {engine}",
    settings_tts_voice_label: "Voz",
    settings_tts_voice_desc: "Voz seleccionada para síntesis",
    settings_tts_fallback_info: "Fallback automático: si el engine cloud falla (tokens, cuota, etc.), cambia a Piper → Bark (local, sin internet)",
    settings_agent_models_button: "Modelos por Agente",
    settings_usage_button: "Uso Hoy",
    settingsBackgroundListen: "Escucha en Segundo Plano",
    settingsBackgroundListenDesc: "El micrófono escucha 'OK Orun' 24/7 y abre la superposición automáticamente",
    settingsWakeServiceRunning: "Servicio activo",
    settingsWakeServiceStopped: "Servicio detenido",
    settingsWakeServiceRestart: "Reiniciar",
    settingsWakeServiceTest: "Diagnóstico",
    settingsWakeDiagnosticPackages: "Paquetes Python",
    settingsWakeDiagnosticPort: "Puerto TCP 8081",

    // Automotive Garage
    automotive_service_type_oil_change: "Cambio de Aceite",
    automotive_service_type_general_revision: "Revisión General",
    automotive_service_type_brakes: "Frenos",
    automotive_service_type_suspension: "Suspensión",
    automotive_service_type_engine: "Motor",
    automotive_service_type_transmission: "Transmisión",
    automotive_service_type_electrical: "Eléctrica",
    automotive_service_type_air_conditioning: "Aire Acondicionado",
    automotive_service_type_tires: "Neumáticos",
    automotive_service_type_alignment: "Alineación",
    automotive_service_type_balancing: "Balanceo",
    automotive_service_type_other: "Otro",
    automotive_expense_category_fuel: "Combustible",
    automotive_expense_category_parking: "Aparcamiento",
    automotive_expense_category_toll: "Peaje",
    automotive_expense_category_fine: "Multa",
    automotive_expense_category_insurance: "Seguro",
    automotive_expense_category_ipva: "Impuesto Vehicular",
    automotive_expense_category_registration: "Licenciamiento",
    automotive_expense_category_wash: "Lavado",
    automotive_expense_category_accessories: "Accesorios",
    automotive_expense_category_other: "Otro",
    automotive_unknown_vehicle: "Desconocido",
    automotive_nav_overview: "Panel",
    automotive_nav_vehicles: "Vehículos",
    automotive_nav_services: "Servicios",
    automotive_nav_expenses: "Gastos",
    automotive_header_title: "Taller Premium",
    automotive_header_subtitle: "Consultor Automotriz",
    automotive_filter_label: "Filtrar",
    automotive_filter_all: "Todos",
    automotive_overview_stat_vehicles: "Vehículos",
    automotive_overview_stat_services: "Servicios",
    automotive_overview_stat_total_expenses: "Gasto Total",
    automotive_overview_stat_total_services: "Servicios Total",
    automotive_overview_new_vehicle_title: "Nuevo Vehículo",
    automotive_overview_new_vehicle_desc: "Agregar coche",
    automotive_overview_new_service_title: "Nuevo Servicio",
    automotive_overview_new_service_desc: "Registrar mantenimiento",
    automotive_overview_new_expense_title: "Nuevo Gasto",
    automotive_overview_new_expense_desc: "Combustible, multa, etc",
    automotive_overview_recent_activity: "Actividad Reciente",
    automotive_overview_no_activity: "Ninguna actividad aún",
    automotive_vehicles_title: "Mis Véhicules",
    automotive_vehicles_add_button: "Agregar",
    automotive_vehicles_empty_title: "Ningún vehículo",
    automotive_vehicles_empty_desc: "Haz clic en 'Agregar' para comenzar",
    automotive_services_title: "Servicios",
    automotive_services_add_button: "Nuevo Servicio",
    automotive_services_empty: "Ningún servicio",
    automotive_services_no_shop: "Sin taller",
    automotive_expenses_title: "Gastos",
    automotive_expenses_add_button: "Nuevo Gasto",
    automotive_expenses_empty: "Ningún gasto",
    automotive_modal_add_vehicle_title: "Agregar Vehículo",
    automotive_field_name: "Nombre / Apodo *",
    automotive_field_name_placeholder: "Ej: Mi Corolla",
    automotive_field_year: "Año *",
    automotive_field_model: "Modelo *",
    automotive_field_plate: "Matrícula",
    automotive_field_color: "Color",
    automotive_field_color_placeholder: "Plata",
    automotive_field_mileage: "Kilometraje",
    automotive_modal_add_vehicle_button: "Agregar Vehículo",
    automotive_modal_add_service_title: "Nuevo Servicio",
    automotive_field_vehicle: "Vehículo *",
    automotive_field_service_type: "Tipo de Servicio",
    automotive_field_description: "Descripción *",
    automotive_field_description_placeholder: "Ej: Cambio de aceite 5W30",
    automotive_field_cost: "Costo (R$)",
    automotive_field_current_km: "KM actual",
    automotive_field_shop: "Taller / Lugar",
    automotive_modal_add_service_button: "Registrar Servicio",
    automotive_add_vehicle_first: "Agrega un vehículo primero",
    automotive_modal_add_expense_title: "Nuevo Gasto",
    automotive_field_category: "Categoría",
    automotive_field_expense_desc_placeholder: "Ej: Gasolina Común",
    automotive_field_amount: "Monto (R$) *",
    automotive_modal_add_expense_button: "Registrar Gasto",

    // Developer IDE
    developer_ide_explorer_label: "Explorador",
    developer_ide_import_button: "+ Importar",
    developer_ide_no_file_open: "Ningún archivo abierto",
    developer_ide_terminal_help: "Comandos: help, clear, ls, cat, echo, pwd, date, version",
    developer_ide_terminal_placeholder: "Escribe un comando...",
    developer_ide_terminal_label: "Terminal",
    developer_ide_show_terminal: "\u25B2 Terminal",

    // System Console
    system_console_welcome: "Consola del Sistema Orun OS v1.0 \u2014 Escribe 'help' para comandos",
    system_console_help_title: "Comandos disponibles:",
    system_console_help_help: "help \u2014 Muestra esta ayuda",
    system_console_help_clear: "clear \u2014 Limpia la consola",
    system_console_help_date: "date \u2014 Muestra fecha/hora actual",
    system_console_help_echo: "echo <texto> \u2014 Ecoa el texto",
    system_console_help_uptime: "uptime \u2014 Muestra tiempo activo estimado",
    system_console_help_version: "version \u2014 Muestra versión de Orun OS",
    system_console_help_agents: "agents \u2014 Lista agentes disponibles",
    system_console_help_ram: "ram \u2014 Muestra uso estimado de RAM",
    system_console_help_clearmemory: "clearmemory \u2014 Limpia historial de consola",
    system_console_uptime: "Tiempo activo: {hrs}h {mins}m",
    system_console_version: "Orun OS v1.0.0 \u2014 Plugin System v1.0",
    system_console_agents_list_1: "Hampton, Developer, Designer, Creator",
    system_console_agents_list_2: "Health, Finance, Teacher, Marketing",
    system_console_agents_list_3: "Automation, System",
    system_console_ram_device: "RAM del Dispositivo: {ram}GB",
    system_console_ram_available: "RAM disponible estimada: {available}",
    system_console_command_not_found: "Comando no encontrado: {cmd}. Escribe 'help' para comandos disponibles.",
    system_console_cleared: "Consola limpiada.",
    system_console_history_cleared: "Historial de consola limpiado.",
    system_console_resource_cpu: "CPU",
    system_console_resource_ram: "RAM",
    system_console_resource_disk: "Disco",
    system_console_placeholder: "Escribe un comando...",

    // Designer
    designer_template_instagram_post: "Publicación Instagram",
    designer_template_story: "Story",
    designer_template_thumbnail: "Thumbnail",
    designer_template_logo: "Logo",
    designer_template_presentation: "Presentación",
    designer_shape_rectangle: "Rectángulo",
    designer_shape_circle: "Círculo",
    designer_shape_triangle: "Triángulo",
    designer_shape_star: "Estrella",
    designer_shape_line: "Línea",
    designer_icon_heart: "Corazón",
    designer_icon_bolt: "Rayo",
    designer_icon_sun: "Sol",
    designer_tool_select: "Seleccionar",
    designer_tool_text: "Texto",
    designer_tool_shape: "Forma",
    designer_tool_image: "Imagen",
    designer_tool_draw: "Dibujar",
    designer_tool_delete: "Borrar",
    designer_toast_png_copied: "¡PNG copiado!",
    designer_toast_png_saved: "¡PNG guardado!",
    designer_toast_svg_exported: "¡SVG exportado!",
    designer_zoom_fit: "Ajustar",
    designer_import_button: "Importar",
    designer_export_button: "Exportar",
    designer_share_button: "Compartir",
    designer_tab_templates: "Plantillas",
    designer_tab_elements: "Elementos",
    designer_tab_text: "Texto",
    designer_tab_uploads: "Uploads",
    designer_tab_background: "Fondo",
    designer_templates_section_title: "Tamaños Predefinidos",
    designer_elements_section_shapes: "Formas",
    designer_elements_section_icons: "Iconos",
    designer_elements_section_decorative: "Decorativos",
    designer_text_add_title: "Agregar título",
    designer_text_add_subtitle: "Agregar subtítulo",
    designer_text_add_body: "Agregar texto",
    designer_uploads_drag_here: "Arrastra imágenes aquí",
    designer_uploads_or_click: "o haz clic para seleccionar",
    designer_background_solid_colors: "Colores Sólidos",
    designer_background_gradients: "Degradados",
    designer_panel_design_name: "Diseño",
    designer_panel_canvas_size: "Tamaño del Canvas",
    designer_panel_width: "Ancho",
    designer_panel_height: "Alto",
    designer_panel_background_color: "Color de Fondo",
    designer_panel_select_element_hint: "Selecciona un elemento para editar sus propiedades",
    designer_panel_position: "Posición",
    designer_panel_size: "Tamaño",
    designer_panel_rotation: "Rotación",
    designer_panel_opacity: "Opacidad",
    designer_panel_text: "Texto",
    designer_panel_font_size: "Tamaño de Fuente",
    designer_panel_font_family: "Familia de Fuente",
    designer_panel_style: "Estilo",
    designer_panel_text_color: "Color del Texto",
    designer_panel_fill_color: "Color de Relleno",
    designer_panel_border_color: "Color del Borde",
    designer_panel_none: "Ninguna",
    designer_panel_border_width: "Grosor del Borde",
    designer_panel_layer_order: "Orden de Capas",
    designer_panel_bring_front: "Traer al frente",
    designer_panel_send_back: "Enviar atrás",
    designer_canvas_drag_image: "Arrastra una imagen",

    // Creator Audio
    creator_audio_deck: "Deck {deck}",
    creator_audio_bpm: "BPM",
    creator_audio_pitch: "Pitch",
    creator_audio_sync: "Sync",
    creator_audio_cue: "Cue",
    creator_audio_play: "Reproducir",
    creator_audio_pause: "Pausar",
    creator_audio_stop: "Detener",
    creator_audio_rec: "Grabar",
    creator_audio_mixer: "Mezclador",
    creator_audio_master: "Master",
    creator_audio_crossfader: "Crossfader",
    creator_audio_headphones: "Auriculares",
    creator_audio_cue_mix: "Cue Mix",
    creator_audio_effects: "Efectos",
    creator_audio_samples: "Samples",
    creator_audio_recording: "Grabación",
    creator_audio_format: "Formato",
    creator_audio_quality: "Calidad",
    creator_audio_export: "Exportar",
    creator_audio_import: "Importar",
    creator_audio_recording_status: "Grabando...",
    creator_audio_ready: "Listo",
    creator_audio_storage: "Almacenamiento",
    creator_audio_tempo: "Tempo",
    creator_audio_hi: "AG",
    creator_audio_mid: "MD",
    creator_audio_lo: "BW",
    creator_audio_pan: "Pan",
    creator_audio_wet: "WET",
    creator_audio_par_x: "PAR X",
    creator_audio_par_y: "PAR Y",
    creator_audio_low: "Low",
    creator_audio_mid_freq: "Mid",
    creator_audio_high: "High",
    creator_audio_solo: "S",
    creator_audio_mute: "M",
    creator_audio_open: "Abrir",
    creator_audio_volume: "Volumen",
    creator_audio_none: "Ninguno",
    creator_audio_imported: "Importado",
    creator_audio_loaded: "Cargado",
    creator_audio_error_no_audio: "Ningún audio cargado",
    // Creator Video
    creator_video_select: "Seleccionar",
    creator_video_trim: "Recortar",
    creator_video_split: "Dividir",
    creator_video_delete: "Eliminar",
    creator_video_copy: "Copiar",
    creator_video_paste: "Pegar",
    creator_video_undo: "Deshacer",
    creator_video_redo: "Rehacer",
    creator_video_export: "Exportar",
    creator_video_media: "Medios",
    creator_video_text: "Texto",
    creator_video_effects: "Efectos",
    creator_video_transitions: "Transiciones",
    creator_video_import: "+ Importar",
    creator_video_mixer: "Mezclador",
    creator_video_master: "Master",
    creator_video_position: "Posición",
    creator_video_scale: "Escala",
    creator_video_rotation: "Rotación",
    creator_video_blend_mode: "Modo de Mezcla",
    creator_video_opacity: "Opacidad",
    creator_video_volume: "Volumen",
    creator_video_fade_in: "Fade In",
    creator_video_fade_out: "Fade Out",
    creator_video_font: "Fuente",
    creator_video_size: "Tamaño",
    creator_video_color: "Color",
    creator_video_clip_info: "Info del Clip",
    creator_video_type: "Tipo",
    creator_video_track: "Pista",
    creator_video_start: "Inicio",
    creator_video_duration: "Duración",
    creator_video_safe_margins: "Margenes Seguros",
    creator_video_fullscreen: "Pantalla Completa",
    creator_video_timeline: "Línea de Tiempo",
    creator_video_zoom_in: "Zoom +",
    creator_video_zoom_out: "Zoom -",
    creator_video_title: "Título",
    creator_video_subtitle: "Subtítulo",
    creator_video_caption: "Leyenda",
    creator_video_solo: "Solo",
    creator_video_mute: "Silenciar",
    creator_video_visibility: "Visibilidad",
    creator_video_lock: "Bloquear",
    // Export/Import panel
    exportImportTitle: "Exportar/Importar Conversaciones",
    exportSelectAll: "Seleccionar Todas",
    exportDeselectAll: "Desmarcar Todas",
    exportSelected: "seleccionadas",
    exportNoAgent: "Sin agente",
    exportExporting: "Exportando...",
    exportExportJSON: "Exportar JSON",
    exportImporting: "Importando...",
    exportImportJSON: "Importar JSON",
    exportSuccess: "¡Operación completada!",
    exportError: "Error en la operación",
    exportFileNotSupported: "Formato de archivo no soportado",
    exportConversations: "Conversaciones",
    exportFullBackup: "Copia de Seguridad Completa",
    exportFullDescription: "Exporta todas las conversaciones, configuraciones, horarios y memoria de los agents en un solo archivo JSON.",
    // WhatsApp panel
    whatsappDailyLimit: "Límite Diario",
    whatsappConnect: "Conectar WhatsApp",
    whatsappSessionKept: "La sesión se mantendrá después de la primera conexión",
    whatsappAutoReconnect: "Auto-reconnect",
    whatsappYourGroups: "Tus Grupos",
    whatsappNoGroupsFound: "No se encontraron grupos. Crea grupos en WhatsApp y haz clic en actualizar.",
    whatsappGroupsByAgent: "Grupos por Agente",
    whatsappJidCopyHelp: "Copia el JID de la lista anterior y pégalo en el campo del agente correspondiente.",
    whatsappKeywords: "Palabras clave",
    whatsappKeywordsDesc: "Cuando las palabras aparecen en los grupos, se dispara una acción automática.",
    whatsappGenerate: "Generar",
    whatsappAutoReply: "Auto-reply",
    whatsappAutoReplyDesc: "Los mensajes en los grupos vinculados son procesados por la IA del agente correspondiente y respondidos automáticamente. Las fechas mencionadas en los mensajes se detectan y crean programaciones automáticas.",
    whatsappNoGroupsConfigured: "Ningún grupo configurado en la pestaña Configuración",
    whatsappRetry: "Reintentar",
    whatsappQueue: "Cola",
    whatsappConfigTab: "Configuración",
    whatsappAutomationTab: "Automatización",
    whatsappScanWhatsApp: "Escanear con WhatsApp",
    // AgentData panel
    agentDataDraft: "Borrador",
    agentDataRendering: "Renderizando",
    agentDataProcessing: "Procesando",
    agentDataCompleted: "Completado",
    agentDataFailed: "Falló",
    agentDataCustom: "personalizado",
    // TitleBar
    titlebarMinimize: "Minimizar",
    titlebarMaximize: "Maximizar",
    titlebarClose: "Cerrar",
    // VoiceOverlay
    voiceOverlayListening: "escuchando...",
    voiceOverlayThinking: "pensando...",
    voiceOverlaySpeaking: "hablando...",
    // ChatInput
    chatInputCommands: "Comandos",
    // ConversationList
    conversationHistory: "Historial",
    // SocialMedia panel
    socialMediaCreateViral: "Crea contenido viral para Instagram, TikTok e X enfocado en historias borradas y lucha contra el racismo.",
    socialMediaWebhooksN8n: "Webhooks n8n",
    socialMediaConfigureWebhooks: "Configura las URLs de los webhooks n8n para publicar vía Buffer. Payload: { text, imageUrl?, videoUrl?, format? }",
    socialMediaSaveWebhooks: "Guardar Webhooks",
    socialMediaPlatform: "Plataforma",
    socialMediaGenerating: "Generando...",
    socialMediaGenerateContent: "Generar Contenido",
    socialMediaInstagramReqImage: "Error: Instagram requiere una URL de imagen",
    socialMediaTiktokReqMedia: "Error: TikTok requiere una URL de video o imagen",
    socialMediaPublishedSuccess: "¡Publicado con éxito!",
    socialMediaPublishError: "Error",
    // Projects panel
    projectsNewProject: "Nuevo proyecto",
    // Spotify integration
    settingsSpotifySection: "Spotify",
    settingsSpotifyClientId: "Client ID",
    settingsSpotifyClientSecret: "Client Secret",
    settingsSpotifyConnect: "Conectar OAuth",
    settingsSpotifyDisconnect: "Desconectar",
    settingsSpotifyConnected: "Conectado",
    settingsSpotifyNotConnected: "No conectado",
    settingsSpotifyPlay: "Reproducir",
    settingsSpotifyPause: "Pausar",
    settingsSpotifyNowPlaying: "Reproduciendo ahora",
    settingsSpotifyDeviceLabel: "Dispositivo",
    settingsSpotifyDeviceDesc: "Seleccionar dispositivo de reproducción",
    settingsSpotifyNoDevice: "Ningún dispositivo encontrado",
    settingsSpotifyAuthHelp: "Crear app en developer.spotify.com",
    settingsSpotifyAuthHelpDesc: "Redirect URI: http://127.0.0.1:9222/callback",
    // Discord integration
    settingsDiscordSection: "Discord Bot",
    settingsDiscordToken: "Bot Token",
    settingsDiscordConnect: "Conectar",
    settingsDiscordDisconnect: "Desconectar",
    settingsDiscordConnected: "Conectado",
    settingsDiscordConnecting: "Conectando...",
    settingsDiscordError: "Error de conexión",
    settingsDiscordGuild: "Servidor",
    settingsDiscordChannel: "Canal",
    settingsDiscordAutoResponse: "Auto-respuesta",
    settingsDiscordAutoResponseDesc: "Marketing agent responde mensajes de Discord",
    settingsDiscordBotTokenHelp: "Crear bot en discord.com/developers",
    settingsDiscordBotTokenHelpDesc: "Copia el token del bot y pega abajo",
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
    agentAutomotive: "Automobile",
    agentSocialMedia: "Réseaux Sociaux",
    agentImageCamera: "IA d'Image & Caméra",
    agentSpeechAudio: "Parole & Audio",
    agentKnowledgeMemory: "Connaissance & Mémoire",
    agentOSConfig: "OS & Configuration",
    agentDesignVisual: "Design & Visuel",
    agentAudiovisualContent: "Contenu Audiovisuel",
    agentHealth: "Santé",
    agentLearningLanguages: "Apprentissage & Langues",
    agentMarketingSocial: "Marketing & Social",

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
    sidebarHome: "Accueil",

    // Status bar
    statusNativeAI: "IA Native",
    statusConnected: "Connecté",
    statusHamptonOnline: "Hampton \u2022 En ligne",
    statusChangeModel: "Changer de modèle",

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
    settings_wake_word: "Mot de Réveil",
    settings_wake_word_desc: "Activation vocale (Bêta)",
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
    settingsTheme: "Thème",
    settingsThemeDark: "Sombre",
    settingsThemeLight: "Clair",
    settingsThemeSystem: "Système",
    settingsFalAiNote: "(pour la génération d'images)",
    settingsFalAiPlaceholder: "Clé API Fal.ai (pour les images Social Media)",
    settingsSaved: "Enregistré !",
    settingsHome: "Accueil",
    settingsTabAI: "IA et Modèle",
    settingsTabIntegrations: "Intégrations",
    settingsTabAppearance: "Apparence",
    settingsTabSystem: "Système",
    settingsVoiceSystem: "Système Vocal",
    settingsConversationalMode: "Mode Conversationnel",
    settingsConversationalModeDesc: "Le micro s'ouvre automatiquement après que l'IA ait parlé",
    settingsNoiseSuppression: "Suppression du Bruit",
    settingsNoiseSuppressionDesc: "Supprime le bruit de fond pendant l'enregistrement",
    settingsResponseDelay: "Délai de Réponse",
    settingsResponseDelayDesc: "Attendre après avoir arrêté de parler avant d'envoyer à l'IA",
    settingsWhatsAppSection: "WhatsApp",
    settingsWhatsAppDesc: "Configurer le routage des messages",
    settingsPersonaSection: "Persona de l'IA",
    settingsAppearanceSection: "Thème",
    settingsSecuritySection: "Sécurité",
    settingsExecutionSection: "Exécution",
    settingsRunInBackgroundDesc: "Garder Orun en cours d'exécution même avec la fenêtre fermée",
    settingsStartWithWindows: "Démarrer avec Windows",
    settingsStartWithWindowsDesc: "Ouvrir Orun automatiquement au démarrage de l'ordinateur",
    settingsAgentsSection: "Agents",
    settingsUpdatesSection: "Mises à jour",
    settingsDownloading: "Téléchargement...",
    closeWorkspace: "Fermer",
    loadingWorkspace: "Chargement de l'espace de travail...",
    slashHistory: "Historique",
    slashHistoryDesc: "Voir l'historique des conversations",
    slashClear: "Effacer",
    slashClearDesc: "Effacer la conversation actuelle",
    slashSummarize: "Résumer",
    slashSummarizeDesc: "Résumer la conversation",
    slashExport: "Exporter",
    slashExportDesc: "Exporter la conversation",
    slashVoices: "Voix",
    slashVoicesDesc: "Configurer la voix",
    slashModel: "Modèle",
    slashModelDesc: "Changer de modèle",
    slashMemory: "Mémoire",
    slashMemoryDesc: "Rechercher dans la mémoire",
    slashAgents: "Agents",
    slashAgentsDesc: "Voir les agents",
    slashHelp: "Aide",
    slashHelpDesc: "Voir les commandes disponibles",
    conversationSearchEmpty: "Aucune conversation trouvée",
    onboardingWelcome: "Bienvenue sur Orun OS",
    onboardingWelcomeSub: "Votre assistant personnel IA",
    onboardingWelcomeDesc: "Configurons tout en quelques étapes.",
    onboardingProvider: "Choisissez un Fournisseur",
    onboardingProviderSub: "Où votre IA va tourner",
    onboardingProviderDesc: "Sélectionnez un fournisseur IA et entrez votre clé API.",
    onboardingProviderFree: "Gratuit",
    onboardingAgent: "Rencontrez Hampton",
    onboardingAgentSub: "Votre premier agent",
    onboardingAgentDesc: "Hampton est votre assistant principal. Il peut rechercher sur le web, accéder à vos fichiers et bien plus.",
    onboardingAgentFeature1: "Recherche web en temps réel",
    onboardingAgentFeature2: "Accès à vos fichiers locaux",
    onboardingAgentFeature3: "Mémoire des conversations passées",
    onboardingAgentFeature4: "Commandes vocales",
    onboardingReady: "Tout Prêt!",
    onboardingReadySub: "Commencez à utiliser",
    onboardingReadyDesc: "Vous êtes prêt à commencer. Cliquez ci-dessous pour démarrer votre première conversation.",
    onboardingApiKey: "Votre clé API",
    onboardingKeyValid: "✓ Clé valide!",
    onboardingKeyInvalid: "✗",
    onboardingSkip: "Passer",
    onboardingDontShow: "Ne plus afficher",
    onboardingBack: "Retour",
    onboardingNext: "Suivant",
    onboardingStart: "Commencer",
    errorBoundaryMessage: "Une erreur s'est produite",
    errorBoundaryReload: "Recharger",
    ariaStartDictation: "Lancer la dictée",
    ariaStopDictation: "Arrêter la dictée",
    ariaSendMessage: "Envoyer le message",
    offlineMessage: "Pas de connexion internet",
    settingsBackupSection: "Sauvegarde & Restauration",
    settingsRestoreConfirm: "Restaurer cette sauvegarde ? L'app se redémarrera.",
    ariaCancelEdit: "Annuler la modification",
    ariaConfirmEdit: "Confirmer la modification",
    ariaEditMessage: "Modifier le message",
    ariaRegenerate: "Régénérer la réponse",
    ariaDeleteProject: "Supprimer le projet",
    statusOnline: "En ligne",
    statusOffline: "Hors ligne",
    loadingConversation: "Chargement de la conversation...",
    encryptionWeakMode: "Chiffrement en mode faible — clé enregistrée en clair",
    close: "Fermer",
    skipToContent: "Aller au contenu",
    conversations: "Conversations",
    slashCommands: "Commandes",
    // Profile panel
    profileTitle: "Mon Profil",
    profileName: "Nom",
    profileNamePlaceholder: "Votre nom",
    profilePhoto: "Photo de profil",
    profilePhotoChange: "Changer la photo",
    profilePhotoRemove: "Supprimer la photo",
    profileVoiceRecording: "Enregistrement vocal",
    profileVoiceRecord: "Enregistrer la voix",
    profileVoiceStop: "Arrêter l'enregistrement",
    profileVoiceUse: "Utiliser cette voix",
    profileVoiceDelete: "Supprimer l'enregistrement",
    profileSaved: "Profil enregistré !",
    profileSave: "Enregistrer le profil",

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
    voiceNoSTTFallback: "(Message vocal — configurez STT dans Paramètres > Voix)",

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
    whatsappHealthDesc: "Envoyez des photos de nourriture pour analyse des calories et nutriments",
    whatsappFinanceDesc: "Envoyez les reçus PIX, carte ou relevé pour enregistrer dans les finances",
    whatsappTrainerDesc: "Entraînements et activités physiques",
    whatsappAssistantDesc: "Agenda et rendez-vous quotidiens",
    whatsappSocialDesc: "Contenu pour Instagram, TikTok et X",
    whatsappTestSent: "Message de test envoyé à {name} !",
    whatsappTestError: "Erreur : {error}",
    whatsappTestSendTo: "Envoyer un message de test à {name}",
    whatsappJidHelp: "Pour obtenir le JID d'un groupe : ouvrez le groupe dans WhatsApp → appuyez sur le nom du groupe → faites défiler jusqu'en bas → le code est le JID.",

    // Social media panel
    socialMediaStoriesDesc: "15s par diapositive, 3-5 diapositives",
    socialMediaReelsDesc: "30-90s, accroche forte",
    socialMediaCarouselDesc: "5-10 diapositives, un point chacune",
    socialMediaTikTokDesc: "15-60s, rythme rapide",
    socialMediaXPostDesc: "280 caractères, tweet unique",
    socialMediaXThreadDesc: "5-10 tweets enchaînés",
    socialMediaHook1: "Ça a été SUPPRIMÉ de l'histoire brésilienne",
    socialMediaHook2: "On ne t'a jamais appris ça à l'école",
    socialMediaHook3: "L'histoire que personne ne raconte",
    socialMediaHook4: "L'homme que le monde a oublié",
    socialMediaHook5: "Une histoire que TOUS les Brésiliens devraient connaître",
    socialMediaHook6: "Ça a changé le monde pour toujours",
    socialMediaHook7: "La vérité que personne ne dit",
    socialMediaHook8: "La lutte qui continue aujourd'hui",
    socialMediaImageUrl: "URL de l'image (obligatoire)",
    socialMediaMediaUrl: "URL du média (obligatoire)",
    socialMediaGeneratedPrompt: "Prompt Généré",
    socialMediaCopied: "Copié !",
    socialMediaCopy: "Copier",
    socialMediaPublish: "Publier",

    // Conversation list
    conversationNew: "Nouvelle conversation",
    conversationBrowserWarning: "L'historique n'est disponible que dans l'application Electron empaquetée.",
    conversationLoading: "Chargement…",
    conversationEmpty: "Aucune conversation pour l'instant.",
    conversationSearch: "Rechercher des conversations...",

    // Chat input
    chatImageAttached: "Image jointe",
    chatAttachPhoto: "Joindre une photo (ex: un repas pour l'agent Nutritionist)",
    chatPlaceholder: "Demandez quelque chose à Hampton... (essayez /voix ou /model)",
    chatDisclaimer: "Hampton peut faire des erreurs. Vérifiez toujours les informations importantes.",
    chatFileTooLarge: "Image trop grande. Taille maximale : 10 Mo.",
    chatUnsupportedFile: "Type de fichier non supporté. Veuillez envoyer uniquement des images.",

    // Message bubble
    messageEditResend: "Modifier et renvoyer",
    messageRegenerate: "Régénérer",

    // Message bubble — tool labels
    toolReadingFile: "Lecture du fichier",
    toolWritingFile: "Écriture du fichier",
    toolEditingFile: "Édition du fichier",
    toolListingFiles: "Liste des fichiers",
    toolSearchingFiles: "Recherche de fichiers",
    toolSearchingContent: "Recherche de contenu",
    toolRunningCommand: "Exécution de commande",
    toolFetchingUrl: "Récupération d'URL",
    toolSavingMemory: "Sauvegarde en mémoire",
    toolSearchingMemory: "Recherche en mémoire",
    toolSendingNotification: "Envoi de notification",
    toolSchedulingTask: "Planification de tâche",
    toolDone: "terminé",
    toolWorking: "en cours...",

    // Schedules panel
    schedulesTitle: "Automatisations & Objectifs",
    schedulesDescription: "Configurez les horaires quotidiens des agents pour envoyer des résumés sur WhatsApp. Définissez vos objectifs de poids.",
    schedulesHealthGoals: "Objectifs de Santé",
    schedulesCurrentWeight: "Poids Actuel (kg)",
    schedulesTargetWeight: "Poids Cible (kg)",
    schedulesHeight: "Taille (cm)",
    schedulesStartWeight: "Poids Initial (kg)",
    schedulesSaveGoals: "Enregistrer les Objectifs",
    schedulesSaved: "✓ Enregistré !",
    schedulesWeightCurrent: "Poids actuel :",
    schedulesWeightChange: "Variation hebdomadaire :",
    schedulesWeightLost: "Total perdu :",
    schedulesTarget: "Objectif :",
    schedulesRemaining: "restants)",
    schedulesLogWeight: "Enregistrer le poids (kg)",
    schedulesRegister: "Enregistrer",
    schedulesSocialMediaAuto: "Social Media Auto",
    schedulesSocialMediaDesc: "Envoie des idées de contenu chaque heure : Carrousel, Stories, Reels, Post X et TikTok. Publie sur le groupe WhatsApp.",
    schedulesAutoEnable: "Activer la publication automatique",
    schedulesStart: "Début :",
    schedulesHourly: "(toutes les heures)",
    schedulesOtherAgents: "Autres Agents",
    schedulesFooter: "Social Media envoie des idées de contenu chaque heure au groupe WhatsApp. Les autres agents envoient des résumés quotidiens à l'heure configurée.",
    schedulesHealth: "Santé",
    schedulesHealthDesc: "Plan de repas quotidien via WhatsApp",
    schedulesPersonalTrainer: "Personal Trainer",
    schedulesPersonalTrainerDesc: "Entraînement quotidien via WhatsApp",
    schedulesPersonalAssistant: "Assistant Personnel",
    schedulesPersonalAssistantDesc: "Agenda quotidien via WhatsApp",
    schedulesSocialMedia: "Réseaux Sociaux",
    schedulesSocialMediaAgentDesc: "Contenu quotidien pour les réseaux sociaux",
    schedulesFinance: "Finance",
    schedulesMarketing: "Marketing",

    // Agent data panel
    agentDataFinanceLog: "Journal Financier",
    agentDataHealthMetrics: "Métriques de Santé",
    agentDataCodeReviews: "Revisions de Code",
    agentDataLearningProgress: "Progrès d'Apprentissage",
    agentDataVideoProjects: "Projets Vidéo",
    agentDataImage3D: "Générations d'Image / 3D",
    agentDataMusicProjects: "Projets Musicaux",
    agentDataLoading: "Chargement...",
    agentDataIncome: "Revenus",
    agentDataExpenses: "Dépenses",
    agentDataBalance: "Solde",
    agentDataNoTransactions: "Aucune transaction aujourd'hui. Discutez avec Finance pour enregistrer des dépenses.",
    agentDataNoHealth: "Aucune donnée santé aujourd'hui. Discutez avec Health pour enregistrer.",
    agentDataNoCodeReviews: "Aucune revision de code aujourd'hui. Discutez avec Developer pour réviser du code.",
    agentDataNoLearning: "Aucun progrès d'apprentissage aujourd'hui. Discutez avec Teacher pour commencer.",
    agentDataNoVideo: "Aucun projet vidéo aujourd'hui. Discutez avec Video Editor pour en créer un.",
    agentDataNoGenerations: "Aucune génération aujourd'hui. Discutez avec 3D Designer pour créer des images ou des modèles 3D.",
    agentDataNoMusic: "Aucun projet musical aujourd'hui. Discutez avec Music Producer pour créer de la musique.",
    agentDataNoCreator: "Aucun projet créatif aujourd'hui. Discutez avec Creator pour commencer.",
    agentDataHealthLog: "Journal Santé",
    agentDataCreatorProjects: "Projets Créatifs",
    agentDataDesigns: "Designs",
    agentDataNutritionToday: "Nutrition Aujourd'hui",
    agentDataProtein: "Protéines",
    agentDataCarbs: "Glucides",
    agentDataFat: "Lipides",

    // WhatsApp panel — automation
    wa_chat_personal_optional: "Chat Personnel (optionnel)",
    wa_chat_personal_desc: "Chat personnel pour messages directs (optionnel si vous avez déjà configuré les groupes ci-dessus).",
    wa_urgente_meeting: "urgent, réunion",
    wa_option_notify: "Notifier",
    wa_option_task: "Tâche",
    wa_option_summary: "Résumé",
    wa_n8n_webhook_desc: "Les messages reçus sont envoyés à N8N automatiquement.",
    wa_n8n_placeholder: "https://votre-n8n.com/webhook/...",
    wa_save: "Enregistrer",
    wa_broadcast_desc: "Envoyer un message à plusieurs groupes à la fois (avec délai anti-bannissement).",
    wa_message_placeholder: "Message à envoyer...",
    wa_send_to_n_groups: "Envoyer à {count} groupe(s)",
    wa_summary: "Résumé",

    // Social Media panel — additional
    social_topic_label: "Sujet / Personne / Événement",
    social_topic_placeholder: "ex: Thomas Sankara, Esclavage au Brésil, Angela Davis...",
    social_hook_label: "Accroche (optionnel)",
    social_photo_placeholder: "https://exemple.com/photo.jpg",

    // Common
    commonNone: "Aucun",
    commonLoading: "Chargement…",
    commonError: "Erreur inconnue",

    // Command Palette
    commandPalettePlaceholder: "Rechercher commandes, agents, actions...",
    commandPaletteNoResults: "Aucun resultat",

    // Slash Commands
    slashHistorico: "Voir l'historique des conversations",
    slashLimpar: "Effacer la conversation actuelle",
    slashResumir: "Resumer la conversation",
    slashExportar: "Exporter la conversation",
    slashMemoria: "Rechercher dans la memoire",
    slashAgentes: "Voir les agents",
    slashAjuda: "Voir les commandes disponibles",

    // Plugin System
    plugins: "Plugins",
    pluginsEmpty: "Aucun plugin installe",
    pluginsLoad: "Charger",
    pluginsUnload: "Decharger",
    pluginsLoaded: "Plugin charge",
    pluginsError: "Erreur lors du chargement du plugin",

    // MCP
    mcp: "Serveurs MCP",
    mcpEmpty: "Aucun serveur MCP conecte",
    mcpAdd: "Ajouter un serveur",
    mcpRemove: "Supprimer",

    // Keyboard Shortcuts
    shortcutsTitle: "Raccourcis clavier",

    // Skeleton
    skeletonLoading: "Chargement...",
    skeletonLoadingMessages: "Chargement des messages...",
    skeletonLoadingAgents: "Chargement des agents...",
    skeletonLoadingSettings: "Chargement des paramètres...",

    // Agent Health
    agent_health_description: "Cabinet Médical Numérique",
    agent_health_tagline: "Prendre soin de votre santé avec technologie et précision",
    agent_health_quick_action_meal_analysis_label: "Analyse de Repas",
    agent_health_quick_action_meal_analysis_prompt: "Analysez cette photo de nourriture et dites-moi les macros",
    agent_health_quick_action_workout_label: "Entraînement Personnalisé",
    agent_health_quick_action_workout_prompt: "Créez un entraînement personnalisé basé sur mon historique",
    agent_health_quick_action_log_weight_label: "Enregistrer le Poids",
    agent_health_quick_action_log_weight_prompt: "Je veux enregistrer mon poids d'aujourd'hui",
    agent_health_quick_action_view_goals_label: "Voir les Objectifs",
    agent_health_quick_action_view_goals_prompt: "Montrez mes objectifs santé et progrès",
    agent_health_quick_action_schedule_appointment_label: "Planifier un Rendez-vous",
    agent_health_quick_action_schedule_appointment_prompt: "Je dois planifier un rendez-vous",
    agent_health_quick_action_exams_label: "Examens",
    agent_health_quick_action_exams_prompt: "Je veux enregistrer mes derniers examens",
    agent_health_stat_bmi: "IMC",
    agent_health_stat_steps_today: "Pas Aujourd'hui",
    agent_health_stat_heart_rate: "Fréquence Cardiaque",
    agent_health_stat_water: "Eau",

    // Agent Finance
    agent_finance_description: "Bureau Financier Personnel",
    agent_finance_tagline: "Contrôle total de vos finances en un seul endroit",
    agent_finance_quick_action_log_expense_label: "Enregistrer une Dépense",
    agent_finance_quick_action_log_expense_prompt: "Je veux enregistrer une dépense",
    agent_finance_quick_action_log_income_label: "Enregistrer un Revenu",
    agent_finance_quick_action_log_income_prompt: "Je veux enregistrer un revenu",
    agent_finance_quick_action_monthly_balance_label: "Solde Mensuel",
    agent_finance_quick_action_monthly_balance_prompt: "Montrez le solde financier de ce mois",
    agent_finance_quick_action_budget_label: "Budget",
    agent_finance_quick_action_budget_prompt: "Créez un budget mensuel intelligent",
    agent_finance_quick_action_investments_label: "Investissements",
    agent_finance_quick_action_investments_prompt: "Analysez mes investissements",
    agent_finance_quick_action_financial_goals_label: "Objectifs Financiers",
    agent_finance_quick_action_financial_goals_prompt: "Je veux voir mes objectifs financiers",
    agent_finance_stat_balance: "Solde",
    agent_finance_stat_income: "Revenus",
    agent_finance_stat_expenses: "Dépenses",
    agent_finance_stat_savings: "Épargne",

    // Agent Developer
    agent_developer_description: "Station de Développement",
    agent_developer_tagline: "Code, debug, déployez - tout dans un terminal immersif",
    agent_developer_quick_action_review_code_label: "Revoir le Code",
    agent_developer_quick_action_review_code_prompt: "Revoir ce code pour moi et suggérer des améliorations",
    agent_developer_quick_action_debug_label: "Déboguer",
    agent_developer_quick_action_debug_prompt: "J'ai besoin d'aide pour déboguer cette erreur",
    agent_developer_quick_action_new_feature_label: "Nouvelle Fonctionnalité",
    agent_developer_quick_action_new_feature_prompt: "Je veux créer une nouvelle fonctionnalité",
    agent_developer_quick_action_code_review_label: "Revue de Code",
    agent_developer_quick_action_code_review_prompt: "Faites une revue de code complète",
    agent_developer_quick_action_architecture_label: "Architecture",
    agent_developer_quick_action_architecture_prompt: "Aidez-moi à concevoir l'architecture",
    agent_developer_quick_action_tests_label: "Tests",
    agent_developer_quick_action_tests_prompt: "Créez des tests unitaires pour ce module",
    agent_developer_stat_commits: "Commits",
    agent_developer_stat_issues: "Issues",
    agent_developer_stat_prs: "PRs",
    agent_developer_stat_uptime: "Uptime",

    // Agent Marketing
    agent_marketing_description: "Studio de Marketing Digital",
    agent_marketing_tagline: "Créez du contenu viral et conquérez vos réseaux sociaux",
    agent_marketing_quick_action_viral_post_label: "Post Viral",
    agent_marketing_quick_action_viral_post_prompt: "Créez un post viral pour Instagram",
    agent_marketing_quick_action_campaign_label: "Campagne",
    agent_marketing_quick_action_campaign_prompt: "Planifiez une campagne marketing complète",
    agent_marketing_quick_action_persuasive_copy_label: "Copy Persuasif",
    agent_marketing_quick_action_persuasive_copy_prompt: "Écrivez un copy persuasif pour vendre",
    agent_marketing_quick_action_storytelling_label: "Storytelling",
    agent_marketing_quick_action_storytelling_prompt: "Créez un storytelling captivant",
    agent_marketing_quick_action_metrics_analysis_label: "Analyse de Métriques",
    agent_marketing_quick_action_metrics_analysis_prompt: "Analysez les métriques de mes réseaux",
    agent_marketing_quick_action_calendar_label: "Calendrier",
    agent_marketing_quick_action_calendar_prompt: "Créez un calendrier éditorial",
    agent_marketing_stat_reach: "Portée",
    agent_marketing_stat_engagement: "Engagement",
    agent_marketing_stat_posts: "Publications",
    agent_marketing_stat_leads: "Leads",

    // Agent Designer
    agent_designer_description: "Atelier de Design Créatif",
    agent_designer_tagline: "Transformez vos idées en art visuel et expériences",
    agent_designer_quick_action_generate_image_label: "Générer une Image",
    agent_designer_quick_action_generate_image_prompt: "Générez une image impressionnante pour moi",
    agent_designer_quick_action_3d_model_label: "Modèle 3D",
    agent_designer_quick_action_3d_model_prompt: "Créez un modèle 3D détaillé",
    agent_designer_quick_action_uiux_design_label: "UI/UX Design",
    agent_designer_quick_action_uiux_design_prompt: "J'ai besoin d'aide pour le design d'interface",
    agent_designer_quick_action_icons_label: "Icônes",
    agent_designer_quick_action_icons_prompt: "Créez un ensemble d'icônes personnalisées",
    agent_designer_quick_action_color_palette_label: "Palette de Couleurs",
    agent_designer_quick_action_color_palette_prompt: "Suggérez une palette de couleurs harmonieuse",
    agent_designer_quick_action_prototype_label: "Prototype",
    agent_designer_quick_action_prototype_prompt: "Créez un prototype interactif",
    agent_designer_stat_images: "Images",
    agent_designer_stat_3d_models: "Modèles 3D",
    agent_designer_stat_prototypes: "Prototypes",
    agent_designer_stat_styles: "Styles",

    // Agent Creator
    agent_creator_description: "Studio de Production Créative",
    agent_creator_tagline: "Produisez des vidéos et de la musique professionnelle avec l'IA",
    agent_creator_quick_action_create_video_label: "Créer une Vidéo",
    agent_creator_quick_action_create_video_prompt: "Je veux créer une vidéo professionnelle",
    agent_creator_quick_action_create_music_label: "Créer de la Musique",
    agent_creator_quick_action_create_music_prompt: "Je veux créer une chanson originale",
    agent_creator_quick_action_edit_video_label: "Éditer une Vidéo",
    agent_creator_quick_action_edit_video_prompt: "J'ai besoin d'aide pour le montage vidéo",
    agent_creator_quick_action_podcast_label: "Podcast",
    agent_creator_quick_action_podcast_prompt: "Je veux créer un podcast",
    agent_creator_quick_action_sound_effects_label: "Effets Sonores",
    agent_creator_quick_action_sound_effects_prompt: "J'ai besoin d'effets sonores",
    agent_creator_quick_action_mixing_label: "Mixage",
    agent_creator_quick_action_mixing_prompt: "Aidez-moi à mixer cet audio",
    agent_creator_stat_videos: "Vidéos",
    agent_creator_stat_music: "Chansons",
    agent_creator_stat_podcasts: "Podcasts",
    agent_creator_stat_hours: "Heures",

    // Agent Teacher
    agent_teacher_description: "Classe Virtuelle",
    agent_teacher_tagline: "Apprenez n'importe quoi avec un enseignement personnalisé par IA",
    agent_teacher_quick_action_study_plan_label: "Plan d'Étude",
    agent_teacher_quick_action_study_plan_prompt: "Créez un plan d'étude personnalisé",
    agent_teacher_quick_action_translate_label: "Traduire",
    agent_teacher_quick_action_translate_prompt: "Je dois traduire un texte",
    agent_teacher_quick_action_quiz_label: "Quiz",
    agent_teacher_quick_action_quiz_prompt: "Créez un quiz pour tester mes connaissances",
    agent_teacher_quick_action_summary_label: "Résumé",
    agent_teacher_quick_action_summary_prompt: "Résumez ce contenu pour moi",
    agent_teacher_quick_action_explain_label: "Expliquer",
    agent_teacher_quick_action_explain_prompt: "Expliquez ce concept de manière simple",
    agent_teacher_quick_action_flashcards_label: "Flashcards",
    agent_teacher_quick_action_flashcards_prompt: "Créez des flashcards pour la révision",
    agent_teacher_stat_lessons: "Leçons",
    agent_teacher_stat_quizzes: "Quiz",
    agent_teacher_stat_languages: "Langues",
    agent_teacher_stat_hours: "Heures",

    // Agent Automation
    agent_automation_description: "Centre d'Automatisation Intelligente",
    agent_automation_tagline: "Connectez des agents, automatisez les tâches et soyez productif",
    agent_automation_quick_action_create_workflow_label: "Créer un Workflow",
    agent_automation_quick_action_create_workflow_prompt: "Créez un workflow d'automatisation entre agents",
    agent_automation_quick_action_config_bot_label: "Config Bot",
    agent_automation_quick_action_config_bot_prompt: "Configurez un bot pour moi",
    agent_automation_quick_action_test_webhook_label: "Tester le Webhook",
    agent_automation_quick_action_test_webhook_prompt: "Testez un webhook",
    agent_automation_quick_action_list_automations_label: "Lister les Automatisations",
    agent_automation_quick_action_list_automations_prompt: "Listez toutes les automatisations actives",
    agent_automation_quick_action_trigger_agent_label: "Déclencher un Agent",
    agent_automation_quick_action_trigger_agent_prompt: "Déclenchez une tâche dans un autre agent",
    agent_automation_quick_action_monitor_label: "Surveiller",
    agent_automation_quick_action_monitor_prompt: "Surveillez le statut des automatisations",
    agent_automation_stat_workflows: "Workflows",
    agent_automation_stat_triggers: "Déclencheurs",
    agent_automation_stat_executions: "Exécutions",
    agent_automation_stat_success: "Succès",

    // Agent System
    agent_system_description: "Panneau de Contrôle du Système",
    agent_system_tagline: "Configurez et surveillez tous les aspects d'Orun OS",
    agent_system_quick_action_config_ai_label: "Configurer l'IA",
    agent_system_quick_action_config_ai_prompt: "Je veux configurer les paramètres de l'IA",
    agent_system_quick_action_diagnose_label: "Diagnostiquer",
    agent_system_quick_action_diagnose_prompt: "Diagnostiquer l'état du système",
    agent_system_quick_action_clear_cache_label: "Vider le Cache",
    agent_system_quick_action_clear_cache_prompt: "Vider le cache du système",
    agent_system_quick_action_backup_label: "Sauvegarde",
    agent_system_quick_action_backup_prompt: "Créer une sauvegarde des paramètres",
    agent_system_quick_action_security_label: "Sécurité",
    agent_system_quick_action_security_prompt: "Vérifier les paramètres de sécurité",
    agent_system_quick_action_performance_label: "Performance",
    agent_system_quick_action_performance_prompt: "Analyser les performances du système",
    agent_system_stat_cpu: "CPU",
    agent_system_stat_ram: "RAM",
    agent_system_stat_disk: "Disque",
    agent_system_stat_uptime: "Uptime",

    // Agent Automotive
    agent_automotive_description: "Votre Consultant Automobile",
    agent_automotive_tagline: "Diagnostic, entretien, documents et prix - tout pour votre voiture",
    agent_automotive_quick_action_diagnostic_label: "Diagnostic",
    agent_automotive_quick_action_diagnostic_prompt: "Ma voiture a le problème suivant: ",
    agent_automotive_quick_action_fines_inquiry_label: "Consultation d'Amendes",
    agent_automotive_quick_action_fines_inquiry_prompt: "Vérifier si j'ai des amendes ou des impayés sur ma voiture",
    agent_automotive_quick_action_documents_label: "Documents",
    agent_automotive_quick_action_documents_prompt: "Je veux vérifier les documents de ma voiture",
    agent_automotive_quick_action_parts_label: "Pièces",
    agent_automotive_quick_action_parts_prompt: "Rechercher le meilleur prix pour cette pièce: ",
    agent_automotive_quick_action_change_car_label: "Changer de Voiture",
    agent_automotive_quick_action_change_car_prompt: "Je veux changer de voiture, aidez-moi à trouver des options",
    agent_automotive_quick_action_maintenance_label: "Entretien",
    agent_automotive_quick_action_maintenance_prompt: "Je veux connaître l'entretien préventif de ma voiture",
    agent_automotive_stat_km: "KM",
    agent_automotive_stat_next_service: "Proch. Entretien",
    agent_automotive_stat_documents: "Documents",
    agent_automotive_stat_fuel_consumption: "Consommation",

    // Agent Hampton
    agent_hampton_description: "Intelligence Centrale d'Orun OS",
    agent_hampton_tagline: "Votre assistant personnel avec IA avancée et outils puissants",
    agent_hampton_quick_action_chat_label: "Discuter",
    agent_hampton_quick_action_chat_prompt: "",
    agent_hampton_quick_action_web_search_label: "Recherche Web",
    agent_hampton_quick_action_web_search_prompt: "Rechercher sur le web pour moi",
    agent_hampton_quick_action_analyze_label: "Analyser",
    agent_hampton_quick_action_analyze_prompt: "Analyser cette information pour moi",
    agent_hampton_quick_action_automate_label: "Automatiser",
    agent_hampton_quick_action_automate_prompt: "Créer une automatisation pour cette tâche",
    agent_hampton_stat_messages: "Messages",
    agent_hampton_stat_tools: "Outils",
    agent_hampton_stat_memory: "Mémoire",
    agent_hampton_stat_uptime: "Uptime",

    // Agent Page UI
    agent_quick_actions_title: "Actions Rapides",
    agent_open_workspace: "Ouvrir l'Espace de Travail",
    agent_chat_with_ai: "Discuter avec l'IA",
    agent_start_session: "Démarrer la Session",

    // Projects Panel
    projects_title: "Projets",
    projects_filter_all: "tous",
    projects_filter_active: "actifs",
    projects_filter_archived: "archivés",
    projects_new_button: "Nouveau",
    projects_name_placeholder: "Nom du projet",
    projects_description_placeholder: "Description (optionnel)",
    projects_create_button: "Créer",
    projects_cancel_button: "Annuler",

    // Command Palette
    command_palette_home_label: "Accueil",
    command_palette_home_description: "Retour à l'accueil",
    command_palette_section_navigation: "Navigation",
    command_palette_agents_label: "Agents",
    command_palette_agents_description: "Voir tous les agents",
    command_palette_projects_label: "Projets",
    command_palette_projects_description: "Gérer les projets",
    command_palette_settings_label: "Paramètres",
    command_palette_settings_description: "Ouvrir les paramètres",
    command_palette_new_chat_label: "Nouvelle Conversation",
    command_palette_new_chat_description: "Démarrer une nouvelle conversation",
    command_palette_section_actions: "Actions",
    command_palette_history_label: "Historique",
    command_palette_history_description: "Voir l'historique des conversations",
    command_palette_agent_description: "Discuter avec {name}",
    command_palette_section_agents: "Agents",
    command_palette_search_placeholder: "Rechercher des commandes, agents, actions...",
    command_palette_no_results: "Aucun résultat pour",

    // Memory Panel
    memory_title: "Mémoire",
    memory_search_placeholder: "Rechercher des souvenirs...",

    // Settings Panel
    settings_section_language: "Langue",
    settings_section_ai_provider: "Fournisseur d'IA",
    settings_section_model: "Modèle",
    settings_section_connection: "Connexion",
    settings_ollama_url_desc: "URL du serveur Ollama local",
    settings_api_key_label: "Clé API",
    settings_api_key_saved: "(enregistrée)",
    settings_api_key_desc: "Clé pour {label}",
    settings_api_key_placeholder: "Collez votre clé...",
    settings_fallback_provider_label: "Fournisseur de Secours",
    settings_fallback_provider_desc: "Utilisé si le principal échoue",
    settings_none: "Aucun",
    settings_whatsapp_connector_label: "Connecteur WhatsApp",
    settings_whatsapp_connector_desc: "Configurer le routage des messages",
    settings_section_tts: "Text-to-Speech",
    settings_tts_engine_label: "Moteur",
    settings_tts_engine_desc: "Moteur actif: {engine}",
    settings_tts_voice_label: "Voix",
    settings_tts_voice_desc: "Voix sélectionnée pour la synthèse",
    settings_tts_fallback_info: "Fallback auto : si le engine cloud échoue (tokens, quota, etc.), passe à Piper → Bark (local, pas d'internet)",
    settings_agent_models_button: "Modèles par Agent",
    settings_usage_button: "Utilisation Aujourd'hui",
    settingsBackgroundListen: "Écoute en Arrière-plan",
    settingsBackgroundListenDesc: "Le micro écoute 'OK Orun' 24/7 et ouvre le overlay automatiquement",
    settingsWakeServiceRunning: "Service actif",
    settingsWakeServiceStopped: "Service arrêté",
    settingsWakeServiceRestart: "Redémarrer",
    settingsWakeServiceTest: "Diagnostiquer",
    settingsWakeDiagnosticPackages: "Paquets Python",
    settingsWakeDiagnosticPort: "Port TCP 8081",

    // Automotive Garage
    automotive_service_type_oil_change: "Vidange",
    automotive_service_type_general_revision: "Révision Générale",
    automotive_service_type_brakes: "Freins",
    automotive_service_type_suspension: "Suspension",
    automotive_service_type_engine: "Moteur",
    automotive_service_type_transmission: "Transmission",
    automotive_service_type_electrical: "Électrique",
    automotive_service_type_air_conditioning: "Climatisation",
    automotive_service_type_tires: "Pneus",
    automotive_service_type_alignment: "Alignement",
    automotive_service_type_balancing: "Équilibrage",
    automotive_service_type_other: "Autre",
    automotive_expense_category_fuel: "Carburant",
    automotive_expense_category_parking: "Stationnement",
    automotive_expense_category_toll: "Péage",
    automotive_expense_category_fine: "Amende",
    automotive_expense_category_insurance: "Assurance",
    automotive_expense_category_ipva: "Taxe Véhicule",
    automotive_expense_category_registration: "Immatriculation",
    automotive_expense_category_wash: "Lavage",
    automotive_expense_category_accessories: "Accessoires",
    automotive_expense_category_other: "Autre",
    automotive_unknown_vehicle: "Inconnu",
    automotive_nav_overview: "Tableau de bord",
    automotive_nav_vehicles: "Véhicules",
    automotive_nav_services: "Services",
    automotive_nav_expenses: "Dépenses",
    automotive_header_title: "Atelier Premium",
    automotive_header_subtitle: "Consulteur Automobile",
    automotive_filter_label: "Filtrer",
    automotive_filter_all: "Tous",
    automotive_overview_stat_vehicles: "Véhicules",
    automotive_overview_stat_services: "Services",
    automotive_overview_stat_total_expenses: "Dépenses Totales",
    automotive_overview_stat_total_services: "Services Totaux",
    automotive_overview_new_vehicle_title: "Nouveau Véhicule",
    automotive_overview_new_vehicle_desc: "Ajouter une voiture",
    automotive_overview_new_service_title: "Nouveau Service",
    automotive_overview_new_service_desc: "Enregistrer la maintenance",
    automotive_overview_new_expense_title: "Nouvelle Dépense",
    automotive_overview_new_expense_desc: "Carburant, amende, etc",
    automotive_overview_recent_activity: "Activité Récente",
    automotive_overview_no_activity: "Aucune activité pour le moment",
    automotive_vehicles_title: "Mes Véhicules",
    automotive_vehicles_add_button: "Ajouter",
    automotive_vehicles_empty_title: "Aucun véhicule",
    automotive_vehicles_empty_desc: "Cliquez sur 'Ajouter' pour commencer",
    automotive_services_title: "Services",
    automotive_services_add_button: "Nouveau Service",
    automotive_services_empty: "Aucun service",
    automotive_services_no_shop: "Sans atelier",
    automotive_expenses_title: "Dépenses",
    automotive_expenses_add_button: "Nouvelle Dépense",
    automotive_expenses_empty: "Aucune dépense",
    automotive_modal_add_vehicle_title: "Ajouter un Véhicule",
    automotive_field_name: "Nom / Surnom *",
    automotive_field_name_placeholder: "ex: Mon Corolla",
    automotive_field_year: "Année *",
    automotive_field_model: "Modèle *",
    automotive_field_plate: "Plaque",
    automotive_field_color: "Couleur",
    automotive_field_color_placeholder: "Argenté",
    automotive_field_mileage: "Kilométrage",
    automotive_modal_add_vehicle_button: "Ajouter un Véhicule",
    automotive_modal_add_service_title: "Nouveau Service",
    automotive_field_vehicle: "Véhicule *",
    automotive_field_service_type: "Type de Service",
    automotive_field_description: "Description *",
    automotive_field_description_placeholder: "ex: Vidange huile 5W30",
    automotive_field_cost: "Coût (R$)",
    automotive_field_current_km: "KM actuel",
    automotive_field_shop: "Atelier / Lieu",
    automotive_modal_add_service_button: "Enregistrer le Service",
    automotive_add_vehicle_first: "Ajoutez d'abord un véhicule",
    automotive_modal_add_expense_title: "Nouvelle Dépense",
    automotive_field_category: "Catégorie",
    automotive_field_expense_desc_placeholder: "ex: Essence Standard",
    automotive_field_amount: "Montant (R$) *",
    automotive_modal_add_expense_button: "Enregistrer la Dépense",

    // Developer IDE
    developer_ide_explorer_label: "Explorateur",
    developer_ide_import_button: "+ Importer",
    developer_ide_no_file_open: "Aucun fichier ouvert",
    developer_ide_terminal_help: "Commandes: help, clear, ls, cat, echo, pwd, date, version",
    developer_ide_terminal_placeholder: "Tapez une commande...",
    developer_ide_terminal_label: "Terminal",
    developer_ide_show_terminal: "\u25B2 Terminal",

    // System Console
    system_console_welcome: "Console Système Orun OS v1.0 \u2014 Tapez 'help' pour les commandes",
    system_console_help_title: "Commandes disponibles:",
    system_console_help_help: "help \u2014 Affiche cette aide",
    system_console_help_clear: "clear \u2014 Efface la console",
    system_console_help_date: "date \u2014 Affiche la date/heure actuelle",
    system_console_help_echo: "echo <texte> \u2014 Répète le texte",
    system_console_help_uptime: "uptime \u2014 Affiche le temps de fonctionnement estimé",
    system_console_help_version: "version \u2014 Affiche la version d'Orun OS",
    system_console_help_agents: "agents \u2014 Liste les agents disponibles",
    system_console_help_ram: "ram \u2014 Affiche l'utilisation estimée de la RAM",
    system_console_help_clearmemory: "clearmemory \u2014 Efface l'historique de la console",
    system_console_uptime: "Fonctionnement: {hrs}h {mins}m",
    system_console_version: "Orun OS v1.0.0 \u2014 Plugin System v1.0",
    system_console_agents_list_1: "Hampton, Developer, Designer, Creator",
    system_console_agents_list_2: "Health, Finance, Teacher, Marketing",
    system_console_agents_list_3: "Automation, System",
    system_console_ram_device: "RAM de l'Appareil: {ram}GB",
    system_console_ram_available: "RAM disponible estimée: {available}",
    system_console_command_not_found: "Commande introuvable: {cmd}. Tapez 'help' pour les commandes disponibles.",
    system_console_cleared: "Console effacé.",
    system_console_history_cleared: "Historique de la console effacé.",
    system_console_resource_cpu: "CPU",
    system_console_resource_ram: "RAM",
    system_console_resource_disk: "Disque",
    system_console_placeholder: "Tapez une commande...",

    // Designer
    designer_template_instagram_post: "Publication Instagram",
    designer_template_story: "Story",
    designer_template_thumbnail: "Thumbnail",
    designer_template_logo: "Logo",
    designer_template_presentation: "Présentation",
    designer_shape_rectangle: "Rectangle",
    designer_shape_circle: "Cercle",
    designer_shape_triangle: "Triangle",
    designer_shape_star: "Étoile",
    designer_shape_line: "Ligne",
    designer_icon_heart: "Coeur",
    designer_icon_bolt: "Éclair",
    designer_icon_sun: "Soleil",
    designer_tool_select: "Sélectionner",
    designer_tool_text: "Texte",
    designer_tool_shape: "Forme",
    designer_tool_image: "Image",
    designer_tool_draw: "Dessiner",
    designer_tool_delete: "Supprimer",
    designer_toast_png_copied: "PNG copié !",
    designer_toast_png_saved: "PNG enregistré !",
    designer_toast_svg_exported: "SVG exporté !",
    designer_zoom_fit: "Ajuster",
    designer_import_button: "Importer",
    designer_export_button: "Exporter",
    designer_share_button: "Partager",
    designer_tab_templates: "Modèles",
    designer_tab_elements: "Éléments",
    designer_tab_text: "Texte",
    designer_tab_uploads: "Uploads",
    designer_tab_background: "Arrière-plan",
    designer_templates_section_title: "Tailles Prédéfinies",
    designer_elements_section_shapes: "Formes",
    designer_elements_section_icons: "Icônes",
    designer_elements_section_decorative: "Décoratifs",
    designer_text_add_title: "Ajouter un titre",
    designer_text_add_subtitle: "Ajouter un sous-titre",
    designer_text_add_body: "Ajouter du texte",
    designer_uploads_drag_here: "Glissez les images ici",
    designer_uploads_or_click: "ou cliquez pour sélectionner",
    designer_background_solid_colors: "Couleurs Unies",
    designer_background_gradients: "Dégradés",
    designer_panel_design_name: "Design",
    designer_panel_canvas_size: "Taille du Canvas",
    designer_panel_width: "Largeur",
    designer_panel_height: "Hauteur",
    designer_panel_background_color: "Couleur de Fond",
    designer_panel_select_element_hint: "Sélectionnez un élément pour modifier ses propriétés",
    designer_panel_position: "Position",
    designer_panel_size: "Taille",
    designer_panel_rotation: "Rotation",
    designer_panel_opacity: "Opacité",
    designer_panel_text: "Texte",
    designer_panel_font_size: "Taille de Police",
    designer_panel_font_family: "Famille de Police",
    designer_panel_style: "Style",
    designer_panel_text_color: "Couleur du Texte",
    designer_panel_fill_color: "Couleur de Remplissage",
    designer_panel_border_color: "Couleur de Bordure",
    designer_panel_none: "Aucune",
    designer_panel_border_width: "Épaisseur de Bordure",
    designer_panel_layer_order: "Ordre des Calques",
    designer_panel_bring_front: "Mettre au premier plan",
    designer_panel_send_back: "Mettre à l'arrière",
    designer_canvas_drag_image: "Glissez une image",

    // Creator Audio
    creator_audio_deck: "Deck {deck}",
    creator_audio_bpm: "BPM",
    creator_audio_pitch: "Pitch",
    creator_audio_sync: "Sync",
    creator_audio_cue: "Cue",
    creator_audio_play: "Lire",
    creator_audio_pause: "Pause",
    creator_audio_stop: "Arrêter",
    creator_audio_rec: "Enregistrer",
    creator_audio_mixer: "Mixeur",
    creator_audio_master: "Master",
    creator_audio_crossfader: "Crossfader",
    creator_audio_headphones: "Casque",
    creator_audio_cue_mix: "Cue Mix",
    creator_audio_effects: "Effets",
    creator_audio_samples: "Samples",
    creator_audio_recording: "Enregistrement",
    creator_audio_format: "Format",
    creator_audio_quality: "Qualité",
    creator_audio_export: "Exporter",
    creator_audio_import: "Importer",
    creator_audio_recording_status: "Enregistrement...",
    creator_audio_ready: "Prêt",
    creator_audio_storage: "Stockage",
    creator_audio_tempo: "Tempo",
    creator_audio_hi: "AG",
    creator_audio_mid: "MD",
    creator_audio_lo: "BW",
    creator_audio_pan: "Pan",
    creator_audio_wet: "WET",
    creator_audio_par_x: "PAR X",
    creator_audio_par_y: "PAR Y",
    creator_audio_low: "Low",
    creator_audio_mid_freq: "Mid",
    creator_audio_high: "High",
    creator_audio_solo: "S",
    creator_audio_mute: "M",
    creator_audio_open: "Ouvrir",
    creator_audio_volume: "Volume",
    creator_audio_none: "Aucun",
    creator_audio_imported: "Importé",
    creator_audio_loaded: "Chargé",
    creator_audio_error_no_audio: "Aucun audio chargé",
    // Creator Video
    creator_video_select: "Sélectionner",
    creator_video_trim: "Rogner",
    creator_video_split: "Diviser",
    creator_video_delete: "Supprimer",
    creator_video_copy: "Copier",
    creator_video_paste: "Coller",
    creator_video_undo: "Annuler",
    creator_video_redo: "Rétablir",
    creator_video_export: "Exporter",
    creator_video_media: "Médias",
    creator_video_text: "Texte",
    creator_video_effects: "Effets",
    creator_video_transitions: "Transitions",
    creator_video_import: "+ Importer",
    creator_video_mixer: "Mixeur",
    creator_video_master: "Master",
    creator_video_position: "Position",
    creator_video_scale: "Échelle",
    creator_video_rotation: "Rotation",
    creator_video_blend_mode: "Mode de Fusion",
    creator_video_opacity: "Opacité",
    creator_video_volume: "Volume",
    creator_video_fade_in: "Fondu Entrée",
    creator_video_fade_out: "Fondu Sortie",
    creator_video_font: "Police",
    creator_video_size: "Taille",
    creator_video_color: "Couleur",
    creator_video_clip_info: "Info Clip",
    creator_video_type: "Type",
    creator_video_track: "Piste",
    creator_video_start: "Début",
    creator_video_duration: "Durée",
    creator_video_safe_margins: "Marges de Sécurité",
    creator_video_fullscreen: "Plein Écran",
    creator_video_timeline: "Chronologie",
    creator_video_zoom_in: "Zoom +",
    creator_video_zoom_out: "Zoom -",
    creator_video_title: "Titre",
    creator_video_subtitle: "Sous-titre",
    creator_video_caption: "Légende",
    creator_video_solo: "Solo",
    creator_video_mute: "Muet",
    creator_video_visibility: "Visibilité",
    creator_video_lock: "Verrouiller",
    // Export/Import panel
    exportImportTitle: "Exporter/Importer les Conversations",
    exportSelectAll: "Tout Sélectionner",
    exportDeselectAll: "Tout Désélectionner",
    exportSelected: "sélectionnées",
    exportNoAgent: "Sans agent",
    exportExporting: "Exportation...",
    exportExportJSON: "Exporter JSON",
    exportImporting: "Importation...",
    exportImportJSON: "Importer JSON",
    exportSuccess: "Opération terminée!",
    exportError: "Erreur lors de l'opération",
    exportFileNotSupported: "Format de fichier non supporté",
    exportConversations: "Conversations",
    exportFullBackup: "Sauvegarde Complète",
    exportFullDescription: "Exporte toutes les conversations, paramètres, plannings et mémoire des agents dans un seul fichier JSON.",
    // WhatsApp panel
    whatsappDailyLimit: "Limite Quotidienne",
    whatsappConnect: "Connecter WhatsApp",
    whatsappSessionKept: "La session sera maintenue après la première connexion",
    whatsappAutoReconnect: "Auto-reconnect",
    whatsappYourGroups: "Vos Groupes",
    whatsappNoGroupsFound: "Aucun groupe trouvé. Créez des groupes dans WhatsApp et cliquez sur actualiser.",
    whatsappGroupsByAgent: "Groupes par Agent",
    whatsappJidCopyHelp: "Copiez le JID de la liste ci-dessus et collez-le dans le champ de l'agent correspondant.",
    whatsappKeywords: "Mots-clés",
    whatsappKeywordsDesc: "Quand des mots-clés apparaissent dans les groupes, une action automatique est déclenchée.",
    whatsappGenerate: "Générer",
    whatsappAutoReply: "Auto-reply",
    whatsappAutoReplyDesc: "Les messages dans les groupes liés sont traités par l'IA de l'agent correspondant et répondus automatiquement. Les dates mentionnées dans les messages sont détectées et créent des planifications automatiques.",
    whatsappNoGroupsConfigured: "Aucun groupe configuré dans l'onglet Configuration",
    whatsappRetry: "Réessayer",
    whatsappQueue: "File d'attente",
    whatsappConfigTab: "Configuration",
    whatsappAutomationTab: "Automatisation",
    whatsappScanWhatsApp: "Scanner avec WhatsApp",
    // AgentData panel
    agentDataDraft: "Brouillon",
    agentDataRendering: "Rendu en cours",
    agentDataProcessing: "Traitement",
    agentDataCompleted: "Terminé",
    agentDataFailed: "Échoué",
    agentDataCustom: "personnalisé",
    // TitleBar
    titlebarMinimize: "Minimiser",
    titlebarMaximize: "Maximiser",
    titlebarClose: "Fermer",
    // VoiceOverlay
    voiceOverlayListening: "écoute...",
    voiceOverlayThinking: "réflexion...",
    voiceOverlaySpeaking: "parle...",
    // ChatInput
    chatInputCommands: "Commandes",
    // ConversationList
    conversationHistory: "Historique",
    // SocialMedia panel
    socialMediaCreateViral: "Créez du contenu viral pour Instagram, TikTok et X axé sur les histoires effacées et la lutte contre le racisme.",
    socialMediaWebhooksN8n: "Webhooks n8n",
    socialMediaConfigureWebhooks: "Configurez les URLs des webhooks n8n pour publier via Buffer. Payload: { text, imageUrl?, videoUrl?, format? }",
    socialMediaSaveWebhooks: "Sauvegarder Webhooks",
    socialMediaPlatform: "Plateforme",
    socialMediaGenerating: "Génération...",
    socialMediaGenerateContent: "Générer le Contenu",
    socialMediaInstagramReqImage: "Erreur: Instagram nécessite une URL d'image",
    socialMediaTiktokReqMedia: "Erreur: TikTok nécessite une URL de vidéo ou d'image",
    socialMediaPublishedSuccess: "Publié avec succès!",
    socialMediaPublishError: "Erreur",
    // Projects panel
    projectsNewProject: "Nouveau projet",
    // Spotify integration
    settingsSpotifySection: "Spotify",
    settingsSpotifyClientId: "Client ID",
    settingsSpotifyClientSecret: "Client Secret",
    settingsSpotifyConnect: "Connecter OAuth",
    settingsSpotifyDisconnect: "Déconnecter",
    settingsSpotifyConnected: "Connecté",
    settingsSpotifyNotConnected: "Non connecté",
    settingsSpotifyPlay: "Lecture",
    settingsSpotifyPause: "Pause",
    settingsSpotifyNowPlaying: "En cours de lecture",
    settingsSpotifyDeviceLabel: "Appareil",
    settingsSpotifyDeviceDesc: "Sélectionner l'appareil de lecture",
    settingsSpotifyNoDevice: "Aucun appareil trouvé",
    settingsSpotifyAuthHelp: "Créer l'app sur developer.spotify.com",
    settingsSpotifyAuthHelpDesc: "Redirect URI : http://127.0.0.1:9222/callback",
    // Discord integration
    settingsDiscordSection: "Bot Discord",
    settingsDiscordToken: "Token du Bot",
    settingsDiscordConnect: "Connecter",
    settingsDiscordDisconnect: "Déconnecter",
    settingsDiscordConnected: "Connecté",
    settingsDiscordConnecting: "Connexion...",
    settingsDiscordError: "Erreur de connexion",
    settingsDiscordGuild: "Serveur",
    settingsDiscordChannel: "Canal",
    settingsDiscordAutoResponse: "Réponse auto",
    settingsDiscordAutoResponseDesc: "L'agent Marketing répond aux messages Discord",
    settingsDiscordBotTokenHelp: "Créer le bot sur discord.com/developers",
    settingsDiscordBotTokenHelpDesc: "Copiez le token du bot et collez-le ci-dessous",
  },
};
