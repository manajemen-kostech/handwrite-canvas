import { motion } from "motion/react";
import BlurText from "./BlurText";

const steps = [
  {
    n: "1.",
    title: "Create Your Free Account",
    body: "Sign up in seconds using your email address or mobile number.",
  },
  {
    n: "2.",
    title: "Connect Your Bank Accounts",
    body: "Securely link your bank accounts, cards, or digital wallets with ease.",
  },
  {
    n: "3.",
    title: "Set Your Financial Goals",
    body: "Customize your savings, spending, or investment goals with ease.",
  },
  {
    n: "4.",
    title: "Track, Grow, and Optimize",
    body: "Watch your money work for you in real time—get insights and tips.",
  },
];

export const WealthSection = () => {
  return (
    <section className="relative px-4 md:px-8 lg:px-12 py-24">
      <div className="relative liquid-glass rounded-3xl overflow-hidden mx-auto max-w-7xl min-h-[640px] md:min-h-[720px]">
        {/* Animated gradient arc */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Base radial glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="absolute -bottom-[40%] -right-[10%] w-[140%] h-[140%] rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(236,72,153,0.55) 0%, rgba(168,85,247,0.35) 30%, rgba(249,115,22,0.25) 50%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          {/* Curved light streaks */}
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, rotate: -25, scale: 0.6 }}
              whileInView={{ opacity: 1, rotate: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 1.6,
                delay: 0.2 + i * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute -bottom-[30%] -right-[20%] rounded-full border"
              style={{
                width: `${90 + i * 14}%`,
                height: `${90 + i * 14}%`,
                borderColor: "transparent",
                boxShadow: `0 0 ${60 + i * 10}px ${10 + i * 4}px rgba(${
                  [
                    "236,72,153",
                    "249,115,22",
                    "168,85,247",
                    "244,114,182",
                    "234,88,12",
                  ][i]
                }, ${0.45 - i * 0.06})`,
                borderWidth: "1.5px",
                borderTopColor: `rgba(${
                  ["255,180,210", "255,200,150", "220,170,255", "255,180,220", "255,160,120"][i]
                }, 0.7)`,
                borderLeftColor: `rgba(${
                  ["255,180,210", "255,200,150", "220,170,255", "255,180,220", "255,160,120"][i]
                }, 0.4)`,
                transform: "rotate(-15deg)",
              }}
            />
          ))}

          {/* Bright core highlight */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.8, delay: 0.6 }}
            className="absolute bottom-[10%] right-[15%] w-[300px] h-[300px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(236,72,153,0.3) 30%, transparent 70%)",
              filter: "blur(20px)",
            }}
          />
        </div>

        {/* Subtle dark overlay so text stays legible */}
        <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

        {/* Content */}
        <div className="relative z-10 px-6 md:px-12 lg:px-20 pt-20 pb-12 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-xs font-body font-medium text-white/80 tracking-[0.2em] uppercase mb-8"
          >
            Real-Time Budget Tracking
          </motion.div>

          <BlurText
            text="Build Wealth That Lasts Generations"
            delay={80}
            className="text-5xl md:text-6xl lg:text-7xl font-heading italic text-white leading-[0.9] tracking-tight max-w-3xl mb-8"
          />

          <motion.p
            initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
            whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-white/70 font-body font-light text-sm md:text-base max-w-md mb-10"
          >
            Transform today's earnings into tomorrow's family fortune with
            proven wealth-building strategies.
          </motion.p>

          <motion.a
            href="#"
            initial={{ filter: "blur(10px)", opacity: 0, y: 20 }}
            whileInView={{ filter: "blur(0px)", opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="bg-white text-black rounded-full px-7 py-3 text-sm font-body font-medium hover:bg-white/90 transition-colors"
          >
            Start Building Wealth
          </motion.a>

          {/* Steps */}
          <div className="mt-24 md:mt-32 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-6 w-full text-left">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{
                  duration: 0.7,
                  delay: 0.2 + i * 0.15,
                  ease: "easeOut",
                }}
              >
                <div className="text-white font-body font-medium text-sm mb-2">
                  <span className="text-white/60 mr-1">{s.n}</span>
                  {s.title}
                </div>
                <p className="text-white/50 font-body font-light text-xs leading-relaxed">
                  {s.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WealthSection;
