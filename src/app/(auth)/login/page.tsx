/* eslint-disable @next/next/no-img-element -- Native img preserves dynamic URL/error and intrinsic sizing behavior. */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/schemas/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkSetup() {
      const res = await fetch("/api/setup");
      const json = await res.json();
      if (json.success && json.data.setupRequired) {
        router.push("/setup");
        return;
      }
      setChecking(false);
    }
    checkSetup();
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  if (checking) return <Loading fullPage />;

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (!json.success) {
        toast.error(json.error?.message || "Login failed");
        return;
      }

      toast.success("Login successful");

      if (json.data.mustChangePassword) {
        router.push("/change-password");
      } else if (json.data.user.role === "ADMIN") {
        if (json.data.needsLocations) {
          router.push("/admin/locations?new=true");
        } else {
          router.push("/admin/dashboard");
        }
      } else {
        router.push("/driver/dashboard");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4 min-h-screen">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="flex flex-col items-center gap-4 text-center">
            <img
              src="/images/logo.png"
              alt="ShuttleCall"
              className="h-14 w-auto"
              fetchPriority="high"
            />
            <div>
              <CardTitle className="text-2xl">ShuttleCall</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Hotel Transport Management
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                autoComplete="username"
                {...register("username")}
              />
              {errors.username?.message && (
                <p className="text-xs text-destructive">{errors.username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password?.message && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loading size={16} /> : "Sign in"}
            </Button>
          </form>

        </CardContent>
      </Card>
    </div>
  );
}
