# Admin Canlı Monitor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin paneline `/admin/monitor` sayfası eklemek — SVG diorama harita üzerinde buggy'lerin son konumlarını durum renkleriyle, PENDING/ACCEPTED çağrıları çağrının geldiği durakta canlı (SSE) marker'larla göstermek.

**Architecture:** Next.js 16 App Router + Prisma/PostgreSQL. İlk yükleme `GET /api/monitor/state`, canlı güncelleme `GET /api/sse/admin` (mevcut in-memory event bus, `hotel:{id}` kanalı). Harita, `D:\ETHNO\aas.html`'deki SVG dioramadan taşınan statik zemin + React JSX dinamik katmanlar (pinler, buggy'ler, çağrılar). Konum→harita bağı `locations.map_x/map_y` kolonlarıyla DB'de tutulur.

**Tech Stack:** Next.js 16, React 19, Prisma 7, PostgreSQL, zod, vitest + testing-library, SSE (EventSource), Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-07-25-admin-monitor-design.md`

**Önemli bağlam notları (executor için):**
- Repo: `D:\ETHNO\shuttlecall` — tüm yollar buna göreli.
- Kaynak harita: `D:\ETHNO\aas.html` (Task 9'da buradan fonksiyon kopyalanacak).
- API kalıbı: `apiSuccess(data)` / `apiError(msg, status, code)` (`src/lib/api-response.ts`), route'lar `toRouteHandler(withAuth(async (req, ctx) => ...))` (`src/lib/middleware.ts`), `ctx.user!.hotelId`.
- SSE yayını: `publishSSE(channel, obj)` (`src/lib/event-bus.ts`).
- Service testleri **gerçek test DB** kullanır (`tests/setup.ts` → `createTestHotel`, `cleanupTestHotel`); vitest node config sadece `*.test.ts`, frontend config sadece `*.test.tsx` çalıştırır.
- Test komutları: node testleri `pnpm vitest run --config vitest.config.ts tests/<dosya>.test.ts`, frontend testleri `pnpm vitest run --config vitest.frontend.config.ts tests/<dosya>.test.tsx`.
- Commit'lerde sadece ilgili dosyaları stage'le (repo'da önceden kirli dosyalar var: `pnpm-lock.yaml`, `prisma/seed.ts`, silinmiş görseller — onlara dokunma).

---

### Task 1: Prisma schema + migrasyon (map_x / map_y)

**Files:**
- Modify: `prisma/schema.prisma` (Location modeli, ~satır 100-130)

- [ ] **Step 1: Location modeline alanları ekle**

`prisma/schema.prisma` içinde `model Location` bloğunda `longitude` satırından sonra ekle:

```prisma
  mapX         Int?      @map("map_x")
  mapY         Int?      @map("map_y")
```

- [ ] **Step 2: Migrasyon oluştur ve uygula**

Run: `cd D:\ETHNO\shuttlecall && npx prisma migrate dev --name add_location_map_coords`
Expected: migrasyon dosyası oluşur (`prisma/migrations/<ts>_add_location_map_coords/migration.sql`), içinde `ALTER TABLE "locations" ADD COLUMN "map_x" INTEGER, ADD COLUMN "map_y" INTEGER;` benzeri SQL; client yeniden üretilir, hata yok.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: locations tablosuna map_x/map_y kolonlari"
```

---

### Task 2: Zod schema + LocationService mapX/mapY desteği

**Files:**
- Modify: `src/schemas/location.ts`
- Modify: `src/services/location-service.ts` (create + update fonksiyonları)
- Test: `tests/schemas.test.ts` (mevcut dosyaya ekle)

- [ ] **Step 1: Failing test yaz** — `tests/schemas.test.ts` sonuna ekle:

```ts
describe("location map coordinates", () => {
  it("createLocationSchema accepts mapX/mapY", () => {
    const r = createLocationSchema.safeParse({ name: "Aquapark", mapX: 150, mapY: 362 });
    expect(r.success).toBe(true);
    if (r.success) { expect(r.data.mapX).toBe(150); expect(r.data.mapY).toBe(362); }
  });

  it("createLocationSchema rejects out-of-viewbox coordinates", () => {
    expect(createLocationSchema.safeParse({ name: "X", mapX: -1 }).success).toBe(false);
    expect(createLocationSchema.safeParse({ name: "X", mapY: 821 }).success).toBe(false);
  });

  it("updateLocationSchema accepts nullable mapX/mapY (konum haritadan kaldırma)", () => {
    const r = updateLocationSchema.safeParse({ mapX: null, mapY: null });
    expect(r.success).toBe(true);
  });
});
```

Dosyanın başındaki import'a `createLocationSchema, updateLocationSchema` ekle (zaten başka location schema importları varsa genişlet).

- [ ] **Step 2: Testin fail ettiğini doğrula**

Run: `pnpm vitest run --config vitest.config.ts tests/schemas.test.ts`
Expected: FAIL — `mapX` alanı tanınmıyor (strict olmayan zod object'ler unknown key'leri söyler; `r.data.mapX` undefined olur → ilk test fail).

- [ ] **Step 3: Implementasyon** — `src/schemas/location.ts`:

`createLocationSchema`'a ekle (`longitude` satırından sonra):

```ts
  mapX: z.number().int().min(0).max(1200).optional(),
  mapY: z.number().int().min(0).max(820).optional(),
```

`updateLocationSchema`'ya ekle:

```ts
  mapX: z.number().int().min(0).max(1200).nullable().optional(),
  mapY: z.number().int().min(0).max(820).nullable().optional(),
```

`src/services/location-service.ts`:
- `create(...)` fonksiyonunun `data` parametre tipine `mapX?: number; mapY?: number;` ekle ve `prisma.location.create({ data: { ... } })` içine `mapX: data.mapX, mapY: data.mapY,` ekle.
- `update(...)` fonksiyonunda (mevcut yapıyı koru): güncelleme datasına `mapX`/`mapY` alanlarını geçir — mevcut kod hangi alanları geçiriyorsa (name, description vb.) aynı kalıpla `...(data.mapX !== undefined && { mapX: data.mapX }), ...(data.mapY !== undefined && { mapY: data.mapY }),` ekle. (Dosyadaki mevcut spread kalıbını birebir taklit et.)

- [ ] **Step 4: Testler geçiyor**

Run: `pnpm vitest run --config vitest.config.ts tests/schemas.test.ts`
Expected: PASS (tümü).

- [ ] **Step 5: Commit**

```bash
git add src/schemas/location.ts src/services/location-service.ts tests/schemas.test.ts
git commit -m "feat: location create/update mapX/mapY destegi"
```

---

### Task 3: MonitorService.getState + entegrasyon testi

**Files:**
- Create: `src/services/monitor-service.ts`
- Test: `tests/monitor-service.test.ts`

- [ ] **Step 1: Failing test yaz** — `tests/monitor-service.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, createTestHotel, cleanupTestHotel } from "./setup";
import { MonitorService } from "@/services/monitor-service";

describe("MonitorService.getState", () => {
  let hotel: Awaited<ReturnType<typeof createTestHotel>>;
  let locMapped: { id: number };
  let locUnmapped: { id: number };

  beforeAll(async () => {
    hotel = await createTestHotel();
    locMapped = await prisma.location.create({
      data: { hotelId: hotel.hotel.id, name: "Aquapark", mapX: 150, mapY: 362, isActive: true },
    });
    locUnmapped = await prisma.location.create({
      data: { hotelId: hotel.hotel.id, name: "Spa", isActive: true },
    });
    const buggy = await prisma.buggy.create({
      data: { hotelId: hotel.hotel.id, code: "BG-T1", status: "AVAILABLE", currentLocationId: locMapped.id, isActive: true },
    });
    await prisma.buggyDriver.create({
      data: { buggyId: buggy.id, driverId: hotel.driver.id, isActive: true, isPrimary: true },
    });
    await prisma.buggyRequest.create({
      data: { hotelId: hotel.hotel.id, locationId: locMapped.id, status: "PENDING", guestName: "Test Misafir", roomNumber: "101" },
    });
    await prisma.buggyRequest.create({
      data: { hotelId: hotel.hotel.id, locationId: locMapped.id, status: "COMPLETED", guestName: "Eski" },
    });
  });

  afterAll(async () => { await cleanupTestHotel(hotel.hotel.id); });

  it("returns locations with map coords (null when unset), buggies with drivers, only PENDING+ACCEPTED requests", async () => {
    const state = await MonitorService.getState(hotel.hotel.id);

    const aq = state.locations.find((l) => l.name === "Aquapark");
    expect(aq).toMatchObject({ mapX: 150, mapY: 362 });
    const spa = state.locations.find((l) => l.name === "Spa");
    expect(spa).toBeDefined();
    expect(spa!.mapX).toBeNull();

    expect(state.buggies).toHaveLength(1);
    expect(state.buggies[0]).toMatchObject({ code: "BG-T1", status: "AVAILABLE", currentLocationId: locMapped.id });
    expect(state.buggies[0].drivers[0]).toMatchObject({ id: hotel.driver.id });

    expect(state.requests).toHaveLength(1);
    expect(state.requests[0]).toMatchObject({ status: "PENDING", guestName: "Test Misafir" });
  });
});
```

Not: `createTestHotel` helper'ının döndürdüğü yapıyı (`hotel.hotel.id`, `hotel.driver.id`) `tests/services.test.ts`'teki kullanımla birebir aynı tut. Helper farklı alan adları döndürüyorsa testleri ona uyarla.

- [ ] **Step 2: Fail doğrula**

Run: `pnpm vitest run --config vitest.config.ts tests/monitor-service.test.ts`
Expected: FAIL — `MonitorService` bulunamadı (import error).

- [ ] **Step 3: Implementasyon** — `src/services/monitor-service.ts`:

```ts
import { prisma } from "@/lib/db";

export const MonitorService = {
  async getState(hotelId: number) {
    const [locations, buggies, requests] = await Promise.all([
      prisma.location.findMany({
        where: { hotelId, isActive: true },
        select: { id: true, name: true, mapX: true, mapY: true, displayOrder: true },
        orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
      }),
      prisma.buggy.findMany({
        where: { hotelId, isActive: true },
        select: {
          id: true,
          code: true,
          icon: true,
          status: true,
          currentLocationId: true,
          drivers: {
            where: { isActive: true },
            select: { driverId: true, isPrimary: true, driver: { select: { id: true, fullName: true } } },
            orderBy: { isPrimary: "desc" },
          },
        },
        orderBy: { code: "asc" },
      }),
      prisma.buggyRequest.findMany({
        where: { hotelId, status: { in: ["PENDING", "ACCEPTED"] } },
        select: {
          id: true,
          status: true,
          guestName: true,
          roomNumber: true,
          requestedAt: true,
          acceptedAt: true,
          locationId: true,
          buggyId: true,
          acceptedById: true,
        },
        orderBy: { requestedAt: "asc" },
      }),
    ]);

    return {
      locations,
      buggies: buggies.map((b) => ({
        id: b.id,
        code: b.code,
        icon: b.icon,
        status: b.status,
        currentLocationId: b.currentLocationId,
        drivers: b.drivers.map((d) => ({ id: d.driver.id, fullName: d.driver.fullName })),
      })),
      requests,
    };
  },
};
```

- [ ] **Step 4: Test geçiyor**

Run: `pnpm vitest run --config vitest.config.ts tests/monitor-service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/monitor-service.ts tests/monitor-service.test.ts
git commit -m "feat: MonitorService.getState aggregation"
```

---

### Task 4: `GET /api/monitor/state` endpoint

**Files:**
- Create: `src/app/api/monitor/state/route.ts`

- [ ] **Step 1: Route'u yaz**

```ts
import { NextRequest } from "next/server";
import { MonitorService } from "@/services/monitor-service";
import { apiSuccess } from "@/lib/api-response";
import { withAuth, toRouteHandler } from "@/lib/middleware";

export const GET = toRouteHandler(withAuth(async (_req: NextRequest, ctx) => {
  const state = await MonitorService.getState(ctx.user!.hotelId);
  return apiSuccess(state);
}));
```

(`src/app/api/requests/active/route.ts` ile birebir aynı kalıp.)

- [ ] **Step 2: Manuel doğrulama** — dev server çalışırken admin session cookie'si ile `curl http://localhost:3016/api/monitor/state` → `{"success":true,"data":{"locations":[...],"buggies":[...],"requests":[...]}}`. Auth'suz istek 401 dönmeli. (Dev server yoksa bu adımı "uygulama çalıştırıldığında doğrulanacak" olarak işaretle, testler Task 3'te servisi zaten kapsüyor.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/monitor/state/route.ts
git commit -m "feat: GET /api/monitor/state endpoint"
```

---

### Task 5: `GET /api/sse/admin` SSE endpoint

**Files:**
- Create: `src/app/api/sse/admin/route.ts`

- [ ] **Step 1: Route'u yaz** — `src/app/api/sse/driver/route.ts` kalıbının aynısı, sadece admin için ve sadece hotel kanalı:

```ts
import { NextRequest, NextResponse } from "next/server";
import { withAuth, toRouteHandler } from "@/lib/middleware";
import { eventBus } from "@/lib/event-bus";

export const GET = toRouteHandler(withAuth(async (req: NextRequest, ctx): Promise<NextResponse> => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {
          // stream closed
        }
      };

      send(JSON.stringify({ type: "connected", role: "admin" }));

      const hotelChannel = `hotel:${ctx.user!.hotelId}`;
      const unsubscribeHotel = eventBus.subscribe(hotelChannel, send);

      const heartbeat = setInterval(() => {
        send(": heartbeat\n\n");
      }, 30000);

      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribeHotel();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}));
```

- [ ] **Step 2: Manuel doğrulama** — `curl -N -H "Cookie: session_token=..." http://localhost:3016/api/sse/admin` → ilk satır `data: {"type":"connected","role":"admin"}`. (Dev server yoksa sonraya bırak; davranış driver SSE ile aynı kod olduğu için risk düşük.)

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sse/admin/route.ts
git commit -m "feat: GET /api/sse/admin SSE endpoint"
```

---

### Task 6: `buggy_location` SSE eventi (driver konum güncellemesi)

**Files:**
- Modify: `src/app/api/driver/location/route.ts` (POST, ~satır 32-48)
- Test: `tests/event-bus.test.ts` (mevcut kalıbı takip et) veya servis seviyesi test — aşağıdaki gibi route seviyesi yerine event yayınını doğrulayan basit test.

- [ ] **Step 1: Failing test yaz** — `tests/monitor-events.test.ts`:

```ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, createTestHotel, cleanupTestHotel } from "./setup";
import { eventBus } from "@/lib/event-bus";
import { POST as driverLocationPOST } from "@/app/api/driver/location/route";

// Route testi yerine event yayınını eventBus üzerinden doğrula:
// POST handler'ını çağırmak NextRequest + session gerektirdiğinden,
// burada yayınlanan event şeklini eventBus'a abone olarak test ederiz.
describe("buggy_location SSE event", () => {
  let hotel: Awaited<ReturnType<typeof createTestHotel>>;

  beforeAll(async () => { hotel = await createTestHotel(); });
  afterAll(async () => { await cleanupTestHotel(hotel.hotel.id); });

  it("eventBus delivers buggy_location events on hotel channel", async () => {
    const received: string[] = [];
    const unsub = eventBus.subscribe(`hotel:${hotel.hotel.id}`, (d) => received.push(d));
    const { publishSSE } = await import("@/lib/event-bus");
    publishSSE(`hotel:${hotel.hotel.id}`, { type: "buggy_location", buggyId: 1, locationId: 2 });
    unsub();
    expect(received).toHaveLength(1);
    expect(JSON.parse(received[0])).toMatchObject({ type: "buggy_location", buggyId: 1, locationId: 2 });
  });
});
```

(Bu test altyapıyı doğrular; asıl davranış değişikliği route'taki publish çağrısı — aşağıda.)

- [ ] **Step 2: Implementasyon** — `src/app/api/driver/location/route.ts` POST handler'ında `prisma.buggy.update` başarılı olduktan sonra, `return apiSuccess(...)` satırından ÖNCE ekle:

```ts
    const { publishSSE } = await import("@/lib/event-bus");
    publishSSE(`hotel:${assignment.buggy.hotelId}`, {
      type: "buggy_location",
      buggyId: assignment.buggy.id,
      locationId,
    });
```

(Dosyanın başına `import { publishSSE } from "@/lib/event-bus";` static import olarak eklemek de olur — request-service.ts'deki kalıp bu, onu tercih et.)

- [ ] **Step 3: Testler**

Run: `pnpm vitest run --config vitest.config.ts tests/monitor-events.test.ts tests/event-bus.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/driver/location/route.ts tests/monitor-events.test.ts
git commit -m "feat: driver konum guncellemesinde buggy_location SSE eventi"
```

---

### Task 7: `buggy_status` SSE eventi (BuggyService.updateStatus)

**Files:**
- Modify: `src/services/buggy-service.ts:153-171` (updateStatus)
- Test: `tests/monitor-events.test.ts` (ekleme)

- [ ] **Step 1: Failing test ekle** — `tests/monitor-events.test.ts` içine yeni describe:

```ts
describe("buggy_status SSE event", () => {
  let hotel: Awaited<ReturnType<typeof createTestHotel>>;

  beforeAll(async () => { hotel = await createTestHotel(); });
  afterAll(async () => { await cleanupTestHotel(hotel.hotel.id); });

  it("BuggyService.updateStatus publishes buggy_status on hotel channel", async () => {
    const buggy = await prisma.buggy.create({
      data: { hotelId: hotel.hotel.id, code: "BG-ST", status: "AVAILABLE", isActive: true },
    });
    const received: string[] = [];
    const unsub = eventBus.subscribe(`hotel:${hotel.hotel.id}`, (d) => received.push(d));

    const { BuggyService } = await import("@/services/buggy-service");
    await BuggyService.updateStatus(hotel.hotel.id, buggy.id, "MAINTENANCE", hotel.admin.id);

    unsub();
    const events = received.map((d) => JSON.parse(d));
    expect(events).toContainEqual(
      expect.objectContaining({ type: "buggy_status", buggyId: buggy.id, status: "MAINTENANCE" }),
    );
  });
});
```

(`hotel.admin.id` alan adını `tests/services.test.ts`'teki helper kullanımıyla eşleştir.)

- [ ] **Step 2: Fail doğrula**

Run: `pnpm vitest run --config vitest.config.ts tests/monitor-events.test.ts`
Expected: FAIL — `buggy_status` eventi yayınlanmıyor.

- [ ] **Step 3: Implementasyon** — `src/services/buggy-service.ts`:

Dosyanın başına ekle (request-service.ts kalıbı):

```ts
import { publishSSE } from "@/lib/event-bus";
```

`updateStatus` içinde `await logAudit({...})` sonrası, `return buggy;` öncesi:

```ts
    publishSSE(`hotel:${hotelId}`, { type: "buggy_status", buggyId: id, status: buggy.status });
```

- [ ] **Step 4: Testler geçiyor**

Run: `pnpm vitest run --config vitest.config.ts tests/monitor-events.test.ts tests/services.test.ts`
Expected: PASS (services.test.ts regression dahil).

- [ ] **Step 5: Commit**

```bash
git add src/services/buggy-service.ts tests/monitor-events.test.ts
git commit -m "feat: buggy status degisiminde buggy_status SSE eventi"
```

---

### Task 8: Harita koordinat seed scripti

**Files:**
- Create: `scripts/seed-map-coordinates.ts`
- Modify: `package.json` (scripts bölümü)

- [ ] **Step 1: Scripti yaz** — `scripts/seed-map-coordinates.ts`:

```ts
/**
 * Mevcut konumlara SVG harita koordinatları (viewBox 1200x820) atar.
 * İsim eşleşmesi: case-insensitive "contains". Eşleşmeyen konumlar raporlanır.
 * Çalıştır: pnpm seed:map
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Kaynak: D:\ETHNO\aas.html STOPS dizisi
const STOPS: { match: string; mapX: number; mapY: number }[] = [
  { match: "casita by ethno", mapX: 640, mapY: 118 },
  { match: "forest villas", mapX: 168, mapY: 138 },
  { match: "ethno villas", mapX: 212, mapY: 268 },
  { match: "aquapark", mapX: 150, mapY: 362 },
  { match: "casita beach", mapX: 140, mapY: 500 },
  { match: "javara beach", mapX: 352, mapY: 500 },
  { match: "mangiare", mapX: 442, mapY: 400 },
  { match: "ethnosphere", mapX: 552, mapY: 420 },
  { match: "night club", mapX: 516, mapY: 500 },
  { match: "beach volleyball", mapX: 662, mapY: 500 },
  { match: "lumière", mapX: 632, mapY: 300 },
  { match: "lumiere", mapX: 632, mapY: 300 },
  { match: "tennis", mapX: 786, mapY: 300 },
];

async function main() {
  const locations = await prisma.location.findMany({ where: { isActive: true } });
  let updated = 0;
  const unmatched: string[] = [];

  for (const loc of locations) {
    const name = loc.name.toLocaleLowerCase("tr");
    const stop = STOPS.find((s) => name.includes(s.match));
    if (stop) {
      await prisma.location.update({ where: { id: loc.id }, data: { mapX: stop.mapX, mapY: stop.mapY } });
      console.log(`✓ ${loc.name} -> (${stop.mapX}, ${stop.mapY})`);
      updated++;
    } else {
      unmatched.push(loc.name);
    }
  }

  console.log(`\n${updated} konum güncellendi.`);
  if (unmatched.length) {
    console.log(`Eşleşmeyen (${unmatched.length}): ${unmatched.join(", ")}`);
    console.log("→ Bu konumlara admin panel > Konumlar ekranından harita noktası atayın.");
  }
}

main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2: package.json script ekle** — `"seed": "tsx prisma/seed.ts"` satırının yanına:

```json
    "seed:map": "tsx scripts/seed-map-coordinates.ts",
```

- [ ] **Step 3: Çalıştır ve doğrula**

Run: `cd D:\ETHNO\shuttlecall && pnpm seed:map`
Expected: her eşleşen konum için `✓ ... -> (x, y)` çıktısı; eşleşmeyenler raporlanır. (DB erişilemezse hatayı raporla, task'ı bloklama — prod'da çalıştırılacak olarak not et.)

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-map-coordinates.ts package.json
git commit -m "feat: harita koordinat seed scripti (12 durak)"
```

---

### Task 9: Statik harita modülü (`map-static.ts`)

**Files:**
- Create: `src/components/monitor/map-static.ts`

**Kaynak:** `D:\ETHNO\aas.html` — aşağıdaki fonksiyonlar **değiştirmeden** kopyalanır (saf string fonksiyonları, DOM bağımlılığı yok):
- satır 218: `pad` helper
- satırlar 221-236: `STOPS` + `ROUTE_ORDER` (aşağıda inline verildi, kopyalamaya gerek yok — dosyaya doğrudan yaz)
- satırlar 240-251: `cabin`, `palm`
- satırlar 253-386: `buildGround`
- satırlar 389-398: `routePath`

- [ ] **Step 1: Dosyayı oluştur** — yapı:

```ts
/**
 * ETHNO Belek SVG diorama — statik zemin + rota.
 * Kaynak: D:\ETHNO\aas.html (tek veri kaynağı; dekoratif katman).
 * CSS değişkenleri MonitorMap bileşeninde scoped <style> ile tanımlanır.
 */

export const MAP_W = 1200;
export const MAP_H = 820;

export interface CanonicalStop { n: number; name: string; x: number; y: number }

export const CANONICAL_STOPS: CanonicalStop[] = [
  { n: 1,  name: "Casita by Ethno",            x: 640, y: 118 },
  { n: 2,  name: "Forest Villas",              x: 168, y: 138 },
  { n: 3,  name: "Ethno Villas",               x: 212, y: 268 },
  { n: 4,  name: "Aquapark",                   x: 150, y: 362 },
  { n: 5,  name: "Casita Beach Club",          x: 140, y: 500 },
  { n: 6,  name: "Javara Beach Club",          x: 352, y: 500 },
  { n: 7,  name: "Mangiare Snack Restaurant",  x: 442, y: 400 },
  { n: 8,  name: "Ethnosphere Event House",    x: 552, y: 420 },
  { n: 9,  name: "Night Club",                 x: 516, y: 500 },
  { n: 10, name: "Beach Volleyball",           x: 662, y: 500 },
  { n: 11, name: "Lumière Cabaret Restaurant", x: 632, y: 300 },
  { n: 12, name: "Tennis Court",               x: 786, y: 300 },
];

const ROUTE_ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 11];

// ↓↓↓ D:\ETHNO\aas.html satır 218, 240-251, 253-386, 389-398'den BİREBİR kopyala:
// pad, cabin, palm, buildGround, routePath (içlerindeki `"use strict"` IIFE'si ve
// DOM erişimi YOKTUR — fonksiyon gövdeleri oldugu gibi çalışır) ↑↑↑

export function buildRouteSvg(): string {
  const ordered = ROUTE_ORDER.map((n) => CANONICAL_STOPS[n - 1]);
  const d = routePath(ordered);
  return (
    '<path d="' + d + '" fill="none" stroke="var(--route)" stroke-width="24" opacity=".16" filter="url(#glow)"/>' +
    '<path d="' + d + '" fill="none" stroke="var(--route)" stroke-width="14" opacity=".30" filter="url(#glow)"/>' +
    '<path d="' + d + '" fill="none" stroke="var(--route-d)" stroke-width="7" stroke-linecap="round"/>' +
    '<path class="r-dash" d="' + d + '" fill="none" stroke="#eafff0" stroke-width="2.4" stroke-dasharray="2 12" stroke-linecap="round"/>'
  );
}

export function buildGroundOnly(): string {
  return buildGround();
}
```

Not: `buildGround` çıktısı `<g clip-path="url(#isleClip)">` ile bitiyor — `<defs>` bölümü aas.html'den **kopyalanmaz**; defs MonitorMap JSX'inde yazılacak (Task 10).

- [ ] **Step 2: Doğrulama (tip kontrol)**

Run: `cd D:\ETHNO\shuttlecall && npx tsc --noEmit -p tsconfig.json`
Expected: `map-static.ts` için hata yok (diğer dosyalarda önceden var olan hatalar varsa onlara dokunma).

- [ ] **Step 3: Commit**

```bash
git add src/components/monitor/map-static.ts
git commit -m "feat: monitor haritasi statik zemin modulu (aas.html port)"
```

---

### Task 10: `MonitorMap` bileşeni (pin + buggy + çağrı katmanları)

**Files:**
- Create: `src/components/monitor/monitor-map.tsx`
- Test: `tests/monitor-map.test.tsx` (Task 15'te — bu task sadece bileşen)

- [ ] **Step 1: Bileşeni yaz** — `src/components/monitor/monitor-map.tsx`:

```tsx
"use client";

import { useMemo } from "react";
import { MAP_W, MAP_H, buildGroundOnly, buildRouteSvg } from "./map-static";

export interface MapLocation { id: number; name: string; mapX: number | null; mapY: number | null }
export interface MapBuggy {
  id: number; code: string; icon: string | null;
  status: "AVAILABLE" | "BUSY" | "OFFLINE" | "MAINTENANCE";
  currentLocationId: number | null;
}
export interface MapCall {
  id: number; status: "PENDING" | "ACCEPTED"; locationId: number; buggyId: number | null;
  guestName: string | null; roomNumber: string | null; requestedAt: string;
}
export type MapSelection = { kind: "call" | "buggy"; id: number } | null;

const BUGGY_COLORS: Record<MapBuggy["status"], string> = {
  AVAILABLE: "#22c55e",
  BUSY: "#f97316",
  OFFLINE: "#6b7280",
  MAINTENANCE: "#6b7280",
};

function Pin({ x, y, n, name, dimmed, onClick }: {
  x: number; y: number; n: number; name: string; dimmed?: boolean; onClick?: () => void;
}) {
  return (
    <g transform={`translate(${x},${y})`} opacity={dimmed ? 0.35 : 1} style={{ cursor: onClick ? "pointer" : undefined }} onClick={onClick}>
      <ellipse cx="0" cy="2" rx="9" ry="3" fill="rgba(0,0,0,.32)" />
      <path d="M0 0 C-14 -18 -14 -36 0 -36 C14 -36 14 -18 0 0 Z" fill="url(#gPin)" stroke="#fff" strokeWidth="1.6" />
      <circle cx="0" cy="-25" r="9.5" fill="#fff" />
      <text x="0" y="-25" textAnchor="middle" dominantBaseline="central" fontFamily="Space Grotesk, sans-serif" fontWeight="700" fontSize="11.5" fill="#c4160a">
        {String(n).padStart(2, "0")}
      </text>
      <title>{name}</title>
    </g>
  );
}

function BuggyMarker({ x, y, buggy, selected, onClick }: {
  x: number; y: number; buggy: MapBuggy; selected: boolean; onClick?: () => void;
}) {
  const color = BUGGY_COLORS[buggy.status];
  const faded = buggy.status === "OFFLINE" || buggy.status === "MAINTENANCE";
  return (
    <g transform={`translate(${x},${y})`} style={{ cursor: "pointer" }} onClick={onClick}
       opacity={faded ? 0.55 : 1} data-testid={`buggy-${buggy.code}`} data-status={buggy.status}>
      {selected && <circle r="20" fill="none" stroke={color} strokeWidth="2.5" className="mon-sel-ring" />}
      <rect x="-16" y="-11" width="32" height="20" rx="6" fill="#0e241a" stroke={color} strokeWidth="2.5" />
      <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fontFamily="Space Grotesk, sans-serif"
            fontWeight="700" fontSize="10" fill="#fff">{buggy.code}</text>
      <circle cx="13" cy="-8" r="4" fill={color} stroke="#0e241a" strokeWidth="1.5" />
      <title>{`${buggy.code} · ${buggy.status}`}</title>
    </g>
  );
}

function CallMarker({ x, y, call, selected, onClick }: {
  x: number; y: number; call: MapCall; selected: boolean; onClick?: () => void;
}) {
  const pending = call.status === "PENDING";
  const color = pending ? "#ef4444" : "#3b82f6";
  return (
    <g transform={`translate(${x},${y - 46})`} style={{ cursor: "pointer" }} onClick={onClick}
       data-testid={`call-${call.id}`} data-status={call.status}>
      {pending && <circle r="10" fill="none" stroke={color} strokeWidth="2" className="mon-call-pulse" />}
      {selected && <circle r="16" fill="none" stroke={color} strokeWidth="2.5" />}
      <circle r="9" fill={color} stroke="#fff" strokeWidth="1.6" />
      <path d="M-3.5 -3.5 h7 v2 h-5.5 v4 h5 v2 h-7 Z" fill="#fff" transform="rotate(0)" display="none" />
      <path d="M0 -4.5c-2.4 0-4 1.7-4 3.6v2.4l-1.4 2h10.8l-1.4-2V-0.9C4-2.8 2.4-4.5 0-4.5Zm-1.6 8.4a1.7 1.7 0 0 0 3.2 0Z" fill="#fff" />
      <title>{`${call.guestName || "Misafir"}${call.roomNumber ? " · Oda " + call.roomNumber : ""}`}</title>
    </g>
  );
}

export function MonitorMap({ locations, buggies, calls, selection, onSelect }: {
  locations: MapLocation[];
  buggies: MapBuggy[];
  calls: MapCall[];
  selection: MapSelection;
  onSelect?: (sel: MapSelection) => void;
}) {
  const groundHtml = useMemo(() => buildGroundOnly(), []);
  const routeHtml = useMemo(() => buildRouteSvg(), []);

  const mapped = locations.filter((l): l is MapLocation & { mapX: number; mapY: number } => l.mapX != null && l.mapY != null);
  const coordOf = new Map(mapped.map((l) => [l.id, { x: l.mapX, y: l.mapY }]));

  // Aynı duraktaki buggy'leri yan yana diz
  const byLocation = new Map<number, MapBuggy[]>();
  for (const b of buggies) {
    if (b.currentLocationId == null || !coordOf.has(b.currentLocationId)) continue;
    const arr = byLocation.get(b.currentLocationId) ?? [];
    arr.push(b);
    byLocation.set(b.currentLocationId, arr);
  }
  const buggyMarkers: { buggy: MapBuggy; x: number; y: number }[] = [];
  for (const [locId, arr] of byLocation) {
    const c = coordOf.get(locId)!;
    arr.forEach((buggy, i) => {
      buggyMarkers.push({ buggy, x: c.x + (i - (arr.length - 1) / 2) * 40, y: c.y + 14 });
    });
  }
  const buggyCoord = new Map(buggyMarkers.map((m) => [m.buggy.id, { x: m.x, y: m.y }]));

  return (
    <div className="monitor-map-root">
      <style>{`
        .monitor-map-root{
          --wall:#ffffff; --wall2:#dfe7e6; --wallsh:#c2cdcc; --glass:#bfe6f2; --glass2:#8fcfe6;
          --roof:#5fae46; --roof2:#3d7d2c; --lawn:#86c45f; --lawn2:#62a23f; --lawn3:#46822f;
          --sea1:#3fe0ec; --sea2:#0c87ab; --sand1:#f3e7c2; --sand2:#dcc78f; --road:#efe7cd;
          --foam:#ffffff; --pin1:#ff5a45; --pin2:#cf160b; --route:#39ff88; --route-d:#13a44f;
        }
        .monitor-map-root .r-dash{animation:mon-march 1.4s linear infinite}
        .monitor-map-root .mon-call-pulse{animation:mon-pulse 1.3s ease-out infinite;transform-box:fill-box;transform-origin:center}
        .monitor-map-root .mon-sel-ring{animation:mon-pulse 1.8s ease-out infinite;transform-box:fill-box;transform-origin:center}
        .monitor-map-root .palm .top{transform-box:fill-box;transform-origin:center;animation:mon-sway 5s ease-in-out infinite}
        .monitor-map-root .wave{animation:mon-wave 7s linear infinite}
        .monitor-map-root .wave.w2{animation-duration:11s;animation-direction:reverse}
        @keyframes mon-march{to{stroke-dashoffset:-28}}
        @keyframes mon-pulse{0%{transform:scale(.7);opacity:.8}80%{opacity:0}100%{transform:scale(2.2);opacity:0}}
        @keyframes mon-sway{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
        @keyframes mon-wave{from{transform:translateX(0)}to{transform:translateX(-120px)}}
      `}</style>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full block" role="img" aria-label="Ethno Belek canlı buggy haritası">
        <defs>
          <linearGradient id="gSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--sea1)"/><stop offset="1" stopColor="var(--sea2)"/></linearGradient>
          <linearGradient id="gSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--sand1)"/><stop offset="1" stopColor="var(--sand2)"/></linearGradient>
          <linearGradient id="gLawn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--lawn)"/><stop offset="1" stopColor="var(--lawn2)"/></linearGradient>
          <linearGradient id="gWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--wall)"/><stop offset="1" stopColor="var(--wall2)"/></linearGradient>
          <linearGradient id="gWallSide" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--wall2)"/><stop offset="1" stopColor="var(--wallsh)"/></linearGradient>
          <linearGradient id="gRoof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--roof)"/><stop offset="1" stopColor="var(--roof2)"/></linearGradient>
          <radialGradient id="gDome" cx="40%" cy="32%" r="78%"><stop offset="0" stopColor="var(--wall)"/><stop offset="1" stopColor="var(--wall2)"/></radialGradient>
          <linearGradient id="gPin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--pin1)"/><stop offset="1" stopColor="var(--pin2)"/></linearGradient>
          <radialGradient id="gPinHi" cx="35%" cy="30%" r="60%"><stop offset="0" stopColor="#ffd2c8" stopOpacity=".95"/><stop offset="1" stopColor="#ffd2c8" stopOpacity="0"/></radialGradient>
          <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity=".22"/></filter>
          <filter id="float" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="22" stdDeviation="20" floodColor="#06251a" floodOpacity=".30"/></filter>
          <filter id="glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <clipPath id="seaClip"><rect x="0" y="636" width="1200" height="184"/></clipPath>
          <clipPath id="isleClip"><rect x="22" y="22" width="1156" height="612" rx="58"/></clipPath>
        </defs>

        {/* statik zemin + rota (aas.html portu) */}
        <g dangerouslySetInnerHTML={{ __html: groundHtml }} />
        <g dangerouslySetInnerHTML={{ __html: routeHtml }} opacity="0.6" />

        {/* durak pinleri */}
        <g>
          {mapped.map((l, i) => (
            <Pin key={l.id} x={l.mapX} y={l.mapY} n={i + 1} name={l.name} />
          ))}
        </g>

        {/* ACCEPTED çağrı → buggy kesikli çizgiler */}
        <g>
          {calls.filter((c) => c.status === "ACCEPTED" && c.buggyId != null && coordOf.has(c.locationId) && buggyCoord.has(c.buggyId)).map((c) => {
            const from = buggyCoord.get(c.buggyId!)!;
            const to = coordOf.get(c.locationId)!;
            return <line key={`link-${c.id}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y - 46}
                         stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 6" opacity="0.7" />;
          })}
        </g>

        {/* buggy katmanı */}
        <g>
          {buggyMarkers.map(({ buggy, x, y }) => (
            <BuggyMarker key={buggy.id} buggy={buggy} x={x} y={y}
                         selected={selection?.kind === "buggy" && selection.id === buggy.id}
                         onClick={() => onSelect?.({ kind: "buggy", id: buggy.id })} />
          ))}
        </g>

        {/* çağrı katmanı */}
        <g>
          {calls.filter((c) => coordOf.has(c.locationId)).map((c) => {
            const p = coordOf.get(c.locationId)!;
            return <CallMarker key={c.id} call={c} x={p.x} y={p.y}
                               selected={selection?.kind === "call" && selection.id === c.id}
                               onClick={() => onSelect?.({ kind: "call", id: c.id })} />;
          })}
        </g>
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Tip kontrol**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: yeni dosyada hata yok.

- [ ] **Step 3: Commit**

```bash
git add src/components/monitor/monitor-map.tsx
git commit -m "feat: MonitorMap SVG bileseni (pin/buggy/cagri katmanlari)"
```

---

### Task 11: `useMonitorState` hook'u (fetch + SSE + reducer)

**Files:**
- Create: `src/hooks/use-monitor-state.ts`
- Test: `tests/monitor-state.test.ts` (reducer — node config)

- [ ] **Step 1: Failing reducer testi** — `tests/monitor-state.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { reducer, initialMonitorData, type MonitorData } from "@/hooks/use-monitor-state";

const base: MonitorData = {
  ...initialMonitorData,
  locations: [{ id: 1, name: "Aquapark", mapX: 150, mapY: 362, displayOrder: 1 }],
  buggies: [{ id: 7, code: "BG-1", icon: null, status: "AVAILABLE", currentLocationId: 1, drivers: [] }],
};

describe("monitor reducer", () => {
  it("init replaces state", () => {
    const s = reducer(initialMonitorData, { type: "init", data: base });
    expect(s.buggies).toHaveLength(1);
  });

  it("upsertRequest adds new and updates existing", () => {
    const req = { id: 5, status: "PENDING" as const, guestName: "A", roomNumber: null, requestedAt: "t", acceptedAt: null, locationId: 1, buggyId: null, acceptedById: null };
    const s1 = reducer(base, { type: "upsertRequest", request: req });
    expect(s1.requests).toHaveLength(1);
    const s2 = reducer(s1, { type: "upsertRequest", request: { ...req, status: "ACCEPTED" as const, buggyId: 7 } });
    expect(s2.requests).toHaveLength(1);
    expect(s2.requests[0].status).toBe("ACCEPTED");
  });

  it("removeRequest removes by id", () => {
    const req = { id: 5, status: "PENDING" as const, guestName: null, roomNumber: null, requestedAt: "t", acceptedAt: null, locationId: 1, buggyId: null, acceptedById: null };
    const s1 = reducer(base, { type: "upsertRequest", request: req });
    const s2 = reducer(s1, { type: "removeRequest", requestId: 5 });
    expect(s2.requests).toHaveLength(0);
  });

  it("setBuggyLocation and setBuggyStatus update the buggy", () => {
    const s1 = reducer(base, { type: "setBuggyLocation", buggyId: 7, locationId: null });
    expect(s1.buggies[0].currentLocationId).toBeNull();
    const s2 = reducer(s1, { type: "setBuggyStatus", buggyId: 7, status: "BUSY" });
    expect(s2.buggies[0].status).toBe("BUSY");
  });
});
```

- [ ] **Step 2: Fail doğrula**

Run: `pnpm vitest run --config vitest.config.ts tests/monitor-state.test.ts`
Expected: FAIL — modül yok.

- [ ] **Step 3: Implementasyon** — `src/hooks/use-monitor-state.ts`:

```ts
"use client";

import { useEffect, useReducer, useRef, useCallback, useState } from "react";

export interface MonitorLocation { id: number; name: string; mapX: number | null; mapY: number | null; displayOrder: number }
export interface MonitorBuggy {
  id: number; code: string; icon: string | null;
  status: "AVAILABLE" | "BUSY" | "OFFLINE" | "MAINTENANCE";
  currentLocationId: number | null;
  drivers: { id: number; fullName: string }[];
}
export interface MonitorRequest {
  id: number; status: "PENDING" | "ACCEPTED"; guestName: string | null; roomNumber: string | null;
  requestedAt: string; acceptedAt: string | null; locationId: number; buggyId: number | null; acceptedById: number | null;
}
export interface MonitorData { locations: MonitorLocation[]; buggies: MonitorBuggy[]; requests: MonitorRequest[] }

export const initialMonitorData: MonitorData = { locations: [], buggies: [], requests: [] };

export type MonitorAction =
  | { type: "init"; data: MonitorData }
  | { type: "upsertRequest"; request: MonitorRequest }
  | { type: "removeRequest"; requestId: number }
  | { type: "setBuggyLocation"; buggyId: number; locationId: number | null }
  | { type: "setBuggyStatus"; buggyId: number; status: MonitorBuggy["status"] };

export function reducer(state: MonitorData, action: MonitorAction): MonitorData {
  switch (action.type) {
    case "init":
      return action.data;
    case "upsertRequest": {
      const i = state.requests.findIndex((r) => r.id === action.request.id);
      const requests = i >= 0
        ? state.requests.map((r) => (r.id === action.request.id ? action.request : r))
        : [...state.requests, action.request];
      return { ...state, requests };
    }
    case "removeRequest":
      return { ...state, requests: state.requests.filter((r) => r.id !== action.requestId) };
    case "setBuggyLocation":
      return { ...state, buggies: state.buggies.map((b) => (b.id === action.buggyId ? { ...b, currentLocationId: action.locationId } : b)) };
    case "setBuggyStatus":
      return { ...state, buggies: state.buggies.map((b) => (b.id === action.buggyId ? { ...b, status: action.status } : b)) };
    default:
      return state;
  }
}

interface SseEvent {
  type: string;
  request?: MonitorRequest;
  requestId?: number;
  buggyId?: number;
  locationId?: number | null;
  status?: MonitorBuggy["status"];
}

export function useMonitorState(opts?: { onNewRequest?: (req: MonitorRequest) => void }) {
  const [data, dispatch] = useReducer(reducer, initialMonitorData);
  const [connected, setConnected] = useState(false);
  const onNewRequestRef = useRef(opts?.onNewRequest);
  onNewRequestRef.current = opts?.onNewRequest;
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/monitor/state");
      const json = await res.json();
      if (json.success) dispatch({ type: "init", data: json.data });
    } catch {
      // ağ hatası — bir sonraki SSE event/poll'da tekrar dene
    }
  }, []);

  const scheduleRefetch = useCallback(() => {
    if (refetchTimer.current) clearTimeout(refetchTimer.current);
    refetchTimer.current = setTimeout(refetch, 1500);
  }, [refetch]);

  useEffect(() => {
    refetch();

    const es = new EventSource("/api/sse/admin");
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    es.onmessage = (e) => {
      let ev: SseEvent;
      try { ev = JSON.parse(e.data); } catch { return; }
      switch (ev.type) {
        case "new_request":
          if (ev.request) {
            dispatch({ type: "upsertRequest", request: ev.request });
            onNewRequestRef.current?.(ev.request);
          }
          scheduleRefetch();
          break;
        case "request_accepted":
          scheduleRefetch(); // payload'da buggyId yok — tam state çek
          break;
        case "request_completed":
        case "request_cancelled":
          if (ev.requestId) dispatch({ type: "removeRequest", requestId: ev.requestId });
          scheduleRefetch();
          break;
        case "buggy_location":
          if (ev.buggyId != null) dispatch({ type: "setBuggyLocation", buggyId: ev.buggyId, locationId: ev.locationId ?? null });
          break;
        case "buggy_status":
          if (ev.buggyId != null && ev.status) dispatch({ type: "setBuggyStatus", buggyId: ev.buggyId, status: ev.status });
          break;
      }
    };

    return () => {
      es.close();
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    };
  }, [refetch, scheduleRefetch]);

  // SSE kopukken fallback polling
  useEffect(() => {
    if (connected) return;
    const t = setInterval(refetch, 10000);
    return () => clearInterval(t);
  }, [connected, refetch]);

  return { data, connected, refetch };
}
```

- [ ] **Step 4: Testler geçiyor**

Run: `pnpm vitest run --config vitest.config.ts tests/monitor-state.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/use-monitor-state.ts tests/monitor-state.test.ts
git commit -m "feat: useMonitorState hook (fetch + SSE + reducer)"
```

---

### Task 12: Monitor sayfası (`/admin/monitor`)

**Files:**
- Create: `src/app/(admin)/admin/monitor/page.tsx`

- [ ] **Step 1: Sayfayı yaz**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { MonitorMap, type MapSelection } from "@/components/monitor/monitor-map";
import { useMonitorState, initialMonitorData } from "@/hooks/use-monitor-state";
import { playNotificationSound } from "@/lib/notification-sound";
import { Bell, BellOff, Maximize2, Minimize2, Car, MapPin, Clock, User, Wifi, WifiOff } from "lucide-react";

function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function fmtWait(requestedAt: string, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(requestedAt).getTime()) / 1000));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m} dk ${s % 60} sn` : `${s} sn`;
}

export default function MonitorPage() {
  const [muted, setMuted] = useState(false);
  const mutedRef = useState(() => ({ current: false }))[0];
  const [fullscreen, setFullscreen] = useState(false);
  const [selection, setSelection] = useState<MapSelection>(null);
  const now = useNow();

  const { data, connected } = useMonitorState({
    onNewRequest: () => { if (!mutedRef.current) playNotificationSound("notification"); },
  });

  useEffect(() => { mutedRef.current = muted; }, [muted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pending = data.requests.filter((r) => r.status === "PENDING");
  const accepted = data.requests.filter((r) => r.status === "ACCEPTED");
  const activeBuggies = data.buggies.filter((b) => b.status === "AVAILABLE" || b.status === "BUSY");
  const locName = useMemo(() => new Map(data.locations.map((l) => [l.id, l.name])), [data.locations]);
  const unmappedIds = useMemo(() => new Set(data.locations.filter((l) => l.mapX == null || l.mapY == null).map((l) => l.id)), [data.locations]);
  const noLocationBuggies = data.buggies.filter((b) => b.currentLocationId == null);

  // İlk fetch tamamlanana kadar loading göster — reducer "init" dispatch'i
  // data referansını initialMonitorData'dan farklı bir nesneye çevirir.
  if (data === initialMonitorData) return <Loading fullPage />;

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-background p-4 flex flex-col gap-4" : "space-y-4"}>
      {/* üst bar */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Canlı Harita</h1>
        <Badge variant={connected ? "default" : "destructive"} className="gap-1">
          {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {connected ? "Canlı" : "Bağlantı yok"}
        </Badge>
        <div className="flex items-center gap-4 ml-auto text-sm">
          <span className="flex items-center gap-1.5"><Bell className="w-4 h-4 text-red-500" /><b>{pending.length}</b> bekleyen</span>
          <span className="flex items-center gap-1.5"><Car className="w-4 h-4 text-emerald-600" /><b>{activeBuggies.length}</b> aktif araç</span>
          <Button size="sm" variant="outline" onClick={() => setMuted((m) => !m)}>
            {muted ? <BellOff className="w-4 h-4 mr-1" /> : <Bell className="w-4 h-4 mr-1" />}
            {muted ? "Ses kapalı" : "Ses açık"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setFullscreen((f) => !f)}>
            {fullscreen ? <Minimize2 className="w-4 h-4 mr-1" /> : <Maximize2 className="w-4 h-4 mr-1" />}
            {fullscreen ? "Küçült" : "Tam ekran"}
          </Button>
        </div>
      </div>

      <div className={fullscreen ? "flex-1 min-h-0" : "grid gap-4 lg:grid-cols-[1fr_340px]"}>
        {/* harita */}
        <Card className="overflow-hidden">
          <CardContent className="p-0 h-full">
            <MonitorMap
              locations={data.locations}
              buggies={data.buggies}
              calls={data.requests}
              selection={selection}
              onSelect={setSelection}
            />
          </CardContent>
        </Card>

        {/* sağ panel */}
        {!fullscreen && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4 text-red-500" /> Bekleyen Çağrılar ({pending.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {pending.length === 0 && <p className="text-sm text-muted-foreground">Bekleyen çağrı yok</p>}
                {pending.map((r) => (
                  <button key={r.id} onClick={() => setSelection({ kind: "call", id: r.id })}
                          className={`w-full text-left rounded-lg border p-2.5 text-sm transition-colors ${selection?.kind === "call" && selection.id === r.id ? "border-red-500 bg-red-500/10" : "border-border hover:bg-muted"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{r.guestName || "Misafir"}{r.roomNumber ? ` · ${r.roomNumber}` : ""}</span>
                      <span className="text-xs text-red-500 flex items-center gap-1"><Clock className="w-3 h-3" />{fmtWait(r.requestedAt, now)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{locName.get(r.locationId) || "?"}
                      {unmappedIds.has(r.locationId) && <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">haritada yok</Badge>}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Kabul Edilenler ({accepted.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {accepted.length === 0 && <p className="text-sm text-muted-foreground">Aktif yolculuk yok</p>}
                {accepted.map((r) => {
                  const buggy = data.buggies.find((b) => b.id === r.buggyId);
                  return (
                    <button key={r.id} onClick={() => setSelection({ kind: "call", id: r.id })}
                            className="w-full text-left rounded-lg border border-border p-2.5 text-sm hover:bg-muted transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{r.guestName || "Misafir"}</span>
                        <Badge variant="default">{buggy?.code || "—"}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{locName.get(r.locationId) || "?"}</div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Car className="w-4 h-4" /> Araçlar ({data.buggies.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.buggies.map((b) => (
                  <button key={b.id} onClick={() => setSelection({ kind: "buggy", id: b.id })}
                          className={`w-full text-left rounded-lg border p-2.5 text-sm transition-colors ${selection?.kind === "buggy" && selection.id === b.id ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{b.icon} {b.code}</span>
                      <Badge variant={b.status === "AVAILABLE" ? "default" : b.status === "BUSY" ? "secondary" : "outline"}>
                        {b.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {b.drivers[0]?.fullName || "Sürücü yok"} · {b.currentLocationId ? locName.get(b.currentLocationId) || "?" : "konum bilinmiyor"}
                    </div>
                  </button>
                ))}
                {noLocationBuggies.length > 0 && (
                  <p className="text-xs text-muted-foreground pt-1">{noLocationBuggies.length} araç henüz konum bildirmedi — haritada görünmez.</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Tip kontrol + lint**

Run: `npx tsc --noEmit -p tsconfig.json && npx eslint "src/app/(admin)/admin/monitor/page.tsx" "src/components/monitor" "src/hooks/use-monitor-state.ts"`
Expected: hata yok.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(admin)/admin/monitor/page.tsx"
git commit -m "feat: /admin/monitor canli harita sayfasi"
```

---

### Task 13: Navigasyon öğesi

**Files:**
- Modify: `src/components/admin-nav.tsx` (~satır 11-21)

- [ ] **Step 1: navItems'e ekle** — lucide import satırına `Monitor` ikonunu ekle ve `Panel` öğesinden hemen sonra:

```ts
  { href: "/admin/monitor", label: "Canlı Harita", icon: Monitor },
```

- [ ] **Step 2: Tip kontrol + commit**

```bash
npx tsc --noEmit -p tsconfig.json
git add src/components/admin-nav.tsx
git commit -m "feat: admin nav Canli Harita ogesi"
```

---

### Task 14: `LocationMapPicker` + Konumlar sayfası entegrasyonu

**Files:**
- Create: `src/components/monitor/location-map-picker.tsx`
- Modify: `src/app/(admin)/admin/locations/page.tsx`

- [ ] **Step 1: Picker bileşeni** — `src/components/monitor/location-map-picker.tsx`:

```tsx
"use client";

import { useMemo, useRef } from "react";
import { MAP_W, MAP_H, buildGroundOnly } from "./map-static";

export function LocationMapPicker({ value, onChange }: {
  value: { x: number; y: number } | null;
  onChange: (v: { x: number; y: number } | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const groundHtml = useMemo(() => buildGroundOnly(), []);

  function handleClick(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.round(((e.clientX - rect.left) / rect.width) * MAP_W);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * MAP_H);
    if (x < 0 || x > MAP_W || y < 0 || y > MAP_H) return;
    onChange({ x, y });
  }

  return (
    <div className="monitor-map-root">
      <style>{`
        .monitor-map-root{
          --wall:#ffffff; --wall2:#dfe7e6; --wallsh:#c2cdcc; --glass:#bfe6f2; --glass2:#8fcfe6;
          --roof:#5fae46; --roof2:#3d7d2c; --lawn:#86c45f; --lawn2:#62a23f; --lawn3:#46822f;
          --sea1:#3fe0ec; --sea2:#0c87ab; --sand1:#f3e7c2; --sand2:#dcc78f; --road:#efe7cd;
          --foam:#ffffff; --pin1:#ff5a45; --pin2:#cf160b; --route:#39ff88; --route-d:#13a44f;
        }
      `}</style>
      <div ref={ref} onClick={handleClick} className="relative cursor-crosshair rounded-lg overflow-hidden border border-border">
        <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="w-full block">
          <defs>
            <linearGradient id="gSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--sea1)"/><stop offset="1" stopColor="var(--sea2)"/></linearGradient>
            <linearGradient id="gSand" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--sand1)"/><stop offset="1" stopColor="var(--sand2)"/></linearGradient>
            <linearGradient id="gLawn" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--lawn)"/><stop offset="1" stopColor="var(--lawn2)"/></linearGradient>
            <linearGradient id="gWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--wall)"/><stop offset="1" stopColor="var(--wall2)"/></linearGradient>
            <linearGradient id="gWallSide" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--wall2)"/><stop offset="1" stopColor="var(--wallsh)"/></linearGradient>
            <linearGradient id="gRoof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--roof)"/><stop offset="1" stopColor="var(--roof2)"/></linearGradient>
            <radialGradient id="gDome" cx="40%" cy="32%" r="78%"><stop offset="0" stopColor="var(--wall)"/><stop offset="1" stopColor="var(--wall2)"/></radialGradient>
            <linearGradient id="gPin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--pin1)"/><stop offset="1" stopColor="var(--pin2)"/></linearGradient>
            <filter id="soft" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity=".22"/></filter>
            <filter id="float" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="22" stdDeviation="20" floodColor="#06251a" floodOpacity=".30"/></filter>
            <clipPath id="seaClip"><rect x="0" y="636" width="1200" height="184"/></clipPath>
            <clipPath id="isleClip"><rect x="22" y="22" width="1156" height="612" rx="58"/></clipPath>
          </defs>
          <g dangerouslySetInnerHTML={{ __html: groundHtml }} />
          {value && (
            <g transform={`translate(${value.x},${value.y})`}>
              <path d="M0 0 C-14 -18 -14 -36 0 -36 C14 -36 14 -18 0 0 Z" fill="url(#gPin)" stroke="#fff" strokeWidth="1.6" />
              <circle cx="0" cy="-25" r="6" fill="#fff" />
            </g>
          )}
        </svg>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Haritaya tıklayarak konum noktası seçin.{value ? ` Seçili: (${value.x}, ${value.y})` : " Henüz nokta seçilmedi."}
      </p>
      {value && (
        <button type="button" className="text-xs text-destructive underline mt-0.5" onClick={() => onChange(null)}>
          Harita noktasını kaldır
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Konumlar sayfasına entegre et** — `src/app/(admin)/admin/locations/page.tsx`:

1. `Location` interface'ine ekle: `mapX: number | null; mapY: number | null;`
2. State'e ekle: `const [mapPoint, setMapPoint] = useState<{ x: number; y: number } | null>(null);`
3. Import'a ekle: `import { LocationMapPicker } from "@/components/monitor/location-map-picker";`
4. `handleSubmit` body JSON'una ekle: `mapX: mapPoint?.x ?? null, mapY: mapPoint?.y ?? null,`
5. `resetForm` içine ekle: `setMapPoint(null);`
6. "Düzenle" butonunun onClick'inde (`setEditing(l)` sonrası) ekle: `setMapPoint(l.mapX != null && l.mapY != null ? { x: l.mapX, y: l.mapY } : null);`
7. Dialog formunda "Görüntüleme Sırası" bloğundan sonra ekle:

```tsx
            <div className="space-y-2">
              <Label>Harita Noktası (Canlı Harita)</Label>
              <LocationMapPicker value={mapPoint} onChange={setMapPoint} />
            </div>
```

8. Tablo başlıklarına "Sıra"dan sonra `<TableHead>Harita</TableHead>` ve her satıra karşılık gelen hücre:

```tsx
                    <TableCell>
                      {l.mapX != null && l.mapY != null ? (
                        <Badge variant="default">✓</Badge>
                      ) : (
                        <Badge variant="outline">yok</Badge>
                      )}
                    </TableCell>
```

Not: `DialogContent`'e `sm:max-w-md` yerine `sm:max-w-lg` ver (harita sığsın).

- [ ] **Step 3: Mevcut testlerin geçtiğini doğrula**

Run: `pnpm vitest run --config vitest.frontend.config.ts tests/admin-locations.test.tsx`
Expected: PASS (mock response'a `mapX/mapY` alanı eklenmesi gerekebilir — testler kırılırsa mock verisine `mapX: null, mapY: null` ekle).

- [ ] **Step 4: Commit**

```bash
git add src/components/monitor/location-map-picker.tsx "src/app/(admin)/admin/locations/page.tsx" tests/admin-locations.test.tsx
git commit -m "feat: konumlar sayfasina harita noktasi secici"
```

---

### Task 15: Component testleri (MonitorMap + MonitorPage)

**Files:**
- Test: `tests/monitor-map.test.tsx`
- Test: `tests/monitor-page.test.tsx`

- [ ] **Step 1: MonitorMap testi** — `tests/monitor-map.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { MonitorMap, type MapLocation, type MapBuggy, type MapCall } from "@/components/monitor/monitor-map";

const locations: MapLocation[] = [
  { id: 1, name: "Aquapark", mapX: 150, mapY: 362 },
  { id: 2, name: "Spa", mapX: null, mapY: null },
];

const buggies: MapBuggy[] = [
  { id: 1, code: "BG-1", icon: null, status: "AVAILABLE", currentLocationId: 1 },
  { id: 2, code: "BG-2", icon: null, status: "BUSY", currentLocationId: 1 },
  { id: 3, code: "BG-3", icon: null, status: "OFFLINE", currentLocationId: null },
];

const calls: MapCall[] = [
  { id: 10, status: "PENDING", locationId: 1, buggyId: null, guestName: "Ali", roomNumber: "101", requestedAt: "2026-07-25T10:00:00Z" },
  { id: 11, status: "PENDING", locationId: 2, buggyId: null, guestName: "Veli", roomNumber: null, requestedAt: "2026-07-25T10:01:00Z" },
];

describe("MonitorMap", () => {
  it("renders pins only for mapped locations", () => {
    const { container } = render(<MonitorMap locations={locations} buggies={[]} calls={[]} selection={null} />);
    expect(container.querySelector("title")?.textContent).toBeTruthy();
    const titles = [...container.querySelectorAll("title")].map((t) => t.textContent);
    expect(titles).toContain("Aquapark");
    expect(titles).not.toContain("Spa");
  });

  it("renders buggies at mapped location with status, offsets two at same stop, skips null-location buggy", () => {
    const { getByTestId, queryByTestId } = render(<MonitorMap locations={locations} buggies={buggies} calls={[]} selection={null} />);
    expect(getByTestId("buggy-BG-1")).toHaveAttribute("data-status", "AVAILABLE");
    expect(getByTestId("buggy-BG-2")).toHaveAttribute("data-status", "BUSY");
    expect(queryByTestId("buggy-BG-3")).toBeNull();
    const g1 = getByTestId("buggy-BG-1").getAttribute("transform");
    const g2 = getByTestId("buggy-BG-2").getAttribute("transform");
    expect(g1).not.toBe(g2); // aynı durakta offset
  });

  it("renders call marker only when location is mapped", () => {
    const { getByTestId, queryByTestId } = render(<MonitorMap locations={locations} buggies={[]} calls={calls} selection={null} />);
    expect(getByTestId("call-10")).toHaveAttribute("data-status", "PENDING");
    expect(queryByTestId("call-11")).toBeNull(); // Spa haritada yok
  });

  it("click on buggy marker calls onSelect", () => {
    const onSelect = vi.fn();
    const { getByTestId } = render(<MonitorMap locations={locations} buggies={buggies} calls={[]} selection={null} onSelect={onSelect} />);
    fireEvent.click(getByTestId("buggy-BG-1"));
    expect(onSelect).toHaveBeenCalledWith({ kind: "buggy", id: 1 });
  });
});
```

- [ ] **Step 2: MonitorPage testi** — `tests/monitor-page.test.tsx`:

```tsx
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import MonitorPage from "@/app/(admin)/admin/monitor/page";

const { mockPlaySound } = vi.hoisted(() => ({ mockPlaySound: vi.fn() }));

vi.mock("@/lib/notification-sound", () => ({ playNotificationSound: mockPlaySound }));

// --- EventSource mock ---
class MockEventSource {
  static instances: MockEventSource[] = [];
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  constructor(public url: string) {
    MockEventSource.instances.push(this);
    setTimeout(() => this.onopen?.(), 0);
  }
  emit(obj: unknown) { this.onmessage?.({ data: JSON.stringify(obj) }); }
  close() {}
}
(globalThis as unknown as { EventSource: typeof MockEventSource }).EventSource = MockEventSource;

const stateResponse = {
  success: true,
  data: {
    locations: [{ id: 1, name: "Aquapark", mapX: 150, mapY: 362, displayOrder: 1 }],
    buggies: [{ id: 1, code: "BG-1", icon: null, status: "AVAILABLE", currentLocationId: 1, drivers: [{ id: 2, fullName: "Ahmet" }] }],
    requests: [],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  MockEventSource.instances = [];
  global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve(stateResponse) });
});

describe("MonitorPage", () => {
  it("loads state and shows buggy in panel", async () => {
    render(<MonitorPage />);
    await waitFor(() => expect(screen.getByText("Canlı Harita")).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/BG-1/)).toBeInTheDocument());
    expect(screen.getByText("Bekleyen çağrı yok")).toBeInTheDocument();
  });

  it("new_request SSE event adds pending call and plays sound", async () => {
    render(<MonitorPage />);
    await waitFor(() => expect(MockEventSource.instances.length).toBe(1));
    const es = MockEventSource.instances[0];
    await act(async () => {
      es.emit({
        type: "new_request",
        request: { id: 42, status: "PENDING", guestName: "Ali Veli", roomNumber: "205", requestedAt: new Date().toISOString(), acceptedAt: null, locationId: 1, buggyId: null, acceptedById: null },
      });
    });
    await waitFor(() => expect(screen.getByText(/Ali Veli/)).toBeInTheDocument());
    expect(mockPlaySound).toHaveBeenCalled();
  });

  it("request_cancelled SSE event removes the call", async () => {
    const withCall = {
      ...stateResponse,
      data: {
        ...stateResponse.data,
        requests: [{ id: 42, status: "PENDING", guestName: "Ali Veli", roomNumber: null, requestedAt: new Date().toISOString(), acceptedAt: null, locationId: 1, buggyId: null, acceptedById: null }],
      },
    };
    global.fetch = vi.fn().mockResolvedValue({ json: () => Promise.resolve(withCall) });
    render(<MonitorPage />);
    await waitFor(() => expect(screen.getByText(/Ali Veli/)).toBeInTheDocument());
    const es = MockEventSource.instances[0];
    await act(async () => { es.emit({ type: "request_cancelled", requestId: 42 }); });
    await waitFor(() => expect(screen.queryByText(/Ali Veli/)).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Testleri çalıştır**

Run: `pnpm vitest run --config vitest.frontend.config.ts tests/monitor-map.test.tsx tests/monitor-page.test.tsx`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/monitor-map.test.tsx tests/monitor-page.test.tsx
git commit -m "test: MonitorMap ve MonitorPage bilesen testleri"
```

---

### Task 16: Tam doğrulama

- [ ] **Step 1: Tüm testler**

Run: `pnpm test`
Expected: tüm suite PASS (yeni + regresyon).

- [ ] **Step 2: Build**

Run: `pnpm build`
Expected: build başarılı, `/admin/monitor` rotası listede.

- [ ] **Step 3: Manuel smoke (dev server çalışıyorsa)**

1. `pnpm dev` → admin login → sidebar'da "Canlı Harita" görünür.
2. `/admin/monitor`: harita + durak pinleri render olur.
3. Konumlar sayfasından bir konuma harita noktası ata → monitor'de pin belirir.
4. Sürücü uygulamasından konum güncelle → buggy marker hareket eder (SSE).
5. Misafir QR sayfasından çağrı oluştur → haritada kırmızı pulse + panelde kart + ses.

- [ ] **Step 4: Final commit (varsa kalan değişiklikler)**

```bash
git status --short
# sadece bu feature'a ait dosyaları ekle
git commit -m "feat: admin canli monitor - tamamlanan entegrasyon"
```

---

## Self-Review Notları

- Spec kapsamı ↔ Task eşleşmesi: DB (T1-2, T8), state API (T3-4), SSE admin (T5), event eklentileri (T6-7), harita (T9-10), hook (T11), sayfa+panel+fullscreen (T12), nav (T13), picker (T14), testler (T3, T11, T15), doğrulama (T16). ✓
- `aas.html`'den kopyalanan fonksiyonlar DOM'suz saf string fonksiyonları; `defs`/animasyon CSS'i Task 10/14'te scoped olarak yeniden tanımlanıyor. ✓
- SSE `request_accepted` payload'ında buggyId yok → hook 1.5 sn debounce ile tam refetch yapar (Task 11'de). ✓
