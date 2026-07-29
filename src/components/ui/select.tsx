"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Turbopack freezes function.name and all function mutations.
// Use WeakMap to tag components without mutating them.
const TAG = Symbol.for("select.tag")
const fnTags = new WeakMap<object, string>()
const TAG_TRIGGER = "ST"
const TAG_VALUE = "SV"
const TAG_CONTENT = "SC"
const TAG_ITEM = "SI"

type Option = { value: string; label: string }
interface SelectParts { triggerClass: string; triggerId: string; placeholder: string; options: Option[] }

function getTag(fn: unknown): string {
  return fnTags.get(fn as object) || ""
}

function walkSelectParts(children: React.ReactNode): SelectParts {
  const parts: SelectParts = { triggerClass: "", triggerId: "", placeholder: "", options: [] }
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    const props = child.props as Record<string, unknown>
    const tag = getTag(child.type)

    if (tag === TAG_CONTENT) {
      const items: Option[] = []
      React.Children.forEach(props.children as React.ReactNode, (item) => {
        if (React.isValidElement(item)) {
          const ip = item.props as Record<string, unknown>
          if (getTag(item.type) === TAG_ITEM && typeof ip.value === "string") {
            const lbl = typeof ip.children === "string" ? ip.children : (ip.value as string)
            items.push({ value: ip.value as string, label: lbl })
          }
        }
      })
      parts.options = items
    }

    if (tag === TAG_TRIGGER) {
      parts.triggerClass = (props.className as string) || ""
      parts.triggerId = (props.id as string) || ""
      React.Children.forEach(props.children as React.ReactNode, (tc) => {
        if (React.isValidElement(tc) && getTag(tc.type) === TAG_VALUE) {
          parts.placeholder = ((tc.props as Record<string, unknown>).placeholder as string) || ""
        }
      })
    }
  })
  return parts
}

function Select({ value: v, onValueChange, children, defaultValue = "" }: {
  value?: string | null
  onValueChange?: (val: string) => void
  children?: React.ReactNode
  defaultValue?: string
}) {
  const [inner, setInner] = React.useState(defaultValue)
  const current = v !== undefined ? (v ?? "") : inner
  const parts = React.useMemo(() => walkSelectParts(children), [children])

  return (
    <div className={cn("relative", parts.triggerClass)}>
      <select
        id={parts.triggerId}
        value={current}
        onChange={(e) => {
          const nv = e.target.value
          if (v === undefined) setInner(nv)
          onValueChange?.(nv)
        }}
        className="h-10 w-full rounded-xl border border-input bg-white px-3 pr-8 py-2 text-sm outline-none focus:ring-2 focus:ring-ring focus:border-accent appearance-none cursor-pointer"
      >
        {parts.placeholder ? <option value="" disabled>{parts.placeholder}</option> : <option value="" disabled />}
        {parts.options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground shrink-0"
        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m6 9 6 6 6-6"/>
      </svg>
    </div>
  )
}

// Passthrough components — tags stored in WeakMap, no function mutation
function SelectTrigger({ className: _c, children: _ch }: { className?: string; children?: React.ReactNode; id?: string }) { return null }
function SelectValue({ placeholder: _p, children: _c }: { placeholder?: string; children?: React.ReactNode | ((value: string) => React.ReactNode) }) { return null }
function SelectContent({ children: _c }: { children: React.ReactNode }) { return null }
function SelectItem({ value: _v, children: _c }: { value: string; children: React.ReactNode }) { return null }

fnTags.set(SelectTrigger, TAG_TRIGGER)
fnTags.set(SelectValue, TAG_VALUE)
fnTags.set(SelectContent, TAG_CONTENT)
fnTags.set(SelectItem, TAG_ITEM)

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
