"use client";

import { useRef, useState } from "react";
import { MAP_W, MAP_H, MAP_TEXTURE_URL } from "./map-static";
import { Maximize2, Minimize2, ZoomIn, ZoomOut } from "lucide-react";

export function LocationMapPicker({ value, onChange, mapUrl }: {
  value: { x: number; y: number } | null;
  onChange: (v: { x: number; y: number } | null) => void;
  mapUrl?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const src = mapUrl || MAP_TEXTURE_URL;
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  function handleClick(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.round(((e.clientX - rect.left) / rect.width) * MAP_W);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * MAP_H);
    if (x < 0 || x > MAP_W || y < 0 || y > MAP_H) return;
    onChange({ x, y });
  }

  const wrapperClass = fullscreen
    ? "fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
    : "relative";

  return (
    <div className={wrapperClass}>
      {fullscreen && (
        <button
          type="button"
          className="absolute top-4 right-4 z-10 bg-white/20 backdrop-blur text-white rounded-full p-2 hover:bg-white/30"
          onClick={() => setFullscreen(false)}
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      )}

      <div className="space-y-1 w-full">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Haritaya tıklayarak konum noktası seçin.
            {value ? ` Seçili: (${value.x}, ${value.y})` : " Henüz nokta seçilmedi."}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground rounded p-1 hover:bg-muted"
              onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
              title="Uzaklaştır"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs text-muted-foreground w-8 text-center">{zoom}x</span>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground rounded p-1 hover:bg-muted"
              onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
              title="Yakınlaştır"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground rounded p-1 hover:bg-muted"
              onClick={() => setFullscreen((f) => !f)}
              title={fullscreen ? "Küçült" : "Tam ekran"}
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div
          ref={ref}
          onClick={handleClick}
          className={`relative cursor-crosshair rounded-lg overflow-auto border border-border ${fullscreen ? "max-h-[80vh] max-w-[90vw]" : "max-h-[300px] inline-block"}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- runtime URL, Image component can't handle */}
          <img
            src={src}
            alt="Harita"
            className="block"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              maxWidth: zoom === 1 ? "100%" : "none",
              maxHeight: zoom === 1 ? "260px" : "none",
            }}
            draggable={false}
          />
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

        {value && (
          <button type="button" className="text-xs text-destructive underline" onClick={() => onChange(null)}>
            Harita noktasını kaldır
          </button>
        )}
      </div>
    </div>
  );
}
