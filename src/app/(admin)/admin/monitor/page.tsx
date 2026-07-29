"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { MonitorMap3D, type MapSelection, type MonitorMapControls } from "@/components/monitor/monitor-map-3d";
import { useMonitorState, initialMonitorData } from "@/hooks/use-monitor-state";
import { playNotificationSound } from "@/lib/notification-sound";
import { Bell, BellOff, Maximize2, Minimize2, Car, MapPin, Clock, User, Wifi, WifiOff, Map as MapIcon, Settings as SettingsIcon, PanelRight, Lock, Unlock } from "lucide-react";
import { useRouter } from "next/navigation";

function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function fmtWait(requestedAt: string, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(requestedAt).getTime()) / 1000));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} dk ${s % 60} sn` : `${s} sn`;
}

export default function MonitorPage() {
  const router = useRouter();
  const [monitorEnabled, setMonitorEnabled] = useState<boolean | null>(null);
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [mapControls, setMapControls] = useState<MonitorMapControls | null>(null);
  const [selection, setSelection] = useState<MapSelection>(null);
  const now = useNow();

  const { data, connected } = useMonitorState({
    onNewRequest: () => { if (!mutedRef.current) playNotificationSound("notification"); },
  });

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setMonitorEnabled(json.data.monitor_enabled !== "false");
          const mUrl = json.data.monitor_map_url;
          setMapUrl(mUrl && mUrl !== "" ? mUrl : null);
        }
      })
      .catch(() => setMonitorEnabled(true));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pending = data.requests.filter((r) => r.status === "PENDING");
  const accepted = data.requests.filter((r) => r.status === "ACCEPTED");
  // Sadece MUSAIT durumda olan araçlar listelensin (sofor giris yapmis olmali)
  const availableBuggies = data.buggies.filter((b) => b.status === "AVAILABLE");
  const locName = useMemo(() => new Map(data.locations.map((l) => [l.id, l.name])), [data.locations]);
  const unmappedIds = useMemo(() => new Set(data.locations.filter((l) => l.mapX == null || l.mapY == null).map((l) => l.id)), [data.locations]);
  const noLocationBuggies = availableBuggies.filter((b) => b.currentLocationId == null);

  const statusTr: Record<string, string> = {
    AVAILABLE: "Musait",
    BUSY: "Mesgul",
    OFFLINE: "Cevrimdisi",
    MAINTENANCE: "Bakimda",
    PENDING: "Bekliyor",
    ACCEPTED: "Kabul edildi",
  };

  if (data === initialMonitorData || monitorEnabled === null) return <Loading fullPage />;

  if (!monitorEnabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
        <div className="rounded-full bg-muted p-6">
          <MapIcon className="w-12 h-12 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-center">Canlı Harita İzleme Kapalı</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Canlı harita izleme özelliği şu anda devre dışı. Aktif etmek için ayarlar
          sayfasından &quot;Canlı Harita İzleme&quot; seçeneğini açın.
        </p>
        <Button onClick={() => router.push("/admin/settings")}>
          <SettingsIcon className="w-4 h-4 mr-1" /> Ayarlara Git
        </Button>
      </div>
    );
  }

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-background p-2 md:p-4 flex flex-col gap-2 md:gap-4" : "space-y-4"}>
      <div className={fullscreen ? "flex-1 min-h-0 relative" : "relative"}>
        {/* harita — tam alan */}
        <Card className="overflow-hidden h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
          <CardContent className="p-0 h-full relative">
            <MonitorMap3D
              locations={data.locations}
              buggies={data.buggies}
              calls={data.requests}
              selection={selection}
              onSelect={setSelection}
              mapUrl={mapUrl}
              controls={setMapControls}
            />

            {/* Üst sol overlay: durum + sayaçlar + kontroller */}
            <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 max-w-[calc(100%-3rem)]">
              <div className="glass-panel rounded-lg border border-border shadow-sm px-2.5 py-1 flex items-center gap-2">
                <Badge variant={connected ? "success" : "destructive"} className="gap-1 text-[10px] shrink-0">
                  {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  <span className="hidden sm:inline">{connected ? "Canlı" : "Bağ. yok"}</span>
                </Badge>
                <span className="flex items-center gap-0.5 text-xs font-semibold shrink-0"><Bell className="w-3.5 h-3.5 text-red-500" />{pending.length}</span>
                <span className="flex items-center gap-0.5 text-xs font-semibold shrink-0"><Car className="w-3.5 h-3.5 text-emerald-600" />{availableBuggies.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setMuted((m) => !m)} title={muted ? "Sesi aç" : "Sesi kapat"}
                  className="glass-panel rounded-lg border border-border shadow-sm px-2 py-1.5 text-xs font-medium flex items-center gap-1 hover:bg-white/90 transition-colors">
                  {muted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                  <span className="hidden md:inline">{muted ? "Sesi aç" : "Sesi kapat"}</span>
                </button>
                <button onClick={() => setFullscreen((f) => !f)} title={fullscreen ? "Küçült" : "Tam ekran"}
                  className="glass-panel rounded-lg border border-border shadow-sm px-2 py-1.5 text-xs font-medium flex items-center gap-1 hover:bg-white/90 transition-colors">
                  {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span className="hidden md:inline">{fullscreen ? "Küçült" : "Tam ekran"}</span>
                </button>
                <button onClick={() => setPanelOpen((p) => !p)} title={panelOpen ? "Paneli kapat" : "Paneli aç"}
                  className="glass-panel rounded-lg border border-border shadow-sm px-2 py-1.5 text-xs font-medium flex items-center gap-1 hover:bg-white/90 transition-colors">
                  <PanelRight className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">{panelOpen ? "Paneli kapat" : "Panel"}</span>
                </button>
              </div>
            </div>

            {/* Sağ üst: görünüm kilidi + araç boyutu */}
            {mapControls && (
              <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                <button
                  onClick={() => mapControls.toggleViewLock()}
                  title={mapControls.viewLocked ? "Görünümü kilidi aç" : "Görünümü kilitle"}
                  className={`glass-panel rounded-lg border shadow-sm px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1 transition-colors ${mapControls.viewLocked ? "bg-amber-100 border-amber-300 text-amber-900" : "border-border hover:bg-white/90"}`}
                >
                  {mapControls.viewLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{mapControls.viewLocked ? "Kilitli" : "Serbest"}</span>
                </button>
                <label className="glass-panel rounded-lg border border-border shadow-sm px-2.5 py-1 flex items-center gap-1.5 text-xs font-semibold">
                  <Car className="w-3.5 h-3.5" />
                  <input
                    type="range" min={0.45} max={3} step={0.05}
                    value={mapControls.vehicleSize}
                    onChange={(e) => mapControls.setVehicleSize(Number(e.target.value))}
                    className="w-16 accent-accent"
                  />
                </label>
              </div>
            )}

            {/* Sağ panel overlay: çağrılar + araçlar (toggle ile) */}
            {panelOpen && (
              <div className="absolute top-14 right-3 bottom-3 z-20 w-[280px] max-w-[calc(100vw-1.5rem)] flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                <div className="glass-panel rounded-xl border border-border shadow-sm">
                  <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                    <Bell className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-semibold">Bekleyen Çağrılar</span>
                    <Badge variant="default" className="ml-auto">{pending.length}</Badge>
                  </div>
                  <div className="p-2 space-y-1.5 max-h-[30vh] overflow-y-auto custom-scrollbar">
                    {pending.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Bekleyen çağrı yok</p>}
                    {pending.map((r) => (
                      <button key={r.id} onClick={() => setSelection({ kind: "call", id: r.id })}
                              className={`w-full text-left rounded-lg border p-2 text-xs transition-colors ${selection?.kind === "call" && selection.id === r.id ? "border-red-500 bg-red-500/10" : "border-border hover:bg-muted"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold flex items-center gap-1"><User className="w-3 h-3" />{r.guestName || "Misafir"}{r.roomNumber ? ` · ${r.roomNumber}` : ""}</span>
                          <span className="text-red-500 flex items-center gap-0.5"><Clock className="w-3 h-3" />{fmtWait(r.requestedAt, now)}</span>
                        </div>
                        <div className="text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{locName.get(r.locationId) || "?"}
                          {unmappedIds.has(r.locationId) && <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">haritada yok</Badge>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="glass-panel rounded-xl border border-border shadow-sm">
                  <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                    <span className="text-sm font-semibold">Kabul Edilenler</span>
                    <Badge variant="secondary" className="ml-auto">{accepted.length}</Badge>
                  </div>
                  <div className="p-2 space-y-1.5 max-h-[25vh] overflow-y-auto custom-scrollbar">
                    {accepted.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Aktif yolculuk yok</p>}
                    {accepted.map((r) => {
                      const buggy = data.buggies.find((b) => b.id === r.buggyId);
                      return (
                        <button key={r.id} onClick={() => setSelection({ kind: "call", id: r.id })}
                                className="w-full text-left rounded-lg border border-border p-2 text-xs hover:bg-muted transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold">{r.guestName || "Misafir"}</span>
                            <Badge variant="default">{buggy?.code || "--"}</Badge>
                          </div>
                          <div className="text-muted-foreground mt-0.5">{locName.get(r.locationId) || "?"}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="glass-panel rounded-xl border border-border shadow-sm">
                  <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    <span className="text-sm font-semibold">Müsait Araçlar</span>
                    <Badge variant="success" className="ml-auto">{availableBuggies.length}</Badge>
                  </div>
                  <div className="p-2 space-y-1.5 max-h-[30vh] overflow-y-auto custom-scrollbar">
                    {availableBuggies.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Müsait araç yok</p>}
                    {availableBuggies.map((b) => (
                      <button key={b.id} onClick={() => setSelection({ kind: "buggy", id: b.id })}
                              className={`w-full text-left rounded-lg border p-2 text-xs transition-colors ${selection?.kind === "buggy" && selection.id === b.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{b.icon} {b.code}</span>
                          <Badge variant="success">{statusTr[b.status]}</Badge>
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                          {b.drivers[0]?.fullName || "Şoför yok"}
                          {b.drivers[0]?.driverStatus === "OFF_DUTY" && " · Servis dışı"}
                        </div>
                      </button>
                    ))}
                    {noLocationBuggies.length > 0 && (
                      <p className="text-[10px] text-muted-foreground pt-1">{noLocationBuggies.length} araç henüz konum bildirmedi.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
