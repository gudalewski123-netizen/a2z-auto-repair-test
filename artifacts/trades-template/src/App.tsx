// ============================================
// CLIENT SETUP CHECKLIST — FIND & REPLACE ALL
// ============================================
// Next Era Plumbing          → Full business name (e.g. Peak Flow Plumbing)
// Plumbing             → Type of trade (Plumbing, HVAC, Electrical, etc.)
// (561) 635-7568          → (561) 555-0000
// +15616357568              → +15615550000
// Loxahatchee, Royal Palm Beach & Palm Beach County, FL           → Cities/counties served
// FL-PLB-XXXXXX         → Contractor license number
// Open 24 Hours, 7 Days a Week         → Mon-Sat 7am-6pm
// [[YEARS_IN_BUSINESS]]      → Number — leave blank or 0 to hide the badge entirely
// We are a family-owned plumbing company proudly serving Loxahatchee, Royal Palm Beach, and the surrounding Palm Beach County communities. We built Next Era Plumbing on a simple promise: show up fast, do the job right, and treat every home like our own.  → First bio paragraph
// From routine repairs to full plumbing installations and 24/7 emergency response, our team brings professional-grade service with a personal touch. When you call us, you're not just a ticket number — you're a neighbor.  → Second bio paragraph
// Your Trusted            → First headline line
// Plumbing Experts            → Second headline line (renders in accent color)
// Family-owned and available around the clock — Next Era Plumbing delivers fast, reliable plumbing service across Loxahatchee and all of Palm Beach County. Licensed, insured, and always ready.       → Hero paragraph text
// Plumbing Emergency? We're Ready.           → Mid-page CTA banner headline
// Don't wait — call us now and a certified plumber will be on the way fast. Available 24/7, including weekends and holidays.            → CTA banner subtext
// [[SERVICE_1]] – [[SERVICE_6]]           → Service names
// [[SERVICE_1_DESC]] – [[SERVICE_6_DESC]] → Service descriptions
// [[REVIEW_1_TEXT]] – [[REVIEW_3_TEXT]]   → Paste real Google reviews or delete entire reviews section + nav link
// [[REVIEW_1_NAME]] – [[REVIEW_3_NAME]]   → Reviewer names
// FORMSPREE ID               → Replace in form action URL: https://formspree.io/f/REPLACE_WITH_ID
// ============================================

import React, { useState, useEffect } from "react";
import { PhoneCall, ShieldCheck, Wrench, Menu, X, MapPin, ChevronRight, Star, ArrowRight, Zap, MessageSquare } from "lucide-react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient();

const SERVICES = [
  { name: "Drain Cleaning", desc: "Clogged drains got you down? We clear blockages fast using professional-grade equipment, restoring full flow to your sinks, showers, and main lines." },
  { name: "Water Heater Services", desc: "From installations to repairs, we handle all water heater work — tank and tankless — so you always have reliable hot water when you need it." },
  { name: "Plumbing Repairs", desc: "Leaky faucets, burst pipes, running toilets — no job is too small. We diagnose and fix the problem right the first time, every time." },
  { name: "Sewer Services", desc: "We offer full sewer line cleaning, repair, and replacement. Using advanced techniques, we resolve sewer issues with minimal disruption to your property." },
  { name: "Emergency Plumbing", desc: "Plumbing emergencies don't wait for business hours, and neither do we. Our team is on call 24/7 to handle any urgent situation, day or night." },
  { name: "Pool Plumbing", desc: "Keep your pool running smoothly year-round. We repair and install pool plumbing systems, ensuring proper circulation, leak-free lines, and peak performance." },
];

const REVIEWS = [
  {
    text: "Next Era Plumbing came out the same day I called and fixed a major pipe leak under my kitchen sink. Professional, fast, and very fair pricing. Highly recommend!",
    author: "Maria T.",
    source: "Google Review"
  },
  {
    text: "I had a water heater issue late at night and they actually answered and showed up within the hour. Incredible service. Family-owned and it really shows — they truly care.",
    author: "James R.",
    source: "Google Review"
  },
  {
    text: "These guys are the real deal. Fixed our clogged main line quickly and explained everything along the way. Clean work, honest pricing. Will use again without hesitation.",
    author: "Sandra K.",
    source: "Google Review"
  }
];

const YEARS_IN_BUSINESS = "";

function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const showYearsBadge = YEARS_IN_BUSINESS && YEARS_IN_BUSINESS !== "0" && YEARS_IN_BUSINESS !== "[[YEARS_IN_BUSINESS]]";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary selection:text-white">

      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-background/95 backdrop-blur-md border-b border-white/10 py-4 shadow-2xl' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollTo('hero')}>
            <div className="w-10 h-10 bg-primary rounded flex items-center justify-center">
              <Wrench className="text-white w-6 h-6" />
            </div>
            <div>
              <div className="font-condensed text-2xl font-bold leading-none tracking-wider text-white uppercase">Next Era Plumbing</div>
              <div className="font-condensed text-primary text-sm font-bold tracking-widest uppercase leading-none">Plumbing</div>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo('services')} className="font-condensed text-lg uppercase tracking-wide hover:text-primary transition-colors">Services</button>
            <button onClick={() => scrollTo('about')} className="font-condensed text-lg uppercase tracking-wide hover:text-primary transition-colors">About</button>
            <button onClick={() => scrollTo('reviews')} className="font-condensed text-lg uppercase tracking-wide hover:text-primary transition-colors">Reviews</button>
            <a href="tel:+15616357568" className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded font-condensed text-xl uppercase tracking-wider font-bold transition-all hover:-translate-y-1 shadow-[0_0_20px_rgba(232,64,28,0.3)]">
              <PhoneCall className="w-5 h-5" />
              (561) 635-7568
            </a>
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden text-white p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background/98 backdrop-blur-xl pt-24 px-6 flex flex-col gap-6 md:hidden">
          <button onClick={() => scrollTo('services')} className="font-condensed text-3xl uppercase tracking-wide text-left border-b border-white/10 pb-4">Services</button>
          <button onClick={() => scrollTo('about')} className="font-condensed text-3xl uppercase tracking-wide text-left border-b border-white/10 pb-4">About</button>
          <button onClick={() => scrollTo('reviews')} className="font-condensed text-3xl uppercase tracking-wide text-left border-b border-white/10 pb-4">Reviews</button>
          <button onClick={() => scrollTo('contact')} className="font-condensed text-3xl uppercase tracking-wide text-left border-b border-white/10 pb-4">Contact</button>
          <a href="tel:+15616357568" className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-4 rounded font-condensed text-2xl uppercase tracking-wider font-bold mt-4">
            <PhoneCall className="w-6 h-6" />
            (561) 635-7568
          </a>
        </div>
      )}

      {/* Hero Section */}
      <section id="hero" className="relative min-h-[90vh] flex items-center pt-20">
        <div className="absolute inset-0 z-0">
          <img src="/hero-bg.png" alt="Trades professional working" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10 py-20">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-condensed uppercase tracking-tight leading-[0.9] mb-6">
              Your Trusted <br/>
              <span className="text-primary">Plumbing Experts</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed">
              Family-owned and available around the clock — Next Era Plumbing delivers fast, reliable plumbing service across Loxahatchee and all of Palm Beach County. Licensed, insured, and always ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="tel:+15616357568" className="flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded font-condensed text-2xl uppercase tracking-wider font-bold transition-all hover:-translate-y-1 shadow-[0_0_30px_rgba(232,64,28,0.4)]">
                <PhoneCall className="w-6 h-6" />
                Call (561) 635-7568
              </a>
              <button onClick={() => scrollTo('contact')} className="flex items-center justify-center gap-3 bg-card hover:bg-card/80 border border-white/10 text-white px-8 py-4 rounded font-condensed text-2xl uppercase tracking-wider font-bold transition-all hover:-translate-y-1">
                Book Service
              </button>
            </div>
            {/* Trust Badges — no numbers required, works for any new business */}
            <div className="mt-12 flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2 font-condensed font-bold text-lg uppercase tracking-wide">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                Licensed &amp; Insured
              </div>
              <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
              <div className="flex items-center gap-2 font-condensed font-bold text-lg uppercase tracking-wide">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                Free Estimates
              </div>
              <div className="w-px h-8 bg-white/10 hidden sm:block"></div>
              <div className="flex items-center gap-2 font-condensed font-bold text-lg uppercase tracking-wide">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                Fast Response Time
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 relative bg-background">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-primary font-bold tracking-widest uppercase mb-4 text-sm flex items-center justify-center gap-2">
              <Wrench className="w-4 h-4" /> Our Expertise
            </h2>
            <h3 className="text-4xl md:text-5xl font-condensed font-bold uppercase tracking-wide">What We Do Best</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service, i) => (
              <div key={i} className="group bg-card border border-white/5 p-8 rounded hover:border-primary/50 transition-all duration-300 hover:-translate-y-2 cursor-pointer flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="w-14 h-14 bg-background border border-white/10 rounded flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-primary">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h4 className="text-2xl font-condensed font-bold uppercase tracking-wide mb-3">{service.name}</h4>
                <p className="text-muted-foreground mb-6 flex-grow">{service.desc}</p>
                <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-sm mt-auto">
                  Learn More <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-card relative border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -inset-4 border border-primary/20 rounded translate-x-4 translate-y-4"></div>
              <img src="/team-photo.png" alt="Next Era Plumbing Professional" className="w-full h-auto rounded relative z-10 grayscale-[0.2] hover:grayscale-0 transition-all duration-500" />
              {/* Years badge — only renders if YEARS_IN_BUSINESS is set to a real non-zero value */}
              {showYearsBadge && (
                <div className="absolute bottom-8 -right-8 bg-primary p-6 rounded shadow-2xl z-20 hidden md:block">
                  <div className="font-condensed text-5xl font-black text-white leading-none mb-1">{YEARS_IN_BUSINESS}+</div>
                  <div className="text-white/80 font-bold uppercase tracking-wider text-sm">Years Experience</div>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-primary font-bold tracking-widest uppercase mb-4 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> About Us
              </h2>
              <h3 className="text-4xl md:text-6xl font-condensed font-bold uppercase tracking-wide mb-6 leading-tight">We Don't Cut Corners. <br/>We Fix Them.</h3>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                We are a family-owned plumbing company proudly serving Loxahatchee, Royal Palm Beach, and the surrounding Palm Beach County communities. We built Next Era Plumbing on a simple promise: show up fast, do the job right, and treat every home like our own.
              </p>
              <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
                From routine repairs to full plumbing installations and 24/7 emergency response, our team brings professional-grade service with a personal touch. When you call us, you're not just a ticket number — you're a neighbor.
              </p>
              
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {['Licensed & Insured', 'Upfront Pricing', '24/7 Emergency Service', 'Clean & Respectful'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 font-bold">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              
              <a href="tel:+15616357568" className="inline-flex items-center gap-2 bg-white text-background hover:bg-white/90 px-8 py-4 rounded font-condensed text-xl uppercase tracking-wider font-bold transition-all hover:-translate-y-1">
                Call Us Now <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 relative overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-[url('/services-bg.png')] opacity-10 object-cover bg-center mix-blend-overlay"></div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-condensed font-black uppercase tracking-wide text-white mb-6">Plumbing Emergency? We're Ready.</h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto font-medium">Don't wait — call us now and a certified plumber will be on the way fast. Available 24/7, including weekends and holidays.</p>
          <a href="tel:+15616357568" className="inline-flex items-center justify-center gap-3 bg-background hover:bg-background/90 text-white px-10 py-5 rounded font-condensed text-3xl uppercase tracking-wider font-black transition-all hover:scale-105 shadow-2xl">
            <PhoneCall className="w-8 h-8 text-primary" />
            (561) 635-7568
          </a>
        </div>
      </section>

      {/* Reviews Section */}
      {/* DELETE THIS ENTIRE SECTION (and the Reviews nav link above) if client has no reviews yet */}
      <section id="reviews" className="py-24 bg-background relative">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-primary font-bold tracking-widest uppercase mb-4 text-sm flex items-center justify-center gap-2">
              <Star className="w-4 h-4" /> Client Testimonials
            </h2>
            <h3 className="text-4xl md:text-5xl font-condensed font-bold uppercase tracking-wide">Don't Just Take Our Word For It</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {REVIEWS.map((review, i) => (
              <div key={i} className="bg-card border border-white/5 p-8 rounded hover:border-white/20 transition-all duration-300 hover:-translate-y-2">
                <div className="flex gap-1 text-yellow-500 mb-6">
                  {[1,2,3,4,5].map(star => <Star key={star} className="w-5 h-5 fill-current" />)}
                </div>
                <p className="text-lg mb-8 leading-relaxed italic text-white/90">"{review.text}"</p>
                <div className="flex items-center justify-between mt-auto">
                  <div className="font-condensed font-bold text-xl uppercase tracking-wide">{review.author}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-widest font-bold">{review.source}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-card border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <h2 className="text-primary font-bold tracking-widest uppercase mb-4 text-sm flex items-center gap-2">
                <PhoneCall className="w-4 h-4" /> Get In Touch
              </h2>
              <h3 className="text-4xl md:text-6xl font-condensed font-bold uppercase tracking-wide mb-6">Request Service</h3>
              <p className="text-muted-foreground text-lg mb-10">Fill out the form below or call us directly for immediate assistance. We aim to respond to all inquiries within 15 minutes during business hours.</p>
              
              <div className="space-y-6 mb-10">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-background border border-white/10 rounded flex items-center justify-center shrink-0 text-primary">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Call Us</div>
                    <a href="tel:+15616357568" className="text-2xl font-condensed font-bold text-white hover:text-primary transition-colors">(561) 635-7568</a>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-background border border-white/10 rounded flex items-center justify-center shrink-0 text-primary">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Service Area</div>
                    <div className="text-lg text-white font-medium">Loxahatchee, Royal Palm Beach & Palm Beach County, FL</div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-background border border-white/10 rounded flex items-center justify-center shrink-0 text-primary">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground font-bold uppercase tracking-wider mb-1">Hours</div>
                    <div className="text-lg text-white font-medium">Open 24 Hours, 7 Days a Week</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-background p-8 md:p-10 rounded border border-white/5">
              <form action="https://formspree.io/f/REPLACE_WITH_ID" method="POST" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">First Name</label>
                    <input type="text" name="firstName" required className="w-full bg-card border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Last Name</label>
                    <input type="text" name="lastName" required className="w-full bg-card border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Phone</label>
                    <input type="tel" name="phone" required className="w-full bg-card border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Email</label>
                    <input type="email" name="email" required className="w-full bg-card border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Service Needed</label>
                  <select name="service" required className="w-full bg-card border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none">
                    <option value="" disabled>Select a service...</option>
                    {SERVICES.map((s, i) => <option key={i} value={s.name}>{s.name}</option>)}
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Message</label>
                  <textarea name="message" rows={4} required className="w-full bg-card border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"></textarea>
                </div>
                <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded font-condensed text-2xl uppercase tracking-wider font-bold transition-all hover:-translate-y-1 shadow-[0_0_20px_rgba(232,64,28,0.2)]">
                  Submit Request
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-white/10 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <Wrench className="text-white w-4 h-4" />
              </div>
              <span className="font-condensed text-2xl font-bold uppercase tracking-wider">Next Era Plumbing</span>
            </div>
            <div className="text-muted-foreground text-sm font-medium">
              &copy; {new Date().getFullYear()} Next Era Plumbing. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
              <span className="hover:text-white cursor-pointer transition-colors">License: FL-PLB-XXXXXX</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
