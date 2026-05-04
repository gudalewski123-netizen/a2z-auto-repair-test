export const CONTACT_STATUS_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  contacted: "Contacted",
  booked: "Booked",
  completed: "Completed",
  lost: "Lost / No Show",
};

export const CONTACT_SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  google_ads: "Google Ads",
  facebook: "Facebook",
  referral: "Referral",
  other: "Other",
};

export const PIPELINE_STAGES = [
  "new_lead",
  "contacted",
  "booked",
  "completed",
  "lost",
] as const;

export const STATUS_COLORS: Record<string, string> = {
  new_lead: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  contacted: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  booked: "bg-primary/10 text-primary border-primary/20",
  completed: "bg-green-500/10 text-green-600 border-green-500/20",
  lost: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};
