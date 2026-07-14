"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loading } from "@/components/ui/loading";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    async function doLogout() {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    }
    doLogout();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loading text="Çıkış yapılıyor..." />
    </div>
  );
}
