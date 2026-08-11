const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const pdf = require("../pdf-inspector.cjs");

function writeTmp(name, buf) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pdfinsp-"));
  const p = path.join(dir, name);
  fs.writeFileSync(p, buf);
  return p;
}

function textPdf(text = "Relatorio Juridico Orun") {
  const content = `BT
/F1 12 Tf
72 720 Td
(${text}) Tj
ET`;
  return Buffer.from(
    `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${content.length} >>
stream
${content}
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF
`,
    "latin1"
  );
}

function compressedTextPdf() {
  const content = Buffer.from(
    `BT
/F1 12 Tf
72 720 Td
(Texto Comprimido Flate) Tj
ET`,
    "latin1"
  );
  const c = zlib.deflateSync(content);
  const head = Buffer.from(
    `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Filter /FlateDecode /Length ${c.length} >>
stream
`,
    "latin1"
  );
  const tail = Buffer.from(
    `\nendstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF
`,
    "latin1"
  );
  return Buffer.concat([head, c, tail]);
}

function scannedPdf() {
  const img = Buffer.from("xxxxxxxx", "latin1");
  return Buffer.from(
    `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /XObject /Subtype /Image /Width 8 /Height 8 /ColorSpace /DeviceGray /BitsPerComponent 8 /Length 8 >>
stream
${img}
endstream
endobj
5 0 obj
<< /Length 0 >>
stream
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF
`,
    "latin1"
  );
}

describe("pdf-inspector", () => {
  it("classifies a text-based PDF as text with a text layer", () => {
    const p = writeTmp("text.pdf", textPdf());
    const r = pdf.inspectPdf(p);
    expect(r.ok).toBe(true);
    expect(r.classification).toBe("text");
    expect(r.hasTextLayer).toBe(true);
    expect(r.pages).toBe(1);
    expect(r.imageCount).toBe(0);
    expect(r.fontCount).toBe(1);
    expect(r.textPreview).toContain("Relatorio Juridico Orun");
    expect(r.textOps).toBeGreaterThan(0);
  });

  it("extracts text from an uncompressed PDF", () => {
    const p = writeTmp("text.pdf", textPdf());
    const r = pdf.extractPdfText(p);
    expect(r.ok).toBe(true);
    expect(r.text).toContain("Relatorio Juridico Orun");
    expect(r.chars).toBeGreaterThan(0);
  });

  it("inflates FlateDecode streams and extracts text", () => {
    const p = writeTmp("compressed.pdf", compressedTextPdf());
    const info = pdf.inspectPdf(p);
    expect(info.ok).toBe(true);
    expect(info.classification).toBe("text");
    expect(info.hasTextLayer).toBe(true);
    const r = pdf.extractPdfText(p);
    expect(r.text).toContain("Texto Comprimido Flate");
  });

  it("classifies an image-only PDF as scanned without text layer", () => {
    const p = writeTmp("scanned.pdf", scannedPdf());
    const info = pdf.inspectPdf(p);
    expect(info.ok).toBe(true);
    expect(info.classification).toBe("scanned");
    expect(info.hasTextLayer).toBe(false);
    expect(info.imageCount).toBeGreaterThan(0);
    const r = pdf.extractPdfText(p);
    expect(r.text).toBe("");
  });

  it("decodes PDF string literals with escapes", () => {
    expect(pdf.decodeLiteral("a\\(b\\)c")).toBe("a(b)c");
    expect(pdf.decodeLiteral("\\n novo")).toBe("\n novo");
    expect(pdf.decodeLiteral("a\\\\b")).toBe("a\\b");
  });

  it("extracts text from Tj and TJ array operators", () => {
    const content = `BT
/F1 12 Tf
72 720 Td
(Hello) Tj
0 -14 Td
[(World) 3 (!) ] TJ
ET`;
    expect(pdf.extractTextFromContent(content)).toContain("Hello");
    expect(pdf.extractTextFromContent(content)).toContain("World");
  });

  it("returns an error for a missing file", () => {
    const r = pdf.inspectPdf(path.join(os.tmpdir(), "nao-existe-123.pdf"));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Cannot read PDF/);
  });

  it("returns an error for a non-PDF file", () => {
    const p = writeTmp("fake.pdf", Buffer.from("<!DOCTYPE html>..."));
    const r = pdf.inspectPdf(p);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Not a PDF/);
  });
});
