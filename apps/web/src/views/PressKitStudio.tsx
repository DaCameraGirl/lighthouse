import { useEffect, useState } from "react";
import type { PressKit } from "@lighthouse/core";
import { api } from "../api.js";
import { PageHead } from "../components.js";

const EMPTY = {
  productName: "",
  url: "",
  category: "ai-tools",
  founderName: "",
  email: "",
  twitter: "",
  taglines: { short: "", medium: "", long: "" },
  descriptions: { short: "", medium: "", long: "" },
  logos: {},
};

/**
 * Enter your press kit once; every submission everywhere reuses it. The varying
 * lengths exist because directories ask for wildly different field sizes — a
 * 60-char tagline here, a 250-word description there. Store all the lengths up
 * front and the cockpit always has the right copy ready to paste.
 */
export function PressKitStudio() {
  const [form, setForm] = useState(EMPTY);
  const [existing, setExisting] = useState<PressKit[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.pressKits().then(setExisting).catch(() => {});
  }, [saved]);

  function set(path: string, value: string) {
    setForm((f) => {
      const next = structuredClone(f) as Record<string, unknown>;
      const parts = path.split(".");
      let cur = next;
      for (let i = 0; i < parts.length - 1; i++) cur = cur[parts[i]] as Record<string, unknown>;
      cur[parts[parts.length - 1]] = value;
      return next as typeof EMPTY;
    });
  }

  async function save() {
    setError(null);
    try {
      await api.createPressKit(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      setForm(EMPTY);
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  }

  return (
    <>
      <PageHead
        title="Press Kit Studio"
        sub="Enter it once. Lighthouse reuses it across every directory submission."
        action={
          <button className="btn primary" onClick={save}>
            {saved ? "Saved ✓" : "Save press kit"}
          </button>
        }
      />

      {error && <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)", marginBottom: "var(--s4)" }}>{error}</div>}
      {existing.length > 0 && (
        <p className="page-sub" style={{ marginTop: 0, marginBottom: "var(--s4)" }}>
          {existing.length} press kit{existing.length > 1 ? "s" : ""} saved · most recent: <b>{existing[0].productName}</b>
        </p>
      )}

      <div className="grid grid-2">
        <div className="card">
          <p className="section-label">Identity</p>
          <Field label="Product name" value={form.productName} onChange={(v) => set("productName", v)} />
          <Field label="URL" value={form.url} onChange={(v) => set("url", v)} placeholder="https://" />
          <Field label="Founder name" value={form.founderName} onChange={(v) => set("founderName", v)} />
          <Field label="Contact email" value={form.email} onChange={(v) => set("email", v)} />
          <Field label="Twitter / X" value={form.twitter} onChange={(v) => set("twitter", v)} placeholder="@handle" />
          <div className="field">
            <label>Category</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)}>
              {["ai-tools", "saas", "dev-tools", "no-code", "general-launch", "marketplace-review", "startup-news"].map((c) => (
                <option key={c} value={c}>{c.replace("-", " ")}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card">
          <p className="section-label">Taglines</p>
          <Field label="Short (≤60 chars)" value={form.taglines.short} onChange={(v) => set("taglines.short", v)} />
          <Field label="Medium (≤120 chars)" value={form.taglines.medium} onChange={(v) => set("taglines.medium", v)} />
          <Field label="Long (≤250 chars)" value={form.taglines.long} onChange={(v) => set("taglines.long", v)} />

          <p className="section-label" style={{ marginTop: "var(--s5)" }}>Descriptions</p>
          <Area label="Short (~50 words)" value={form.descriptions.short} onChange={(v) => set("descriptions.short", v)} />
          <Area label="Medium (~100 words)" value={form.descriptions.medium} onChange={(v) => set("descriptions.medium", v)} />
          <Area label="Long (~250 words)" value={form.descriptions.long} onChange={(v) => set("descriptions.long", v)} />
        </div>
      </div>
    </>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function Area({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="field">
      <label>{label}</label>
      <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
