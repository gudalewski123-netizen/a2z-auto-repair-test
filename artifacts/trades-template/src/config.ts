// ============================================================
//  TEMPLATE CONFIG — Edit this file to fully rebrand the site
//  Every section below maps directly to what appears on screen
// ============================================================

export const BUSINESS = {
  name: "Royalty Concrete & Remodeling Services LLC",
  shortName: "Royalty Concrete & Remodeling",
  subTagline: "Concrete & Remodeling", // small line under the logo
  trade: "Concrete & Remodeling Contractor",
  location: "Miami, FL",
  serviceArea: "Miami & All of Miami-Dade County, FL",
  serviceAreaShort: "Miami and Miami-Dade County", // used inside body copy

  phone: "(786) 788-6001",
  phoneRaw: "+17867886001",

  email: "info@royaltyconcretemiami.com",

  hours: "Sat 8:00 AM – 12:00 AM • Call for Daily Hours",

  yearsInBusiness: "", // empty hides the floating "X+ Years Experience" badge
};

export const HERO = {
  headline1: "Built To",
  headline2: "Last A Lifetime",
  subheading:
    "From custom driveways and patios to full home remodels — Royalty Concrete & Remodeling brings expert craftsmanship to every project across Miami and Miami-Dade County. Quality work, honest pricing, on time.",
  cta1: "Call (786) 788-6001",
  cta2: "Book Service",
};

// 3 trust badges shown below the hero CTAs. Icon keys must be one of:
//   "ShieldCheck" | "MessageSquare" | "Zap" | "Hammer" | "Star" | "PhoneCall"
export const HERO_BADGES = [
  { label: "Licensed & Insured", icon: "ShieldCheck" },
  { label: "Free Estimates",     icon: "MessageSquare" },
  { label: "Fast Response Time", icon: "Zap" },
];

export const SERVICES_SECTION = {
  intro: "Our Expertise",
  headline: "What We Do Best",
};

export const SERVICES = [
  {
    name: "Concrete Driveways",
    desc: "Custom concrete driveways built to last. From new pours to full replacements, we deliver a smooth, durable finish that boosts your home's curb appeal and value.",
  },
  {
    name: "Patios & Walkways",
    desc: "Transform your outdoor space with beautifully crafted patios and walkways. Choose from classic finishes or stamped designs to fit your style.",
  },
  {
    name: "Foundations & Slabs",
    desc: "Solid, code-compliant concrete foundations and slabs for homes, additions, garages, and commercial projects. Built right from the ground up.",
  },
  {
    name: "Stamped & Decorative Concrete",
    desc: "Add character to your property with stamped, stained, and decorative concrete. Get the look of brick, stone, or tile at a fraction of the cost.",
  },
  {
    name: "Concrete Repair & Resurfacing",
    desc: "Cracked, uneven, or worn-out concrete? We repair, resurface, and restore old slabs to look new again — saving you the cost of full replacement.",
  },
  {
    name: "Home Remodeling",
    desc: "Full-service remodeling for kitchens, bathrooms, and interiors. Our team handles every detail, delivering quality craftsmanship and clean finishes.",
  },
];

export const ABOUT = {
  intro: "About Us",
  headline: "We Don't Cut Corners. We Pour Them Right.",
  body1:
    "Royalty Concrete & Remodeling Services LLC has been transforming Miami homes and businesses with quality concrete and remodeling work. Based in the heart of Miami, we serve homeowners, contractors, and commercial clients throughout Miami-Dade County.",
  body2:
    "From driveways, patios, and foundations to kitchen and bathroom remodels — every project gets the same attention to detail. We show up on time, communicate clearly, and finish what we start.",
  bullets: [
    "Licensed & Insured",
    "Upfront Pricing",
    "Free Estimates",
    "Clean & Respectful",
  ],
  teamPhotoAlt: "Royalty Concrete & Remodeling pool patio project in Miami",
  ctaLabel: "Call Us Now",
};

export const CTA_BANNER = {
  headline: "Ready to Build Something Great?",
  body: "Get a free quote today. Whether it's a new driveway, a backyard patio, or a full remodel — we'll handle it from start to finish.",
};

export const REVIEWS_SECTION = {
  intro: "Client Testimonials",
  headline: "Don't Just Take Our Word For It",
  showSection: true, // set to false to hide the whole reviews section + nav link
};

export const REVIEWS = [
  {
    text: "Royalty Concrete poured a new driveway and walkway for us in Miami and it came out beautiful. The team was professional, the work was clean, and they finished on schedule. Very happy with the results.",
    author: "Carlos M.",
    source: "Google Review",
  },
  {
    text: "Hired them for a full patio remodel with stamped concrete. The crew showed up when they said they would and the finished work looks amazing. Fair pricing for the quality.",
    author: "Jessica R.",
    source: "Google Review",
  },
  {
    text: "Royalty handled both our foundation repair and bathroom remodel. Honest, hardworking team that takes pride in what they do. Would absolutely hire them again.",
    author: "David L.",
    source: "Google Review",
  },
];

export const CONTACT_SECTION = {
  intro: "Get In Touch",
  headline: "Ready to Help, Right Now",
  body: "Call, text, or email us — we respond fast, 24 hours a day, 7 days a week.",
};

export const FOOTER = {
  // Defaults to BUSINESS.shortName if empty
  copyrightLine: "",
  license: "Licensed & Insured",
};

// ============================================================
//  THEME — HSL values only (no "hsl()" wrapper)
//  Applied at runtime via the useApplyTheme() hook in App.tsx
//  which sets these as CSS variables on document.documentElement
//  (Tailwind v4 reads them through the @theme directive in index.css)
// ============================================================

export const THEME = {
  background: "215 35% 8%",     // deep ocean navy
  foreground: "35 30% 96%",     // warm off-white
  card: "215 28% 13%",
  cardForeground: "35 30% 96%",
  cardBorder: "180 35% 30%",
  primary: "217 91% 55%",       // bold blue
  primaryForeground: "0 0% 100%",
  muted: "215 28% 13%",
  mutedForeground: "35 15% 70%",
  accent: "199 89% 48%",        // sky blue accent
  accentForeground: "0 0% 100%",
  border: "215 25% 20%",
  input: "215 25% 20%",
  ring: "217 91% 55%",
};
