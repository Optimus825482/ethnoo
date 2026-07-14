"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Loading } from "@/components/ui/loading";
import { EmptyState } from "@/components/ui/empty-state";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Plus, Car, UserPlus, UserMinus, X } from "lucide-react";

interface Buggy {
  id: number;
  code: string;
  model: string | null;
  licensePlate: string | null;
  icon: string | null;
  status: string;
  isActive: boolean;
  isOnline: boolean;
  currentLocation: { name: string } | null;
  drivers: { driver: { id: number; fullName: string } }[];
}

interface Driver {
  id: number;
  fullName: string;
  username: string;
}

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  AVAILABLE: "default",
  BUSY: "secondary",
  OFFLINE: "destructive",
  MAINTENANCE: "outline",
};

const statusLabels: Record<string, string> = {
  AVAILABLE: "MUSAİT",
  BUSY: "MESGUL",
  OFFLINE: "KAPALI",
  MAINTENANCE: "BAKIM",
};

export default function BuggiesPage() {
  const [buggies, setBuggies] = useState<Buggy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDriverDialog, setShowDriverDialog] = useState(false);
  const [editing, setEditing] = useState<Buggy | null>(null);
  const [driverBuggy, setDriverBuggy] = useState<Buggy | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [form, setForm] = useState({ code: "", model: "", licensePlate: "", icon: "🚗" });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/buggies");
    const json = await res.json();
    if (json.success) setBuggies(json.data.items);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  async function loadDrivers() {
    const res = await fetch("/api/buggies");
    const json = await res.json();
    if (!json.success) return;
    // Get all users with DRIVER role
    const userRes = await fetch("/api/admin/users?role=DRIVER");
    const userJson = await userRes.json();
    if (userJson.success) {
      setDrivers(userJson.data.items.map((u: any) => ({ id: u.id, fullName: u.fullName, username: u.username })));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = editing ? `/api/buggies/${editing.id}` : "/api/buggies";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(editing ? "Araç güncellendi" : "Araç oluşturuldu");
      setShowDialog(false);
      setEditing(null);
      setForm({ code: "", model: "", licensePlate: "", icon: "🚗" });
      load();
    } else {
      toast.error(json.error?.message || "Başarısız");
    }
  }

  async function toggleStatus(b: Buggy) {
    const newStatus = b.status === "AVAILABLE" ? "OFFLINE" : "AVAILABLE";
    const res = await fetch(`/api/buggies/${b.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(`Durum: ${statusLabels[newStatus as keyof typeof statusLabels] || newStatus}`);
      load();
    } else {
      toast.error(json.error?.message || "Başarısız");
    }
  }

  async function assignDriver() {
    if (!driverBuggy || !selectedDriver) return;
    const res = await fetch(`/api/buggies/${driverBuggy.id}/drivers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId: Number(selectedDriver), isPrimary: false }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Sürücü atandı");
      setShowDriverDialog(false);
      setSelectedDriver("");
      setDriverBuggy(null);
      load();
    } else {
      toast.error(json.error?.message || "Atama başarısız");
    }
  }

  async function unassignDriver(buggyId: number, driverId: number) {
    const res = await fetch(`/api/buggies/${buggyId}/drivers?driverId=${driverId}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Sürücü çıkarıldı");
      load();
    } else {
      toast.error(json.error?.message || "Başarısız");
    }
  }

  if (loading) return <Loading fullPage />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Araçlar</h1>
        <Button onClick={() => { setEditing(null); setForm({ code: "", model: "", licensePlate: "", icon: "🚗" }); setShowDialog(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Araç Ekle
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {buggies.length === 0 ? (
            <EmptyState icon={<Car className="h-12 w-12" />} title="Araç yok" description="İlk aracınızı ekleyin" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kod</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Konum</TableHead>
                  <TableHead>Sürücüler</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {buggies.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium">{b.icon} {b.code}</TableCell>
                    <TableCell>{b.model || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[b.status] || "outline"}>{statusLabels[b.status as keyof typeof statusLabels] || b.status}</Badge>
                    </TableCell>
                    <TableCell>{b.currentLocation?.name || "—"}</TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-wrap gap-1 items-center">
                        {b.drivers.length > 0 ? (
                          b.drivers.map((d) => (
                            <span key={d.driver.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs">
                              {d.driver.fullName}
                              <button
                                onClick={() => unassignDriver(b.id, d.driver.id)}
                                className="hover:text-destructive"
                                title="Sürücüyü çıkar"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditing(b);
                          setForm({ code: b.code, model: b.model || "", licensePlate: b.licensePlate || "", icon: b.icon || "🚗" });
                          setShowDialog(true);
                        }}>Düzenle</Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleStatus(b)}>
                          {b.status === "AVAILABLE" ? "Kapat" : "Aktif Et"}
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setDriverBuggy(b);
                            setShowDriverDialog(true);
                            loadDrivers();
                          }}
                        >
                          <UserPlus className="w-3.5 h-3.5 mr-1" /> Sürücü
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Buggy create/edit dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); setEditing(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Araç Düzenle" : "Araç Ekle"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kod</Label>
              <Input id="code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model">Model</Label>
              <Input id="model" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licensePlate">Plaka</Label>
              <Input id="licensePlate" value={form.licensePlate} onChange={(e) => setForm({ ...form, licensePlate: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">İkon (emoji)</Label>
              <Input id="icon" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>İptal</Button>
              <Button type="submit">{editing ? "Güncelle" : "Oluştur"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Driver assignment dialog */}
      <Dialog open={showDriverDialog} onOpenChange={(open) => { if (!open) { setShowDriverDialog(false); setDriverBuggy(null); setSelectedDriver(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sürücü Ata — {driverBuggy?.icon} {driverBuggy?.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current drivers */}
            {driverBuggy && driverBuggy.drivers.length > 0 && (
              <div className="space-y-2">
                <Label>Mevcut Sürücüler</Label>
                <div className="space-y-1">
                  {driverBuggy.drivers.map((d) => (
                    <div key={d.driver.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted">
                      <span className="text-sm">{d.driver.fullName}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive h-7 px-2"
                        onClick={() => {
                          unassignDriver(driverBuggy.id, d.driver.id);
                          setDriverBuggy({
                            ...driverBuggy,
                            drivers: driverBuggy.drivers.filter((x) => x.driver.id !== d.driver.id),
                          });
                        }}
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Assign new driver */}
            <div className="space-y-2">
              <Label>Sürücü Seç</Label>
              {drivers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Sürücü bulunamadı. Önce kullanıcılar sayfasından sürücü ekleyin.
                </p>
              ) : (
                <Select value={selectedDriver || null} onValueChange={(v) => setSelectedDriver(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sürücü seç..." />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers
                      .filter((d) => !driverBuggy?.drivers.some((bd) => bd.driver.id === d.id))
                      .map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.fullName} ({d.username})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => { setShowDriverDialog(false); setDriverBuggy(null); setSelectedDriver(""); }}>Kapat</Button>
              <Button type="button" disabled={!selectedDriver} onClick={assignDriver}>
                <UserPlus className="w-4 h-4 mr-1" /> Ata
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
