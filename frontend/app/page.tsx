"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Activity, ShieldAlert, Car, Leaf, BarChart3, Clock, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

const features = [
  {
    title: "Live Intersections",
    description: "AI-generated bounding boxes for vehicle classification over 4K intersection feeds in real-time.",
    icon: Activity,
    color: "text-blue-400",
  },
  {
    title: "Incident Preemption",
    description: "Automated overrides of traffic lights to instantly clear paths for emergency response vehicles.",
    icon: ShieldAlert,
    color: "text-red-400",
  },
  {
    title: "Parking Intelligence",
    description: "Real-time spot tracking showing available, occupied, and overstay violations dynamically.",
    icon: Car,
    color: "text-emerald-400",
  },
  {
    title: "Environmental Analytics",
    description: "AQI monitoring combined with carbon emissions offsets estimation per congestion level.",
    icon: Leaf,
    color: "text-green-400",
  },
  {
    title: "Queue Forecasting",
    description: "Continuous estimation of queue lengths using predictive AI to optimize green light duration.",
    icon: Clock,
    color: "text-purple-400",
  },
  {
    title: "Automated Reports",
    description: "Filterable grids and exported insights covering efficiency and violation spikes system-wide.",
    icon: BarChart3,
    color: "text-orange-400",
  },
];

const stats = [
  { value: "30%", label: "Wait Time Reduction" },
  { value: "5s", label: "Emergency Preemption" },
  { value: "100+", label: "Crossroads Monitored" },
  { value: "24/7", label: "Automated Violation Tracing" },
];

export default function Home() {
  const sectionRef = useRef<HTMLDivElement>(null);

  // Parallax Scroll Effects
  const { scrollYProgress: heroScrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // y: [0, -200] and opacity: [1, 0] (fades over first 50% of scroll)
  const heroTextY = useTransform(heroScrollYProgress, [0, 1], [0, -200]);
  const heroTextOpacity = useTransform(heroScrollYProgress, [0, 0.5], [1, 0]);

  // Keep the dashboard anchored in the scene and let it drift down slightly
  // so the glass HUD reads as attached to the panel instead of floating up.
  const dashboardY = useTransform(heroScrollYProgress, [0, 1], [0, 140]);

  // Section 2 scroll-driven reveal
  const testimonialRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: testimonialScrollYProgress } = useScroll({
    target: testimonialRef,
    offset: ["start end", "end center"],
  });

  const testimonialText =
    "Verge transformed our city's traffic flow overnight. Commute times dropped by 30%, and emergency response is faster than ever! Verge is the ultimate upgrade to urban mobility.";
  const testimonialWords = testimonialText.split(" ");

  return (
    <main className="flex-1 bg-background overflow-hidden relative">
      {/* Section 1: Hero */}
      <section
        ref={sectionRef}
        className="relative min-h-screen flex flex-col overflow-x-hidden will-change-transform pb-20"
      >
        {/* Navbar */}
        <nav className="relative z-50 flex items-center justify-between px-8 md:px-28 py-4 w-full">
          <div className="flex items-center gap-12 md:gap-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/5 transition-transform group-hover:scale-105">
                <Image
                  src="/verge-logo.png"
                  alt="Verge Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                Verge
              </span>
            </Link>

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-1 text-sm font-medium text-muted-foreground">
              <Link
                href="/"
                className="px-3 py-2 hover:text-foreground transition-colors rounded-md hover:bg-white/5"
              >
                Home
              </Link>
              <Link
                href="#"
                className="flex items-center px-3 py-2 hover:text-foreground transition-colors rounded-md hover:bg-white/5 group"
              >
                Features{" "}
                <ChevronDown className="ml-1 w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="/dashboard"
                className="px-3 py-2 text-blue-400 hover:text-blue-300 transition-colors rounded-md hover:bg-white/5 flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                Live Dashboard
              </Link>
              <Link
                href="mailto:contact@verge.city"
                className="px-3 py-2 hover:text-foreground transition-colors rounded-md hover:bg-white/5"
              >
                Contact us
              </Link>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          >
            Launch System
          </Link>
        </nav>

        {/* Hero Content */}
        <motion.div
          style={{ y: heroTextY, opacity: heroTextOpacity }}
          className="relative z-40 flex flex-col items-center text-center mt-16 md:mt-20 px-4 flex-1 pointer-events-none"
        >
          {/* Tag Pill */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0 }}
            className="liquid-glass flex items-center gap-2 px-3 py-2 rounded-lg mb-6 pointer-events-auto"
          >
            <span className="bg-foreground text-background rounded-md text-sm font-medium px-2 py-0.5">
              New
            </span>
            <span className="text-sm font-medium text-muted-foreground mr-1">
              Verge Core v1.0 Live
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-7xl tracking-[-2px] font-medium leading-[1.15] mb-3 text-foreground"
          >
            Flow Optimized.
            <br />
            City{" "}
            <span className="font-serif italic font-normal pr-1">
              Synchronized.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg font-normal leading-6 opacity-90 mb-8 max-w-lg text-[var(--color-hero-subtitle)]"
          >
            Verge sees traffic, predicts congestion, and adapts signals
            <br />
            dynamically to eliminate wait times and save lives.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
              duration: 0.6,
              delay: 0.3,
            }}
            className="flex gap-4 pointer-events-auto"
          >
            <Link
              href="/dashboard"
              className="bg-foreground text-background rounded-full px-8 py-3.5 text-base font-medium shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.4)] transition-all hover:scale-105 active:scale-95"
            >
              View Live Dashboard
            </Link>
            <Link
              href="#"
              className="bg-white/10 hover:bg-white/20 text-foreground rounded-full px-8 py-3.5 text-base font-medium transition-all hover:scale-105 active:scale-95 backdrop-blur-md"
            >
              Learn More
            </Link>
          </motion.div>
        </motion.div>

        {/* Dashboard + Video Area */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative w-screen aspect-video ml-[calc(-50vw+50%)] mt-12 md:mt-20 z-0 overflow-hidden"
        >
          {/* We ensure video has correct sizing constraint within its aspect ratio */}
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4"
          />
          {/* Optional subtlety over the video to reduce pure white clashes with UI */}
          <div className="absolute inset-0 bg-background/20 backdrop-blur-[2px]"></div>

          <motion.div
            style={{ y: dashboardY }}
            className="absolute bottom-[6%] left-0 right-0 mx-auto w-full max-w-5xl px-4 flex justify-center mix-blend-luminosity will-change-transform"
          >
            <div className="relative w-[90%] md:w-full h-auto rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10">
              <Image
                src="/verge-dashboard.png"
                alt="Verge Smart Traffic Dashboard"
                width={1200}
                height={800}
                className="w-full h-auto object-cover"
                priority
              />
            </div>
          </motion.div>

          <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-background via-background/80 to-transparent z-30 pointer-events-none"></div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="relative py-16 md:py-24 border-b border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-8 md:px-28">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
             {stats.map((stat, idx) => (
               <motion.div 
                 key={idx}
                 initial={{ opacity: 0, scale: 0.95 }}
                 whileInView={{ opacity: 1, scale: 1 }}
                 viewport={{ once: true, margin: "-100px" }}
                 transition={{ duration: 0.5, delay: idx * 0.1 }}
                 className="flex flex-col items-center text-center"
               >
                 <span className="text-4xl md:text-5xl font-medium text-foreground mb-2">{stat.value}</span>
                 <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
               </motion.div>
             ))}
           </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-24 md:py-32 px-8 md:px-28 z-40 bg-background overflow-hidden relative border-b border-white/5">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-500/[0.03] blur-[100px] rounded-full pointer-events-none -z-10 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-500/[0.03] blur-[100px] rounded-full pointer-events-none -z-10 -translate-x-1/2 translate-y-1/2"></div>

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-24">
             <motion.div
               initial={{ opacity: 0, y: 10 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.5 }}
               className="inline-block bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground mb-6"
             >
               Platform Capabilities
             </motion.div>
             <motion.h2 
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.6, delay: 0.1 }}
               className="text-4xl md:text-5xl lg:text-6xl tracking-tight font-medium mb-6 text-foreground"
             >
               Omnipresent Vision. <br className="md:hidden" /><span className="text-muted-foreground">Actionable Intelligence.</span>
             </motion.h2>
             <motion.p
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               transition={{ duration: 0.6, delay: 0.2 }}
               className="text-lg text-muted-foreground max-w-2xl mx-auto"
             >
               Verge is equipped with advanced AI models that not only see the road, but understand it. Uncover patterns, predict congestion, and react to incidents instantaneously.
             </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                whileHover={{ y: -5 }}
                className="group relative p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300 overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/[0.02] rounded-full blur-3xl group-hover:bg-white/[0.05] transition-colors translate-x-1/2 -translate-y-1/2" />
                <div className="mb-6 inline-flex p-3 rounded-2xl bg-white/5 ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className={`w-6 h-6 ${feature.color} opacity-90 group-hover:opacity-100 transition-opacity`} />
                </div>
                <h3 className="text-xl font-medium text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Testimonial */}
      <section
        ref={testimonialRef}
        className="relative min-h-screen flex flex-col justify-center py-24 md:py-32 px-8 md:px-28 z-40 bg-background overflow-hidden"
      >
        <div className="max-w-3xl mx-auto flex flex-col items-start gap-10 w-full relative z-10">
          <Image
            src="/quote-symbol.png"
            alt="Quote"
            width={56}
            height={40}
            className="w-14 h-10 object-contain ml-[-0.2em]"
          />

          <h2 className="text-4xl md:text-5xl font-medium leading-[1.2] flex flex-wrap will-change-auto">
            {testimonialWords.map((word, i) => {
              const start = i / testimonialWords.length;
              const end = (i + 1) / testimonialWords.length;
              // eslint-disable-next-line react-hooks/rules-of-hooks
              const opacity = useTransform(
                testimonialScrollYProgress,
                [start, end],
                [0.2, 1],
              );
              // eslint-disable-next-line react-hooks/rules-of-hooks
              const color = useTransform(
                testimonialScrollYProgress,
                [start, end],
                ["#595959", "#FFFFFF"],
              );

              return (
                <motion.span
                  key={i}
                  style={{ opacity, color }}
                  className="mr-[0.3em]"
                >
                  {word}
                </motion.span>
              );
            })}
            <span className="text-muted-foreground ml-1">"</span>
          </h2>

          <div className="flex items-center gap-4 mt-8">
            <Image
              src="/testimonial-avatar.png"
              alt="Brooklyn Simmons"
              width={56}
              height={56}
              className="w-14 h-14 rounded-full border-[3px] border-foreground object-cover shadow-sm"
            />
            <div className="flex flex-col">
              <span className="text-base font-semibold leading-7 text-foreground">
                Brooklyn Simmons
              </span>
              <span className="text-sm font-normal leading-5 text-muted-foreground">
                Product Manager
              </span>
            </div>
          </div>
        </div>

        {/* Subtle background glow effect behind testimonial */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-3xl pointer-events-none -z-10 dark:block hidden"></div>
      </section>

      {/* Final CTA & Footer */}
      <section className="relative pt-24 pb-12 px-8 md:px-28 z-40 bg-background border-t border-white/5 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-background to-background pointer-events-none -z-10"></div>
        
        <div className="max-w-4xl mx-auto text-center mb-32">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-medium mb-8 text-foreground"
          >
            Ready to optimize your city?
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 bg-foreground text-background rounded-full px-8 py-4 text-base font-medium shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.4)] transition-all hover:scale-105 active:scale-95"
            >
              Launch Live Dashboard
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="mailto:contact@verge.city"
              className="bg-white/5 hover:bg-white/10 text-foreground border border-white/10 rounded-full px-8 py-4 text-base font-medium transition-all hover:scale-105 active:scale-95 backdrop-blur-md"
            >
              Contact Sales
            </Link>
          </motion.div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5 text-sm text-muted-foreground gap-4">
          <div className="flex items-center gap-3">
             <div className="relative w-6 h-6 rounded overflow-hidden opacity-80">
                <Image
                  src="/verge-logo.png"
                  alt="Verge Logo"
                  fill
                  className="object-cover"
                />
              </div>
             <span>© 2026 Verge Systems, Inc. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-foreground transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-foreground transition-colors">GitHub</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
