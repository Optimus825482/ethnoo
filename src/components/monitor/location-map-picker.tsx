"use client";

import { useRef } from "react";
import { MAP_W, MAP_H, MAP_TEXTURE_URL } from "./map-static";

export function LocationMapPicker({ value, onChange }: {
  value: { x: number; y: number } | null;
  onChange: (v: { x: number; y: number } | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function handleClick(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.round(((e.clientX - rect.left) / rect.width) * MAP_W);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * MAP_H);
    if (x < 0 || x > MAP_W || y < 0 || y > MAP_H) return;
    onChange({ x, y });
  }

  return (
    <div className="space-y-1">
      <div ref={ref} onClick={handleClick} className="relative cursor-crosshair rounded-lg overflow-hidden border border-border inline-block">
        <img src={MAP_TEXTURE_URL} alt="Harita" className="max-w-full max-h-[260px] block" />
        {value && (
          <div
            className="absolute w-5 h-5 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{
              left: `${(value.x / MAP_W) * 100}%`,
              top: `${(value.y / MAP_H) * 100}%`,
            }}
          >
            <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow-lg" />
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Haritaya tıklayarak konum noktası seçin.{value ? ` Seçili: (${value.x}, ${value.y})` : " Henüz nokta seçilmedi."}
      </p>
      {value && (
        <button type="button" className="text-xs text-destructive underline" onClick={() => onChange(null)}>
          Harita noktasını kaldır
        </button>
      )}
    </div>
  );
}
