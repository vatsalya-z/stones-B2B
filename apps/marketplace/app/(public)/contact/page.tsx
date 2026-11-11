import type { Metadata } from "next";
import { Breadcrumb, SectionHeading } from "@stone/ui";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: "Contact Us — StonesDekho",
  description:
    "Get in touch with the StonesDekho team for support, platform inquiries, or supplier onboarding assistance.",
  openGraph: {
    title: "Contact Us — StonesDekho",
    description:
      "Get in touch with the StonesDekho team for support, platform inquiries, or supplier onboarding assistance.",
    type: "website",
  },
};

export default function ContactPage() {
  return (
    <div className="section-pad bg-stone-50 min-h-screen">
      <div className="container-narrow space-y-8">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Contact Us" },
          ]}
        />
        <SectionHeading
          title="Contact Our Trade Desk"
          subtitle="Assisting architects, builders, and stone exporters with enterprise sourcing."
        />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 space-y-6">
            <h2 className="text-lg font-bold text-stone-900">Headquarters</h2>
            <div className="space-y-3 text-sm text-stone-600">
              <p className="font-semibold text-stone-900">StonesDekho Platform Operations</p>
              <p>RIICO Industrial Area, Stone Park</p>
              <p>Jaipur, Rajasthan — 302022, India</p>
              <p className="pt-2">
                Email:{" "}
                <span className="text-amber-600 font-medium">trade@stonesdekho.com</span>
              </p>
              <p>
                Support:{" "}
                <span className="text-amber-600 font-medium">support@stonesdekho.com</span>
              </p>
            </div>
          </div>

          <ContactForm />
        </div>
      </div>
    </div>
  );
}
