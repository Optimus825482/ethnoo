/* eslint-disable @next/next/no-img-element -- Native img preserves dynamic URL/error and intrinsic sizing behavior. */
"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { PlayCircle, MapPin, Clock, ExternalLink, AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";

interface Location {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  displayOrder: number;
}

interface RecentRequest {
  id: number;
  status: string;
  location: { name: string };
  guestName: string | null;
  requestedAt: string;
}

export default function SimulatePage() {
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [recent, setRecent] = useState<RecentRequest[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/simulate");
      const json = await res.json();
      if (json.success) {
        setDemoMode(json.data.demoMode);
        setLocations(json.data.locations);
        setRecent(json.data.recent);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchData, 0);
    return () => clearTimeout(timer);
  }, [fetchData]);

  function handleSimulateClick(location: Location) {
    setSelectedLocation(location);
    setDialogOpen(true);
  }

  async function confirmSimulate() {
    if (!selectedLocation) return;
    setSimulating(true);
    try {
      const res = await fetch("/api/admin/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: selectedLocation.id }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Talep oluşturuldu: ${selectedLocation.name}`);
        setDialogOpen(false);
        fetchData();
        // Konuk durum sayfasını yeni sekmede aç (capability URL param ile)
        window.open(`/guest/status/${json.data.id}?capability=${encodeURIComponent(json.data.guestCapability)}`, "_blank");
      } else {
        toast.error(json.error?.message || "Talep oluşturulamadı");
      }
    } catch {
      toast.error("Ağ hatası");
    } finally {
      setSimulating(false);
    }
  }

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      PENDING: { label: "Bekliyor", variant: "secondary" },
      ACCEPTED: { label: "Alındı", variant: "default" },
      COMPLETED: { label: "Tamamlandı", variant: "outline" },
      CANCELLED: { label: "İptal", variant: "destructive" },
      UNANSWERED: { label: "Cevapsız", variant: "destructive" },
    };
    const b = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={b.variant}>{b.label}</Badge>;
  };

  if (loading) return <Loading fullPage />;

  if (!demoMode) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <PlayCircle className="w-6 h-6" /> Simülasyon
          </h1>
          <p className="text-muted-foreground mt-1">
            Demo talep simülasyonu
          </p>
        </div>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-600">Demo Mod Kapalı</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Simülasyon modu sadece Demo Mod aktifken kullanılabilir.
                  Lütfen önce <strong>Ayarlar → Demo Mod</strong> sayfasından demo modu aktif edin.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <PlayCircle className="w-6 h-6" /> Simülasyon
          </h1>
          <p className="text-muted-foreground mt-1">
            Bir lokasyon seçip demo araç çağrısı başlatın. Tüm sürücülere gerçek bildirim gider.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="w-4 h-4 mr-1" /> Yenile
        </Button>
      </div>

      {/* Locations grid */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <MapPin className="w-5 h-5" /> Lokasyonlar ({locations.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {locations.map((loc) => (
            <Card key={loc.id} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => handleSimulateClick(loc)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  {loc.logo ? (
                    <img src={loc.logo} alt={loc.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{loc.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{loc.description || ""}</p>
                  </div>
                </div>
                <Button size="sm" className="ml-2 shrink-0 gap-1">
                  <PlayCircle className="w-4 h-4" /> Çağır
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent requests */}
      {recent.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-5 h-5" /> Son Simülasyon Talepleri
          </h2>
          <div className="space-y-2">
            {recent.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-muted-foreground">#{r.id}</span>
                    <span className="text-sm font-medium">{r.location.name}</span>
                    <span className="text-xs text-muted-foreground">{r.guestName}</span>
                    {statusBadge(r.status)}
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.requestedAt).toLocaleTimeString("tr-TR")}
                    </span>
                  </div>
                  <a
                    href={`/guest/status/${r.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-xs flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Takip
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-primary" /> Simüle Araç Çağrısı
            </DialogTitle>
            <DialogDescription>
              <span className="font-medium">{selectedLocation?.name}</span> lokasyonundan demo bir araç talebi oluşturulacak.
              Tüm aktif sürücülere gerçek bildirim gönderilecek.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" /> Sahte misafir adı ve oda numarası oluşturulur
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" /> SSE üzerinden anında sürücü bildirimi
            </p>
            <p className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" /> Sürücü kabul edip tamamlayabilir
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={simulating}>
              İptal
            </Button>
            <Button onClick={confirmSimulate} disabled={simulating}>
              {simulating ? <Loading size={16} /> : "Araç Çağrısı Başlat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
