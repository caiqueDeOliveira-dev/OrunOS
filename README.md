<div align="center">
  <h1>🧠 Orun OS</h1>
  <p><strong>Sistema Operacional Pessoal com IA Multi-Agente</strong></p>
  <p>
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  </p>
</div>

---

## 🚀 Sobre o Projeto

**Orun OS** é um sistema operacional pessoal desktop construído com **Electron + React**, criado para ser o centro de um ecossistema de aplicações com IA multi-agente.

O app reúne um workspace plugin-based com **18 agentes de IA**, integrações de comunicação (WhatsApp, Telegram, Discord), sistema de voz (TTS/STT), player de mídia, automações e sincronização com Supabase — tudo em uma interface desktop nativa e elegante.

> 🎯 **Este é o projeto principal do ecossistema Orun.** O mesmo núcleo de agentes e prompts alimenta as versões mobile, TV, segurança e demais satélites.

---

## ✨ Principais Recursos

- 🤖 **18 agentes de IA** com personas especializadas (Hampton, Developer, Nutritionist, Personal Trainer, e mais)
- 🧠 **IA multi-provider**: Ollama (local), Claude, OpenAI, OpenRouter, Groq e GitHub Models — alternáveis a qualquer momento
- 🗣️ **Sistema de voz completo**: TTS em 7 engines (cloud + local) e reconhecimento de fala
- ✉️ **Integrações**: WhatsApp, Telegram e Discord
- 🔧 **Automação n8n**: conector para workflows e gatilhos autônomos (beta)
- 🗓️ **Agendamentos diários**: agentes rodam automaticamente e entregam por notificação/WhatsApp
- 💾 **Persistência local**: conversas salvas em SQLite, API keys criptografadas no keychain do SO
- 📦 **Instaladores reais**: Windows `.exe`, macOS `.dmg` e Linux `.AppImage` via CI (GitHub Actions)
- 🎨 **Interface dark/cyberpunk** com tela de boot em vídeo

---

## 🧪 Stack Tecnológica

| Camada | Tecnologias |
| ------ | ----------- |
| **Interface** | React 18, TypeScript, Tailwind CSS, Vite |
| **Desktop** | Electron 31, electron-builder, electron-updater |
| **IA** | Ollama, OpenAI, Claude, OpenRouter, Groq, GitHub Models |
| **Dados** | SQLite (better-sqlite3), Supabase |
| **Integrações** | WhatsApp (Baileys), Telegram, Discord, n8n |
| **Voz** | ElevenLabs, Google Cloud TTS, Azure, XTTS v2, Piper, Bark, F5-TTS |

---

## 🗂️ Estrutura

```
orun_project/
├── electron/          # Processo principal: main, preload, routers de IA/TTS, integrações
│   └── __tests__/     # Testes unitários (vitest)
├── src/app/           # Frontend React
├── plugins/           # Sistema de plugins
├── supabase/          # Migrations e config do banco compartilhado
├── docs/              # Documentação
├── skills/            # Skills dos agentes
└── docker/            # Serviços auxiliares
```

---

## 🚦 Como Rodar

```bash
npm install              # instala dependências
npm run electron:dev     # rodar em desenvolvimento (hot reload)
npm run dist             # gerar instalador
npm test                 # rodar a suíte de testes
```

---

## 📦 Ecossistema Orun

Orun OS é a base de um ecossistema maior de aplicações interligadas que compartilham o mesmo núcleo:

- 📱 **[Orun OS Mobile](https://github.com/caiqueDeOliveira-dev/OrunOs-Mobile)** — versão mobile (React Native/Expo)
- 🛡️ **[OrunShield](https://github.com/caiqueDeOliveira-dev/OrunShield)** — suite de segurança e otimização
- 🧩 **[OrunVS](https://github.com/caiqueDeOliveira-dev/OrunVS)** — extensão VS Code com IA
- 🎵 **[Orun Música](https://github.com/caiqueDeOliveira-dev/orun-music-player)** — player de música desktop
- ⚙️ **[Orun-Core](https://github.com/caiqueDeOliveira-dev/Orun-Core)** — núcleo compartilhado do ecossistema

---

## 📄 Licença

Veja o arquivo [LICENSE](./orun_project/LICENSE) e o [EULA](./orun_project/EULA.md).
