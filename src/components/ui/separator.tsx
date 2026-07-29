"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

function Separator({ className, orientation = "horizontal", ...props }: React.ComponentProps<"hr"> & { orientation?: "horizontal" | "vertical" }) {
  return (
    <hr
      data-slot="separator"
      className={cn("shrink-0 border-0 bg-border", orientation === "horizontal" ? "h-px w-full" : "w-px h-full", className)}
      {...props}
    />
  )
}

export { Separator }
