"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import { MapPin, Send, Clock as ClockIcon, X, Check, HelpCircle } from "lucide-react";

interface Location {
  id: number;
  name: string;
  logo: string | null;
  description?: string | null;
}

export default function GuestCallPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locationId = searchParams.get("location");
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [clock, setClock] = useState("--:--:--");
  const [imgError, setImgError] = useState(false);
  const rippleRef = useRef<HTMLSpanElement>(null);

  // Clock — Europe/Nicosia timezone
  useEffect(() => {
    const tick = () => {
      try {
        const now = new Date();
        const cyprus = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Nicosia" }));
        const h = String(cyprus.getHours()).padStart(2, "0");
        const m = String(cyprus.getMinutes()).padStart(2, "0");
        const s = String(cyprus.getSeconds()).padStart(2, "0");
        setClock(`${h}:${m}:${s}`);
      } catch {
        const now = new Date();
        setClock(
          `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`,
        );
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Load location
  useEffect(() => {
    if (!locationId) {
      toast.error("Konum bilgisi eksik");
      setLoading(false);
      return;
    }
    fetch(`/api/locations/${locationId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setLocation(json.data);
        else toast.error("Konum bulunamadı");
      })
      .catch(() => toast.error("Bağlantı hatası"))
      .finally(() => setLoading(false));
  }, [locationId]);

  async function submitRequest() {
    if (!locationId) return;
    setShowConfirm(false);
    setShowLoading(true);
    setSubmitting(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId: Number(locationId) }),
      });
      const json = await res.json();
      setShowLoading(false);
      if (json.success) {
        toast.success("Talebiniz alındı!");
        router.push(`/guest/status/${json.data.id}`);
      } else {
        toast.error(json.error?.message || "Talep gönderilemedi");
      }
    } catch {
      setShowLoading(false);
      toast.error("Bağlantı hatası");
    } finally {
      setSubmitting(false);
    }
  }

  function handleButtonClick(e: React.MouseEvent) {
    // Ripple effect
    if (rippleRef.current) {
      rippleRef.current.style.width = "0";
      rippleRef.current.style.height = "0";
      requestAnimationFrame(() => {
        if (rippleRef.current) {
          rippleRef.current.style.animation = "ripple 0.6s ease-out";
        }
      });
    }
    setShowConfirm(true);
  }

  if (loading) return <Loading fullPage />;
  if (!location) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-slate-50 to-blue-50">
        <p className="text-slate-500">Konum bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-between max-w-[540px] mx-auto p-4 sm:p-6 bg-gradient-to-b from-slate-50 to-blue-50">
      {/* Header — Clock + Logo + Location */}
      <div className="flex flex-col items-center gap-4 mb-6" style={{ animation: "fadeInDown 0.6s ease-out" }}>
        {/* Clock */}
        <div
          className="self-start flex items-center gap-2 px-5 py-2.5 rounded-full text-white font-bold text-sm font-mono"
          style={{
            background: "linear-gradient(135deg, #1a2b4a 0%, #2c3e5a 100%)",
            boxShadow: "0 4px 12px rgba(26,43,74,0.3)",
            border: "2px solid rgba(255,255,255,0.1)",
          }}
        >
          <ClockIcon className="w-4 h-4 text-teal-400" style={{ animation: "pulseDot 1s ease-in-out infinite" }} />
          <span className="tracking-wider min-w-[85px] text-center">{clock}</span>
        </div>

        {/* Location Image */}
        <div className="w-40 h-40 mx-auto mb-4 relative">
          {location.logo && !imgError ? (
            <div
              className="w-full h-full rounded-3xl overflow-hidden"
              style={{ animation: "float 3s ease-in-out infinite" }}
            >
              <img
                src={location.logo}
                alt={location.name}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div
              className="w-full h-full rounded-3xl flex items-center justify-center text-white"
              style={{
                background: "linear-gradient(135deg, #1a2b4a 0%, #2c3e5a 100%)",
                animation: "float 3s ease-in-out infinite",
              }}
            >
              <MapPin className="w-16 h-16" />
            </div>
          )}
        </div>

        {/* Location Name */}
        <h2
          className="text-xl sm:text-2xl font-bold"
          style={{ color: "#1a2b4a" }}
        >
          {location.name}
        </h2>
      </div>

      {/* Main Content — Call Button */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full" style={{ animation: "fadeInUp 0.6s ease-out 0.2s both" }}>
          <button
            onClick={handleButtonClick}
            disabled={submitting}
            className="w-full min-h-[56px] flex items-center justify-center gap-2.5 text-white font-bold text-base sm:text-lg rounded-[14px] py-4 px-6 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 select-none touch-manipulation relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #1a2b4a 0%, #2a3b5a 100%)",
              boxShadow: "0 4px 12px rgba(27,165,168,0.2)",
            }}
            aria-label="Shuttle çağır"
          >
            <Send className="w-5 h-5" />
            <span>Shuttle Çağır</span>
            <span
              ref={rippleRef}
              className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
              style={{
                transform: "translate(-50%, -50%)",
                background: "rgba(255,255,255,0.3)",
                width: 0,
                height: 0,
              }}
            />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer
        className="text-center py-8 mt-8 -mx-4 sm:-mx-6 px-4"
        style={{
          background: "#1a2b4a",
          borderTop: "2px solid #d4af37",
          width: "calc(100% + 2rem)",
          animation: "fadeInUp 0.6s ease-out 0.4s both",
        }}
      >
        <p className="text-white text-sm font-semibold tracking-wide">
          Shuttle Call System © 2025
        </p>
      </footer>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-5"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={(e) => e.target === e.currentTarget && setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-[480px] w-full p-8"
            style={{
              boxShadow: "0 24px 60px rgba(0,0,0,0.3)",
              animation: "slideUp 0.4s cubic-bezier(0.68,-0.55,0.265,1.55)",
            }}
          >
            <div className="text-center">
              {/* Question Icon */}
              <div
                className="w-24 h-24 mx-auto mb-5 rounded-full flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                  boxShadow: "0 12px 24px rgba(249,115,22,0.3)",
                }}
              >
                <HelpCircle className="w-12 h-12 text-white" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                Shuttle Çağırmak İstiyor musunuz?
              </h3>
              <p className="text-sm text-gray-500 mb-6">Talebinizi onaylayın</p>

              {/* Location Summary */}
              <div
                className="rounded-2xl p-5 mb-6 text-left"
                style={{
                  background: "linear-gradient(135deg, rgba(27,165,168,0.08), rgba(242,140,56,0.08))",
                  border: "2px solid rgba(27,165,168,0.2)",
                }}
              >
                <div className="flex items-center gap-3 px-1 py-2 rounded-xl text-sm text-slate-700">
                  <MapPin className="w-5 h-5 shrink-0" style={{ color: "#1a2b4a" }} />
                  <span>
                    <strong>Lokasyon:</strong> {location.name}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-4 rounded-[14px] text-base font-bold transition-all hover:bg-gray-200 flex items-center justify-center gap-2"
                  style={{ background: "#f3f4f6", color: "#6b7280" }}
                >
                  <X className="w-4 h-4" />
                  <span>İptal</span>
                </button>
                <button
                  onClick={submitRequest}
                  className="flex-1 py-4 rounded-[14px] text-base font-bold text-white transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    boxShadow: "0 6px 20px rgba(16,185,129,0.3)",
                  }}
                >
                  <Check className="w-4 h-4" />
                  <span>Evet, Çağır</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {showLoading && (
        <div
          className="fixed inset-0 z-[10001] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
        >
          <div className="text-center">
            <div
              className="w-16 h-16 mx-auto mb-5 rounded-full border-4 border-slate-300 border-t-[#1a2b4a] animate-spin"
              style={{ borderTopColor: "#1a2b4a" }}
            />
            <p className="text-white text-base font-semibold">Shuttle çağrılıyor...</p>
          </div>
        </div>
      )}
    </div>
  );
}
