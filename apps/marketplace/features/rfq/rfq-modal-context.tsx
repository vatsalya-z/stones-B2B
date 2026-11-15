"use client";

import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface RfqPrefilledData {
  supplier?: {
    id: string;
    name: string;
    slug: string;
    location: string;
  } | null;
  materialType?: string | null;
  stoneVariety?: string | null;
  quantity?: number | string | null;
  unit?: string | null;
  thickness?: string | null;
  finish?: string | null;
  dimensions?: string | null;
  deliveryLocation?: string | null;
  requiredDeliveryDate?: string | null;
  projectNotes?: string | null;
}

interface RfqModalContextValue {
  isOpen: boolean;
  prefilledData: RfqPrefilledData | null;
  openRfqModal: (data?: RfqPrefilledData) => void;
  closeRfqModal: () => void;
}

const RfqModalContext = createContext<RfqModalContextValue | null>(null);

export function RfqModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefilledData, setPrefilledData] = useState<RfqPrefilledData | null>(null);

  const openRfqModal = useCallback((data?: RfqPrefilledData) => {
    setPrefilledData(data ?? null);
    setIsOpen(true);
  }, []);

  const closeRfqModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <RfqModalContext.Provider value={{ isOpen, prefilledData, openRfqModal, closeRfqModal }}>
      {children}
    </RfqModalContext.Provider>
  );
}

const defaultFallback: RfqModalContextValue = {
  isOpen: false,
  prefilledData: null,
  openRfqModal: () => {},
  closeRfqModal: () => {},
};

export function useRfqModal(): RfqModalContextValue {
  const context = useContext(RfqModalContext);
  return context || defaultFallback;
}
