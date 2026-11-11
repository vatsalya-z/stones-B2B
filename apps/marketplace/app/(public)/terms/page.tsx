import type { Metadata } from "next";
import { Breadcrumb, SectionHeading } from "@stone/ui";

export const metadata: Metadata = {
  title: "Terms of Service — StonesDekho",
  description: "Terms and conditions governing the use of the StonesDekho marketplace platform.",
  openGraph: {
    title: "Terms of Service — StonesDekho",
    description: "Terms and conditions governing the use of the StonesDekho marketplace platform.",
    type: "website",
  },
};

export default function TermsPage() {
  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <div className="container-narrow space-y-8">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Terms of Service" },
          ]}
        />
        <SectionHeading
          title="Terms of Service"
          subtitle="Legal terms and commercial standards for buyers and sellers on StonesDekho."
        />

        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 space-y-6 text-sm text-stone-600 leading-relaxed">
          <p className="text-xs text-stone-400">Last updated: October 2026</p>

          {/* Section 1 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">1. Acceptance of Terms</h2>
            <p>
              By accessing, registering for, or using the StonesDekho platform (&ldquo;Platform&rdquo;),
              you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;) and all applicable
              laws and regulations. If you do not accept these Terms in full, you must immediately
              discontinue use of the Platform. StonesDekho reserves the right to amend these Terms at any
              time; continued use of the Platform after publication of changes constitutes acceptance.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">
              2. Platform Purpose &amp; Eligibility
            </h2>
            <p>
              StonesDekho is a business-to-business (B2B) digital marketplace for the natural stone and
              architectural surface industry. The Platform is intended exclusively for registered
              business entities including manufacturers, quarry owners, export houses, architects,
              contractors, and wholesalers. Individual consumers may not register or transact on the
              Platform. You must be at least 18 years of age and have the authority to bind your
              business entity to these Terms.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">
              3. Supplier Listings &amp; Accuracy
            </h2>
            <p>
              Suppliers are solely responsible for the accuracy, completeness, and legality of all
              listing content including material classification, dimensions, finish, origin, and pricing.
              Misrepresentation of stone type, quality grade, quarry origin, or certification status is
              a material breach of these Terms and will result in immediate suspension of the supplier
              account. StonesDekho does not independently verify the physical properties of each listed
              product but reserves the right to audit listings and request supporting documentation at
              any time.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">4. Buyer Obligations</h2>
            <p>
              Buyers must ensure that submitted Requests for Quotation (RFQs) reflect genuine
              procurement intent. Speculative or fictitious enquiries intended to extract pricing
              intelligence without commercial interest are prohibited. Buyers must treat all quotation
              data received from suppliers as confidential and may not share it with third parties
              without the supplier&apos;s written consent. Buyers are responsible for conducting their
              own due diligence on materials prior to order confirmation.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">
              5. Request for Quotation (RFQ) Process
            </h2>
            <p>
              The RFQ workflow on StonesDekho facilitates direct communication and commercial negotiation
              between buyers and suppliers. An RFQ submission does not constitute a binding purchase
              order. A legally binding commitment arises only upon both parties&apos; written
              confirmation of quantity, price, payment terms, and delivery specifications outside the
              Platform or through any future order management module explicitly designated as binding.
              StonesDekho is not a party to any transaction concluded through the Platform.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">
              6. Payment, Pricing &amp; Commercial Terms
            </h2>
            <p>
              All prices displayed are indicative and subject to revision by the supplier at time of
              quotation. Taxes, freight, insurance, customs duties, and applicable GST are the
              responsibility of the respective parties as agreed in the transaction. StonesDekho does not
              process payments between buyers and suppliers and bears no liability for payment disputes,
              non-delivery, or short shipment. Dispute resolution between trading parties is governed
              by the agreed commercial terms and applicable law.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">7. Verification &amp; Identity</h2>
            <p>
              All registered businesses are subject to identity verification including, where
              applicable, GST registration number validation, export-import code (IEC) verification,
              and factory or quarry licensing checks. Providing false or forged documentation is a
              serious breach and may result in permanent account termination and referral to relevant
              authorities. StonesDekho may request updated documentation periodically to maintain
              verification status.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">8. Intellectual Property</h2>
            <p>
              The StonesDekho name, logo, platform interface, and all original content created by
              StonesDekho are protected by applicable intellectual property laws and remain the exclusive
              property of StonesDekho. Suppliers grant StonesDekho a non-exclusive, royalty-free licence to
              display their listed product images, descriptions, and specifications solely for the
              purpose of operating the Platform. You may not reproduce, distribute, or create
              derivative works from Platform content without prior written permission.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">
              9. Disclaimers &amp; Limitation of Liability
            </h2>
            <p>
              The Platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis.
              StonesDekho makes no representations or warranties of any kind, express or implied, regarding
              the accuracy of listings, the suitability of materials for any specific application, or
              the creditworthiness of any platform participant. To the maximum extent permitted by
              applicable law, StonesDekho shall not be liable for any indirect, incidental, consequential,
              or punitive damages arising from use of or inability to use the Platform, even if advised
              of the possibility of such damages. StonesDekho&apos;s total aggregate liability to any
              party shall not exceed the subscription fees paid by that party in the preceding three
              months.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">10. Governing Law (India)</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of the
              Republic of India. Any disputes arising out of or in connection with these Terms shall be
              subject to the exclusive jurisdiction of courts located in the State of Rajasthan, India.
              The parties agree to attempt good-faith mediation before initiating formal legal
              proceedings.
            </p>
          </section>

          {/* Section 11 */}
          <section className="space-y-2">
            <h2 className="text-base font-bold text-stone-900">11. Contact &amp; Disputes</h2>
            <p>
              For questions regarding these Terms or to raise a platform dispute, contact us at{" "}
              <span className="text-amber-600 font-medium">support@stonesdekho.com</span>. Disputes
              between buyers and suppliers must first be reported to the StonesDekho trade desk, which
              will endeavour to facilitate resolution within 10 business days. StonesDekho reserves the
              right to suspend accounts of either party during an active dispute investigation.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
