// Script para extrair erros e warnings do relatório ESLint (formato JSON)
// Uso: node scripts/parse_lint.cjs <arquivo-json>
const fs = require('fs');

const inputFile = process.argv[2] || 'tmp_lint_output.json';
const data = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

const errors = [];
const warnings = [];

for (const file of data) {
  const shortPath = file.filePath.replace(/\\/g, '/').split('/src/')[1] || file.filePath;
  for (const m of file.messages) {
    const loc = `${m.line}:${m.column ?? 0}`;
    const entry = { file: shortPath, loc, rule: m.ruleId || '(parse error)', msg: m.message };
    if (m.severity === 2) errors.push(entry);
    else if (m.severity === 1) warnings.push(entry);
  }
}

const byRule = (arr) => {
  const map = {};
  for (const e of arr) {
    const k = e.rule;
    map[k] = (map[k] || 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
};

const byFile = (arr) => {
  const map = {};
  for (const e of arr) {
    const k = e.file;
    map[k] = (map[k] || 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
};

const out = {
  resumo: {
    totalErros: errors.length,
    totalWarnings: warnings.length,
  },
  errosPorRegra: byRule(errors),
  errosPorArquivo: byFile(errors),
  warningsPorRegra: byRule(warnings),
  warningsPorArquivo: byFile(warnings),
  erros: errors,
  warnings: warnings,
};

fs.writeFileSync('lint-report-simplificado.json', JSON.stringify(out, null, 2));
console.log(`=== RESUMO ===`);
console.log(`Erros: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log('');
console.log(`=== ERROS POR REGRA ===`);
for (const [r, n] of byRule(errors)) console.log(`  ${String(n).padStart(3)}  ${r}`);
console.log('');
console.log(`=== ERROS POR ARQUIVO ===`);
for (const [f, n] of byFile(errors)) console.log(`  ${String(n).padStart(3)}  ${f}`);
console.log('');
console.log(`=== WARNINGS POR REGRA (top 15) ===`);
for (const [r, n] of byRule(warnings).slice(0, 15)) console.log(`  ${String(n).padStart(3)}  ${r}`);
console.log('');
console.log('Arquivo detalhado gerado: lint-report-simplificado.json');
