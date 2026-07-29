"use client";

import { useEffect, useRef, useState, useCallback, useMemo, useDeferredValue } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loading } from "@/components/ui/loading";
import { toast } from "sonner";
import {
  Palette, Smartphone, Type, Plus, Trash2, Save, Undo2,
  Clock, User, DoorOpen, Phone, MapPin, Eye, EyeOff, PhoneCall, Car, Upload, X, Image
} from "lucide-react";
import {
  GuestPageConfig, CustomField, FieldMode,
  defaultGuestPageConfig, mergeConfigs
} from "@/lib/guest-page-config";

// --- Call page mobile preview ---
function CallPagePreview({ config }: { config: GuestPageConfig }) {
  return (
    <div className="w-[340px] mx-auto border-4 border-slate-800 rounded-[40px] overflow-hidden bg-white shadow-xl" style={{ minHeight: 520 }}>
      <div className="h-8 bg-slate-900 flex items-center justify-between px-6 pt-1">
        <span className="text-white text-[10px] font-medium">9:41</span>
        <span className="text-white text-[10px]">●●●●○</span>
      </div>
      <div className="h-[480px] overflow-y-auto" style={{ background: `linear-gradient(to bottom, ${config.bgStartColor}, ${config.bgEndColor})` }}>
        <div className="flex flex-col items-center gap-2 px-4 pt-4 pb-2">
          {config.showClock && (
            <div className="self-start px-3 py-1 rounded-full text-white font-bold text-[10px] font-mono" style={{ background: config.accentColor }}>
              <Clock className="w-3 h-3 inline mr-1" />12:34:56
            </div>
          )}
          {config.hotelLogo && <img src={config.hotelLogo} alt="" style={{ height: Math.round(config.hotelLogoSize * 0.8) }} className="object-contain rounded-xl mt-2" />}
          {config.locationLogo && (
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-white" style={{ background: config.accentColor }}>
              <MapPin className="w-8 h-8" />
            </div>
          )}
          {config.locationName && <h2 className="text-xs font-bold text-center" style={{ color: config.headerTextColor }}>{config.hotelName}</h2>}
        </div>
        <div className="px-4 py-2 space-y-1.5">
          {config.fields.guestName !== "off" && <div className="h-7 rounded bg-white/80 border text-[10px] px-2 flex items-center">Ad{config.fields.guestName === "required" && "*"}</div>}
          {config.fields.roomNumber !== "off" && <div className="h-7 rounded bg-white/80 border text-[10px] px-2 flex items-center">Oda No{config.fields.roomNumber === "required" && "*"}</div>}
          {config.fields.phone !== "off" && <div className="h-7 rounded bg-white/80 border text-[10px] px-2 flex items-center">Telefon{config.fields.phone === "required" && "*"}</div>}
          {config.customFields.filter(f => f.mode !== "off").map(f => (
            <div key={f.id} className="h-7 rounded bg-white/80 border text-[10px] px-2 flex items-center">{f.label}{f.mode === "required" && "*"}</div>
          ))}
        </div>
        <div className="px-4 py-2">
          <div className={`w-full py-2.5 flex items-center justify-center text-white font-bold text-[10px] ${config.buttonShape === "pill" ? "rounded-full" : "rounded-xl"}`}
            style={{ background: config.buttonColor }}>{config.buttonText}</div>
        </div>
        <div className="text-center py-3 mt-2" style={{ background: config.footerBgColor }}>
          <p className="text-[9px] font-semibold" style={{ color: config.footerTextColor }}>{config.footerText}</p>
        </div>
      </div>
    </div>
  );
}

// --- Status page mobile preview ---
function StatusPagePreview({ config }: { config: GuestPageConfig }) {
  return (
    <div className="w-[340px] mx-auto border-4 border-slate-800 rounded-[40px] overflow-hidden bg-white shadow-xl" style={{ minHeight: 400 }}>
      <div className="h-6 bg-slate-900 flex items-center justify-between px-6">
        <span className="text-white text-[9px] font-medium">9:41</span>
        <span className="text-white text-[9px]">●●●●○</span>
      </div>
      <div className="h-[350px] overflow-y-auto" style={{ background: `linear-gradient(to bottom, ${config.bgStartColor}, ${config.bgEndColor})` }}>
        <div className="text-center pt-4 pb-2">
          <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-white" style={{ background: "#10b981" }}>
            <Clock className="w-7 h-7" />
          </div>
          <h3 className="text-xs font-bold mt-2" style={{ color: config.headerTextColor }}>Talebiniz Alındı!</h3>
          <p className="text-[9px] text-gray-400">Sürücü aranıyor...</p>
        </div>
        {(config.showDriverName || config.showDriverLocation || config.showBuggyCode) && (
          <div className="px-4 py-2">
            <div className="bg-white rounded-xl p-2 border text-[9px] space-y-1">
              <div className="flex justify-between"><span className="text-gray-400">Lokasyon</span><span className="font-medium">Havuz Bar</span></div>
              {config.showDriverName && <div className="flex justify-between"><span className="text-gray-400">Sürücü</span><span className="font-medium">Ahmet Yılmaz</span></div>}
              {config.showBuggyCode && <div className="flex justify-between"><span className="text-gray-400">Araç</span><span className="font-medium">🚎 BUGGY-1</span></div>}
              {config.showDriverLocation && <div className="flex justify-between"><span className="text-gray-400">Konum</span><span className="font-medium">Lobi</span></div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Field editor ---
function FieldRow({ label, fieldKey, value, onChange, icon: Icon }: {
  label: string; fieldKey: string; value: FieldMode; onChange: (k: string, v: FieldMode) => void; icon: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label className="text-sm flex items-center gap-1.5 shrink-0 min-w-[80px]">
        <Icon className="w-3.5 h-3.5" /> {label}
      </Label>
      <Select value={value} onValueChange={(v) => onChange(fieldKey, v as FieldMode)}>
        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="required">Zorunlu</SelectItem>
          <SelectItem value="optional">Opsiyonel</SelectItem>
          <SelectItem value="off">Kapalı</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export default function GuestDesignPage() {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<GuestPageConfig>(defaultGuestPageConfig);
  const [tab, setTab] = useState("call");
  const MAX_LOGO_BYTES = 500 * 1024;

  useEffect(() => {
    fetch("/api/admin/settings")
      .then(r => r.json())
      .then(json => {
        if (json.success) {
          if (json.data.guest_page_config) {
            try {
              const saved = JSON.parse(json.data.guest_page_config);
              const merged = mergeConfigs(defaultGuestPageConfig, saved);
              setConfig(merged);
              if (merged.hotelLogo) setLogoPreview(merged.hotelLogo);
            } catch {}
          } else {
            setConfig(prev => ({
              ...prev,
              fields: {
                guestName: (json.data.guest_fields_name as FieldMode) || "optional",
                roomNumber: (json.data.guest_fields_room as FieldMode) || "optional",
                phone: (json.data.guest_fields_phone as FieldMode) || "optional",
              }
            }));
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const deferredConfig = useDeferredValue(config);
  const callPreview = useMemo(() => <CallPagePreview config={deferredConfig} />, [deferredConfig]);
  const statusPreview = useMemo(() => <StatusPagePreview config={deferredConfig} />, [deferredConfig]);

  function updateField(key: string, value: unknown) { setConfig(prev => ({ ...prev, [key]: value })); }
  function updateFieldMode(key: string, mode: FieldMode) { setConfig(prev => ({ ...prev, fields: { ...prev.fields, [key]: mode } })); }

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) { toast.error("Logo maksimum 500KB olmalı"); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) { toast.error("Sadece PNG, JPG, WebP"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoPreview(dataUrl);
      updateField("hotelLogo", dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function clearLogo() {
    setLogoPreview(null);
    updateField("hotelLogo", null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  }
  function addCustomField() { const id = `custom_${Date.now()}`; setConfig(prev => ({ ...prev, customFields: [...prev.customFields, { id, label: "Yeni Alan", placeholder: "", mode: "optional", type: "text" }] })); }
  function updateCustomField(id: string, updates: Partial<CustomField>) { setConfig(prev => ({ ...prev, customFields: prev.customFields.map(f => f.id === id ? { ...f, ...updates } : f) })); }
  function removeCustomField(id: string) { setConfig(prev => ({ ...prev, customFields: prev.customFields.filter(f => f.id !== id) })); }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_page_config: JSON.stringify(config) }),
      });
      if ((await res.json()).success) toast.success("Tasarım kaydedildi");
      else toast.error("Kaydetme başarısız");
    } catch { toast.error("Ağ hatası"); }
    finally { setSaving(false); }
  }

  if (loading) return <Loading fullPage />;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2"><Palette className="w-7 h-7" /> Misafir Sayfası Tasarımcısı</h1>
          <p className="text-muted-foreground mt-1.5">QR kod okutunca misafirin göreceği sayfaları özelleştirin</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={() => { setConfig(defaultGuestPageConfig); toast.success("Varsayılana sıfırlandı"); }}>
            <Undo2 className="w-4 h-4 mr-1.5" /> Sıfırla
          </Button>
          <Button onClick={save} disabled={saving}><Save className="w-4 h-4 mr-1.5" />{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full max-w-md">
          <TabsTrigger value="call" className="gap-1.5"><PhoneCall className="w-4 h-4" />Çağrı Sayfası</TabsTrigger>
          <TabsTrigger value="status" className="gap-1.5"><Car className="w-4 h-4" />Durum Sayfası</TabsTrigger>
        </TabsList>

        <TabsContent value="call" className="mt-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-5">
              {/* Header */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4" /> Header</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between"><Label className="text-sm">Saat göstergesi</Label><Switch checked={config.showClock} onCheckedChange={(v) => updateField("showClock", v)} /></div>
                    <div className="flex items-center justify-between"><Label className="text-sm">Lokasyon adı</Label><Switch checked={config.locationName} onCheckedChange={(v) => updateField("locationName", v)} /></div>
                    <div className="flex items-center justify-between"><Label className="text-sm">Lokasyon logosu</Label><Switch checked={config.locationLogo} onCheckedChange={(v) => updateField("locationLogo", v)} /></div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Otel Logosu</Label>
                    <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={handleLogoSelect} className="hidden" />
                    {logoPreview ? (
                      <div className="flex items-center gap-3">
                        <img src={logoPreview} alt="Logo" style={{ height: config.hotelLogoSize }} className="object-contain rounded-lg border border-border" />
                        <Button type="button" variant="ghost" size="icon" onClick={clearLogo}><X className="w-4 h-4 text-red-500" /></Button>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-1.5" /> Logo Yükle
                      </Button>
                    )}
                    <p className="text-xs text-muted-foreground">PNG, JPG, WebP — maks. 500KB (base64 olarak kaydedilir)</p>
                    {logoPreview && (
                      <div className="space-y-2 pt-2">
                        <Label className="text-xs">Logo Boyutu: {config.hotelLogoSize}px</Label>
                        <input type="range" min={32} max={200} step={4} value={config.hotelLogoSize}
                          onChange={(e) => updateField("hotelLogoSize", Number(e.target.value))}
                          className="w-full h-2 accent-current" />
                        <div className="flex justify-between text-[10px] text-muted-foreground"><span>32px</span><span>200px</span></div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Renkler */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> Renkler</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {(["bgStartColor", "bgEndColor", "headerTextColor", "accentColor"] as const).map((key) => {
                      const labelMap: Record<typeof key, string> = {bgStartColor: "Üst BG", bgEndColor: "Alt BG", headerTextColor: "Header Yazı", accentColor: "Vurgu"};
                      return (
                      <div key={key} className="space-y-1.5">
                        <Label className="text-xs">{labelMap[key]}</Label>
                        <div className="flex items-center gap-2">
                          <input type="color" value={String(config[key])} onChange={(e) => updateField(key, e.target.value)} className="w-8 h-8 rounded-lg border border-border cursor-pointer" />
                          <Input className="h-8 text-xs font-mono" defaultValue={String(config[key])} onBlur={(e) => updateField(key, e.target.value)} />
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Form Alanları */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2"><Type className="w-4 h-4" /> Form Alanları</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <FieldRow label="Misafir Adı" fieldKey="guestName" value={config.fields.guestName} onChange={updateFieldMode} icon={User} />
                    <FieldRow label="Oda No" fieldKey="roomNumber" value={config.fields.roomNumber} onChange={updateFieldMode} icon={DoorOpen} />
                    <FieldRow label="Telefon" fieldKey="phone" value={config.fields.phone} onChange={updateFieldMode} icon={Phone} />
                  </div>
                  {config.customFields.map((f) => (
                    <div key={f.id} className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg border border-border/50">
                      <Input className="h-8 text-xs flex-1" placeholder="Alan adı" value={f.label} onChange={(e) => updateCustomField(f.id, { label: e.target.value })} />
                      <Input className="h-8 text-xs w-24" placeholder="Placeholder" value={f.placeholder} onChange={(e) => updateCustomField(f.id, { placeholder: e.target.value })} />
                      <Select value={f.mode} onValueChange={(v) => updateCustomField(f.id, { mode: v as FieldMode })}>
                        <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="required">Zorunlu</SelectItem><SelectItem value="optional">Opsiyonel</SelectItem><SelectItem value="off">Kapalı</SelectItem></SelectContent>
                      </Select>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeCustomField(f.id)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addCustomField}><Plus className="w-3.5 h-3.5 mr-1.5" /> Özel Alan Ekle</Button>
                </CardContent>
              </Card>

              {/* Çağrı Butonu */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Çağrı Butonu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label className="text-xs">Metin</Label><Input className="h-8 text-sm" value={config.buttonText} onChange={(e) => updateField("buttonText", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">Renk</Label><div className="flex items-center gap-2"><input type="color" value={config.buttonColor} onChange={(e) => updateField("buttonColor", e.target.value)} className="w-8 h-8 rounded-lg border border-border cursor-pointer" /><Input className="h-8 text-xs font-mono" defaultValue={config.buttonColor} onBlur={(e) => updateField("buttonColor", e.target.value)} /></div></div>
                    <div className="space-y-1.5"><Label className="text-xs">Şekil</Label><Select value={config.buttonShape} onValueChange={(v) => updateField("buttonShape", v)}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="rounded">Yuvarlak</SelectItem><SelectItem value="pill">Tam Yuvarlak</SelectItem></SelectContent></Select></div>
                  </div>
                </CardContent>
              </Card>

              {/* Footer */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Footer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label className="text-xs">Metin</Label><Input className="h-8 text-sm" value={config.footerText} onChange={(e) => updateField("footerText", e.target.value)} /></div>
                    <div className="space-y-1.5"><Label className="text-xs">BG Rengi</Label><div className="flex items-center gap-2"><input type="color" value={config.footerBgColor} onChange={(e) => updateField("footerBgColor", e.target.value)} className="w-8 h-8 rounded-lg border border-border cursor-pointer" /><Input className="h-8 text-xs font-mono" defaultValue={config.footerBgColor} onBlur={(e) => updateField("footerBgColor", e.target.value)} /></div></div>
                    <div className="space-y-1.5"><Label className="text-xs">Yazı Rengi</Label><div className="flex items-center gap-2"><input type="color" value={config.footerTextColor} onChange={(e) => updateField("footerTextColor", e.target.value)} className="w-8 h-8 rounded-lg border border-border cursor-pointer" /><Input className="h-8 text-xs font-mono" defaultValue={config.footerTextColor} onBlur={(e) => updateField("footerTextColor", e.target.value)} /></div></div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="xl:col-span-1">
              <div className="sticky top-6">
                <div className="flex items-center gap-2 mb-3"><Smartphone className="w-4 h-4" /><span className="text-sm font-semibold">Mobil Önizleme</span></div>
                {callPreview}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="status" className="mt-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-5">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2"><Car className="w-4 h-4" /> Sürücü ve Araç Bilgisi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between"><Label className="text-sm">Sürücü adını göster</Label><Switch checked={config.showDriverName} onCheckedChange={(v) => updateField("showDriverName", v)} /></div>
                    <div className="flex items-center justify-between"><Label className="text-sm">Sürücü konumunu göster</Label><Switch checked={config.showDriverLocation} onCheckedChange={(v) => updateField("showDriverLocation", v)} /></div>
                    <div className="flex items-center justify-between"><Label className="text-sm">Araç kodunu göster</Label><Switch checked={config.showBuggyCode} onCheckedChange={(v) => updateField("showBuggyCode", v)} /></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> Durum Sayfası Renkleri</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {([{ k: "bgStartColor", l: "Üst BG" }, { k: "bgEndColor", l: "Alt BG" }, { k: "headerTextColor", l: "Yazı" }] as Array<{k: keyof GuestPageConfig, l: string}>).map(({ k, l }) => (
                      <div key={k} className="space-y-1.5"><Label className="text-xs">{l}</Label><div className="flex items-center gap-2"><input type="color" value={String(config[k])} onChange={(e) => updateField(k, e.target.value)} className="w-8 h-8 rounded-lg border border-border cursor-pointer" /><Input className="h-8 text-xs font-mono" defaultValue={String(config[k])} onBlur={(e) => updateField(k, e.target.value)} /></div></div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="xl:col-span-1">
              <div className="sticky top-6">
                <div className="flex items-center gap-2 mb-3"><Smartphone className="w-4 h-4" /><span className="text-sm font-semibold">Mobil Önizleme</span></div>
                {statusPreview}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
