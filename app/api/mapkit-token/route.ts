import { createPrivateKey, sign } from "node:crypto";

/**
 * Short-lived MapKit JS token for the satellite map. Either:
 *  - APPLE_MAPKIT_TOKEN: a token made in the Apple Developer portal, or
 *  - APPLE_MAPKIT_TEAM_ID + APPLE_MAPKIT_KEY_ID + APPLE_MAPKIT_PRIVATE_KEY (.p8):
 *    we sign a fresh 30-minute token per request. The key never leaves the server.
 */
export const dynamic = "force-dynamic";

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export async function GET(req: Request) {
  const headers = { "Content-Type": "text/plain", "Cache-Control": "no-store" };

  if (process.env.APPLE_MAPKIT_TOKEN) return new Response(process.env.APPLE_MAPKIT_TOKEN, { headers });

  const team = process.env.APPLE_MAPKIT_TEAM_ID;
  const kid = process.env.APPLE_MAPKIT_KEY_ID;
  const pem = process.env.APPLE_MAPKIT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!team || !kid || !pem) return new Response("Apple Maps is not configured", { status: 503, headers });

  try {
    const now = Math.floor(Date.now() / 1000);
    const header = b64url(JSON.stringify({ alg: "ES256", kid, typ: "JWT" }));
    // Lock the token to the site that asked for it, so it can't be reused elsewhere.
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
    const claims: Record<string, unknown> = { iss: team, iat: now, exp: now + 30 * 60 };
    if (host) claims.origin = `${proto}://${host}`;
    const payload = b64url(JSON.stringify(claims));
    const sig = sign("sha256", Buffer.from(`${header}.${payload}`), {
      key: createPrivateKey(pem),
      dsaEncoding: "ieee-p1363", // JWT wants raw r||s, not DER
    });
    return new Response(`${header}.${payload}.${b64url(sig)}`, { headers });
  } catch (e) {
    console.error("[mapkit-token] signing failed:", (e as Error).message);
    return new Response("Apple Maps key is invalid", { status: 500, headers });
  }
}
