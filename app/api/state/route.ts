// The page asks for this about once a second. If nothing changed since the revision it
// already has, it gets back only the revision number.
import { store } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const have = Number(new URL(request.url).searchParams.get("rev") || 0);
  const s = store();
  if (have && have === s.state.rev) return Response.json({ rev: have });
  return Response.json(s.view(), { headers: { "cache-control": "no-store" } });
}
