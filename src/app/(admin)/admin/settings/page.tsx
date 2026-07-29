"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { Settings, AlertTriangle, CheckCircle, Trash2, Map, Crosshair, Building2, Upload, Image } from "lucide-react";
import { useRouter } from "next/navigation";

interface SettingsState {
  demo_mode: "true" | "false";
  monitor_enabled: "true" | "false";
  gps_tracking: "true" | "false";
  hotel_name: string;
  hotel_phone: string;
  hotel_email: string;
  hotel_address: string;
  hotel_logo: string;
  monitor_map_url: string;
}

const defaults: SettingsState = {
  demo_mode: "true",
  monitor_enabled: "true",
  gps_tracking: "true",
  hotel_name: "",
  hotel_phone: "",
  hotel_email: "",
  hotel_address: "",
  hotel_logo: "",
  monitor_map_url: "",
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(defaults);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [mapUploading, setMapUploading] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const r = await fetch("/api/admin/settings");
        const json = await r.json();
        if (json.success) {
          setSettings((prev) => ({
            ...prev,
            demo_mode: (json.data.demo_mode as "true" | "false") || "true",
            monitor_enabled: (json.data.monitor_enabled as "true" | "false") || "true",
            gps_tracking: (json.data.gps_tracking as "true" | "false") || "true",
            hotel_name: json.data.hotel_name || "",
            hotel_phone: json.data.hotel_phone || "",
            hotel_email: json.data.hotel_email || "",
            hotel_address: json.data.hotel_address || "",
            hotel_logo: json.data.hotel_logo || "",
            monitor_map_url: json.data.monitor_map_url || "",
          }));
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    load();
  }, []);

  function setField(key: string, value: string) {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      // Auto-save on toggle change
      void savePartial(key, value);
      return next;
    });
  }

  async function savePartial(key: string, value: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Ayar kaydedildi");
      } else {
        toast.error(json.error?.message || "Kaydetme başarısız");
      }
    } catch {
      toast.error("Ağ hatası");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading fullPage />;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7" /> Ayarlar
        </h1>
        <p className="text-muted-foreground mt-1.5">
          Sistem ayarlarını yapılandırın
        </p>
      </div>

      {/* Otel Profili */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2"><Building2 className="w-5 h-5" /> Otel Profili</CardTitle>
          <CardDescription>Otel bilgileri, logo ve harita ayarları</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {settings.hotel_logo ? (
                <img src={settings.hotel_logo} alt="Otel Logo" className="w-full h-full object-cover" />
              ) : (
                <Image className="w-8 h-8 text-muted-foreground" />
              )}
            </div>
            <div className="space-y-2 flex-1">
              <Label className="text-sm font-semibold">Otel Logosu</Label>
              <div className="flex gap-2">
                <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    if (f.size > 500 * 1024) { toast.error("Dosya çok büyük (maks 500KB)"); return; }
                    const fd = new FormData(); fd.append("logo", f);
                    setLogoUploading(true);
                    try {
                      const r = await fetch("/api/admin/settings/logo", { method: "POST", body: fd });
                      const j = await r.json();
                      if (j.success) { setSettings((p) => ({ ...p, hotel_logo: j.data.url })); toast.success("Logo yüklendi"); }
                      else toast.error(j.error?.message || "Yükleme başarısız");
                    } catch { toast.error("Ağ hatası"); }
                    setLogoUploading(false);
                  }} />
                <Button size="sm" variant="outline" disabled={logoUploading}
                  onClick={() => logoRef.current?.click()}>
                  {logoUploading ? <Loading size={14} /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                  {settings.hotel_logo ? "Değiştir" : "Yükle"}
                </Button>
                {settings.hotel_logo && (
                  <Button size="sm" variant="outline" className="text-destructive"
                    onClick={async () => {
                      try {
                        const r = await fetch("/api/admin/settings/logo", { method: "DELETE" });
                        if ((await r.json()).success) { setSettings((p) => ({ ...p, hotel_logo: "" })); toast.success("Logo silindi"); }
                      } catch { toast.error("Silme başarısız"); }
                    }}><Trash2 className="w-3.5 h-3.5" /></Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG, WebP · maks 500KB</p>
            </div>
          </div>

          {/* Otel adı + iletişim */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="hname" className="text-sm">Otel Adı</Label>
              <Input id="hname" value={settings.hotel_name}
                onChange={(e) => setSettings((p) => ({ ...p, hotel_name: e.target.value }))}
                onBlur={() => { if (settings.hotel_name) void savePartial("hotel_name", settings.hotel_name); }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hphone" className="text-sm">Telefon</Label>
              <Input id="hphone" value={settings.hotel_phone}
                onChange={(e) => setSettings((p) => ({ ...p, hotel_phone: e.target.value }))}
                onBlur={() => { if (settings.hotel_phone) void savePartial("hotel_phone", settings.hotel_phone); }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hemail" className="text-sm">E-posta</Label>
              <Input id="hemail" type="email" value={settings.hotel_email}
                onChange={(e) => setSettings((p) => ({ ...p, hotel_email: e.target.value }))}
                onBlur={() => { if (settings.hotel_email) void savePartial("hotel_email", settings.hotel_email); }} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="haddr" className="text-sm">Adres</Label>
              <Input id="haddr" value={settings.hotel_address}
                onChange={(e) => setSettings((p) => ({ ...p, hotel_address: e.target.value }))}
                onBlur={() => { if (settings.hotel_address) void savePartial("hotel_address", settings.hotel_address); }} />
            </div>
          </div>

          {/* Harita */}
          <div className="border-t border-border pt-4 space-y-3">
            <Label className="text-sm font-semibold">Otel Haritası</Label>
            {settings.monitor_map_url ? (
              <div className="flex items-center gap-4 p-3 rounded-lg border border-border">
                <img src={settings.monitor_map_url} alt="Otel Haritası" className="h-14 w-auto rounded border object-cover" />
                <div className="flex gap-2">
                  <input ref={mapRef} type="file" accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      if (f.size > 5 * 1024 * 1024) { toast.error("Dosya çok büyük (maks 5MB)"); return; }
                      const fd = new FormData(); fd.append("map", f);
                      setMapUploading(true);
                      try {
                        const r = await fetch("/api/admin/settings/map", { method: "POST", body: fd });
                        const j = await r.json();
                        if (j.success) { setSettings((p) => ({ ...p, monitor_map_url: j.data.url })); toast.success("Harita yüklendi"); }
                        else toast.error(j.error?.message || "Yükleme başarısız");
                      } catch { toast.error("Ağ hatası"); }
                      setMapUploading(false);
                    }} />
                  <Button size="sm" variant="outline" disabled={mapUploading}
                    onClick={() => mapRef.current?.click()}>
                    {mapUploading ? <Loading size={14} /> : <Upload className="w-3.5 h-3.5 mr-1" />} Değiştir
                  </Button>
                  <Button size="sm" variant="outline"
                    onClick={async () => {
                      try {
                        const r = await fetch("/api/admin/settings/map", { method: "DELETE" });
                        if ((await r.json()).success) { setSettings((p) => ({ ...p, monitor_map_url: "" })); toast.success("Harita silindi"); }
                      } catch { toast.error("Silme başarısız"); }
                    }}><Trash2 className="w-3.5 h-3.5 mr-1" /> Kaldır</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <input ref={mapRef} type="file" accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    if (f.size > 5 * 1024 * 1024) { toast.error("Dosya çok büyük (maks 5MB)"); return; }
                    const fd = new FormData(); fd.append("map", f);
                    setMapUploading(true);
                    try {
                      const r = await fetch("/api/admin/settings/map", { method: "POST", body: fd });
                      const j = await r.json();
                      if (j.success) { setSettings((p) => ({ ...p, monitor_map_url: j.data.url })); toast.success("Harita yüklendi"); }
                      else toast.error(j.error?.message || "Yükleme başarısız");
                    } catch { toast.error("Ağ hatası"); }
                    setMapUploading(false);
                  }} />
                <Button size="sm" variant="outline" disabled={mapUploading}
                  onClick={() => mapRef.current?.click()}>
                  {mapUploading ? <Loading size={14} /> : <Upload className="w-3.5 h-3.5 mr-1" />} Harita Yükle
                </Button>
                <p className="text-xs text-muted-foreground">PNG, JPG, WebP · maks 5MB</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Demo Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            {settings.demo_mode === "true" ? (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            ) : (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
            Demo Mod
          </CardTitle>
          <CardDescription>
            Demo mod aktif olduğunda sürücüler ilk girişte şifre değiştirmek ve
            e-posta girmek zorunda kalmaz. Kapatıldığında bu zorunluluklar devreye girer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-6">
            <div className="space-y-1">
              <Label htmlFor="demo-mode" className="text-base font-medium">
                Demo Mod
              </Label>
              <p className="text-sm text-muted-foreground">
                {settings.demo_mode === "true"
                  ? "Demo mod aktif — şifre değiştirme ve e-posta zorunluluğu YOK"
                  : "Demo mod kapalı — ilk girişte şifre değiştirme ve e-posta ZORUNLU"}
              </p>
            </div>
            <Switch
              id="demo-mode"
              checked={settings.demo_mode === "true"}
              disabled={saving}
              onCheckedChange={(v) => setField("demo_mode", v ? "true" : "false")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Canlı Harita İzleme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Map className="w-5 h-5" />
            Canlı Harita İzleme
          </CardTitle>
          <CardDescription>
            Canlı harita izleme özelliğini açıp kapatın. Harita açıkken admin panelinden
            araçların ve çağrıların anlık konumlarını görebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-6">
            <div className="space-y-1">
              <Label htmlFor="monitor-enabled" className="text-base font-medium">
                Canlı Harita
              </Label>
              <p className="text-sm text-muted-foreground">
                {settings.monitor_enabled === "true"
                  ? "Harita aktif — araç ve çağrı konumları canlı izlenebilir"
                  : "Harita kapalı — monitor sayfası devre dışı"}
              </p>
            </div>
            <Switch
              id="monitor-enabled"
              checked={settings.monitor_enabled === "true"}
              disabled={saving}
              onCheckedChange={(v) => setField("monitor_enabled", v ? "true" : "false")}
            />
          </div>
        </CardContent>
      </Card>

      {/* GPS / Konum Takibi */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Crosshair className="w-5 h-5" />
            GPS Konum Takibi
          </CardTitle>
          <CardDescription>
            Şoförlerden gerçek zamanlı konum bilgisi toplanmasını kontrol eder. Kapalıysa şoför paneli konum izni istemez.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="gps-tracking" className="text-base font-medium">
                GPS Konum Takibi
              </Label>
              <p className="text-sm text-muted-foreground">
                {settings.gps_tracking === "true"
                  ? "GPS takip aktif — şoförlerin anlık konumu haritada görünür"
                  : "GPS takip kapalı — şoförlerden konum bilgisi toplanmaz"}
              </p>
            </div>
            <Switch
              id="gps-tracking"
              checked={settings.gps_tracking === "true"}
              disabled={saving}
              onCheckedChange={(v) => setField("gps_tracking", v ? "true" : "false")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sistem Sıfırlama */}
      <Card className="border-destructive/30 bg-red-50/40">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Sistem Sıfırlama
          </CardTitle>
          <CardDescription>
            Tüm verileri (oteller, kullanıcılar, araçlar, konumlar, çağrı kayıtları) kalıcı
            olarak siler. Sistem kurulum sayfasına döner. Bu işlem geri alınamaz!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive font-medium">
              Devam etmek için aşağıya &quot;SIFIRLA&quot; yazın ve butona basın.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={resetConfirm}
              onChange={(e) => setResetConfirm(e.target.value)}
              placeholder="SIFIRLA"
              className="max-w-[200px]"
            />
            <Button
              variant="destructive"
              disabled={resetConfirm !== "SIFIRLA" || resetting}
              onClick={async () => {
                setResetting(true);
                try {
                  const res = await fetch("/api/admin/reset", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ confirm: "SIFIRLA" }),
                  });
                  const json = await res.json();
                  if (json.success) {
                    toast.success(json.data.message);
                    router.push("/setup");
                  } else {
                    toast.error(json.error?.message || "Sıfırlama başarısız");
                  }
                } catch {
                  toast.error("Ağ hatası");
                } finally {
                  setResetting(false);
                }
              }}
            >
              {resetting ? <Loading size={16} /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              Sistemi Sıfırla
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
