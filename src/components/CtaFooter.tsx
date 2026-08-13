export const CtaFooter = () => {
  return (
    <section id="cta" className="relative overflow-hidden bg-black">
      <div className="relative z-10 px-6 md:px-12 lg:px-20 pt-12 pb-12 max-w-6xl mx-auto">
        <footer className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-xs font-body">
            © 2026 Studio. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {["Privacy", "Terms", "Contact"].map((l) => (
              <a
                key={l}
                href="#"
                className="text-white/40 text-xs font-body hover:text-white/70 transition-colors"
              >
                {l}
              </a>
            ))}
          </div>
        </footer>
      </div>
    </section>
  );
};

export default CtaFooter;
