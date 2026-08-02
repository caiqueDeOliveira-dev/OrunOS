const MAX_TEXT_LENGTH = 2000;
const MAX_FILE_NAME_LENGTH = 100;

export function sanitizeText(text: string): string {
  if (typeof text !== "string") return "";
  return text
    .slice(0, MAX_TEXT_LENGTH)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<script\b[^>]*\/?>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/on\w+\s*=\s*[^\s>]+/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\0-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .trim();
}

export function sanitizeFileName(name: string): string {
  if (typeof name !== "string") return "";
  return name
    .slice(0, MAX_FILE_NAME_LENGTH)
    .replace(/\.\./g, "")
    .replace(/[/\\:<>"|?*]/g, "")
    .replace(/[\0-\x1F]/g, "")
    .trim();
}

export function sanitizeNumeric(value: string): string {
  if (typeof value !== "string") return "";
  return value.replace(/[^\d.]/g, "").replace(/^(\d*\.?)(\d*).*$/, "$1$2");
}
