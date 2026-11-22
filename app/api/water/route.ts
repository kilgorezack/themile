import { getWater } from "@/lib/water";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getWater();
  return Response.json(data, {
    headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
  });
}
