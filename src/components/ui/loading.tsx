import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  className?: string;
  size?: number;
  text?: string;
  fullPage?: boolean;
}

export function Loading({ className, size = 24, text, fullPage }: LoadingProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-12", fullPage && "min-h-screen", className)}>
      <Loader2 className="animate-spin text-primary" style={{ width: size, height: size }} />
      {text && <p className="text-sm text-muted-foreground">{text}</p>}
    </div>
  );
}
