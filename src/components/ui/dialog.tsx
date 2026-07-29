"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface DialogContextType {
  open: boolean
  setOpen: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextType | null>(null)

function Dialog({ open, onOpenChange, children, ...props }: {
  open: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  const setOpen = React.useCallback((val: boolean) => {
    if (!isControlled) setInternalOpen(val)
    onOpenChange?.(val)
  }, [isControlled, onOpenChange])

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
      window.addEventListener("keydown", onEsc)
      return () => {
        document.body.style.overflow = ""
        window.removeEventListener("keydown", onEsc)
      }
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [isOpen, setOpen])

  if (!isOpen) return null

  return (
    <DialogContext.Provider value={{ open: isOpen, setOpen }}>
      <div data-slot="dialog" {...props}>
        {children}
      </div>
    </DialogContext.Provider>
  )
}

function DialogOverlay({ className }: { className?: string }) {
  const ctx = React.useContext(DialogContext)
  return (
    <div
      data-slot="dialog-overlay"
      className={cn("fixed inset-0 z-50 bg-black/10 backdrop-blur-sm", className)}
      onClick={() => ctx?.setOpen(false)}
    />
  )
}

function DialogContent({
  className,
  children,
  style,
  showCloseButton = true,
}: {
  className?: string
  children: React.ReactNode
  style?: React.CSSProperties
  showCloseButton?: boolean
}) {
  return (
    <>
      <DialogOverlay />
      <div
        data-slot="dialog-content"
        style={style}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex flex-col w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-0 rounded-xl bg-white p-5 text-sm shadow-lg border border-border max-h-[90vh] overflow-hidden sm:max-w-md",
          className
        )}
      >
        {children}
        {showCloseButton && <DialogClose />}
      </div>
    </>
  )
}

function DialogClose({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ctx = React.useContext(DialogContext)
  return (
    <button
      data-slot="dialog-close"
      type="button"
      onClick={() => ctx?.setOpen(false)}
      className={cn("absolute top-3 right-3 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors", className)}
      {...props}
    >
      {children || (
        <>
          <X className="size-4" />
          <span className="sr-only">Kapat</span>
        </>
      )}
    </button>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse gap-2 rounded-b-xl border-t border-border bg-muted/50 -mx-5 -mb-5 p-4 sm:flex-row sm:justify-end", className)}
      {...props}
    >
      {children}
    </div>
  )
}

function DialogTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="dialog-title"
      className={cn("font-heading text-lg leading-tight font-semibold", className)}
      {...props}
    />
  )
}

function DialogDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogClose,
}
