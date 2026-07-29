"use client";

import { useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { IMG_W, IMG_H, MAP_TEXTURE_URL } from "./map-static";
import { Maximize2, Minimize2, ZoomIn, ZoomOut, X } from "lucide-react";

export function LocationMapPicker({ value, onChange, mapUrl, height = "max-h-[280px]" }: {
  value: { x: number; y: number } | null;
  onChange: (v: { x: number; y: number } | null) => void;
  mapUrl?: string | null;
  height?: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const src = mapUrl || MAP_TEXTURE_URL;
  const [zoom, setZoom] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  // Compute pixel coords from pointer position relative to image's rendered rect.
  const computePoint = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    const img = imgRef.current;
    if (!img) return null;
    const r = img.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    const imgX = ((clientX - r.left) / r.width) * IMG_W;
    const imgY = ((clientY - r.top) / r.height) * IMG_H;
    const x = Math.round(imgX);
    const y = Math.round(imgY);
    if (x < 0 || x > IMG_W || y < 0 || y > IMG_H) return null;
    return { x, y };
  }, []);

  // Click vs drag detection
  const downRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const movedRef = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    downRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    movedRef.current = false;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const down = downRef.current;
    if (!down) return;
    if (Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 6) {
      movedRef.current = true;
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    const down = downRef.current;
    downRef.current = null;
    if (!down) return;
    if (movedRef.current) return;
    const pt = computePoint(e.clientX, e.clientY);
    if (pt) onChange(pt);
  }, [computePoint, onChange]);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(4, z + 0.5)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(0.5, z - 0.5)), []);
  const handleToggleFullscreen = useCallback(() => setFullscreen((f) => !f), []);
  const handlePointRemove = useCallback(() => onChange(null), [onChange]);

  const toolbar = (
    <div className="flex items-center gap-1">
      <button type="button" className="text-muted-foreground hover:text-foreground rounded p-1 hover:bg-muted"
        onClick={handleZoomOut} title="Uzaklaştır">
        <ZoomOut className="w-4 h-4" />
      </button>
      <span className="text-xs text-muted-foreground w-8 text-center tabular-nums">{zoom}x</span>
      <button type="button" className="text-muted-foreground hover:text-foreground rounded p-1 hover:bg-muted"
        onClick={handleZoomIn} title="Yakınlaştır">
        <ZoomIn className="w-4 h-4" />
      </button>
      <button type="button" className="text-muted-foreground hover:text-foreground rounded p-1 hover:bg-muted"
        onClick={handleToggleFullscreen} title={fullscreen ? "Küçült" : "Tam ekran"}>
        {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </button>
    </div>
  );

  const containerClass = fullscreen
    ? "flex-1 min-h-0 overflow-auto touch-pan"
    : `${height} overflow-auto touch-pan`;

  // Wrapper sized exactly to image; marker positioned relative to it → scrolls with image.
  const imgW = IMG_W * zoom;
  const imgH = IMG_H * zoom;

  const marker = value && (
    <div
      className="absolute z-10 pointer-events-none"
      style={{
        left: (value.x / IMG_W) * 100 + "%",
        top: (value.y / IMG_H) * 100 + "%",
      }}
    >
      <div className="-translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-accent border-[3px] border-white shadow-md flex items-center justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-white" />
      </div>
    </div>
  );

  const mapEl = (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={`relative cursor-crosshair rounded-xl border-2 border-border bg-white overflow-auto ${containerClass}`}
    >
      {/* Inner wrapper = exact image size. Image + marker both live here → scroll together. */}
      <div className="relative" style={{ width: imgW, height: imgH }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- runtime URL */}
        <img
          ref={imgRef}
          src={src}
          alt="Harita"
          className="block select-none"
          style={{ width: imgW, height: imgH }}
          draggable={false}
        />
        {marker}
      </div>
    </div>
  );

  const fullscreenOverlay = fullscreen && createPortal(
    <div className="fixed inset-0 z-[200] bg-black/85 flex flex-col p-3 sm:p-5">
      <div className="flex items-center justify-between text-white shrink-0 mb-2 gap-2">
        <p className="text-xs sm:text-sm font-medium truncate">
          Haritaya tıklayarak konum seçin.
          {value ? ` Seçili: (${value.x}, ${value.y})` : " Nokta seçilmedi."}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {toolbar}
          <button type="button" className="bg-white/20 hover:bg-white/30 text-white rounded-full p-2 ml-1"
            onClick={() => setFullscreen(false)} title="Kapat">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
      {mapEl}
      {value && (
        <button type="button" className="text-white/70 hover:text-white underline text-xs sm:text-sm mt-2 self-start"
          onClick={handlePointRemove}>
          Noktayı kaldır
        </button>
      )}
    </div>,
    document.body
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Haritaya tıklayarak konum noktası seçin.
          {value ? ` Seçili: (${value.x}, ${value.y})` : " Henüz nokta seçilmedi."}
        </p>
        {toolbar}
      </div>
      {mapEl}
      {value && (
        <button type="button" className="text-xs text-destructive underline" onClick={handlePointRemove}>
          Harita noktasını kaldır
        </button>
      )}
      {fullscreenOverlay}
    </div>
  );
}
