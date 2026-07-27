"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Loading } from "@/components/ui/loading";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Clock, CheckCircle, XCircle, AlertCircle, Timer, TrendingUp } from "lucide-react";

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

interface DriverStat {
  name: string;
  count: number;
  avgResponse: number;
  avgCompletion: number;
}

interface LocationStat {
  name: string;
  count: number;
}

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

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [driverStats, setDriverStats] = useState<DriverStat[]>([]);
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/reports/summary?${params}`);
    const json = await res.json();
    if (json.success) setSummary(json.data);
    setSummaryLoading(false);
  }, [dateFrom, dateTo]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const res = await fetch(`/api/reports/performance?${params}`);
    const json = await res.json();
    if (json.success) {
      setDriverStats(json.data.driverStats || []);
      setLocationStats(json.data.locationStats || []);
    }
    // Also reload summary
    loadSummary();
    setLoading(false);
  }, [dateFrom, dateTo, loadSummary]);

  useEffect(() => {
    const timer = setTimeout(() => void loadReport(), 0);
    return () => clearTimeout(timer);
  }, [loadReport]);

  const pieData = summary ? [
    { name: "Tamamlanan", value: summary.completed, color: STATUS_COLORS.Tamamlanan },
    { name: "Bekleyen", value: summary.pending, color: STATUS_COLORS.Bekleyen },
    { name: "Kabul", value: summary.accepted, color: STATUS_COLORS.Kabul },
    { name: "İptal", value: summary.cancelled, color: STATUS_COLORS.İptal },
    { name: "Cevapsız", value: summary.unanswered, color: STATUS_COLORS.Cevapsız },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Raporlar</h1>

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Tarih Aralığı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
            <div className="space-y-2 flex-1">
              <Label htmlFor="from">Başlangıç</Label>
              <Input id="from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2 flex-1">
              <Label htmlFor="to">Bitiş</Label>
              <Input id="to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button onClick={loadReport} disabled={loading} className="shrink-0">
              {loading ? <Loading size={16} /> : "Rapor Al"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summaryLoading ? (
        <div className="flex justify-center py-8"><Loading size={32} /></div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <Clock className="w-8 h-8 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Toplam</p>
                  <p className="text-xl sm:text-2xl font-bold">{summary.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-amber-600 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Bekleyen</p>
                  <p className="text-xl sm:text-2xl font-bold">{summary.pending}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Tamamlanan</p>
                  <p className="text-xl sm:text-2xl font-bold">{summary.completed}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="w-8 h-8 text-destructive shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">İptal</p>
                  <p className="text-xl sm:text-2xl font-bold">{summary.cancelled}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Time Metrics + Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Timer className="w-4 h-4 text-primary" /> Ort. Tepki Süresi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl sm:text-3xl font-bold text-primary">
                  {formatTime(summary.avgResponseTime)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.avgResponseTime ? `${summary.avgResponseTime.toFixed(1)} saniye` : "veri yok"}
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
                <p className="text-2xl sm:text-3xl font-bold text-emerald-600">
                  {formatTime(summary.avgCompletionTime)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.avgCompletionTime ? `${summary.avgCompletionTime.toFixed(1)} saniye` : "veri yok"}
                </p>
              </CardContent>
            </Card>
            {pieData.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Durum Dağılımı</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ value }) => value}>
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: "11px" }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      ) : null}

      {/* Driver Performance */}
      {driverStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Sürücü Performansı</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={driverStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="count" fill="#3b82f6" name="Tamamlanan" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgResponse" fill="#f59e0b" name="Ort. Tepki (sn)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sürücü</TableHead>
                    <TableHead>Tamamlanan</TableHead>
                    <TableHead>Ort. Tepki</TableHead>
                    <TableHead>Ort. Tamamlama</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverStats.map((d) => (
                    <TableRow key={d.name}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.count}</TableCell>
                      <TableCell>{formatTime(d.avgResponse)}</TableCell>
                      <TableCell>{formatTime(d.avgCompletion)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Stats */}
      {locationStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Konuma Göre Talepler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-60 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10b981" name="Talep" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
