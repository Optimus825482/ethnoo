"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { LayoutDashboard, Car, MapPin, Users, BarChart3, FileText, Settings, PlayCircle, LogOut, Menu, Monitor } from "lucide-react";

const navItems = [
  { href: "/admin/dashboard", label: "Panel", icon: LayoutDashboard },
  { href: "/admin/monitor", label: "Canlı Harita", icon: Monitor },
  { href: "/admin/buggies", label: "Araçlar", icon: Car },
  { href: "/admin/locations", label: "Konumlar", icon: MapPin },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/simulate", label: "Simülasyon", icon: PlayCircle },
  { href: "/admin/reports", label: "Raporlar", icon: BarChart3 },
  { href: "/admin/audit", label: "Denetim", icon: FileText },
  { href: "/admin/settings", label: "Ayarlar", icon: Settings },
];

function SidebarContent({ user, pathname }: { user: { fullName: string }; pathname: string }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center gap-3">
        <img src="/images/logo.png" alt="ShuttleCall" className="h-8 w-auto" loading="eager" />
        <div>
          <h1 className="font-bold text-sm text-foreground leading-tight">ShuttleCall</h1>
          <p className="text-xs text-muted-foreground">Yönetim Paneli</p>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              pathname.startsWith(item.href)
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <Separator />
      <div className="p-2">
        <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user.fullName}</div>
        <form action="/api/auth/logout" method="POST">
          <Button
            type="submit"
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-5 h-5 mr-2" /> Çıkış
          </Button>
        </form>
      </div>
    </div>
  );
}

export function AdminNav({ user }: { user: { fullName: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-card border-b border-border flex items-center px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="sm" className="p-2">
                <Menu className="w-6 h-6" />
              </Button>
            }
          />
          <SheetContent side="left" className="w-72 p-0">
            <SidebarContent user={user} pathname={pathname} />
          </SheetContent>
        </Sheet>
        <span className="ml-2 font-bold text-sm">ShuttleCall</span>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 border-r border-border bg-card flex-col">
        <SidebarContent user={user} pathname={pathname} />
      </aside>
    </>
  );
}
