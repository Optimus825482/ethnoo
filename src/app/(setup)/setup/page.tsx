"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { Car } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    hotelName: "",
    hotelCode: "",
    timezone: "Europe/Istanbul",
    adminUsername: "admin",
    adminPassword: "",
    adminFullName: "",
    adminEmail: "",
  });

  useEffect(() => {
    async function check() {
      const res = await fetch("/api/setup");
      const json = await res.json();
      if (json.success) {
        setSetupRequired(json.data.setupRequired);
        if (!json.data.setupRequired) {
          router.push("/login");
          return;
        }
      }
      setChecking(false);
    }
    check();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  if (checking) return <Loading fullPage />;
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
                <Label htmlFor="adminPassword">Şifre</Label>
                <Input id="adminPassword" type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} required />
                <p className="text-xs text-muted-foreground">En az 4 karakter</p>
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
