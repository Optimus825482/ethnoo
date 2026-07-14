"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { Clock, CheckCircle, XCircle, AlertCircle, Car, MapPin, User, Bell, Activity, TrendingUp, Timer } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { playNotificationSound } from "@/lib/notification-sound";

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
  currentLocation: { id: number; name: string; logo?: string | null } | null;
  drivers: { driver: { id: number; fullName: string } }[];
}

interface Notification {
  id: string;
  type: string;
  message: string;
  time: string;
  icon: "bell" | "check" | "x" | "alert";
  color: string;
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
  BUSY: "MEŞGUL",
  OFFLINE: "KAPALI",
  MAINTENANCE: "BAKIM",
};

const buggyBorderColor: Record<string, string> = {
  AVAILABLE: "border-l-emerald-500",
  BUSY: "border-l-amber-500",
  OFFLINE: "border-l-zinc-300",
  MAINTENANCE: "border-l-red-400",
};

const STATUS_COLORS: Record<string, string> = {
  Tamamlanan: "#10b981",
  Bekleyen: "#f59e0b",
  Kabul: "#3b82f6",
  İptal: "#ef4444",
  Cevapsız: "#f97316",
};

function formatTime(seconds: number | null): string {
  if (!seconds || seconds === 0) return "—";
  if (seconds < 60) return `${seconds.toFixed(1)} sn`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} dk`;
  return `${(seconds / 3600).toFixed(2)} sa`;
}

export default function AdminDashboard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [active, setActive] = useState<ActiveRequest[]>([]);
  const [buggies, setBuggies] = useState<Buggy[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notifId = useRef(0);

  function addNotification(type: string, message: string, icon: Notification["icon"], color: string) {
    const id = `n${notifId.current++}`;
    const notif: Notification = {
      id,
      type,
      message,
      time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      icon,
      color,
    };
    setNotifications((prev) => [notif, ...prev].slice(0, 30));
    playNotificationSound("notification");
  }

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

  // SSE for real-time notifications
  useEffect(() => {
    const es = new EventSource("/api/sse/driver");
    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.type === "new_request" && event.request) {
          addNotification("new", `Yeni talep: ${event.request.location?.name || "Konum"} #${event.request.id}`, "bell", "text-blue-600");
        } else if (event.type === "request_accepted" && event.requestId) {
          addNotification("accept", `Talep #${event.requestId} kabul edildi`, "check", "text-emerald-600");
        } else if (event.type === "request_completed" && event.requestId) {
          addNotification("complete", `Talep #${event.requestId} tamamlandı`, "check", "text-emerald-600");
        } else if (event.type === "request_cancelled" && event.requestId) {
          addNotification("cancel", `Talep #${event.requestId} iptal edildi`, "x", "text-red-600");
        }
      } catch { /* ignore */ }
    };
    es.onerror = () => { /* auto-reconnect */ };
    return () => es.close();
  }, []);

  if (loading) return <Loading fullPage />;

  const activeBuggies = buggies.filter((b) => b.isActive !== false);

  const pieData = summary ? [
    { name: "Tamamlanan", value: summary.completed, color: STATUS_COLORS.Tamamlanan },
    { name: "Bekleyen", value: summary.pending, color: STATUS_COLORS.Bekleyen },
    { name: "Kabul", value: summary.accepted, color: STATUS_COLORS.Kabul },
    { name: "İptal", value: summary.cancelled, color: STATUS_COLORS.İptal },
    { name: "Cevapsız", value: summary.unanswered, color: STATUS_COLORS.Cevapsız },
  ].filter((d) => d.value > 0) : [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold">Yönetim Paneli</h1>

      {/* Main grid: left (buggies + requests), right (notifications) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: 2/3 */}
        <div className="lg:col-span-2 space-y-4">
          {/* Buggies — vertical list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" /> Araçlar ({activeBuggies.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeBuggies.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">Araç bulunamadı</p>
              ) : (
                activeBuggies.map((b) => (
                  <div
                    key={b.id}
                    className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border-l-4 ${buggyBorderColor[b.status] || "border-l-zinc-300"} bg-muted/30`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">{b.icon || "🚗"}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm sm:text-base">{b.code}</span>
                          <Badge variant={buggyStatusVariant[b.status] || "outline"} className="text-xs">
                            {buggyStatusLabels[b.status] || b.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {b.currentLocation?.logo && (
                            <img src={b.currentLocation.logo} alt="" className="w-3.5 h-3.5 rounded object-cover" />
                          )}
                          <span className="truncate">{b.currentLocation?.name || "Konum yok"}</span>
                        </div>
                      </div>
                    </div>
                    {b.drivers.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                        <User className="w-3 h-3" />
                        <span className="hidden sm:inline">{b.drivers.map((d) => d.driver.fullName).join(", ")}</span>
                        <span className="sm:hidden">{b.drivers.length}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Active Requests */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-amber-600" /> Aktif Talepler ({active.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {active.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">Aktif talep yok</p>
              ) : (
                <div className="space-y-2">
                  {active.map((r) => (
                    <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-sm font-bold shrink-0">#{r.id}</span>
                        <Badge variant={badgeVariant[r.status] || "outline"} className="text-xs">
                          {statusLabels[r.status] || r.status}
                        </Badge>
                        {r.location?.logo && (
                          <img src={r.location.logo} alt="" className="w-4 h-4 rounded object-cover" />
                        )}
                        <span className="text-sm truncate">{r.location?.name || "—"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                        {r.buggy && <span>{r.buggy.icon || "🚗"} {r.buggy.code}</span>}
                        {r.acceptedByDriver && <span className="hidden sm:inline">{r.acceptedByDriver.fullName}</span>}
                        <span>{new Date(r.requestedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: 1/3 — Live notifications */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-500" /> Canlı Bildirimler
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Bildirim yok</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/50"
                    style={{ animation: "fadeInUp 0.3s ease-out" }}
                  >
                    {n.icon === "bell" && <Bell className={`w-4 h-4 shrink-0 mt-0.5 ${n.color}`} />}
                    {n.icon === "check" && <CheckCircle className={`w-4 h-4 shrink-0 mt-0.5 ${n.color}`} />}
                    {n.icon === "x" && <XCircle className={`w-4 h-4 shrink-0 mt-0.5 ${n.color}`} />}
                    {n.icon === "alert" && <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${n.color}`} />}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm break-words">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metrics + Charts */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Toplam</p>
              <p className="text-xl sm:text-2xl font-bold">{summary?.total ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-8 h-8 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Bekleyen</p>
              <p className="text-xl sm:text-2xl font-bold">{summary?.pending ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Tamamlanan</p>
              <p className="text-xl sm:text-2xl font-bold">{summary?.completed ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="w-8 h-8 text-destructive shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">İptal</p>
              <p className="text-xl sm:text-2xl font-bold">{summary?.cancelled ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Time metrics + pie chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" /> Ort. Tepki Süresi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold text-primary">{formatTime(summary?.avgResponseTime ?? null)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.avgResponseTime ? `${summary.avgResponseTime.toFixed(1)} saniye` : "veri yok"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" /> Ort. Tamamlama Süresi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-600">{formatTime(summary?.avgCompletionTime ?? null)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.avgCompletionTime ? `${summary.avgCompletionTime.toFixed(1)} saniye` : "veri yok"}
            </p>
          </CardContent>
        </Card>
        {pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Durum Dağılımı</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40 sm:h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={(e: any) => e.value}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: "10px" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
