"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { Settings, AlertTriangle, CheckCircle, User, Phone, DoorOpen, Eye, X, Trash2, Map } from "lucide-react";
import { useRouter } from "next/navigation";

type FieldMode = "required" | "optional" | "off";

interface SettingsState {
  demo_mode: "true" | "false";
  guest_fields_name: FieldMode;
  guest_fields_room: FieldMode;
  guest_fields_phone: FieldMode;
  monitor_enabled: "true" | "false";
}

const defaults: SettingsState = {
  demo_mode: "true",
  guest_fields_name: "optional",
  guest_fields_room: "optional",
  guest_fields_phone: "optional",
  monitor_enabled: "true",
};

// --- Preview component ---
function GuestCallPreview({ settings }: { settings: SettingsState }) {
  const activeFields: Array<{ key: string; label: string; icon: React.ReactNode; mode: FieldMode }> = [
    { key: "guest_fields_name", label: "İsim", icon: <User className="w-4 h-4" />, mode: settings.guest_fields_name },
    { key: "guest_fields_room", label: "Oda No", icon: <DoorOpen className="w-4 h-4" />, mode: settings.guest_fields_room },
    { key: "guest_fields_phone", label: "Telefon", icon: <Phone className="w-4 h-4" />, mode: settings.guest_fields_phone },
  ];

  const visible = activeFields.filter((f) => f.mode !== "off");

  if (visible.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        Hiçbir bilgi alanı aktif değil.<br />Sadece &quot;Shuttle Çağır&quot; butonu gösterilir.
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left">
      <p className="text-xs text-muted-foreground text-center font-medium uppercase tracking-wide">Önizleme</p>
      {visible.map((f) => (
        <div key={f.key} className="space-y-1.5">
          <Label className="text-sm flex items-center gap-1.5">
            {f.icon}
            {f.label}
            {f.mode === "required" && <span className="text-red-500 text-xs">*</span>}
            {f.mode === "optional" && <span className="text-muted-foreground text-xs">(opsiyonel)</span>}
          </Label>
          <div className="h-9 rounded-lg border bg-muted/50 px-3 flex items-center text-sm text-muted-foreground">
            {f.label} yazın...
          </div>
        </div>
      ))}
      <Button className="w-full mt-2" size="sm">
        Shuttle Çağır
      </Button>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(defaults);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setSettings({
            demo_mode: (json.data.demo_mode as "true" | "false") || "true",
            guest_fields_name: (json.data.guest_fields_name as FieldMode) || "optional",
            guest_fields_room: (json.data.guest_fields_room as FieldMode) || "optional",
            guest_fields_phone: (json.data.guest_fields_phone as FieldMode) || "optional",
            monitor_enabled: (json.data.monitor_enabled as "true" | "false") || "true",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Ayarlar kaydedildi");
      } else {
        toast.error(json.error?.message || "Kaydetme başarısız");
      }
    } catch {
      toast.error("Ağ hatası");
    } finally {
      setSaving(false);
    }
  }

  function setField(key: string, value: string) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) return <Loading fullPage />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-6 h-6" /> Ayarlar
        </h1>
        <p className="text-muted-foreground mt-1">
          Sistem ayarlarını yapılandırın
        </p>
      </div>

      {/* Demo Mode */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="demo-mode" className="text-base">
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
              onCheckedChange={(v) => setField("demo_mode", v ? "true" : "false")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Canlı Harita İzleme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="w-5 h-5" />
            Canlı Harita İzleme
          </CardTitle>
          <CardDescription>
            Canlı harita izleme özelliğini açıp kapatın. Harita açıkken admin panelinden
            araçların ve çağrıların anlık konumlarını görebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="monitor-enabled" className="text-base">
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
              onCheckedChange={(v) => setField("monitor_enabled", v ? "true" : "false")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Guest Request Page Settings */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" /> Misafir Talep Sayfası Ayarları
            </CardTitle>
            <CardDescription>
              QR kod okutulunca misafire gösterilecek sayfada hangi bilgilerin isteneceğini belirleyin.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(!previewOpen)}>
            {previewOpen ? <X className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {previewOpen ? "Kapat" : "Önizleme"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Settings */}
            <div className="space-y-6">
              {/* Name */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base flex items-center gap-1.5">
                    <User className="w-4 h-4" /> Misafir Adı
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {settings.guest_fields_name === "required" && "Zorunlu — isim girmeden talep yapılamaz"}
                    {settings.guest_fields_name === "optional" && "Opsiyonel — istenirse isim girilebilir"}
                    {settings.guest_fields_name === "off" && "Kapalı — isim sorulmaz"}
                  </p>
                </div>
                <Select value={settings.guest_fields_name} onValueChange={(v) => setField("guest_fields_name", v ?? "optional")}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="required">Zorunlu</SelectItem>
                    <SelectItem value="optional">Opsiyonel</SelectItem>
                    <SelectItem value="off">Kapalı</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Room */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base flex items-center gap-1.5">
                    <DoorOpen className="w-4 h-4" /> Oda Numarası
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {settings.guest_fields_room === "required" && "Zorunlu — oda numarası girmeden talep yapılamaz"}
                    {settings.guest_fields_room === "optional" && "Opsiyonel — istenirse oda numarası girilebilir"}
                    {settings.guest_fields_room === "off" && "Kapalı — oda sorulmaz"}
                  </p>
                </div>
                <Select value={settings.guest_fields_room} onValueChange={(v) => setField("guest_fields_room", v ?? "optional")}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="required">Zorunlu</SelectItem>
                    <SelectItem value="optional">Opsiyonel</SelectItem>
                    <SelectItem value="off">Kapalı</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Phone */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base flex items-center gap-1.5">
                    <Phone className="w-4 h-4" /> Telefon
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {settings.guest_fields_phone === "required" && "Zorunlu — telefon girmeden talep yapılamaz"}
                    {settings.guest_fields_phone === "optional" && "Opsiyonel — istenirse telefon girilebilir"}
                    {settings.guest_fields_phone === "off" && "Kapalı — telefon sorulmaz"}
                  </p>
                </div>
                <Select value={settings.guest_fields_phone} onValueChange={(v) => setField("guest_fields_phone", v ?? "optional")}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="required">Zorunlu</SelectItem>
                    <SelectItem value="optional">Opsiyonel</SelectItem>
                    <SelectItem value="off">Kapalı</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={save} disabled={saving} className="w-full">
                {saving ? <Loading size={16} /> : "Kaydet"}
              </Button>
            </div>

            {/* Preview pane — always visible on desktop, toggle on mobile */}
            <div className={`${previewOpen ? "block" : "hidden lg:block"}`}>
              <div className="rounded-xl border bg-card p-4">
                <GuestCallPreview settings={settings} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sistem Sıfırlama */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
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
          <div className="flex gap-3">
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
              {resetting ? <Loading size={16} /> : <Trash2 className="w-4 h-4 mr-1" />}
              Sistemi Sıfırla
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
