// Start a run. The work carries on after the response is sent; the page follows it through
// /api/state.
import { after } from "next/server";
import { runPipeline } from "@/lib/pipeline";
import { store } from "@/lib/store";
import type { Founder, Product } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const list = (v: unknown) =>
  (Array.isArray(v) ? v : String(v || "").split(","))
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, 4);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { product?: Partial<Product>; founder?: Partial<Founder> & { schools?: unknown; employers?: unknown } };
  const product: Product = {
    name: String(body.product?.name || "").trim().slice(0, 80),
    description: String(body.product?.description || "").trim().slice(0, 3000),
    url: String(body.product?.url || "").trim().slice(0, 200),
    pricing: String(body.product?.pricing || "").trim().slice(0, 400),
    customers: String(body.product?.customers || "").trim().slice(0, 400),
  };
  if (!product.name || product.description.length < 30) {
    return Response.json({ error: "Give the product a name and at least a sentence or two of description." }, { status: 400 });
  }
  const founder: Founder = {
    name: String(body.founder?.name || "").trim().slice(0, 80),
    schools: list(body.founder?.schools),
    employers: list(body.founder?.employers),
  };
  const s = store();
  if (s.state.run.status === "running") return Response.json({ error: "A run is already in progress." }, { status: 409 });
  after(() => runPipeline(product, founder).catch((e) => console.error("[tact] run failed:", e)));
  return Response.json({ ok: true });
}
