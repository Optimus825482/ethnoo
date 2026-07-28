/* eslint-disable @next/next/no-img-element -- Native img preserves dynamic URL/error and intrinsic sizing behavior. */
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { Upload, X, ArrowLeft, ArrowRight, Check } from "lucide-react";

const MAX_LOGO_BYTES = 500 * 1024; // 500KB

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0=secret check, 1=hotel, 2=buggies, 3=drivers, 4=admin
  const [setupRequired, setSetupRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    hotelName: "",
    hotelCode: "",
    timezone: "Europe/Istanbul",
    adminUsername: "admin",
    adminPassword: "",
    setupSecret: "",
    adminFullName: "",
    adminEmail: "",
    buggyCount: 0,
    createDrivers: false,
    driverPassword: "",
  });

  async function checkSetup() {
    const res = await fetch("/api/setup", {
      headers: { "x-setup-secret": form.setupSecret },
    });
    const json = await res.json();
    if (!json.success) {
      toast.error(json.error?.message || "Setup check failed");
      return;
    }
    if (!json.data.setupRequired) {
      router.push("/login");
      return;
    }
    setSetupRequired(true);
    setStep(1);
  }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) { toast.error("Logo maksimum 500KB olmalı"); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { toast.error("Sadece PNG, JPG, WebP"); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function clearLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  function getLogoBase64(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!logoFile) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(logoFile);
    });
  }

  function setField(key: string, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canGoNext(currentStep: number): boolean {
    switch (currentStep) {
      case 1: return form.hotelName.trim() !== "" && form.hotelCode.trim() !== "";
      case 2: return true; // buggy count 0 is valid
      case 3: return !form.createDrivers || form.driverPassword.length >= 8;
      case 4: return (
        form.adminUsername.trim() !== "" &&
        form.adminFullName.trim() !== "" &&
        form.adminPassword.length >= 8 &&
        form.setupSecret.trim() !== ""
      );
      default: return false;
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const logoBase64 = await getLogoBase64();
      const body: Record<string, unknown> = {
        hotelName: form.hotelName,
        hotelCode: form.hotelCode,
        timezone: form.timezone,
        adminUsername: form.adminUsername,
        adminPassword: form.adminPassword,
        adminFullName: form.adminFullName,
        adminEmail: form.adminEmail || undefined,
        setupSecret: form.setupSecret,
        buggyCount: form.buggyCount,
        createDrivers: form.createDrivers,
        driverPassword: form.createDrivers ? form.driverPassword : undefined,
      };
      if (logoBase64) body.hotelLogo = logoBase64;

      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.data.message || "Kurulum tamamlandı!");
        router.push("/login");
      } else {
        toast.error(json.error?.message || "Kurulum başarısız");
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Step 0: Setup secret check
  if (step === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader><CardTitle>Kurulum</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Label htmlFor="setupSecretCheck">Kurulum Anahtarı</Label>
            <Input id="setupSecretCheck" type="password" autoComplete="off" value={form.setupSecret} onChange={(e) => setField("setupSecret", e.target.value)} required />
            <Button className="w-full" onClick={checkSetup} disabled={!form.setupSecret}>Devam Et</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!setupRequired) return null;

  const totalSteps = 4;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/images/logo.png" alt="ShuttleCall" className="h-12 w-auto" />
          <h1 className="text-2xl font-bold">Kurulum</h1>
          <p className="text-sm text-muted-foreground">
            Adım {step}/{totalSteps}
          </p>
          {/* Step indicators */}
          <div className="flex gap-2 mt-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  s < step
                    ? "bg-primary text-primary-foreground"
                    : s === step
                      ? "bg-primary/20 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <Check className="w-4 h-4" /> : s}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Hotel info */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Otel Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hotelName">Otel Adı</Label>
                <Input id="hotelName" value={form.hotelName} onChange={(e) => setField("hotelName", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hotelCode">Otel Kodu</Label>
                <Input id="hotelCode" value={form.hotelCode} onChange={(e) => setField("hotelCode", e.target.value)} required />
                <p className="text-xs text-muted-foreground">Kısa kod, örn. OTEL</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Zaman Dilimi</Label>
                <Input id="timezone" value={form.timezone} onChange={(e) => setField("timezone", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Otel Logosu (opsiyonel)</Label>
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoSelect} className="hidden" />
                {logoPreview ? (
                  <div className="relative inline-block">
                    <img src={logoPreview} alt="Logo önizleme" className="h-20 object-contain rounded-lg border" />
                    <button type="button" onClick={clearLogo} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-1" /> Logo Yükle
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">PNG, JPG, WebP — maks. 500KB</p>
              </div>
              <div className="flex gap-2 justify-between pt-2">
                <div />
                <Button onClick={() => setStep(2)} disabled={!canGoNext(1)}>
                  Devam Et <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Buggy fleet */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Buggy Filosu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="buggyCount">Kaç adet buggy aracı kaydedilsin?</Label>
                <Input
                  id="buggyCount"
                  type="number"
                  min={0}
                  max={50}
                  value={form.buggyCount}
                  onChange={(e) => setField("buggyCount", Math.max(0, Math.min(50, parseInt(e.target.value) || 0)))}
                />
                <p className="text-xs text-muted-foreground">
                  {form.buggyCount === 0
                    ? "Şimdilik araç eklemek istemiyorum. Daha sonra admin panelinden eklenebilir."
                    : `${form.buggyCount} adet buggy aracı kaydedilecek (BG-001 — BG-${String(form.buggyCount).padStart(3, "0")})`}
                </p>
              </div>
              <div className="flex gap-2 justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Geri
                </Button>
                <Button onClick={() => setStep(3)} disabled={!canGoNext(2)}>
                  Devam Et <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Drivers */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Şoför Hesapları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.buggyCount > 0 ? (
                <>
                  <div className="space-y-2">
                    <Label>Her araç için otomatik şoför oluşturulsun mu?</Label>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant={form.createDrivers ? "default" : "outline"}
                        onClick={() => setField("createDrivers", true)}
                        className="flex-1"
                        size="sm"
                      >
                        Evet
                      </Button>
                      <Button
                        type="button"
                        variant={!form.createDrivers ? "default" : "outline"}
                        onClick={() => setField("createDrivers", false)}
                        className="flex-1"
                        size="sm"
                      >
                        Hayır
                      </Button>
                    </div>
                  </div>

                  {form.createDrivers && (
                    <>
                      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                        <p className="font-medium">Oluşturulacak şoför hesapları:</p>
                        <ul className="list-disc list-inside mt-1 space-y-0.5 text-muted-foreground">
                          {Array.from({ length: form.buggyCount }, (_, i) => (
                            <li key={i}>
                              <strong>buggy{i + 1}</strong> — BG-{String(i + 1).padStart(3, "0")} Şoförü
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="driverPassword">Şoför Şifresi</Label>
                        <Input
                          id="driverPassword"
                          type="password"
                          value={form.driverPassword}
                          onChange={(e) => setField("driverPassword", e.target.value)}
                          placeholder="Tüm şoförler için ortak şifre"
                        />
                        <p className="text-xs text-muted-foreground">
                          En az 8 karakter; büyük/küçük harf, rakam ve özel karakter
                        </p>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  <p>Buggy aracı eklemediğiniz için şoför oluşturma adımı atlanıyor.</p>
                  <p className="mt-1">Admin panelinden daha sonra manuel olarak ekleyebilirsiniz.</p>
                </div>
              )}
              <div className="flex gap-2 justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Geri
                </Button>
                <Button onClick={() => setStep(4)} disabled={!canGoNext(3)}>
                  Devam Et <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Admin account */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Yönetici Hesabı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminUsername">Yönetici Kullanıcı Adı</Label>
                <Input id="adminUsername" value={form.adminUsername} onChange={(e) => setField("adminUsername", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminFullName">Ad Soyad</Label>
                <Input id="adminFullName" value={form.adminFullName} onChange={(e) => setField("adminFullName", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">E-posta</Label>
                <Input id="adminEmail" type="email" value={form.adminEmail} onChange={(e) => setField("adminEmail", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setupSecret">Kurulum Anahtarı</Label>
                <Input id="setupSecret" type="password" autoComplete="off" value={form.setupSecret} onChange={(e) => setField("setupSecret", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Şifre</Label>
                <Input id="adminPassword" type="password" value={form.adminPassword} onChange={(e) => setField("adminPassword", e.target.value)} required />
                <p className="text-xs text-muted-foreground">En az 8 karakter; büyük/küçük harf, rakam ve özel karakter</p>
              </div>

              {/* Summary */}
              <div className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
                <p className="font-medium">Kurulum Özeti:</p>
                <p className="text-muted-foreground">Otel: {form.hotelName} ({form.hotelCode})</p>
                {form.buggyCount > 0 && (
                  <p className="text-muted-foreground">
                    Araç: {form.buggyCount} buggy
                    {form.createDrivers && ` — ${form.buggyCount} şoför`}
                  </p>
                )}
                <p className="text-muted-foreground">Yönetici: {form.adminUsername}</p>
              </div>

              <div className="flex gap-2 justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="w-4 h-4 mr-1" /> Geri
                </Button>
                <Button onClick={handleSubmit} disabled={!canGoNext(4) || submitting}>
                  {submitting ? <Loading size={16} /> : "Kurulumu Tamamla"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
