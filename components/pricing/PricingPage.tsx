"use client";

import { useState } from "react";
import { TopBar } from "../TopBar";
import { Footer } from "../Footer";
import { useAuth } from "../auth/AuthProvider";
import { useNow } from "../hooks";

type Billing = "yearly" | "monthly";

const PRICE = {
  monthly: { amount: "$4.99", per: "/month", note: "Billed monthly." },
  yearly: { amount: "$29.99", per: "/year", note: "About $2.50 a month, billed yearly." },
} as const;

const FEATURES: { label: string; free: boolean; one: boolean }[] = [
  { label: "Home: today's read, key readings, best window", free: true, one: true },
  { label: "Conditions: the full report", free: true, one: true },
  { label: "Low-data page for weak signal", free: true, one: true },
  { label: "Customizable dashboard", free: false, one: true },
  { label: "Field map: dams, reservoirs and gauges", free: false, one: true },
  { label: "Satellite map", free: false, one: true },
];

const FAQ = [
  {
    q: "What do I get for free?",
    a: "The home page, the full Conditions report and the low-data page. Conditions needs a free account, which takes a few seconds with Google, Apple or email.",
  },
  {
    q: "What does Milecast One add?",
    a: "Everything on the site: a dashboard you can arrange your way, and the map from Seminoe to Alcova with every dam and gauge, as a field map or satellite.",
  },
  {
    q: "Monthly or yearly?",
    a: "Same features either way. Yearly is $29.99, half what twelve months of the monthly plan costs, and it covers the whole season.",
  },
  {
    q: "Where does the data come from?",
    a: "A weather station on the Mile, Bureau of Reclamation dam data, USGS river gauges and the National Weather Service forecast.",
  },
];

function Check({ on }: { on: boolean }) {
  return on ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Included">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  ) : (
    <span className="muted" aria-label="Not included">
      —
    </span>
  );
}

export function PricingPage({ serverNow }: { serverNow: number }) {
  const now = useNow(serverNow, 60_000);
  const { user, openSignIn } = useAuth();
  const [billing, setBilling] = useState<Billing>("yearly");
  const [notice, setNotice] = useState(false);
  const p = PRICE[billing];

  const getOne = () => {
    if (!user) openSignIn();
    else setNotice(true);
  };

  return (
    <>
      <TopBar active={null} now={now} />
      <main className="wrap pricing">
        <header className="pricing__head">
          <div className="label">Pricing</div>
          <h1>
            Fish the Mile <em>smarter</em>
          </h1>
          <p className="muted">Conditions are free. Milecast One unlocks the dashboard and maps.</p>

          <div className="pricing__toggle" role="radiogroup" aria-label="Billing period">
            {(["monthly", "yearly"] as Billing[]).map((b) => (
              <button key={b} type="button" role="radio" aria-checked={billing === b} className={billing === b ? "on" : ""} onClick={() => setBilling(b)}>
                {b === "monthly" ? "Monthly" : "Yearly"}
                {b === "yearly" && <span className="pricing__save">Save 50%</span>}
              </button>
            ))}
          </div>
        </header>

        <section className="pricing__plans" aria-label="Plans">
          <div className="plan">
            <div className="plan__name">Free</div>
            <div className="plan__price">
              <span className="num">$0</span>
            </div>
            <p className="plan__note">With a free account.</p>
            <ul className="plan__list">
              <li>
                <Check on /> Home page
              </li>
              <li>
                <Check on /> Conditions: the full report
              </li>
              <li>
                <Check on /> Low-data page
              </li>
            </ul>
            {user ? (
              <a className="btn plan__cta" href="/conditions">
                Go to Conditions
              </a>
            ) : (
              <button type="button" className="btn plan__cta" onClick={openSignIn}>
                Create a free account
              </button>
            )}
          </div>

          <div className="plan plan--one">
            <div className="plan__top">
              <div className="plan__name">Milecast One</div>
              <span className="plan__badge">Full access</span>
            </div>
            <div className="plan__price">
              <span className="num">{p.amount}</span>
              <span className="plan__per">{p.per}</span>
            </div>
            <p className="plan__note">{p.note}</p>
            <ul className="plan__list">
              <li>
                <Check on /> Everything in Free
              </li>
              <li>
                <Check on /> Customizable dashboard
              </li>
              <li>
                <Check on /> Field map
              </li>
              <li>
                <Check on /> Satellite map
              </li>
            </ul>
            <button type="button" className="btn btn--solid plan__cta" onClick={getOne}>
              Get Milecast One
            </button>
            {notice && (
              <p className="plan__soon" role="status">
                Checkout is coming soon. You&rsquo;re signed in, so we&rsquo;ll be able to let you know the moment it opens.
              </p>
            )}
          </div>
        </section>

        <section className="pricing__compare" aria-labelledby="compare-h">
          <h2 id="compare-h">Compare plans</h2>
          <div className="compare">
            <table>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr-only">Feature</span>
                  </th>
                  <th scope="col">Free</th>
                  <th scope="col">Milecast One</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((f) => (
                  <tr key={f.label}>
                    <th scope="row">{f.label}</th>
                    <td>
                      <Check on={f.free} />
                    </td>
                    <td>
                      <Check on={f.one} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="pricing__faq" aria-labelledby="faq-h">
          <h2 id="faq-h">Questions</h2>
          <div className="faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer source={null} fetchedAt={new Date(serverNow).toISOString()} />
    </>
  );
}
