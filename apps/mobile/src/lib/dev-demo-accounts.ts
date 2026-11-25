export interface DevQaAccount {
  label: string;
  subtitle: string;
  email: string;
  password: string;
  expectedWorkspace: "buyer" | "seller";
}

export const DEV_QA_ACCOUNTS: Record<"buyer" | "seller", DevQaAccount> = {
  buyer: {
    label: "One-Click Buyer Login",
    subtitle: "Aarav Mehta · Buyer Sourcing Marketplace",
    email: "buyer.qa@stonesdekho.com",
    password: "StoneBuyer#2026",
    expectedWorkspace: "buyer",
  },
  seller: {
    label: "One-Click Seller Login",
    subtitle: "Rathore Heritage Quarries · Supplier Portal",
    email: "seller.qa@stonesdekho.com",
    password: "StoneSeller#2026",
    expectedWorkspace: "seller",
  },
};
