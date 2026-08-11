// electron/pdf-inspector.cjs
// Inspeção de PDF em Node puro (sem dependências): classificação escaneado-vs-texto
// e extração básica de texto. Espelha as heurísticas do firecrawl/pdf-inspector (Rust)
// sem exigir toolchain Rust/CLI. Melhor resultado em PDFs não-comprimidos ou
// FlateDecode (inflados via zlib nativo); streams comprimidos com outros filtros
// (DCTDecode, LZW, JBIG2...) não são decodificados — a classificação segue heurística.
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const MAX_STREAM_INFLATE_BYTES = 8 * 1024 * 1024;
const MAX_FILE_BYTES = 64 * 1024 * 1024;

function decodeLiteral(s) {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\([()\\])/g, "$1")
    .replace(/\\\d{1,3}/g, (m) => String.fromCharCode(parseInt(m.slice(1), 8)));
}

function extractTextFromContent(str) {
  const parts = [];
  const reTj = /\(((?:\\.|[^()\\])*)\)\s*Tj\b/g;
  let m;
  while ((m = reTj.exec(str))) parts.push(decodeLiteral(m[1]));
  const reTJ = /\[((?:\[[^\]]*\]|\((?:\\.|[^()\\])*\)|\s|[-\d.])*)\]\s*TJ\b/g;
  while ((m = reTJ.exec(str))) {
    const litRe = /\(((?:\\.|[^()\\])*)\)/g;
    let l;
    while ((l = litRe.exec(m[1]))) parts.push(decodeLiteral(l[1]));
  }
  return parts.join("");
}

function countTextOps(str) {
  let n = 0;
  n += (str.match(/\)\s*Tj\b/g) || []).length;
  n += (str.match(/\]\s*TJ\b/g) || []).length;
  return n;
}

function looksLikeContent(str) {
  return /\b(BT|ET|Tf|Td|Tm|T\*|Tj|TJ|Do|cm|q|Q)\b/.test(str);
}

function tryInflate(buf) {
  try { return zlib.inflateSync(buf); } catch {}
  try { return zlib.inflateRawSync(buf); } catch {}
  try { return zlib.gunzipSync(buf); } catch {}
  return null;
}

function findStreams(raw) {
  const streams = [];
  const re = /(?:^|\n)stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let m;
  while ((m = re.exec(raw))) {
    const before = raw.slice(0, m.index);
    const tail = before.slice(Math.max(0, before.lastIndexOf("endobj")), before.length);
    streams.push({ content: m[1], flate: /\/FlateDecode\b/.test(tail) });
  }
  return streams;
}

function readRaw(filePath) {
  const buf = fs.readFileSync(filePath);
  if (!buf.slice(0, 5).toString("latin1").startsWith("%PDF-")) {
    return { error: "Not a PDF file (missing %PDF- header)" };
  }
  if (buf.length > MAX_FILE_BYTES) return { error: "PDF too large to inspect" };
  return { raw: buf.toString("latin1"), sizeBytes: buf.length };
}

function inspectPdf(filePath, opts = {}) {
  let res;
  try {
    res = readRaw(filePath);
  } catch (err) {
    return { ok: false, error: `Cannot read PDF: ${err.message || err}` };
  }
  if (res.error) return { ok: false, error: res.error };
  const { raw, sizeBytes } = res;

  let textOps = 0;
  const extractedParts = [];

  for (const s of findStreams(raw)) {
    let contentStr = s.content;
    if (s.flate && s.content.length <= MAX_STREAM_INFLATE_BYTES) {
      const out = tryInflate(Buffer.from(s.content, "latin1"));
      if (out) contentStr = out.toString("latin1");
    }
    if (looksLikeContent(contentStr)) {
      textOps += countTextOps(contentStr);
      const t = extractTextFromContent(contentStr);
      if (t) extractedParts.push(t);
    }
  }

  // Fallback: streams inline não-envolvidos em "stream"/"endstream" (PDFs antigos).
  if (textOps === 0) textOps = countTextOps(raw);

  const pages = (raw.match(/\/MediaBox\b/g) || []).length;
  const imageCount = (raw.match(/\/Subtype\s*\/Image\b/g) || []).length;
  const fontCount = (raw.match(/\/BaseFont\b/g) || []).length;

  let classification;
  if (textOps > 0 && imageCount === 0) classification = "text";
  else if (textOps > 0 && imageCount > 0) classification = "mixed";
  else if (textOps === 0 && imageCount > 0) classification = "scanned";
  else classification = "unknown";

  const text = extractedParts.join("\n").replace(/\s+/g, " ").trim();

  return {
    ok: true,
    path: path.resolve(filePath),
    sizeBytes,
    pages: pages || 1,
    imageCount,
    fontCount,
    textOps,
    hasTextLayer: textOps > 0,
    classification,
    textPreview: text.slice(0, opts.previewLength || 400) || "",
    extractedChars: text.length,
  };
}

function extractPdfText(filePath, opts = {}) {
  let res;
  try {
    res = readRaw(filePath);
  } catch (err) {
    return { ok: false, error: `Cannot read PDF: ${err.message || err}` };
  }
  if (res.error) return { ok: false, error: res.error };
  const { raw } = res;

  const parts = [];
  for (const s of findStreams(raw)) {
    let contentStr = s.content;
    if (s.flate && s.content.length <= MAX_STREAM_INFLATE_BYTES) {
      const out = tryInflate(Buffer.from(s.content, "latin1"));
      if (out) contentStr = out.toString("latin1");
    }
    if (looksLikeContent(contentStr)) {
      const t = extractTextFromContent(contentStr);
      if (t) parts.push(t);
    }
  }
  let text = parts.join("\n").replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
  if (opts.limit && text.length > opts.limit) text = text.slice(0, opts.limit);
  return { ok: true, text, chars: text.length };
}

module.exports = {
  inspectPdf,
  extractPdfText,
  decodeLiteral,
  extractTextFromContent,
  countTextOps,
  findStreams,
};
