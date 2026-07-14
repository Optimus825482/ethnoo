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
import { Bell, CheckCircle, XCircle, Clock, MapPin } from "lucide-react";
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
      setDriverLocation(saved);
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
          toast.success(`Konum: ${json.data.location?.name || "kaydedildi"}`);
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

  async function acceptRequest(id: number) {
    const res = await fetch(`/api/requests/${id}/accept`, { method: "POST" });
    const json = await res.json();
    if (json.success) {
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
      toast.success("Görev tamamlandı");
      setShowCompleteDialog(false);
      setDropoffLocation("");
      // Ask for new location
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

  if (loading) return <Loading fullPage />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Sürücü Paneli</h1>
        {driverLocation && (() => {
          const loc = locations.find((l) => String(l.id) === driverLocation);
          return (
            <Button size="sm" variant="outline" onClick={changeLocation}>
              {loc?.logo ? (
                <img src={loc.logo} alt="" className="w-4 h-4 rounded object-cover" />
              ) : (
                <MapPin className="w-3.5 h-3.5" />
              )}
              {loc?.name || "Konum"}
              <span className="ml-1 text-xs text-muted-foreground">(değiştir)</span>
            </Button>
          );
        })()}
      </div>

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
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => {
                // Load locations for dropoff selection
                fetch("/api/locations")
                  .then((r) => r.json())
                  .then((json) => {
                    if (json.success) {
                      setLocations(json.data.items);
                      setShowCompleteDialog(true);
                    }
                  });
              }}>
                <CheckCircle className="w-4 h-4 mr-1" /> Görev Tamamlandı
              </Button>
              <Button variant="destructive" onClick={() => cancelRequest(active.id)}>
                <XCircle className="w-4 h-4 mr-1" /> İptal
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
                <Button className="w-full" onClick={() => acceptRequest(r.id)}>
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
