"use client";

import { useState, useEffect } from "react";
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
  const [checking, setChecking] = useState(true);
  const [needsEmail, setNeedsEmail] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.user) {
          setNeedsEmail(!json.data.user.email);
        }
      })
      .finally(() => setChecking(false));
  }, []);

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
        toast.error(json.error?.message || "Failed to change password");
        return;
      }

      toast.success("Password changed successfully");
      router.push("/");
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (checking) return <Loading fullPage />;

  return (
    <div className="flex flex-1 items-center justify-center p-4 min-h-screen">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Change Password</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Please set a new password to continue
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
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
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword" autoComplete="new-password"
              type="password"
              {...register("newPassword")}
            />
            <p className="text-xs text-muted-foreground">En az 6 karakter</p>
            {errors.newPassword?.message && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>
          {needsEmail && (
            <div className="space-y-2">
              <Label htmlFor="email">E-posta Adresi</Label>
              <Input
                id="email" autoComplete="email"
                type="email"
                placeholder="ornek@ethnohotels.com"
                {...register("email")}
              />
              <p className="text-xs text-muted-foreground">E-posta adresinizi girmeniz zorunludur</p>
              {errors.email?.message && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loading size={16} /> : "Change Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
