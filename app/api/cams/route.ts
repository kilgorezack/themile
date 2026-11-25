import { CAMS } from "@/lib/cams";

// The list rarely changes; the photos themselves are fetched straight from WYDOT.
export async function GET() {
  return Response.json(
    { cams: CAMS },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
