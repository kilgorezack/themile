import { getRegion } from "@/lib/region";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getRegion();
  return Response.json(data, {
    headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
  });
}
