import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage, LEGAL, Mail } from "@/components/legal/LegalPage";

export const metadata: Metadata = pageMetadata({
  title: "End User License Agreement",
  absoluteTitle: "End User License Agreement — Milecast",
  description: "The license for the Milecast iPhone app and Milecast One subscriptions bought through the App Store.",
  path: "/eula",
});

// Linked from the App Store listing and the in-app paywall. Covers Apple's
// minimum terms for a custom EULA (acknowledgement, scope, support, warranty,
// product claims, IP claims, legal compliance, developer contact, third-party
// terms, third-party beneficiary).
const sections = [
  {
    id: "acknowledgement",
    title: "Agreement and acknowledgement",
    body: (
      <>
        <p>
          This End User License Agreement (&ldquo;EULA&rdquo;) is between you and {LEGAL.company}, operating as {LEGAL.brand}
          (&ldquo;we,&rdquo; &ldquo;us&rdquo;), and covers the Milecast app for iPhone and Apple Watch, its widgets, and Milecast
          One subscriptions bought in the app (together, the &ldquo;App&rdquo;). Our <a href="/terms">Terms of Service</a> and{" "}
          <a href="/privacy">Privacy Policy</a> also apply and are part of this EULA. If they conflict on how the App is licensed
          through the App Store, this EULA controls.
        </p>
        <p>
          You and we acknowledge that this EULA is between you and {LEGAL.company} only, not with Apple Inc.
          (&ldquo;Apple&rdquo;). {LEGAL.company}, not Apple, is solely responsible for the App and its content.
        </p>
      </>
    ),
  },
  {
    id: "license",
    title: "Your license",
    body: (
      <>
        <p>
          We grant you a limited, non-exclusive, non-transferable, revocable license to download and use the App for your
          personal, non-commercial use on Apple-branded products you own or control, as permitted by the Usage Rules in the
          Apple Media Services Terms and Conditions. The App may also be used by other accounts associated with you through
          Family Sharing or volume purchasing, where those are available.
        </p>
        <p>
          You may not copy, modify, distribute, sell, lease, reverse engineer or create derivative works of the App, except
          where the law allows it regardless of this restriction. You may not scrape, resell or redistribute the conditions data
          shown in the App.
        </p>
      </>
    ),
  },
  {
    id: "milecast-one",
    title: "Milecast One subscriptions",
    body: (
      <ul>
        <li>
          Milecast One unlocks extra features in the App and on {LEGAL.site}, including the customizable dashboard, the field map
          and satellite map, and readings in widgets. It&rsquo;s offered as a monthly or yearly auto-renewing subscription. The
          price for your region is shown in the App before you buy.
        </li>
        <li>Payment is charged to your Apple Account when you confirm the purchase.</li>
        <li>
          The subscription renews automatically for the same period and price unless auto-renew is turned off at least 24 hours
          before the end of the current period. Your account is charged for renewal within 24 hours before the current period
          ends.
        </li>
        <li>
          You can manage or cancel your subscription in your Apple Account settings at any time. Cancelling stops the next
          renewal; you keep Milecast One until the end of the period you&rsquo;ve paid for.
        </li>
        <li>
          If a free trial or introductory offer is available, any unused part of it ends when you buy a subscription. Refunds for
          purchases made through the App Store are handled by Apple under its policies.
        </li>
        <li>
          Milecast One is tied to the Milecast account you were signed in to when you bought it, and works with that account in
          the App and on {LEGAL.site}.
        </li>
      </ul>
    ),
  },
  {
    id: "support",
    title: "Maintenance and support",
    body: (
      <p>
        {LEGAL.company} is solely responsible for providing any maintenance and support for the App, as described in this EULA
        or as required by law. Reach us at <Mail />. You and we acknowledge that Apple has no obligation whatsoever to furnish
        any maintenance or support services for the App.
      </p>
    ),
  },
  {
    id: "warranty",
    title: "Warranty",
    body: (
      <>
        <p>
          {LEGAL.company} is solely responsible for any product warranties, whether express or implied by law, to the extent not
          effectively disclaimed. If the App fails to conform to any applicable warranty, you may notify Apple, and Apple will
          refund the purchase price for the App (if any) to you. To the maximum extent permitted by law, Apple will have no other
          warranty obligation whatsoever with respect to the App, and any other claims, losses, liabilities, damages, costs or
          expenses attributable to any failure to conform to any warranty will be our sole responsibility.
        </p>
        <p className="legal__caps">
          Except as stated above and to the fullest extent the law allows, the App is provided &ldquo;as is&rdquo; and &ldquo;as
          available,&rdquo; without warranties of any kind. Conditions, forecasts and alerts can be late, incomplete or wrong.
          Always use your own judgment on the water.
        </p>
      </>
    ),
  },
  {
    id: "claims",
    title: "Product claims",
    body: (
      <p>
        {LEGAL.company}, not Apple, is responsible for addressing any claims by you or any third party relating to the App or
        your possession and use of it, including: (i) product liability claims; (ii) any claim that the App fails to conform to
        any applicable legal or regulatory requirement; and (iii) claims arising under consumer protection, privacy or similar
        legislation.
      </p>
    ),
  },
  {
    id: "ip",
    title: "Intellectual property",
    body: (
      <p>
        In the event of any third-party claim that the App or your possession and use of it infringes that third party&rsquo;s
        intellectual property rights, {LEGAL.company}, not Apple, will be solely responsible for the investigation, defense,
        settlement and discharge of any such claim.
      </p>
    ),
  },
  {
    id: "compliance",
    title: "Legal compliance",
    body: (
      <p>
        You represent and warrant that (i) you are not located in a country that is subject to a U.S. Government embargo, or that
        has been designated by the U.S. Government as a &ldquo;terrorist supporting&rdquo; country; and (ii) you are not listed on
        any U.S. Government list of prohibited or restricted parties.
      </p>
    ),
  },
  {
    id: "third-party",
    title: "Third-party terms",
    body: (
      <p>
        You must comply with applicable third-party terms of agreement when using the App, such as your wireless data service
        agreement. Sign-in providers, maps and data sources used by the App have their own terms.
      </p>
    ),
  },
  {
    id: "beneficiary",
    title: "Third-party beneficiary",
    body: (
      <p>
        You and we acknowledge and agree that Apple and Apple&rsquo;s subsidiaries are third-party beneficiaries of this EULA,
        and that, upon your acceptance of this EULA, Apple will have the right (and will be deemed to have accepted the right) to
        enforce this EULA against you as a third-party beneficiary.
      </p>
    ),
  },
  {
    id: "termination",
    title: "Termination",
    body: (
      <p>
        This license lasts until it&rsquo;s ended by you or us. You can end it by deleting the App and your account. It ends
        automatically if you break this EULA. When it ends, you must stop using the App. Sections that by their nature should
        survive, such as warranty, liability and claims, survive.
      </p>
    ),
  },
  {
    id: "law",
    title: "Governing law",
    body: (
      <p>
        This EULA is governed by the laws of the State of {LEGAL.governingState}, without regard to its conflict of laws rules,
        except where the law of the place you live requires otherwise.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions, complaints or claims about the App: {LEGAL.company}, operating as {LEGAL.brand}
        {LEGAL.address ? <>, {LEGAL.address}</> : null}. Email <Mail />.
      </p>
    ),
  },
];

export default function Page() {
  return (
    <LegalPage
      title="End User License Agreement"
      intro={
        <p>
          The short version: the Milecast app is licensed to you, not sold. Milecast One renews until you cancel it in your Apple
          Account settings, and {LEGAL.company}, not Apple, stands behind the app.
        </p>
      }
      sections={sections}
    />
  );
}
