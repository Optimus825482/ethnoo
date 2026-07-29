"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Car, MapPin, Users, BarChart3, FileText, Settings, PlayCircle, LogOut, Menu, Monitor, Palette, X } from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/admin/monitor", label: "Canlı Harita", icon: Monitor, requiresMonitor: true },
  { href: "/admin/buggies", label: "Araçlar", icon: Car },
  { href: "/admin/locations", label: "Konumlar", icon: MapPin },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/simulate", label: "Simülasyon", icon: PlayCircle },
  { href: "/admin/reports", label: "Raporlar", icon: BarChart3 },
  { href: "/admin/audit", label: "Denetim", icon: FileText },
  { href: "/admin/settings", label: "Ayarlar", icon: Settings },
  { href: "/admin/settings/guest-design", label: "Sayfa Tasarımı", icon: Palette },
];

const mobileNavItems = [
  { href: "/admin/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/admin/buggies", label: "Araçlar", icon: Car },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/settings", label: "Ayarlar", icon: Settings },
];

function useMonitorEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => { if (json.success) setEnabled(json.data.monitor_enabled !== "false"); })
      .catch(() => setEnabled(true));
  }, []);
  return enabled;
}

function isActive(pathname: string, href: string) {
  if (href === "/admin/dashboard") return pathname === href;
  return pathname.startsWith(href);
}

function SidebarContent({ user, pathname, onClose }: { user: { fullName: string }; pathname: string; onClose?: () => void }) {
  const monitorEnabled = useMonitorEnabled();

  const visibleItems = navItems.filter((item) => {
    if (item.requiresMonitor && monitorEnabled === false) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
          SC
        </div>
        <div>
          <h1 className="font-heading font-bold text-sm text-foreground leading-tight">ShuttleCall</h1>
          <p className="text-[11px] text-muted-foreground font-medium">Admin Panel</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden ml-auto p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ease-out ${
                active
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="size-5 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
            {user.fullName.trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{user.fullName}</p>
            <p className="text-[11px] text-muted-foreground">Yönetici</p>
          </div>
        </div>
        <form action="/api/auth/logout" method="POST">
          <Button type="submit" variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20 h-9 text-sm">
            <LogOut className="size-4 mr-2" /> Çıkış Yap
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AdminNav({ user }: { user: { fullName: string } }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 glass-panel border-b border-border flex items-center px-4">
        <Button variant="ghost" size="icon-sm" onClick={() => setDrawerOpen(true)} className="p-2 -ml-1">
          <Menu className="size-5" />
        </Button>
        <span className="ml-2 font-heading font-bold text-base text-primary">ShuttleCall</span>
      </header>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-card shadow-xl border-r border-border animate-slide-in">
            <SidebarContent user={user} pathname={pathname} onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-border bg-card flex-col sticky top-0 h-screen">
        <SidebarContent user={user} pathname={pathname} />
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-card border-t border-border flex items-stretch shadow-lg">
        {mobileNavItems.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors duration-150 ${
                active ? "text-accent" : "text-muted-foreground"
              }`}
            >
              <item.icon className="size-5" />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
