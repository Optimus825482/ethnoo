/* eslint-disable @next/next/no-img-element -- Native img preserves dynamic URL/error and intrinsic sizing behavior. */
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MapPin, Send, Clock as ClockIcon, X, Check, HelpCircle, User, DoorOpen, Phone, Globe } from "lucide-react";
import { guestCapabilityStorage } from "@/lib/guest-capability-storage";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { GuestPageConfig, FieldMode, CustomField, defaultGuestPageConfig } from "@/lib/guest-page-config";
import { __, LOCALES, getInitialLocale, setLocale, type SupportedLocale, type TranslationKeys } from "@/lib/i18n";

export const dynamic = "force-dynamic";

interface Location {
  id: number;
  name: string;
  logo: string | null;
  description?: string | null;
}

function GuestCallContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationId = searchParams.get("location");
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(Boolean(locationId));
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [clock, setClock] = useState("--:--:--");
  const [imgError, setImgError] = useState(false);
  const [locale, setLocaleState] = useState<SupportedLocale>(getInitialLocale);
  const [langOpen, setLangOpen] = useState(false);
  const rippleRef = useRef<HTMLSpanElement>(null);

  function tr(key: TranslationKeys): string { return __(locale, key); }

  function changeLocale(l: SupportedLocale) {
    setLocaleState(l);
    setLocale(l);
  }

  const [config, setConfig] = useState<GuestPageConfig>(defaultGuestPageConfig);

  const [guestName, setGuestName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const tick = () => {
      try {
        const now = new Date();
        const cyprus = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Nicosia" }));
        setClock(`${String(cyprus.getHours()).padStart(2, "0")}:${String(cyprus.getMinutes()).padStart(2, "0")}:${String(cyprus.getSeconds()).padStart(2, "0")}`);
      } catch {
        const now = new Date();
        setClock(`${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!locationId) { toast.error(tr("locationNotFound")); return; }
    fetch(`/api/locations/${locationId}`)
      .then((r) => r.json())
      .then((json) => { if (json.success) setLocation(json.data); else toast.error(tr("locationNotFound")); })
      .catch(() => toast.error(tr("connectionError")))
      .finally(() => setLoading(false));
  }, [locationId]);

  useEffect(() => {
    if (!locationId) return;
    fetch(`/api/locations/${locationId}/settings`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data.pageConfig) {
          setConfig({ ...defaultGuestPageConfig, ...json.data.pageConfig, fields: { ...defaultGuestPageConfig.fields, ...(json.data.pageConfig.fields || {}) } });
        } else if (json.success) {
          setConfig(prev => ({
            ...prev,
            fields: {
              guestName: json.data.guest_fields_name || "optional",
              roomNumber: json.data.guest_fields_room || "optional",
              phone: json.data.guest_fields_phone || "optional",
            }
          }));
        }
      })
      .catch(() => {});
  }, [locationId]);

  function validateFields(): string | null {
    if (config.fields.guestName === "required" && !guestName.trim()) return "Lütfen adınızı girin";
    if (config.fields.roomNumber === "required" && !roomNumber.trim()) return "Lütfen oda numaranızı girin";
    if (config.fields.phone === "required" && !phone.trim()) return "Lütfen telefon numaranızı girin";
    for (const cf of config.customFields) {
      if (cf.mode === "required" && !(customValues[cf.id] || "").trim()) return `Lütfen "${cf.label}" alanını doldurun`;
    }
    return null;
  }

  const visibleStandardFields = [
    config.fields.guestName !== "off",
    config.fields.roomNumber !== "off",
    config.fields.phone !== "off",
  ].filter(Boolean).length;
  const visibleCustomFields = config.customFields.filter((f) => f.mode !== "off").length;
  const hasFormFields = visibleStandardFields > 0 || visibleCustomFields > 0;

  async function submitRequest() {
    if (!locationId) return;
    const error = validateFields();
    if (error) { toast.error(error); return; }
    setShowConfirm(false);
    setShowLoading(true);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { locationId: Number(locationId) };
      if (guestName.trim()) body.guestName = guestName.trim();
      if (roomNumber.trim()) body.roomNumber = roomNumber.trim();
      if (phone.trim()) body.phone = phone.trim();
      if (Object.keys(customValues).length > 0) {
        const customParts = Object.keys(customValues)
          .filter((k) => customValues[k].trim())
          .map((k) => {
            const field = config.customFields.find((cf) => cf.id === k);
            return `${field?.label || k}: ${customValues[k].trim()}`;
          });
        if (customParts.length > 0) {
          const notesParts: string[] = [];
          if (notes.trim()) notesParts.push(notes.trim());
          notesParts.push(...customParts);
          body.notes = notesParts.join(" | ");
        }
      } else if (notes.trim()) {
        body.notes = notes.trim();
      }
      const res = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      setShowLoading(false);
      if (json.success && json.data?.id && json.data?.guestCapability) {
        guestCapabilityStorage.set(json.data.id, json.data.guestCapability);
        try { sessionStorage.setItem("guest-status-config", JSON.stringify(config)); } catch {}
        router.push(`/guest/status/${json.data.id}`);
      } else if (json.success && json.data?.request?.id && json.data?.guestCapability) {
        guestCapabilityStorage.set(json.data.request.id, json.data.guestCapability);
        try { sessionStorage.setItem("guest-status-config", JSON.stringify(config)); } catch {}
        router.push(`/guest/status/${json.data.request.id}`);
      } else {
        toast.error(json.error?.message || tr("connectionError"));
      }
    } catch {
      setShowLoading(false);
      toast.error(tr("connectionError"));
    } finally { setSubmitting(false); }
  }

  function handleButtonClick() {
    if (rippleRef.current) {
      rippleRef.current.style.width = "0"; rippleRef.current.style.height = "0";
      requestAnimationFrame(() => { if (rippleRef.current) rippleRef.current.style.animation = "ripple 0.6s ease-out"; });
    }
    setShowConfirm(true);
  }

  if (loading) return <Loading fullPage />;
  if (!location) return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-blue-50">
      <p className="text-slate-500">{tr("locationNotFound")}</p>
    </div>
  );

  const FIELD_LABELS: Record<string, TranslationKeys> = {
    guestName: "yourName", roomNumber: "roomNumber", phone: "phone",
  };
  const FIELD_PLACEHOLDERS: Record<string, TranslationKeys> = {
    guestName: "enterName", roomNumber: "enterRoom", phone: "enterPhone",
  };

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-slate-100 sm:py-6">
      {/* Mobile frame — mobile-first, QR scan target */}
      <div
        className="guest-ui relative flex flex-col w-full max-w-[420px] min-h-[100dvh] sm:min-h-0 sm:h-[860px] sm:max-h-[90vh] sm:rounded-[2.5rem] sm:shadow-2xl overflow-hidden"
        style={{ background: `linear-gradient(to bottom, ${config.bgStartColor}, ${config.bgEndColor})`, paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)", paddingLeft: "max(env(safe-area-inset-left), 0.5rem)", paddingRight: "max(env(safe-area-inset-right), 0.5rem)" }}
      >
      {/* Header */}
      <div className="flex flex-col items-center gap-3 px-2 sm:px-4 pt-4 pb-2 w-full" style={{ animation: "fadeInDown 0.6s ease-out" }}>
        {/* Top row: clock (left) + language (right) */}
        <div className="w-full flex items-center justify-between gap-2">
          {config.showClock ? (
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-white font-bold text-xs sm:text-sm font-mono"
              style={{ background: config.accentColor, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
              <ClockIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="tracking-wider min-w-[70px] sm:min-w-[85px] text-center">{clock}</span>
            </div>
          ) : <div />}

          {/* Language selector — click-based for mobile */}
          <div className="relative">
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm text-white border border-white/20 hover:bg-white/30 transition-colors"
              onClick={() => setLangOpen((o) => !o)}
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setLangOpen(false); }}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{LOCALES.find(l => l.code === locale)?.flag}</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-200 py-1 w-[140px] sm:min-w-[160px]">
                {LOCALES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { changeLocale(l.code); setLangOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-100 transition-colors ${locale === l.code ? "font-bold bg-slate-50" : ""}`}
                  >
                    <span className="text-base">{l.flag}</span>
                    <span>{l.nativeLabel}</span>
                    {locale === l.code && <Check className="w-3.5 h-3.5 ml-auto text-emerald-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {config.hotelLogo && (
          <img src={config.hotelLogo} alt="" style={{ height: config.hotelLogoSize, maxWidth: "100%" }} className="object-contain rounded-xl mt-1 max-h-[80px] sm:max-h-none" />
        )}

        {config.locationLogo && (
          <div className="w-24 h-24 sm:w-40 sm:h-40 mx-auto mt-2 mb-2 relative shrink-0">
            {location.logo && !imgError ? (
              <div className="w-full h-full rounded-3xl overflow-hidden">
                <img src={location.logo} alt={location.name} className="w-full h-full object-cover" onError={() => setImgError(true)} />
              </div>
            ) : (
              <div className="w-full h-full rounded-3xl flex items-center justify-center text-white" style={{ background: config.accentColor }}>
                <MapPin className="w-10 h-10 sm:w-16 sm:h-16" />
              </div>
            )}
          </div>
        )}

        {config.locationName && (
          <h2 className="text-lg sm:text-2xl font-bold text-center px-1 leading-tight" style={{ color: config.headerTextColor }}>
            {location.name}
          </h2>
        )}
      </div>

      {/* Guest Information Form */}
      {hasFormFields && (
        <div className="px-2 sm:px-4 py-2 w-full" style={{ animation: "fadeInUp 0.6s ease-out 0.1s both" }}>
          <Card className="border-slate-200">
            <CardContent className="p-3 sm:p-4 space-y-3">
              {config.fields.guestName !== "off" && (
                <div className="space-y-1.5">
                  <Label htmlFor="guest-name" className="text-sm flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> {tr("yourName")}
                    {config.fields.guestName === "required" && <span className="text-red-500">*</span>}
                  </Label>
                  <Input id="guest-name" placeholder={tr("enterName")} value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                </div>
              )}
              {config.fields.roomNumber !== "off" && (
                <div className="space-y-1.5">
                  <Label htmlFor="room-number" className="text-sm flex items-center gap-1.5">
                    <DoorOpen className="w-3.5 h-3.5" /> {tr("roomNumber")}
                    {config.fields.roomNumber === "required" && <span className="text-red-500">*</span>}
                  </Label>
                  <Input id="room-number" placeholder={tr("enterRoom")} value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
                </div>
              )}
              {config.fields.phone !== "off" && (
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-sm flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> {tr("phone")}
                    {config.fields.phone === "required" && <span className="text-red-500">*</span>}
                  </Label>
                  <Input id="phone" placeholder={tr("enterPhone")} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              )}
              {config.customFields.filter(f => f.mode !== "off").map((f) => (
                <div key={f.id} className="space-y-1.5">
                  <Label className="text-sm flex items-center gap-1.5">
                    {f.label}
                    {f.mode === "required" && <span className="text-red-500">*</span>}
                  </Label>
                  {f.type === "textarea" ? (
                    <Textarea placeholder={f.placeholder || `${f.label} yazın...`} value={customValues[f.id] || ""} onChange={(e) => setCustomValues(prev => ({ ...prev, [f.id]: e.target.value }))} />
                  ) : (
                    <Input placeholder={f.placeholder || `${f.label} yazın...`} value={customValues[f.id] || ""} onChange={(e) => setCustomValues(prev => ({ ...prev, [f.id]: e.target.value }))} />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Call Button */}
      <div className="flex-1 px-2 sm:px-4 py-3 sm:py-4 w-full">
        <div className="w-full" style={{ animation: "fadeInUp 0.6s ease-out 0.2s both" }}>
          <button
            onClick={handleButtonClick}
            disabled={submitting}
            className={`w-full min-h-[56px] flex items-center justify-center gap-2 sm:gap-2.5 text-white font-bold text-base sm:text-lg py-4 px-4 sm:px-6 transition-[transform,opacity,box-shadow] duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 select-none touch-manipulation relative overflow-hidden ${config.buttonShape === "pill" ? "rounded-full" : "rounded-2xl"}`}
            style={{ background: config.buttonColor, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}
            aria-label={config.buttonText}
          >
            <Send className="w-5 h-5 shrink-0" />
            <span>{tr("callShuttle")}</span>
            <span ref={rippleRef} className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
              style={{ transform: "translate(-50%, -50%)", background: "rgba(255,255,255,0.3)", width: 0, height: 0 }} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="shrink-0 text-center py-5 sm:py-6 px-3" style={{ background: config.footerBgColor, animation: "fadeInUp 0.6s ease-out 0.4s both" }}>
        <p className="text-xs sm:text-sm font-semibold" style={{ color: config.footerTextColor }}>{config.footerText}</p>
      </footer>

      {/* Confirm Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent showCloseButton={false} className="max-w-[92vw] sm:max-w-[400px] rounded-3xl bg-white p-4 sm:p-8 mx-2" style={{ boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
          <div className="text-center">
            <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-5 rounded-full flex items-center justify-center" style={{ background: config.buttonColor, boxShadow: "0 12px 24px rgba(0,0,0,0.2)" }}>
              <HelpCircle className="w-8 h-8 sm:w-12 sm:h-12 text-white" />
            </div>
            <DialogTitle className="text-base sm:text-2xl font-bold text-gray-900 mb-1.5 sm:mb-3">{tr("confirmTitle")}</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-6">{tr("confirmDescription")}</DialogDescription>
            <div className="rounded-2xl p-3 sm:p-5 mb-3 sm:mb-6 text-left" style={{ background: "rgba(0,0,0,0.03)", border: "2px solid rgba(0,0,0,0.08)" }}>
              <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-700"><MapPin className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /><span><strong>{tr("location")}:</strong> {location.name}</span></div>
              {guestName && <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-700 mt-1.5 sm:mt-2"><User className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /><span><strong>{tr("name")}:</strong> {guestName}</span></div>}
              {roomNumber && <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-700 mt-1.5 sm:mt-2"><DoorOpen className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /><span><strong>{tr("room")}:</strong> {roomNumber}</span></div>}
              {phone && <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-700 mt-1.5 sm:mt-2"><Phone className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" /><span><strong>{tr("phoneLabel")}:</strong> {phone}</span></div>}
            </div>
            <div className="flex gap-2 sm:gap-3">
              <DialogClose className="flex-1 py-3 sm:py-4 rounded-2xl text-xs sm:text-base font-bold transition-[transform,opacity] duration-200 hover:bg-gray-200 flex items-center justify-center gap-1.5 sm:gap-2" style={{ background: "#f3f4f6", color: "#6b7280" }}><X className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span>{tr("cancel")}</span></DialogClose>
              <button onClick={submitRequest} className="flex-1 py-3 sm:py-4 rounded-2xl text-xs sm:text-base font-bold text-white transition-[transform,opacity] duration-200 hover:-translate-y-0.5 flex items-center justify-center gap-1.5 sm:gap-2" style={{ background: config.buttonColor, boxShadow: "0 6px 20px rgba(0,0,0,0.2)" }}><Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span>{tr("yesCall")}</span></button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading Overlay */}
      {showLoading && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.75)" }}>
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full border-4 border-slate-300 animate-spin" style={{ borderTopColor: config.accentColor }} />
            <p className="text-white text-base font-semibold">{tr("callingShuttle")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuestCallPage() {
  return (
    <Suspense fallback={<Loading fullPage />}>
      <GuestCallContent />
    </Suspense>
  );
}
