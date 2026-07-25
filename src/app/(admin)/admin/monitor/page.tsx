"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { MonitorMap, type MapSelection } from "@/components/monitor/monitor-map";
import { useMonitorState, initialMonitorData } from "@/hooks/use-monitor-state";
import { playNotificationSound } from "@/lib/notification-sound";
import { Bell, BellOff, Maximize2, Minimize2, Car, MapPin, Clock, User, Wifi, WifiOff } from "lucide-react";

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
  const [muted, setMuted] = useState(false);
  const mutedRef = useState(() => ({ current: false }))[0];
  const [fullscreen, setFullscreen] = useState(false);
  const [selection, setSelection] = useState<MapSelection>(null);
  const now = useNow();

  const { data, connected } = useMonitorState({
    onNewRequest: () => { if (!mutedRef.current) playNotificationSound("notification"); },
  });

  useEffect(() => { mutedRef.current = muted; }, [muted]);

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

  if (data === initialMonitorData) return <Loading fullPage />;

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-background p-4 flex flex-col gap-4" : "space-y-4"}>
      {/* top bar */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Canli Harita</h1>
        <Badge variant={connected ? "default" : "destructive"} className="gap-1">
          {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {connected ? "Canli" : "Baglanti yok"}
        </Badge>
        <div className="flex items-center gap-4 ml-auto text-sm">
          <span className="flex items-center gap-1.5"><Bell className="w-4 h-4 text-red-500" /><b>{pending.length}</b> bekleyen</span>
          <span className="flex items-center gap-1.5"><Car className="w-4 h-4 text-emerald-600" /><b>{availableBuggies.length}</b> musait arac</span>
          <Button size="sm" variant="outline" onClick={() => setMuted((m) => !m)}>
            {muted ? <BellOff className="w-4 h-4 mr-1" /> : <Bell className="w-4 h-4 mr-1" />}
            {muted ? "Ses kapali" : "Ses acik"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setFullscreen((f) => !f)}>
            {fullscreen ? <Minimize2 className="w-4 h-4 mr-1" /> : <Maximize2 className="w-4 h-4 mr-1" />}
            {fullscreen ? "Kucult" : "Tam ekran"}
          </Button>
        </div>
      </div>

      <div className={fullscreen ? "flex-1 min-h-0" : "grid gap-4 lg:grid-cols-[1fr_340px]"}>
        {/* harita */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 h-full">
            <MonitorMap
              locations={data.locations}
              buggies={data.buggies}
              calls={data.requests}
              selection={selection}
              onSelect={setSelection}
            />
          </CardContent>
        </Card>

        {/* side panel */}
        {!fullscreen && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-red-500" /> Bekleyen Cagrilar ({pending.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {pending.length === 0 && <p className="text-sm text-muted-foreground">Bekleyen cagri yok</p>}
                {pending.map((r) => (
                  <button key={r.id} onClick={() => setSelection({ kind: "call", id: r.id })}
                          className={`w-full text-left rounded-lg border p-2.5 text-sm transition-colors ${selection?.kind === "call" && selection.id === r.id ? "border-red-500 bg-red-500/10" : "border-border hover:bg-muted"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{r.guestName || "Misafir"}{r.roomNumber ? ` · ${r.roomNumber}` : ""}</span>
                      <span className="text-xs text-red-500 flex items-center gap-1"><Clock className="w-3 h-3" />{fmtWait(r.requestedAt, now)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{locName.get(r.locationId) || "?"}
                      {unmappedIds.has(r.locationId) && <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">haritada yok</Badge>}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Kabul Edilenler ({accepted.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {accepted.length === 0 && <p className="text-sm text-muted-foreground">Aktif yolculuk yok</p>}
                {accepted.map((r) => {
                  const buggy = data.buggies.find((b) => b.id === r.buggyId);
                  return (
                    <button key={r.id} onClick={() => setSelection({ kind: "call", id: r.id })}
                            className="w-full text-left rounded-lg border border-border p-2.5 text-sm hover:bg-muted transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{r.guestName || "Misafir"}</span>
                        <Badge variant="default">{buggy?.code || "--"}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{locName.get(r.locationId) || "?"}</div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Car className="w-4 h-4" /> Musait Araclar ({availableBuggies.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {availableBuggies.length === 0 && <p className="text-sm text-muted-foreground">Musait arac yok</p>}
                {availableBuggies.map((b) => (
                  <button key={b.id} onClick={() => setSelection({ kind: "buggy", id: b.id })}
                          className={`w-full text-left rounded-lg border p-2.5 text-sm transition-colors ${selection?.kind === "buggy" && selection.id === b.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{b.icon} {b.code}</span>
                      <Badge variant="default">{statusTr[b.status]}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {b.drivers[0]?.fullName || "Sofor yok"} · {b.currentLocationId ? locName.get(b.currentLocationId) || "?" : "konum bilinmiyor"}
                    </div>
                  </button>
                ))}
                {noLocationBuggies.length > 0 && (
                  <p className="text-xs text-muted-foreground pt-1">{noLocationBuggies.length} arac henuz konum bildirmedi — haritada gorunmez.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
