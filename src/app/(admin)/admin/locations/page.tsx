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
import {
  Plus, MapPin, QrCode, Upload, Trash2, Image as ImageIcon, Download,
  AlertTriangle, RefreshCw, Check, ArrowLeft, ArrowRight, Map as MapIcon,
} from "lucide-react";
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
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [mapUploading, setMapUploading] = useState(false);

  // Wizard state
  const [dialogStep, setDialogStep] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [form, setForm] = useState({ name: "", description: "", displayOrder: "0" });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [mapPoint, setMapPoint] = useState<{ x: number; y: number } | null>(null);

  // Table upload state
  const [uploading, setUploading] = useState(false);
  const [uploadLocId, setUploadLocId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // QR
  const [showQR, setShowQR] = useState<Location | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/locations");
      const json = await res.json();
      if (json.success) setLocations(json.data.items);
    } catch { /* ignore */ }
    // Check map
    try {
      const sRes = await fetch("/api/admin/settings");
      const sJson = await sRes.json();
      if (sJson.success) {
        const url = sJson.data.monitor_map_url;
        setMapUrl(url && url !== "" ? url : null);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, []);

  // --- Map upload ---
  async function handleMapUpload(file: File) {
    setMapUploading(true);
    const formData = new FormData();
    formData.append("map", file);
    try {
      const res = await fetch("/api/admin/settings/map", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success) {
        setMapUrl(json.data.url);
        toast.success("Harita yüklendi");
      } else {
        toast.error(json.error?.message || "Yükleme başarısız");
      }
    } catch {
      toast.error("Ağ hatası");
    }
    setMapUploading(false);
  }

  // --- Table row logo upload ---
  function triggerRowUpload(locId: number) {
    setUploadLocId(locId);
    if (fileRef.current) fileRef.current.value = "";
    fileRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast.error("Dosya çok büyük (maks 500KB)"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Sadece resim dosyası"); return; }
    if (uploadLocId !== null) {
      await uploadLogo(uploadLocId, file);
      setUploadLocId(null);
    }
  }

  async function uploadLogo(locId: number, file: File) {
    setUploading(true);
    const fd = new FormData(); fd.append("logo", file);
    const res = await fetch(`/api/locations/${locId}/logo`, { method: "POST", body: fd });
    const json = await res.json();
    if (json.success) { toast.success("Logo yüklendi"); load(); }
    else { toast.error(json.error?.message || "Yükleme başarısız"); }
    setUploading(false);
  }

  async function deleteLogo(locId: number) {
    const res = await fetch(`/api/locations/${locId}/logo`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) { toast.success("Logo silindi"); load(); }
    else { toast.error("Silme başarısız"); }
  }

  // --- Wizard ---
  function openWizard(loc?: Location) {
    if (loc) {
      setEditing(loc);
      setForm({ name: loc.name, description: loc.description || "", displayOrder: String(loc.displayOrder) });
      setLogoPreview(loc.logo || null);
      setPendingLogoFile(null);
      setMapPoint(loc.mapX != null && loc.mapY != null ? { x: loc.mapX, y: loc.mapY } : null);
    } else {
      resetFormInternal();
    }
    setDialogStep(0);
    setShowDialog(true);
  }

  function resetFormInternal() {
    setEditing(null);
    setForm({ name: "", description: "", displayOrder: "0" });
    setLogoPreview(null);
    setPendingLogoFile(null);
    setMapPoint(null);
  }

  function resetForm() {
    resetFormInternal();
    setShowDialog(false);
    setDialogStep(0);
  }

  function canGoNext(step: number): boolean {
    if (step === 0) return form.name.trim() !== "";
    if (step === 1) return true; // map point optional
    return true;
  }

  async function handleSubmit() {
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
      if (pendingLogoFile) {
        const locId = isEdit ? editing!.id : json.data.id;
        await uploadLogo(locId, pendingLogoFile);
      }
      toast.success(isEdit ? "Konum güncellendi" : "Konum oluşturuldu");
      resetForm();
      load();
    } else {
      toast.error(json.error?.message || "Başarısız");
    }
  }

  // --- QR ---
  async function generateQR(loc: Location) {
    const res = await fetch(`/api/locations/${loc.id}/qr`, { method: "POST" });
    const json = await res.json();
    if (json.success) { toast.success("QR kod oluşturuldu"); load(); }
    else { toast.error(json.error?.message || "Başarısız"); }
  }

  async function viewQR(loc: Location) {
    if (!loc.qrCodeData) { toast.error("Önce QR kod oluşturun"); return; }
    setShowQR(loc);
    try {
      const guestUrl = `${window.location.origin}/guest/call?location=${loc.id}`;
      const dataUrl = await QRCode.toDataURL(guestUrl, { width: 256, margin: 2 });
      setQrImage(dataUrl);
    } catch { toast.error("QR oluşturulamadı"); }
  }

  async function deleteQR(loc: Location) {
    const res = await fetch(`/api/locations/${loc.id}/qr`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) { toast.success("QR kod silindi"); load(); }
    else { toast.error(json.error?.message || "Silme başarısız"); }
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
      {/* First-time warning */}
      {isNew && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-amber-600">En az bir konum oluşturmalısınız</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Shuttle çağrı sistemi için en az bir alış/bırakma noktası tanımlamanız gerekiyor.
              {!mapUrl && " Önce otel haritasını yükleyin, sonra haritadan konumları işaretleyin."}
            </p>
          </div>
        </div>
      )}

      {/* Map upload prerequisite card — show when no map and no locations or isNew */}
      {!mapUrl && (isNew || locations.length === 0) && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="rounded-full bg-primary/10 p-4">
                <MapIcon className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Adım 1: Otel Haritasını Yükleyin</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">
                  Konum eklemeye başlamadan önce otel yerleşke haritasını yükleyin.
                  Harita PNG, JPG veya WebP formatında, maksimum 5MB olmalıdır.
                </p>
              </div>
              <div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  id="map-upload-input"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 5 * 1024 * 1024) { toast.error("Dosya çok büyük (maks 5MB)"); return; }
                    await handleMapUpload(f);
                  }}
                />
                <Button
                  size="lg"
                  onClick={() => document.getElementById("map-upload-input")?.click()}
                  disabled={mapUploading}
                >
                  {mapUploading ? <Loading size={16} /> : <Upload className="w-4 h-4 mr-2" />}
                  Harita Yükle
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Map preview + manage */}
      {mapUrl && (
        <Card className="overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={mapUrl} alt="Otel Haritası" className="h-16 w-auto rounded-lg border object-cover" />
              <div>
                <p className="font-medium">Otel Haritası</p>
                <p className="text-sm text-muted-foreground">Konumlar bu harita üzerinde işaretlenir</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const res = await fetch("/api/admin/settings/map", { method: "DELETE" });
                  const json = await res.json();
                  if (json.success) { setMapUrl(null); toast.success("Harita silindi"); }
                } catch { toast.error("Silme başarısız"); }
              }}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Haritayı Kaldır
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Konumlar</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const withQr = locations.filter((l) => l.qrCodeData);
              if (withQr.length === 0) {
                toast.error("İndirilecek QR kodu yok");
                return;
              }
              toast.success(`${withQr.length} QR kodu indiriliyor...`);
              const JSZip = (await import("jszip")).default;
              const zip = new JSZip();
              for (const loc of withQr) {
                const guestUrl = `${window.location.origin}/guest/call?location=${loc.id}`;
                const dataUrl = await QRCode.toDataURL(guestUrl, { width: 512, margin: 2 });
                const base64 = dataUrl.split(",")[1];
                const filename = loc.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
                zip.file(`qr-${filename}.png`, base64, { base64: true });
              }
              const blob = await zip.generateAsync({ type: "blob" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = `qr-kodlari-${new Date().toISOString().slice(0, 10)}.zip`;
              link.click();
              URL.revokeObjectURL(link.href);
            }}
            disabled={locations.filter((l) => l.qrCodeData).length === 0}
          >
            <Download className="w-4 h-4 mr-1" /> Tüm QR&apos;ları İndir
          </Button>
          <Button
            onClick={() => openWizard()}
            disabled={!mapUrl}
            title={!mapUrl ? "Önce harita yükleyin" : undefined}
          >
            <Plus className="w-4 h-4 mr-1" /> Konum Ekle
          </Button>
        </div>
      </div>

      {/* Locations table */}
      <Card>
        <CardContent className="p-0">
          {locations.length === 0 ? (
            <EmptyState
              icon={<MapPin className="h-12 w-12" />}
              title="Konum yok"
              description={mapUrl ? "Alış/bırakma noktaları ekleyin" : "Haritayı yükledikten sonra konum ekleyebilirsiniz"}
            />
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
                        <Button size="sm" variant="outline" onClick={() => openWizard(l)}>Düzenle</Button>
                        <Button
                          size="sm" variant="ghost" className="px-2" title="Logo yükle"
                          onClick={() => triggerRowUpload(l.id)} disabled={uploading}
                        >
                          {uploading && uploadLocId === l.id ? <Loading size={14} /> : <Upload className="w-3.5 h-3.5" />}
                        </Button>
                        {l.logo && (
                          <Button size="sm" variant="ghost" className="px-2 text-destructive" title="Logo sil"
                            onClick={() => deleteLogo(l.id)}>
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

      {/* Hidden file input for row uploads */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {/* Step-by-step wizard dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Konum Düzenle" : `Yeni Konum — Adım ${dialogStep + 1}/2`}
            </DialogTitle>
          </DialogHeader>

          {/* Step indicators */}
          <div className="flex gap-2 mb-2">
            {[0, 1].map((s) => (
              <div key={s} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${
                  s <= dialogStep ? "bg-primary" : "bg-muted"
                }`} />
              </div>
            ))}
          </div>

          {/* Step 0: Basic info + logo */}
          {dialogStep === 0 && (
            <div className="space-y-4">
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
                      type="button" variant="outline" size="sm"
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file"; input.accept = "image/*";
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
                      <Button type="button" variant="ghost" size="sm" className="text-destructive"
                        onClick={() => { setLogoPreview(null); setPendingLogoFile(null); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">PNG, JPG · maks 500KB</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Ad *</Label>
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
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="outline" onClick={() => resetForm()}>İptal</Button>
                <Button type="button" onClick={() => setDialogStep(1)} disabled={!canGoNext(0)}>
                  Devam Et <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 1: Map point picker */}
          {dialogStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Harita Noktası</Label>
                <p className="text-xs text-muted-foreground">
                  Konumun haritadaki yerini işaretleyin. Haritaya tıklayarak nokta ekleyin.
                </p>
                <LocationMapPicker value={mapPoint} onChange={setMapPoint} mapUrl={mapUrl} />
              </div>
              <div className="flex gap-2 justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setDialogStep(0)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Geri
                </Button>
                <Button type="button" onClick={handleSubmit}>
                  <Check className="w-4 h-4 mr-1" />
                  {editing ? "Güncelle" : "Konumu Oluştur"}
                </Button>
              </div>
            </div>
          )}
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
                type="button" variant="outline" className="flex-1"
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
