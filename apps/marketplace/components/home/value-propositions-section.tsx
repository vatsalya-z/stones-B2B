import { Layers, ShieldCheck, Scale, Headphones } from 'lucide-react';

interface PropItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PROPOSITIONS: PropItem[] = [
  {
    id: 'bulk-pricing',
    title: 'Bulk & Project Quotes',
    description: 'Get volume pricing tailored for large quantities and multi-phase builds.',
    icon: Scale,
  },
  {
    id: 'verified-supply',
    title: 'Verified Supply Chain',
    description: 'Trade only with screened, GST & IEC verified quarries and processors.',
    icon: ShieldCheck,
  },
  {
    id: 'material-range',
    title: 'Wide Material Selection',
    description: 'Marble, granite, sandstone, limestone, quartzite, slate & specialty stones.',
    icon: Layers,
  },
  {
    id: 'project-support',
    title: 'Project Support',
    description: 'Dedicated procurement assistance from specification to on-site delivery.',
    icon: Headphones,
  },
];

export function ValuePropositionsSection() {
  return (
    <section className="py-16 sm:py-20 bg-[#FAF8F5] border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 font-serif">
            Built for Importers, Architects & Contractors
          </h2>
          <p className="mt-2 text-sm sm:text-base text-stone-600">
            Tools and support designed for large, recurring and project-based stone procurement.
          </p>
        </div>

        {/* 4 Feature Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PROPOSITIONS.map((prop) => {
            const Icon = prop.icon;

            return (
              <div
                key={prop.id}
                className="bg-white rounded-xl p-6 border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow group flex flex-col"
              >
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300">
                  <Icon className="w-5 h-5 stroke-[1.8]" />
                </div>
                <h3 className="text-base font-bold text-stone-900 mb-1.5 font-serif">
                  {prop.title}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                  {prop.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

