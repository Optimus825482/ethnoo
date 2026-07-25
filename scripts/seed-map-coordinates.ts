/**
 * Mevcut konumlara SVG harita koordinatlari (viewBox 1200x820) atar.
 * Isim eslesmesi: case-insensitive "contains". Eslesmeyen konumlar raporlanir.
 * Calistir: pnpm seed:map
 */
import "dotenv/config";
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
  { match: "lumiere", mapX: 632, mapY: 300 },
  { match: "lumiere", mapX: 632, mapY: 300 },
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
      console.log(`\u2713 ${loc.name} -> (${stop.mapX}, ${stop.mapY})`);
      updated++;
    } else {
      unmatched.push(loc.name);
    }
  }

  console.log(`\n${updated} konum guncellendi.`);
  if (unmatched.length) {
    console.log(`Eslesmeyen (${unmatched.length}): ${unmatched.join(", ")}`);
    console.log("\u2192 Bu konumlara admin panel > Konumlar ekranindan harita noktasi atayin.");
  }
}

main().finally(() => prisma.$disconnect());
