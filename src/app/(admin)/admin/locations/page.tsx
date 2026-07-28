/* eslint-disable @next/next/no-img-element -- Native img preserves dynamic URL/error and intrinsic sizing behavior. */
"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, MapPin, QrCode, Upload, Trash2, Image as ImageIcon, Download, AlertTriangle, RefreshCw } from "lucide-react";
import { LocationMapPicker } from "@/components/monitor/location-map-picker";
import QRCode from "qrcode";

interface Location {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  displayOrder: number;
  isActive: boolean;
  qrCodeData: string | null;
  mapX: number | null;
  mapY: number | null;
}

export default function LocationsPage() {
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "true";
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState({ name: "", description: "", displayOrder: "0" });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadLocId, setUploadLocId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showQR, setShowQR] = useState<Location | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [mapPoint, setMapPoint] = useState<{ x: number; y: number } | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/locations");
    const json = await res.json();
    if (json.success) setLocations(json.data.items);
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  // --- Table row logo upload (direct, no dialog) ---
  function triggerRowUpload(locId: number) {
    setUploadLocId(locId);
    if (fileRef.current) fileRef.current.value = "";
    fileRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error("Dosya çok büyük (maks 500KB)");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Sadece resim dosyası");
      return;
    }
    if (uploadLocId !== null) {
      await uploadLogo(uploadLocId, file);
      setUploadLocId(null);
    }
  }

  async function uploadLogo(locId: number, file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("logo", file);
    const res = await fetch(`/api/locations/${locId}/logo`, {
      method: "POST",
      body: formData,
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Logo yüklendi");
      load();
    } else {
      toast.error(json.error?.message || "Yükleme başarısız");
    }
    setUploading(false);
  }

  async function deleteLogo(locId: number) {
    const res = await fetch(`/api/locations/${locId}/logo`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Logo silindi");
      load();
    } else {
      toast.error("Silme başarısız");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const isEdit = !!editing;
    const url = isEdit ? `/api/locations/${editing!.id}` : "/api/locations";
    const method = isEdit ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description || undefined,
        displayOrder: Number(form.displayOrder) || 0,
        mapX: mapPoint?.x ?? null,
        mapY: mapPoint?.y ?? null,
      }),
    });
    const json = await res.json();
    if (json.success) {
      // If there's a pending logo file, upload it now
      if (pendingLogoFile) {
        const locId = isEdit ? editing!.id : json.data.id;
        await uploadLogo(locId, pendingLogoFile);
      }
      toast.success(isEdit ? "Konum güncellendi" : "Konum oluşturuldu");
      setShowDialog(false);
      resetForm();
      load();
    } else {
      toast.error(json.error?.message || "Başarısız");
    }
  }

  function resetForm() {
    setEditing(null);
    setForm({ name: "", description: "", displayOrder: "0" });
    setLogoPreview(null);
    setPendingLogoFile(null);
    setMapPoint(null);
  }

  async function generateQR(loc: Location) {
    const res = await fetch(`/api/locations/${loc.id}/qr`, { method: "POST" });
    const json = await res.json();
    if (json.success) {
      toast.success("QR kod oluşturuldu");
      load();
    } else {
      toast.error(json.error?.message || "Başarısız");
    }
  }

  async function viewQR(loc: Location) {
    if (!loc.qrCodeData) {
      toast.error("Önce QR kod oluşturun");
      return;
    }
    setShowQR(loc);
    try {
      const guestUrl = `${window.location.origin}/guest/call?location=${loc.id}`;
      const dataUrl = await QRCode.toDataURL(guestUrl, { width: 256, margin: 2 });
      setQrImage(dataUrl);
    } catch {
      toast.error("QR oluşturulamadı");
    }
  }

  async function deleteQR(loc: Location) {
    const res = await fetch(`/api/locations/${loc.id}/qr`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("QR kod silindi");
      load();
    } else {
      toast.error(json.error?.message || "Silme başarısız");
    }
  }

  function downloadQR() {
    if (!qrImage || !showQR) return;
    const link = document.createElement("a");
    link.href = qrImage;
    link.download = `qr-${showQR.name.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.click();
  }

  if (loading) return <Loading fullPage />;

  return (
    <div className="space-y-6">
      {isNew && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-600">En az bir konum oluşturmalısınız</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Shuttle çağrı sistemi için en az bir alış/bırakma noktası tanımlamanız gerekiyor.
              Konumlar QR kod ile misafirlerin shuttle çağırmasını sağlar.
            </p>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Konumlar</h1>
        <Button onClick={() => {
          resetForm();
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-1" /> Konum Ekle
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {locations.length === 0 ? (
            <EmptyState icon={<MapPin className="h-12 w-12" />} title="Konum yok" description="Alış/bırakma noktaları ekleyin" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Logo</TableHead>
                  <TableHead>Ad</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Sıra</TableHead>
                  <TableHead>Harita</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>QR</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      {l.logo ? (
                        <img src={l.logo} alt={l.name} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-sm">{l.description || "—"}</TableCell>
                    <TableCell>{l.displayOrder}</TableCell>
                    <TableCell>
                      {l.mapX != null && l.mapY != null ? (
                        <Badge variant="default">✓</Badge>
                      ) : (
                        <Badge variant="outline">yok</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={l.isActive ? "default" : "outline"}>
                        {l.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {l.qrCodeData ? (
                          <>
                            <Button size="sm" variant="ghost" className="px-2" onClick={() => viewQR(l)} title="QR Kodu Görüntüle">
                              <QrCode className="w-4 h-4 text-emerald-600" />
                            </Button>
                            <Button size="sm" variant="ghost" className="px-2" onClick={() => deleteQR(l)} title="QR Kodu Sil">
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            </Button>
                          </>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => generateQR(l)}>
                            <QrCode className="w-3 h-3 mr-1" /> Oluştur
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          setEditing(l);
                          setForm({ name: l.name, description: l.description || "", displayOrder: String(l.displayOrder) });
                          setLogoPreview(l.logo || null);
                          setPendingLogoFile(null);
                          setMapPoint(l.mapX != null && l.mapY != null ? { x: l.mapX, y: l.mapY } : null);
                          setShowDialog(true);
                        }}>Düzenle</Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="px-2"
                          title="Logo yükle"
                          onClick={() => triggerRowUpload(l.id)}
                          disabled={uploading}
                        >
                          {uploading && uploadLocId === l.id ? <Loading size={14} /> : <Upload className="w-3.5 h-3.5" />}
                        </Button>
                        {l.logo && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="px-2 text-destructive"
                            title="Logo sil"
                            onClick={() => deleteLogo(l.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Single hidden file input for table row uploads */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <Dialog open={showDialog} onOpenChange={(open) => {
        if (!open) {
          setShowDialog(false);
          resetForm();
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Konum Düzenle" : "Konum Ekle"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Logo upload in dialog */}
            <div className="space-y-2">
              <Label>Konum Logosu</Label>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border border-border">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement("input");
                      input.type = "file";
                      input.accept = "image/*";
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (!file) return;
                        if (file.size > 500000) { toast.error("Dosya çok büyük (maks 500KB)"); return; }
                        if (!file.type.startsWith("image/")) { toast.error("Sadece resim"); return; }
                        setPendingLogoFile(file);
                        setLogoPreview(URL.createObjectURL(file));
                      };
                      input.click();
                    }}
                  >
                    <Upload className="w-3.5 h-3.5 mr-1" /> Resim Seç
                  </Button>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => { setLogoPreview(null); setPendingLogoFile(null); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG · maks 500KB</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Ad</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama</Label>
              <Input id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayOrder">Görüntüleme Sırası</Label>
              <Input id="displayOrder" type="number" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Harita Noktası (Canlı Harita)</Label>
              <LocationMapPicker value={mapPoint} onChange={setMapPoint} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>İptal</Button>
              <Button type="submit">{editing ? "Güncelle" : "Oluştur"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* QR Code viewer dialog */}
      <Dialog open={!!showQR} onOpenChange={(open) => { if (!open) { setShowQR(null); setQrImage(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Kod — {showQR?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrImage ? (
              <img src={qrImage} alt="QR Code" className="w-48 h-48 rounded-lg border border-border" />
            ) : (
              <div className="w-48 h-48 rounded-lg bg-muted flex items-center justify-center">
                <Loading size={32} />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              Bu QR kodu tarayın, misafir direkt arama sayfasına gider
            </p>
            <div className="flex gap-2 w-full flex-wrap">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setShowQR(null); setQrImage(null); }}>
                Kapat
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={async () => {
                  if (!showQR) return;
                  await fetch(`/api/locations/${showQR.id}/qr`, { method: "DELETE" });
                  await fetch(`/api/locations/${showQR.id}/qr`, { method: "POST" });
                  toast.success("QR kod yeniden oluşturuldu");
                  const guestUrl = `${window.location.origin}/guest/call?location=${showQR.id}`;
                  const dataUrl = await QRCode.toDataURL(guestUrl, { width: 256, margin: 2 });
                  setQrImage(dataUrl);
                  load();
                }}
              >
                <RefreshCw className="w-4 h-4 mr-1" /> Yeniden Oluştur
              </Button>
              <Button type="button" className="flex-1" onClick={downloadQR} disabled={!qrImage}>
                <Download className="w-4 h-4 mr-1" /> İndir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
