"use client";

import React, { type ReactNode } from "react";
import { RfqModalProvider } from "./rfq-modal-context";
import { RFQModal } from "./rfq-modal";

export function RfqModalWrapper({ children }: { children: ReactNode }) {
  return (
    <RfqModalProvider>
      {children}
      <RFQModal />
    </RfqModalProvider>
  );
}
