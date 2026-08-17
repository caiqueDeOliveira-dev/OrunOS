"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compressToolOutput = compressToolOutput;
const DIFF_HEADER = /^diff --git|^index [0-9a-f]{7}\.\.[0-9a-f]{7}|^--- |^\+\+\+ /;
const HUNK_HEADER = /^@@ .* @@/;
/** git diff / patch — mantém hunks inteiros (já são o "importante"), colapsa contexto repetido entre hunks distantes. */
function compressDiff(content) {
    const lines = content.split("\n");
    const out = [];
    let inHunk = false;
    let unchangedRun = 0;
    const MAX_UNCHANGED_CONTEXT = 3;
    for (const line of lines) {
        if (DIFF_HEADER.test(line)) {
            out.push(line);
            continue;
        }
        if (HUNK_HEADER.test(line)) {
            inHunk = true;
            unchangedRun = 0;
            out.push(line);
            continue;
        }
        const isChange = line.startsWith("+") || line.startsWith("-");
        if (isChange) {
            unchangedRun = 0;
            out.push(line);
            continue;
        }
        // linha de contexto (não muda) — só mantém as primeiras N seguidas
        if (inHunk) {
            unchangedRun += 1;
            if (unchangedRun <= MAX_UNCHANGED_CONTEXT)
                out.push(line);
            else if (unchangedRun === MAX_UNCHANGED_CONTEXT + 1)
                out.push("  ⋮ (contexto omitido)");
            continue;
        }
        out.push(line);
    }
    return out.join("\n");
}
/** saída de `ls`/`tree`/`find` — muitas linhas curtas e parecidas, mantém início+fim. */
function compressFileListing(content) {
    const lines = content.split("\n").filter((l) => l.length > 0);
    const MAX_LINES = 40;
    if (lines.length <= MAX_LINES)
        return content;
    const head = lines.slice(0, 25);
    const tail = lines.slice(-10);
    const omitted = lines.length - head.length - tail.length;
    return [...head, `… ${omitted} entrada(s) omitida(s) …`, ...tail].join("\n");
}
/** saída de `grep -r`, tipicamente `arquivo:linha:conteúdo` repetido — agrupa por arquivo, limita ocorrências por arquivo. */
function compressGrepOutput(content) {
    const lines = content.split("\n").filter((l) => l.length > 0);
    const byFile = new Map();
    const MAX_PER_FILE = 5;
    for (const line of lines) {
        const match = /^([^:]+):(\d+):(.*)$/.exec(line);
        if (!match) {
            byFile.set("__unmatched__", [...(byFile.get("__unmatched__") ?? []), line]);
            continue;
        }
        const [, file] = match;
        const arr = byFile.get(file) ?? [];
        if (arr.length < MAX_PER_FILE)
            arr.push(line);
        byFile.set(file, arr);
    }
    const out = [];
    for (const [file, fileLines] of byFile) {
        out.push(...fileLines);
        if (file !== "__unmatched__") {
            const totalForFile = lines.filter((l) => l.startsWith(`${file}:`)).length;
            if (totalForFile > MAX_PER_FILE)
                out.push(`  … +${totalForFile - MAX_PER_FILE} ocorrência(s) em ${file}`);
        }
    }
    return out.join("\n");
}
/** fallback genérico: texto grande sem padrão reconhecido — corta o meio, preserva início/fim. */
function compressGeneric(content, maxChars) {
    if (content.length <= maxChars)
        return content;
    const headChars = Math.floor(maxChars * 0.6);
    const tailChars = maxChars - headChars;
    const omitted = content.length - headChars - tailChars;
    return `${content.slice(0, headChars)}\n… ${omitted} caractere(s) omitido(s) …\n${content.slice(-tailChars)}`;
}
const DEFAULT_OPTIONS = {
    genericMaxChars: 3000,
    minCharsToConsider: 800, // abaixo disso não vale a pena comprimir
};
/**
 * Detecta o "tipo" de conteúdo (diff/tree/grep/genérico) por heurística simples
 * e aplica a compressão adequada. Sempre idempotente e nunca corta informação
 * "no meio de uma palavra" de forma perigosa — só reduz volume de contexto
 * repetitivo, nunca o conteúdo que provavelmente importa (as próprias mudanças).
 */
function compressToolOutput(content, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const originalChars = content.length;
    if (originalChars < opts.minCharsToConsider) {
        return { content, originalChars, compressedChars: originalChars, kind: "unchanged" };
    }
    let kind = "generic";
    let compressed;
    if (/^diff --git|^@@ /m.test(content)) {
        kind = "diff";
        compressed = compressDiff(content);
    }
    else if (/^([^:\n]+):(\d+):/m.test(content) && content.split("\n").length > 10) {
        kind = "grep";
        compressed = compressGrepOutput(content);
    }
    else if (content.split("\n").filter((l) => l.trim().length > 0).length > 40 && !/\s{2,}\S/.test(content.slice(0, 200))) {
        kind = "tree";
        compressed = compressFileListing(content);
    }
    else {
        compressed = compressGeneric(content, opts.genericMaxChars);
    }
    return { content: compressed, originalChars, compressedChars: compressed.length, kind };
}
//# sourceMappingURL=compressor.js.map