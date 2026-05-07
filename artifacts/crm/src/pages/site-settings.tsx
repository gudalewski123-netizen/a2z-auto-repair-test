import { useState } from "react";
import { useSubmitSiteChange, useListSiteChanges } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, Loader2, Paintbrush, Sparkles, AlertCircle } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
};

export default function SiteSettings() {
  const [tab, setTab] = useState<"structured" | "prompt">("structured");
  const [submitted, setSubmitted] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [aboutText, setAboutText] = useState("");
  const [servicesText, setServicesText] = useState("");
  const [photoNotes, setPhotoNotes] = useState("");
  const [pricingNotes, setPricingNotes] = useState("");
  const [promptText, setPromptText] = useState("");

  const { data: history, refetch } = useListSiteChanges();
  const { mutate: submitChange, isPending } = useSubmitSiteChange({
    mutation: {
      onSuccess: () => {
        setSubmitted(true);
        refetch();
        setBusinessName("");
        setPhone("");
        setAboutText("");
        setServicesText("");
        setPhotoNotes("");
        setPricingNotes("");
        setPromptText("");
      },
    },
  });

  const handleSubmit = () => {
    if (tab === "prompt" && !promptText.trim()) return;
    submitChange({
      data: {
        requestType: tab,
        businessName: businessName || null,
        phone: phone || null,
        aboutText: aboutText || null,
        servicesText: servicesText || null,
        photoNotes: photoNotes || null,
        pricingNotes: pricingNotes || null,
        promptText: promptText || null,
      },
    });
  };

  const anyStructuredFilled =
    businessName.trim() ||
    phone.trim() ||
    aboutText.trim() ||
    servicesText.trim() ||
    photoNotes.trim() ||
    pricingNotes.trim();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Site Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Request changes to your website. We'll apply them and get your site updated within 24–48 hours.
        </p>
      </div>

      {submitted && (
        <div className="glass flex items-start gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
          <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm text-primary">Request submitted!</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              We received your changes and will update your site within 24–48 hours. You'll see the status update below.
            </p>
          </div>
        </div>
      )}

      <div className="glass-subtle rounded-2xl p-6 border border-white/10">
        <Tabs value={tab} onValueChange={(v) => { setTab(v as "structured" | "prompt"); setSubmitted(false); }}>
          <TabsList className="mb-6 w-full">
            <TabsTrigger value="structured" className="flex-1 gap-2">
              <Paintbrush className="w-4 h-4" /> Quick Updates
            </TabsTrigger>
            <TabsTrigger value="prompt" className="flex-1 gap-2">
              <Sparkles className="w-4 h-4" /> Custom Request
            </TabsTrigger>
          </TabsList>

          <TabsContent value="structured" className="space-y-5">
            <p className="text-sm text-muted-foreground -mt-2 mb-4">
              Fill in only the fields you want to change — leave the rest blank.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="biz-name">Business Name</Label>
                <Input
                  id="biz-name"
                  className="glass-input"
                  placeholder="e.g. Royalty Concrete & Remodeling"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  className="glass-input"
                  placeholder="e.g. (786) 788-6001"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="about">About Section Text</Label>
              <Textarea
                id="about"
                className="glass-input resize-none"
                rows={4}
                placeholder="Describe your business, experience, and what makes you different…"
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="services">Services List</Label>
              <Textarea
                id="services"
                className="glass-input resize-none"
                rows={3}
                placeholder="List your services, one per line. e.g.&#10;Concrete Driveways&#10;Patio & Walkways&#10;Home Remodeling"
                value={servicesText}
                onChange={(e) => setServicesText(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="pricing">Pricing / Rates</Label>
                <Textarea
                  id="pricing"
                  className="glass-input resize-none"
                  rows={3}
                  placeholder="e.g. Starting from $500 for driveways, free estimates…"
                  value={pricingNotes}
                  onChange={(e) => setPricingNotes(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="photos">Photo Updates</Label>
                <Textarea
                  id="photos"
                  className="glass-input resize-none"
                  rows={3}
                  placeholder="Describe what photos to swap out, or share a Google Drive/Dropbox link…"
                  value={photoNotes}
                  onChange={(e) => setPhotoNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={isPending || !anyStructuredFilled}
                className="gap-2"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isPending ? "Submitting…" : "Submit Changes"}
              </Button>
              {!anyStructuredFilled && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> Fill in at least one field
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="prompt" className="space-y-5">
            <p className="text-sm text-muted-foreground -mt-2 mb-4">
              Describe any change you want — in plain English. We'll read it and make it happen.
            </p>

            <div className="space-y-2">
              <Label htmlFor="prompt">What would you like us to change?</Label>
              <Textarea
                id="prompt"
                className="glass-input resize-none"
                rows={8}
                placeholder="e.g. Change the hero headline to 'South Florida's Most Trusted Roofer' and update the phone number to (305) 555-1234. Also swap the about section photo with the team photo I uploaded to this Google Drive link: https://..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Be as specific as you'd like. Include links to new photos or documents if needed.
              </p>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isPending || !promptText.trim()}
              className="gap-2"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? "Submitting…" : "Send Request"}
            </Button>
          </TabsContent>
        </Tabs>
      </div>

      {history && history.length > 0 && (
        <div className="glass-subtle rounded-2xl p-6 border border-white/10 space-y-4">
          <h2 className="font-semibold text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" /> Request History
          </h2>
          <div className="space-y-3">
            {history.map((req) => {
              const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
              return (
                <div
                  key={req.id}
                  className="glass rounded-xl p-4 border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant={cfg.variant} className="capitalize text-xs">
                        {cfg.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground capitalize">
                        {req.requestType === "prompt" ? "Custom request" : "Quick update"}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(req.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {req.requestType === "prompt" && req.promptText && (
                    <p className="text-sm text-foreground/80 line-clamp-3">{req.promptText}</p>
                  )}

                  {req.requestType === "structured" && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      {req.businessName && <p><span className="font-medium text-foreground/70">Business name:</span> {req.businessName}</p>}
                      {req.phone && <p><span className="font-medium text-foreground/70">Phone:</span> {req.phone}</p>}
                      {req.aboutText && <p><span className="font-medium text-foreground/70">About:</span> {req.aboutText.slice(0, 100)}{req.aboutText.length > 100 ? "…" : ""}</p>}
                      {req.servicesText && <p><span className="font-medium text-foreground/70">Services:</span> {req.servicesText.slice(0, 80)}{req.servicesText.length > 80 ? "…" : ""}</p>}
                      {req.pricingNotes && <p><span className="font-medium text-foreground/70">Pricing:</span> {req.pricingNotes.slice(0, 80)}{req.pricingNotes.length > 80 ? "…" : ""}</p>}
                      {req.photoNotes && <p><span className="font-medium text-foreground/70">Photos:</span> {req.photoNotes.slice(0, 80)}{req.photoNotes.length > 80 ? "…" : ""}</p>}
                    </div>
                  )}

                  {req.adminNotes && (
                    <div className="text-xs text-primary/80 bg-primary/5 rounded-lg px-3 py-2 border border-primary/10">
                      <span className="font-semibold">Note from us:</span> {req.adminNotes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
