# ShuttleCall — Admin Paneli & Sürücü Dashboard UI/UX Şartnamesi

> **Hedef**: Google Stitch (veya benzeri bir tasarım aracı) ile birebir uygulanacak UI tasarımı için tüm ekranların, bileşenlerin, state'lerin, etkileşimlerin ve varyasyonların eksiksiz dökümü.

---

## 📐 TASARIM SİSTEMİ TEMELİ

### Renk Paleti

| Token | Değer | Kullanım |
|-------|-------|----------|
| `--background` | `#ffffff` | Sayfa arkaplanı |
| `--foreground` | `#0f172a` | Ana metin |
| `--card` | `#ffffff` | Kart arkaplanı |
| `--card-foreground` | `#0f172a` | Kart metni |
| `--primary` | `#1a2b4a` | Birincil renk (navy) |
| `--primary-foreground` | `#ffffff` | Birincil üstü metin |
| `--secondary` | `#f1f5f9` | İkincil arkaplan |
| `--secondary-foreground` | `#1e293b` | İkincil metin |
| `--muted` | `#f8fafc` | Sönük arkaplan |
| `--muted-foreground` | `#64748b` | Sönük metin |
| `--accent` | `#f1f5f9` | Vurgu arkaplanı |
| `--destructive` | `#ef4444` | Tehlike/kırmızı |
| `--border` | `#e2e8f0` | Kenarlıklar |
| `--ring` | `#1a2b4a` | Focus halkası |

### Durum Renk Kartelası

| Durum | Renk | Hex |
|-------|------|-----|
| Müsait (AVAILABLE) | Emerald | `#10b981` |
| Meşgul (BUSY) | Amber | `#f59e0b` |
| Kapalı (OFFLINE) | Gri | `#6b7280` |
| Bakım (MAINTENANCE) | Kırmızı | `#ef4444` |
| Bekleyen (PENDING) | Amber | `#f59e0b` |
| Kabul (ACCEPTED) | Mavi | `#3b82f6` |
| Tamam (COMPLETED) | Emerald | `#10b981` |
| İptal (CANCELLED) | Kırmızı | `#ef4444` |
| Cevapsız (UNANSWERED) | Turuncu | `#f97316` |

### Tipografi

- **Font**: Roboto (300, 400, 500, 700, 900)
- **Headings**: `text-xl` (1.25rem) / `text-2xl` (1.5rem) / Bold
- **Body**: `text-sm` (0.875rem) / `text-base` (1rem)
- **Label**: `text-xs` (0.75rem) / `text-sm` (0.875rem)
- **Mono**: `font-mono` (zaman, kod)

### Grid Sistemi

- **Düzen**: Tailwind CSS grid (`grid-cols-1 lg:grid-cols-3` vb.)
- **Breakpoint**: sm:640px, md:768px, lg:1024px, xl:1280px
- **Container**: `max-w-7xl`, `max-w-4xl`, `max-w-2xl`
- **Boşluk**: `space-y-4`, `space-y-6`, `gap-3`, `gap-4`

### UI Bileşen Kütüphanesi (shadcn/ui)

| Bileşen | Dosya | Kullanım |
|---------|-------|----------|
| Button | `button.tsx` | Tüm butonlar |
| Card | `card.tsx` | Tüm kartlar |
| Badge | `badge.tsx` | Durum etiketleri |
| Input | `input.tsx` | Tüm inputlar |
| Label | `label.tsx` | Tüm label'lar |
| Select | `select.tsx` | Tüm dropdown'lar |
| Dialog | `dialog.tsx` | Tüm modal'lar |
| Sheet | `sheet.tsx` | Mobil yan menü |
| Table | `table.tsx` | Tüm tablolar |
| Tabs | `tabs.tsx` | Sekmeli arayüzler |
| Switch | `switch.tsx` | Toggle anahtarlar |
| Separator | `separator.tsx` | Ayırıcı çizgiler |
| Badge | `badge.tsx` | Durum badge'leri |

---

## 📱 RESPONSIVE YAPI

### Admin Panel

| Bileşen | Mobil (<768px) | Desktop (≥768px) |
|---------|---------------|------------------|
| **Nav** | Fixed top bar (h-14) + Sheet slide-in | Fixed left sidebar (w-60) |
| **Main content**| `p-4`, `pt-14` (nav altı) | `p-6`, sidebar yanı |
| **Logout** | İkon + text | Sadece text |
| **Grid** | `grid-cols-1` | `lg:grid-cols-3` vb. |

### Sürücü Paneli

| Bileşen | Mobil | Desktop |
|---------|-------|---------|
| **Header** | Fixed top bar + avatar | Fixed top bar + avatar |
| **Content** | `max-w-2xl mx-auto`, `p-4` | Aynı |
| **Buttons** | `w-full` (tam genişlik) | `flex-none` (içeriğe göre) |

---

## 1️⃣ ADMIN PANELİ — ORTAK UYGULAMA ÇATISI

### 1.1 Admin Layout (`/(admin)/admin/layout.tsx`)

```
┌────────────────────────────────────────────────┐
│  Sidebar (w-60)    │  Main Content Area         │
│  ┌─────────────┐    │                           │
│  │ Logo + Başlık│   │  <Suspense fallback=      │
│  │ ShuttleCall  │   │    <Loading />>            │
│  │ Yönetim Pan.│   │    {children}              │
│  ├─────────────┤    │  </Suspense>               │
│  │ NAV         │    │                           │
│  │ ▸ Panel     │    │                           │
│  │ ▸ Canlı Har.│    │                           │
│  │ ▸ Araçlar   │    │                           │
│  │ ▸ Konumlar  │    │                           │
│  │ ▸ Kullanıc. │    │                           │
│  │ ▸ Simülasyon│    │                           │
│  │ ▸ Raporlar  │    │                           │
│  │ ▸ Denetim   │    │                           │
│  │ ▸ Ayarlar   │    │                           │
│  │ ▸ Sayfa Tas.│    │                           │
│  ├─────────────┤    │                           │
│  │ [Kullanıcı] │    │                           │
│  │ [Çıkış]     │    │                           │
│  └─────────────┘    │                           │
└────────────────────────────────────────────────┘
```

**State'ler:**
- **Mobil/Desktop**: `md:hidden` fixed top bar (h-14) + Sheet sidebar vs `hidden md:flex` sidebar
- **Mounted**: "Yükleniyor…" placeholder → nav items
- **Monitor kapalıyken**: "Canlı Harita" nav item gizlenir
- **Loading**: `<Loading fullPage />`

### 1.2 Sidebar Navigasyon (`components/admin-nav.tsx`)

**Nav Items (10 adet):**

| # | İkon | Label | Route | Koşullu |
|---|------|-------|-------|---------|
| 1 | `LayoutDashboard` | Panel | `/admin/dashboard` | — |
| 2 | `Monitor` | Canlı Harita | `/admin/monitor` | monitor_enabled !== false |
| 3 | `Car` | Araçlar | `/admin/buggies` | — |
| 4 | `MapPin` | Konumlar | `/admin/locations` | — |
| 5 | `Users` | Kullanıcılar | `/admin/users` | — |
| 6 | `PlayCircle` | Simülasyon | `/admin/simulate` | — |
| 7 | `BarChart3` | Raporlar | `/admin/reports` | — |
| 8 | `FileText` | Denetim | `/admin/audit` | — |
| 9 | `Settings` | Ayarlar | `/admin/settings` | — |
| 10 | `Palette` | Sayfa Tasarımı | `/admin/settings/guest-design` | — |

**State'ler:**
- **Active route**: `pathname.startsWith(item.href)` → `bg-primary/10 text-primary font-medium`
- **Mounted delay**: `setTimeout(() => setMounted(true), 0)` → "Yükleniyor…"
- **Monitor enabled**: API'den `monitor_enabled` kontrolü (useEffect+fetch)
- **Mobile**: Sheet (slide-in) + hamburger menü
- **Kullanıcı**: `truncate` ile kısaltılmış fullName
- **Logout**: POST `/api/auth/logout` form

---

## 2️⃣ YÖNETİM PANELİ (Dashboard) `/admin/dashboard`

### 2.1 Sayfa Düzeni

```
┌─────────────────────────────────────────────────────────┐
│  Yönetim Paneli                                         │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────┐ ┌──────────────────────────┐ │
│  │ ARAÇLAR (N)           │ │ CANLI BİLDİRİMLER        │ │
│  │ ┌─────────────────┐   │ │ ┌────────────────────┐   │ │
│  │ │ 🚗 B1 MUSAİT     │   │ │ 🔔 Yeni talep: Lobi │   │ │
│  │ │   📍 Lobi        │   │ │ 🟢 Talep #5 kabul   │   │ │
│  │ ├─────────────────┤   │ │ 🔴 Talep #3 iptal   │   │ │
│  │ │ 🚎 B2 MEŞGUL     │   │ │                    │   │ │
│  │ │   📍 Havuz ·Ali  │   │ │                    │   │ │
│  │ └─────────────────┘   │ │                    │   │ │
│  │                       │ │                    │   │ │
│  │ AKTİF TALEPLER (N)    │ │                    │   │ │
│  │ ┌─────────────────┐   │ │                    │   │ │
│  │ │ #12 BEKLEMEDE    │   │ └────────────────────┘   │ │
│  │ │ 📍 Lobi 14:30   │   │                          │ │
│  │ ├─────────────────┤   │                          │ │
│  │ │ #11 KABUL 🚎 B2 │   │                          │ │
│  │ │ 📍 Havuz 14:25  │   │                          │ │
│  │ └─────────────────┘   │                          │ │
│  └───────────────────────┘ └──────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │🕐 12 │ │⚠️ 1  │ │✅ 45 │ │❌ 3  │                   │
│  │Toplam│ │Bekl. │ │Tamam.│ │İptal │                   │
│  └──────┘ └──────┘ └──────┘ └──────┘                   │
├─────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌───────────┐ ┌───────────┐            │
│  │⏱ Tepki    │ │📈 Tamaml. │ │🍩 Durum    │            │
│  │  32.5 sn   │ │  5.2 dk   │ │  Dağılım   │            │
│  └────────────┘ └───────────┘ └───────────┘            │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Bileşenler

#### 2.2.1 Araçlar Kartı

| Özellik | Detay |
|---------|-------|
| **Başlık** | 🚗 Araçlar (N) — N = aktif araç sayısı |
| **Araç satırı** | `border-l-4` ile durum rengi |
| **İkon** | Emoji (🚗, 🚎, 🏎️ vb.) |
| **Kod** | `font-semibold` |
| **Badge** | Duruma göre renk |
| **Konum** | Logo + isim, `truncate` |
| **Sürücü** | User ikonu + isim(ler) |
| **Empty** | "Araç bulunamadı" |

**Durum → border rengi:**
- `AVAILABLE` → `border-l-emerald-500`
- `BUSY` → `border-l-amber-500`
- `OFFLINE` → `border-l-zinc-300`
- `MAINTENANCE` → `border-l-red-400`

#### 2.2.2 Aktif Talepler Kartı

| Özellik | Detay |
|---------|-------|
| **Başlık** | 📊 Aktif Talepler (N) — ikon `Activity`, renk `text-amber-600` |
| **ID** | `#N` font-bold |
| **Badge** | BEKLEMEDE/KABUL/TAMAM/İPTAL/CEVAPSIZ |
| **Konum logosu** | 4x4 rounded |
| **Konum adı** | `truncate` |
| **Araç** | İkon + kod (varsa) |
| **Sürücü** | `hidden sm:inline` |
| **Saat** | `HH:mm` format |
| **Empty** | "Aktif talep yok" |

**Badge renkleri:**
- `PENDING` → `secondary`
- `ACCEPTED` → `default`
- `COMPLETED` → `default`
- `CANCELLED` → `destructive`
- `UNANSWERED` → `outline`

#### 2.2.3 Canlı Bildirimler Kartı

| Özellik | Detay |
|---------|-------|
| **Başlık** | 🔔 Canlı Bildirimler — ikon `Bell`, renk `text-amber-500` |
| **Kaynak** | SSE `/api/sse/admin` |
| **Maks** | Son 30 bildirim |
| **Animasyon** | `fadeInUp 0.3s ease-out` |
| **İkonlar** | `Bell` (mavi) / `CheckCircle` (yeşil) / `XCircle` (kırmızı) |
| **Zaman** | `HH:mm:ss` |
| **Empty** | "Bildirim yok" |

**Olay → Bildirim:**
| SSE Olayı | İkon | Renk |
|-----------|------|------|
| `new_request` | Bell | `text-blue-600` |
| `request_accepted` | CheckCircle | `text-emerald-600` |
| `request_completed` | CheckCircle | `text-emerald-600` |
| `request_cancelled` | XCircle | `text-red-600` |

#### 2.2.4 Metrik Kartları (4 adet)

| Kart | İkon | Renk |
|------|------|------|
| Toplam | `Clock` | `text-primary` |
| Bekleyen | `AlertCircle` | `text-amber-600` |
| Tamamlanan | `CheckCircle` | `text-emerald-600` |
| İptal | `XCircle` | `text-destructive` |

**Format:** İkon (w-8 h-8) + label (text-xs muted) + değer (text-xl sm:text-2xl bold)

#### 2.2.5 Zaman Metrikleri (2 kart)

- **Ort. Tepki Süresi**: ⏱ ikon, `text-primary`
- **Ort. Tamamlama Süresi**: 📈 ikon, `text-emerald-600`

**Format:** `X.X sn` / `X.X dk` / `X.XX sa`

#### 2.2.6 Durum Dağılımı (Pie Chart)

- **Kütüphane**: recharts (`PieChart`, `Pie`, `Cell`, `Tooltip`, `Legend`)
- **Yarıçap**: outerRadius=60
- **Etiket**: sayısal değer
- **Legend**: font-size: 10px
- **Boyut**: `h-40 sm:h-48`

**Dilim renkleri:**
| Kategori | Renk |
|----------|------|
| Tamamlanan | `#10b981` |
| Bekleyen | `#f59e0b` |
| Kabul | `#3b82f6` |
| İptal | `#ef4444` |
| Cevapsız | `#f97316` |

### 2.3 Data Flow

- **API'ler**: `GET /api/reports/summary`, `GET /api/requests/active`, `GET /api/buggies`
- **Polling**: her 5 saniye
- **SSE**: `/api/sse/admin` — olay geldiğinde anında data refresh
- **Ses**: `playNotificationSound("notification")` — toggle ile kapatılabilir
- **Loading**: `<Loading fullPage />` tüm yüklenene kadar

---

## 3️⃣ CANLI HARİTA (Monitor) `/admin/monitor`

### 3.1 Sayfa Düzeni

```
┌─────────────────────────────────────────────────────┐
│  Canlı Harita  [🔴 Bağlı]  3 bekleyen  2 müsait    │
│  [🔔 Ses Açık] [⛶ Tam Ekran]                        │
├────────────────────────────────┬────────────────────┤
│                                │ BEKLEYEN ÇAĞRILAR  │
│       THREE.JS 3D HARİTA      │ ┌────────────────┐  │
│                                │ │👤 Ahmet·101    │  │
│   📍 Lobi   📍 Havuz          │ │  📍 Lobi  2dk  │  │
│                                │ ├────────────────┤  │
│   🚗 B1 🚎 B2                 │ │👤 Ayşe·205     │  │
│                                │ │  📍 Havuz 5dk  │  │
│   🔔 Çağrı marker'ları        │ └────────────────┘  │
│                                │                     │
│   [🔒Kilitli] [3D] [Üstten]   │ KABUL EDİLENLER     │
│   [Pin Gizle] [Hız ═══]       │ ┌────────────────┐  │
│   [Boyut ═══] [Paneli Gizle]  │ │ #3 🚎 B2       │  │
│                                │ └────────────────┘  │
│                                │                     │
│                                │ MUSAİT ARAÇLAR      │
│                                │ ┌────────────────┐  │
│                                │ │🚗 B1 🟢MUSAİT  │  │
│                                │ │  📍 Lobi       │  │
│                                │ └────────────────┘  │
└────────────────────────────────┴────────────────────┘
```

### 3.2 3D Harita Bileşeni (`components/monitor/monitor-map-3d.tsx`)

**Framework**: Three.js (react-three-fiber kullanılmaz, direkt THREE)

#### 3.2.1 Sahne

| Özellik | Değer |
|---------|-------|
| Arkaplan | `0x143321` (koyu yeşil) |
| Sis | Kapalı |
| Işık 1 | `HemisphereLight` `0xf4fff8` / `0x31543d` intensity 2.45 |
| Işık 2 | `DirectionalLight` `0xffffff` intensity 2.6 (gölgeli) |
| Işık 3 | `DirectionalLight` `0x7dffb6` intensity 0.9 (rim) |
| Gölge | `PCFSoftShadowMap`, mapSize 1024x1024 |

#### 3.2.2 Katmanlar

| Grup | İçerik | renderOrder |
|------|--------|-------------|
| `staticRoot` | Statik harita + binalar | — |
| `buggyGroup` | Araç sprite'ları | 120 |
| `callGroup` | Çağrı marker'ları | 110 |
| `pinGroup` | Konum pin'leri | 90 |

#### 3.2.3 Konum Pin'leri

- **Sprite**: Canvas ile çizilmiş pin (damla şekli)
- **Renk**: `#ff7966 → #d71918` gradient
- **Numara**: Pin üzerinde sıra no (1, 2, 3…)
- **Konum**: `pxToWorld(s.x, s.y, 0.35)` - Z ekseninde yükseltilmiş
- **Center**: `(0.5, 0.17)` — pin ucunu noktaya hizala
- **Scale**: `(5.2, 6.7, 1)`
- **Önbellek**: Her numara için texture önbelleği

#### 3.2.4 Araç Sprite'ları

- **Sprite**: Canvas ile çizilmiş golf-cart/görsel
- **Renk paleti**: 12 renk (`#111`, `#0b3d91`, `#e8412f`, vb.)
- **Durum renkleri**: AVAILABLE → palet sırası, BUSY → `#f97316`, OFFLINE→ `#6b7280`
- **Label**: Kod üzerinde etiket
- **Konum**: `coordOf` haritasından, aynı lokasyondaki araçlar `offset` (2.5 birim)
- **Scale**: `(4.2 * vehicleSize, 3.15 * vehicleSize, 1)`
- **Center**: `(0.5, 0.36)`
- **Tekerlek animasyonu**: `rotation.z -= 0.018 * speedFactor`
- **Önbellek**: `${code}_${color}` key

#### 3.2.5 Çağrı Marker'ları

- **PENDING**: Kırmızı (`#ef4444`), pulse efekt (sinus * 0.15 scale, 0.4 opacity)
- **ACCEPTED**: Mavi (`#3b82f6`), sabit
- **Sprite**: Canvas çizimi (pin damlası + daire + ikon)
- **Scale**: `(8, 8, 1)`, PENDING pulse `8 * (1 + sin * 0.15)`
- **Z poz**: `pxToWorld(x, y - 24, 1.8)`

#### 3.2.6 Kamera Kontrolleri

| Kontrol | Input |
|---------|-------|
| **Döndürme** | Pointer drag (tek parmak) |
| **Pan** | Shift+drag / orta/sağ tuş drag |
| **Zoom** | Scroll wheel |
| **Kilit** | Toggle — aktifken tüm kontroller devre dışı |

**Varsayılan kamera:**
- `spherical = { radius: 70, theta: 0.35, phi: 52° }`
- `target = new Vector3(0, 0, 0)`

**Reset kamera:**
- **3D**: radius=70, theta=0.35, phi=52°
- **Üstten 2D**: radius=80, theta=0, phi≈1°

#### 3.2.7 Kontrol Paneli (alt orta)

| Kontrol | Tip | Varsayılan |
|---------|-----|------------|
| Görünüm Kilidi | Buton toggle | 🔒 Kilitli |
| 3D Kamera | Buton | — |
| Üstten 2D | Buton | — |
| Pinleri Göster/Gizle | Buton toggle | Göster |
| Hız | Range slider 0.25–2.5 | 0.5 |
| Boyut | Range slider 0.45–3 | 1.75 |
| Paneli Gizle/Göster | Buton toggle | Göster |

**Panel state'leri:**
- `panelHidden` → panel aşağı kayar (`translate-y-24 opacity-0`)
- `viewLocked` → cursor: `cursor-not-allowed`
- `showPins` → pinGroup.visible

#### 3.2.8 Click Raycast

- **Hedefler**: buggyGroup + callGroup
- **Seçim**: `userData.kind` ile ayırt et (`"buggy"` veya `"call"`)
- **Callback**: `onSelect({ kind, id })` veya `onSelect(null)`
- **UI highlight**: Kenar panelinde ilgili kartın border'ı vurgulanır

### 3.3 Yan Panel (fullscreen=false)

#### 3.3.1 Bekleyen Çağrılar Kartı
- Bekleme süresi canlı sayacı (`fmtWait`: X dk Y sn)
- Seçili çağrı: `border-red-500 bg-red-500/10`
- "haritada yok" badge (eğer mapX/mapY null ise)

#### 3.3.2 Kabul Edilenler Kartı
- Görev #ID + araç kodu
- Konum adı

#### 3.3.3 Müsait Araçlar Kartı
- Durum badge + sürücü adı
- GPS canlı 📍 veya konum bilgisi
- "konum bildirmedi" uyarısı

### 3.4 State'ler

| State | Tip | Varsayılan |
|-------|-----|------------|
| `monitorEnabled` | boolean \| null | null (loading) |
| `mapUrl` | string \| null | null |
| `muted` | boolean | false |
| `fullscreen` | boolean | false |
| `selection` | `{kind, id}` \| null | null |
| `connected` | boolean | SSE'den gelir |

### 3.5 Edge Case'ler

1. **Monitor kapalı**: "Canlı Harita İzleme Kapalı" sayfası → Ayarlar'a git butonu
2. **Monitor loading**: `<Loading fullPage />`
3. **Hiç lokasyon yok**: Harita boş, pin/buggy/call yok
4. **Tüm araçlar OFFLINE**: Haritada hiç araç görünmez
5. **Çağrı yoğun**: Yan panelde scroll

---

## 4️⃣ ARAÇLAR (Buggies) `/admin/buggies`

### 4.1 Sayfa Düzeni

```
┌──────────────────────────────────────────────────────┐
│  Araçlar                          [➕ Araç Ekle]     │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │ Kod │Model│Durum│Konum│Sürücüler │İşlemler    │  │
│  ├────────────────────────────────────────────────┤  │
│  │🚗 B1 │─    │MUSAİT│Lobi │Ahmet Y.  │✏️ Kapat │  │
│  │      │     │🟢   │     │[×]      │  👤 Sür.│  │
│  ├────────────────────────────────────────────────┤  │
│  │🚎 B2 │─    │MEŞGUL│Havuz│Ali K.   │✏️ Kapat │  │
│  │      │     │🟠   │     │[×]      │  👤 Sür.│  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 4.2 Tablo Sütunları

| Sütun | İçerik | Not |
|-------|--------|-----|
| Kod | İkon + kod | `font-medium` |
| Model | Metin veya "—" | |
| Durum | Badge (renkli) | MUSAİT/MEŞGUL/KAPALI/BAKIM |
| Konum | Konum adı veya "—" | |
| Sürücüler | Etiket listesi [×] | Her sürücü için çıkarma butonu |
| İşlemler | ✏️ Düzenle / Kapat-Aktif Et / 👤 Sürücü Ata | 3 buton |

### 4.3 Dialog'lar

#### 4.3.1 Araç Ekle/Düzenle Dialog

| Alan | Tip | Zorunlu |
|------|-----|---------|
| Kod | Input (text) | ✅ |
| Model | Input (text) | — |
| Plaka | Input (text) | — |
| İkon | Input (emoji) | — 🚗 varsayılan |

**State'ler:**
- `editing` → dialog title "Araç Düzenle" / "Araç Ekle"
- Buton: "Güncelle" / "Oluştur"

#### 4.3.2 Sürücü Ata Dialog

| Bölüm | İçerik |
|-------|--------|
| Başlık | "Sürücü Ata — 🚗 B1" |
| Mevcut sürücüler | İsim + [×] çıkarma butonu |
| Ayraç | `<Separator />` |
| Sürücü seç | Dropdown (filter: atanmamış sürücüler) |
| Buton | "Ata" |

**Kullanıcı hikayesi:**
1. Admin "Sürücü Ata" butonuna tıklar
2. Mevcut sürücüler listelenir
3. Atanmamış sürücüler dropdown'da gösterilir
4. Seç → Ata → toast başarılı → tablo refresh

### 4.4 Durum Toggle

- `AVAILABLE` iken "Kapat" butonu (OFFLINE yapar)
- `OFFLINE` iken "Aktif Et" butonu (AVAILABLE yapar)
- PATCH `/api/buggies/:id/status`

### 4.5 Durum Badge Renkleri

| Durum | Variant |
|-------|---------|
| AVAILABLE | `default` (yeşil) |
| BUSY | `secondary` (amber) |
| OFFLINE | `destructive` (kırmızı) |
| MAINTENANCE | `outline` (gri) |

### 4.6 Edge Case'ler

1. **Hiç araç yok**: `EmptyState` — "Araç yok. İlk aracınızı ekleyin"
2. **Sürücü atanmamış**: Sürücü sütununda "—"
3. **Zaten atanmış sürücü**: Dropdown'da filtrelenmiş (görünmez)
4. **API hatası**: Sonner toast ile hata mesajı
5. **Duplicate kod**: Backend 409 — toast "Araç kodu zaten var"

---

## 5️⃣ KONUMLAR (Locations) `/admin/locations`

### 5.1 Sayfa Düzeni

```
┌──────────────────────────────────────────────────────────┐
│  ⚠️ En az bir konum oluşturmalısınız                    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │  🗺️ Adım 1: Otel Haritasını Yükleyin              │  │
│  │     [📤 Harita Yükle]                              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Konumlar       [📥 Tüm QR'ları İndir] [+ Konum Ekle]   │
│  ┌────────────────────────────────────────────────────┐  │
│  │Logo│Ad  │Açıklama│Sıra│Harita│Durum│QR     │İşlem.│  │
│  ├────────────────────────────────────────────────────┤  │
│  │🖼️ │Lobi│─       │0   │✓     │Aktif │📱[🗑️]│✏️📤🗑️│  │
│  │🖼️ │Havuz│─      │1   │✓     │Aktif │📱[🗑️]│✏️📤🗑️│  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 5.2 İlk Kurulum Akışı

1. `?new=true` query param ile yönlendirme
2. **Adım 1** (harita yoksa): "Otel Haritasını Yükleyin" kartı — upload (PNG/JPG/WebP, max 5MB)
3. Harita yüklendikten sonra: Harita preview + "Haritayı Kaldır" butonu
4. Harita + konum ekle butonu aktif

### 5.3 Tablo Sütunları

| Sütun | İçerik |
|-------|--------|
| Logo | 40x40 rounded resim veya MapPin ikonu |
| Ad | `font-medium` |
| Açıklama | Kısa metin veya "—" |
| Sıra | `displayOrder` numarası |
| Harita | Badge ✓ (varsa) veya Badge "yok" |
| Durum | Badge "Aktif" (green) / "Pasif" (outline) |
| QR | Göster/Sil ikonları veya "Oluştur" butonu |
| İşlemler | ✏️ Düzenle / 📤 Logo yükle / 🗑️ Logo sil |

### 5.4 Wizard Dialog (2 adım)

**Adım 1 — Temel Bilgiler:**
| Alan | Tip |
|------|-----|
| Logo | File upload (PNG/JPG, max 500KB) + preview |
| Ad | Input (text, zorunlu) |
| Açıklama | Input (text) |
| Görüntüleme Sırası | Input (number) |

**Adım 2 — Harita Noktası:**
| Bileşen | Detay |
|---------|-------|
| LocationMapPicker | Harita üzerinde tıklama ile nokta seçimi |
| Seçili nokta | Kırmızı marker |
| Step indicator | 2 çubuk (dolu/boş) |

**Navigasyon:** İptal / ← Geri / Devam Et → / Oluştur ✓

### 5.5 QR Kod Yönetimi

| Aksiyon | API |
|---------|-----|
| **Oluştur** | POST `/api/locations/:id/qr` |
| **Görüntüle** | QRCode.toDataURL + Dialog |
| **İndir (tek)** | download link |
| **Yeniden oluştur** | DELETE + POST + refresh |
| **Sil** | DELETE `/api/locations/:id/qr` |
| **Tümünü indir (zip)** | JSZip ile toplu indirme |

### 5.6 Logo Yönetimi

- **Satır içi yükleme**: Her satırda 📤 butonu
- **Satır içi silme**: 🗑️ butonu (sadece logo varsa)
- **Dialog içi yükleme**: Wizard'da Adım 1'de
- **Sınır**: max 500KB, sadece image/*
- **Preview**: 40x40 (tablo), 64x64 (dialog)

### 5.7 Edge Case'ler

1. **Harita yok + ilk kurulum**: Büyük "Adım 1" kartı, konum ekle butonu disabled
2. **Harita var ama hiç konum yok**: EmptyState "Alış/bırakma noktaları ekleyin"
3. **QR kod yok**: "Oluştur" butonu
4. **Harita silme**: DELETE `/api/admin/settings/map`
5. **Konum silme (request varsa)**: Soft delete (deactivate)
6. **Dosya çok büyük**: Toast "max 500KB/5MB" uyarısı

---

## 6️⃣ KULLANICILAR (Users) `/admin/users`

### 6.1 Sayfa Düzeni

```
┌──────────────────────────────────────────────────────┐
│  Kullanıcılar                      [➕ Kullanıcı Ekle]│
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │Kullanıcı│Ad Soyad│Rol│E-posta│Tel│Durum│İşlem. │  │
│  ├────────────────────────────────────────────────┤  │
│  │admin    │Admin B.│👑Yön│a@b.c │—  │Aktif│✏️ D. │  │
│  │ahmet   │Ahmet Y.│🚗Sür│—     │—  │Aktif│✏️ D. │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 6.2 Tablo Sütunları

| Sütun | İçerik |
|-------|--------|
| Kullanıcı Adı | `font-medium` |
| Ad Soyad | Metin |
| Rol | Badge "Yönetici" (default) veya "Sürücü" (secondary) |
| E-posta | Metin veya "—" |
| Telefon | Metin veya "—" |
| Durum | Badge "Aktif" (green) veya "Pasif" (outline) |
| İşlemler | ✏️ Düzenle / "Devre Dışı Bırak" veya "Aktifleştir" |

### 6.3 Dialog'lar

#### 6.3.1 Kullanıcı Ekle Dialog

| Alan | Tip | Zorunlu |
|------|-----|---------|
| Kullanıcı Adı | Input | ✅ |
| Şifre | Input (password) | ✅ (min 8 karakter, büyük/küçük/rakam/özel) |
| Rol | Select (Sürücü/Yönetici) | ✅ |
| Ad Soyad | Input | ✅ |
| E-posta | Input (email) | — |
| Telefon | Input | — |

#### 6.3.2 Kullanıcı Düzenle Dialog (3 adım)

**Adım 1 — Kimlik:**
- Kullanıcı Adı, Ad Soyad, Rol, E-posta, Telefon

**Adım 2 — Şifre & Durum:**
- Mevcut şifre hash gösterimi (toggle gizle/göster + kopyala)
- Yeni şifre (opsiyonel, toggle gizle/göster)
- Aktif toggle (switch)
- Şifre değiştirme zorunlu toggle

**Adım 3 — Özet & Kaydet:**
- Tüm alanların özet gösterimi
- "Güncelle" butonu

### 6.4 Edge Case'ler

1. **Hiç kullanıcı yok**: EmptyState
2. **Kullanıcı devre dışı**: Badge "Pasif", giriş yapamaz
3. **Şifre hash'i**: Sadece gösterim, orijinal şifre görülemez
4. **Rol değişikliği**: Admin olmayan kullanıcı admin yapılabilir

---

## 7️⃣ RAPORLAR (Reports) `/admin/reports`

### 7.1 Sayfa Düzeni

```
┌──────────────────────────────────────────────────────────┐
│  Raporlar                                                │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐  │
│  │ Tarih Aralığı                 [📋 Rapor Al]        │  │
│  │ [Başlangıç 📅] [Bitiş 📅]                         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│  │ Top. │ │Bekl. │ │Tamam.│ │İptal │                   │
│  │  61  │ │  3   │ │  45  │ │  8   │                   │
│  └──────┘ └──────┘ └──────┘ └──────┘                   │
│                                                          │
│  ┌────────────┐ ┌───────────┐ ┌───────────┐            │
│  │⏱ Tepki    │ │📈 Tamaml. │ │ Durum     │            │
│  │  32.5 sn   │ │  5.2 dk   │ │  Dağılım  │            │
│  └────────────┘ └───────────┘ └───────────┘            │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Sürücü Performansı                                 │  │
│  │ ┌──────────────────────────────────────────────┐  │  │
│  │ │ 📊 Bar Chart (sürücü bazlı tamamlanan/tepki) │  │  │
│  │ └──────────────────────────────────────────────┘  │  │
│  │ Sürücü │Tamamlanan│Ort.Tepki│Ort.Tamamlama       │  │
│  │ Ahmet  │   25     │ 28 sn   │ 4.5 dk             │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Konuma Göre Talepler                               │  │
│  │ ┌──────────────────────────────────────────────┐  │  │
│  │ │ 📊 Bar Chart (horizontal - konum bazlı talep)│  │  │
│  │ └──────────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 7.2 Filtreleme

- **Tarih Aralığı**: 2 date input (başlangıç/bitiş)
- "Rapor Al" butonu → tüm verileri yeniden yükle

### 7.3 Grafikler

#### 7.3.1 Sürücü Performans Bar Chart
| Özellik | Değer |
|---------|-------|
| Tip | Vertical bar |
| XAxis | Sürücü adı (font 11px) |
| Bar 1 | `count` → mavi `#3b82f6`, "Tamamlanan" |
| Bar 2 | `avgResponse` → amber `#f59e0b`, "Ort. Tepki (sn)" |
| Radius | `[4, 4, 0, 0]` |
| y ekseni | + değerler |

#### 7.3.2 Konum Bar Chart
| Özellik | Değer |
|---------|-------|
| Tip | Horizontal bar (layout="vertical") |
| YAxis | Konum adı (width=100, font 11px) |
| Bar | `count` → yeşil `#10b981`, "Talep" |
| Radius | `[0, 4, 4, 0]` |

### 7.4 Tablolar

- **Sürücü Tablosu**: Sürücü, Tamamlanan, Ort. Tepki, Ort. Tamamlama
- **Zaman formatı**: `< 60 sn → "X.X sn"`, `< 3600 → "X.X dk"`, `≥ 3600 → "X.XX sa"`

### 7.5 State'ler

| State | Varsayılan |
|-------|------------|
| `summary` | null (loading) |
| `driverStats` | [] |
| `locationStats` | [] |
| `dateFrom` | "" |
| `dateTo` | "" |
| `loading` / `summaryLoading` | true |

---

## 8️⃣ DENETİM (Audit) `/admin/audit`

### 8.1 Sayfa Düzeni

```
┌──────────────────────────────────────────────────────┐
│  Denetim Günlüğü                                     │
├──────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────┐  │
│  │İşlem      │Varlık     │Kullanıcı│IP    │Saat  │  │
│  ├────────────────────────────────────────────────┤  │
│  │Giriş      │User #1   │admin    │—     │14:30 │  │
│  │Araç Oluş. │Buggy #3  │admin    │—     │14:25 │  │
│  │Talep Kabul│Req. #12  │ahmet    │—     │14:20 │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### 8.2 Tablo Sütunları

| Sütun | İçerik |
|-------|--------|
| İşlem | Badge "Giriş" / "Araç Oluşturma" / "Talep Kabul" vb. |
| Varlık | `{entityType} #{entityId}` |
| Kullanıcı | `user.fullName` veya "Sistem" |
| IP | `ipAddress` veya "—" |
| Saat | `new Date().toLocaleString("tr-TR")` |

### 8.3 Aksiyon Etiketleri (20 adet)

| Kod | Türkçe Etiket |
|-----|---------------|
| `LOGIN` | Giriş |
| `LOGOUT` | Çıkış |
| `CHANGE_PASSWORD` | Şifre Değişikliği |
| `CREATE_USER` | Kullanıcı Oluşturma |
| `UPDATE_USER` | Kullanıcı Güncelleme |
| `DELETE_USER` | Kullanıcı Silme |
| `CREATE_BUGGY` | Araç Oluşturma |
| `UPDATE_BUGGY` | Araç Güncelleme |
| `DELETE_BUGGY` | Araç Silme |
| `UPDATE_BUGGY_STATUS` | Araç Durum Değişikliği |
| `ASSIGN_DRIVER` | Sürücü Atama |
| `UNASSIGN_DRIVER` | Sürücü Çıkarma |
| `CREATE_LOCATION` | Konum Oluşturma |
| `UPDATE_LOCATION` | Konum Güncelleme |
| `DELETE_LOCATION` | Konum Silme |
| `GENERATE_QR` | QR Oluşturma |
| `ACCEPT_REQUEST` | Talep Kabul |
| `COMPLETE_REQUEST` | Talep Tamamlama |
| `CANCEL_REQUEST` | Talep İptal |
| `SIMULATE_REQUEST` | Simülasyon Talep |

### 8.4 Edge Case'ler

| Durum | Davranış |
|-------|----------|
| Hiç kayıt yok | EmptyState "Kayıt yok" |
| Kullanıcı silinmiş | `user?.fullName || "Sistem"` |
| IP yok | "—" göster |

---

## 9️⃣ SİMÜLASYON (Simulate) `/admin/simulate`

### 9.1 State'ler

| State | Varsayılan |
|-------|------------|
| `demoMode` | false |
| `locations` | [] |
| `recent` | [] |
| `selectedLocation` | null |
| `simulating` | false |
| `dialogOpen` | false |

### 9.2 Demo Mod Kapalı Senaryosu

```
┌───────────────────────────────────────────────┐
│  Simülasyon                                    │
│  Demo talep simülasyonu                        │
├───────────────────────────────────────────────┤
│  ⚠️ Demo Mod Kapalı                            │
│  Simülasyon modu sadece Demo Mod aktifken      │
│  kullanılabilir. Lütfen önce Ayarlar → Demo    │
│  Mod sayfasından demo modu aktif edin.         │
└───────────────────────────────────────────────┘
```

### 9.3 Demo Mod Aktif Senaryosu

```
┌───────────────────────────────────────────────┐
│  Simülasyon                [🔄 Yenile]        │
│  Lokasyon seçip demo çağrı başlatın.          │
├───────────────────────────────────────────────┤
│  📍 Lokasyonlar (3)                           │
│  ┌──────────────┐ ┌──────────────┐           │
│  │ 🖼️ Lobi      │ │ 🖼️ Havuz     │           │
│  │    Ana giriş  │ │   Havuz bar  │           │
│  │ [▶ Çağır]    │ │ [▶ Çağır]    │           │
│  └──────────────┘ └──────────────┘           │
├───────────────────────────────────────────────┤
│  🕐 Son Simülasyon Talepleri                  │
│  #12 Lobi Demo M. 🟢Bekliyor 14:30 [🔗Takip] │
│  #10 Plaj Demo M. ✅Tamamlandı 14:25          │
└───────────────────────────────────────────────┘
```

### 9.4 Simülasyon Akışı

1. Kullanıcı bir lokasyon kartına tıklar
2. Onay dialog'u açılır:
   - "Lobi lokasyonundan demo araç talebi oluşturulacak"
   - 3 maddelik açıklama listesi
3. "Araç Çağrısı Başlat" → API çağrısı
4. Başarılı → toast + yeni sekmede misafir durum sayfası (`guest/status/{id}?capability=...`)
5. Liste yenilenir

### 9.5 Edge Case'ler

| Durum | Davranış |
|-------|----------|
| Demo mod kapalı | Uyarı kartı, simülasyon yok |
| Hiç lokasyon yok | Boş grid |
| Hiç simülasyon yok | "Son Simülasyon Talepleri" bölümü gizli |

---

## 🔟 AYARLAR (Settings) `/admin/settings`

### 10.1 Sayfa Düzeni

```
┌───────────────────────────────────────────────┐
│  ⚙️ Ayarlar                                    │
│  Sistem ayarlarını yapılandırın                │
├───────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────┐  │
│  │ ⚠️ Demo Mod                            │  │
│  │ Açık: şifre/e-posta zorunluluğu yok    │  │
│  │ Kapalı: ilk giriş zorunlu              │  │
│  │                                  [🔘]  │  │
│  └─────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────┐  │
│  │ 🗺️ Canlı Harita İzleme                  │  │
│  │ Açık: araç/çağrı konumları canlı        │  │
│  │ Kapalı: monitor sayfası devre dışı      │  │
│  │                                  [🔘]  │  │
│  └─────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────┐  │
│  │ 🗑️ Sistem Sıfırlama                    │  │
│  │ Tüm veriler kalıcı silinir!             │  │
│  │                                         │  │
│  │ ⚠️ "SIFIRLA" yazın ve butona basın     │  │
│  │ [_______________] [🗑️ Sistemi Sıfırla] │  │
│  └─────────────────────────────────────────┘  │
└───────────────────────────────────────────────┘
```

### 10.2 Demo Mod

- **Switch**: `checked={demo_mode === "true"}`
- **Auto-save**: toggle'da anında API çağrısı
- **Açık**: "Demo mod aktif — şifre değiştirme ve e-posta zorunluluğu YOK"
- **Kapalı**: "Demo mod kapalı — ilk girişte şifre değiştirme ve e-posta ZORUNLU"
- **İkon**: Açık → ⚠️ amber, Kapalı → ✅ yeşil

### 10.3 Canlı Harita

- **Switch**: `checked={monitor_enabled === "true"}`
- **Açık**: "Harita aktif — araç ve çağrı konumları canlı izlenebilir"
- **Kapalı**: "Harita kapalı — monitor sayfası devre dışı"
- **Not**: Nav'da "Canlı Harita" item'ı otomatik gizlenir

### 10.4 Sistem Sıfırlama

| Özellik | Değer |
|---------|-------|
| Kart stili | `border-destructive/30` |
| Uyarı | `bg-destructive/5` kırmızı kutu |
| Onay metni | "SIFIRLA" (case-sensitive) |
| Buton | `variant="destructive"`, disabled `resetConfirm !== "SIFIRLA"` |
| Sonuç | Toast + `/setup` sayfasına yönlendirme |
| Veri | Tüm veriler (oteller, kullanıcılar, araçlar, konumlar, çağrılar) silinir |

---

## 1️⃣1️⃣ MİSAFİR SAYFASI TASARIMCISI (Guest Design) `/admin/settings/guest-design`

### 11.1 Sayfa Düzeni

```
┌──────────────────────────────────────────────────────────┐
│  🎨 Misafir Sayfası Tasarımcısı   [↩ Sıfırla] [💾 Kaydet]│
│  QR kod okutunca misafirin göreceği sayfalar             │
├──────────────────────────────────────────────────────────┤
│  [📞 Çağrı Sayfası] [🚗 Durum Sayfası] (Tabs)          │
│                                                          │
│  ┌─────────────────────────────────┬─────────────────┐  │
│  │ TASARIM PANELİ                  │ MOBIL ÖNİZLEME  │  │
│  │                                 │  ┌───────────┐  │  │
│  │ Header                          │  │ 📱 Telefon │  │  │
│  │   ├ Saat göster [🔘]           │  │   modeli   │  │  │
│  │   ├ Lokasyon adı [🔘]          │  │            │  │  │
│  │   ├ Lokasyon logosu [🔘]       │  │  9:41      │  │  │
│  │   └ Logo yükle [📤] + boyut ═══│  │  ┌────────┐│  │  │
│  │                                 │  │  │Önizleme││  │  │
│  │ Renkler                         │  │  │        ││  │  │
│  │   🎨 Üst BG █████               │  │  └────────┘│  │  │
│  │   🎨 Alt BG █████               │  │            │  │  │
│  │   🎨 Vurgu █████               │  └───────────┘  │  │
│  │                                 │                 │  │
│  │ Form Alanları                   │                 │  │
│  │   👤 Misafir Adı [Zorunlu ▼]   │                 │  │
│  │   🚪 Oda No [Opsiyonel ▼]      │                 │  │
│  │   📞 Telefon [Kapalı ▼]        │                 │  │
│  │   [+] Özel Alan Ekle           │                 │  │
│  │                                 │                 │  │
│  │ 🔘 Çağrı Butonu                │                 │  │
│  │   Metin: [Shuttle Çağır]       │                 │  │
│  │   Renk: 🎨 █████               │                 │  │
│  │   Şekil: [Yuvarlak ▼]         │                 │  │
│  │                                 │                 │  │
│  │ Footer                          │                 │  │
│  │   Metin: [...], BG: 🎨 , Yazı:🎨 │                 │  │
│  └─────────────────────────────────┴─────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 11.2 Tabs

- **📞 Çağrı Sayfası** (`tab="call"`) — Form özelleştirme
- **🚗 Durum Sayfası** (`tab="status"`) — Sürücü/araç bilgisi özelleştirme

### 11.3 Header Ayarları

| Ayar | Tip | Varsayılan |
|------|-----|------------|
| Saat göstergesi | Switch | true |
| Lokasyon adı | Switch | true |
| Lokasyon logosu | Switch | true |
| Otel Logosu | File upload (base64) | null |
| Logo boyutu | Range slider 32–200px | 80px |

### 11.4 Renkler (4 adet)

| Alan | Etiket | Varsayılan |
|------|--------|------------|
| `bgStartColor` | Üst BG | `#f8fafc` |
| `bgEndColor` | Alt BG | `#eff6ff` |
| `headerTextColor` | Header Yazı | `#1a2b4a` |
| `accentColor` | Vurgu | `#1a2b4a` |

**Her renk için**: color picker (w-7 h-7) + hex input

### 11.5 Form Alanları

#### Standart Alanlar (3 adet)

| Alan | Varsayılan | Seçenekler |
|------|------------|------------|
| Misafir Adı | Opsiyonel | Zorunlu/Opsiyonel/Kapalı |
| Oda No | Opsiyonel | Zorunlu/Opsiyonel/Kapalı |
| Telefon | Opsiyonel | Zorunlu/Opsiyonel/Kapalı |

#### Özel Alanlar

| Özellik | Detay |
|---------|-------|
| Ekle | `[+] Özel Alan Ekle` butonu |
| Her alan | Label input + Placeholder input + Mode select + 🗑️ sil |
| Type | text / tel / textarea (henüz UI'da yok, backend destekliyor) |
| Kaydet | JSON.stringify ile settings API'ya |

### 11.6 Buton Ayarları

| Ayar | Tip | Varsayılan |
|------|-----|------------|
| Metin | Input | "Shuttle Çağır" |
| Renk | Color picker | `#1a2b4a` |
| Şekil | Select | Yuvarlak / Tam Yuvarlak |

### 11.7 Footer Ayarları

| Ayar | Tip | Varsayılan |
|------|-----|------------|
| Metin | Input | "Shuttle Call System © 2025" |
| BG Rengi | Color picker | `#1a2b4a` |
| Yazı Rengi | Color picker | `#ffffff` |

### 11.8 Durum Sayfası Ayarları

| Sürücü & Araç | Switch | Varsayılan |
|---------------|--------|------------|
| Sürücü adını göster | Switch | true |
| Sürücü konumunu göster | Switch | true |
| Araç kodunu göster | Switch | true |

### 11.9 Mobil Önizleme

- **Telefon mockup**: `w-[340px]`, border-4, rounded-[40px]
- **Status bar**: `h-8 bg-slate-900` — 9:41 + sinyal
- **Canlı ön izleme**: `useDeferredValue` + `useMemo` ile
- **İki tab**: Çağrı sayfası önizleme + Durum sayfası önizleme

### 11.10 Aksiyonlar

| Buton | Davranış |
|-------|----------|
| 💾 Kaydet | PUT `/api/admin/settings` (guest_page_config) |
| ↩ Sıfırla | `defaultGuestPageConfig` yükle |

### 11.11 Edge Case'ler

| Durum | Davranış |
|-------|----------|
| Eski config yok | Backward compat: `guest_fields_name/room/phone` |
| Logo çok büyük | Toast "max 500KB", yükleme engellenir |
| Yanlış format | Toast "sadece PNG, JPG, WebP" |

---

## 1️⃣2️⃣ SÜRÜCÜ PANELİ (Driver Dashboard) `/driver/dashboard`

### 12.1 Sayfa Düzeni

```
┌──────────────────────────────────────────────────────┐
│  Sürücü Paneli          [📍 Havuz Bar (değiştir)]   │
├──────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐   │
│  │ 🟢 MÜSAİT  🚗 B1  📍 Lobi                   │   │
│  │                                  [📱Açık]    │   │
│  │                                  [⏻ Servis Dışı]│ │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌─── AKTİF GÖREV VARSA ─────────────────────────┐  │
│  │ 🔔 Aktif Görev #12                             │  │
│  │ 📍 Alınacak: Lobi                              │  │
│  │ 👤 Misafir: Ahmet Yılmaz                       │  │
│  │ 🚪 Oda: 101                                    │  │
│  │ 📞 Telefon: +90 555 000 00 00                  │  │
│  │ 📝 Not: Acil                                   │  │
│  │                                                 │  │
│  │ [✅ Görev Tamamlandı] [❌ İptal]                │  │
│  └─────────────────────────────────────────────────┘  │
│                                                      │
│  BEKLEYEN TALEPLER (N)                               │
│  ┌──────────────────────────────────────────────┐   │
│  │ 📍 Lobi          🟡 BEKLEMEDE               │   │
│  │ 🕐 14:30                                      │   │
│  │ 👤 Ahmet · 🚪 101                            │   │
│  │ [✅ Kabul Et]                                 │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │ 📍 Havuz         🟡 BEKLEMEDE               │   │
│  │ 🕐 14:29                                      │   │
│  │ 👤 Ayşe · 🚪 205                             │   │
│  │ [✅ Kabul Et]                                 │   │
│  └──────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

### 12.2 Üst Bar

| Eleman | Açıklama |
|--------|----------|
| Logo | `/images/logo.png` — h-7 |
| Başlık | "ShuttleCall" bold |
| İsim | Sürücü fullName (truncate) |
| Çıkış | Kırmızı LogOut butonu |

### 12.3 Konum Seçim Dialog (ilk giriş)

| Özellik | Değer |
|---------|-------|
| **Ne zaman** | `localStorage`'da kayıtlı konum yoksa |
| **Başlık** | "Konum Seçin" |
| **Açıklama** | "Şu anda hangi konumdasınız?" |
| **Select** | Tüm lokasyonlar (logo + isim) |
| **Buton** | "Onayla" |
| **Sonuç** | POST `/api/driver/location` + localStorage + toast |

### 12.4 Sürücü Durum Kartı

| Bölüm | Durum |
|-------|-------|
| Badge | `ON_DUTY` → 🟢 MÜSAİT (bg-emerald-600) |
| | `OFF_DUTY` → 🟠 SERVİS DIŞI (text-amber-600) |
| Araç | `{icon} {code}` |
| Konum | 📍 `{currentLocation.name}` |
| Bildirim butonu | 📱 Açık (green) / Kapalı (outline) |
| Servis butonu | MÜSAİT → [⏻ Servis Dışı], SERVİS DIŞI → [⏻ Müsait Yap] |
| Kart border | ON_DUTY → `border-emerald-500/50`, OFF_DUTY → `border-amber-500/50` |

### 12.5 Aktif Görev Kartı (varsa)

| Alan | Değer |
|------|-------|
| Başlık | 🔔 Aktif Görev #{id} |
| Konum | 📍 Alınacak: {location.name} |
| Misafir | 👤 {guestName} |
| Oda | 🚪 {roomNumber} |
| Telefon | 📞 {phone} |
| Not | 📝 {notes} |
| Buton 1 | [✅ Görev Tamamlandı] → Bırakma konumu dialog'u |
| Buton 2 | [❌ İptal] → POST `/api/requests/:id/cancel` |
| Kart border | `border-primary/50` |

### 12.6 Bırakma Konumu Dialog

| Özellik | Değer |
|---------|-------|
| **Ne zaman** | "Görev Tamamlandı" butonuna basılınca |
| **Başlık** | "Bırakma Konumu" |
| **Açıklama** | "Misafiri hangi konuma bıraktınız?" |
| **Select** | Tüm lokasyonlar |
| **Butonlar** | [İptal] [✅ Tamamla] |

### 12.7 Bekleyen Talepler Listesi

| Bölüm | Detay |
|-------|-------|
| **Başlık** | "Bekleyen Talepler (N)" — text-muted-foreground |
| **Her kart** | Konum (logo + isim), saat, misafir, oda, not |
| **Badge** | 🟡 BEKLEMEDE |
| **Buton** | [✅ Kabul Et] — `w-full` |
| **Kabul disabled** | `OFF_DUTY` ise disabled + tooltip "Servis dışı.." |
| **Empty** | EmptyState "Bekleyen talep yok" |

### 12.8 Gerçek Zamanlı Güncellemeler

| Kaynak | Interval |
|--------|----------|
| Polling | `GET /api/requests/active` — her 3 saniye |
| SSE | `/api/sse/driver` — yeni talep gelince anlık bildirim sesi + refresh |
| Heartbeat | POST `/api/driver/heartbeat` — her 30 saniye |
| GPS tracking | `watchPosition` — aktif görev sırasında (30 sn aralıklarla) |

### 12.9 Push Bildirim Aboneliği

| Adım | İşlem |
|------|-------|
| 1 | Service Worker ready kontrol |
| 2 | `pushManager.subscribe({userVisibleOnly, applicationServerKey})` |
| 3 | POST `/api/user/fcm-token` |
| 4 | State güncelleme `subscribed: true` |

### 12.10 Heartbeat Sistemi

| Durum | Detay |
|-------|-------|
| **Idle** | Her 30 sn'de `POST /api/driver/heartbeat` (sadece driverStatus) |
| **GPS aktif** | `navigator.geolocation.watchPosition` — enableHighAccuracy, maxAge 15sn, timeout 10sn |
| **GPS başlama** | `gpsTracking = true` — talep kabul edilince |
| **GPS durma** | `gpsTracking = false` — talep tamamlanınca |
| **Worker timeout** | 5 dk heartbeatsız sürücüler → OFF_DUTY |

### 12.11 State Diyagramı

```
┌─────────────┐     Konum Seç      ┌───────────────┐
│ İlk Giriş   │ ────────────────→  │ Location Seç  │
│ (no saved)  │                    │   Dialog      │
└─────────────┘                    └──────┬────────┘
                                          │ Onayla
                                          ↓
                                   ┌──────────────┐
                                   │  ON_DUTY     │
                                   │  Beklemede   │◄──────────────┐
                                   └──────┬───────┘               │
                            Talep Kabul  │                       │
                                          ↓                       │
                                   ┌──────────────┐               │
                                   │  ACCEPTED    │               │
                                   │  GPS START   │               │
                                   └──────┬───────┘               │
                          Görev Tamamla  │                       │
                                          ↓                       │
                                   ┌──────────────┐               │
                                   │  COMPLETED   │───────────────┘
                                   │  GPS STOP    │  (yeni bekleme)
                                   └──────────────┘
                                          │
                                   ┌──────────────┐
                                   │  OFF_DUTY    │ ← heartbeat timeout / manuel
                                   │  (bildirim    │
                                   │   alamaz)     │
                                   └──────────────┘
```

### 12.12 Edge Case'ler

| Durum | Davranış |
|-------|----------|
| **Hiç lokasyon yok** | Select "Konum yüklenemedi" |
| **Servis dışıyken yeni talep** | Görebilir ama kabul edemez (buton disabled) |
| **GPS reddedildi** | Heartbeat sadece IDLE modda çalışır |
| **Push bildirim reddi** | Toast "Bildirim izni alınamadı" |
| **Birden fazla talebi kabul** | Backend lock ile korur (409 çakışma) |
| **Bağlantı koptu** | Polling devam eder, SSE yeniden bağlanır |
| **Aktif görev varken yeni talep** | Bekleyen listede görünür, kabul edilemez (zaten aktif) |
| **Worker otomatik OFF_DUTY** | Sürücü uyarı almaz, kendisi fark edip ON_DUTY yapmalı |

---

## 1️⃣3️⃣ ORTAK BİLEŞENLER

### Loading Bileşeni
- **Tam sayfa**: `<Loading fullPage />` — merkezde dönen spinner
- **Inline**: `<Loading size={16} />` — buton içinde
- **Suspense fallback**: Admin layout'da `children` sarar

### EmptyState Bileşeni
```
┌─────────────────────┐
│      🚗             │
│   Araç yok          │
│  İlk aracınızı      │
│    ekleyin          │
└─────────────────────┘
```
- **Props**: `icon`, `title`, `description`

### Toast Bildirimleri (sonner)
- **Konum**: `<Toaster />` — Providers içinde
- **Kullanım**: `toast.success("mesaj")`, `toast.error("mesaj")`
- **Tema**: Otomatik (dark/light)

### Badge Bileşeni
- **Variant'lar**: `default` (yeşil), `secondary` (gri), `destructive` (kırmızı), `outline` (ince kenar)
- **Boyut**: `text-xs`

### Dialog Bileşeni
- **Maks genişlik**: `sm:max-w-md`, `sm:max-w-sm`, `sm:max-w-lg`
- **Header**: `DialogHeader` + `DialogTitle`
- **Close**: `onOpenChange` ile

---

## 1️⃣4️⃣ API REFERANSI (UI ile İlgili Olanlar)

### Admin API'leri

| Endpoint | Method | UI Kullanımı |
|----------|--------|-------------|
| `/api/reports/summary?dateFrom=&dateTo=` | GET | Dashboard + Reports |
| `/api/reports/performance?dateFrom=&dateTo=` | GET | Reports |
| `/api/requests/active` | GET | Dashboard, Driver |
| `/api/requests?status=&page=&pageSize=` | GET | Admin (gelecek) |
| `/api/buggies?isActive=&search=&status=` | GET | Dashboard, Buggies |
| `/api/buggies/:id/status` | PATCH | Buggies toggle |
| `/api/buggies/:id/drivers` | GET/POST/DELETE | Buggies |
| `/api/locations?search=&isActive=` | GET | Locations, Driver |
| `/api/locations/:id/logo` | POST/DELETE | Locations |
| `/api/locations/:id/qr` | POST/DELETE | Locations |
| `/api/admin/users?role=` | GET | Users |
| `/api/admin/users/:id` | GET/PUT | Users |
| `/api/admin/settings` | GET/PUT | Settings, Guest-design, Monitor |
| `/api/admin/settings/map` | POST/DELETE | Locations |
| `/api/admin/simulate` | GET/POST | Simulate |
| `/api/audit?pageSize=` | GET | Audit |
| `/api/requests/:id/accept` | POST | Driver |
| `/api/requests/:id/complete` | POST | Driver |
| `/api/requests/:id/cancel` | POST | Driver |
| `/api/driver/status` | PATCH | Driver |
| `/api/driver/location` | GET/POST | Driver |
| `/api/driver/heartbeat` | POST | Driver |
| `/api/sse/admin` | GET | Dashboard, Monitor |
| `/api/sse/driver` | GET | Driver |
| `/api/user/fcm-token` | POST | Driver push subscription |
| `/api/admin/reset` | POST | Settings |

---

## 1️⃣5️⃣ ANİMASYON & GEÇİŞLER

| Animasyon | Kullanım | Parametreler |
|-----------|----------|-------------|
| `fadeInDown` | Guest call sayfası header | 0.6s ease-out |
| `fadeInUp` | Guest call form, bildirimler | 0.6s / 0.3s ease-out |
| `pulseDot` | PENDING çağrı ikonu | 2s ease-in-out infinite |
| `ripple` | Guest çağrı butonu | 0.6s ease-out |
| CSS transition | Admin nav link, butonlar | 200ms ease-out |
| `hover:-translate-y-0.5` | Buton hover efekti | 200ms duration |

---

## 1️⃣6️⃣ RESPONSIVE BREAKPOINT ÖZETİ

| Bileşen | Mobil (<768px) | Tablet (768-1023) | Desktop (≥1024) |
|---------|---------------|-------------------|-----------------|
| Sidebar | Sheet (slide) | Sheet (slide) | w-60 fixed |
| Dashboard grid | 1 sütun | 2/3 + 1/3 | 2/3 + 1/3 |
| Metrik grid | 2 sütun | 2 sütun | 4 sütun |
| Monitor layout | Tek sütun | Tek sütun | Harita + Yan panel |
| Reports charts | Tek sütun | 2 sütun | 3 sütun |
| Simülasyon kartlar | 1 sütun | 2 sütun | 3 sütun |
| Guest design | Tek sütun | Tek sütun | 2/3 + 1/3 |
| Sürücü butonlar | `w-full` | `w-full` | `flex-none` |
| Admin tablolar | Yatay scroll | Normal | Normal |

---

## 1️⃣7️⃣ TASARIM NOTLARI

### Genel Prensipler
1. **Koyu navy (#1a2b4a) ana renk** — profesyonel otel hissi
2. **Durum renkleri** evrensel anlamlı: yeşil=müsait, kırmızı=tehlike, amber=bekleme
3. **Kartlar** gölgesiz, `bg-card`, `border-border` ile hafif ayırım
4. **Tablolar** `p-0` kart içinde, `TableHeader` gri, `TableRow` hover
5. **Tüm formlar** `space-y-4` ile düzenli aralık
6. **Butonlar** `gap-2` ile ikon+metin
7. **Loading state** tüm sayfalarda `fullPage` veya inline spinner
8. **Empty state** liste sayfalarında açıklayıcı mesaj + ikon
9. **Error state** sonner toast ile kullanıcıya bildirim
10. **Safe area** `env(safe-area-inset-top/bottom)` ile notch/cihaz çentiği

### Özel İkon Kullanımları
| İkon | Kullanım |
|------|----------|
| `lucide-react` | Tüm UI ikonları (Bell, Car, MapPin, vb.) |
| Emoji (🚗, 🚎) | Araç ikonları (admin tanımlar) |
| Flag emoji | Dil seçici (🇹🇷 🇬🇧 🇩🇪 🇷🇺 🇸🇦 🇪🇸) |

### Renk Körü Dostu Tasarım
- Durum badge'lerinde renk + etiket (sadece renk değil)
- Grafiklerde Legend + renk

---

## 1️⃣8️⃣ ÖZET: STATE MATRİSİ

| Sayfa | Loading | Empty | Error | Normal | Edge |
|-------|---------|-------|-------|--------|------|
| Dashboard | ✅ fullPage | ✅ empty mesajlar | ❌ API hatası → stale data | ✅ Grid | — |
| Monitor | ✅ fullPage | ✅ harita boş | ❌ SSE kopması → polling | ✅ 3D harita | ✅ monitor kapalı |
| Buggies | ✅ fullPage | ✅ EmptyState | ✅ toast hata | ✅ Tablo | ✅ soft delete |
| Locations | ✅ fullPage | ✅ EmptyState | ✅ toast hata | ✅ Tablo + wizard | ✅ harita yok |
| Users | ✅ fullPage | ✅ EmptyState | ✅ toast hata | ✅ Tablo | ✅ hash copy |
| Reports | ✅ summaryLoading | ✅ "veri yok" | ❌ sessiz hata | ✅ Grafikler | ✅ filtre |
| Audit | ✅ fullPage | ✅ EmptyState | ❌ sessiz hata | ✅ Tablo | — |
| Simulate | ✅ fullPage | ✅ boş lokasyon | ✅ toast hata | ✅ Grid | ✅ demo kapalı |
| Settings | ✅ fullPage | — | ✅ toast hata | ✅ Kartlar | ✅ reset confirm |
| Guest Design | ✅ fullPage | — | ✅ toast hata | ✅ Tabs + preview | ✅ eski config |
| Driver | ✅ fullPage | ✅ empty talep | ✅ toast hata | ✅ Kartlar | ✅ konum seçimi |
