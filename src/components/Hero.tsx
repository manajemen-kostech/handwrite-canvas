import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import BlurText from "./BlurText";

const partners = ["Stripe", "Vercel", "Linear", "Notion", "Figma"];

export const Hero = () => {
  return (
    <section className="relative overflow-hidden" style={{ height: 1000 }}>
      <video
        autoPlay
        loop
        muted
        playsInline
        poster="/images/hero_bg.jpeg"
        className="absolute left-1/2 -translate-x-1/2 md:left-0 md:translate-x-0 h-auto object-contain z-0 -top-20 md:top-[20%] max-w-none w-[1280px] md:w-full"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4"
          type="video/mp4"
        />
      </video>

      <div className="absolute inset-0 bg-black/5 z-0 pointer-events-none" />
      <div
        className="absolute bottom-0 left-0 right-0 z-[2] pointer-events-none"
        style={{
          height: 400,
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.6) 50%, #000 100%)",
        }}
      />

      <div
        className="relative z-10 h-full flex flex-col items-center px-6 md:px-12 text-center"
        style={{ paddingTop: 150 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="liquid-glass rounded-full px-1 py-1 inline-flex items-center gap-2 mb-8"
        >
          <span className="bg-white text-black rounded-full px-3 py-1 text-xs font-semibold font-body">
            New
          </span>
          <span className="text-xs md:text-sm text-white/90 font-body font-light pr-3">
            Introducing AI-Powered Handwriting Analysis.
          </span>
        </motion.div>

        <BlurText
          text="Where Writing Speaks"
          delay={100}
          className="text-6xl md:text-7xl lg:text-[5.5rem] font-heading italic text-foreground leading-[0.8] max-w-2xl tracking-[-4px] mb-8"
          wordClassNames={{ Writing: "shadow-lg text-white" }}
        />


        <motion.div
          initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="flex items-center gap-4"
        >
          <button
            onClick={() =>
              document
                .getElementById("start")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="liquid-glass-strong rounded-full px-5 py-2.5 inline-flex items-center gap-2 text-white text-sm font-body font-medium"
          >
            Get Started
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </motion.div>

      </div>
    </section>
  );
};

export default Hero;
