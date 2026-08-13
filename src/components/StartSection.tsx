import { ArrowUpRight } from "lucide-react";
import HlsVideo from "./HlsVideo";

export const StartSection = () => {
  return (
    <section id="start" className="relative overflow-hidden">
      <HlsVideo
        src="https://stream.mux.com/9JXDljEVWYwWu01PUkAemafDugK89o01BR6zqJ3aS9u00A.m3u8"
        className="absolute inset-0 w-full h-full object-cover z-0"
      />
      <div
        className="absolute top-0 left-0 right-0 z-[1] pointer-events-none"
        style={{ height: 200, background: "linear-gradient(to bottom, #000, transparent)" }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 z-[1] pointer-events-none"
        style={{ height: 200, background: "linear-gradient(to top, #000, transparent)" }}
      />

      <div
        className="relative z-10 flex flex-col items-center justify-center text-center px-6 md:px-12 py-32"
        style={{ minHeight: 500 }}
      >
        <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white font-body mb-6">
          How It Works
        </div>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading italic text-white tracking-tight leading-[0.9] max-w-3xl mb-6">
          You dream it. We ship it.
        </h2>
        <p className="text-white/60 font-body font-light text-sm md:text-base max-w-xl mb-8">
          Share your vision. Our AI handles the rest—wireframes, design, code,
          launch. All in days, not quarters.
        </p>
        <a
          href="#cta"
          className="liquid-glass-strong rounded-full px-6 py-3 inline-flex items-center gap-2 text-white text-sm font-body font-medium"
        >
          Get Started
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
};

export default StartSection;
