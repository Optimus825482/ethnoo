/* eslint-disable @next/next/no-img-element -- Native img preserves dynamic URL/error and intrinsic sizing behavior. */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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
    // Direkt misafir çağrı sayfasını aç — QR kod ile aynı
    const url = `/guest/call?location=${location.id}`;
    const w = window.open(url, "_blank");
    if (!w || w.closed || typeof w.closed === "undefined") {
      router.push(url);
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
            Demo talep simulasyonu
          </p>
        </div>

        <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/40">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              </div>
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-400">Demo Mod Kapalı</h3>
                <p className="text-sm text-amber-700/80 dark:text-amber-500/80 mt-1">
                  Simülasyon modu sadece Demo Mod aktifken kullanılabilir.
                  Lütfen once <strong>Ayarlar - Demo Mod</strong> sayfasından demo modu aktif edin.
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map((loc) => (
            <Card key={loc.id} className="card-hover cursor-pointer" onClick={() => handleSimulateClick(loc)}>
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  {loc.logo ? (
                    <img src={loc.logo} alt={loc.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <MapPin className="w-6 h-6 text-accent" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{loc.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{loc.description || " "}</p>
                  </div>
                </div>
                <Button size="sm" className="ml-3 shrink-0 gap-1.5">
                  <PlayCircle className="w-3.5 h-3.5" /> Çağır
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

      {/* Direct to guest call page — no simulation API call needed */}
    </div>
  );
}
