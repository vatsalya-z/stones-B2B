import { FileText, Calculator, GitCompare, ShieldCheck, ArrowRight } from 'lucide-react';

interface StepItem {
  step: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepItem[] = [
  {
    step: '01',
    title: 'Share Requirement',
    description: 'Tell us your stone, quantity and project need.',
    icon: FileText,
  },
  {
    step: '02',
    title: 'Get Multiple Quotes',
    description: 'Receive competitive quotes from verified suppliers.',
    icon: Calculator,
  },
  {
    step: '03',
    title: 'Evaluate & Select',
    description: 'Compare price, quality, lead time and supplier profile.',
    icon: GitCompare,
  },
  {
    step: '04',
    title: 'Source with Confidence',
    description: 'Finalize and source directly from verified suppliers.',
    icon: ShieldCheck,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-16 sm:py-20 bg-stone-50/70 border-b border-stone-200/80 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-serif">
            How StonesDekho Works
          </h2>
          <p className="mt-2 text-sm sm:text-base text-stone-600">
            A simple, transparent and B2B-focused process to source natural stone for any scale of project.
          </p>
        </div>

        {/* 4 Steps Flow */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {STEPS.map((item, index) => {
            const Icon = item.icon;
            const isLast = index === STEPS.length - 1;

            return (
              <div key={item.step} className="relative flex flex-col items-center text-center group">
                {/* Connecting arrow (desktop only) */}
                {!isLast && (
                  <div
                    aria-hidden="true"
                    className="hidden md:flex absolute top-7 left-[calc(50%+2.5rem)] right-[calc(-50%+2.5rem)] items-center justify-center pointer-events-none"
                  >
                    <div className="w-full border-t border-dashed border-stone-300 relative">
                      <ArrowRight className="w-3.5 h-3.5 text-stone-400 absolute right-0 top-1/2 -translate-y-1/2 translate-x-1" />
                    </div>
                  </div>
                )}

                {/* Step Icon Badge */}
                <div className="relative mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-stone-200 shadow-sm flex items-center justify-center text-amber-700 group-hover:border-amber-500 group-hover:bg-amber-50/60 group-hover:shadow transition-all duration-300">
                    <Icon className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-stone-900 text-amber-300 text-[11px] font-bold flex items-center justify-center font-mono shadow-sm">
                    {item.step}
                  </span>
                </div>

                {/* Text Content */}
                <h3 className="text-base sm:text-lg font-bold text-stone-900 mb-1.5 font-serif">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-[240px]">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
