import Link from "next/link";

function LinkedInIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

const FOOTER_LINKS = {
  marketplace: [
    { label: "Stone Products", href: "/products" },
    { label: "Verified Suppliers", href: "/suppliers" },
    { label: "Categories Hub", href: "/categories" },
    { label: "Request a Quote", href: "/request-quote" },
    { label: "How It Works", href: "/#how-it-works" },
  ],
  sellers: [
    { label: "Sell on StonesDekho", href: "/register/seller" },
    { label: "Seller Dashboard", href: "/seller/dashboard" },
    { label: "Storefront Settings", href: "/seller/store" },
    { label: "Supplier Verification", href: "/seller/verification" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Contact Trade Desk", href: "/contact" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-stone-900 text-stone-300 print:hidden">
      {/* Main footer grid */}
      <div className="container-wide py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-white transition-opacity hover:opacity-80"
              aria-label="StonesDekho homepage"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-6 w-6 text-amber-500"
                aria-hidden="true"
              >
                <path d="M12.378 1.602a.75.75 0 0 0-.756 0L3 6.632l9 5.25 9-5.25-8.622-5.03ZM21.75 7.93l-9 5.25v9l8.628-5.032a.75.75 0 0 0 .372-.648V7.93ZM11.25 22.18v-9l-9-5.25v8.57a.75.75 0 0 0 .372.648l8.628 5.033Z" />
              </svg>
              <span className="text-lg font-bold tracking-tight">
                Stones<span className="text-amber-500">Dekho</span>
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-stone-400">
              Premium B2B Natural Stone Marketplace. Connecting India&apos;s finest stone
              producers with architects, builders and traders worldwide.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-800 text-stone-400 transition-colors hover:bg-stone-700 hover:text-white"
                aria-label="StonesDekho on LinkedIn"
              >
                <LinkedInIcon />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-800 text-stone-400 transition-colors hover:bg-stone-700 hover:text-white"
                aria-label="StonesDekho on Instagram"
              >
                <InstagramIcon />
              </a>
            </div>
          </div>

          {/* Column 2: Marketplace */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-200">
              Marketplace
            </h3>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.marketplace.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-400 transition-colors hover:text-stone-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: For Sellers */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-200">
              For Sellers
            </h3>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.sellers.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-400 transition-colors hover:text-stone-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Company */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-stone-200">
              Company
            </h3>
            <ul className="space-y-2.5">
              {FOOTER_LINKS.company.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  <Link
                    href={link.href}
                    className="text-sm text-stone-400 transition-colors hover:text-stone-100"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-stone-800">
        <div className="container-wide flex flex-col items-center justify-between gap-3 py-5 text-sm text-stone-500 sm:flex-row">
          <p>
            © {year} StonesDekho. All rights reserved. Made with ❤️ in{" "}
            <span role="img" aria-label="India">
              🇮🇳
            </span>{" "}
            India.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="transition-colors hover:text-stone-300">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-stone-300">
              Terms
            </Link>
            <Link href="/sitemap.xml" className="transition-colors hover:text-stone-300">
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
