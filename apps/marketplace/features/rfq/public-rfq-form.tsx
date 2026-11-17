"use client";

import React from "react";
import { SharedRfqForm } from "./shared-rfq-form";

export interface PublicRfqFormProps {
  supplier?: {
    id: string;
    name: string;
    slug: string;
    location: string;
  } | null;
  initialUserName?: string | null;
  initialUserEmail?: string | null;
  prefilledMaterial?: string | null;
  prefilledProduct?: string | null;
}

export function PublicRfqForm({
  supplier = null,
  initialUserName = "",
  initialUserEmail = "",
  prefilledMaterial = "",
  prefilledProduct = "",
}: PublicRfqFormProps) {
  return (
    <SharedRfqForm
      supplier={supplier}
      initialUserName={initialUserName}
      initialUserEmail={initialUserEmail}
      initialData={{
        materialType: prefilledMaterial,
        stoneVariety: prefilledProduct,
      }}
      isModal={false}
    />
  );
}

export { SharedRfqForm };
