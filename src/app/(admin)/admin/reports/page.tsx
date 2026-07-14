"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [driverStats, setDriverStats] = useState<DriverStat[]>([]);
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);

  async function loadReport() {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    const res = await fetch(`/api/reports/performance?dateFrom=${dateFrom}&dateTo=${dateTo}`);
    const json = await res.json();
    if (json.success) {
      setDriverStats(json.data.driverStats || []);
      setLocationStats(json.data.locationStats || []);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Raporlar</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tarih Aralığı</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="from">Başlangıç</Label>
              <Input id="from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">Bitiş</Label>
              <Input id="to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <Button onClick={loadReport} disabled={loading}>
              {loading ? "Yükleniyor..." : "Rapor Al"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {driverStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sürücü Performansı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={driverStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-primary)" name="Tamamlanan Talepler" />
                </BarChart>
              </ResponsiveContainer>
            </div>
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
                    <TableCell>{d.avgResponse ? `${Math.floor(d.avgResponse / 60)}d ${d.avgResponse % 60}s` : "—"}</TableCell>
                    <TableCell>{d.avgCompletion ? `${Math.floor(d.avgCompletion / 60)}d ${d.avgCompletion % 60}s` : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {locationStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Konuma Göre Talepler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={locationStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-secondary)" name="Talep" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
