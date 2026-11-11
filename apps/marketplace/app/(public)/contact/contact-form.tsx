"use client";
import { useActionState } from "react";
import { submitContactEnquiry, type ContactActionResult } from "@/features/auth/contact-actions";

const initialState: ContactActionResult = { success: false };

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactEnquiry, initialState);

  if (state.success) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 flex flex-col items-center justify-center gap-4 min-h-[220px] text-center">
        <div className="rounded-full bg-amber-50 p-4">
          <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-stone-900">Message Received</h2>
        <p className="text-sm text-stone-600 max-w-xs">
          Your message has been received. Our trade desk will respond within 1–2 business days.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 space-y-4">
      <h2 className="text-lg font-bold text-stone-900">Send an Inquiry</h2>
      <div className="space-y-3 text-xs text-stone-500">
        <p>
          For immediate procurement or bulk lot verification, our team can connect you directly with
          certified quarry representatives.
        </p>
      </div>
      {state.error && !state.fieldErrors && (
        <p className="text-xs text-red-600 font-medium">{state.error}</p>
      )}
      <form action={formAction} className="space-y-3 pt-2">
        <div>
          <input
            type="text"
            name="name"
            placeholder="Your Name"
            className="input-base text-sm"
            disabled={isPending}
            required
          />
          {state.fieldErrors?.name && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name}</p>
          )}
        </div>
        <div>
          <input
            type="email"
            name="email"
            placeholder="Work Email"
            className="input-base text-sm"
            disabled={isPending}
            required
          />
          {state.fieldErrors?.email && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.email}</p>
          )}
        </div>
        <div>
          <textarea
            rows={3}
            name="message"
            placeholder="How can we assist your project?"
            className="input-base text-sm"
            disabled={isPending}
            required
          />
          {state.fieldErrors?.message && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="btn-accent w-full text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? "Sending…" : "Submit Message"}
        </button>
      </form>
    </div>
  );
}
