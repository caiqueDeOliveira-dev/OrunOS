import { useState } from "react";
import type { BodyRegion, Symptom, SymptomIntensity } from "../health-types";
import { BODY_REGION_LABELS, INTENSITY_COLORS } from "../health-types";

interface RegionPathDef {
  id: BodyRegion;
  d: string;
  /** Regiões de trás (costas/lombar) — tom mais frio e translúcido. */
  back?: boolean;
  /** Se true, é espelhada para o outro lado do corpo. */
  mirrored?: boolean;
}

const HEAD = "M 99 10 C 111 10 117 17 117 29 C 117 41 112 49 103 53 C 101 54 99 54 97 53 C 88 49 83 41 83 29 C 83 17 89 10 99 10 Z";
const NECK = "M 92 52 L 108 52 L 110 63 L 90 63 Z";
const CHEST = "M 86 68 C 93 64 107 64 114 68 C 118 72 118 76 117 80 L 116 104 C 113 112 87 112 84 104 L 83 80 C 82 76 82 72 86 68 Z";
const UPPER_BACK = "M 76 66 C 70 82 68 98 72 112 L 128 112 C 132 98 130 82 124 66 C 116 61 84 61 76 66 Z";
const ABDOMEN = "M 84 106 C 92 112 108 112 116 106 L 116 150 C 112 156 88 156 84 150 L 84 106 Z";
const LOWER_BACK = "M 78 108 C 74 126 74 148 78 164 L 122 164 C 126 148 126 126 122 108 C 117 113 83 113 78 108 Z";
const HIP = "M 82 150 C 89 157 111 157 118 150 L 120 190 C 117 197 83 197 80 190 L 82 150 Z";

const SIDE_REGIONS: RegionPathDef[] = [
  { id: "left-shoulder", d: "M 89 63 C 82 67 75 72 69 80 C 65 85 61 91 60 97 C 59 101 62 104 66 102 C 72 98 78 92 83 85 C 86 81 88 76 89 70 Z", mirrored: true },
  { id: "left-bicep", d: "M 60 97 C 58 92 55 90 52 93 C 50 97 48 105 48 114 C 48 126 49 138 52 148 C 54 154 58 156 60 152 C 62 144 63 132 63 120 C 63 112 62 104 60 97 Z", mirrored: true },
  { id: "left-forearm", d: "M 52 148 C 50 156 49 164 49 172 C 49 180 50 186 52 190 C 54 194 57 195 59 192 C 61 186 62 178 62 170 C 62 162 61 154 60 148 C 57 145 54 145 52 148 Z", mirrored: true },
  { id: "left-hand", d: "M 46 190 C 43 194 43 199 46 202 C 49 205 55 205 58 203 C 61 200 61 196 59 193 C 57 190 51 188 46 190 Z", mirrored: true },
  { id: "left-quad", d: "M 78 204 C 88 208 93 210 97 212 C 98 220 99 232 99 244 L 89 244 C 84 244 80 242 80 238 C 78 226 78 214 78 204 Z", mirrored: true },
  { id: "left-knee", d: "M 80 244 C 84 240 94 240 98 244 C 99 250 98 256 94 258 C 88 261 82 258 79 252 Z", mirrored: true },
  { id: "left-calf", d: "M 79 256 C 84 260 92 262 97 262 C 98 274 98 296 96 318 C 93 326 87 328 83 326 C 79 322 78 312 78 300 C 78 284 78 268 79 256 Z", mirrored: true },
  { id: "left-ankle", d: "M 80 326 C 85 324 91 325 95 328 L 94 338 C 90 340 85 340 81 338 Z", mirrored: true },
  { id: "left-foot", d: "M 82 338 C 77 338 72 341 68 346 C 65 350 64 353 66 355 C 70 357 76 356 82 355 C 88 354 92 352 94 350 L 93 344 C 91 340 87 338 82 338 Z", mirrored: true },
];

const CENTER_REGIONS: RegionPathDef[] = [
  { id: "head", d: HEAD },
  { id: "neck", d: NECK },
  { id: "upper-back", d: UPPER_BACK, back: true },
  { id: "chest", d: CHEST },
  { id: "lower-back", d: LOWER_BACK, back: true },
  { id: "abdomen", d: ABDOMEN },
  { id: "hip", d: HIP },
];

// Silhueta humana (metade esquerda; espelhada para formar o corpo completo).
const SILHOUETTE_LEFT = `
M 100 8
C 89 8 83 14 83 25
C 83 37 89 46 97 50
C 94 54 93 57 92 60
L 89 62
C 80 66 72 72 65 79
C 57 87 51 98 48 110
C 46 120 46 132 47 144
C 48 158 51 170 55 179
C 58 187 60 192 60 197
C 60 203 56 206 51 206
C 46 206 44 202 45 197
C 46 194 47 192 48 190
C 54 176 56 164 56 150
C 56 138 54 126 51 117
C 49 110 47 104 47 100
C 47 96 51 94 55 92
C 62 88 67 86 70 86
L 72 96
C 72 120 73 150 76 176
C 77 186 78 196 78 204
L 79 230
C 79 248 78 268 80 288
C 81 304 83 316 86 326
C 87 331 87 334 86 337
C 84 340 82 342 79 344
C 75 347 70 348 66 349
C 63 350 61 351 61 353
C 62 355 66 356 72 355
C 80 354 88 352 93 350
L 97 346
C 96 334 95 320 94 302
C 93 286 93 264 94 246
C 95 228 97 215 100 212
Z`;

const BACK_REGION_TINT = "#8B5CF6";
const BACK_REGION_DEFAULT = "rgba(139,92,246,0.05)";

function mirrorId(id: string): BodyRegion {
  return id.replace("left-", "right-") as BodyRegion;
}

interface HealthBodyMapProps {
  symptoms: Symptom[];
  onRegionClick: (region: BodyRegion) => void;
  selectedRegion?: BodyRegion | null;
}

export function HealthBodyMap({ symptoms, onRegionClick, selectedRegion }: HealthBodyMapProps) {
  const [hoveredRegion, setHoveredRegion] = useState<BodyRegion | null>(null);

  const regionMaxIntensity = new Map<BodyRegion, SymptomIntensity>();
  for (const s of symptoms) {
    const current = regionMaxIntensity.get(s.region) || 0;
    if (s.intensity > current) regionMaxIntensity.set(s.region, s.intensity);
  }

  const getRegionColor = (region: BodyRegion, isBack: boolean): string => {
    const intensity = regionMaxIntensity.get(region);
    if (intensity) return INTENSITY_COLORS[intensity];
    return isBack ? BACK_REGION_DEFAULT : "rgba(255,255,255,0.04)";
  };

  const getRegionOpacity = (region: BodyRegion, isBack: boolean): number => {
    if (region === selectedRegion) return isBack ? 0.55 : 0.55;
    if (region === hoveredRegion) return isBack ? 0.45 : 0.42;
    const intensity = regionMaxIntensity.get(region);
    if (intensity) return isBack ? 0.45 : 0.34;
    return isBack ? 0.06 : 0.08;
  };

  const getRegionStroke = (region: BodyRegion, isBack: boolean): string => {
    if (region === selectedRegion) return "#C00018";
    if (region === hoveredRegion) return "rgba(255,255,255,0.35)";
    const intensity = regionMaxIntensity.get(region);
    if (intensity) return INTENSITY_COLORS[intensity];
    return isBack ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.1)";
  };

  const symptomCount = (region: BodyRegion): number =>
    symptoms.filter((s) => s.region === region).length;

  const renderRegion = (def: RegionPathDef, activeId: BodyRegion) => {
    const isActive = regionMaxIntensity.has(activeId);
    const isBack = Boolean(def.back);
    return (
      <g key={activeId}>
        <path
          d={def.d}
          fill={getRegionColor(activeId, isBack)}
          fillOpacity={getRegionOpacity(activeId, isBack)}
          stroke={getRegionStroke(activeId, isBack)}
          strokeWidth={activeId === selectedRegion ? 1.4 : 0.7}
          strokeOpacity={activeId === selectedRegion ? 1 : 0.45}
          strokeLinejoin="round"
          style={{
            cursor: "pointer",
            transition: "all 0.2s ease",
            filter: isActive ? "url(#glow)" : undefined,
          }}
          onClick={() => onRegionClick(activeId)}
          onMouseEnter={() => setHoveredRegion(activeId)}
          onMouseLeave={() => setHoveredRegion(null)}
        />
      </g>
    );
  };

  // Posição do badge de sintoma: aproxima do canto superior-direito da região,
  // respeitando espelhamento. Usa bbox da silhueta da região.
  const computeBadgeTransform = (def: RegionPathDef): { x: number; y: number } => {
    const box = findBBox(def.d);
    const cx = box ? box.x + box.w - 4 : 40;
    const cy = box ? box.y + 2 : 30;
    return { x: cx, y: cy };
  };

  const badgePoints = new Map<string, { x: number; y: number }>();
  for (const def of SIDE_REGIONS) badgePoints.set(def.id, computeBadgeTransform(def));
  for (const def of CENTER_REGIONS) badgePoints.set(def.id, computeBadgeTransform(def));

  return (
    <div className="relative flex flex-col items-center">
      <svg viewBox="0 0 200 400" className="w-full max-w-[200px]" style={{ filter: "drop-shadow(0 0 24px rgba(192,0,24,0.1))" }}>
        <defs>
          <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,242,227,0.16)" />
            <stop offset="55%" stopColor="rgba(255,242,227,0.05)" />
            <stop offset="100%" stopColor="rgba(148,163,184,0.02)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* silhueta humana */}
        <g fill="url(#skin)">
          <path d={SILHOUETTE_LEFT} stroke="rgba(255,255,255,0.13)" strokeWidth="1" strokeLinejoin="round" />
          <path d={SILHOUETTE_LEFT} transform="translate(200,0) scale(-1,1)" stroke="rgba(255,255,255,0.13)" strokeWidth="1" strokeLinejoin="round" />
        </g>

        {/* detalhes sutis do corpo (esterno, umbigo, clavículas, joelhos) */}
        <g stroke="rgba(255,255,255,0.09)" strokeWidth="0.8" fill="none" strokeLinecap="round">
          <path d="M 100 74 C 100 84 100 96 94 104 C 97 108 100 110 100 114 C 100 110 103 108 106 104 C 100 96 100 84 100 74 Z" />
          <path d="M 100 138 L 100 142" />
          <circle cx="100" cy="146" r="1.6" fill="rgba(255,255,255,0.12)" stroke="none" />
          <path d="M 88 66 C 94 72 106 72 112 66" />
          <path d="M 88 250 M 112 250" />
        </g>

        {/* regiões de trás (atrás das da frente) */}
        {CENTER_REGIONS.filter((r) => r.back).map((def) => renderRegion(def, def.id))}
        {/* regiões centrais da frente */}
        {CENTER_REGIONS.filter((r) => !r.back).map((def) => renderRegion(def, def.id))}

        {/* regiões laterais: esquerda + espelho direito */}
        {SIDE_REGIONS.map((def) => (
          <g key={def.id}>
            {renderRegion(def, def.id)}
            <g transform="translate(200,0) scale(-1,1)">
              {renderRegion({ ...def, id: mirrorId(def.id) }, mirrorId(def.id))}
            </g>
          </g>
        ))}

        {/* badges de sintoma */}
        {[...CENTER_REGIONS, ...SIDE_REGIONS].map((def) => {
          const activeId = def.id;
          const count = symptomCount(activeId);
          if (count === 0) return null;
          const pt = badgePoints.get(activeId);
          const flipped = def.mirrored;
          const x = flipped ? 200 - (pt?.x || 40) : pt?.x || 40;
          const y = pt?.y || 30;
          return (
            <g key={`badge-${activeId}`} style={{ pointerEvents: "none" }}>
              <circle cx={x} cy={y} r={6} fill="#C00018" stroke="rgba(0,0,0,0.3)" strokeWidth={1} />
              <text x={x} y={y + 2.5} textAnchor="middle" fill="white" fontSize="7" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">
                {count}
              </text>
            </g>
          );
        })}
      </svg>

      {/* tooltip */}
      {hoveredRegion && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg text-[9px] font-medium whitespace-nowrap z-10 pointer-events-none"
          style={{
            background: "rgba(15,15,18,0.95)",
            border: "1px solid rgba(192,0,24,0.3)",
            color: "var(--foreground)",
            fontFamily: "'Sora', sans-serif",
          }}
        >
          {BODY_REGION_LABELS[hoveredRegion]}
          {regionMaxIntensity.has(hoveredRegion) && (
            <span className="ml-1.5" style={{ color: INTENSITY_COLORS[regionMaxIntensity.get(hoveredRegion)!] }}>
              ({symptomCount(hoveredRegion)} {symptomCount(hoveredRegion) === 1 ? "sintoma" : "sintomas"})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Bbox aproximado (cached) do path para posicionar badges. */
const _bboxCache = new Map<string, { x: number; y: number; w: number; h: number } | null>();

function findBBox(d: string): { x: number; y: number; w: number; h: number } | null {
  if (_bboxCache.has(d)) return _bboxCache.get(d) || null;
  let box: { x: number; y: number; w: number; h: number } | null = null;
  try {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "path");
    svg.setAttribute("d", d);
    const r = svg.getBBox();
    box = r && r.width > 0 ? { x: r.x, y: r.y, w: r.width, h: r.height } : null;
  } catch {
    box = null;
  }
  _bboxCache.set(d, box);
  return box;
}