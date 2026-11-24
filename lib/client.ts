"use client";
// Talking to the server from the page.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Workspace } from "./types";

export { APP_NAME } from "./name";

export async function post(url: string, body: unknown): Promise<{ ok?: boolean; error?: string; result?: unknown }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return await res.json();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "The server did not answer" };
  }
}

/** The workspace, kept fresh: asked for about once a second while a run is going. */
export function useWorkspace() {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [offline, setOffline] = useState(false);
  const rev = useRef(0);
  const running = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const res = await fetch(`/api/state?rev=${rev.current}`, { cache: "no-store" });
      const data = (await res.json()) as Workspace | { rev: number };
      setOffline(false);
      if ("modes" in data) {
        rev.current = data.rev;
        running.current = data.run.status === "running";
        setWs(data);
      }
    } catch {
      setOffline(true);
    } finally {
      busy.current = false;
    }
  }, []);

  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      await load();
      if (!stopped) timer.current = setTimeout(tick, running.current ? 700 : 2000);
    };
    tick();
    return () => {
      stopped = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  return { ws, offline, refresh: load };
}

export function ago(iso: string | null): string {
  if (!iso) return "";
  const s = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso + (iso.length === 10 ? "T12:00:00" : ""));
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

export function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Doing something to the workspace: post it, note what is in flight, read the workspace back.
    The app at / and the dashboard at /home both act through this, so a draft asked for on one
    page is recorded exactly as it would have been on the other. */
export function useActions(refresh: () => Promise<void>) {
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  const act = useCallback(
    async (body: Record<string, unknown>, key?: string) => {
      if (key) setBusy((b) => new Set(b).add(key));
      const res = await post("/api/action", body);
      if (key)
        setBusy((b) => {
          const next = new Set(b);
          next.delete(key);
          return next;
        });
      await refresh();
      if (res.error) {
        setToast(res.error);
        return false;
      }
      return true;
    },
    [refresh],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  return { act, busy, toast, setToast };
}
