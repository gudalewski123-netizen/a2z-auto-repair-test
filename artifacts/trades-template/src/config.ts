// ============================================================
//  TEMPLATE CONFIG — Edit this file to fully rebrand the site
//  Every section below maps directly to what appears on screen
// ============================================================

export const BUSINESS = {
  name: "Macias Multy Services LLC",
  shortName: "Macias Multy Services",
  trade: "Fence Contractor",
  location: "Miami, FL",
  serviceArea: "Miami & South Florida",

  phone: "(786) 929-8933",
  phoneRaw: "+17869298933",

  email: "",

  hours: "Open 24 Hours — 7 Days a Week",

  yearsInBusiness: "",

  // Trade type — must match a key in placeholders.ts (or "default").
  // Lowercase, hyphen-separated. Examples: "softwash", "roofing", "lawn-care",
  // "fencing", "auto-detailing", "junk-removal", "hvac", "plumbing",
  // "electrical", "painting", "tree-services", "cleaning".
  // Used to pick trade-appropriate placeholder photos until the client sends real ones.
  tradeType: "default",
};

export const HERO = {
  headline1: "Fences Built",
  headline2: "To Stand Strong",
  subheading:
    "Expert fence installation and repair across Miami and South Florida. From wood and vinyl to chain link and gates — Macias Multy Services delivers quality fencing on time and on budget.",
  cta1: "Call (786) 929-8933",
  cta2: "Get a Free Quote",
};

export const ABOUT = {
  headline: "We Build Fences That Last.",
  body1:
    "Macias Multy Services LLC is a trusted fence contractor serving Miami and South Florida. We specialize in residential and commercial fence installation, repair, and gate work — handling every job with precision and care.",
  body2:
    "Whether you need a new privacy fence, a quick repair after storm damage, or a custom gate for your driveway — our team shows up on time, works clean, and delivers results you'll be proud of.",
  teamPhotoAlt: "Macias Multy Services fence installation project in Miami",
};

export const CTA_BANNER = {
  headline: "Need a Fence? We've Got You.",
  body: "Get a free quote today. Installation, repair, or gates — we handle it all across Miami and South Florida. Available 24 hours a day.",
};

export const BADGES = [
  "Licensed & Insured",
  "Free Estimates",
  "Available 24/7",
  "Upfront Pricing",
];

export const SERVICES = [
  {
    name: "Fence Installation",
    desc: "New fence installations for residential and commercial properties. We work with wood, vinyl, chain link, aluminum, and more — built to last in Florida's climate.",
  },
  {
    name: "Fence Repair",
    desc: "Damaged, leaning, or rotting fence? We fix it fast. From broken posts and rails to full panel replacements, we restore your fence to like-new condition.",
  },
  {
    name: "Wood Fencing",
    desc: "Beautiful custom wood fences that add privacy and curb appeal. We use quality treated lumber and expert craftsmanship for a fence that looks great for years.",
  },
  {
    name: "Vinyl & PVC Fencing",
    desc: "Low-maintenance vinyl fences in a variety of styles and colors. Durable, weather-resistant, and perfect for South Florida's heat and humidity.",
  },
  {
    name: "Chain Link Fencing",
    desc: "Affordable and durable chain link fences for residential, commercial, and security applications. Quick installation with long-lasting results.",
  },
  {
    name: "Gate Installation & Repair",
    desc: "We install and repair manual and automatic gates for driveways and entrances. Secure, smooth operation — done right the first time.",
  },
];

export const REVIEWS = [
  {
    text: "Macias Multy Services did an amazing job replacing our old wooden fence. They were on time, professional, and the finished product looks incredible. Definitely recommend them to anyone in Miami.",
    author: "Roberto G.",
    source: "Google Review",
  },
  {
    text: "Called them for an emergency fence repair after a storm knocked part of it down. They came out the same day and had it fixed quickly. Great price and great service — 5 stars all the way.",
    author: "Maria S.",
    source: "Google Review",
  },
  {
    text: "Had them install a full vinyl privacy fence around our backyard. The crew was clean, respectful, and finished ahead of schedule. Our neighbors already asked for their number!",
    author: "James T.",
    source: "Google Review",
  },
];

// ============================================================
//  THEME — HSL values only (no "hsl()" wrapper)
//  primary        = brand accent color (buttons, highlights)
//  background     = page background
//  card           = card / panel background
//  accent         = secondary highlight
// ============================================================

export const THEME = {
  primary: "142 71% 30%",      // Tier 1 dark green
  primaryFg: "0 0% 100%",
  background: "215 35% 8%",    // Deep navy
  foreground: "35 30% 96%",
  card: "215 28% 13%",
  cardFg: "35 30% 96%",
  accent: "142 71% 25%",       // Tier 1 dark green marker
  accentFg: "215 35% 8%",
  mutedFg: "35 15% 70%",
  border: "215 25% 20%",
};

// ============================================================
//  PITCH_MODE — Set to `true` when you're shipping a design pitch
//  without a backend deployed yet. The quote form will hide its
//  submit button and show a "We'll call you back at <phone>"
//  message instead of trying to POST to /api/quote.
//  Flip to `false` when the backend is live.
// ============================================================

export const PITCH_MODE = false;
