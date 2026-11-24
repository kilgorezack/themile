import { MILE } from "@/lib/config";

export function Footer({ fetchedAt }: { source?: string | null; fetchedAt: string }) {
  const at = new Date(fetchedAt);
  const updated = at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: MILE.timezone });
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__top">
          <a href="/" className="wordmark footer__mark">
            The Mile
          </a>
          <nav className="footer__nav" aria-label="Footer">
            <a href="/lite">Low-data version</a>
            <a href="/pricing">Pricing</a>
            <a href="https://wgfd.wyo.gov/fishing-boating" rel="noreferrer">
              Regulations
            </a>
          </nav>
        </div>

        <div className="footer__bottom">
          <span className="footer__legal">
            <span>
              © {at.getFullYear()}{" "}
              <a href="https://summitlabs.one" rel="noreferrer">
                Summit Labs
              </a>
            </span>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </span>
          <span className="mono">Updated {updated} MT</span>
        </div>
        <p className="footer__recaptcha">
          This site is protected by reCAPTCHA. The Google{" "}
          <a href="https://policies.google.com/privacy" rel="noreferrer">Privacy Policy</a> and{" "}
          <a href="https://policies.google.com/terms" rel="noreferrer">Terms of Service</a> apply.
        </p>
      </div>
    </footer>
  );
}
