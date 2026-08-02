export interface Joke {
  setup: string;
  punchline: string;
  category: "dad" | "nerd" | "dark" | "random";
}

export interface Curiosity {
  topic: string;
  fact: string;
  emoji: string;
}

export interface Quote {
  text: string;
  author: string;
}

const jokes: Joke[] = [
  { setup: "Por que o programador foi preso?", punchline: "Porque ele usou Java.", category: "nerd" },
  { setup: "O que o HTML falou pro CSS?", punchline: "Calma, eu vou te estilizar.", category: "nerd" },
  { setup: "Como o cientista se comunica?", punchline: "Através de ondas.", category: "dad" },
  { setup: "O que o zero disse pro oito?", punchline: "Belo cinto!", category: "dad" },
  { setup: "Por que o JavaScript foi ao psicólogo?", punchline: "Porque ele tinha problemas de escopo.", category: "nerd" },
  { setup: "Qual é o animal mais antigo?", punchline: "A zebra, porque ela é preta e branca.", category: "dad" },
  { setup: "O que o React falou pro Vue?", punchline: "Você é muito reativo.", category: "nerd" },
  { setup: "Por que o desenvolvedor odeia a natureza?", punchline: "Porque tem muito bugs.", category: "nerd" },
  { setup: "Como se descreve um programador?", punchline: "Alguém que transforma café em código.", category: "nerd" },
  { setup: "O que o ChatGPT respondeu quando perguntaram se ele era religioso?", punchline: "Eu sigo o algoritmo.", category: "nerd" },
  { setup: "Qual a fórmula química da água benta?", punchline: "H-Deus-O.", category: "dad" },
  { setup: "O que um pixel disse pro outro?", punchline: "Nos encontramos no vetor.", category: "nerd" },
];

const curiosities: Curiosity[] = [
  { topic: "Cérebros", fact: "O cérebro humano tem cerca de 86 bilhões de neurônios.", emoji: "🧠" },
  { topic: "Internet", fact: "O primeiro email foi enviado em 1971 por Ray Tomlinson.", emoji: "📧" },
  { topic: "Lua", fact: "A Lua está se afastando da Terra cerca de 3.8 cm por ano.", emoji: "🌙" },
  { topic: "Código", fact: "O primeiro bug documentado foi uma mariposa presa em um relé em 1947.", emoji: "🐛" },
  { topic: "Python", fact: "Python foi nomeado por causa do grupo Monty Python, não pela cobra.", emoji: "🐍" },
  { topic: "Luz", fact: "A luz do Sol leva cerca de 8 minutos e 20 segundos para chegar à Terra.", emoji: "☀️" },
  { topic: "Oceano", fact: "Mais de 80% do oceano ainda não foi explorado.", emoji: "🌊" },
  { topic: "DNA", fact: "O DNA humano tem cerca de 3 bilhões de pares de base.", emoji: "🧬" },
  { topic: "Computadores", fact: "O primeiro disco rígido (IBM 350) armazenava 3.75 MB e pesava 1 tonelada.", emoji: "💾" },
  { topic: "Café", fact: "O café é a segunda bebida mais consumida no mundo, depois da água.", emoji: "☕" },
  { topic: "Música", fact: "O som não viaja no vácuo do espaço.", emoji: "🎵" },
  { topic: "Robôs", fact: "A palavra 'robô' vem do tcheco 'robota', que significa 'trabalho forçado'.", emoji: "🤖" },
  { topic: "Gravidade", fact: "A gravidade da Terra é de 9.8 m/s². Em Júpiter, seria 24.8 m/s².", emoji: "🌍" },
  { topic: "IA", fact: "O termo 'Inteligência Artificial' foi cunhado em 1956 por John McCarthy.", emoji: "🤖" },
  { topic: "Memória", fact: "A memória de curto prazo humana pode reter cerca de 7 itens por vez.", emoji: "🧠" },
];

const quotes: Quote[] = [
  { text: "O único modo de fazer um ótimo trabalho é amar o que você faz.", author: "Steve Jobs" },
  { text: "A simplicidade é o último grau da sofisticação.", author: "Leonardo da Vinci" },
  { text: "Não é o mais forte que sobrevive, mas o que melhor se adapta.", author: "Charles Darwin" },
  { text: "A melhor maneira de prever o futuro é criá-lo.", author: "Peter Drucker" },
  { text: "O conhecimento é poder.", author: "Francis Bacon" },
  { text: "Nada é permanente, exceto a mudança.", author: "Heráclito" },
  { text: "O sucesso é ir de fracasso em fracasso sem perder o entusiasmo.", author: "Winston Churchill" },
  { text: "A imaginação é mais importante que o conhecimento.", author: "Albert Einstein" },
  { text: "A vida é o que acontece enquanto você faz planos.", author: "John Lennon" },
  { text: "Cada dia é uma nova oportunidade para mudar sua vida.", author: "Desconhecido" },
];

export function getRandomJoke(category?: Joke["category"]): Joke {
  const pool = category ? jokes.filter((j) => j.category === category) : jokes;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function getRandomCuriosity(): Curiosity {
  return curiosities[Math.floor(Math.random() * curiosities.length)];
}

export function getRandomQuote(): Quote {
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export function getAllJokes(): Joke[] {
  return jokes;
}

export function getAllCuriosities(): Curiosity[] {
  return curiosities;
}

export function getAllQuotes(): Quote[] {
  return quotes;
}
