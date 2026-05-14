import React, { useState, useEffect } from "react";
import { PhoneCall, ShieldCheck, Hammer, Menu, X, MapPin, ChevronRight, Star, ArrowRight, Zap, MessageSquare, Mail, MessageCircle } from "lucide-react";
import { Switch, Route, Router as WouterRouter, Link } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BUSINESS, HERO, ABOUT, CTA_BANNER, BADGES, SERVICES, REVIEWS, THEME, PITCH_MODE } from "./config";
import biz from "../../../business.config.json";
import AdminPage from "./pages/AdminPage";

const fallbackEmail = biz.leadNotifyTo || "teddy.nk28@gmail.com";

const queryClient = new QueryClient();

function useApplyTheme() {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", THEME.primary);
    root.style.setProperty("--primary-foreground", THEME.primaryFg);
    root.style.setProperty("--background", THEME.background);
    root.style.setProperty("--foreground", THEME.foreground);
    root.style.setProperty("--card", THEME.card);
    root.style.setProperty("--card-foreground", THEME.cardFg);
    root.style.setProperty("--accent", THEME.accent);
    root.style.setProperty("--accent-foreground", THEME.accentFg);
    root.style.setProperty("--muted-foreground", THEME.mutedFg);
    root.style.setProperty("--border", THEME.border);
    root.style.setProperty("--input", THEME.border);
    root.style.setProperty("--ring", THEME.primary);
    root.style.setProperty("--muted", THEME.card);
  }, []);
}


// ============================================================
//  QuoteForm — FormSubmit-integrated contact form.
//
//  How it works:
//    1. Customer fills out the form (name, phone, email, service, message).
//    2. On submit, POSTs DIRECTLY to formsubmit.co — bypasses our backend
//       entirely. (Render free tier blocks SMTP; FormSubmit is HTTP-based.)
//    3. FormSubmit emails the address in BUSINESS.email.
//    4. FIRST submission to a new email triggers an "Activate Form" email
//       to that address — recipient clicks once → permanent.
//
//  PITCH_MODE: when true (no backend yet), the form shows a "Call us"
//  CTA instead of submitting. Set to false in config.ts once everything's
//  live and tested.
//
//  Default recipient: BUSINESS.email from config.ts. Falls back to
//  teddy.nk28@gmail.com (already activated) for pitch builds.
// ============================================================
function QuoteForm() {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // FormSubmit recipient — pull from BUSINESS.email, fall back to leadNotifyTo
  // from business.config.json (single source of truth for the lead inbox).
  const recipient = BUSINESS.email && BUSINESS.email.trim().length > 0
    ? BUSINESS.email.trim()
    : fallbackEmail;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (PITCH_MODE) return; // pitch mode shouldn't reach here; defensive
    setStatus("submitting");
    setErrorMsg("");

    const form = e.currentTarget;
    const fd = new FormData(form);
    // FormSubmit special fields
    fd.append("_subject", `New ${BUSINESS.trade} quote from ${fd.get("name") || "site visitor"}`);
    fd.append("_template", "table");
    fd.append("_captcha", "false"); // optional; FormSubmit serves a CAPTCHA page by default
    fd.append("Source", BUSINESS.name);

    // Save to backend DB FIRST so the lead is captured even if FormSubmit
    // is down, rate-limited, or hasn't been activated for this recipient yet.
    // This is the source of truth for the admin dashboard.
    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(fd.get("name") || ""),
          phone: String(fd.get("phone") || ""),
          email: String(fd.get("email") || ""),
          service: String(fd.get("service") || ""),
          message: String(fd.get("message") || ""),
        }),
      });
    } catch (err) {
      // Backend save failed (no backend deployed yet, network error, etc.).
      // Don't block the FormSubmit path — at worst we lose the admin-dashboard
      // entry and rely on the FormSubmit email.
      console.warn("Backend save failed, continuing with FormSubmit", err);
    }

    try {
      const res = await fetch(`https://formsubmit.co/${encodeURIComponent(recipient)}`, {
        method: "POST",
        body: fd,
      });
      // FormSubmit's regular endpoint returns HTML; we don't need to parse it,
      // just verify HTTP 200. The activation flow (if needed) happens server-side.
      if (!res.ok) throw new Error(`FormSubmit returned ${res.status}`);
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please call us.");
    }
  }

  // PITCH_MODE: show "call us" card instead of the form
  if (PITCH_MODE) {
    return (
      <section id="quote" className="py-20 bg-card border-y border-white/10">
        <div className="container mx-auto px-6 max-w-2xl text-center">
          <h2 className="text-4xl md:text-5xl font-condensed font-black uppercase tracking-wide text-white mb-4">
            Get a Free Quote
          </h2>
          <p className="text-muted-foreground mb-8">
            We're finalizing our online quote form. In the meantime, give us a call — we answer fast.
          </p>
          <a
            href={`tel:${BUSINESS.phoneRaw}`}
            className="inline-flex items-center gap-3 bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded font-condensed text-2xl uppercase tracking-wider font-bold transition-all hover:-translate-y-1 shadow-[0_0_30px_rgba(0,0,0,0.4)]"
          >
            <PhoneCall className="w-6 h-6" />
            {BUSINESS.phone}
          </a>
        </div>
      </section>
    );
  }

  return (
    <section id="quote" className="py-20 bg-card border-y border-white/10">
      <div className="container mx-auto px-6 max-w-2xl">
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-condensed font-black uppercase tracking-wide text-white mb-3">
            Get a Free Quote
          </h2>
          <p className="text-muted-foreground">
            Tell us about your project — we'll get back to you fast.
          </p>
        </div>

        {status === "success" ? (
          <div className="text-center bg-background border border-primary/40 rounded p-10">
            <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-condensed font-bold uppercase text-white mb-2">Got it.</h3>
            <p className="text-muted-foreground">
              We received your request. Expect a call from {BUSINESS.phone} within 1 business day.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              <input
                name="name" required placeholder="Your name *"
                className="bg-background border border-white/10 rounded px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <input
                name="phone" required type="tel" placeholder="Phone *"
                className="bg-background border border-white/10 rounded px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
            </div>
            <input
              name="email" required type="email" placeholder="Email *"
              className="w-full bg-background border border-white/10 rounded px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
            <select
              name="service" required defaultValue=""
              className="w-full bg-background border border-white/10 rounded px-4 py-3 text-white focus:outline-none focus:border-primary"
            >
              <option value="" disabled>Which service do you need? *</option>
              {SERVICES.map((s) => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
              <option value="Other">Other / Not sure</option>
            </select>
            <textarea
              name="message" rows={4} placeholder="Tell us about your project (optional)"
              className="w-full bg-background border border-white/10 rounded px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary resize-none"
            />
            <button
              type="submit" disabled={status === "submitting"}
              className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white px-8 py-4 rounded font-condensed text-xl uppercase tracking-wider font-bold transition-all"
            >
              {status === "submitting" ? "Sending..." : "Request a Free Quote"}
            </button>
            {status === "error" && (
              <p className="text-red-400 text-sm text-center">
                {errorMsg} — please call <a href={`tel:${BUSINESS.phoneRaw}`} className="underline">{BUSINESS.phone}</a>.
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}

function LandingPage() {
  useApplyTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const showYearsBadge = BUSINESS.yearsInBusiness && BUSINESS.yearsInBusiness !== "0";

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary selection:text-white">

      {/* Navigation */}
      <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? "bg-background/95 backdrop-blur-md border-b border-white/10 py-4 shadow-2xl" : "bg-transparent py-6"}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollTo("hero")}>
            <div className="w-10 h-10 bg-primary rounded flex items-center justify-center">
              <Hammer className="text-white w-6 h-6" />
            </div>
            <div>
              <div className="font-condensed text-2xl font-bold leading-none tracking-wider text-white uppercase">{BUSINESS.shortName}</div>
              <div className="font-condensed text-primary text-sm font-bold tracking-widest uppercase leading-none">{BUSINESS.trade} · {BUSINESS.location}</div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo("services")} className="font-condensed text-lg uppercase tracking-wide hover:text-primary transition-colors">Services</button>
            <button onClick={() => scrollTo("about")} className="font-condensed text-lg uppercase tracking-wide hover:text-primary transition-colors">About</button>
            <button onClick={() => scrollTo("reviews")} className="font-condensed text-lg uppercase tracking-wide hover:text-primary transition-colors">Reviews</button>
            <a href={`tel:${BUSINESS.phoneRaw}`} className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded font-condensed text-xl uppercase tracking-wider font-bold transition-all hover:-translate-y-1 shadow-[0_0_20px_rgba(0,0,0,0.3)]">
              <PhoneCall className="w-5 h-5" />
              {BUSINESS.phone}
            </a>
          </div>
          <button className="md:hidden text-white p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-background/98 backdrop-blur-xl pt-24 px-6 flex flex-col gap-6 md:hidden">
          <button onClick={() => scrollTo("services")} className="font-condensed text-3xl uppercase tracking-wide text-left border-b border-white/10 pb-4">Services</button>
          <button onClick={() => scrollTo("about")} className="font-condensed text-3xl uppercase tracking-wide text-left border-b border-white/10 pb-4">About</button>
          <button onClick={() => scrollTo("reviews")} className="font-condensed text-3xl uppercase tracking-wide text-left border-b border-white/10 pb-4">Reviews</button>
          <button onClick={() => scrollTo("contact")} className="font-condensed text-3xl uppercase tracking-wide text-left border-b border-white/10 pb-4">Contact</button>
          <a href={`tel:${BUSINESS.phoneRaw}`} className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-4 rounded font-condensed text-2xl uppercase tracking-wider font-bold mt-4">
            <PhoneCall className="w-6 h-6" />
            {BUSINESS.phone}
          </a>
        </div>
      )}

      {/* Hero */}
      <section id="hero" className="relative min-h-[90vh] flex items-center pt-20">
        <div className="absolute inset-0 z-0">
          <img src="/hero-bg.png" alt="Trades professional working" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
        </div>
        <div className="container mx-auto px-6 relative z-10 py-20">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-condensed uppercase tracking-tight leading-[0.9] mb-6">
              {HERO.headline1} <br/>
              <span className="text-primary">{HERO.headline2}</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl leading-relaxed">{HERO.subheading}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={`tel:${BUSINESS.phoneRaw}`} className="flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded font-condensed text-2xl uppercase tracking-wider font-bold transition-all hover:-translate-y-1 shadow-[0_0_30px_rgba(0,0,0,0.4)]">
                <PhoneCall className="w-6 h-6" />
                {HERO.cta1}
              </a>
              <button onClick={() => scrollTo("contact")} className="flex items-center justify-center gap-3 bg-card hover:bg-card/80 border border-white/10 text-white px-8 py-4 rounded font-condensed text-2xl uppercase tracking-wider font-bold transition-all hover:-translate-y-1">
                {HERO.cta2}
              </button>
            </div>
            <div className="mt-12 flex flex-wrap items-center gap-6">
              {BADGES.slice(0, 3).map((badge, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <div className="w-px h-8 bg-white/10 hidden sm:block"></div>}
                  <div className="flex items-center gap-2 font-condensed font-bold text-lg uppercase tracking-wide">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    {badge}
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
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

      {/* About */}
      <section id="about" className="py-24 bg-card relative border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -inset-4 border border-primary/20 rounded translate-x-4 translate-y-4"></div>
              <img src="/team-photo.png" alt={ABOUT.teamPhotoAlt} className="w-full h-auto rounded relative z-10 hover:scale-[1.02] transition-all duration-500" />
              {showYearsBadge && (
                <div className="absolute bottom-8 -right-8 bg-primary p-6 rounded shadow-2xl z-20 hidden md:block">
                  <div className="font-condensed text-5xl font-black text-white leading-none mb-1">{BUSINESS.yearsInBusiness}+</div>
                  <div className="text-white/80 font-bold uppercase tracking-wider text-sm">Years Experience</div>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-primary font-bold tracking-widest uppercase mb-4 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> About Us
              </h2>
              <h3 className="text-4xl md:text-6xl font-condensed font-bold uppercase tracking-wide mb-6 leading-tight">{ABOUT.headline}</h3>
              <p className="text-muted-foreground text-lg mb-6 leading-relaxed">{ABOUT.body1}</p>
              <p className="text-muted-foreground text-lg mb-10 leading-relaxed">{ABOUT.body2}</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                {BADGES.map((item, i) => (
                  <li key={i} className="flex items-center gap-3 font-bold">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <a href={`tel:${BUSINESS.phoneRaw}`} className="inline-flex items-center gap-2 bg-white text-background hover:bg-white/90 px-8 py-4 rounded font-condensed text-xl uppercase tracking-wider font-bold transition-all hover:-translate-y-1">
                Call Us Now <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 relative overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-[url('/services-bg.png')] opacity-10 bg-center mix-blend-overlay"></div>
        <div className="container mx-auto px-6 relative z-10 text-center">
          <h2 className="text-4xl md:text-6xl font-condensed font-black uppercase tracking-wide text-white mb-6">{CTA_BANNER.headline}</h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto font-medium">{CTA_BANNER.body}</p>
          <a href={`tel:${BUSINESS.phoneRaw}`} className="inline-flex items-center justify-center gap-3 bg-background hover:bg-background/90 text-white px-10 py-5 rounded font-condensed text-3xl uppercase tracking-wider font-black transition-all hover:scale-105 shadow-2xl">
            <PhoneCall className="w-8 h-8 text-primary" />
            {BUSINESS.phone}
          </a>
        </div>
      </section>

      {/* Reviews */}
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

      {/* Contact */}
      <section id="contact" className="py-24 bg-card border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-primary font-bold tracking-widest uppercase mb-4 text-sm flex items-center justify-center gap-2">
              <PhoneCall className="w-4 h-4" /> Get In Touch
            </h2>
            <h3 className="text-4xl md:text-6xl font-condensed font-bold uppercase tracking-wide mb-4">Ready to Help, Right Now</h3>
            <p className="text-muted-foreground text-lg">Call or text us — {BUSINESS.hours.toLowerCase()}.</p>
          </div>

          <div className={`grid grid-cols-1 gap-6 max-w-3xl mx-auto mb-16 ${BUSINESS.email ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            <a href={`tel:${BUSINESS.phoneRaw}`} className="group bg-primary hover:bg-primary/90 p-8 rounded flex flex-col items-center text-center gap-4 transition-all hover:-translate-y-2 shadow-[0_0_30px_rgba(0,0,0,0.3)]">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                <PhoneCall className="w-8 h-8 text-white" />
              </div>
              <div className="font-condensed text-sm font-bold uppercase tracking-widest text-white/70">Call Us</div>
              <div className="font-condensed text-3xl font-black text-white uppercase tracking-wide leading-tight">{BUSINESS.phone}</div>
              <div className="text-white/60 text-sm font-medium">Tap to call instantly</div>
            </a>
            <a href={`sms:${BUSINESS.phoneRaw}`} className="group bg-background border border-white/10 hover:border-primary/50 p-8 rounded flex flex-col items-center text-center gap-4 transition-all hover:-translate-y-2">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-primary" />
              </div>
              <div className="font-condensed text-sm font-bold uppercase tracking-widest text-muted-foreground">Text Us</div>
              <div className="font-condensed text-3xl font-black text-white uppercase tracking-wide leading-tight">{BUSINESS.phone}</div>
              <div className="text-muted-foreground text-sm font-medium">Tap to open messages</div>
            </a>
            {BUSINESS.email && (
              <a href={`mailto:${BUSINESS.email}`} className="group bg-background border border-white/10 hover:border-primary/50 p-8 rounded flex flex-col items-center text-center gap-4 transition-all hover:-translate-y-2">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <div className="font-condensed text-sm font-bold uppercase tracking-widest text-muted-foreground">Email Us</div>
                <div className="font-condensed text-xl font-black text-white tracking-wide leading-tight break-all">{BUSINESS.email}</div>
                <div className="text-muted-foreground text-sm font-medium">We reply within hours</div>
              </a>
            )}
          </div>

          <div className="flex flex-col md:flex-row justify-center items-center gap-10 max-w-3xl mx-auto pt-10 border-t border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-background border border-white/10 rounded flex items-center justify-center shrink-0 text-primary">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Service Area</div>
                <div className="text-white font-medium">{BUSINESS.serviceArea}</div>
              </div>
            </div>
            <div className="hidden md:block w-px h-12 bg-white/10"></div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-background border border-white/10 rounded flex items-center justify-center shrink-0 text-primary">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-1">Hours</div>
                <div className="text-white font-medium">{BUSINESS.hours}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <QuoteForm />

      {/* Footer */}
      <footer className="bg-background border-t border-white/10 py-12">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <Hammer className="text-white w-4 h-4" />
              </div>
              <span className="font-condensed text-2xl font-bold uppercase tracking-wider">{BUSINESS.shortName}</span>
            </div>
            <div className="text-muted-foreground text-sm font-medium">
              &copy; {new Date().getFullYear()} {BUSINESS.name}. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
              <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
              <Link href="/admin" className="hover:text-white cursor-pointer transition-colors">Admin</Link>
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
      <Route path="/admin" component={AdminPage} />
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
