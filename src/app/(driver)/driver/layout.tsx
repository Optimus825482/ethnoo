import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (!sessionToken) redirect("/login");

  const res = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3016"}/api/auth/me`, {
    headers: { Cookie: `session_token=${sessionToken}` },
    cache: "no-store",
  });

  if (!res.ok) redirect("/login");
  const json = await res.json();
  if (json.data?.user?.role !== "DRIVER") redirect("/admin/dashboard");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/images/logo.png" alt="ShuttleCall" className="h-7 w-auto" />
          <div>
            <h1 className="font-bold text-sm text-foreground leading-tight">ShuttleCall</h1>
            <p className="text-[10px] text-muted-foreground">Driver: {json.data.user.fullName}</p>
          </div>
        </div>
        <form action="/api/auth/logout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </form>
      </header>
      <main className="flex-1 overflow-auto p-4 max-w-2xl mx-auto w-full">{children}</main>
    </div>
  );
}
