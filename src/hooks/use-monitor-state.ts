"use client";

import { useEffect, useReducer, useRef, useCallback, useState } from "react";

export interface MonitorLocation { id: number; name: string; mapX: number | null; mapY: number | null; displayOrder: number }
export interface MonitorBuggy {
  id: number; code: string; icon: string | null;
  status: "AVAILABLE" | "BUSY" | "OFFLINE" | "MAINTENANCE";
  currentLocationId: number | null;
  drivers: { id: number; fullName: string; loggedIn?: boolean; driverStatus?: string }[];
  driverLoggedIn?: boolean;
  gpsLat?: number | null;
  gpsLng?: number | null;
  gpsAt?: string | null;
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
  | { type: "setBuggyStatus"; buggyId: number; status: MonitorBuggy["status"] }
  | { type: "setBuggyGps"; buggyId: number; latitude: number; longitude: number; gpsAt: string };

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
    case "setBuggyGps":
      return { ...state, buggies: state.buggies.map((b) =>
        b.id === action.buggyId ? { ...b, gpsLat: action.latitude, gpsLng: action.longitude, gpsAt: action.gpsAt } : b
      )};
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
  latitude?: number;
  longitude?: number;
  gpsAt?: string;
}

export function useMonitorState(opts?: { onNewRequest?: (req: MonitorRequest) => void }) {
  const [data, dispatch] = useReducer(reducer, initialMonitorData);
  const [connected, setConnected] = useState(false);
  const onNewRequestRef = useRef(opts?.onNewRequest);
  useEffect(() => {
    onNewRequestRef.current = opts?.onNewRequest;
  }, [opts?.onNewRequest]);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/monitor/state");
      const json = await res.json();
      if (json.success) dispatch({ type: "init", data: json.data });
    } catch {
      // network error -- retry on next event/poll
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
          scheduleRefetch();
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
        case "buggy_gps":
          if (ev.buggyId != null && ev.latitude != null && ev.longitude != null) {
            dispatch({ type: "setBuggyGps", buggyId: ev.buggyId, latitude: ev.latitude, longitude: ev.longitude, gpsAt: ev.gpsAt || new Date().toISOString() });
          }
          break;
      }
    };

    return () => {
      es.close();
      if (refetchTimer.current) clearTimeout(refetchTimer.current);
    };
  }, [refetch, scheduleRefetch]);

  // Fallback polling when SSE not connected
  useEffect(() => {
    if (connected) return;
    const t = setInterval(refetch, 10000);
    return () => clearInterval(t);
  }, [connected, refetch]);

  return { data, connected, refetch };
}
