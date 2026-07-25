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
