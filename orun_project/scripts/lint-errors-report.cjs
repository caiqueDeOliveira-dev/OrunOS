#!/usr/bin/env node
/**
 * lint-errors-report.cjs
 * ======================
 * Script de diagnóstico completo do ESLint para o Orun OS.
 *
 * O que ele faz:
 *   1. Roda o ESLint em src/ e captura a saída em formato JSON.
 *   2. Processa todos os erros e warnings.
 *   3. Exibe no terminal a lista completa dos ERROS (arquivo, linha, regra, mensagem).
 *   4. Gera um relatório Markdown detalhado (lint-errors-report.md).
 *   5. Gera um JSON simplificado (lint-report-simplificado.json).
 *
 * Uso:
 *   node scripts/lint-errors-report.cjs
 *
 * Opções:
 *   --skip-run   usa um tmp_lint_output.json já existente (não roda o eslint de novo)
 *   --only-errors  mostra só os erros no terminal (esconde warnings por arquivo)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const JSON_OUT = path.join(ROOT, 'tmp_lint_output.json');
const MD_OUT = path.join(ROOT, 'lint-errors-report.md');
const SIMPLE_OUT = path.join(ROOT, 'lint-report-simplificado.json');
const TARGET = 'src/';

const args = process.argv.slice(2);
const skipRun = args.includes('--skip-run');
const onlyErrors = args.includes('--only-errors');

// ---------------------------------------------------------------------------
// 1) Rodar o ESLint (ou reaproveitar JSON)
// ---------------------------------------------------------------------------
console.log('🔎 1/4 Rodando ESLint...');
if (!skipRun) {
  try {
    execSync(`npx eslint ${TARGET} -f json -o "${JSON_OUT}"`, {
      cwd: ROOT,
      stdio: ['ignore', 'ignore', 'inherit'],
      // eslint retorna exit code 1 quando há erros — isso é esperado
    });
  } catch (e) {
    // exit 1 é o comportamento normal com erros de lint
  }
  console.log('   ESLint concluído.');
} else {
  console.log('   Pulando execução (--skip-run), usando JSON existente.');
}

if (!fs.existsSync(JSON_OUT)) {
  console.error('❌ JSON do ESLint não encontrado. Rode sem --skip-run.');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(JSON_OUT, 'utf8'));

// ---------------------------------------------------------------------------
// 2) Processar dados
// ---------------------------------------------------------------------------
console.log('🧮 2/4 Processando resultados...');

const shortPath = (p) => {
  const norm = p.replace(/\\/g, '/');
  const idx = norm.indexOf('/src/');
  return idx >= 0 ? norm.slice(idx + 1) : norm;
};

const errors = [];
const warnings = [];
let parseErrors = 0;

for (const file of raw) {
  const fileShort = shortPath(file.filePath);
  for (const m of file.messages) {
    if (m.fatal) {
      parseErrors++;
      errors.push({
        file: fileShort,
        loc: `${m.line}:${m.column ?? 0}`,
        rule: '(fatal/parse)',
        msg: m.message,
      });
      continue;
    }
    const entry = {
      file: fileShort,
      loc: `${m.line}:${m.column ?? 0}`,
      rule: m.ruleId || '(unknown)',
      msg: m.message,
    };
    if (m.severity === 2) errors.push(entry);
    else if (m.severity === 1) warnings.push(entry);
  }
}

const groupBy = (arr, keyFn) => {
  const map = new Map();
  for (const e of arr) {
    const k = keyFn(e);
    map.set(k, (map.get(k) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
};

const errorsByRule = groupBy(errors, (e) => e.rule);
const errorsByFile = groupBy(errors, (e) => e.file);
const warningsByRule = groupBy(warnings, (e) => e.rule);

// ---------------------------------------------------------------------------
// 3) Imprimir no terminal
// ---------------------------------------------------------------------------
console.log('📋 3/4 Gerando relatório no terminal...\n');

console.log('='.repeat(72));
console.log('  RESUMO DO LINT — ORUN OS');
console.log('='.repeat(72));
console.log(`  Total de ERROS  : ${errors.length}`);
console.log(`  Total de WARNINGS: ${warnings.length}`);
console.log(`  Erros fatais    : ${parseErrors}`);
console.log('');

console.log('── ERROS POR REGRA ──');
for (const [rule, n] of errorsByRule) {
  console.log(`  ${String(n).padStart(3)}  ${rule}`);
}
console.log('');

console.log('── ERROS POR ARQUIVO ──');
for (const [file, n] of errorsByFile) {
  console.log(`  ${String(n).padStart(3)}  ${file}`);
}
console.log('');

console.log('── LISTA COMPLETA DOS ERROS ──');
const errByFileMap = new Map();
for (const e of errors) {
  if (!errByFileMap.has(e.file)) errByFileMap.set(e.file, []);
  errByFileMap.get(e.file).push(e);
}
let idx = 0;
for (const [file, list] of errByFileMap) {
  console.log(`\n📄 ${file}`);
  for (const e of list) {
    idx++;
    console.log(`   ${String(idx).padStart(3)}. ${e.loc}  [${e.rule}]`);
    console.log(`       ${e.msg}`);
  }
}
console.log('');

if (!onlyErrors) {
  console.log('── WARNINGS POR REGRA ──');
  for (const [rule, n] of warningsByRule) {
    console.log(`  ${String(n).padStart(3)}  ${rule}`);
  }
  console.log('');
  console.log('── WARNINGS POR ARQUIVO (top 15) ──');
  const wByFile = groupBy(warnings, (e) => e.file);
  for (const [file, n] of wByFile.slice(0, 15)) {
    console.log(`  ${String(n).padStart(3)}  ${file}`);
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// 4) Gerar relatórios em arquivo
// ---------------------------------------------------------------------------
console.log('💾 4/4 Salvando relatórios...');

// --- Markdown ---
const mdLines = [];
mdLines.push('# Relatório de Lint — Orun OS');
mdLines.push('');
mdLines.push('> Gerado automaticamente por `scripts/lint-errors-report.cjs` em ' + new Date().toISOString());
mdLines.push('');
mdLines.push('## Resumo');
mdLines.push('');
mdLines.push('| Métrica | Valor |');
mdLines.push('|---|---|');
mdLines.push('| **Erros** | ' + errors.length + ' |');
mdLines.push('| **Warnings** | ' + warnings.length + ' |');
mdLines.push('| **Erros fatais (parse)** | ' + parseErrors + ' |');
mdLines.push('');
mdLines.push('## Erros por regra');
mdLines.push('');
mdLines.push('| Regra | Qtd |');
mdLines.push('|---|---|');
for (const [r, n] of errorsByRule) mdLines.push('| `' + r + '` | ' + n + ' |');
mdLines.push('');
mdLines.push('## Erros por arquivo');
mdLines.push('');
mdLines.push('| Arquivo | Qtd |');
mdLines.push('|---|---|');
for (const [f, n] of errorsByFile) mdLines.push('| `' + f + '` | ' + n + ' |');
mdLines.push('');
mdLines.push('## Todos os erros');
mdLines.push('');
for (const [file, list] of errByFileMap) {
  mdLines.push('### `' + file + '`');
  mdLines.push('');
  for (const e of list) {
    mdLines.push('- **`' + e.loc + '`** — `' + e.rule + '` — ' + e.msg);
  }
  mdLines.push('');
}
mdLines.push('## Warnings por regra');
mdLines.push('');
mdLines.push('| Regra | Qtd |');
mdLines.push('|---|---|');
for (const [r, n] of warningsByRule) mdLines.push('| `' + r + '` | ' + n + ' |');
mdLines.push('');
mdLines.push('## Sugestões de correção prioritárias');
mdLines.push('');
const countByRule = (rule) => {
  const f = errorsByRule.find(([r]) => r === rule);
  return f ? f[1] : 0;
};
mdLines.push('1. **`no-empty` (' + countByRule('no-empty') + ')** — Blocos vazios `{}` em `if`/`catch`/`switch`. Substitua por um comentário (`// TODO`) ou lançamento de erro, ou adicione lógica real.');
mdLines.push('2. **`prefer-const` (' + countByRule('prefer-const') + ')** — Variáveis com `let` que nunca são reatribuídas devem usar `const`.');
mdLines.push('3. **`@typescript-eslint/no-unused-expressions` (' + countByRule('@typescript-eslint/no-unused-expressions') + ')** — Expressões sem efeito (provavelmente ternários usados como instrução).');
mdLines.push('4. **`no-useless-escape` (' + countByRule('no-useless-escape') + ')** — Escapes desnecessários em strings/regex.');
mdLines.push('5. **`@typescript-eslint/no-require-imports` (' + countByRule('@typescript-eslint/no-require-imports') + ')** — Troque `require()` por `import`.');
mdLines.push('');
mdLines.push('> **Dica:** rode `npx eslint src/ --fix` para corrigir automaticamente `prefer-const` e `no-useless-escape`.');
mdLines.push('');
const md = mdLines.join('\n');

fs.writeFileSync(MD_OUT, md, 'utf8');

// --- JSON simplificado ---
const simple = {
  geradoEm: new Date().toISOString(),
  resumo: {
    totalErros: errors.length,
    totalWarnings: warnings.length,
    errosFatais: parseErrors,
  },
  errosPorRegra: Object.fromEntries(errorsByRule),
  errosPorArquivo: Object.fromEntries(errorsByFile),
  warningsPorRegra: Object.fromEntries(warningsByRule),
  erros: errors,
  warnings,
};
fs.writeFileSync(SIMPLE_OUT, JSON.stringify(simple, null, 2), 'utf8');

console.log(`\n✅ Relatório Markdown : ${path.relative(ROOT, MD_OUT)}`);
console.log(`✅ Relatório JSON     : ${path.relative(ROOT, SIMPLE_OUT)}`);
console.log(`✅ Lint JSON bruto    : ${path.relative(ROOT, JSON_OUT)}`);
console.log('\nPara corrigir automaticamente: npx eslint src/ --fix');
