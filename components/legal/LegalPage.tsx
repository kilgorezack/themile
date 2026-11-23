import type { ReactNode } from "react";
import { TopBar } from "../TopBar";
import { Footer } from "../Footer";

/** Who runs Milecast and how to reach them. Used by both legal pages. */
export const LEGAL = {
  company: "Summit Labs",
  brand: "Milecast",
  site: "themile.summitlabs.one",
  email: "support@summitlabs.one",
  effective: "November 23, 2026",
  governingState: "Wyoming",
};

export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: ReactNode;
  sections: { id: string; title: string; body: ReactNode }[];
}) {
  const now = Date.now();
  return (
    <>
      <TopBar active={null} now={now} />
      <main className="wrap legal">
        <header className="legal__head">
          <div className="label">Milecast · {LEGAL.company}</div>
          <h1>{title}</h1>
          <p className="muted">Effective {LEGAL.effective}</p>
          <div className="legal__intro">{intro}</div>
        </header>

        <div className="legal__layout">
          <nav className="legal__toc" aria-label="On this page">
            <div className="label">On this page</div>
            <ol>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
            </ol>
          </nav>

          <article className="legal__body">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id}>
                <h2>
                  <span className="mono">{String(i + 1).padStart(2, "0")}</span> {s.title}
                </h2>
                {s.body}
              </section>
            ))}
          </article>
        </div>
      </main>
      <Footer source={null} fetchedAt={new Date(now).toISOString()} />
    </>
  );
}

export function Mail() {
  return <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>;
}
