"use client";

import { useMemo, useRef } from "react";
import { MAP_W, MAP_H, buildGroundOnly } from "./map-static";

export function LocationMapPicker({ value, onChange }: {
  value: { x: number; y: number } | null;
  onChange: (v: { x: number; y: number } | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const groundHtml = useMemo(() => buildGroundOnly(), []);

  function handleClick(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.round(((e.clientX - rect.left) / rect.width) * MAP_W);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * MAP_H);
    if (x < 0 || x > MAP_W || y < 0 || y > MAP_H) return;
    onChange({ x, y });
  }

  return (
    <div className="monitor-map-root">
      <style>{`
        .monitor-map-root{
          --wall:#ffffff; --wall2:#dfe7e6; --wallsh:#c2cdcc; --glass:#bfe6f2; --glass2:#8fcfe6;
          --roof:#5fae46; --roof2:#3d7d2c; --lawn:#86c45f; --lawn2:#62a23f; --lawn3:#46822f;
          --sea1:#3fe0ec; --sea2:#0c87ab; --sand1:#f3e7c2; --sand2:#dcc78f; --road:#efe7cd;
          --foam:#ffffff; --pin1:#ff5a45; --pin2:#cf160b; --route:#39ff88; --route-d:#13a44f;
        }
      `}</style>
      <div ref={ref} onClick={handleClick} className="relative cursor-crosshair rounded-lg overflow-hidden border border-border">
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full block">
          <defs>
            <linearGradient id="gSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--sea1)"/><stop offset="1" stopColor="var(--sea2)"/></linearGradient>
            <linearGradient id="gSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--sand1)"/><stop offset="1" stopColor="var(--sand2)"/></linearGradient>
            <linearGradient id="gLawn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--lawn)"/><stop offset="1" stopColor="var(--lawn2)"/></linearGradient>
            <linearGradient id="gWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--wall)"/><stop offset="1" stopColor="var(--wall2)"/></linearGradient>
            <linearGradient id="gWallSide" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--wall2)"/><stop offset="1" stopColor="var(--wallsh)"/></linearGradient>
            <linearGradient id="gRoof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--roof)"/><stop offset="1" stopColor="var(--roof2)"/></linearGradient>
            <radialGradient id="gDome" cx="40%" cy="32%" r="78%"><stop offset="0" stopColor="var(--wall)"/><stop offset="1" stopColor="var(--wall2)"/></radialGradient>
            <linearGradient id="gPin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--pin1)"/><stop offset="1" stopColor="var(--pin2)"/></linearGradient>
            <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity=".22"/></filter>
            <filter id="float" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="22" stdDeviation="20" floodColor="#06251a" floodOpacity=".30"/></filter>
            <clipPath id="seaClip"><rect x="0" y="636" width="1200" height="184"/></clipPath>
            <clipPath id="isleClip"><rect x="22" y="22" width="1156" height="612" rx="58"/></clipPath>
          </defs>
          <g dangerouslySetInnerHTML={{ __html: groundHtml }} />
          {value && (
            <g transform={`translate(${value.x},${value.y})`}>
              <path d="M0 0 C-14 -18 -14 -36 0 -36 C14 -36 14 -18 0 0 Z" fill="url(#gPin)" stroke="#fff" strokeWidth="1.6" />
              <circle cx="0" cy="-25" r="6" fill="#fff" />
            </g>
          )}
        </svg>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Haritaya tıklayarak konum noktası seçin.{value ? ` Seçili: (${value.x}, ${value.y})` : " Henüz nokta seçilmedi."}
      </p>
      {value && (
        <button type="button" className="text-xs text-destructive underline mt-0.5" onClick={() => onChange(null)}>
          Harita noktasını kaldır
        </button>
      )}
    </div>
  );
}
