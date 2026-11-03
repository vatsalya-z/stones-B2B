import type { Metadata } from "next";
import { Breadcrumb, SectionHeading } from "@stone/ui";

export const metadata: Metadata = {
  title: "Privacy Policy — StonesDekho",
  description: "StonesDekho Privacy Policy detailing data handling and compliance.",
  openGraph: {
    title: "Privacy Policy — StonesDekho",
    description: "StonesDekho Privacy Policy detailing data handling and compliance.",
    type: "website",
  },
};

export default function PrivacyPage() {
  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <div className="container-narrow space-y-8">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Privacy Policy" },
          ]}
        />
        <SectionHeading
          title="Privacy Policy"
          subtitle="How we collect, protect, and process user and business data."
        />

        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 space-y-6 text-sm text-stone-600 leading-relaxed">
          <p className="text-xs text-stone-400">Last updated: October 2026</p>

          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">1. Information We Collect</h2>
            <p>
              We collect three categories of data to operate the StonesDekho platform:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                <strong className="text-stone-800">Account Data:</strong> Full name, business email
                address, password hash, account type (buyer or supplier), and profile settings.
              </li>
              <li>
                <strong className="text-stone-800">Business Data:</strong> Company name, GST
                identification number (GSTIN), export-import code (IEC), registered business address,
                quarry or factory documentation submitted during verification, and trade correspondence
                conducted through the Platform.
              </li>
              <li>
                <strong className="text-stone-800">Usage Data:</strong> Pages visited, search queries,
                RFQs submitted or received, session timestamps, device type, and browser information
                collected automatically to improve platform performance.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">2. How We Use Your Information</h2>
            <p>We use the information collected to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>Create and manage your business account and verify eligibility.</li>
              <li>Enable RFQ workflows, messaging, and trade between buyers and suppliers.</li>
              <li>Perform supplier identity and compliance verification.</li>
              <li>Send transactional notifications related to your platform activity.</li>
              <li>Detect fraud, abuse, and misrepresentation on the Platform.</li>
              <li>Comply with legal and regulatory obligations under Indian law.</li>
              <li>Improve platform features and resolve technical issues.</li>
            </ul>
            <p>
              We do not use your data for automated decision-making that produces legal effects without
              human review.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">3. Data Sharing</h2>
            <p>
              We share data only where necessary to facilitate legitimate transactions:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                <strong className="text-stone-800">With Platform Participants:</strong> When a buyer
                submits an RFQ, the buyer&apos;s business name and contact details are shared with the
                relevant supplier solely to fulfil that enquiry.
              </li>
              <li>
                <strong className="text-stone-800">With Infrastructure Providers:</strong> We use
                Supabase for database and authentication services; data is stored within their
                cloud infrastructure under strict security controls.
              </li>
              <li>
                <strong className="text-stone-800">Legal Requirement:</strong> We may disclose data
                if required by a court order, regulatory authority, or applicable law.
              </li>
            </ul>
            <p className="font-medium text-stone-700">
              We never sell or share your data with third-party advertisers, data brokers, or marketing
              platforms.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">4. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                <strong className="text-stone-800">Row-Level Security (RLS):</strong> All database
                tables are protected by Supabase RLS policies ensuring each account can only access
                its own records unless explicitly permitted.
              </li>
              <li>
                <strong className="text-stone-800">Encryption at Rest:</strong> Sensitive data
                including verification documents, GSTIN records, and account credentials are encrypted
                at rest within the database.
              </li>
              <li>
                <strong className="text-stone-800">Encryption in Transit:</strong> All data transmitted
                between your browser and our servers uses TLS (HTTPS).
              </li>
              <li>
                <strong className="text-stone-800">Access Controls:</strong> Internal platform access
                is role-restricted; only authorised personnel with a legitimate operational need may
                access account or business data.
              </li>
            </ul>
            <p>
              Despite these measures, no system is completely immune to security incidents. We will
              notify affected users promptly in the event of a confirmed data breach.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">5. Data Retention</h2>
            <p>
              We retain your account and business data for the duration of your active account and for
              a minimum of 3 years following account closure to comply with applicable Indian tax and
              commercial record-keeping regulations. Verification documents submitted during KYC are
              retained for 5 years. Usage logs and session data are retained for up to 12 months.
              You may request earlier deletion subject to our legal obligations.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">6. Your Rights</h2>
            <p>As a registered business user, you have the right to:</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li>
                <strong className="text-stone-800">Access:</strong> Request a copy of the personal and
                business data we hold about you.
              </li>
              <li>
                <strong className="text-stone-800">Correction:</strong> Request correction of any
                inaccurate or incomplete data.
              </li>
              <li>
                <strong className="text-stone-800">Deletion:</strong> Request deletion of your account
                and associated data, subject to our legal retention obligations.
              </li>
              <li>
                <strong className="text-stone-800">Portability:</strong> Request your data in a
                structured, machine-readable format.
              </li>
              <li>
                <strong className="text-stone-800">Objection:</strong> Object to processing of your
                data for purposes other than core platform operations.
              </li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <span className="text-amber-600 font-medium">support@stonesdekho.com</span>.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">7. Cookies &amp; Session Storage</h2>
            <p>
              The Platform uses essential cookies and session tokens required for authentication and
              secure session management. These are strictly necessary for the Platform to function and
              cannot be disabled without preventing login. We do not use tracking cookies, advertising
              cookies, or third-party analytics cookies. Browser local storage may be used to preserve
              form state and user preferences during your session.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">8. Children&apos;s Privacy</h2>
            <p>
              StonesDekho is a B2B platform intended exclusively for business entities and their
              authorised representatives who are 18 years of age or older. We do not knowingly collect
              personal data from anyone under 18. If we become aware that data has been submitted by a
              minor, it will be deleted promptly. If you believe a minor has registered on the
              Platform, please contact us immediately.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically to reflect changes in platform features,
              legal requirements, or data practices. We will publish the updated policy on this page
              with a revised &ldquo;Last updated&rdquo; date. For material changes, we will notify
              registered users by email or platform notification. Continued use of the Platform after
              notification constitutes acceptance of the revised policy.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">
              10. Contact for Privacy Requests
            </h2>
            <p>
              For all privacy-related requests, questions, or concerns — including data access,
              correction, deletion, and breach reporting — contact our data team at:
            </p>
            <p className="font-medium text-stone-800">
              Email:{" "}
              <span className="text-amber-600">support@stonesdekho.com</span>
            </p>
            <p>
              StonesDekho Platform Operations
              <br />
              RIICO Industrial Area, Stone Park
              <br />
              Jaipur, Rajasthan — 302022, India
            </p>
            <p>
              We aim to respond to all privacy requests within 10 business days.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
