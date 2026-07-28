/* eslint-disable @next/next/no-img-element -- Native img preserves dynamic URL/error and intrinsic sizing behavior. */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (!sessionToken) redirect("/login");

  const res = await fetch(`${process.env.NEXTAUTH_URL!}/api/auth/me`, {
    headers: { Cookie: `session_token=${sessionToken}` },
    cache: "no-store",
  });

  if (!res.ok) redirect("/login");
  const json = await res.json();
  if (json.data?.user?.role !== "DRIVER") redirect("/admin/dashboard");

  return (
    <div className="flex min-h-[100dvh] flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <img src="/images/logo.png" alt="ShuttleCall" className="h-7 w-auto shrink-0" />
          <div className="min-w-0">
            <h1 className="font-bold text-sm text-foreground leading-tight">ShuttleCall</h1>
            <p className="text-xs text-muted-foreground truncate">{json.data.user.fullName}</p>
          </div>
        </div>
        <form action="/api/auth/logout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
          >
            <LogOut className="w-5 h-5" /> <span className="hidden sm:inline">Çıkış</span>
          </Button>
        </form>
      </header>
      <main className="flex-1 overflow-auto p-4 max-w-2xl mx-auto w-full" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>{children}</main>
    </div>
  );
}
