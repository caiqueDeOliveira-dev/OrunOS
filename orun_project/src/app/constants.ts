import {
  Home, Users, FolderOpen, Sparkles, Brain, Zap, Files, Settings,
  Code, Music, Video, Globe, Eye, Volume2, Database, Cpu, Activity,
  Heart, DollarSign, BookOpen, Languages,
} from "lucide-react";

export const BOOT_MESSAGES = [
  "Inicializando Orun OS...",
  "Carregando Motor de Memória...",
  "Carregando Modelos de IA...",
  "Inicializando Hampton...",
  "Conectando IA Local...",
  "Conectando IA na Nuvem...",
  "Carregando Projetos...",
  "Carregando Memória do Usuário...",
  "Preparando Interface...",
  "Sistema Pronto.",
];

export const AGENTS = [
  { name: "Hampton", role: "Inteligência Central", icon: Brain, special: true },
  { name: "Developer", role: "Código & Engenharia", icon: Code },
  { name: "Designer", role: "UI/UX & Visual", icon: Sparkles },
  { name: "3D Designer", role: "3D & Modelagem", icon: Cpu },
  { name: "Researcher", role: "Pesquisa & Análise", icon: Globe },
  { name: "Health", role: "Monitoramento de Saúde", icon: Heart },
  { name: "Nutritionist", role: "Dieta & Nutrição", icon: Activity },
  { name: "Personal Trainer", role: "Fitness & Treino", icon: Activity },
  { name: "Finance", role: "Orçamento & Investimentos", icon: DollarSign },
  { name: "Teacher", role: "Aprendizado & Educação", icon: BookOpen },
  { name: "Translator", role: "Idiomas & Cultura", icon: Languages },
  { name: "Video Editor", role: "Produção de Vídeo", icon: Video },
  { name: "Music Producer", role: "Áudio & Música", icon: Music },
  { name: "Automation", role: "Automação & Bots", icon: Zap },
  { name: "Vision", role: "IA de Imagem & Câmera", icon: Eye },
  { name: "Voice", role: "Fala & Áudio", icon: Volume2 },
  { name: "Memory Manager", role: "Conhecimento & Memória", icon: Database },
  { name: "System", role: "SO & Configuração", icon: Settings },
];

export const NAV_TOP = [
  { id: "home", icon: Home, label: "Início" },
  { id: "agents", icon: Users, label: "Agentes" },
  { id: "projects", icon: FolderOpen, label: "Projetos" },
  { id: "studio", icon: Sparkles, label: "Estúdio" },
  { id: "memory", icon: Brain, label: "Memória" },
  { id: "automation", icon: Zap, label: "Automação" },
  { id: "files", icon: Files, label: "Arquivos" },
];

/** Used only in browser preview mode, when there's no Electron AI backend. */
export const HAMPTON_REPLIES = [
  "Entendido. Estou processando sua solicitação com toda a inteligência disponível em todos os modelos.",
  "Analisando o contexto agora. Vou fornecer a resposta mais precisa e útil possível.",
  "Sua consulta foi recebida. Sintetizando informações de todos os sistemas de conhecimento conectados.",
  "Executando análise profunda. Permita-me um momento para formular a resposta ideal para você.",
  "Processamento concluído. Aqui está o que encontrei com base na sua solicitação e no contexto atual.",
];

export const isElectron = typeof window !== "undefined" && !!(window as any).orun;
