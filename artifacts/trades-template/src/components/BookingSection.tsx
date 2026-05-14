// BookingSection — Cal.com (or any iframe-friendly scheduler) embed.
//
// Reads business.config.json → calBookingUrl. If empty/missing, this section
// renders NOTHING (no booking link in the nav, no section in the page). That
// way clients without an online scheduler don't see a half-built section.
//
// To enable: set "calBookingUrl" in business.config.json to the client's
// public Cal.com booking page URL (e.g. "https://cal.com/acme-roofing").
// Works with anything else that supports iframe embed (Calendly, SimplyBook,
// etc.) — the URL just needs to render its booking UI when embedded.

import { useTranslation } from "react-i18next";
import { Calendar } from "lucide-react";
import biz from "../../../../business.config.json";

export function BookingSection() {
  const { t } = useTranslation();
  const url = (biz as { calBookingUrl?: string }).calBookingUrl;

  if (!url || url.trim() === "") return null;

  return (
    <section id="booking" className="py-24 bg-background border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-primary font-bold tracking-widest uppercase mb-4 text-sm flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" /> {t("booking.intro")}
          </h2>
          <h3 className="text-4xl md:text-5xl font-condensed font-bold uppercase tracking-wide mb-4">
            {t("booking.headline")}
          </h3>
          <p className="text-muted-foreground text-lg">{t("booking.body")}</p>
        </div>

        <div className="max-w-3xl mx-auto bg-card border border-white/10 rounded overflow-hidden">
          <iframe
            src={url}
            title="Book a time"
            className="w-full"
            style={{ height: "720px", border: "none" }}
            loading="lazy"
          />
        </div>
      </div>
    </section>
  );
}
