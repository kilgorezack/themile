import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { LegalPage, LEGAL, Mail } from "@/components/legal/LegalPage";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  absoluteTitle: "Privacy Policy — Milecast",
  description: "What Milecast collects on the website and iOS app, why, who it's shared with, and how to delete it.",
  path: "/privacy",
});

const sections = [
  {
    id: "who",
    title: "Who we are",
    body: (
      <>
        <p>
          Milecast is operated by {LEGAL.company} (&ldquo;Milecast,&rdquo; &ldquo;we,&rdquo; &ldquo;us&rdquo;). This policy covers the
          website at {LEGAL.site} (also called The Mile) and the Milecast app for iPhone, together the &ldquo;Service.&rdquo; One
          account works across both.
        </p>
      </>
    ),
  },
  {
    id: "collect",
    title: "What we collect",
    body: (
      <>
        <h3>Information you give us</h3>
        <ul>
          <li>
            <strong>Account.</strong> Your email address and how you signed in (Google, Apple or email and password). If you use
            Sign in with Apple and choose &ldquo;Hide My Email,&rdquo; we only receive Apple&rsquo;s relay address. Passwords are
            handled by Google Cloud Platform; we never see or store them.
          </li>
          <li>
            <strong>Profile.</strong> Your first and last name, and, if you add one, a profile photo. In the app we crop the photo
            to a square and shrink it before uploading it.
          </li>
          <li>
            <strong>Fishing details (optional).</strong> How you fish (fly, spin or bait; wade, boat or bank), your experience, how
            often you fish the Mile, whether you guide, and the town you drive from.
          </li>
          <li>
            <strong>Preferences.</strong> Which alerts you want (flow changes, calm windows, lightning, weekend outlook) and your
            dashboard layout.
          </li>
          <li>
            <strong>Messages.</strong> Anything you send us by email.
          </li>
        </ul>

        <h3>Information collected automatically</h3>
        <ul>
          <li>
            <strong>Usage analytics.</strong> We use analytics from Google Cloud Platform to count visits, screens and features used,
            and an analytics service from Microsoft Corporation on the website to see how pages are used through heatmaps and
            session replays (clicks, scrolling and mouse movement). Text you type into forms is masked.
          </li>
          <li>
            <strong>Bot and abuse protection.</strong> The website uses Google reCAPTCHA, through Google Cloud Platform, to
            check that requests to sign-in and account services come from a real browser. reCAPTCHA collects hardware and
            software information, such as device and browser data, and sends it to Google for analysis. Google&rsquo;s{" "}
            <a href="https://policies.google.com/privacy">Privacy Policy</a> and{" "}
            <a href="https://policies.google.com/terms">Terms of Service</a> apply to it.
          </li>
          <li>
            <strong>Device and log data.</strong> Like most websites, the services that run Milecast receive
            your IP address, browser or device type, operating system, and pages requested.
          </li>
          <li>
            <strong>Subscription status.</strong> If you buy Milecast One through the App Store, Apple tells the app whether your
            subscription is active. Apple processes the payment; we never receive your card details.
          </li>
          <li>
            <strong>Location.</strong> If you allow it, the app&rsquo;s map shows where you are. Your location stays on your device;
            we don&rsquo;t collect or store it.
          </li>
          <li>
            <strong>On your device.</strong> The website stores your sign-in session and dashboard layout in your browser&rsquo;s
            local storage, and analytics tools set cookies or similar identifiers.
          </li>
        </ul>

        <p>
          River, weather and sky data on Milecast comes from public and third-party sources (a Tempest weather station,
          Weather Underground, the National Weather Service, the Bureau of Reclamation and USGS). Our servers fetch that data;
          your personal information is not sent to those sources.
        </p>
      </>
    ),
  },
  {
    id: "use",
    title: "How we use it",
    body: (
      <ul>
        <li>To create and secure your account and keep you signed in on the website and app.</li>
        <li>To show your name and photo, remember your dashboard, and unlock Milecast One features you&rsquo;ve paid for.</li>
        <li>To send the alerts you turn on, and only those.</li>
        <li>
          To tailor the Service to how you fish, for example highlighting conditions that matter for wading versus boating, and
          drive-time features based on where you drive from.
        </li>
        <li>To understand what&rsquo;s used and what&rsquo;s broken, and to improve the Service.</li>
        <li>To answer your messages, and to prevent abuse and meet legal obligations.</li>
      </ul>
    ),
  },
  {
    id: "share",
    title: "Who we share it with",
    body: (
      <>
        <p>
          <strong>We don&rsquo;t sell your personal information, share it for cross-context behavioral advertising, or show ads.</strong>{" "}
          We share information only with the providers that run parts of the Service for us, under their own terms and privacy
          policies:
        </p>
        <ul>
          <li>
            <strong>Google Cloud Platform</strong>: sign-in, your profile database, photo storage, analytics and reCAPTCHA bot protection.
          </li>
          <li>
            <strong>Google</strong> and <strong>Apple</strong>: if you sign in with them.
          </li>
          <li>
            <strong>Apple</strong>: App Store purchases and subscriptions, push notifications, and Apple Maps.
          </li>
          <li>
            <strong>Microsoft Corporation</strong>: website usage analytics.
          </li>
        </ul>
        <p>
          We may also disclose information if the law requires it, to protect people&rsquo;s safety or our rights, or as part of a
          merger or sale of the business, in which case this policy would continue to apply to it.
        </p>
      </>
    ),
  },
  {
    id: "keep",
    title: "How long we keep it",
    body: (
      <p>
        We keep your account and profile until you delete your account. Analytics data is kept for the retention period set
        with each analytics provider (up to 14 months; session replays are kept for up to 30 days). Server
        logs are kept only for a short time.
      </p>
    ),
  },
  {
    id: "choices",
    title: "Your choices and rights",
    body: (
      <>
        <ul>
          <li>
            <strong>Edit your profile</strong> anytime from Account in the app.
          </li>
          <li>
            <strong>Delete your account</strong> in the app under Account → Delete account, or email us at <Mail />. This
            permanently deletes your profile and photo. App Store subscriptions are managed and cancelled separately in your
            Apple account settings.
          </li>
          <li>
            <strong>Notifications</strong> can be turned off in the app or in your device&rsquo;s Settings.
          </li>
          <li>
            <strong>Location and photos</strong> are only used with your permission, which you can change in Settings.
          </li>
          <li>
            <strong>Analytics</strong> can be limited with your browser&rsquo;s tracking protection or content blockers.
          </li>
        </ul>
        <p>
          Depending on where you live (including California and other U.S. states, and the EU and UK), you may have the right
          to access, correct, delete or get a copy of your personal information, and to object to or restrict some uses. Email{" "}
          <Mail /> and we&rsquo;ll respond within the time the law requires. We won&rsquo;t treat you differently for using these rights.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children",
    body: (
      <p>
        Milecast isn&rsquo;t directed to children under 13, and we don&rsquo;t knowingly collect their personal information. If you believe
        a child has given us information, contact us and we&rsquo;ll delete it.
      </p>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <p>
        Data is encrypted in transit. Your profile and photo are protected by access rules so only you can change them. No
        system is perfectly secure, so we can&rsquo;t guarantee absolute security, but we&rsquo;ll notify you of a breach affecting your
        information as the law requires.
      </p>
    ),
  },
  {
    id: "international",
    title: "Where data is processed",
    body: (
      <p>
        Milecast is run from the United States, and our providers may process data in the U.S. and other countries. By using
        the Service you understand that your information will be processed there.
      </p>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <p>
        If we change this policy, we&rsquo;ll update the date at the top. If a change is significant, we&rsquo;ll tell you in the app or
        by email before it takes effect.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions or requests: <Mail />. {LEGAL.company}, operating as {LEGAL.brand}.
      </p>
    ),
  },
];

export default function Page() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          The short version: we collect what we need to run your account and send the alerts you ask for, we use analytics to make
          Milecast better, and we don&rsquo;t sell your data or show ads. You can delete your account anytime.
        </p>
      }
      sections={sections}
    />
  );
}
