# Integração Obsidian no Orun OS (Ideia Futura)

> **Status:** Adiada / não implementada
> **Motivo do adiamento:** o usuário ainda **não usa Obsidian**.
> **Quando retomar:** quando o usuário adotar Obsidian como ferramenta de notas (PKM) e quiser dar memória de longo prazo aos agentes do Orun.
> **Última revisão:** 2026-08-01

---

## 1. O que é (contexto)

**`obsidian-skills`** é o repositório **oficial** de Steph Ango (**kepano**, CEO do Obsidian), MIT, 35k+ estrelas no GitHub (https://github.com/kepano/obsidian-skills).

São 5 arquivos `SKILL.md` que ensinam agentes de IA a trabalhar com o formato do Obsidian, seguindo o padrão **Agent Skills** (mesma especificação que o opencode/Claude Code/Codex usam):

| Skill | O que ensina | Prioridade |
|---|---|---|
| `obsidian-markdown` | Sintaxe do Obsidian: `[[wikilinks]]`, callouts `> [!note]`, embeds `![[file]]`, frontmatter YAML, tags, hierarquia | **Alta** (fundação) |
| `obsidian-bases` | Criar/manter Bases (.base) — banco de dados sobre notas com propriedades/filtros/views | Média |
| `json-canvas` | Gerar arquivos `.canvas` válidos (JSON Canvas — nodes, edges, groups) | Média |
| `obsidian-cli` | Controlar o vault pelo terminal (abrir notas/vaults, plugins, automação) | Baixa |
| `defuddle` | Extrair página web → Markdown limpo para importar no vault | Baixa |

**Por que existe:** sem essas regras, os modelos erram a sintaxe do Obsidian (escrevem markdown "comum" que quebra no vault, wikilinks que não resolvem, callouts como texto puro, canvas inválidos). A skill ensina o agente a produzir conteúdo correto de primeira.

---

## 2. Por que integrar no Orun OS

O objetivo é transformar o vault Obsidian do usuário na **memória de longo prazo / segundo cérebro** dos agentes do Orun:

- `"Orun, busque no meu Obsidian sobre o projeto X"` → agente procura notas por nome/conteúdo/tags.
- `"Orun, anote isso na minha base"` → agente cria/edita notas com frontmatter e wikilinks corretos.
- Vault vira um **workspace especial** de conhecimento, além do workspace de código (`Desktop\hello`).
- Com `obsidian-bases`, dá pra virar "CRM", "tracker de projetos", etc., tudo em markdown editável pelo usuário.

**O que o Orun JÁ tem (90% da infra):**
- Tools de arquivo no Electron (`readFile`, `writeFile`, `editFile`, `listFiles`, `searchFiles`, `searchContent` em `electron/tools.cjs`) que resolvem caminhos relativos contra um workspace configurável.
- Sistema de agentes com prompts próprios (`electron/agent-prompts.cjs`) + system prompt central (`electron/main.cjs` → `buildSystemPrompt`).
- Seletor de workspace / Developer IDE.

---

## 3. Caminho de implementação sugerido (faseado)

### Fase 1 — Acesso ao vault como workspace (essencial)
1. Permitir apontar o caminho do vault Obsidian (ex.: setting nova `obsidianVaultPath` no DB, configurável em **Configurações**).
2. Reutilizar `getWorkspaceDir()`/`resolveAgentPath()` para o agente ler/escrever dentro do vault.
3. Agente (ex.: novo agente "Memória" ou o Assistente) ganha tools de **busca** por nome/conteúdo/tag e **criação** de notas.

### Fase 2 — Corretude de sintaxe (essencial)
4. Injetar as regras do **`obsidian-markdown`** no prompt do(s) agente(s) que acessam o vault (em `buildSystemPrompt` ou `agent-prompts.cjs`), de forma condicional (só quando o vault estiver configurado).
5. Regras-chave a embutir:
   - Links internos: `[[Título da Nota]]`
   - Embeds: `![[imagem.png]]`
   - Callouts: `> [!note]`, `> [!warning]`, `> [!tip]`
   - Frontmatter YAML com propriedades tipadas (`date:`, `tags:`, campos custom)
   - Tags aninhadas e hierarquia de pastas

### Fase 3 — Avançado (opcional)
6. `obsidian-bases`: agente gera/mantém `.base` (CRMs, trackers, dashboards).
7. `json-canvas`: agente cria whiteboards visuais (arquitetura, mapas mentais).
8. `defuddle`: agente baixa página web e importa como nota limpa.
9. `obsidian-cli`: só se quiser que o agente controle o app Obsidian (abrir vaults, plugins) — requer o `obsidian-cli` instalado no sistema.

---

## 4. Decisões / cuidados

- **Privacidade:** o vault é dado pessoal — acesso deve ser **explícito** (setting ativada pelo usuário), nunca implícito. Sem telemetria/envio desnecessário (o Orun já usa LLM em nuvem; deixar claro que o conteúdo do vault passa pelo provider configurado).
- **Formato de implementação:** o Orun NÃO tem sistema de "skills" hoje (os agentes usam prompts). Duas opções:
  - (a) Rápido: injetar as regras como texto no system prompt (estilo do que já é feito em `buildSystemPrompt`).
  - (b) Robusto: criar um mini-sistema de skills/plugins no Orun e carregar os `SKILL.md` por agente. Vale avaliar quando houver mais de 1-2 skills.
- **Não copiar tudo:** `obsidian-markdown` é o único essencial; os outros são incrementais.
- **Licença:** MIT — sem restrição de uso, mas manter atribuição.

---

## 5. Referências

- Repo oficial: https://github.com/kepano/obsidian-skills
- Spec Agent Skills: https://github.com/anthropics/skills
- CLI do Obsidian (para a skill `obsidian-cli`): https://github.com/Yakitrak/obsidian-cli
- JSON Canvas spec: https://jsoncanvas.org/
