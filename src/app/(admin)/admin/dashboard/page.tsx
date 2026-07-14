"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Loading } from "@/components/ui/loading";
import { Clock, CheckCircle, XCircle, AlertCircle, Car, MapPin, User } from "lucide-react";

interface Summary {
  total: number;
  pending: number;
  accepted: number;
  completed: number;
  cancelled: number;
  unanswered: number;
  avgResponseTime: number | null;
  avgCompletionTime: number | null;
}

interface ActiveRequest {
  id: number;
  status: string;
  guestName: string | null;
  requestedAt: string;
  location: { name: string; logo?: string | null };
  buggy: { code: string; icon: string | null; currentLocation: { name: string; logo?: string | null } | null } | null;
  acceptedByDriver: { fullName: string } | null;
}

interface Buggy {
  id: number;
  code: string;
  icon: string | null;
  status: string;
  isActive: boolean;
  isOnline: boolean;
  currentLocation: { id: number; name: string; logo?: string | null } | null;
  drivers: { driver: { id: number; fullName: string } }[];
}

const badgeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
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

const buggyStatusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  AVAILABLE: "default",
  BUSY: "secondary",
  OFFLINE: "destructive",
  MAINTENANCE: "outline",
};

const buggyStatusLabels: Record<string, string> = {
  AVAILABLE: "MUSAİT",
  BUSY: "MESGUL",
  OFFLINE: "KAPALI",
  MAINTENANCE: "BAKIM",
};

export default function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [active, setActive] = useState<ActiveRequest[]>([]);
  const [buggies, setBuggies] = useState<Buggy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sumRes, actRes, bugRes] = await Promise.all([
          fetch("/api/reports/summary"),
          fetch("/api/requests/active"),
          fetch("/api/buggies"),
        ]);
        const sumJson = await sumRes.json();
        const actJson = await actRes.json();
        const bugJson = await bugRes.json();
        if (sumJson.success) setSummary(sumJson.data);
        if (actJson.success) setActive(actJson.data);
        if (bugJson.success) setBuggies(bugJson.data.items);
      } finally {
        setLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <Loading fullPage />;

  const statCards = [
    { label: "Toplam Talep", value: summary?.total ?? 0, icon: Clock, color: "text-primary" },
    { label: "Bekleyen", value: summary?.pending ?? 0, icon: AlertCircle, color: "text-amber-600" },
    { label: "Tamamlanan", value: summary?.completed ?? 0, icon: CheckCircle, color: "text-emerald-600" },
    { label: "İptal", value: summary?.cancelled ?? 0, icon: XCircle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Yönetim Paneli</h1>

      {/* Live buggy locations — TOP */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Car className="w-5 h-5 text-primary" />
            Araçların Anlık Konumları
          </CardTitle>
        </CardHeader>
        <CardContent>
          {buggies.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Araç bulunamadı</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {buggies.filter(b => b.isActive !== false).map((b) => (
                <Card key={b.id} className={`border-l-4 ${
                  b.status === "AVAILABLE" ? "border-l-emerald-500" :
                  b.status === "BUSY" ? "border-l-amber-500" :
                  b.status === "OFFLINE" ? "border-l-zinc-300" :
                  "border-l-red-400"
                }`}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{b.icon || "🚗"}</span>
                        <span className="font-semibold">{b.code}</span>
                      </div>
                      <Badge variant={buggyStatusVariant[b.status] || "outline"}>
                        {buggyStatusLabels[b.status] || b.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {b.currentLocation?.logo ? (
                        <img src={b.currentLocation.logo} alt="" className="w-4 h-4 rounded object-cover" />
                      ) : null}
                      <span>{b.currentLocation?.name || "Konum yok"}</span>
                    </div>
                    {b.drivers.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        <span>{b.drivers.map(d => d.driver.fullName).join(", ")}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active requests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Aktif Talepler</CardTitle>
        </CardHeader>
        <CardContent>
          {active.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Aktif talep yok</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Misafir</TableHead>
                  <TableHead>Alınacak</TableHead>
                  <TableHead>Araç</TableHead>
                  <TableHead>Araç Konumu</TableHead>
                  <TableHead>Sürücü</TableHead>
                  <TableHead>Saat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {active.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>#{r.id}</TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant[r.status] || "outline"}>
                        {statusLabels[r.status] || r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{r.guestName || "—"}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        {r.location?.logo && <img src={r.location.logo} alt="" className="w-4 h-4 rounded object-cover" />}
                        {r.location?.name || "—"}
                      </span>
                    </TableCell>
                    <TableCell>{r.buggy ? `${r.buggy.icon || ""} ${r.buggy.code}` : "—"}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5">
                        {r.buggy?.currentLocation?.logo && <img src={r.buggy.currentLocation.logo} alt="" className="w-4 h-4 rounded object-cover" />}
                        {r.buggy?.currentLocation?.name || "—"}
                      </span>
                    </TableCell>
                    <TableCell>{r.acceptedByDriver?.fullName || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(r.requestedAt).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Stat cards — BOTTOM */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`w-4 h-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Average times — BOTTOM */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ort. Tepki Süresi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {summary?.avgResponseTime
                ? `${Math.floor(summary.avgResponseTime / 60)}d ${summary.avgResponseTime % 60}s`
                : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ort. Tamamlama Süresi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {summary?.avgCompletionTime
                ? `${Math.floor(summary.avgCompletionTime / 60)}d ${summary.avgCompletionTime % 60}s`
                : "—"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
