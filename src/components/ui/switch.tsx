"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  onCheckedChange?: (checked: boolean) => void;
}

function Switch({ className, checked, onCheckedChange, ...props }: SwitchProps) {
  return (
    <label className={cn("relative inline-flex items-center cursor-pointer", className)}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onCheckedChange?.(e.target.checked)}
        {...props}
      />
      <div
        className={cn(
          "w-11 h-6 bg-muted rounded-full peer transition-colors",
          "peer-checked:bg-accent",
          "peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring peer-focus:ring-offset-2",
          "after:content-[''] after:absolute after:top-[2px] after:start-[2px]",
          "after:bg-white after:rounded-full after:h-5 after:w-5",
          "after:transition-all peer-checked:after:translate-x-full",
          "after:shadow-sm",
        )}
      />
    </label>
  );
}

export { Switch };
export type { SwitchProps };
