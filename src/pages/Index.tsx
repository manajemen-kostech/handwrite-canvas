import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";
import CtaFooter from "@/components/CtaFooter";

const Index = () => {
  return (
    <main className="bg-black min-h-screen overflow-x-hidden">
      <Navbar />
      <Hero />
      <Stats />
      <CtaFooter />
    </main>
  );
};

export default Index;
