import type { ReactNode } from "react";
import type { SubmissionStatus, AutomationClass } from "@lighthouse/core";

export function PageHead({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="card card-hover stat">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
      {sub && <span className="stat-sub">{sub}</span>}
    </div>
  );
}

const STATUS_TONE: Record<SubmissionStatus, string> = {
  live: "ok",
  submitted: "accent",
  in_progress: "accent",
  queued: "",
  needs_action: "warn",
  rejected: "danger",
  failed: "danger",
};

export function StatusBadge({ status }: { status: SubmissionStatus }) {
  const tone = STATUS_TONE[status] ?? "";
  return (
    <span className={`badge ${tone}`}>
      <span className="dot" />
      {status.replace("_", " ")}
    </span>
  );
}

const CLASS_LABEL: Record<AutomationClass, string> = {
  auto: "Automated",
  assisted: "Assisted",
  manual: "Manual",
};

export function AutomationBadge({ cls }: { cls: AutomationClass }) {
  const tone = cls === "auto" ? "ok" : cls === "assisted" ? "accent" : "";
  return <span className={`badge ${tone}`}>{CLASS_LABEL[cls]}</span>;
}

export function CopyButton({ value, label }: { value: string; label?: string }) {
  return (
    <button
      className="copy-btn"
      onClick={() => navigator.clipboard?.writeText(value)}
      title="Copy to clipboard"
    >
      {label ?? "copy"}
    </button>
  );
}
