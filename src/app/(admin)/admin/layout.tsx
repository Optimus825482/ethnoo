import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Car, MapPin, Users, BarChart3, FileText, LogOut } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("session_token")?.value;

  if (!sessionToken) redirect("/login");

  const res = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3016"}/api/auth/me`, {
    headers: { Cookie: `session_token=${sessionToken}` },
    cache: "no-store",
  });

  if (!res.ok) redirect("/login");
  const json = await res.json();
  if (json.data?.user?.role !== "ADMIN") redirect("/driver/dashboard");

  const navItems = [
    { href: "/admin/dashboard", label: "Panel", icon: LayoutDashboard },
    { href: "/admin/buggies", label: "Araçlar", icon: Car },
    { href: "/admin/locations", label: "Konumlar", icon: MapPin },
    { href: "/admin/users", label: "Kullanıcılar", icon: Users },
    { href: "/admin/reports", label: "Raporlar", icon: BarChart3 },
    { href: "/admin/audit", label: "Denetim", icon: FileText },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="w-60 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <img src="/images/logo.png" alt="ShuttleCall" className="h-8 w-auto" loading="eager" />
          <div>
            <h1 className="font-bold text-sm text-foreground leading-tight">ShuttleCall</h1>
            <p className="text-[10px] text-muted-foreground">Yönetim Paneli</p>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="p-2">
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {json.data.user.fullName}
          </div>
          <form action="/api/auth/logout" method="POST">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 mr-2" /> Çıkış
            </Button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
