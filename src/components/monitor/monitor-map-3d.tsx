"use client";

import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import * as THREE from "three";
import { CANONICAL_STOPS } from "./map-static";
import { pxToWorld, buildStaticScene, disposeObject3D } from "./map-3d-static";

// --------------- types ---------------

export interface MapLocation {
  id: number;
  name: string;
  mapX: number | null;
  mapY: number | null;
}

export interface MapBuggy {
  id: number;
  code: string;
  icon: string | null;
  status: "AVAILABLE" | "BUSY" | "OFFLINE" | "MAINTENANCE";
  currentLocationId: number | null;
  gpsLat?: number | null;
  gpsLng?: number | null;
}

export interface MapCall {
  id: number;
  status: "PENDING" | "ACCEPTED";
  locationId: number;
  buggyId: number | null;
  guestName: string | null;
  roomNumber: string | null;
}

export type MapSelection = { kind: "call" | "buggy"; id: number } | null;

// --------------- colors ---------------

const BUGGY_COLORS: Record<MapBuggy["status"], number> = {
  AVAILABLE: 0x22c55e,
  BUSY: 0xf97316,
  OFFLINE: 0x6b7280,
  MAINTENANCE: 0x6b7280,
};

const CART_PALETTE = [
  0x111111, 0x0b3d91, 0xe8412f, 0xffd84d, 0x00b36b, 0xf97316,
  0x8e44ad, 0xf7f7f2, 0x20c7d9, 0xff4fa3, 0x30343b, 0x2563eb,
];

// --------------- sprite textures ---------------

let callPendingTex: THREE.CanvasTexture | null = null;
let callAcceptedTex: THREE.CanvasTexture | null = null;
function getCallTex(pending: boolean): THREE.CanvasTexture {
  if (pending && callPendingTex) return callPendingTex;
  if (!pending && callAcceptedTex) return callAcceptedTex;
  const c = document.createElement("canvas");
  c.width = 256; c.height = 256;
  const ctx = c.getContext("2d")!;
  // dış halka (pulse efekti)
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.50)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  ctx.fillStyle = pending ? "rgba(239,68,68,.22)" : "rgba(59,130,246,.22)";
  ctx.beginPath(); ctx.arc(128, 96, 64, 0, Math.PI * 2); ctx.fill();
  // ana daire
  ctx.fillStyle = pending ? "#ef4444" : "#3b82f6";
  ctx.beginPath(); ctx.arc(128, 96, 52, 0, Math.PI * 2); ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = "#fff"; ctx.stroke();
  ctx.restore();
  // pin-drop alt
  ctx.fillStyle = pending ? "#ef4444" : "#3b82f6";
  ctx.beginPath(); ctx.moveTo(76, 100); ctx.lineTo(128, 215); ctx.lineTo(180, 100); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = "#fff"; ctx.stroke();
  // ikon
  ctx.fillStyle = "#fff";
  ctx.font = "900 56px sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(pending ? "🔔" : "✅", 128, 93);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (pending) callPendingTex = tex;
  else callAcceptedTex = tex;
  return tex;
}

const pinTexCache = new Map<number, THREE.CanvasTexture>();
function getPinTex(num: number): THREE.CanvasTexture {
  const c = pinTexCache.get(num);
  if (c) return c;
  const canvas = document.createElement("canvas");
  canvas.width = 192; canvas.height = 248;
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.55)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 8;
  const cx = 96, cy = 70, r = 48;
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.82, Math.PI * 2.18, false);
  ctx.quadraticCurveTo(136, 128, cx, 206);
  ctx.quadraticCurveTo(56, 128, 50, 70);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 18, 0, 176);
  grad.addColorStop(0, "#ff7966"); grad.addColorStop(1, "#d71918");
  ctx.fillStyle = grad; ctx.fill();
  ctx.lineWidth = 8; ctx.strokeStyle = "white"; ctx.stroke();
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, 31, 0, Math.PI * 2); ctx.fillStyle = "white"; ctx.fill();
  ctx.lineWidth = 5; ctx.strokeStyle = "rgba(0,0,0,.13)"; ctx.stroke();
  ctx.fillStyle = "#1b1b1b"; ctx.font = "900 38px Inter, Arial, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(String(num), cx, cy + 1);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  pinTexCache.set(num, tex);
  return tex;
}

// --------------- helpers ---------------

interface PinCoord { n: number; name: string; x: number; y: number; locId?: number }

function normName(v: string) {
  return v
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function buildPinCoords(locations: MapLocation[]): PinCoord[] {
  const byName = new Map(locations.map((l) => [normName(l.name), l]));
  return CANONICAL_STOPS.map((s) => {
    const dbLoc = byName.get(normName(s.name));
    // Önemli: DB'deki eski mapX/mapY değerlerini burada kullanmıyoruz.
    // Temiz harita ve 3D açı için kalibre edilen canonical koordinatlar kullanılıyor;
    // DB sadece locationId eşleştirmesi için okunuyor.
    return { n: s.n, name: s.name, x: s.x, y: s.y, locId: dbLoc?.id };
  });
}

// --------------- component ---------------

interface SceneCtx {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  buggyGroup: THREE.Group;
  callGroup: THREE.Group;
  pinGroup: THREE.Group;
  staticRoot?: THREE.Group;
  animId: number;
  destroyed: boolean;
  viewLocked: boolean;
  toggleViewLock: () => void;
  resetCam3D: () => void;
  resetCamTop: () => void;
}

export function MonitorMap3D({
  locations,
  buggies,
  calls,
  selection,
  onSelect,
  mapUrl,
}: {
  locations: MapLocation[];
  buggies: MapBuggy[];
  calls: MapCall[];
  selection: MapSelection;
  onSelect?: (sel: MapSelection) => void;
  mapUrl?: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<SceneCtx | null>(null);
  const [viewLocked, setViewLocked] = useState(true);
  const [panelHidden, setPanelHidden] = useState(true);
  const [showPins, setShowPins] = useState(true);
  const [vehicleSize, setVehicleSize] = useState(1.75);
  const [speedFactor, setSpeedFactor] = useState(0.5);
  const speedRef = useRef(0.5);

  const pinCoords = useMemo(() => buildPinCoords(locations), [locations]);
  const coordOf = useMemo(() => {
    const m = new Map<number, { x: number; y: number }>();
    for (const p of pinCoords) { if (p.locId != null) m.set(p.locId, { x: p.x, y: p.y }); }
    return m;
  }, [pinCoords]);

  // --- init ---
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth, h = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x143321);
    // Zoom out sırasında görüntü kararmasın diye fog kapalı.
    scene.fog = null;

    const camera = new THREE.PerspectiveCamera(50, w / h, 1, 500);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Reference-style lights
    scene.add(new THREE.HemisphereLight(0xf4fff8, 0x31543d, 2.45));
    const sun = new THREE.DirectionalLight(0xffffff, 2.6);
    sun.position.set(-35, 90, 55); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
    sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0x7dffb6, 0.9);
    rim.position.set(65, 45, -35); scene.add(rim);

    // layers
    const buggyGroup = new THREE.Group(); buggyGroup.name = "buggies"; scene.add(buggyGroup);
    const callGroup = new THREE.Group(); callGroup.name = "calls"; scene.add(callGroup);
    const pinGroup = new THREE.Group(); pinGroup.name = "pins"; scene.add(pinGroup);

    // camera state
    let spherical = { radius: 70, theta: 0.35, phi: THREE.MathUtils.degToRad(52) };
    const target = new THREE.Vector3();
    let locked = true;

    function updateCam() {
      camera.position.set(
        target.x + spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta),
        target.y + spherical.radius * Math.cos(spherical.phi),
        target.z + spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta),
      );
      camera.lookAt(target);
    }

    // resize internal: camera merkez tutulur, FOV genişler
    const ctx: SceneCtx = {
      scene, camera, renderer, buggyGroup, callGroup, pinGroup,
      animId: 0, destroyed: false,
      get viewLocked() { return locked; },
      toggleViewLock() { locked = !locked; setViewLocked(locked); },
      resetCam3D() { spherical = { radius: 70, theta: 0.35, phi: THREE.MathUtils.degToRad(52) }; target.set(0, 0, 0); updateCam(); },
      resetCamTop() { spherical = { radius: 80, theta: 0, phi: THREE.MathUtils.degToRad(1) }; target.set(0, 0, 0); updateCam(); },
    };
    ctxRef.current = ctx;

    // static scene
    buildStaticScene((root) => { if (!ctx.destroyed) { ctx.staticRoot = root; scene.add(root); } }, mapUrl);

    // --- orbit controls (reference-style) ---
    let dragging = false, panMode = false, lx = 0, ly = 0;
    const canvas = renderer.domElement;
    canvas.addEventListener("pointerdown", (e) => {
      if (locked) return;
      dragging = true; panMode = e.button === 1 || e.button === 2 || e.shiftKey;
      lx = e.clientX; ly = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("pointerup", () => { dragging = false; });
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging || locked) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      if (panMode) {
        const spd = spherical.radius * 0.00075;
        const right = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).multiplyScalar(-dx * spd);
        const up = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 1).multiplyScalar(dy * spd);
        target.add(right).add(up);
      } else {
        spherical.theta -= dx * 0.006;
        spherical.phi = THREE.MathUtils.clamp(spherical.phi + dy * 0.0045, THREE.MathUtils.degToRad(14), THREE.MathUtils.degToRad(88));
      }
      updateCam();
    });
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (locked) return;
      spherical.radius = THREE.MathUtils.clamp(spherical.radius * (1 + e.deltaY * 0.001), 25, 180);
      updateCam();
    }, { passive: false });

    updateCam();

    function animate() {
      if (!ctx.destroyed) {
        ctx.animId = requestAnimationFrame(animate);
        // Canlı hissi için statik araç tekerlekleri hafif döner; hız slider'ı bunu da etkiler.
        for (const cart of buggyGroup.children) {
          const wheels = cart.userData?.wheels as THREE.Mesh[] | undefined;
          wheels?.forEach((wh) => { wh.rotation.z -= 0.018 * speedRef.current; });
        }
        renderer.render(scene, camera);
      }
    }
    animate();

    const onResize = () => {
      if (ctx.destroyed) return;
      camera.aspect = container.clientWidth / (container.clientHeight || 600);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight || 600);
    };
    window.addEventListener("resize", onResize);

    return () => {
      ctx.destroyed = true; cancelAnimationFrame(ctx.animId);
      window.removeEventListener("resize", onResize);
      if (ctx.staticRoot) disposeObject3D(ctx.staticRoot);
      disposeObject3D(buggyGroup); disposeObject3D(callGroup); disposeObject3D(pinGroup);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => { speedRef.current = speedFactor; }, [speedFactor]);

  // --- marker updates ---

  const buggyOffset = useMemo(() => {
    const byLoc = new Map<number, MapBuggy[]>();
    for (const b of buggies) {
      if (b.currentLocationId == null || !coordOf.has(b.currentLocationId)) continue;
      if (!byLoc.has(b.currentLocationId)) byLoc.set(b.currentLocationId, []);
      byLoc.get(b.currentLocationId)!.push(b);
    }
    const offs = new Map<number, number>();
    for (const [, arr] of byLoc) arr.forEach((b, i) => offs.set(b.id, (i - (arr.length - 1) / 2) * 2.5));
    return offs;
  }, [buggies, coordOf]);

  const updateBuggies = useCallback(() => {
    const c = ctxRef.current; if (!c) return;
    // dispose old
    c.buggyGroup.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry?.dispose(); if (Array.isArray(o.material)) o.material.forEach(m => m.dispose()); else o.material?.dispose(); } });
    c.buggyGroup.clear();

    let colorIdx = 0;
    for (const b of buggies) {
      const loc = coordOf.get(b.currentLocationId ?? -1);
      if (!loc) continue;
      const ox = buggyOffset.get(b.id) ?? 0;

      // Bizim oluşturduğumuz shuttle/golf-cart görseli: tüm durumlarda sprite olarak kullanılır.
      // Böylece ekranda küp/blok araç değil, istenen ikon görünür.
      const color = b.status === "AVAILABLE" ? CART_PALETTE[colorIdx++ % CART_PALETTE.length] : BUGGY_COLORS[b.status];
      const tex = getBuggySprite(b.code, color);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
      const p = pxToWorld(loc.x + ox, loc.y, 2.0);
      spr.position.copy(p);
      spr.center.set(0.5, 0.36);
      spr.scale.set(4.2 * vehicleSize, 3.15 * vehicleSize, 1);
      spr.renderOrder = 120;
      spr.userData = { kind: "buggy", id: b.id, code: b.code, status: b.status };
      c.buggyGroup.add(spr);
    }
  }, [buggies, coordOf, buggyOffset, vehicleSize]);

  const updateCalls = useCallback(() => {
    const c = ctxRef.current; if (!c) return;
    while (c.callGroup.children.length) {
      const ch = c.callGroup.children[0];
      if (ch instanceof THREE.Sprite) { (ch.material as THREE.SpriteMaterial).map?.dispose(); (ch.material as THREE.SpriteMaterial).dispose(); }
      c.callGroup.remove(ch);
    }
    for (const r of calls) {
      const loc = coordOf.get(r.locationId); if (!loc) continue;
      const tex = getCallTex(r.status === "PENDING");
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
      const p = pxToWorld(loc.x, loc.y - 24, 1.8);
      spr.position.copy(p); spr.scale.set(8, 8, 1); spr.renderOrder = 110;
      spr.userData = { kind: "call", id: r.id, status: r.status, guestName: r.guestName, roomNumber: r.roomNumber };
      c.callGroup.add(spr);
    }
  }, [calls, coordOf]);

  const updatePins = useCallback(() => {
    const c = ctxRef.current; if (!c) return;
    while (c.pinGroup.children.length) {
      const ch = c.pinGroup.children[0];
      if (ch instanceof THREE.Sprite) { (ch.material as THREE.SpriteMaterial).map?.dispose(); (ch.material as THREE.SpriteMaterial).dispose(); }
      c.pinGroup.remove(ch);
    }
    c.pinGroup.visible = showPins;
    for (const s of pinCoords) {
      const tex = getPinTex(s.n);
      const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
      const p = pxToWorld(s.x, s.y, 0.35);
      spr.position.set(p.x, p.y, p.z);
      // Sprite merkezini pinin ucuna yaklaştırıyoruz; böylece lokasyon noktası kaymış görünmez.
      spr.center.set(0.5, 0.17);
      spr.scale.set(5.2, 6.7, 1); spr.renderOrder = 90;
      spr.userData = { name: s.name, n: s.n };
      c.pinGroup.add(spr);
    }
  }, [pinCoords, showPins]);

  useEffect(() => { updateBuggies(); updateCalls(); updatePins(); }, [updateBuggies, updateCalls, updatePins]);

  useEffect(() => { const c = ctxRef.current; if (c) c.pinGroup.visible = showPins; }, [showPins]);

  // PENDING call pulse
  useEffect(() => {
    const c = ctxRef.current; if (!c) return;
    let frame: number; const t0 = performance.now();
    const cm = c.callGroup; const destroyed = c.destroyed;
    function pulse(t: number) {
      if (destroyed) return;
      frame = requestAnimationFrame(pulse);
      const e = (t - t0) / 1000;
      for (const ch of cm.children) {
        if (!(ch instanceof THREE.Sprite) || ch.userData.kind !== "call" || ch.userData.status !== "PENDING") continue;
        const s = 1 + Math.sin(e * 4) * 0.15;
        ch.scale.set(8 * s, 8 * s, 1);
        ch.material.opacity = 0.6 + Math.sin(e * 4) * 0.4;
      }
    }
    frame = requestAnimationFrame(pulse);
    return () => cancelAnimationFrame(frame);
  }, [calls]);

  // click raycast
  const handleClick = useCallback((e: React.MouseEvent) => {
    const c = ctxRef.current; if (!c || !onSelect) return;
    const rect = c.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const rc = new THREE.Raycaster();
    rc.setFromCamera(mouse, c.camera);
    const hits = rc.intersectObjects([...c.buggyGroup.children, ...c.callGroup.children], true);
    if (hits.length > 0) {
      // walk up to find userData
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj) {
        if (obj.userData?.kind === "buggy") { onSelect({ kind: "buggy", id: obj.userData.id }); return; }
        if (obj.userData?.kind === "call") { onSelect({ kind: "call", id: obj.userData.id }); return; }
        obj = obj.parent;
      }
    }
    onSelect(null);
  }, [onSelect]);

  return (
    <div className="relative w-full h-full" style={{ minHeight: "600px" }}>
      <div ref={containerRef} onClick={handleClick}
           className={`w-full h-full ${viewLocked ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}`} />

      {/* help hint — üstte */}
      <div className={`absolute top-3 left-3 z-10 transition-opacity duration-300 pointer-events-none ${panelHidden ? "opacity-0" : "opacity-100"}`}>
        <div className="bg-black/60 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10 text-white/80 text-xs leading-relaxed max-w-[420px]">
          🖱️ Mouse: döndür · tekerlek: zoom · sağ/sol sürükle: pan · Shift+sürükle: pan
        </div>
      </div>

      {/* controls bar */}
      <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-10 transition-all duration-300 pointer-events-auto ${panelHidden ? "translate-y-24 opacity-0 pointer-events-none" : "opacity-100"}`}>
        <div className="flex flex-wrap items-center justify-center gap-2 bg-black/65 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/10 max-w-[min(980px,calc(100vw-2rem))]">
          <button onClick={() => ctxRef.current?.toggleViewLock()}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${viewLocked ? "bg-yellow-500 text-black border-yellow-400" : "bg-white/10 text-white border-white/20 hover:bg-white/20"}`}>
            {viewLocked ? "🔒 Kilitli" : "🔓 Görünümü Kilitle"}
          </button>
          <button onClick={() => { if (ctxRef.current && !ctxRef.current.viewLocked) ctxRef.current.resetCam3D(); }}
                  className="px-3 py-1.5 text-xs font-bold rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20">
            3D Kamera
          </button>
          <button onClick={() => { if (ctxRef.current && !ctxRef.current.viewLocked) ctxRef.current.resetCamTop(); }}
                  className="px-3 py-1.5 text-xs font-bold rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20">
            Üstten 2D
          </button>
          <button onClick={() => setShowPins((v) => !v)}
                  className="px-3 py-1.5 text-xs font-bold rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20">
            {showPins ? "Pinleri Gizle" : "Pinleri Göster"}
          </button>
          <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-full bg-white/10 text-white border border-white/20">
            Hız
            <input className="w-20 accent-emerald-400" type="range" min="0.25" max="2.5" step="0.05" value={speedFactor} onChange={(e) => setSpeedFactor(Number(e.target.value))} />
            <span className="tabular-nums">{speedFactor.toFixed(2)}×</span>
          </label>
          <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-full bg-white/10 text-white border border-white/20">
            Boyut
            <input className="w-24 accent-emerald-400" type="range" min="0.45" max="3" step="0.05" value={vehicleSize} onChange={(e) => setVehicleSize(Number(e.target.value))} />
            <span className="tabular-nums">{vehicleSize.toFixed(2)}×</span>
          </label>
          <button onClick={() => setPanelHidden(true)}
                  className="px-3 py-1.5 text-xs font-bold rounded-full bg-white/10 text-white border border-white/20 hover:bg-white/20">
            Paneli Gizle
          </button>
        </div>
      </div>
      {panelHidden && (
        <button onClick={() => setPanelHidden(false)}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 text-xs font-bold rounded-full bg-emerald-300 text-emerald-950 shadow-lg pointer-events-auto">
          Paneli Göster
        </button>
      )}
    </div>
  );
}

// --------------- buggy sprite (used for non-AVAILABLE) ---------------
const buggySpriteCache = new Map<string, THREE.CanvasTexture>();
function getBuggySprite(code: string, color: number): THREE.CanvasTexture {
  const key = `${code}_${color}`;
  const cached = buggySpriteCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 192;
  const ctx = canvas.getContext("2d")!;
  const col = "#" + color.toString(16).padStart(6, "0");

  // Gölge + beyaz kontur: harita üstünde daha belirgin durur.
  ctx.save();
  ctx.translate(128, 108);
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };
  ctx.shadowColor = "rgba(0,0,0,.55)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;

  const drawCart = (fill: string, stroke: string, lw: number) => {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.fillStyle = fill;

    // Tavan
    rr(-78, -70, 156, 24, 13);
    ctx.fill(); ctx.stroke();

    // Direkler
    ctx.beginPath();
    ctx.moveTo(-56, -46); ctx.lineTo(-56, 28);
    ctx.moveTo(58, -46); ctx.lineTo(58, 30);
    ctx.stroke();

    // Gövde
    ctx.beginPath();
    ctx.moveTo(-78, 28);
    ctx.quadraticCurveTo(-68, -4, -30, 0);
    ctx.lineTo(14, 0);
    ctx.quadraticCurveTo(42, 2, 54, 24);
    ctx.lineTo(76, 24);
    ctx.quadraticCurveTo(88, 24, 88, 38);
    ctx.lineTo(88, 46);
    ctx.quadraticCurveTo(84, 62, 66, 62);
    ctx.lineTo(-72, 62);
    ctx.quadraticCurveTo(-84, 58, -82, 44);
    ctx.quadraticCurveTo(-82, 35, -78, 28);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // Koltuk
    rr(-18, -4, 28, 46, 8);
    ctx.fill(); ctx.stroke();

    // Ön cam/kaput çizgisi
    ctx.beginPath();
    ctx.moveTo(24, 0); ctx.lineTo(50, -26); ctx.lineTo(66, -12);
    ctx.stroke();

    // Tekerlekler
    ctx.fillStyle = "#111";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(-50, 66, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(54, 66, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = "#f7f7f2";
    ctx.beginPath(); ctx.arc(-50, 66, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(54, 66, 9, 0, Math.PI * 2); ctx.fill();
  };

  // Önce beyaz dış kontur, sonra renkli gövde.
  drawCart("#ffffff", "#ffffff", 15);
  drawCart(col, "rgba(0,0,0,.42)", 4);

  // Kod etiketi
  const label = code?.replace(/^B/i, "") || "";
  if (label) {
    ctx.fillStyle = "rgba(0,0,0,.72)";
    rr(-22, 10, 46, 22, 8); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.font = "900 15px Inter, Arial, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, 1, 22);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  buggySpriteCache.set(key, tex);
  return tex;
}
