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
import { toast } from "sonner";
import { Plus, Users as UsersIcon, Pencil, Eye, EyeOff, KeyRound, RotateCcw } from "lucide-react";

interface User {
  id: number;
  username: string;
  role: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ username: "", password: "", role: "DRIVER", fullName: "", email: "", phone: "" });
  const [editForm, setEditForm] = useState({
    username: "", password: "", role: "DRIVER", fullName: "", email: "", phone: "",
    isActive: true, mustChangePassword: false,
  });
  const [showCurrentHash, setShowCurrentHash] = useState(false);
  const [currentHash, setCurrentHash] = useState<string | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editStep, setEditStep] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (json.success) setUsers(json.data.items);
    } catch { /* ignore */ }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        email: form.email || undefined,
        phone: form.phone || undefined,
      }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Kullanıcı oluşturuldu");
      setShowDialog(false);
      setForm({ username: "", password: "", role: "DRIVER", fullName: "", email: "", phone: "" });
      load();
    } else {
      toast.error(json.error?.message || "Başarısız");
    }
  }

  async function toggleActive(u: User) {
    const res = await fetch(`/api/admin/users/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success(u.isActive ? "Kullanıcı devre dışı" : "Kullanıcı aktif");
      load();
    } else {
      toast.error(json.error?.message || "Başarısız");
    }
  }

  async function openEdit(u: User) {
    setEditing(u);
    setEditForm({
      username: u.username,
      password: "",
      role: u.role,
      fullName: u.fullName,
      email: u.email || "",
      phone: u.phone || "",
      isActive: u.isActive,
      mustChangePassword: u.mustChangePassword,
    });
    setShowCurrentHash(false);
    setCurrentHash(null);
    setShowNewPassword(false);
    setShowEdit(true);

    // Fetch full details including hash
    try {
      const res = await fetch(`/api/admin/users/${u.id}`);
      const json = await res.json();
      if (json.success && json.data.passwordHash) {
        setCurrentHash(json.data.passwordHash);
      }
    } catch { /* ignore */ }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      username: editForm.username,
      role: editForm.role,
      fullName: editForm.fullName,
      email: editForm.email || null,
      phone: editForm.phone || null,
      isActive: editForm.isActive,
      mustChangePassword: editForm.mustChangePassword,
    };
    if (editForm.password) body.password = editForm.password;

    const res = await fetch(`/api/admin/users/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setSaving(false);
    if (json.success) {
      toast.success("Kullanıcı güncellendi");
      setShowEdit(false);
      setEditing(null);
      load();
    } else {
      toast.error(json.error?.message || "Güncelleme başarısız");
    }
  }

  async function copyHash() {
    if (!currentHash) return;
    try {
      await navigator.clipboard.writeText(currentHash);
      toast.success("Hash kopyalandı");
    } catch { toast.error("Kopyalama başarısız"); }
  }

  if (loading) return <Loading fullPage />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Kullanıcılar</h1>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-1" /> Kullanıcı Ekle
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {users.length === 0 ? (
            <EmptyState icon={<UsersIcon className="h-12 w-12" />} title="Kullanıcı yok" description="Sürücü ve yönetici ekleyin" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı Adı</TableHead>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell>{u.fullName}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>{u.role === "ADMIN" ? "Yönetici" : "Sürücü"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{u.email || "—"}</TableCell>
                    <TableCell className="text-sm">{u.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "default" : "outline"}>
                        {u.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Düzenle
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(u)}>
                          {u.isActive ? "Devre Dışı Bırak" : "Aktifleştir"}
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

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Kullanıcı Ekle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Kullanıcı Adı</Label>
              <Input id="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <p className="text-xs text-muted-foreground">En az 8 karakter, büyük/küçük/rakam/özel</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Select value={form.role || null} onValueChange={(value) => setForm({ ...form, role: value ?? "" })}>
                <SelectTrigger className="w-full" id="role">
                  <SelectValue placeholder="Rol seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRIVER">Sürücü</SelectItem>
                  <SelectItem value="ADMIN">Yönetici</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Ad Soyad</Label>
              <Input id="fullName" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>İptal</Button>
              <Button type="submit">Oluştur</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={(open) => { if (!open) { setShowEdit(false); setEditing(null); } }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle — {editing?.username}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Current password hash viewer */}
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <KeyRound className="w-4 h-4" /> Mevcut Şifre (Hash)
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCurrentHash((s) => !s)}
                >
                  {showCurrentHash ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                  {showCurrentHash ? "Gizle" : "Göster"}
                </Button>
              </div>
              {showCurrentHash && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground break-all font-mono bg-background rounded p-2 border">
                    {currentHash || "Yükleniyor..."}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Not: Şifre tek yönlü bcrypt hash olarak saklanır. Orijinal şifre geri getirilemez.
                  </p>
                  <Button type="button" variant="outline" size="sm" onClick={copyHash} disabled={!currentHash}>
                    Hash&apos;i Kopyala
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-username">Kullanıcı Adı</Label>
              <Input id="edit-username" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-password">Yeni Şifre (boş bırakılırsa değişmez)</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showNewPassword ? "text" : "password"}
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Yeni şifre (opsiyonel)"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowNewPassword((s) => !s)}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">En az 8 karakter, büyük/küçük/rakam/özel</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Rol</Label>
              <Select value={editForm.role || null} onValueChange={(value) => setEditForm({ ...editForm, role: value ?? "" })}>
                <SelectTrigger className="w-full" id="edit-role">
                  <SelectValue placeholder="Rol seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRIVER">Sürücü</SelectItem>
                  <SelectItem value="ADMIN">Yönetici</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-fullName">Ad Soyad</Label>
              <Input id="edit-fullName" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">E-posta</Label>
              <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefon</Label>
              <Input id="edit-phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="edit-active" className="text-sm font-medium">Aktif</Label>
                <p className="text-xs text-muted-foreground">Pasif kullanıcılar giriş yapamaz</p>
              </div>
              <button
                type="button"
                id="edit-active"
                onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.isActive ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editForm.isActive ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Şifre Değiştirme Zorunlu</Label>
                <p className="text-xs text-muted-foreground">Kullanıcı bir sonraki girişte şifre değiştirmeli</p>
              </div>
              <button
                type="button"
                onClick={() => setEditForm({ ...editForm, mustChangePassword: !editForm.mustChangePassword })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${editForm.mustChangePassword ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${editForm.mustChangePassword ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowEdit(false); setEditing(null); }}>İptal</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loading size={16} /> : <RotateCcw className="w-3.5 h-3.5 mr-1" />} Güncelle
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
