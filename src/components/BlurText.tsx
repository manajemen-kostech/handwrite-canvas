import { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "motion/react";

interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  wordClassNames?: Record<string, string>;
}

export const BlurText = ({
  text,
  delay = 200,
  className = "",
  animateBy = "words",
  direction = "bottom",
  wordClassNames,
}: BlurTextProps) => {
  const elements = useMemo(
    () => (animateBy === "words" ? text.split(" ") : text.split("")),
    [text, animateBy]
  );
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const fromY = direction === "bottom" ? 50 : -50;

  return (
    <p ref={ref} className={className}>
      {elements.map((el, i) => (
        <motion.span
          key={i}
          className={`inline-block will-change-[transform,filter,opacity] ${
            wordClassNames?.[el] ?? ""
          }`}
          initial={{ filter: "blur(10px)", opacity: 0, y: fromY }}
          animate={
            inView
              ? {
                  filter: ["blur(10px)", "blur(5px)", "blur(0px)"],
                  opacity: [0, 0.5, 1],
                  y: [fromY, -5, 0],
                }
              : {}
          }
          transition={{
            duration: 0.7,
            times: [0, 0.5, 1],
            ease: "easeOut",
            delay: (i * delay) / 1000,
          }}
        >
          {el === " " ? "\u00A0" : el}
          {animateBy === "words" && i < elements.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </p>
  );
};

export default BlurText;
