"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { Clock, Car, CheckCircle, XCircle, AlertCircle, Check, UserCheck, Globe } from "lucide-react";
import { playNotificationSound } from "@/lib/notification-sound";
import { guestCapabilityStorage } from "@/lib/guest-capability-storage";
import { GuestPageConfig, defaultGuestPageConfig } from "@/lib/guest-page-config";
import { __, LOCALES, getInitialLocale, setLocale, type SupportedLocale, type TranslationKeys } from "@/lib/i18n";

interface RequestDetail {
  id: number;
  status: string;
  guestName: string | null;
  roomNumber: string | null;
  phone: string | null;
  notes: string | null;
  requestedAt: string;
  acceptedAt: string | null;
  completedAt: string | null;
  location: { name: string };
  buggy: { code: string; icon: string } | null;
  acceptedByDriver: { fullName: string } | null;
}

export default function GuestStatusPage() {
  const params = useParams();
  const requestId = params.requestId as string;
  const [capability] = useState(() => {
    // Prefer URL param (for cross-tab via admin simulate), then sessionStorage
    const urlCap = new URLSearchParams(window.location.search).get("capability");
    if (urlCap) {
      guestCapabilityStorage.set(requestId, urlCap);
      // Clean URL without reload
      window.history.replaceState(null, "", window.location.pathname);
      return urlCap;
    }
    return guestCapabilityStorage.get(requestId);
  });
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [missingCapability, setMissingCapability] = useState(() => !capability);
  const [cancelling, setCancelling] = useState(false);
  const [locale, setLocaleState] = useState<SupportedLocale>(getInitialLocale);

  function tr(key: TranslationKeys): string { return __(locale, key); }
  function changeLocale(l: SupportedLocale) { setLocaleState(l); setLocale(l); }

  const [config] = useState<GuestPageConfig>(() => {
    try {
      const saved = sessionStorage.getItem("guest-status-config");
      if (saved) return { ...defaultGuestPageConfig, ...JSON.parse(saved) };
    } catch {}
    return defaultGuestPageConfig;
  });
  const prevStatus = useRef("");
  const stopTransportRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!capability) return;

    let cancelled = false;
    let terminal = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let es: EventSource | null = null;

    const stop = () => {
      terminal = true;
      if (interval) clearInterval(interval);
      interval = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      es?.close();
      es = null;
    };
    stopTransportRef.current = stop;

    async function load(): Promise<boolean> {
      try {
        const res = await fetch(`/api/requests/${requestId}`, {
          headers: { "x-guest-capability": capability! },
        });
        const json = await res.json();
        if (cancelled) return true;
        if (json.success) {
          if (prevStatus.current && prevStatus.current !== json.data.status) playNotificationSound("ping");
          prevStatus.current = json.data.status;
          setRequest(json.data);
          setLoading(false);
          terminal = ["COMPLETED", "CANCELLED", "UNANSWERED"].includes(json.data.status);
          if (terminal) {
            guestCapabilityStorage.remove(requestId);
            stop();
          }
          return terminal;
        }
      } catch {
        // Transient failure: polling retains the reload capability.
      }
      return false;
    }

    async function connect() {
      if (cancelled || terminal) return;
      try {
        const response = await fetch(`/api/requests/${requestId}/sse-ticket`, {
          method: "POST",
          headers: { "x-guest-capability": capability! },
        });
        const json = await response.json();
        if (cancelled || terminal || !json.success) return;
        es = new EventSource(`/api/sse/guest/${requestId}?ticket=${encodeURIComponent(json.data.ticket)}`);
        es.onmessage = () => void load();
        es.onerror = () => {
          es?.close();
          es = null;
          if (!cancelled && !terminal) reconnectTimer = setTimeout(() => void connect(), 1000);
        };
      } catch {
        if (!cancelled && !terminal) reconnectTimer = setTimeout(() => void connect(), 1000);
      }
    }

    void load().then((done) => {
      if (done || cancelled) return;
      interval = setInterval(() => void load(), 3000);
      void connect();
    });

    return () => {
      cancelled = true;
      stop();
      stopTransportRef.current = () => {};
    };
  }, [requestId]);

  async function handleCancel() {
    if (cancelling) return;
    const capability = guestCapabilityStorage.get(requestId);
    if (!capability) {
      setMissingCapability(true);
      return;
    }
    setCancelling(true);
    try {
      const res = await fetch(`/api/requests/${requestId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-guest-capability": capability },
        body: JSON.stringify({ cancelledBy: "GUEST" }),
      });
      const json = await res.json();
      if (json.success) {
        stopTransportRef.current();
        guestCapabilityStorage.remove(requestId);
        setRequest(json.data);
        toast.success(tr("statusCancelled"));
      } else {
        toast.error(json.error?.message || tr("connectionError"));
      }
    } catch {
      toast.error(tr("connectionError"));
    } finally {
      setCancelling(false);
    }
  }

  if (missingCapability) return (
    <main className="min-h-[100dvh] flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-blue-50">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold text-slate-900">{tr("requestNotFound")}</h1>
        <p className="mt-2 text-slate-600">{tr("locationNotFound")}</p>
        <Link href="/guest/call" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-slate-800 px-5 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-800">{tr("callShuttle")}</Link>
      </div>
    </main>
  );

  if (loading || !request) return <Loading fullPage />;

  const status = request.status;
  const isCompleted = status === "COMPLETED";
  const isCancelled = status === "CANCELLED";
  const isUnanswered = status === "UNANSWERED";
  const isAccepted = status === "ACCEPTED";
  const isPending = status === "PENDING";

  // Status icon config
  const iconConfig = isCompleted
    ? { icon: CheckCircle, bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)", shadow: "rgba(16,185,129,0.3)" }
    : isAccepted
      ? { icon: Car, bg: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)", shadow: "rgba(59,130,246,0.3)" }
      : isCancelled
        ? { icon: XCircle, bg: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)", shadow: "rgba(239,68,68,0.3)" }
        : isUnanswered
          ? { icon: AlertCircle, bg: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)", shadow: "rgba(249,115,22,0.3)" }
          : { icon: Clock, bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)", shadow: "rgba(16,185,129,0.3)" };

  const StatusIcon = iconConfig.icon;

  const title = isCompleted
    ? tr("statusCompleted")
    : isAccepted
      ? tr("statusEnRoute")
      : isCancelled
        ? tr("statusCancelled")
        : isUnanswered
          ? tr("requestNotFound")
          : tr("statusReceived");

  const message = isCompleted
    ? tr("statusCompleted")
    : isAccepted
      ? tr("statusEnRoute")
      : isCancelled
        ? tr("statusCancelled")
        : isUnanswered
          ? tr("requestNotFound")
          : tr("statusSearching");

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <main
      className="guest-ui min-h-[100dvh] flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-blue-50"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="w-full max-w-[540px]">
        {/* Language selector — top right */}
        <div className="flex justify-end mb-2">
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-white/70 backdrop-blur-sm text-slate-700 border border-slate-200 hover:bg-white transition-colors">
              <Globe className="w-3.5 h-3.5" />
              <span>{LOCALES.find(l => l.code === locale)?.flag}</span>
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block hover:block z-50 bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[160px]">
              {LOCALES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => changeLocale(l.code)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-100 transition-colors ${locale === l.code ? "font-bold bg-slate-50" : ""}`}
                >
                  <span className="text-base">{l.flag}</span>
                  <span>{l.nativeLabel}</span>
                  {locale === l.code && <Check className="w-3.5 h-3.5 ml-auto text-emerald-600" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Status Icon + Title */}
        <div className="text-center mb-6" role="status" aria-live="polite" aria-atomic="true" style={{ animation: "fadeInDown 0.6s ease-out" }}>
          <div
            className="w-24 h-24 mx-auto mb-5 rounded-full flex items-center justify-center"
            style={{
              background: iconConfig.bg,
              boxShadow: `0 12px 24px ${iconConfig.shadow}`,
              animation: isPending ? "pulseDot 2s ease-in-out infinite" : undefined,
            }}
          >
            <StatusIcon className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{title}</h1>
          <p className="text-sm text-gray-500">{message}</p>
        </div>

        {/* Timeline (hidden when completed/cancelled/unanswered) */}
        {!isCompleted && !isCancelled && !isUnanswered && (
          <div className="mb-6" style={{ animation: "fadeInUp 0.6s ease-out 0.2s both" }}>
            {/* Step 1: Talep Oluşturuldu */}
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white"
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  boxShadow: "0 4px 12px rgba(16,185,129,0.4)",
                }}
              >
                <Check className="w-5 h-5" />
              </div>
              <div className="flex-1 pt-2">
                <div className="text-base font-semibold text-emerald-600 mb-1">{tr("statusReceived")}</div>
                <div className="text-sm text-gray-500">{fmtTime(request.requestedAt)}</div>
              </div>
            </div>

            {/* Step 2: İşleme Alındı */}
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white"
                style={
                  isAccepted
                    ? {
                        background: "linear-gradient(135deg, #10b981, #059669)",
                        boxShadow: "0 4px 12px rgba(16,185,129,0.4)",
                      }
                    : {
                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
                        boxShadow: "0 4px 16px rgba(245,158,11,0.5)",
                        animation: "pulseDot 2s ease-in-out infinite",
                      }
                }
              >
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="flex-1 pt-2">
                <div
                  className="text-base font-semibold mb-1"
                  style={{ color: isAccepted ? "#059669" : "#d97706" }}
                >
                  {tr("statusSearching")}
                </div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: isAccepted ? "#059669" : "#f59e0b" }}
                >
                  {isAccepted && request.acceptedAt
                    ? fmtTime(request.acceptedAt)
                    : tr("loading")}
                </div>
              </div>
            </div>

            {/* Step 3: Tamamlandı */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-gray-400 bg-gray-200">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 pt-2">
                <div className="text-base font-semibold text-slate-600 mb-1">{tr("statusCompleted")}</div>
                <div className="text-sm text-gray-400">
                  {request.completedAt ? fmtTime(request.completedAt) : "-"}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Driver Info (ACCEPTED only) */}
        {isAccepted && request.buggy && (
          <div
            className="rounded-2xl p-5 mb-6"
            style={{
              background: "linear-gradient(135deg, rgba(212,175,55,0.1), rgba(228,191,71,0.05))",
              animation: "fadeInUp 0.4s ease-out",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white"
                style={{ background: `linear-gradient(135deg, ${config.accentColor}, ${config.accentColor}dd)` }}
              >
                <Car className="w-6 h-6" />
              </div>
              <div>
                {config.showDriverName && (
                  <h4 className="text-base font-bold text-slate-800 mb-1">
                    {request.acceptedByDriver?.fullName || "Shuttle"}
                  </h4>
                )}
                <p className="text-sm text-slate-500">
                  Talebiniz {config.showBuggyCode && (
                    <span className="font-semibold">{request.buggy.code}</span>
                  )} {tr("vehicle")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Completed Box */}
        {isCompleted && (
          <div
            className="rounded-2xl p-6 text-center mb-6"
            style={{
              background: "linear-gradient(135deg, rgba(39,174,96,0.1), rgba(46,204,113,0.05))",
              animation: "fadeInUp 0.4s ease-out",
            }}
          >
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-emerald-600 mb-2">✅ {tr("statusCompleted")}</h3>
            <p className="text-base text-emerald-700 font-semibold">
              {tr("statusCompleted")}
            </p>
          </div>
        )}

        {/* Cancel Button */}
        {(isPending || isAccepted) && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            aria-busy={cancelling}
            className="w-full py-4 rounded-[14px] text-base font-bold text-white transition-[transform,opacity,box-shadow] duration-200 ease-out hover:-translate-y-0.5 flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
            }}
          >
            <XCircle className="w-5 h-5" />
            <span>{cancelling ? `${tr("cancel")}...` : tr("cancel")}</span>
          </button>
        )}
      </div>
    </main>
  );
}
