"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { Clock, Car, CheckCircle, XCircle, AlertCircle, Check, UserCheck } from "lucide-react";
import { playNotificationSound } from "@/lib/notification-sound";

interface RequestDetail {
  id: number;
  status: string;
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
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const prevStatus = useRef("");

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    let es: EventSource | null = null;

    async function load(): Promise<boolean> {
      try {
        const res = await fetch(`/api/requests/${requestId}`);
        const json = await res.json();
        if (cancelled) return true;
        if (json.success) {
          if (prevStatus.current && prevStatus.current !== json.data.status) {
            playNotificationSound("ping");
          }
          prevStatus.current = json.data.status;
          setRequest(json.data);
          setLoading(false);
          if (["COMPLETED", "CANCELLED", "UNANSWERED"].includes(json.data.status)) {
            return true; // stop polling
          }
        }
      } catch {
        // network error — keep polling
      }
      return false;
    }

    load().then((stop) => {
      if (stop || cancelled) return;
      interval = setInterval(async () => {
        const done = await load();
        if (done && interval) clearInterval(interval);
      }, 3000);

      es = new EventSource(`/api/sse/guest/${requestId}`);
      es.onmessage = () => load();
      es.onerror = () => { /* auto-reconnect */ };
    });

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (es) es.close();
    };
  }, [requestId]);

  async function handleCancel() {
    const res = await fetch(`/api/requests/${requestId}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelledBy: "GUEST" }),
    });
    const json = await res.json();
    if (json.success) {
      toast.success("Talep iptal edildi");
    } else {
      toast.error(json.error?.message || "İptal başarısız");
    }
  }

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
    ? "✅ Tamamlandı!"
    : isAccepted
      ? "🚗 Shuttle Yolda!"
      : isCancelled
        ? "❌ İptal Edildi"
        : isUnanswered
          ? "⚠️ Sürücü Bulunamadı"
          : "✅ Talebiniz Alındı!";

  const message = isCompleted
    ? "Shuttle Call kullandığınız için teşekkür ederiz!"
    : isAccepted
      ? "Kısa bir süre içerisinde aracınız konumunuza ulaşmış olacak..."
      : isCancelled
        ? "Talebiniz iptal edilmiştir."
        : isUnanswered
          ? "Müsait sürücü bulunamadı. Lütfen tekrar deneyin."
          : "Shuttle çağrınız başarıyla gönderildi. Sürücü aranıyor...";

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-blue-50">
      <div className="w-full max-w-[540px]">
        {/* Status Icon + Title */}
        <div className="text-center mb-6" style={{ animation: "fadeInDown 0.6s ease-out" }}>
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
                <div className="text-base font-semibold text-emerald-600 mb-1">Talep Oluşturuldu</div>
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
                  İşleme Alındı
                </div>
                <div
                  className="text-sm font-semibold"
                  style={{ color: isAccepted ? "#059669" : "#f59e0b" }}
                >
                  {isAccepted && request.acceptedAt
                    ? fmtTime(request.acceptedAt)
                    : "Bekleniyor..."}
                </div>
              </div>
            </div>

            {/* Step 3: Tamamlandı */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-gray-400 bg-gray-200">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="flex-1 pt-2">
                <div className="text-base font-semibold text-slate-600 mb-1">Tamamlandı</div>
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
                style={{ background: "linear-gradient(135deg, #1a2b4a, #2a3b5a)" }}
              >
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-800 mb-1">
                  {request.acceptedByDriver?.fullName || "Shuttle"}
                </h4>
                <p className="text-sm text-slate-500">
                  Talebiniz <span className="font-semibold">{request.buggy.code}</span> plakalı
                  shuttle tarafından işleme alınmıştır.
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
            <h3 className="text-xl font-bold text-emerald-600 mb-2">✅ Tamamlandı!</h3>
            <p className="text-base text-emerald-700 font-semibold">
              Shuttle Call kullandığınız için teşekkür ederiz! 🙏
            </p>
          </div>
        )}

        {/* Request Details Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Lokasyon:</span>
              <span className="font-medium">{request.location.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Talep No:</span>
              <span className="font-medium">#{request.id}</span>
            </div>
            {request.buggy && (
              <div className="flex justify-between">
                <span className="text-gray-500">Shuttle:</span>
                <span className="font-medium">
                  {request.buggy.icon} {request.buggy.code}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Saat:</span>
              <span className="font-medium">{fmtTime(request.requestedAt)}</span>
            </div>
          </div>
        </div>

        {/* Cancel Button */}
        {(isPending || isAccepted) && (
          <button
            onClick={handleCancel}
            className="w-full py-4 rounded-[14px] text-base font-bold text-white transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
              boxShadow: "0 4px 12px rgba(239,68,68,0.3)",
            }}
          >
            <XCircle className="w-5 h-5" />
            <span>Talep İptal Et</span>
          </button>
        )}
      </div>
    </div>
  );
}
