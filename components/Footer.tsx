import { MILE } from "@/lib/config";

export function Footer({ source, fetchedAt }: { source: string | null; fetchedAt: string }) {
  const weather = source === "tempest" ? "Tempest station" : source === "wunderground" ? "Weather Underground" : "National Weather Service";
  const updated = new Date(fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: MILE.timezone });
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer__top">
          <a href="/" className="wordmark footer__mark">
            The Mile
          </a>
          <a href="/lite" className="footer__lite">
            <span>
              <strong>Low-data version</strong>
              <small>For one bar of signal on the river</small>
            </span>
            <span aria-hidden>→</span>
          </a>
        </div>

        <div className="footer__cols">
          <div>
            <div className="label">Data</div>
            <ul>
              <li>{weather}</li>
              <li>
                <a href="https://www.usbr.gov/gp/hydromet/" rel="noreferrer">USBR Hydromet</a>
              </li>
              <li>
                <a href="https://waterdata.usgs.gov/monitoring-location/06630000/" rel="noreferrer">USGS 06630000</a>
              </li>
            </ul>
          </div>
          <div>
            <div className="label">Before you go</div>
            <ul>
              <li>
                <a href="https://wgfd.wyo.gov/fishing-boating" rel="noreferrer">WGFD regulations</a>
              </li>
              <li>
                <a href="https://www.weather.gov/cys/" rel="noreferrer">NWS Cheyenne</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom mono">
          <span>Updated {updated} MT · preliminary data</span>
          <span className="footer__end">
            <span className="footer__made">
              The Mile is made by{" "}
              <a href="https://summitlabs.one" rel="noreferrer">
                Summit Labs
              </a>
            </span>
            <a href="#top">Back to top ↑</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
