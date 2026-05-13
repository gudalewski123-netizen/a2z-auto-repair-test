import { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  PhoneCall, Mail, ArrowLeft, Inbox, Briefcase, Palette,
  RefreshCw, LogOut, Save, Trash2, ChevronDown, ChevronRight, AlertCircle,
} from "lucide-react";
import { BUSINESS, SERVICES, THEME } from "../config";

// ============================================================
//  Admin dashboard — Tier 1
//
//  /admin shows incoming leads from the quote form. A separate "Brand"
//  tab shows the config currently shipping (handy for client demos).
//
//  Auth: ADMIN_PASSWORD env var on the backend. The dashboard prompts
//  for it on first visit, stores it in localStorage, and sends it as a
//  Bearer token on every protected API call. Wrong password → 403 → re-prompt.
// ============================================================

type Status = "new" | "contacted" | "won" | "lost";

interface Lead {
  id: number;
  createdAt: string;
  name: string;
  phone: string;
  email: string;
  service: string | null;
  message: string | null;
  status: Status;
  adminNotes: string | null;
}

const STATUS_COLORS: Record<Status, string> = {
  new: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  contacted: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  won: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  lost: "bg-red-500/20 text-red-300 border-red-500/30",
};

function useAdminKey(): [string | null, (k: string | null) => void] {
  const [key, setKey] = useState<string | null>(() =>
    typeof window === "undefined" ? null : window.localStorage.getItem("adminKey")
  );
  return [key, (k) => {
    if (k) window.localStorage.setItem("adminKey", k);
    else window.localStorage.removeItem("adminKey");
    setKey(k);
  }];
}

function LoginScreen({ onLogin }: { onLogin: (key: string) => void }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        setErr("Wrong password.");
        setBusy(false);
        return;
      }
      onLogin(pw);
    } catch {
      setErr("Network error — is the backend deployed?");
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-6">
      <form onSubmit={handle} className="w-full max-w-sm bg-card border border-white/10 rounded-xl p-8 space-y-5">
        <div className="text-center">
          <h1 className="font-condensed text-2xl font-bold uppercase tracking-widest mb-2">Admin Sign In</h1>
          <p className="text-muted-foreground text-sm">{BUSINESS.name}</p>
        </div>
        <input
          type="password" autoFocus required
          placeholder="Admin password"
          value={pw} onChange={(e) => setPw(e.target.value)}
          className="w-full bg-background border border-white/10 rounded px-4 py-3 text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary"
        />
        {err && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {err}
          </div>
        )}
        <button
          type="submit" disabled={busy || !pw}
          className="w-full bg-primary hover:bg-primary/90 disabled:opacity-60 text-white px-6 py-3 rounded font-condensed text-lg uppercase tracking-wider font-bold"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>
        <div className="text-center">
          <Link href="/" className="text-xs text-muted-foreground hover:text-white">
            ← Back to site
          </Link>
        </div>
      </form>
    </div>
  );
}

function LeadsList({ adminKey, onLogout }: { adminKey: string; onLogout: () => void }) {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  async function load() {
    setErr(null);
    try {
      const res = await fetch("/api/admin/leads", {
        headers: { Authorization: `Bearer ${adminKey}` },
      });
      if (res.status === 403) { onLogout(); return; }
      if (!res.ok) { setErr(`Failed (${res.status})`); return; }
      setLeads(await res.json());
    } catch (e) {
      setErr("Network error");
    }
  }

  useEffect(() => { void load(); }, []);

  async function update(id: number, changes: Partial<Pick<Lead, "status" | "adminNotes">>) {
    const res = await fetch(`/api/admin/leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminKey}` },
      body: JSON.stringify(changes),
    });
    if (res.ok) await load();
  }

  async function remove(id: number) {
    if (!confirm("Delete this lead permanently?")) return;
    const res = await fetch(`/api/admin/leads/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminKey}` },
    });
    if (res.ok) await load();
  }

  const filtered = (leads || []).filter((l) => filter === "all" || l.status === filter);
  const counts = (leads || []).reduce((acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-condensed text-2xl font-bold uppercase tracking-widest mr-auto">
          Leads <span className="text-muted-foreground">({leads?.length ?? 0})</span>
        </h2>
        {(["all", "new", "contacted", "won", "lost"] as const).map((s) => (
          <button
            key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded border text-xs font-bold uppercase tracking-wider transition ${
              filter === s ? "bg-primary text-white border-primary" : "bg-card border-white/10 text-muted-foreground hover:text-white"
            }`}
          >
            {s} {s !== "all" && counts[s] !== undefined && `(${counts[s]})`}
          </button>
        ))}
        <button onClick={load} className="p-2 rounded border border-white/10 text-muted-foreground hover:text-white" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {err && (
        <div className="bg-red-500/10 border border-red-500/30 rounded p-4 text-red-300">
          {err} — is the backend deployed and is /api/admin/leads accessible?
        </div>
      )}

      {leads === null && !err && (
        <div className="text-muted-foreground text-center py-12">Loading…</div>
      )}

      {leads !== null && filtered.length === 0 && (
        <div className="text-muted-foreground text-center py-12 border border-white/8 rounded-xl bg-card">
          <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
          No leads yet. Submissions from the quote form will appear here.
        </div>
      )}

      {/* Leads list */}
      <div className="space-y-2">
        {filtered.map((lead) => {
          const expanded = expandedId === lead.id;
          return (
            <div key={lead.id} className="bg-card border border-white/8 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedId(expanded ? null : lead.id)}
                className="w-full grid grid-cols-12 gap-3 items-center px-5 py-4 text-left hover:bg-white/3 transition"
              >
                <div className="col-span-3 sm:col-span-2 text-xs text-muted-foreground font-mono">
                  {new Date(lead.createdAt).toLocaleDateString()}
                </div>
                <div className="col-span-5 sm:col-span-3 font-medium text-white truncate">{lead.name}</div>
                <div className="col-span-4 sm:col-span-3 text-muted-foreground truncate">{lead.service || "—"}</div>
                <div className="hidden sm:flex sm:col-span-2 items-center gap-2 text-xs text-muted-foreground truncate">
                  <PhoneCall className="w-3 h-3" /> {lead.phone}
                </div>
                <div className="hidden sm:flex sm:col-span-1 justify-end">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[lead.status]}`}>
                    {lead.status}
                  </span>
                </div>
                <div className="hidden sm:flex sm:col-span-1 justify-end text-muted-foreground">
                  {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </div>
              </button>

              {expanded && (
                <div className="border-t border-white/8 px-5 py-5 space-y-4 bg-background/30">
                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-primary hover:underline">
                      <PhoneCall className="w-4 h-4" /> {lead.phone}
                    </a>
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-primary hover:underline">
                      <Mail className="w-4 h-4" /> {lead.email}
                    </a>
                  </div>

                  {lead.message && (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Message</div>
                      <p className="text-white whitespace-pre-wrap text-sm">{lead.message}</p>
                    </div>
                  )}

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Status</div>
                      <select
                        value={lead.status}
                        onChange={(e) => void update(lead.id, { status: e.target.value as Status })}
                        className="w-full bg-card border border-white/10 rounded px-3 py-2 text-white text-sm"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="won">Won</option>
                        <option value="lost">Lost</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Internal notes</div>
                    <textarea
                      rows={2}
                      defaultValue={lead.adminNotes || ""}
                      onBlur={(e) => {
                        if (e.target.value !== (lead.adminNotes || "")) {
                          void update(lead.id, { adminNotes: e.target.value });
                        }
                      }}
                      placeholder="Notes only you see (saves on blur)…"
                      className="w-full bg-card border border-white/10 rounded px-3 py-2 text-white text-sm placeholder:text-muted-foreground resize-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => void remove(lead.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BrandConfig() {
  return (
    <div className="space-y-6">
      <h2 className="font-condensed text-2xl font-bold uppercase tracking-widest">Brand & Site Config</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="bg-card border border-white/8 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-primary"><Briefcase className="w-4 h-4" /> <span className="text-xs font-bold uppercase tracking-widest">Business</span></div>
          <div className="text-white font-medium">{BUSINESS.name}</div>
          <div className="text-muted-foreground text-sm">{BUSINESS.trade} · {BUSINESS.location}</div>
          <div className="text-muted-foreground text-sm">{BUSINESS.phone}</div>
        </div>
        <div className="bg-card border border-white/8 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-primary"><Palette className="w-4 h-4" /> <span className="text-xs font-bold uppercase tracking-widest">Theme</span></div>
          <div className="flex gap-2">
            <div className="w-10 h-10 rounded border border-white/10" style={{ background: `hsl(${THEME.primary})` }} />
            <div className="w-10 h-10 rounded border border-white/10" style={{ background: `hsl(${THEME.background})` }} />
            <div className="w-10 h-10 rounded border border-white/10" style={{ background: `hsl(${THEME.card})` }} />
          </div>
          <div className="text-muted-foreground text-sm">{SERVICES.length} services configured</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Brand details live in <span className="font-mono">artifacts/trades-template/src/config.ts</span>. Edit there to update the site.
      </p>
    </div>
  );
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useAdminKey();
  const [tab, setTab] = useState<"leads" | "brand">("leads");

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", THEME.primary);
    root.style.setProperty("--background", THEME.background);
    root.style.setProperty("--foreground", THEME.foreground);
    root.style.setProperty("--card", THEME.card);
    root.style.setProperty("--card-foreground", THEME.cardFg);
    root.style.setProperty("--muted-foreground", THEME.mutedFg);
    root.style.setProperty("--border", THEME.border);
    root.style.setProperty("--muted", THEME.card);
  }, []);

  if (!adminKey) {
    return <LoginScreen onLogin={(k) => setAdminKey(k)} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 bg-card/60 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-white">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm font-bold uppercase tracking-wider">Back to Site</span>
            </Link>
            <div className="w-px h-5 bg-white/10" />
            <h1 className="font-condensed text-xl font-bold uppercase tracking-widest">{BUSINESS.shortName} Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-card border border-white/10 rounded overflow-hidden">
              <button onClick={() => setTab("leads")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${tab === "leads" ? "bg-primary text-white" : "text-muted-foreground hover:text-white"}`}>Leads</button>
              <button onClick={() => setTab("brand")} className={`px-4 py-2 text-xs font-bold uppercase tracking-wider ${tab === "brand" ? "bg-primary text-white" : "text-muted-foreground hover:text-white"}`}>Brand</button>
            </div>
            <button onClick={() => setAdminKey(null)} className="flex items-center gap-1.5 px-3 py-2 rounded border border-white/10 text-xs text-muted-foreground hover:text-white">
              <LogOut className="w-3 h-3" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {tab === "leads" ? <LeadsList adminKey={adminKey} onLogout={() => setAdminKey(null)} /> : <BrandConfig />}
      </main>
    </div>
  );
}
