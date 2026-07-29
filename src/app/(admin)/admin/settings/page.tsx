"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { Settings, AlertTriangle, CheckCircle, Trash2, Map } from "lucide-react";
import { useRouter } from "next/navigation";

interface SettingsState {
  demo_mode: "true" | "false";
  monitor_enabled: "true" | "false";
}

const defaults: SettingsState = {
  demo_mode: "true",
  monitor_enabled: "true",
};

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingsState>(defaults);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setSettings({
            demo_mode: (json.data.demo_mode as "true" | "false") || "true",
            monitor_enabled: (json.data.monitor_enabled as "true" | "false") || "true",
          });
        }
      })
      .finally(() => setLoading(false));
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
