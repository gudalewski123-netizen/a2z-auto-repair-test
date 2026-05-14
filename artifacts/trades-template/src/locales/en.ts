// English translations for the trades-template UI chrome.
// Business content (services, reviews, about copy) stays in config.ts as the source language.

export const en = {
  nav: {
    services: "Services",
    about: "About",
    reviews: "Reviews",
    contact: "Contact",
    booking: "Book Online",
  },
  services: {
    intro: "Our Expertise",
    headline: "What We Do Best",
    learnMore: "Learn More",
  },
  about: {
    intro: "About Us",
    cta: "Call Us Now",
    yearsExperience: "Years Experience",
  },
  reviews: {
    intro: "Client Testimonials",
    headline: "Don't Just Take Our Word For It",
  },
  contact: {
    intro: "Get In Touch",
    headline: "Ready to Help, Right Now",
    body: "Call or text us — {{hours}}.",
    callUs: "Call Us",
    textUs: "Text Us",
    emailUs: "Email Us",
    tapToCall: "Tap to call instantly",
    tapToText: "Tap to open messages",
    replyHours: "We reply within hours",
    serviceArea: "Service Area",
    hours: "Hours",
  },
  quote: {
    headline: "Get a Free Quote",
    subhead: "Tell us about your project — we'll get back to you fast.",
    pitchSubhead: "We're finalizing our online quote form. In the meantime, give us a call — we answer fast.",
    success: "Got it.",
    successBody: "We received your request. Expect a call from {{phone}} within 1 business day.",
    namePlaceholder: "Your name *",
    phonePlaceholder: "Phone *",
    emailPlaceholder: "Email *",
    servicePlaceholder: "Which service do you need? *",
    serviceOther: "Other / Not sure",
    messagePlaceholder: "Tell us about your project (optional)",
    submitting: "Sending...",
    submit: "Request a Free Quote",
    error: "Something went wrong.",
    errorCall: "please call",
  },
  booking: {
    intro: "Schedule Online",
    headline: "Book a Time That Works for You",
    body: "Pick a slot that fits your day — we'll confirm by phone or text.",
  },
  footer: {
    rights: "All rights reserved",
    privacy: "Privacy",
    terms: "Terms",
    admin: "Admin",
  },
  language: {
    label: "Language",
  },
};

export type TranslationKeys = typeof en;
