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
    const titles = [...container.querySelectorAll("title")].map((t) => t.textContent);
    expect(titles).toContain("Aquapark");
    expect(titles).not.toContain("Spa");
  });

  it("renders buggies at mapped location with status, offsets two at same stop, skips null-location buggy", () => {
    const { getByTestId, queryByTestId } = render(<MonitorMap locations={locations} buggies={buggies} calls={[]} selection={null} />);
    expect(getByTestId("buggy-BG-1")).toHaveAttribute("data-status", "AVAILABLE");
    expect(getByTestId("buggy-BG-2")).toHaveAttribute("data-status", "BUSY");
    expect(queryByTestId("buggy-BG-3")).toBeNull();
  });

  it("renders call marker only when location is mapped", () => {
    const { getByTestId, queryByTestId } = render(<MonitorMap locations={locations} buggies={[]} calls={calls} selection={null} />);
    expect(getByTestId("call-10")).toHaveAttribute("data-status", "PENDING");
    expect(queryByTestId("call-11")).toBeNull();
  });

  it("click on buggy marker calls onSelect", () => {
    const onSelect = vi.fn();
    const { getByTestId } = render(<MonitorMap locations={locations} buggies={buggies} calls={[]} selection={null} onSelect={onSelect} />);
    fireEvent.click(getByTestId("buggy-BG-1"));
    expect(onSelect).toHaveBeenCalledWith({ kind: "buggy", id: 1 });
  });
});
