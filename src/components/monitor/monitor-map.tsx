"use client";

import { useMemo } from "react";
import { MAP_W, MAP_H, buildGroundOnly, buildRouteSvg } from "./map-static";

export interface MapLocation { id: number; name: string; mapX: number | null; mapY: number | null }
export interface MapBuggy {
  id: number; code: string; icon: string | null;
  status: "AVAILABLE" | "BUSY" | "OFFLINE" | "MAINTENANCE";
  currentLocationId: number | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
}
export interface MapCall {
  id: number; status: "PENDING" | "ACCEPTED"; locationId: number; buggyId: number | null;
  guestName: string | null; roomNumber: string | null; requestedAt: string;
}
export type MapSelection = { kind: "call" | "buggy"; id: number } | null;

const BUGGY_COLORS: Record<MapBuggy["status"], string> = {
  AVAILABLE: "#22c55e",
  BUSY: "#f97316",
  OFFLINE: "#6b7280",
  MAINTENANCE: "#6b7280",
};

function Pin({ x, y, n, name, dimmed, onClick }: {
  x: number; y: number; n: number; name: string; dimmed?: boolean; onClick?: () => void;
}) {
  return (
    <g transform={`translate(${x},${y})`} opacity={dimmed ? 0.35 : 1} style={{ cursor: onClick ? "pointer" : undefined }} onClick={onClick}>
      <ellipse cx="0" cy="2" rx="9" ry="3" fill="rgba(0,0,0,.32)" />
      <path d="M0 0 C-14 -18 -14 -36 0 -36 C14 -36 14 -18 0 0 Z" fill="url(#gPin)" stroke="#fff" strokeWidth="1.6" />
      <circle cx="0" cy="-25" r="9.5" fill="#fff" />
      <text x="0" y="-25" textAnchor="middle" dominantBaseline="central" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="11.5" fill="#c4160a">
        {String(n).padStart(2, "0")}
      </text>
      <title>{name}</title>
    </g>
  );
}

function BuggyMarker({ x, y, buggy, selected, onClick }: {
  x: number; y: number; buggy: MapBuggy; selected: boolean; onClick?: () => void;
}) {
  const color = BUGGY_COLORS[buggy.status];
  const faded = buggy.status === "OFFLINE" || buggy.status === "MAINTENANCE";
  const label = buggy.code.startsWith("B") ? buggy.code.slice(1) : buggy.code;
  const iconW = 52, iconH = 26;
  return (
    <g transform={`translate(${x - iconW/2},${y - iconH - 2})`}
       style={{ cursor: "pointer" }} onClick={onClick}
       opacity={faded ? 0.55 : 1} data-testid={`buggy-${buggy.code}`} data-status={buggy.status}>
      {selected && <circle cx={iconW/2} cy={iconH + 6} r="24" fill="none" stroke={color} strokeWidth="2.5" className="mon-sel-ring" />}
      {/* gölge */}
      <ellipse cx={iconW/2} cy={iconH + 9} rx="22" ry="4" fill="rgba(0,0,0,.25)" />
      {/* golf buggy ikonu */}
      <use href="#buggy-icon" width={iconW} height={iconH} stroke={color} strokeWidth="1.5" />
      {/* büyük kod numarası — gövde üstünde */}
      <text x={iconW/2} y={iconH/2 + 1} textAnchor="middle" dominantBaseline="central"
            fontFamily="Space Grotesk, sans-serif" fontWeight="800" fontSize="12" fill="#fff"
            stroke="#0e241a" strokeWidth="3" paintOrder="stroke">{label}</text>
      {/* durum ışığı — sağ üst */}
      <circle cx={iconW - 5} cy="3" r="4" fill={color} stroke="#0e241a" strokeWidth="1.2" />
      {/* GPS mavi pulse — sol üst */}
      {buggy.gpsLat != null && buggy.gpsLng != null && (
        <circle cx="5" cy="3" r="4" fill="#3b82f6" stroke="#0e241a" strokeWidth="1.2" className="mon-call-pulse" />
      )}
      <title>{`${buggy.code} · ${buggy.status}${buggy.gpsLat ? " · GPS canli" : ""}`}</title>
    </g>
  );
}

function CallMarker({ x, y, call, selected, onClick }: {
  x: number; y: number; call: MapCall; selected: boolean; onClick?: () => void;
}) {
  const pending = call.status === "PENDING";
  const color = pending ? "#ef4444" : "#3b82f6";
  return (
    <g transform={`translate(${x},${y - 46})`} style={{ cursor: "pointer" }} onClick={onClick}
       data-testid={`call-${call.id}`} data-status={call.status}>
      {pending && <circle r="10" fill="none" stroke={color} strokeWidth="2" className="mon-call-pulse" />}
      {selected && <circle r="16" fill="none" stroke={color} strokeWidth="2.5" />}
      <circle r="9" fill={color} stroke="#fff" strokeWidth="1.6" />
      <path d="M0 -4.5c-2.4 0-4 1.7-4 3.6v2.4l-1.4 2h10.8l-1.4-2V-0.9C4-2.8 2.4-4.5 0-4.5Zm-1.6 8.4a1.7 1.7 0 0 0 3.2 0Z" fill="#fff" />
      <title>{`${call.guestName || "Misafir"}${call.roomNumber ? " · Oda " + call.roomNumber : ""}`}</title>
    </g>
  );
}

export function MonitorMap({ locations, buggies, calls, selection, onSelect }: {
  locations: MapLocation[];
  buggies: MapBuggy[];
  calls: MapCall[];
  selection: MapSelection;
  onSelect?: (sel: MapSelection) => void;
}) {
  const groundHtml = useMemo(() => buildGroundOnly(), []);
  const routeHtml = useMemo(() => buildRouteSvg(), []);

  const mapped = locations.filter((l): l is MapLocation & { mapX: number; mapY: number } => l.mapX != null && l.mapY != null);
  const coordOf = new Map(mapped.map((l) => [l.id, { x: l.mapX, y: l.mapY }]));

  // Offset multiple buggies at same stop horizontally
  const byLocation = new Map<number, MapBuggy[]>();
  for (const b of buggies) {
    if (b.currentLocationId == null || !coordOf.has(b.currentLocationId)) continue;
    const arr = byLocation.get(b.currentLocationId) ?? [];
    arr.push(b);
    byLocation.set(b.currentLocationId, arr);
  }
  const buggyMarkers: { buggy: MapBuggy; x: number; y: number }[] = [];
  for (const [locId, arr] of byLocation) {
    const c = coordOf.get(locId)!;
    arr.forEach((buggy, i) => {
      buggyMarkers.push({ buggy, x: c.x + (i - (arr.length - 1) / 2) * 40, y: c.y + 14 });
    });
  }
  const buggyCoord = new Map(buggyMarkers.map((m) => [m.buggy.id, { x: m.x, y: m.y }]));

  return (
    <div className="monitor-map-root">
      <style>{`
        .monitor-map-root{
          --wall:#ffffff; --wall2:#dfe7e6; --wallsh:#c2cdcc; --glass:#bfe6f2; --glass2:#8fcfe6;
          --roof:#5fae46; --roof2:#3d7d2c; --lawn:#86c45f; --lawn2:#62a23f; --lawn3:#46822f;
          --sea1:#3fe0ec; --sea2:#0c87ab; --sand1:#f3e7c2; --sand2:#dcc78f; --road:#efe7cd;
          --foam:#ffffff; --pin1:#ff5a45; --pin2:#cf160b; --route:#39ff88; --route-d:#13a44f;
        }
        .monitor-map-root .r-dash{animation:mon-march 1.4s linear infinite}
        .monitor-map-root .mon-call-pulse{animation:mon-pulse 1.3s ease-out infinite;transform-box:fill-box;transform-origin:center}
        .monitor-map-root .mon-sel-ring{animation:mon-pulse 1.8s ease-out infinite;transform-box:fill-box;transform-origin:center}
        .monitor-map-root .palm .top{transform-box:fill-box;transform-origin:center;animation:mon-sway 5s ease-in-out infinite}
        .monitor-map-root .wave{animation:mon-wave 7s linear infinite}
        .monitor-map-root .wave.w2{animation-duration:11s;animation-direction:reverse}
        @keyframes mon-march{to{stroke-dashoffset:-28}}
        @keyframes mon-pulse{0%{transform:scale(.7);opacity:.8}80%{opacity:0}100%{transform:scale(2.2);opacity:0}}
        @keyframes mon-sway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
        @keyframes mon-wave{from{transform:translateX(0)}to{transform:translateX(-120px)}}
      `}</style>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full block" role="img" aria-label="Ethno Belek canlı buggy haritası">
        <defs>
          <linearGradient id="gSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--sea1)"/><stop offset="1" stopColor="var(--sea2)"/></linearGradient>
          <linearGradient id="gSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--sand1)"/><stop offset="1" stopColor="var(--sand2)"/></linearGradient>
          <linearGradient id="gLawn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--lawn)"/><stop offset="1" stopColor="var(--lawn2)"/></linearGradient>
          <linearGradient id="gWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--wall)"/><stop offset="1" stopColor="var(--wall2)"/></linearGradient>
          <linearGradient id="gWallSide" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--wall2)"/><stop offset="1" stopColor="var(--wallsh)"/></linearGradient>
          <linearGradient id="gRoof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--roof)"/><stop offset="1" stopColor="var(--roof2)"/></linearGradient>
          <radialGradient id="gDome" cx="40%" cy="32%" r="78%"><stop offset="0" stopColor="var(--wall)"/><stop offset="1" stopColor="var(--wall2)"/></radialGradient>
          <linearGradient id="gPin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--pin1)"/><stop offset="1" stopColor="var(--pin2)"/></linearGradient>
          <radialGradient id="gPinHi" cx="35%" cy="30%" r="60%"><stop offset="0" stopColor="#ffd2c8" stopOpacity=".95"/><stop offset="1" stopColor="#ffd2c8" stopOpacity="0"/></radialGradient>
          <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity=".22"/></filter>
          <filter id="float" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="22" stdDeviation="20" floodColor="#06251a" floodOpacity=".30"/></filter>
          <filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <clipPath id="seaClip"><rect x="0" y="636" width="1200" height="184"/></clipPath>
          <clipPath id="isleClip"><rect x="22" y="22" width="1156" height="612" rx="58"/></clipPath>
          {/* golf buggy ikonu */}
          <symbol id="buggy-icon" viewBox="0 0 320 135">
            {/* arka tekerlek */}
            <circle cx="60" cy="130" r="28" fill="#2b2b2b"/>
            <circle cx="60" cy="130" r="12" fill="#9aa5a8"/>
            {/* ön tekerlek */}
            <circle cx="260" cy="130" r="28" fill="#2b2b2b"/>
            <circle cx="260" cy="130" r="12" fill="#9aa5a8"/>
            {/* gövde (alt) — yeşil */}
            <path d="M0 110 L30 70 L290 70 L320 110 L320 130 L0 130 Z" fill="#2f8f7a" stroke="currentColor" stroke-width="3"/>
            {/* tavan — kırmızı */}
            <path d="M10 0 Q160 -35 310 0 L310 10 Q160 -22 10 10 Z" fill="#e05a4e" stroke="currentColor" stroke-width="3"/>
            {/* ön cam — mavi */}
            <path d="M290 70 L310 70 L320 105 L290 105 Z" fill="#bcdff0" opacity="0.9"/>
            {/* arka koltuk */}
            <rect x="50" y="70" width="55" height="12" fill="#1f2f33"/>
            {/* ön koltuk */}
            <rect x="170" y="70" width="55" height="12" fill="#1f2f33"/>
            {/* arka kutu */}
            <rect x="300" y="100" width="18" height="22" rx="3" fill="#24473f"/>
            {/* ön far */}
            <circle cx="308" cy="93" r="5" fill="#fff4c2"/>
            {/* kod label bölgesi (sayı overlay'i için arka plan) */}
            <rect x="100" y="80" width="120" height="18" rx="4" fill="#0e241a" opacity="0.65"/>
          </symbol>
        </defs>

        {/* statik zemin + rota */}
        <g dangerouslySetInnerHTML={{ __html: groundHtml }} />
        <g dangerouslySetInnerHTML={{ __html: routeHtml }} opacity="0.6" />

        {/* durak pinleri (sadece mapX/mapY girili olanlar) */}
        <g>
          {mapped.map((l, i) => (
            <Pin key={l.id} x={l.mapX} y={l.mapY} n={i + 1} name={l.name} />
          ))}
        </g>

        {/* ACCEPTED cagri -> buggy kesikli cizgiler */}
        <g>
          {calls.filter((c) => c.status === "ACCEPTED" && c.buggyId != null && coordOf.has(c.locationId) && buggyCoord.has(c.buggyId)).map((c) => {
            const from = buggyCoord.get(c.buggyId!)!;
            const to = coordOf.get(c.locationId)!;
            return <line key={`link-${c.id}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y - 46}
                        stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 6" opacity="0.7" />;
          })}
        </g>

        {/* buggy katmani */}
        <g>
          {buggyMarkers.map(({ buggy, x, y }) => (
            <BuggyMarker key={buggy.id} buggy={buggy} x={x} y={y}
                         selected={selection?.kind === "buggy" && selection.id === buggy.id}
                         onClick={() => onSelect?.({ kind: "buggy", id: buggy.id })} />
          ))}
        </g>

        {/* cagri katmani */}
        <g>
          {calls.filter((c) => coordOf.has(c.locationId)).map((c) => {
            const p = coordOf.get(c.locationId)!;
            return <CallMarker key={c.id} call={c} x={p.x} y={p.y}
                              selected={selection?.kind === "call" && selection.id === c.id}
                              onClick={() => onSelect?.({ kind: "call", id: c.id })} />;
          })}
        </g>
      </svg>
    </div>
  );
}
