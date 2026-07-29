"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue { value: string; onValueChange: (value: string) => void; }
const TabsContext = React.createContext<TabsContextValue | null>(null);

function Tabs({ value, onValueChange, children, className }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode; className?: string }) {
  return <TabsContext.Provider value={{ value, onValueChange }}><div className={className}>{children}</div></TabsContext.Provider>;
}

function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex gap-1 rounded-xl bg-muted p-1", className)}>{children}</div>;
}

function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) return null;
  const active = ctx.value === value;
  return (
    <button type="button" onClick={() => ctx.onValueChange(value)}
      className={cn("flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-150 ease-out",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        className)}>
      {children}
    </button>
  );
}

function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(TabsContext);
  if (!ctx || ctx.value !== value) return null;
  return <div className={cn(className)}>{children}</div>;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };