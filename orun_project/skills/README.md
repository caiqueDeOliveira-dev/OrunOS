# Orun OS — Sistema de Skills dos Agentes

Cada agente do Orun OS pode ter uma pasta `skills/<agente>/SKILL.md` que é **auto-injetada
no system prompt** do agente (ver `electron/agent-prompts.cjs`). Skill ≠ prompt de persona:
a persona vive em `agent-prompts.cjs`; a skill é o **conhecimento operacional + workflow**
que deixa o agente no nível "elite".

## Estrutura

```
skills/
  README.md
  developer/SKILL.md            # o nome da pasta mapeia o agentId (lowercase, sem espaços)
  personal-assistant/SKILL.md
  ...
```

Mapeamento: `agentId` → pasta (lowercase, espaços viram `-`). Ex.: `Personal Assistant` → `personal-assistant`.

## Formato do SKILL.md

Use markdown simples. Seções recomendadas (as que fizerem sentido para o agente):

```markdown
# Nome da Skill

<!-- o que essa skill desbloqueia / quando usar -->

## Objetivo
<!-- 1 parágrafo: o que o agente DEVE fazer com esta skill -->

## Workflow (passo a passo)
<!-- sequência de execução com checklists -->

## Regras de ouro
<!-- o que nunca pode fazer / invariantes -->

## Checklist de qualidade
<!-- critérios objetivos para "entregar bem" -->

## Referência rápida
<!-- fórmulas, tabelas, prompts prontos, JSON de saída -->
```

## Regras

1. **Seja operacional**: priorize "como fazer" (passos, checklists, fórmulas) sobre teoria.
2. **pt-BR**: escreva em português do Brasil — o agente responde em pt-BR.
3. **Concreto**: números, exemplos e formatos JSON valem mais que adjetivos.
4. **Sem persona**: identidade/estilo de resposta ficam no prompt; a skill carrega conhecimento.
5. **Cache**: o conteúdo é lido do disco e cacheado; edite o arquivo e use a ação de recarregar
   skills (ou reinicie o app) para valer.

## Como funciona a injeção

`agent-prompts.cjs` monta o prompt como:
`persona + PT_BR_SUFFIX + SECURITY + "---SKILL---\n" + skills/<agente>/SKILL.md`

A skill entra **depois** da persona, então pode referenciar o contexto sem conflitar.
