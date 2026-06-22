import { useEffect, useMemo, useState } from "react";
import type { Directory, PressKit, Submission } from "@lighthouse/core";
import { api } from "../api.js";
import { PageHead, StatusBadge, CopyButton } from "../components.js";

type Tailored = { tagline: string; description: string };

/**
 * The submission cockpit. For every directory that can't (or shouldn't) be
 * automated, the operator gets the exact copy to paste, field by field, plus a
 * one-click open of the directory's submission page and a status control. This
 * is the semi-automatic tier — ~80% of the value of full automation with none
 * of the captcha/ToS fragility.
 */
export function Cockpit() {
  const [subs, setSubs] = useState<Submission[]>([]);
  const [dirs, setDirs] = useState<Directory[]>([]);
  const [kits, setKits] = useState<PressKit[]>([]);
  const [selectedKit, setSelectedKit] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    Promise.all([api.submissions(), api.directories(), api.pressKits()])
      .then(([s, d, k]) => {
        setSubs(s);
        setDirs(d);
        setKits(k);
        if (!selectedKit && k[0]) setSelectedKit(k[0].id);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }
  useEffect(refresh, []);

  const dirById = useMemo(() => new Map(dirs.map((d) => [d.id, d])), [dirs]);
  const kitById = useMemo(() => new Map(kits.map((k) => [k.id, k])), [kits]);
  const actionable = subs.filter((s) => s.status === "needs_action" || s.status === "queued");

  async function launch() {
    if (!selectedKit) return;
    setBusy(true);
    setError(null);
    try {
      await api.launchCampaign({ pressKitId: selectedKit, limit: 15 });
      refresh();
    } catch (e) {
      setError(String((e as Error).message ?? e));
    } finally {
      setBusy(false);
    }
  }

  async function mark(id: string, status: string) {
    await api.updateSubmission(id, { status }).catch(() => {});
    refresh();
  }

  return (
    <>
      <PageHead
        title="Submission Cockpit"
        sub="Paste-ready copy for every directory that needs a human touch."
        action={
          <div className="flex">
            <select value={selectedKit} onChange={(e) => setSelectedKit(e.target.value)}>
              {kits.length === 0 && <option value="">No press kit yet</option>}
              {kits.map((k) => (
                <option key={k.id} value={k.id}>{k.productName}</option>
              ))}
            </select>
            <button className="btn primary" onClick={launch} disabled={busy || !selectedKit}>
              {busy ? "Launching…" : "Launch campaign"}
            </button>
          </div>
        }
      />

      {error && <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)", marginBottom: "var(--s4)" }}>{error}</div>}

      {actionable.length === 0 ? (
        <div className="card empty">
          Nothing in the cockpit yet. Pick a press kit and launch a campaign — automated
          directories go straight to the worker fleet, and the ones needing a human land here.
        </div>
      ) : (
        <div className="grid" style={{ gap: "var(--s4)" }}>
          {actionable.map((sub) => {
            const dir = dirById.get(sub.directoryId);
            const kit = kitById.get(sub.pressKitId);
            if (!dir || !kit) return null;
            return <SubmissionCard key={sub.id} sub={sub} dir={dir} kit={kit} onMark={mark} />;
          })}
        </div>
      )}
    </>
  );
}

function SubmissionCard({
  sub,
  dir,
  kit,
  onMark,
}: {
  sub: Submission;
  dir: Directory;
  kit: PressKit;
  onMark: (id: string, status: string) => void;
}) {
  const [tailored, setTailored] = useState<Tailored | null>(null);
  const [tailoring, setTailoring] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  async function tailor() {
    setTailoring(true);
    setAiError(null);
    try {
      setTailored(await api.tailorCopy({ pressKitId: sub.pressKitId, directoryId: dir.id }));
    } catch (e) {
      const msg = String((e as Error).message);
      setAiError(msg.includes("ai_unconfigured") ? "Add ANTHROPIC_API_KEY to enable AI tailoring." : "Tailoring failed.");
    } finally {
      setTailoring(false);
    }
  }

  // Prefer AI-tailored copy once generated; otherwise the base press kit.
  const fieldValue = (f: string): string => {
    switch (f) {
      case "name": return kit.productName;
      case "url": return kit.url;
      case "tagline": return tailored?.tagline ?? kit.taglines?.medium ?? "";
      case "description": return tailored?.description ?? kit.descriptions?.medium ?? "";
      case "category": return kit.category;
      case "founderName": return kit.founderName;
      case "email": return kit.email;
      case "twitter": return kit.twitter ?? "";
      default: return "";
    }
  };

  return (
    <div className="card card-hover">
      <div className="flex-between" style={{ marginBottom: "var(--s4)" }}>
        <div className="flex">
          <span className="row-title">{dir.name}</span>
          <span className="da">DA {dir.domainAuthority}</span>
          <StatusBadge status={sub.status} />
        </div>
        <div className="flex">
          <button className="btn sm" onClick={tailor} disabled={tailoring}>
            {tailoring ? "Tailoring…" : tailored ? "Re-tailor with AI" : "Tailor with AI"}
          </button>
          <a className="btn primary sm" href={dir.submissionUrl} target="_blank" rel="noreferrer">
            Open submission page ↗
          </a>
        </div>
      </div>

      {aiError && <div className="row-sub" style={{ color: "var(--warn)", marginBottom: "var(--s3)" }}>{aiError}</div>}
      {tailored && (
        <div className="badge accent" style={{ marginBottom: "var(--s3)" }}>
          <span className="dot" /> AI-tailored for {dir.name}
        </div>
      )}

      <div className="rows">
        {dir.fields
          .filter((f) => fieldValue(f))
          .map((f) => (
            <div className="row" key={f} style={{ gridTemplateColumns: "120px 1fr auto", padding: "var(--s3) 0" }}>
              <span className="row-sub" style={{ textTransform: "capitalize" }}>{f}</span>
              <span style={{ fontSize: 13, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {fieldValue(f)}
              </span>
              <CopyButton value={fieldValue(f)} />
            </div>
          ))}
      </div>

      <div className="flex" style={{ marginTop: "var(--s4)", justifyContent: "flex-end" }}>
        <button className="btn sm" onClick={() => onMark(sub.id, "rejected")}>Rejected</button>
        <button className="btn sm" onClick={() => onMark(sub.id, "submitted")}>Mark submitted</button>
        <button className="btn primary sm" onClick={() => onMark(sub.id, "live")}>Mark live</button>
      </div>
    </div>
  );
}
