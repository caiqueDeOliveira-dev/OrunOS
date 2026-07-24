import { HeartPulse, Stethoscope, Pill, Thermometer, BrainCircuit, Microscope, TestTube, ClipboardList, UserCheck, Activity, Camera, Dumbbell, TrendingDown, Target, Calendar, TrendingUp, DollarSign, BarChart3, Trophy, Wallet, PiggyBank, Code, FileText, Bug, GitBranch, Shield, Server, Megaphone, BookOpen, Globe, Sparkles, Box, Palette, Figma, Layers, Video, Music, Film, Mic, Headphones, Radio, Clock, Zap, Workflow, Bot, Settings, Cpu, HardDrive, Database, Monitor, Lock, Wifi, Car, Wrench, Gauge, AlertTriangle, CheckCircle, Brain, MessageSquare, Send, Footprints, Droplets, Users, Heart, List, GraduationCap, Lightbulb, Award, Search, Receipt, Calculator, Play, Ear, Hand, CreditCard, Terminal, Cog, Share2, PenTool, Scissors, Eye, Clapperboard, Volume2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { OrunFinanceEntry, OrunNutritionEntry, OrunDeveloperReview, OrunTeacherProgress, OrunVideoProject, OrunMusicProject, OrunImage3DGeneration } from "../../types/orun";

// Types for range data
export interface FinanceRange { entries: OrunFinanceEntry[]; daily: { date: string; income: number; expenses: number }[]; totals: { income: number; expenses: number }; balance: number; }
export interface NutritionRange { entries: OrunNutritionEntry[]; daily: { date: string; calories: number; protein_g: number; carbs_g: number; fat_g: number }[]; }
export interface HealthEntry { id: string; date: string; metric: string; value: number; unit: string | null; notes: string | null; }
export interface DeveloperRange { entries: OrunDeveloperReview[]; daily: { date: string; total: number; low: number; medium: number; high: number; critical: number }[]; }
export interface TeacherRange { entries: OrunTeacherProgress[]; daily: { date: string; total: number; learning: number; reviewed: number; mastered: number }[]; }
export interface CreatorRange { videos: OrunVideoProject[]; music: OrunMusicProject[]; }
export interface DesignerRange { entries: OrunImage3DGeneration[]; byEngine: Record<string, number>; }

// ── Immersive Agent Configurations ──────────────────────────────────
export const AGENT_ENVIRONMENTS: Record<string, {
  icon: LucideIcon;
  accent: string;
  secondary: string;
  bg: string;
  pattern: string;
  particles: string[];
  ambientIcons: LucideIcon[];
  description: string;
  tagline: string;
  quickActions: { label: string; icon: LucideIcon; prompt: string }[];
  stats: { label: string; value: string; icon: LucideIcon }[];
}> = {
  Health: {
    icon: HeartPulse,
    accent: "#E53E3E",
    secondary: "#C53030",
    bg: "linear-gradient(135deg, #FFF5F5 0%, #FED7D7 50%, #FEB2B2 100%)",
    pattern: "radial-gradient(circle at 20% 80%, rgba(229,62,62,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(197,48,48,0.06) 0%, transparent 50%)",
    particles: ["🏥", "💊", "🩺", "❤️", "🩹", "🔬"],
    ambientIcons: [Stethoscope, Pill, Thermometer, HeartPulse, BrainCircuit, Microscope, TestTube, ClipboardList, UserCheck, Activity],
    description: "Consultorio Digital de Saude",
    tagline: "Cuidando da sua saude com tecnologia e precisao",
    quickActions: [
      { label: "Analise de Refeicao", icon: Camera, prompt: "Analise esta foto de comida e me diga os macros" },
      { label: "Treino Personalizado", icon: Dumbbell, prompt: "Crie um treino personalizado baseado no meu historico" },
      { label: "Registrar Peso", icon: TrendingDown, prompt: "Quero registrar meu peso de hoje" },
      { label: "Ver Metas", icon: Target, prompt: "Mostre minhas metas de saude e progresso" },
      { label: "Agendar Consulta", icon: Calendar, prompt: "Preciso agendar uma consulta" },
      { label: "Exames", icon: TestTube, prompt: "Quero registrar meus ultimos exames" },
    ],
    stats: [
      { label: "IMC", value: "22.5", icon: Activity },
      { label: "Passos Hoje", value: "8.432", icon: Footprints },
      { label: "Batimentos", value: "72 bpm", icon: HeartPulse },
      { label: "Agua", value: "1.8L", icon: Droplets },
    ],
  },
  Finance: {
    icon: DollarSign,
    accent: "#D69E2E",
    secondary: "#B7791F",
    bg: "linear-gradient(135deg, #FFFBEB 0%, #FEFCBF 50%, #FAF089 100%)",
    pattern: "radial-gradient(circle at 30% 70%, rgba(214,158,46,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 30%, rgba(183,121,31,0.06) 0%, transparent 50%)",
    particles: ["💰", "📊", "💳", "🏦", "📈", "💎"],
    ambientIcons: [TrendingUp, TrendingDown, DollarSign, BarChart3, Target, Wallet, PiggyBank, CreditCard, Receipt, Calculator],
    description: "Escritorio Financeiro Pessoal",
    tagline: "Controle total das suas financas em um so lugar",
    quickActions: [
      { label: "Registrar Gasto", icon: TrendingDown, prompt: "Quero registrar um gasto" },
      { label: "Registrar Receita", icon: TrendingUp, prompt: "Quero registrar uma receita" },
      { label: "Balanco Mensal", icon: BarChart3, prompt: "Mostre o balanco financeiro deste mes" },
      { label: "Orcamento", icon: Target, prompt: "Crie um orcamento mensal inteligente" },
      { label: "Investimentos", icon: TrendingUp, prompt: "Analise meus investimentos" },
      { label: "Metas Financeiras", icon: Trophy, prompt: "Quero ver minhas metas financeiras" },
    ],
    stats: [
      { label: "Saldo", value: "R$ 4.250", icon: DollarSign },
      { label: "Receitas", value: "R$ 8.500", icon: TrendingUp },
      { label: "Despesas", value: "R$ 4.250", icon: TrendingDown },
      { label: "Economia", value: "50%", icon: PiggyBank },
    ],
  },
  Developer: {
    icon: Code,
    accent: "#4A5568",
    secondary: "#2D3748",
    bg: "linear-gradient(135deg, #1A202C 0%, #2D3748 50%, #4A5568 100%)",
    pattern: "radial-gradient(circle at 25% 75%, rgba(74,85,104,0.15) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(45,55,72,0.1) 0%, transparent 50%)",
    particles: ["💻", "🔧", "⚡", "🐛", "🚀", "📦"],
    ambientIcons: [Terminal, GitBranch, Bug, Database, Server, Lock, Globe, Cog, HardDrive, Monitor],
    description: "Estacao de Desenvolvimento",
    tagline: "Code, debug, deploy - tudo em um terminal imersivo",
    quickActions: [
      { label: "Revisar Codigo", icon: FileText, prompt: "Revise este codigo para mim e sugira melhorias" },
      { label: "Debugar", icon: Bug, prompt: "Preciso de ajuda para debugar este erro" },
      { label: "Nova Feature", icon: Code, prompt: "Quero criar uma nova feature" },
      { label: "Code Review", icon: GitBranch, prompt: "Faca um code review completo" },
      { label: "Arquitetura", icon: Database, prompt: "Me ajude a projetar a arquitetura" },
      { label: "Testes", icon: Shield, prompt: "Crie testes unitarios para este modulo" },
    ],
    stats: [
      { label: "Commits", value: "142", icon: GitBranch },
      { label: "Issues", value: "8", icon: Bug },
      { label: "PRs", value: "12", icon: GitBranch },
      { label: "Uptime", value: "99.9%", icon: Server },
    ],
  },
  Marketing: {
    icon: Megaphone,
    accent: "#D53F8C",
    secondary: "#B83280",
    bg: "linear-gradient(135deg, #FFF5F7 0%, #FED7E2 50%, #FBB6CE 100%)",
    pattern: "radial-gradient(circle at 20% 60%, rgba(213,63,140,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 40%, rgba(184,50,128,0.06) 0%, transparent 50%)",
    particles: ["📱", "📸", "🎬", "✨", "🎯", "📣"],
    ambientIcons: [Share2, MessageSquare, Camera, Film, Mic, Radio, Globe, Wifi, Users, BarChart3],
    description: "Estudio de Marketing Digital",
    tagline: "Crie conteudo viral e conquiste suas redes sociais",
    quickActions: [
      { label: "Post Viral", icon: Megaphone, prompt: "Crie um post viral para Instagram" },
      { label: "Campanha", icon: Target, prompt: "Planeje uma campanha de marketing completa" },
      { label: "Copy Persuasiva", icon: FileText, prompt: "Escreva uma copy persuasiva para vender" },
      { label: "Storytelling", icon: BookOpen, prompt: "Crie um storytelling envolvente" },
      { label: "Analise de Metricas", icon: BarChart3, prompt: "Analise as metricas das minhas redes" },
      { label: "Calendario", icon: Calendar, prompt: "Crie um calendario editorial" },
    ],
    stats: [
      { label: "Alcance", value: "12.5K", icon: Users },
      { label: "Engajamento", value: "4.8%", icon: Heart },
      { label: "Posts", value: "28", icon: Megaphone },
      { label: "Leads", value: "156", icon: Target },
    ],
  },
  Designer: {
    icon: Sparkles,
    accent: "#805AD5",
    secondary: "#6B46C1",
    bg: "linear-gradient(135deg, #FAF5FF 0%, #E9D8FD 50%, #D6BCFA 100%)",
    pattern: "radial-gradient(circle at 30% 80%, rgba(128,90,213,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 20%, rgba(107,70,193,0.06) 0%, transparent 50%)",
    particles: ["🎨", "🖼️", "✏️", "📐", "🎭", "🖌️"],
    ambientIcons: [Palette, Figma, Box, PenTool, Scissors, Layers, Camera, Sparkles, Cpu, Eye],
    description: "Atelier de Design Criativo",
    tagline: "Transforme suas ideias em arte visual e experiencias",
    quickActions: [
      { label: "Gerar Imagem", icon: Camera, prompt: "Gere uma imagem impressionante para mim" },
      { label: "Modelo 3D", icon: Box, prompt: "Crie um modelo 3D detalhado" },
      { label: "UI/UX Design", icon: Sparkles, prompt: "Preciso de ajuda com design de interface" },
      { label: "Icones", icon: Layers, prompt: "Crie um set de icones personalizados" },
      { label: "Paleta de Cores", icon: Palette, prompt: "Sugira uma paleta de cores harmoniosa" },
      { label: "Prototipo", icon: Figma, prompt: "Crie um prototipo interativo" },
    ],
    stats: [
      { label: "Imagens", value: "47", icon: Camera },
      { label: "Modelos 3D", value: "12", icon: Box },
      { label: "Prototipos", value: "8", icon: Layers },
      { label: "Estilos", value: "15", icon: Palette },
    ],
  },
  Creator: {
    icon: Video,
    accent: "#3182CE",
    secondary: "#2B6CB0",
    bg: "linear-gradient(135deg, #EBF8FF 0%, #BEE3F8 50%, #90CDF4 100%)",
    pattern: "radial-gradient(circle at 25% 70%, rgba(49,130,206,0.08) 0%, transparent 50%), radial-gradient(circle at 75% 30%, rgba(43,108,176,0.06) 0%, transparent 50%)",
    particles: ["🎬", "🎵", "🎤", "🎧", "📹", "🎹"],
    ambientIcons: [Film, Clapperboard, Headphones, Radio, Mic, Music, Video, Volume2, Sparkles, Play],
    description: "Estudio de Producao Criativa",
    tagline: "Produza videos e musicas profissionais com IA",
    quickActions: [
      { label: "Criar Video", icon: Video, prompt: "Quero criar um video profissional" },
      { label: "Criar Musica", icon: Music, prompt: "Quero criar uma musica original" },
      { label: "Editar Video", icon: Film, prompt: "Preciso de ajuda com edicao de video" },
      { label: "Podcast", icon: Mic, prompt: "Quero criar um podcast" },
      { label: "Efeitos Sonoros", icon: Headphones, prompt: "Preciso de efeitos sonoros" },
      { label: "Mixagem", icon: Radio, prompt: "Ajude-me a mixar este audio" },
    ],
    stats: [
      { label: "Videos", value: "15", icon: Video },
      { label: "Musicas", value: "23", icon: Music },
      { label: "Podcasts", value: "8", icon: Mic },
      { label: "Hours", value: "42h", icon: Clock },
    ],
  },
  Teacher: {
    icon: BookOpen,
    accent: "#DD6B20",
    secondary: "#C05621",
    bg: "linear-gradient(135deg, #FFFAF0 0%, #FEEBC8 50%, #FBD38D 100%)",
    pattern: "radial-gradient(circle at 30% 60%, rgba(221,107,32,0.08) 0%, transparent 50%), radial-gradient(circle at 70% 40%, rgba(192,86,33,0.06) 0%, transparent 50%)",
    particles: ["📚", "🎓", "📝", "🧪", "🔬", "📖"],
    ambientIcons: [BookOpen, GraduationCap, PenTool, FileText, Trophy, Target, Brain, Lightbulb, Award, ClipboardList],
    description: "Sala de Aula Virtual",
    tagline: "Aprenda qualquer coisa com ensino personalizado por IA",
    quickActions: [
      { label: "Plano de Estudo", icon: BookOpen, prompt: "Crie um plano de estudo personalizado" },
      { label: "Traduzir", icon: Globe, prompt: "Preciso traduzir um texto" },
      { label: "Quiz", icon: Trophy, prompt: "Crie um quiz para testar meus conhecimentos" },
      { label: "Resumo", icon: FileText, prompt: "Resuma este conteudo para mim" },
      { label: "Explicar", icon: Lightbulb, prompt: "Explique este conceito de forma simples" },
      { label: "Flashcards", icon: Layers, prompt: "Crie flashcards para revisao" },
    ],
    stats: [
      { label: "Aulas", value: "34", icon: BookOpen },
      { label: "Quizzes", value: "18", icon: Trophy },
      { label: "Idiomas", value: "3", icon: Globe },
      { label: "Horas", value: "56h", icon: Clock },
    ],
  },
  Automation: {
    icon: Zap,
    accent: "#319795",
    secondary: "#2C7A7B",
    bg: "linear-gradient(135deg, #E6FFFA 0%, #B2F5EA 50%, #81E6D9 100%)",
    pattern: "radial-gradient(circle at 20% 80%, rgba(49,151,149,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(44,122,123,0.06) 0%, transparent 50%)",
    particles: ["⚡", "🤖", "🔄", "⚙️", "🔗", "📡"],
    ambientIcons: [Bot, Workflow, Cog, Wifi, Globe, Server, Database, Lock, Zap, Activity],
    description: "Centro de Automacao Inteligente",
    tagline: "Conecte agentes, automatize tarefas e seja produtivo",
    quickActions: [
      { label: "Criar Workflow", icon: Workflow, prompt: "Crie um workflow de automacao entre agentes" },
      { label: "Config Bot", icon: Bot, prompt: "Configure um bot para mim" },
      { label: "Testar Webhook", icon: Globe, prompt: "Teste um webhook" },
      { label: "Listar Automacoes", icon: List, prompt: "Liste todas as automacoes ativas" },
      { label: "Trigger Agent", icon: Zap, prompt: "Dispare uma tarefa em outro agent" },
      { label: "Monitorar", icon: Activity, prompt: "Monitore o status das automacoes" },
    ],
    stats: [
      { label: "Workflows", value: "8", icon: Workflow },
      { label: "Triggers", value: "24", icon: Zap },
      { label: "Execucoes", value: "156", icon: Activity },
      { label: "Sucesso", value: "98%", icon: CheckCircle },
    ],
  },
  System: {
    icon: Settings,
    accent: "#718096",
    secondary: "#4A5568",
    bg: "linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 50%, #E2E8F0 100%)",
    pattern: "radial-gradient(circle at 25% 75%, rgba(113,128,150,0.08) 0%, transparent 50%), radial-gradient(circle at 75% 25%, rgba(74,85,104,0.06) 0%, transparent 50%)",
    particles: ["⚙️", "🔧", "💻", "🖥️", "📡", "🔐"],
    ambientIcons: [Settings, Cog, HardDrive, Monitor, Server, Lock, Globe, Wifi, Database, Shield],
    description: "Painel de Controle do Sistema",
    tagline: "Configure e monitore todos os aspectos do Orun OS",
    quickActions: [
      { label: "Configurar IA", icon: Brain, prompt: "Quero configurar os parametros da IA" },
      { label: "Diagnosticar", icon: Activity, prompt: "Diagnostique o estado do sistema" },
      { label: "Limpar Cache", icon: Zap, prompt: "Limpe o cache do sistema" },
      { label: "Backup", icon: HardDrive, prompt: "Faca um backup das configuracoes" },
      { label: "Seguranca", icon: Shield, prompt: "Verifique as configuracoes de seguranca" },
      { label: "Performance", icon: Activity, prompt: "Analise a performance do sistema" },
    ],
    stats: [
      { label: "CPU", value: "23%", icon: Cpu },
      { label: "RAM", value: "4.2GB", icon: HardDrive },
      { label: "Disco", value: "67%", icon: Database },
      { label: "Uptime", value: "99.9%", icon: Clock },
    ],
  },
  Automotive: {
    icon: Car,
    accent: "#2563EB",
    secondary: "#1D4ED8",
    bg: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 50%, #BFDBFE 100%)",
    pattern: "radial-gradient(circle at 20% 80%, rgba(37,99,235,0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(29,78,216,0.06) 0%, transparent 50%)",
    particles: ["🚗", "🔧", "🛞", "⛽", "📋", "🛣️"],
    ambientIcons: [Car, Wrench, Shield, FileText, Globe, Search, DollarSign, AlertTriangle, CheckCircle, ClipboardList],
    description: "Seu Consultor Automotivo",
    tagline: "Diagnostico, manutencao, documentos e precos - tudo para seu carro",
    quickActions: [
      { label: "Diagnostico", icon: AlertTriangle, prompt: "Meu carro esta com o seguinte problema: " },
      { label: "Consulta Multas", icon: FileText, prompt: "Verifique se tenho multas ou pendencias no meu carro" },
      { label: "Documentos", icon: ClipboardList, prompt: "Quero verificar os documentos do meu carro" },
      { label: "Pecas", icon: Wrench, prompt: "Pesquise o melhor preco para esta peca: " },
      { label: "Trocar Carro", icon: Car, prompt: "Quero trocar de carro, me ajude a encontrar opcoes" },
      { label: "Manutencao", icon: CheckCircle, prompt: "Quero saber a manutencao preventiva do meu carro" },
    ],
    stats: [
      { label: "KM", value: "45.000", icon: Gauge },
      { label: "Prox. Troca", value: "3.000km", icon: Wrench },
      { label: "Documentos", value: "OK", icon: CheckCircle },
      { label: "Consumo", value: "12km/L", icon: Droplets },
    ],
  },
  Hampton: {
    icon: Brain,
    accent: "#C00018",
    secondary: "#8B0000",
    bg: "linear-gradient(135deg, #080000 0%, #1A0000 50%, #2D0000 100%)",
    pattern: "radial-gradient(circle at 20% 80%, rgba(192,0,24,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(139,0,0,0.08) 0%, transparent 50%)",
    particles: ["🧠", "⚡", "🔮", "✨", "🌟", "💫"],
    ambientIcons: [Brain, BrainCircuit, Sparkles, Zap, Activity, Shield, Globe, Cpu, Database, Server],
    description: "Inteligencia Central de Orun OS",
    tagline: "Seu assistente pessoal com IA avancada e ferramentas poderosas",
    quickActions: [
      { label: "Conversar", icon: MessageSquare, prompt: "" },
      { label: "Pesquisar Web", icon: Globe, prompt: "Pesquise na web para mim" },
      { label: "Analisar", icon: Brain, prompt: "Analise esta informacao para mim" },
      { label: "Automatizar", icon: Zap, prompt: "Crie uma automacao para esta tarefa" },
    ],
    stats: [
      { label: "Mensagens", value: "1.2K", icon: MessageSquare },
      { label: "Ferramentas", value: "19", icon: Zap },
      { label: "Memoria", value: "847", icon: Database },
      { label: "Uptime", value: "99.9%", icon: Clock },
    ],
  },
};

// ── Translation Key Mappings ───────────────────────────────────────
export const QUICK_ACTION_KEYS: Record<string, string[]> = {
  Health: ["meal_analysis", "personalized_training", "register_weight", "view_goals", "schedule_appointment", "exams"],
  Finance: ["register_expense", "register_income", "monthly_balance", "budget", "investments", "financial_goals"],
  Developer: ["review_code", "debug", "new_feature", "code_review", "architecture", "tests"],
  Marketing: ["viral_post", "campaign", "persuasive_copy", "storytelling", "metrics_analysis", "calendar"],
  Designer: ["generate_image", "3d_model", "ui_ux_design", "icons", "color_palette", "prototype"],
  Creator: ["create_video", "create_music", "edit_video", "podcast", "sound_effects", "mixing"],
  Teacher: ["study_plan", "translate", "quiz", "summary", "explain", "flashcards"],
  Automation: ["create_workflow", "config_bot", "test_webhook", "list_automations", "trigger_agent", "monitor"],
  System: ["config_ai", "diagnose", "clear_cache", "backup", "security", "performance"],
  Automotive: ["diagnostic", "fines_inquiry", "documents", "parts", "change_car", "maintenance"],
  Hampton: ["chat", "web_search", "analyze", "automate"],
};

export const STAT_KEYS: Record<string, string[]> = {
  Health: ["bmi", "steps_today", "heart_rate", "water"],
  Finance: ["balance", "income", "expenses", "savings"],
  Developer: ["commits", "issues", "prs", "uptime"],
  Marketing: ["reach", "engagement", "posts", "leads"],
  Designer: ["images", "3d_models", "prototypes", "styles"],
  Creator: ["videos", "music", "podcasts", "hours"],
  Teacher: ["lessons", "quizzes", "languages", "hours"],
  Automation: ["workflows", "triggers", "executions", "success"],
  System: ["cpu", "ram", "disk", "uptime"],
  Automotive: ["km", "next_service", "documents", "fuel_consumption"],
  Hampton: ["messages", "tools", "memory", "uptime"],
};

export function getTranslatedEnv(
  agent: string,
  env: typeof AGENT_ENVIRONMENTS[string],
  t: (key: string, params?: Record<string, string | number>) => string
) {
  const agentKey = agent.toLowerCase();
  const qaKeys = QUICK_ACTION_KEYS[agent] || [];
  const statKeysArr = STAT_KEYS[agent] || [];

  return {
    ...env,
    description: t(`agent_${agentKey}_description`),
    tagline: t(`agent_${agentKey}_tagline`),
    quickActions: env.quickActions.map((qa, i) => ({
      ...qa,
      label: t(`agent_${agentKey}_quick_action_${qaKeys[i]}_label`),
      prompt: t(`agent_${agentKey}_quick_action_${qaKeys[i]}_prompt`),
    })),
    stats: env.stats.map((stat, i) => ({
      ...stat,
      label: t(`agent_${agentKey}_stat_${statKeysArr[i]}`),
    })),
  };
}
