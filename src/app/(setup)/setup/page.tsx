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
import { Upload, X } from "lucide-react";

const MAX_LOGO_BYTES = 500 * 1024; // 500KB

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    hotelName: "",
    hotelCode: "",
    timezone: "Europe/Istanbul",
    adminUsername: "admin",
    adminPassword: "",
    setupSecret: "",
    adminFullName: "",
    adminEmail: "",
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
    setChecking(false);
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const logoBase64 = await getLogoBase64();
      const body: Record<string, unknown> = { ...form };
      if (logoBase64) body.hotelLogo = logoBase64;

      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Setup completed! Please login.");
        router.push("/login");
      } else {
        toast.error(json.error?.message || "Setup failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Kurulum</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Label htmlFor="setupSecretCheck">Kurulum Anahtarı</Label>
          <Input id="setupSecretCheck" type="password" autoComplete="off" value={form.setupSecret} onChange={(e) => setForm({ ...form, setupSecret: e.target.value })} required />
          <Button className="w-full" onClick={checkSetup} disabled={!form.setupSecret}>Devam Et</Button>
        </CardContent>
      </Card>
    </div>
  );
  if (!setupRequired) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/images/logo.png" alt="ShuttleCall" className="h-12 w-auto" />
          <h1 className="text-2xl font-bold">Kurulum</h1>
          <p className="text-sm text-muted-foreground">Otel ve yönetici hesabı oluşturun</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Otel Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hotelName">Otel Adı</Label>
                <Input id="hotelName" value={form.hotelName} onChange={(e) => setForm({ ...form, hotelName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hotelCode">Otel Kodu</Label>
                <Input id="hotelCode" value={form.hotelCode} onChange={(e) => setForm({ ...form, hotelCode: e.target.value })} required />
                <p className="text-xs text-muted-foreground">Kısa kod, örn. OTEL</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Zaman Dilimi</Label>
                <Input id="timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} required />
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Yönetici Hesabı</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adminUsername">Yönetici Kullanıcı Adı</Label>
                <Input id="adminUsername" value={form.adminUsername} onChange={(e) => setForm({ ...form, adminUsername: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminFullName">Ad Soyad</Label>
                <Input id="adminFullName" value={form.adminFullName} onChange={(e) => setForm({ ...form, adminFullName: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">E-posta</Label>
                <Input id="adminEmail" type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setupSecret">Kurulum Anahtarı</Label>
                <Input id="setupSecret" type="password" autoComplete="off" value={form.setupSecret} onChange={(e) => setForm({ ...form, setupSecret: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Şifre</Label>
                <Input id="adminPassword" type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} required />
                <p className="text-xs text-muted-foreground">En az 8 karakter; büyük/küçük harf, rakam ve özel karakter</p>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" size="lg" disabled={submitting}>
            {submitting ? <Loading size={16} /> : "Kurulumu Tamamla"}
          </Button>
        </form>
      </div>
    </div>
  );
}
