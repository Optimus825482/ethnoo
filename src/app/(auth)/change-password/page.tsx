"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, type ChangePasswordInput } from "@/schemas/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  async function onSubmit(data: ChangePasswordInput) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error?.message || "Şifre değiştirilemedi");
        return;
      }

      toast.success("Şifre değiştirildi");
      router.push("/");
    } catch {
      toast.error("Ağ hatası");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4 min-h-screen">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Şifre Değiştir</h1>
          <p className="text-sm text-muted-foreground">
            Devam etmek için yeni şifrenizi belirleyin
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Mevcut Şifre</Label>
            <Input
              id="currentPassword" autoComplete="current-password"
              type="password"
              {...register("currentPassword")}
            />
            {errors.currentPassword?.message && (
              <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Yeni Şifre</Label>
            <Input
              id="newPassword" autoComplete="new-password"
              type="password"
              {...register("newPassword")}
            />
            <p className="text-xs text-muted-foreground">En az 6 karakter, harf ve rakam</p>
            {errors.newPassword?.message && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loading size={16} /> : "Şifreyi Değiştir"}
          </Button>
        </form>
      </div>
    </div>
  );
}
