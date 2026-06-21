import { useEffect, useState } from "react";
import type { Directory } from "@lighthouse/core";
import { api } from "../api.js";
import { PageHead, AutomationBadge } from "../components.js";

export function Directories() {
  const [dirs, setDirs] = useState<Directory[]>([]);
  const [freeOnly, setFreeOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .directories(true) // ranked by opportunity score
      .then(setDirs)
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  const visible = freeOnly ? dirs.filter((d) => d.pricing.model !== "paid") : dirs;

  return (
    <>
      <PageHead
        title="Directory Explorer"
        sub="The curated catalog, ranked by opportunity — reach × likelihood of acceptance."
        action={
          <button className={`btn ${freeOnly ? "primary" : ""}`} onClick={() => setFreeOnly((v) => !v)}>
            {freeOnly ? "Showing free only" : "Free only"}
          </button>
        }
      />

      {error && <div className="card">Couldn't load directories ({error}).</div>}

      <div className="card" style={{ padding: 0 }}>
        <div className="rows" style={{ padding: "0 var(--s4)" }}>
          <div className="row" style={{ color: "var(--ink-3)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em" }}>
            <span>Directory</span>
            <span>Category</span>
            <span>DA</span>
            <span>Routing</span>
            <span>Pricing</span>
          </div>
          {visible.map((d) => (
            <div className="row" key={d.id}>
              <div>
                <div className="row-title">{d.name}</div>
                <div className="row-sub">{new URL(d.url).host}</div>
              </div>
              <span className="row-sub">{d.category.replace("-", " ")}</span>
              <span className="da">{d.domainAuthority}</span>
              <AutomationBadge cls={d.automationClass} />
              <span className="row-sub">
                {d.pricing.model === "paid" ? `$${d.pricing.amountUsd}` : d.pricing.model}
              </span>
            </div>
          ))}
          {visible.length === 0 && !error && <div className="empty">Loading catalog…</div>}
        </div>
      </div>
    </>
  );
}
