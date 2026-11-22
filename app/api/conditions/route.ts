import { getConditions } from "@/lib/weather";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getConditions();
  return Response.json(data, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
