import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage, LEGAL, Mail } from "@/components/legal/LegalPage";

export const metadata: Metadata = pageMetadata({
  title: "Terms of Service",
  absoluteTitle: "Terms of Service — Milecast",
  description: "The terms for using the Milecast website and iOS app, including subscriptions and how to use conditions data safely.",
  path: "/terms",
});

const sections = [
  {
    id: "agreement",
    title: "Agreement",
    body: (
      <p>
        These terms are an agreement between you and {LEGAL.company}, operating as {LEGAL.brand} (&ldquo;Milecast,&rdquo; &ldquo;we,&rdquo;
        &ldquo;us&rdquo;). They cover the website at {LEGAL.site} and the Milecast iPhone app (the &ldquo;Service&rdquo;). By creating an
        account or using the Service, you agree to these terms and to our <a href="/privacy">Privacy Policy</a>. If you don&rsquo;t
        agree, please don&rsquo;t use the Service.
      </p>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <ul>
        <li>You must be at least 13 to use Milecast. If you&rsquo;re under 18, a parent or guardian must agree to these terms.</li>
        <li>Give accurate information and keep your sign-in secure. You&rsquo;re responsible for what happens under your account.</li>
        <li>One account works on both the website and the app. Accounts are personal; don&rsquo;t share or sell them.</li>
        <li>You can delete your account at any time from Account in the app, or by emailing <Mail />.</li>
      </ul>
    ),
  },
  {
    id: "service",
    title: "The Service",
    body: (
      <>
        <p>
          Milecast shows river, weather and sky conditions for the Miracle Mile of the North Platte River and nearby reservoirs:
          live readings, flows and dam releases, forecasts, a daily verdict and best window, feeding times, hatch notes, maps and
          alerts.
        </p>
        <p>
          Some features are free with an account. Others, such as the customizable dashboard, field map and satellite map, need
          a paid Milecast One subscription. We may add, change or remove features, and the Service may sometimes be unavailable.
        </p>
      </>
    ),
  },
  {
    id: "subscriptions",
    title: "Milecast One subscriptions",
    body: (
      <>
        <ul>
          <li>
            Milecast One is an auto-renewing subscription, currently $4.99 per month or $29.99 per year (U.S. prices; taxes may
            apply). The price is shown before you buy.
          </li>
          <li>
            <strong>In the app</strong>, payment is charged to your Apple account when you confirm the purchase. The subscription
            renews automatically unless you turn off auto-renew at least 24 hours before the end of the current period. Manage or
            cancel it in your Apple account settings. Refunds for App Store purchases are handled by Apple under its policies.
          </li>
          <li>
            <strong>On the website</strong>, if we offer purchases there, the billing terms shown at checkout apply.
          </li>
          <li>
            Cancelling stops the next renewal; you keep access until the end of the period you&rsquo;ve paid for. Except where the
            law or the store&rsquo;s policy requires otherwise, payments aren&rsquo;t refundable for partial periods.
          </li>
          <li>
            If we change the price, we&rsquo;ll tell you in advance, and the new price will apply from your next renewal after the
            notice. You can cancel before then.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "safety",
    title: "Conditions data and your safety",
    body: (
      <>
        <p className="legal__callout">
          Milecast is a planning aid, not a safety device. Always check conditions yourself and use your own judgment on the water.
        </p>
        <ul>
          <li>
            Data comes from third parties, including a weather station, Weather Underground, the National Weather Service, the
            Bureau of Reclamation and USGS. Much of it is <strong>preliminary</strong>, and it can be late, missing or wrong.
          </li>
          <li>
            Dam releases can change quickly and without warning, and rising water can be dangerous. Wind, cold water, lightning and
            weather can change faster than any forecast.
          </li>
          <li>
            Verdicts, best windows, feeding times, hatch notes and alerts are estimates and opinions, not guarantees about
            conditions or fishing. Alerts can be delayed or not arrive at all.
          </li>
          <li>
            You&rsquo;re responsible for your own safety and for following fishing regulations, licensing, closures and access rules,
            including respecting private property.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "use",
    title: "Acceptable use",
    body: (
      <>
        <p>Please don&rsquo;t:</p>
        <ul>
          <li>Scrape, copy or resell Milecast data or features, or use our APIs outside the website and app.</li>
          <li>Interfere with, overload or try to break into the Service or other people&rsquo;s accounts.</li>
          <li>Reverse engineer the app except where the law allows it.</li>
          <li>Upload a profile photo that&rsquo;s unlawful, offensive, or that you don&rsquo;t have the right to use.</li>
          <li>Use the Service for anything illegal.</li>
        </ul>
      </>
    ),
  },
  {
    id: "content",
    title: "Your content",
    body: (
      <p>
        You own what you add, such as your name and profile photo. You give us permission to store, process and display it as
        needed to run the Service for you. This permission ends when you delete it or your account, apart from routine backups
        that expire on their own.
      </p>
    ),
  },
  {
    id: "ours",
    title: "Our content",
    body: (
      <p>
        The Service, including its design, text, graphics, logos and code, belongs to {LEGAL.company} and its licensors.
        &ldquo;Milecast&rdquo; and its logo are our trademarks. We give you a personal, non-transferable license to use the Service under
        these terms. Third-party data stays subject to its providers&rsquo; terms.
      </p>
    ),
  },
  {
    id: "third",
    title: "Third-party services",
    body: (
      <p>
        The Service relies on and links to services we don&rsquo;t control, such as Google, Apple, Apple Maps and government data
        sources. Your use of them is governed by their terms, and we&rsquo;re not responsible for them.
      </p>
    ),
  },
  {
    id: "ending",
    title: "Ending access",
    body: (
      <p>
        You can stop using Milecast and delete your account at any time. We may suspend or close accounts that break these terms
        or put the Service or others at risk. If we close an account without cause, we&rsquo;ll refund any unused paid time we
        collected directly. Sections that by their nature should survive, such as disclaimers and limits of liability, survive.
      </p>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <p className="legal__caps">
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available.&rdquo; To the fullest extent the law allows, we disclaim all
        warranties, express or implied, including merchantability, fitness for a particular purpose, accuracy and
        non-infringement. We don&rsquo;t warrant that the Service or its data will be accurate, timely, uninterrupted or error-free.
      </p>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <p className="legal__caps">
        To the fullest extent the law allows, {LEGAL.company} won&rsquo;t be liable for any indirect, incidental, special,
        consequential or punitive damages, or for any injury, loss or damage arising from reliance on conditions data, forecasts
        or alerts. Our total liability for any claim relating to the Service is limited to the greater of the amount you paid us
        in the 12 months before the claim, or $50. Some places don&rsquo;t allow these limits, so they may not fully apply to you.
      </p>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    body: (
      <p>
        If you break these terms or the law, and that leads to a claim against us, you agree to cover our reasonable losses and
        costs arising from it, to the extent the law allows.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of the State of {LEGAL.governingState} and the United States, without regard to
        conflict-of-law rules. Disputes will be handled in the state or federal courts located in {LEGAL.governingState}, unless
        the law where you live gives you the right to bring a claim there. Before filing a claim, please email us so we can try to
        sort it out.
      </p>
    ),
  },
  {
    id: "apple",
    title: "Apple App Store terms",
    body: (
      <>
        <p>If you use the Milecast iPhone app:</p>
        <ul>
          <li>
            These terms are between you and {LEGAL.company}, not Apple. {LEGAL.company}, not Apple, is responsible for the app and its
            content.
          </li>
          <li>Your license to use the app is limited to Apple-branded devices you own or control, as allowed by the App Store terms.</li>
          <li>Apple has no obligation to provide maintenance or support for the app.</li>
          <li>
            If the app fails to conform to any applicable warranty, you may notify Apple, and Apple may refund the purchase price
            (if any). Apple has no other warranty obligation for the app.
          </li>
          <li>
            Apple isn&rsquo;t responsible for addressing claims relating to the app, including product liability, legal or regulatory
            compliance, consumer protection, or intellectual property claims.
          </li>
          <li>You confirm you&rsquo;re not in a country under a U.S. embargo and not on any U.S. government list of prohibited parties.</li>
          <li>Apple and its subsidiaries are third-party beneficiaries of these terms and may enforce them against you.</li>
        </ul>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <p>
        We may update these terms. We&rsquo;ll change the date at the top, and for significant changes we&rsquo;ll tell you in the app or by
        email before they take effect. Using the Service after that means you accept the updated terms.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions about these terms: <Mail />. {LEGAL.company}, operating as {LEGAL.brand}.
      </p>
    ),
  },
];

export default function Page() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          The short version: use Milecast to plan your days on the Mile, but trust your own eyes on the water. Subscriptions renew
          until you cancel, and you can delete your account anytime.
        </p>
      }
      sections={sections}
    />
  );
}
