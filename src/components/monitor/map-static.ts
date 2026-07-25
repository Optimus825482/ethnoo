/**
 * ETHNO Belek SVG diorama — statik zemin + rota.
 * Kaynak: D:\ETHNO\aas.html (tek veri kaynağı; dekoratif katman).
 * CSS değişkenleri MonitorMap bileşeninde scoped <style> ile tanımlanır.
 */

export const MAP_W = 1200;
export const MAP_H = 820;

export interface CanonicalStop { n: number; name: string; x: number; y: number }

export const CANONICAL_STOPS: CanonicalStop[] = [
  { n: 1,  name: "Casita by Ethno",            x: 640, y: 118 },
  { n: 2,  name: "Forest Villas",              x: 168, y: 138 },
  { n: 3,  name: "Ethno Villas",               x: 212, y: 268 },
  { n: 4,  name: "Aquapark",                   x: 150, y: 362 },
  { n: 5,  name: "Casita Beach Club",          x: 140, y: 500 },
  { n: 6,  name: "Javara Beach Club",          x: 352, y: 500 },
  { n: 7,  name: "Mangiare Snack Restaurant",  x: 442, y: 400 },
  { n: 8,  name: "Ethnosphere Event House",    x: 552, y: 420 },
  { n: 9,  name: "Night Club",                 x: 516, y: 500 },
  { n: 10, name: "Beach Volleyball",           x: 662, y: 500 },
  { n: 11, name: "Lumière Cabaret Restaurant", x: 632, y: 300 },
  { n: 12, name: "Tennis Court",               x: 786, y: 300 },
];

const ROUTE_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 11];

// ↓↓↓ COPIED FROM D:\ETHNO\aas.html EXACTLY ↓↓↓

const pad = (n: number) => String(n).padStart(2, "0");

function cabin(x: number, y: number, s?: number): string {
  s = s || 1;
  return '<g filter="url(#soft)">' +
    '<rect x="' + (x - 13 * s) + '" y="' + (y - 2 * s) + '" width="' + (26 * s) + '" height="' + (13 * s) + '" rx="2" fill="url(#gWallSide)"/>' +
    '<rect x="' + (x - 13 * s) + '" y="' + (y - 10 * s) + '" width="' + (26 * s) + '" height="' + (12 * s) + '" rx="2" fill="url(#gWall)"/>' +
    '<path d="M' + (x - 15 * s) + ' ' + (y - 9 * s) + ' L' + x + ' ' + (y - 21 * s) + ' L' + (x + 15 * s) + ' ' + (y - 9 * s) + ' Z" fill="url(#gRoof)"/>' +
    '<rect x="' + (x - 3 * s) + '" y="' + (y - 6 * s) + '" width="' + (6 * s) + '" height="' + (5 * s) + '" rx="1" fill="var(--glass)"/></g>';
}

function palm(x: number, y: number, s?: number, delay?: number): string {
  s = s || 1;
  let f = "";
  const cols = ["#4f9a3a", "#62b14a"];
  for (let k = 0; k < 7; k++) {
    const a = k * 360 / 7;
    f += '<path d="M0,0 Q7,-2.6 16,0 Q7,2.6 0,0 Z" fill="' + cols[k % 2] + '" transform="rotate(' + a + ')"/>';
  }
  return '<g class="palm" transform="translate(' + x + ',' + y + ') scale(' + s + ')">' +
    '<ellipse cx="3" cy="5" rx="11" ry="6" fill="rgba(0,0,0,.16)"/>' +
    '<rect x="-1.4" y="-2" width="2.8" height="9" rx="1.4" fill="#7a5a32"/>' +
    '<g class="top" style="animation-delay:-' + (delay || 0) + 's">' + f + '<circle r="2.4" fill="#2f6a23"/></g></g>';
}

// --- BUILD THE ENTIRE buildGround() from aas.html (lines 253-386) ---
export function buildGroundOnly(): string {
  let s = "";
  /* ---- deniz (platformun altındaki stüdyo zemini) ---- */
  s += '<g clip-path="url(#seaClip)">';
  s += '<rect x="0" y="636" width="1200" height="184" fill="url(#gSea)"/>';
  s += '<path class="wave" d="M-200 690 q30 -8 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0" stroke="var(--foam)" stroke-width="2" fill="none" opacity=".22"/>';
  s += '<path class="wave w2" d="M-200 732 q30 -8 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0" stroke="var(--foam)" stroke-width="2" fill="none" opacity=".16"/>';
  s += '</g>';

  /* ---- yüzen ada platformu (gölge + gövde kalınlığı) ---- */
  s += '<g filter="url(#float)">';
  s += '<rect x="22" y="40" width="1156" height="600" rx="58" fill="var(--lawn3)"/>'; /* kenar kalınlığı */
  s += '<rect x="22" y="22" width="1156" height="600" rx="58" fill="url(#gLawn)"/>';
  s += '</g>';

  /* platform içi doku */
  s += '<g clip-path="url(#isleClip)">';
  s += '<ellipse cx="250" cy="150" rx="240" ry="120" fill="var(--lawn3)" opacity=".30"/>';
  s += '<ellipse cx="950" cy="470" rx="240" ry="150" fill="var(--lawn3)" opacity=".34"/>';
  s += '<ellipse cx="600" cy="330" rx="200" ry="90" fill="var(--lawn2)" opacity=".40"/>';
  /* büyük yeşil çim alan (sağ) */
  s += '<rect x="742" y="372" width="408" height="196" rx="26" fill="var(--lawn2)" opacity=".55"/>';
  s += '<rect x="742" y="372" width="408" height="196" rx="26" fill="none" stroke="var(--lawn3)" stroke-width="2" opacity=".4"/>';
  /* yürüyüş yolları */
  s += '<path d="M120 300 Q300 320 442 400" stroke="var(--road)" stroke-width="9" fill="none" opacity=".55" stroke-linecap="round"/>';
  s += '<path d="M442 400 Q520 450 352 500" stroke="var(--road)" stroke-width="9" fill="none" opacity=".55" stroke-linecap="round"/>';
  s += '<path d="M552 420 Q640 360 632 300" stroke="var(--road)" stroke-width="9" fill="none" opacity=".55" stroke-linecap="round"/>';
  s += '<path d="M632 300 Q720 300 786 300" stroke="var(--road)" stroke-width="9" fill="none" opacity=".55" stroke-linecap="round"/>';
  s += '<path d="M640 200 Q640 320 552 420" stroke="var(--road)" stroke-width="9" fill="none" opacity=".5" stroke-linecap="round"/>';

  /* ============ ANA OTEL (1) — kavisli cam + T kanat + çatı/ön havuz ============ */
  s += '<g filter="url(#soft)">';
  s += '<ellipse cx="640" cy="176" rx="252" ry="22" fill="rgba(0,0,0,.16)"/>';
  /* ön kavisli havuz */
  s += '<path d="M430 168 Q640 214 850 168 Q640 196 430 168 Z" fill="var(--glass)" opacity=".95"/>';
  s += '<path d="M430 168 Q640 214 850 168" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/>';
  /* ana gövde */
  s += '<rect x="402" y="74" width="476" height="86" rx="26" fill="url(#gWallSide)"/>';
  s += '<rect x="402" y="66" width="476" height="80" rx="26" fill="url(#gWall)"/>';
  /* sağ T-kanat (aşağı sarkan) */
  s += '<rect x="600" y="120" width="92" height="104" rx="20" fill="url(#gWallSide)"/>';
  s += '<rect x="600" y="114" width="92" height="98" rx="20" fill="url(#gWall)"/>';
  /* cam şeritler */
  for (let i = 0; i < 3; i++) s += '<line x1="416" y1="' + (86 + i * 20) + '" x2="864" y2="' + (86 + i * 20) + '" stroke="rgba(0,0,0,.06)" stroke-width="2"/>';
  for (let yy = 0; yy < 3; yy++) for (let xx = 418; xx < 862; xx += 19) { if (xx > 596 && xx < 696 && yy > 0) continue; s += '<rect x="' + xx + '" y="' + (78 + yy * 20) + '" width="10" height="8" rx="1.5" fill="var(--glass)"/>'; }
  for (let yy = 0; yy < 3; yy++) for (let xx = 612; xx < 684; xx += 18) s += '<rect x="' + xx + '" y="' + (126 + yy * 20) + '" width="9" height="8" rx="1.5" fill="var(--glass)"/>';
  /* çatı havuzu ince mavi */
  s += '<rect x="430" y="60" width="420" height="9" rx="4" fill="var(--glass2)" opacity=".85"/>';
  s += '</g>';

  /* ============ FOREST VILLAS (2) ============ */
  for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) s += cabin(96 + c * 52, 112 + r * 44, 1);
  /* ============ ETHNO VILLAS (3) ============ */
  for (let c = 0; c < 4; c++) s += cabin(142 + c * 40, 262, .9);

  /* ============ AQUAPARK (4) ============ */
  s += '<g filter="url(#soft)">';
  s += '<ellipse cx="150" cy="366" rx="78" ry="46" fill="var(--glass)"/>';
  s += '<ellipse cx="150" cy="366" rx="42" ry="22" fill="none" stroke="var(--foam)" stroke-width="4" opacity=".5"/>';
  s += '<path d="M96 338 q18 -22 36 0 q18 22 36 0" stroke="#ff5a45" stroke-width="5" fill="none" stroke-linecap="round"/>';
  s += '<path d="M110 356 q18 -22 36 0 q18 22 36 0" stroke="#ffc83d" stroke-width="5" fill="none" stroke-linecap="round"/>';
  s += '<path d="M124 376 q18 -22 36 0 q18 22 36 0" stroke="#37c0ff" stroke-width="5" fill="none" stroke-linecap="round"/>';
  s += '</g>';

  /* ============ LUMIERE (11) — yuvarlak yeşil çatı ============ */
  s += '<g filter="url(#soft)">';
  s += '<ellipse cx="632" cy="318" rx="40" ry="14" fill="rgba(0,0,0,.14)"/>';
  s += '<circle cx="632" cy="300" r="36" fill="url(#gRoof)"/>';
  s += '<circle cx="632" cy="300" r="24" fill="url(#gWall)"/>';
  s += '<circle cx="632" cy="300" r="6" fill="var(--glass)"/>';
  s += '</g>';

  /* ============ TENNIS (12) ============ */
  s += '<g filter="url(#soft)">';
  s += '<rect x="748" y="272" width="34" height="56" rx="2" fill="#c4503f"/>';
  s += '<rect x="788" y="272" width="34" height="56" rx="2" fill="#2f6fb0"/>';
  s += '<g stroke="#fff" stroke-width="1.3" fill="none"><rect x="751" y="275" width="28" height="50"/><line x1="751" y1="300" x2="779" y2="300"/><rect x="791" y="275" width="28" height="50"/><line x1="791" y1="300" x2="819" y2="300"/></g>';
  s += '</g>';

  /* ============ MANGIARE (7) ============ */
  s += '<g filter="url(#soft)"><rect x="412" y="392" width="60" height="30" rx="4" fill="url(#gWallSide)"/>' +
    '<rect x="412" y="384" width="60" height="22" rx="4" fill="url(#gWall)"/>';
  for (let i = 0; i < 6; i++) s += '<rect x="' + (412 + i * 10) + '" y="378" width="5" height="8" fill="' + (i % 2 ? '#fff' : '#e8742a') + '"/>';
  s += '<rect x="424" y="398" width="10" height="12" fill="var(--glass)"/></g>';

  /* ============ ETHNOSPHERE (8) — amfi ============ */
  s += '<g filter="url(#soft)"><ellipse cx="552" cy="446" rx="62" ry="14" fill="rgba(0,0,0,.14)"/>' +
    '<path d="M494 432 a58 42 0 0 1 116 0 Z" fill="url(#gWallSide)"/>' +
    '<path d="M494 426 a58 42 0 0 1 116 0 Z" fill="url(#gWall)"/>' +
    '<path d="M508 426 a44 30 0 0 1 88 0" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="2"/>' +
    '<path d="M522 426 a30 20 0 0 1 60 0" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="2"/>' +
    '<rect x="538" y="418" width="28" height="14" rx="3" fill="var(--roof)"/></g>';

  /* ============ NIGHT CLUB (9) — kubbe ============ */
  s += '<g filter="url(#soft)"><ellipse cx="516" cy="514" rx="30" ry="9" fill="rgba(0,0,0,.14)"/>' +
    '<circle cx="516" cy="500" r="27" fill="url(#gDome)"/>' +
    '<circle cx="516" cy="500" r="27" fill="none" stroke="var(--roof)" stroke-width="3"/>' +
    '<circle cx="516" cy="500" r="6" fill="var(--glass)"/></g>';

  /* ============ BEACH CLUBS (5 & 6) — çadırlar ============ */
  function tents(cx: number): string {
    let t = '<g filter="url(#soft)">';
    const xs = [cx - 44, cx, cx + 44];
    xs.forEach(x => {
      t += '<ellipse cx="' + x + '" cy="514" rx="22" ry="6" fill="rgba(0,0,0,.12)"/>' +
        '<path d="M' + (x - 22) + ' 512 L' + x + ' 488 L' + (x + 22) + ' 512 Z" fill="var(--wall)"/>' +
        '<path d="M' + (x - 22) + ' 512 L' + x + ' 488 L' + (x + 22) + ' 512" fill="none" stroke="var(--wallsh)" stroke-width="1.4"/>';
    });
    return t + '</g>';
  }
  s += tents(140); s += tents(352);

  /* ============ BEACH VOLLEYBALL (10) ============ */
  s += '<g filter="url(#soft)"><rect x="630" y="486" width="64" height="32" rx="2" fill="#e9d2a0" stroke="#fff" stroke-width="1.6"/>' +
     '<line x1="662" y1="486" x2="662" y2="518" stroke="#fff" stroke-width="1.6"/></g>';

  /* ============ KUMSAL şeridi (platform alt kenarı) ============ */
  s += '<path d="M22 556 Q600 540 1178 556 L1178 634 Q600 648 22 634 Z" fill="url(#gSand)"/>';
  s += '<path d="M22 632 Q600 646 1178 632 L1178 640 Q600 654 22 640 Z" fill="var(--foam)" opacity=".5"/>';

  /* şezlong + şemsiye */
  const skip = [[60, 210], [280, 420], [600, 720]];
  const umb = ["#ff5a45", "#37c0ff", "#ffc83d", "#7a5cff", "#37ff86"]; let ui = 0;
  for (let x = 70; x < 1140; x += 22) {
    if (skip.some(r => x > r[0] && x < r[1])) continue;
    const y = 582 + ((x * 7) % 16);
    s += '<rect x="' + x + '" y="' + y + '" width="7" height="3.4" rx="1" fill="#f4efe1" opacity=".85"/>';
    if (x % 88 < 22) { s += '<circle cx="' + (x + 3) + '" cy="' + (y - 3) + '" r="4.4" fill="' + umb[ui++ % umb.length] + '" opacity=".9"/>'; }
  }
  /* iskele */
  s += '<rect x="330" y="628" width="14" height="80" fill="#b98a52"/>' +
     '<rect x="318" y="702" width="38" height="20" rx="3" fill="#caa06a"/>';

  /* ============ PALMİYELER (kenar + iç) ============ */
  const palms: [number, number, number, number][] = [[70, 70, 1, 0], [150, 52, .9, 1.2], [300, 60, 1, .6], [430, 52, .9, 2], [560, 52, 1, .4], [700, 52, .9, 1.7], [840, 52, 1, .8], [980, 52, .9, 2.1], [1110, 70, 1, 1.1], [1140, 180, .9, .5], [1140, 300, 1, 1.9], [1140, 430, .9, .9], [1110, 540, 1, 2.3], [60, 180, .9, 1.3], [60, 300, 1, .2], [60, 430, .9, 1.6], [90, 540, 1, .7], [430, 548, .9, 2.2], [600, 548, 1, 1.4], [760, 548, .9, .1], [900, 548, 1, 1.8], [1040, 548, .9, .6], [330, 232, 1, 1.5], [430, 300, .9, .3], [700, 232, 1, 2.4], [250, 402, .9, 1.0]];
  palms.forEach(p => s += palm(p[0], p[1], p[2], p[3]));

  s += '</g>'; /* /isleClip */
  return s;
}

/* ---------- closed catmull-rom ---------- */
function routePath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  let d = "M " + pts[0].x + " " + pts[0].y + " ";
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += "C " + c1x.toFixed(1) + " " + c1y.toFixed(1) + " " + c2x.toFixed(1) + " " + c2y.toFixed(1) + " " + p2.x + " " + p2.y + " ";
  }
  return d + "Z";
}

export function buildRouteSvg(): string {
  const ordered = ROUTE_ORDER.map((nn) => CANONICAL_STOPS[nn - 1]);
  const d = routePath(ordered);
  return (
    '<path d="' + d + '" fill="none" stroke="var(--route)" stroke-width="24" opacity=".16" filter="url(#glow)"/>' +
    '<path d="' + d + '" fill="none" stroke="var(--route)" stroke-width="14" opacity=".30" filter="url(#glow)"/>' +
    '<path d="' + d + '" fill="none" stroke="var(--route-d)" stroke-width="7" stroke-linecap="round"/>' +
    '<path class="r-dash" d="' + d + '" fill="none" stroke="#eafff0" stroke-width="2.4" stroke-dasharray="2 12" stroke-linecap="round"/>'
  );
}
