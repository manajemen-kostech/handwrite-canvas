import { ArrowUpRight } from "lucide-react";
import feature1 from "@/assets/feature-1.gif";
import feature2 from "@/assets/feature-2.gif";

const rows = [
  {
    reverse: false,
    title: "Designed to convert. Built to perform.",
    body: "Every pixel is intentional. Our AI studies what works across thousands of top sites—then builds yours to outperform them all.",
    cta: "Learn more",
    gif: feature1,
  },
  {
    reverse: true,
    title: "It gets smarter. Automatically.",
    body: "Your site evolves on its own. AI monitors every click, scroll, and conversion—then optimizes in real time. No manual updates. Ever.",
    cta: "See how it works",
    gif: feature2,
  },
];

export const FeaturesChess = () => {
  return (
    <section className="relative px-6 md:px-12 lg:px-20 py-32 max-w-7xl mx-auto">
      <div className="flex flex-col items-center text-center mb-20">
        <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body mb-6">
          Capabilities
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9] max-w-3xl">
          Pro features. Zero complexity.
        </h2>
      </div>

      <div className="space-y-24">
        {rows.map((row, i) => (
          <div
            key={i}
            className={`flex flex-col ${
              row.reverse ? "lg:flex-row-reverse" : "lg:flex-row"
            } items-center gap-12 lg:gap-20`}
          >
            <div className="flex-1 max-w-xl">
              <h3 className="text-3xl md:text-4xl lg:text-5xl font-heading italic text-white leading-[0.95] tracking-tight mb-6">
                {row.title}
              </h3>
              <p className="text-white/60 font-body font-light text-sm md:text-base mb-8">
                {row.body}
              </p>
              <a
                href="#"
                className="liquid-glass-strong rounded-full px-5 py-2.5 inline-flex items-center gap-2 text-white text-sm font-body font-medium"
              >
                {row.cta}
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>

            <div className="flex-1 w-full">
              <div className="liquid-glass rounded-2xl overflow-hidden aspect-[4/3]">
                <img
                  src={row.gif}
                  alt={row.title}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturesChess;
