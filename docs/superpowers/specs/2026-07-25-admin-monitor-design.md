# Admin Canlı Monitor Sayfası — Tasarım Spec'i

**Tarih:** 2026-07-25
**Durum:** Onaylandı (kullanıcı onayı alındı)
**Hedef rota:** `/admin/monitor`

## 1. Amaç

Admin paneline, otel haritası (SVG diorama) üzerinde:

- Buggy'lerin **son kaydedilen konumlarını** (durak bazlı) durum renkleriyle,
- **Bekleyen (PENDING)** çağrıları çağrının geldiği durakta yanıp sönen marker ile,
- **Kabul edilmiş (ACCEPTED)** çağrıları farklı renkte marker ile

gerçek zamanlı (SSE) gösteren bir "Canlı Monitor" sayfası eklemek.

## 2. Kapsam

### Dahil

- `/admin/monitor` sayfası (harita + sağ panel düzeni, tam ekran moduna geçiş butonu ile)
- `aas.html`'deki SVG diorama haritanın React bileşenine taşınması (`MonitorMap`)
- `Location` tablosuna `map_x` / `map_y` kolonları + admin Konumlar sayfasında haritadan nokta seçme UI'ı
- `GET /api/monitor/state` — ilk yükleme verisi (locations + buggies + aktif requests)
- `GET /api/sse/admin` — admin için SSE kanalı (`hotel:{id}` event bus kanalına abone)
- `POST /api/driver/location` ve buggy status güncellemelerine `buggy_location` / `buggy_status` SSE eventleri eklenmesi
- Yeni PENDING çağrıda sesli bildirim (`playNotificationSound` mevcut)
- Mevcut 12 durağın koordinatlarının seed script ile doldurulması (kaynak: `D:\ETHNO\aas.html` STOPS dizisi)

### Kapsam dışı (YAGNI)

- GPS tabanlı takip, geçmiş rota izi (trail)
- Haritada zoom/pan
- Admin ekranından çağrı atama / müdahale
- `aas.html`'deki tur animasyonu, istatistik sayaçları, gece/gündüz teması

## 3. Mimari

```
┌─ /admin/monitor (client component) ─────────────────────────┐
│  ┌──────────────────────────────┐  ┌─────────────────────┐  │
│  │  <MonitorMap> (SVG diorama)  │  │  Sağ Panel          │  │
│  │  · zemin + rota + duraklar   │  │  · Bekleyen çağrılar│  │
│  │  · buggy marker'ları         │  │  · Kabul edilenler  │  │
│  │  · çağrı marker'ları (pulse) │  │  · Buggy durum list.│  │
│  └──────────────────────────────┘  └─────────────────────┘  │
│  Üst bar: sayaçlar + [Tam Ekran] [Ses aç/kapat]             │
└──────────────────────────────────────────────────────────────┘
        ▲ ilk yükleme: GET /api/monitor/state
        ▲ canlı güncelleme: GET /api/sse/admin (SSE, hotel:{id} kanalı)
```

**Realtime kararı:** SSE. Event bus altyapısı (`src/lib/event-bus.ts`) ve sürücü SSE kalıbı (`/api/sse/driver`) zaten mevcut; polling kullanılmaz.

## 4. Bileşenler

### 4.1 `src/components/monitor/monitor-map.tsx`

- `D:\ETHNO\aas.html`'deki SVG (viewBox `0 0 1200 820`) React/SVG JSX'e taşınır: zemin (`buildGround`), rota çizgisi (soluk, bağlam için), durak pinleri.
- Durak pinleri DB konumlarından üretilir: `mapX/mapY` dolu olanlar haritada çizilir; boş olanlar çizilmez (panelde uyarı).
- **Buggy katmanı:** her buggy `currentLocationId → location.mapX/mapY` noktasında gösterilir.
  - Renk: `AVAILABLE` = yeşil, `BUSY` = turuncu, `OFFLINE` = gri/soluk, `MAINTENANCE` = anahtar ikonlu gri.
  - Marker üzerinde buggy kodu (`B1`, `B2`...).
  - Aynı durakta birden fazla buggy → yatay küçük dizi (offset) + sayı rozeti.
- **Çağrı katmanı:**
  - `PENDING` → durak üstünde kırmızı pulse (CSS animasyon) + zil ikonu.
  - `ACCEPTED` → mavi sabit marker + kabul eden buggy'ye ince kesikli çizgi.
  - Hover/tap tooltip: misafir adı, oda no, bekleme süresi.

### 4.2 `src/app/(admin)/admin/monitor/page.tsx`

- Client component; `useMonitorState` hook'u ile state yönetimi.
- İlk yükleme: `GET /api/monitor/state` → `locations`, `buggies`, `requests` (PENDING + ACCEPTED).
- SSE: `new EventSource("/api/sse/admin")`; event → yerel state güncellemesi:
  - `new_request` → requests'e ekle + ses çal + haritada pulse marker.
  - `request_accepted` → PENDING → ACCEPTED taşı, buggy'yi BUSY yap.
  - `request_completed` / `request_cancelled` → requests'ten çıkar, buggy'yi AVAILABLE yap.
  - `buggy_location` → buggy'nin konumunu güncelle.
  - `buggy_status` → buggy'nin durumunu güncelle.
- Sağ panel kartları:
  - **Bekleyen çağrılar:** misafir, oda, durak adı, canlı bekleme süresi; kırmızı vurgu.
  - **Kabul edilenler:** buggy/sürücü, kabul süresi.
  - **Buggy'ler:** kod, sürücü, durum rozeti, son konum adı.
  - Liste öğesine tıklama → haritada ilgili marker `selected` (büyüyüp parlar).
- Üst bar: bekleyen sayısı, aktif buggy sayısı, [Tam Ekran] ve [Ses aç/kapat] butonları.
- **Tam ekran modu:** sağ panel gizlenir, harita tüm alanı kaplar; ESC ile çıkış.

### 4.3 Navigasyon

- `src/components/admin-nav.tsx` navItems'e `{ href: "/admin/monitor", label: "Canlı Harita", icon: Monitor }` eklenir (Panel'den sonra).

## 5. API

### 5.1 `GET /api/monitor/state` (yeni)

Admin auth (`withAuth`). Yanıt:

```json
{
  "locations": [{ "id": 1, "name": "Aquapark", "mapX": 150, "mapY": 362 }],
  "buggies": [{
    "id": 1, "code": "B1", "icon": "🚙", "status": "AVAILABLE",
    "currentLocationId": 4,
    "drivers": [{ "fullName": "Ahmet Yılmaz" }]
  }],
  "requests": [{
    "id": 42, "status": "PENDING", "guestName": "Misafir", "roomNumber": "1204",
    "requestedAt": "2026-07-25T12:00:00Z", "locationId": 4, "buggyId": null
  }]
}
```

`requests`: `status IN (PENDING, ACCEPTED)`, `hotelId = ctx.user.hotelId`.

### 5.2 `GET /api/sse/admin` (yeni)

`src/app/api/sse/driver/route.ts` ile aynı kalıp; `hotel:{hotelId}` kanalına abone olur (sürücüye özel `driver:{id}` kanalına gerek yok). Heartbeat 30 sn, abort'ta cleanup.

### 5.3 Event eklentileri

- `POST /api/driver/location` → başarılı güncellemede `publishSSE("hotel:{hotelId}", { type: "buggy_location", buggyId, locationId })`.
- Buggy status değiştiren noktalar (`/api/buggies/[id]/status`, request accept/complete akışı) → `{ type: "buggy_status", buggyId, status }` yayınlanır. (Request accept/complete eventleri zaten var; buggy status bunlardan türetilebilir ama manuel status değişimi için bu event gerekli.)

## 6. Veritabanı değişikliği

- Migrasyon: `locations` tablosuna `map_x INTEGER NULL`, `map_y INTEGER NULL`.
- Prisma schema: `mapX Int? @map("map_x")`, `mapY Int? @map("map_y")`.
- Seed: mevcut 12 durağa isim eşleşmesiyle `aas.html` STOPS koordinatları yazılır:

| # | Konum | mapX | mapY |
|---|-------|------|------|
| 1 | Casita by Ethno | 640 | 118 |
| 2 | Forest Villas | 168 | 138 |
| 3 | Ethno Villas | 212 | 268 |
| 4 | Aquapark | 150 | 362 |
| 5 | Casita Beach Club | 140 | 500 |
| 6 | Javara Beach Club | 352 | 500 |
| 7 | Mangiare Snack Restaurant | 442 | 400 |
| 8 | Ethnosphere Event House | 552 | 420 |
| 9 | Night Club | 516 | 500 |
| 10 | Beach Volleyball | 662 | 500 |
| 11 | Lumière Cabaret Restaurant | 632 | 300 |
| 12 | Tennis Court | 786 | 300 |

## 7. Admin Konumlar sayfası eklentisi

- Konum düzenleme formuna küçük harita önizlemesi (`LocationMapPicker` bileşeni): SVG harita gösterilir, admin tıkladığı nokta `mapX/mapY` olarak forma yazılır; mevcut nokta varsa pin gösterilir.
- Konum listesinde `mapX/mapY` boşsa "haritada yok" rozeti.

## 8. Hata / kenar durumları

- SSE bağlantısı koparsa: üstte "bağlantı yok" göstergesi; EventSource otomatik reconnect, reconnect'te `GET /api/monitor/state` yeniden çağrılır; ek olarak 10 sn'de bir hafif fallback polling (sadece bağlantı kopukken).
- `currentLocationId` null olan buggy: haritada çizilmez; sağ panelde "konum bilinmiyor" bölmesinde listelenir.
- `mapX/mapY` null olan konumdan çağrı gelirse: listede görünür + panelde "haritada konumlanmadı" uyarı ikonu; haritada marker çizilmez.
- Çoklu buggy aynı durakta: yatay offset dizi + sayı rozeti.

## 9. Test planı

- **Service/unit:** monitor state aggregation (locations+buggies+requests join, yalnız PENDING+ACCEPTED filtrelemesi).
- **API:** `/api/monitor/state` auth zorunluluğu + yanıt şekli; `/api/sse/admin` auth.
- **Component (vitest + testing-library):**
  - Durum → marker rengi eşleşmesi (AVAILABLE/BUSY/OFFLINE/MAINTENANCE).
  - Aynı durakta çoklu buggy render.
  - SSE event handler: `new_request` → state'e eklenir; `request_accepted` → status geçişi.
  - `mapX/mapY` null konumun haritada çizilmemesi.
- Mevcut test altyapısı: `vitest`, `vitest.frontend.config.ts`, `tests/` klasörü.

## 10. Dosya listesi (öngörülen)

| Dosya | İşlem |
|---|---|
| `prisma/schema.prisma` | `mapX`, `mapY` alanları |
| `prisma/migrations/…` | yeni migrasyon |
| `prisma/seed.ts` | 12 durak koordinat seed'i |
| `src/app/(admin)/admin/monitor/page.tsx` | yeni sayfa |
| `src/components/monitor/monitor-map.tsx` | SVG harita bileşeni |
| `src/components/monitor/monitor-panel.tsx` | sağ panel |
| `src/components/monitor/location-map-picker.tsx` | konum seçici |
| `src/hooks/use-monitor-state.ts` | state + SSE hook'u |
| `src/app/api/monitor/state/route.ts` | yeni endpoint |
| `src/app/api/sse/admin/route.ts` | yeni SSE endpoint |
| `src/app/api/driver/location/route.ts` | `buggy_location` eventi |
| `src/app/api/buggies/[id]/status/route.ts` | `buggy_status` eventi |
| `src/app/(admin)/admin/locations/…` | picker entegrasyonu |
| `src/components/admin-nav.tsx` | nav öğesi |
| `tests/…` | unit + component testleri |
