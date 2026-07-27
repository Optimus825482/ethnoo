/* eslint-disable @next/next/no-img-element -- Native img preserves dynamic URL/error and intrinsic sizing behavior. */
"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Bell, CheckCircle, XCircle, Clock, MapPin, Power, PowerOff, Smartphone } from "lucide-react";
import { playNotificationSound } from "@/lib/notification-sound";

interface Request {
  id: number;
  status: string;
  guestName: string | null;
  roomNumber: string | null;
  phone: string | null;
  notes: string | null;
  requestedAt: string;
  location: { id: number; name: string; logo?: string | null };
  acceptedAt: string | null;
}

interface Location {
  id: number;
  name: string;
  logo?: string | null;
}

interface DriverState {
  driverStatus: "ON_DUTY" | "OFF_DUTY";
  buggy: { id: number; code: string; icon: string | null; status: string; currentLocation: { id: number; name: string } | null } | null;
}

interface PushState {
  subscribed: boolean;
  supported: boolean;
}

const statusBadge: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PENDING: "secondary",
  ACCEPTED: "default",
  COMPLETED: "default",
  CANCELLED: "destructive",
  UNANSWERED: "outline",
};

const statusLabels: Record<string, string> = {
  PENDING: "BEKLEMEDE",
  ACCEPTED: "KABUL",
  COMPLETED: "TAMAM",
  CANCELLED: "İPTAL",
  UNANSWERED: "CEVAPSIZ",
};

export default function DriverDashboard() {
  const [pending, setPending] = useState<Request[]>([]);
  const [active, setActive] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [driverLocation, setDriverLocation] = useState<string>("");
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [driverState, setDriverState] = useState<DriverState | null>(null);
  const [pushState, setPushState] = useState<PushState>({ subscribed: false, supported: false });
  const [statusLoading, setStatusLoading] = useState(false);
  const [gpsTracking, setGpsTracking] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/requests/active");
      const json = await res.json();
      if (json.success) {
        const all: Request[] = json.data;
        setPending(all.filter((r) => r.status === "PENDING"));
        const accepted = all.find((r) => r.status === "ACCEPTED");
        setActive(accepted || null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Check if driver has selected location
    const saved = localStorage.getItem("driverLocation");
    if (!saved) {
      // Load locations for selection
      fetch("/api/locations")
        .then((r) => r.json())
        .then((json) => {
          if (json.success) {
            setLocations(json.data.items);
            setShowLocationDialog(true);
          }
        });
    } else {
      queueMicrotask(() => setDriverLocation(saved));
    }

    load();
    const interval = setInterval(load, 3000);

    // SSE for real-time notifications
    const es = new EventSource("/api/sse/driver");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "new_request") {
          playNotificationSound("notification");
          load();
        }
      } catch { /* ignore */ }
    };
    es.onerror = () => { /* auto-reconnect */ };

    return () => {
      clearInterval(interval);
      es.close();
    };
  }, [load]);

  // Load driver state (buggy + driverStatus)
  useEffect(() => {
    fetch("/api/driver/location")
      .then(r => r.json())
      .then(json => { if (json.success) setDriverState(json.data); });
  }, []);

  // Check push subscription
  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    queueMicrotask(() => setPushState(prev => ({ ...prev, supported })));
    if (!supported) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setPushState({ subscribed: !!sub, supported: true });
    });
  }, []);

  // Heartbeat loop: every 30s. No GPS when idle (only driverStatus).
  // GPS tracked via gpsTracking state (started on accept, stopped on complete).
  useEffect(() => {
    const sendHeartbeat = (pos?: GeolocationPosition) => {
      const body: { driverStatus?: DriverState["driverStatus"]; latitude?: number; longitude?: number } = {};
      if (driverState?.driverStatus) body.driverStatus = driverState.driverStatus;
      if (pos) {
        body.latitude = pos.coords.latitude;
        body.longitude = pos.coords.longitude;
      }
      fetch("/api/driver/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).catch(() => {});
    };

    // Idle heartbeat (no GPS)
    const idleInterval = setInterval(() => sendHeartbeat(), 30000);

    // Active GPS tracking (when gpsTracking is true)
    let geoWatchId: number | null = null;
    if (gpsTracking && navigator.geolocation) {
      geoWatchId = navigator.geolocation.watchPosition(
        (pos) => sendHeartbeat(pos),
        () => {},
        { enableHighAccuracy: true, maximumAge: 15000, timeout: 10000 }
      );
    }

    return () => {
      clearInterval(idleInterval);
      if (geoWatchId != null) navigator.geolocation.clearWatch(geoWatchId);
    };
  }, [driverState?.driverStatus, gpsTracking]);

  function selectLocation() {
    if (!driverLocation) {
      toast.error("Konum seçin");
      return;
    }
    // Save to API
    fetch("/api/driver/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: Number(driverLocation) }),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          localStorage.setItem("driverLocation", driverLocation);
          setShowLocationDialog(false);
          const loc = locations.find((l) => String(l.id) === driverLocation);
          toast.success(`Konum: ${loc?.name || "kaydedildi"}`);
          // Refresh driver state so buggy location updates in UI
          if (json.data.buggy?.currentLocation) {
            setDriverState(prev => prev ? {
              ...prev,
              buggy: {
                ...prev.buggy!,
                currentLocation: { id: json.data.buggy.currentLocation.id, name: json.data.buggy.currentLocation.name },
              },
            } : prev);
          }
        } else {
          toast.error(json.error?.message || "Kaydedilemedi");
        }
      })
      .catch(() => toast.error("Bağlantı hatası"));
  }

  function changeLocation() {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setLocations(json.data.items);
          setShowLocationDialog(true);
        }
      });
  }

  async function toggleStatus() {
    if (!driverState) return;
    setStatusLoading(true);
    const next = driverState.driverStatus === "ON_DUTY" ? "OFF_DUTY" : "ON_DUTY";
    const res = await fetch("/api/driver/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverStatus: next }),
    });
    const json = await res.json();
    if (json.success) {
      setDriverState(prev => prev ? { ...prev, driverStatus: next } : prev);
      toast.success(next === "ON_DUTY" ? "Müsait duruma geçtiniz" : "Servis dışına alındınız");
    } else {
      toast.error("Durum değiştirilemedi");
    }
    setStatusLoading(false);
  }

  async function subscribePush() {
    try {
      const reg = await navigator.serviceWorker.ready;
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
      if (!vapidKey) {
        toast.error("VAPID anahtarı bulunamadı");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
      await fetch("/api/user/fcm-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pushSubscription: JSON.stringify(sub) }),
      });
      setPushState({ subscribed: true, supported: true });
      toast.success("Bildirimler açıldı");
    } catch {
      toast.error("Bildirim izni alınamadı");
    }
  }

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  async function acceptRequest(id: number) {
    const res = await fetch(`/api/requests/${id}/accept`, { method: "POST" });
    const json = await res.json();
    if (json.success) {
      setGpsTracking(true); // START GPS 30-second tracking
      toast.success("Talep kabul edildi");
      load();
    } else {
      toast.error(json.error?.message || "Kabul başarısız");
    }
  }

  async function completeRequest() {
    if (!dropoffLocation) {
      toast.error("Bırakma konumu seçin");
      return;
    }
    if (!active) return;
    const res = await fetch(`/api/requests/${active.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completionLocationId: Number(dropoffLocation) }),
    });
    const json = await res.json();
    if (json.success) {
      setGpsTracking(false); // STOP GPS tracking
      toast.success("Görev tamamlandı");
      setShowCompleteDialog(false);
      setDropoffLocation("");
      localStorage.removeItem("driverLocation");
      setDriverLocation("");
      changeLocation();
      load();
    } else {
      toast.error(json.error?.message || "Tamamlama başarısız");
    }
  }

  async function cancelRequest(id: number) {
    const res = await fetch(`/api/requests/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Talep iptal edildi");
      load();
    } else {
      toast.error(json.error?.message || "İptal başarısız");
    }
  }

  if (loading || !driverState) return <Loading fullPage />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Sürücü Paneli</h1>
        {driverLocation && (() => {
          const loc = locations.find((l) => String(l.id) === driverLocation);
          return (
            <Button variant="outline" onClick={changeLocation} className="max-w-[60vw]">
              {loc?.logo ? (
                <img src={loc.logo} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
              ) : (
                <MapPin className="w-4 h-4 shrink-0" />
              )}
              <span className="truncate">{loc?.name || "Konum"}</span>
              <span className="ml-1 text-xs text-muted-foreground shrink-0">(değiştir)</span>
            </Button>
          );
        })()}
      </div>

      {/* Driver status bar */}
      {driverState && (
        <Card className={driverState.driverStatus === "ON_DUTY" ? "border-emerald-500/50" : "border-amber-500/50"}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <Badge variant={driverState.driverStatus === "ON_DUTY" ? "default" : "outline"}
                       className={driverState.driverStatus === "ON_DUTY" ? "bg-emerald-600" : "text-amber-600"}>
                  {driverState.driverStatus === "ON_DUTY" ? "MÜSAİT" : "SERVİS DIŞI"}
                </Badge>
                {driverState.buggy && (
                  <span className="text-sm font-medium">{driverState.buggy.icon} {driverState.buggy.code}</span>
                )}
                {driverState.buggy?.currentLocation && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {driverState.buggy.currentLocation.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Push notification toggle */}
                {pushState.supported && (
                  <Button size="sm" variant={pushState.subscribed ? "default" : "outline"}
                          onClick={pushState.subscribed ? undefined : subscribePush}
                          title={pushState.subscribed ? "Bildirimler açık" : "Bildirimleri aç"}>
                    {pushState.subscribed ? <Smartphone className="w-4 h-4 text-emerald-400" /> : <Smartphone className="w-4 h-4" />}
                    <span className="ml-1 text-xs">{pushState.subscribed ? "Açık" : "Kapalı"}</span>
                  </Button>
                )}
                {/* ON_DUTY / OFF_DUTY toggle */}
                <Button
                  size="sm"
                  variant={driverState.driverStatus === "ON_DUTY" ? "outline" : "default"}
                  onClick={toggleStatus}
                  disabled={statusLoading}
                >
                  {driverState.driverStatus === "ON_DUTY" ? (
                    <><PowerOff className="w-4 h-4 mr-1" /> Servis Dışı</>
                  ) : (
                    <><Power className="w-4 h-4 mr-1" /> Müsait Yap</>
                  )}
                </Button>
              </div>
            </div>
            {driverState.driverStatus === "OFF_DUTY" && (
              <p className="text-xs text-muted-foreground mt-2">
                Servis dışı moddasınız. Talepleri görebilir ama kabul edemezsiniz ve bildirim almazsınız.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {active && (
        <Card className="border-primary/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Aktif Görev #{active.id}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {active.location?.logo ? (
                  <img src={active.location.logo} alt="" className="w-5 h-5 rounded object-cover" />
                ) : (
                  <MapPin className="w-4 h-4 text-primary" />
                )}
                <p className="font-medium">Alınacak: {active.location.name}</p>
              </div>
              {active.guestName && <p className="text-sm">Misafir: {active.guestName}</p>}
              {active.roomNumber && <p className="text-sm">Oda: {active.roomNumber}</p>}
              {active.phone && <p className="text-sm">Telefon: {active.phone}</p>}
              {active.notes && <p className="text-sm text-muted-foreground">Not: {active.notes}</p>}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button className="flex-1" onClick={() => {
                fetch("/api/locations")
                  .then((r) => r.json())
                  .then((json) => {
                    if (json.success) {
                      setLocations(json.data.items);
                      setShowCompleteDialog(true);
                    }
                  });
              }}>
                <CheckCircle className="w-4 h-4 mr-1" /> <span className="text-sm sm:text-base">Görev Tamamlandı</span>
              </Button>
              <Button variant="destructive" className="flex-1 sm:flex-none" onClick={() => cancelRequest(active.id)}>
                <XCircle className="w-4 h-4 mr-1" /> <span className="text-sm sm:text-base">İptal</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          Bekleyen Talepler ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <EmptyState icon={<Clock className="h-12 w-12" />} title="Bekleyen talep yok" description="Çağrı bekleniyor..." />
        ) : (
          pending.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {r.location?.logo ? (
                        <img src={r.location.logo} alt="" className="w-4 h-4 rounded object-cover" />
                      ) : (
                        <MapPin className="w-4 h-4 text-primary" />
                      )}
                      <p className="font-medium">{r.location.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(r.requestedAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge variant={statusBadge[r.status] || "outline"}>
                    {statusLabels[r.status] || r.status}
                  </Badge>
                </div>
                {r.guestName && <p className="text-sm">Misafir: {r.guestName}</p>}
                {r.roomNumber && <p className="text-sm">Oda: {r.roomNumber}</p>}
                {r.notes && <p className="text-sm text-muted-foreground">{r.notes}</p>}
                <Button className="w-full" onClick={() => acceptRequest(r.id)}
                        disabled={driverState?.driverStatus !== "ON_DUTY"}
                        title={driverState?.driverStatus !== "ON_DUTY" ? "Servis dışı olduğunuz için kabul edemezsiniz" : undefined}>
                  Kabul Et
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Location selection dialog */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Konum Seçin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Şu anda hangi konumdasınız? Araç bu konumda müsait olarak gösterilecek.
            </p>
            <div className="space-y-2">
              <Label>Konum</Label>
              <Select value={driverLocation || null} onValueChange={(v) => setDriverLocation(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Konum seç...">
                    {(value: string) => {
                      const loc = locations.find((l) => String(l.id) === value);
                      return loc?.name ?? "Konum seç...";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {locations.length > 0 ? (
                    locations.map((l) => (
                      <SelectItem key={l.id} value={String(l.id)}>
                        <span className="flex items-center gap-2">
                          {l.logo && <img src={l.logo} alt="" className="w-4 h-4 rounded object-cover" />}
                          {l.name}
                        </span>
                      </SelectItem>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">Konum yüklenemedi</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={selectLocation} disabled={!driverLocation}>
              Onayla
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complete dialog — select drop-off location */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Bırakma Konumu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Misafiri hangi konuma bıraktınız? Araç bu konumda müsait duruma geçecek.
            </p>
            <div className="space-y-2">
              <Label>Bırakma Konumu</Label>
              <Select value={dropoffLocation || null} onValueChange={(v) => setDropoffLocation(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Konum seç...">
                    {(value: string) => {
                      const loc = locations.find((l) => String(l.id) === value);
                      return loc?.name ?? "Konum seç...";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {locations.map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      <span className="flex items-center gap-2">
                        {l.logo && <img src={l.logo} alt="" className="w-4 h-4 rounded object-cover" />}
                        {l.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowCompleteDialog(false)}>
                İptal
              </Button>
              <Button className="flex-1" onClick={completeRequest} disabled={!dropoffLocation}>
                <CheckCircle className="w-4 h-4 mr-1" /> Tamamla
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
