// electron/vehicle-profile.cjs
//
// Perfil determinístico de veículo por usuário — anti-loop do agente Automotive.
// Extrai marca/modelo/ano do texto do usuário, persiste no SQLite e gera um
// bloco de contexto injetado no system prompt, para o LLM nunca precisar
// re-perguntar o que já foi informado.

const VEHICLE_KEYWORDS = [
  "carro", "veiculo", "veículo", "moto", "motocicleta", "caminhao", "caminhão",
  "camionete", "camioneta", "picape", "pickup", "suv", "sedan", "hatch",
  "garagem", "placa", "detran", "ipva", "licenciamento", "multa", "peca", "peça",
  "revisao", "revisão", "mecanic", "mecânico", "oficina", "oleo", "óleo",
  "trocar de carro", "comprar um carro", "comprar uma moto", "freio", "pneu",
  "motor", "embreagem", "cambio", "câmbio", "suspensao", "suspensão",
];

const BRANDS = [
  "honda", "toyota", "chevrolet", "chevy", "ford", "volkswagen", "vw",
  "fiat", "renault", "hyundai", "kia", "nissan", "mercedes", "bmw", "audi",
  "peugeot", "citroen", "jeep", "suzuki", "mitsubishi", "mazda", "subaru",
  "chery", "jac", "haval", "gwm", "porsche", "volvo", "mini", "dodge",
  "foton", "ram", "land rover", "triton", "amarok", "ranger",
];

const MODELS = [
  // Toyota
  "corolla cross", "corolla", "yaris", "camry", "hilux", "sw4", "etios", "supra",
  // Honda
  "civic", "city", "fit", "hrv", "crv", "wr-v", "wrv",
  // VW
  "gol", "polo", "virtus", "jetta", "taos", "saveiro", "t-cross", "tcross",
  "nivus", "up", "fox", "golf", "voyage", "passat", "amarok", "tiguan", "crafter",
  // GM
  "onix", "onix plus", "cruze", "tracker", "s10", "montana", "spin", "prisma",
  "celta", "corsa", "agile", "zafira", "captiva", "blazer", "camaro", "astra",
  // Fiat
  "uno", "mobi", "argo", "cronos", "pulse", "toro", "strada", "palio", "siena",
  "fiorino", "idea", "bravo", "ducato", "fastback",
  // Renault
  "kwid", "sandero", "logan", "duster", "clio", "captur", "megane", "sentra",
  // Hyundai / Kia
  "hb20", "hb20s", "creta", "tucson", "ix35", "elantra", "creta", "sportage",
  "seltos", "cerato", "picanto", "soul", "ka", "kicks",
  // Nissan
  "frontier", "kicks", "versa", "sentra", "march",
  // Ford
  "ecosport", "ka", "fiesta", "focus", "fusion", "ranger", "maverick", "mustang", "edge", "territory",
  // Jeep / RAM / Chrysler
  "compass", "renegade", "wrangler", "cherokee", "ram 2500", "ram 1500", "ram", "toro", "ranger",
  // Outros
  "suzuki jimny", "jimny", "vitara", "sx4", "l200", "triton", "outlander", "asx",
  "ds7", "bmw x1", "bmw x3", "bmw x5", "bmw 320i", "audi q3", "audi q5", "a3",
  "a4", "mercedes a200", "cla 200", "gla", "glc", "mini cooper", "porsche macan",
  "cayenne", "911", "volvo xc40", "xc60", "mitsubishi l200", "chery tiggo",
  "tiggo 5x", "tiggo 7", "tiggo 8", "haval h6", "gwm poer", "peter", "silverado",
];

function normalize(t) {
  return String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.,;:!?()\[\]{}\"']/g, " ").replace(/\s+/g, " ").trim();
}

function hasVehicleContext(text) {
  const n = normalize(text);
  return VEHICLE_KEYWORDS.some((k) => n.includes(k));
}

/**
 * Extrai marca/modelo/ano de uma mensagem. Só retorna campos que dá pra
 * afirmar com confiança. Exige contexto veicular (keyword OU marca/modelo).
 */
function extractVehicleInfo(text) {
  if (!text) return null;
  const n = normalize(text);
  const found = {};

  const yearMatch = n.match(/\b(19[6-9]\d|20[0-2]\d)\b/);
  if (yearMatch && hasVehicleContext(text)) found.year = parseInt(yearMatch[1], 10);

  for (const brand of BRANDS) {
    if (n.includes(brand)) { found.brand = titleCase(brand); break; }
  }

  for (const model of MODELS) {
    if (n.includes(model)) { found.model = titleCase(model); break; }
  }

  const confidence =
    (found.year ? 1 : 0) + (found.brand ? 1 : 0) + (found.model ? 1 : 0);

  if (confidence >= 2 || (confidence === 1 && (found.brand || found.model) && hasVehicleContext(text))) {
    return found;
  }
  return null;
}

function titleCase(s) {
  return s.split(/\s+/).map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(" ");
}

function getVehicleProfile(db, userId) {
  if (!db || !userId) return {};
  try {
    const profiles = db.getSetting("vehicleProfiles", {});
    return profiles[userId] || {};
  } catch {
    return {};
  }
}

/**
 * Persiste campos que ainda faltam (não sobrescreve dados já conhecidos).
 */
function saveVehicleInfo(db, userId, info) {
  if (!db || !userId || !info) return;
  try {
    const profiles = db.getSetting("vehicleProfiles", {});
    const current = profiles[userId] || {};
    const next = { ...current };
    if (info.year && !next.year) next.year = info.year;
    if (info.brand && !next.brand) next.brand = info.brand;
    if (info.model && !next.model) next.model = info.model;
    next.updatedAt = Date.now();
    profiles[userId] = next;
    db.setSetting("vehicleProfiles", profiles);
  } catch {
    /* best-effort */
  }
}

function describeProfile(profile) {
  if (!profile) return "";
  return [profile.year, profile.brand, profile.model].filter(Boolean).join(" ");
}

/**
 * Bloco de contexto injetado no system prompt. Ex.:
 * VEÍCULO DO USUÁRIO: 2019 Honda Civic
 */
function buildVehicleContext(db, userId) {
  const desc = describeProfile(getVehicleProfile(db, userId));
  if (!desc) return "";
  return `\n\nVEÍCULO DO USUÁRIO: ${desc}\n(Perto de ser verdade — o usuário já informou isso. NUNCA pergunte o ano/modelo de novo.)`;
}

module.exports = {
  extractVehicleInfo,
  getVehicleProfile,
  saveVehicleInfo,
  buildVehicleContext,
  describeProfile,
  BRANDS,
  MODELS,
};