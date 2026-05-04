// Royalty Concrete & Remodeling Services LLC — Miami, FL — Mockup


import React, { useState, useEffect } from "react";
import { PhoneCall, ShieldCheck, Hammer, Menu, X, MapPin, ChevronRight, Star, ArrowRight, Zap, MessageSquare, Mail, MessageCircle } from "lucide-react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

const queryClient = new QueryClient();

const SERVICES = [
  { name: "Concrete Driveways", desc: "Custom concrete driveways built to last. From new pours to full replacements, we deliver a smooth, durable finish that boosts your home's curb appeal and value." },
  { name: "Patios & Walkways", desc: "Transform your outdoor space with beautifully crafted patios and walkways. Choose from classic finishes or stamped designs to fit your style." },
  { name: "Foundations & Slabs", desc: "Solid, code-compliant concrete foundations and slabs for homes, additions, garages, and commercial projects. Built right from the ground up." },
  { name: "Stamped & Decorative Concrete", desc: "Add character to your property with stamped, stained, and decorative concrete. Get the look of brick, stone, or tile at a fraction of the cost." },
  { name: "Concrete Repair & Resurfacing", desc: "Cracked, uneven, or worn-out concrete? We repair, resurface, and restore old slabs to look new again — saving you the cost of full replacement." },
  { name: "Home Remodeling", desc: "Full-service remodeling for kitchens, bathrooms, and interiors. Our team handles every detail, delivering quality craftsmanship and clean finishes." },
];

const REVIEWS = [
  {
    text: "Royalty Concrete poured a new driveway and walkway for us in Miami and it came out beautiful. The team was professional, the work was clean, and they finished on schedule. Very happy with the results.",
    author: "Carlos M.",
    source: "Google Review"
  },
  {
    text: "Hired them for a full patio remodel with stamped concrete. The crew showed up when they said they would and the finished work looks amazing. Fair pricing for the quality.",
    author: "Jessica R.",
    source: "Google Review"
  },
  {
    text: "Royalty handled both our foundation repair and bathroom remodel. Honest, hardworking team that takes pride in what they do. Would absolutely hire them again.",
    author: "David L.",
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
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'glass-nav py-4 shadow-2xl' : 'bg-transparent py-6'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollTo('hero')}>
            <div className="w-10 h-10 bg-primary rounded flex items-center justify-center">
              <Hammer className="text-white w-6 h-6" />
            </div>
            <div>
              <div className="font-condensed text-2xl font-bold leading-none tracking-wider text-white uppercase">Royalty Concrete & Remodeling</div>
              <div className="font-condensed text-primary text-sm font-bold tracking-widest uppercase leading-none">Concrete & Remodeling</div>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo('services')} className="font-condensed text-lg uppercase tracking-wide hover:text-primary transition-colors">Services</button>
            <button onClick={() => scrollTo('about')} className="font-condensed text-lg uppercase tracking-wide hover:text-primary transition-colors">About</button>
            <button onClick={() => scrollTo('reviews')} className="font-condensed text-lg uppercase tracking-wide hover:text-primary transition-colors">Reviews</button>
            <a href="tel:+17867886001" className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded font-condensed text-xl uppercase tracking-wider font-bold transition-all hover:-translate-y-1 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
              <PhoneCall className="w-5 h-5" />
              (786) 788-6001
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
        <div className="fixed inset-0 z-40 glass-mobile-menu pt-24 px-6 flex flex-col gap-6 md:hidden">
          <button onClick={() => scrollTo('services')} className="font-condensed text-3xl uppercase tracking-wide text-left border-b border-white/10 pb-4">Services</button>
          <button onClick={() => scrollTo('about')} className="font-condensed text-3xl uppercase tracking-wide text-left border-b border-white/10 pb-4">About</button>
          <button onClick={() => scrollTo('reviews')} className="font-condensed text-3xl uppercase tracking-wide text-left border-b border-white/10 pb-4">Reviews</button>
          <button onClick={() => scrollTo('contact')} className="font-condensed text-3xl uppercase tracking-wide text-left border-b border-white/10 pb-4">Contact</button>
          <a href="tel:+17867886001" className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-4 rounded font-condensed text-2xl uppercase tracking-wider font-bold mt-4">
            <PhoneCall className="w-6 h-6" />
            (786) 788-6001
          </a>
          <a href="/crm/" className="flex items-center justify-center gap-2 text-muted-foreground hover:text-white px-6 py-3 rounded border border-white/10 font-condensed text-lg uppercase tracking-wider mt-2 transition-colors">
            Admin Login
          </a>
        </div>
      )}

      {/* Hero Section */}
      <section id="hero" className="relative min-h-[90vh] flex items-center pt-20 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src="/hero-bg.png" alt="Miami concrete project at sunset" className="w-full h-full object-cover opacity-40 animate-ken-burns" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
          <div className="absolute inset-0 animate-shimmer"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10 py-20">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-condensed uppercase tracking-tight leading-[0.9] mb-6">
              Built To <br/>
              <span className="text-primary">Last A Lifetime</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed">
              From custom driveways and patios to full home remodels — Royalty Concrete & Remodeling brings expert craftsmanship to every project across Miami and Miami-Dade County. Quality work, honest pricing, on time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="tel:+17867886001" className="flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded font-condensed text-2xl uppercase tracking-wider font-bold transition-all hover:-translate-y-1 shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                <PhoneCall className="w-6 h-6" />
                Call (786) 788-6001
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
              <Hammer className="w-4 h-4" /> Our Expertise
            </h2>
            <h3 className="text-4xl md:text-5xl font-condensed font-bold uppercase tracking-wide">What We Do Best</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SERVICES.map((service, i) => (
              <div key={i} className="group glass-card p-8 rounded-lg transition-all duration-300 hover:-translate-y-2 cursor-pointer flex flex-col h-full relative overflow-hidden">
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
      <section id="about" className="py-24 glass-section relative border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -inset-4 border border-primary/20 rounded translate-x-4 translate-y-4"></div>
              <img src="/team-photo.jpg" alt="Royalty Concrete & Remodeling pool patio project in Miami" className="w-full h-auto rounded relative z-10 hover:scale-[1.02] transition-all duration-500" />
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
              <h3 className="text-4xl md:text-6xl font-condensed font-bold uppercase tracking-wide mb-6 leading-tight">We Don't Cut Corners. <br/>We Pour Them Right.</h3>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
                Royalty Concrete & Remodeling Services LLC has been transforming Miami homes and businesses with quality concrete and remodeling work. Based in the heart of Miami, we serve homeowners, contractors, and commercial clients throughout Miami-Dade County.
              </p>
              <p className="text-muted-foreground text-lg mb-10 leading-relaxed">
                From driveways, patios, and foundations to kitchen and bathroom remodels — every project gets the same attention to detail. We show up on time, communicate clearly, and finish what we start.
              </p>
              
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {['Licensed & Insured', 'Upfront Pricing', 'Free Estimates', 'Clean & Respectful'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 font-bold">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              
              <a href="tel:+17867886001" className="inline-flex items-center gap-2 bg-white text-background hover:bg-white/90 px-8 py-4 rounded font-condensed text-xl uppercase tracking-wider font-bold transition-all hover:-translate-y-1">
                Call Us Now <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 relative overflow-hidden glass-cta">
        <div className="absolute inset-0 bg-[url('/services-bg.png')] opacity-10 object-cover bg-center mix-blend-overlay animate-ken-burns"></div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-condensed font-black uppercase tracking-wide text-white mb-6">Ready to Build Something Great?</h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto font-medium">Get a free quote today. Whether it's a new driveway, a backyard patio, or a full remodel — we'll handle it from start to finish.</p>
          <a href="tel:+17867886001" className="inline-flex items-center justify-center gap-3 bg-background hover:bg-background/90 text-white px-10 py-5 rounded font-condensed text-3xl uppercase tracking-wider font-black transition-all hover:scale-105 shadow-2xl">
            <PhoneCall className="w-8 h-8 text-primary" />
            (786) 788-6001
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
              <div key={i} className="glass-card p-8 rounded-lg transition-all duration-300 hover:-translate-y-2">
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
      <section id="contact" className="py-24 glass-section border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-primary font-bold tracking-widest uppercase mb-4 text-sm flex items-center justify-center gap-2">
              <PhoneCall className="w-4 h-4" /> Get In Touch
            </h2>
            <h3 className="text-4xl md:text-6xl font-condensed font-bold uppercase tracking-wide mb-4">Ready to Help, Right Now</h3>
            <p className="text-muted-foreground text-lg">Call, text, or email us — we respond fast, 24 hours a day, 7 days a week.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            <a href="tel:+17867886001" className="group glass-cta p-8 rounded-lg flex flex-col items-center text-center gap-4 transition-all hover:-translate-y-2">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                <PhoneCall className="w-8 h-8 text-white" />
              </div>
              <div className="font-condensed text-sm font-bold uppercase tracking-widest text-white/70">Call Us</div>
              <div className="font-condensed text-3xl font-black text-white uppercase tracking-wide leading-tight">(786) 788-6001</div>
              <div className="text-white/60 text-sm font-medium">Tap to call instantly</div>
            </a>

            <a href="sms:+17867886001" className="group glass-contact p-8 rounded-lg flex flex-col items-center text-center gap-4 transition-all hover:-translate-y-2">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <div className="font-condensed text-sm font-bold uppercase tracking-widest text-muted-foreground">Text Us</div>
              <div className="font-condensed text-3xl font-black text-white uppercase tracking-wide leading-tight">(786) 788-6001</div>
              <div className="text-muted-foreground text-sm font-medium">Tap to open messages</div>
            </a>

            <a href="mailto:info@royaltyconcretemiami.com" className="group glass-contact p-8 rounded-lg flex flex-col items-center text-center gap-4 transition-all hover:-translate-y-2">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <div className="font-condensed text-sm font-bold uppercase tracking-widest text-muted-foreground">Email Us</div>
              <div className="font-condensed text-lg md:text-xl font-black text-white tracking-wide leading-tight whitespace-nowrap">info@royaltyconcretemiami.com</div>
              <div className="text-muted-foreground text-sm font-medium">We reply within hours</div>
            </a>
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center gap-10 max-w-3xl mx-auto pt-10 border-t border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-background border border-white/10 rounded flex items-center justify-center shrink-0 text-primary">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Service Area</div>
                <div className="text-white font-medium">Miami & All of Miami-Dade County, FL</div>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-white/10"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-background border border-white/10 rounded flex items-center justify-center shrink-0 text-primary">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Hours</div>
                <div className="text-white font-medium">Sat 8:00 AM – 12:00 AM • Call for Daily Hours</div>
              </div>
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
                <Hammer className="text-white w-4 h-4" />
              </div>
              <span className="font-condensed text-2xl font-bold uppercase tracking-wider">Royalty Concrete & Remodeling</span>
            </div>
            <div className="text-muted-foreground text-sm font-medium">
              &copy; {new Date().getFullYear()} Royalty Concrete & Remodeling. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
              <span className="hover:text-white cursor-pointer transition-colors">License: Licensed & Insured</span>
              <a href="/crm/" className="hover:text-white cursor-pointer transition-colors">Admin</a>
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
