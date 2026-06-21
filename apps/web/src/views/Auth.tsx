import { useState } from "react";
import { api, setToken, type AuthResult } from "../api.js";

/**
 * Login / signup gate. On success it stashes the JWT and hands the authed
 * user/org up to <App>, which then renders the cockpit.
 */
export function Auth({ onAuthed }: { onAuthed: (r: AuthResult) => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ orgName: "", name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set(key: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [key]: v }));
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const result =
        mode === "signup"
          ? await api.signup(form)
          : await api.login({ email: form.email, password: form.password });
      setToken(result.token);
      onAuthed(result);
    } catch (e) {
      setError(friendly(String((e as Error).message)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg)" }}>
      <div className="card" style={{ width: 380, padding: "var(--s6)" }}>
        <div className="brand" style={{ marginBottom: "var(--s5)", padding: 0 }}>
          <div className="brand-mark">L</div>
          <span className="brand-name">Lighthouse</span>
        </div>
        <h1 className="page-title" style={{ fontSize: 20, marginBottom: 4 }}>
          {mode === "signup" ? "Create your workspace" : "Welcome back"}
        </h1>
        <p className="page-sub" style={{ marginTop: 0, marginBottom: "var(--s5)" }}>
          {mode === "signup" ? "Start getting seen everywhere that matters." : "Sign in to your cockpit."}
        </p>

        {error && (
          <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)", marginBottom: "var(--s4)", padding: "var(--s3)" }}>
            {error}
          </div>
        )}

        {mode === "signup" && (
          <>
            <Field label="Workspace name" value={form.orgName} onChange={(v) => set("orgName", v)} />
            <Field label="Your name" value={form.name} onChange={(v) => set("name", v)} />
          </>
        )}
        <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} />
        <Field label="Password" type="password" value={form.password} onChange={(v) => set("password", v)} />

        <button className="btn primary" style={{ width: "100%", marginTop: "var(--s2)" }} onClick={submit} disabled={busy}>
          {busy ? "…" : mode === "signup" ? "Create workspace" : "Sign in"}
        </button>

        <p className="stat-sub" style={{ textAlign: "center", marginTop: "var(--s4)" }}>
          {mode === "signup" ? "Already have a workspace?" : "New here?"}{" "}
          <button className="btn ghost sm" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(null); }}>
            {mode === "signup" ? "Sign in" : "Create one"}
          </button>
        </p>
      </div>
    </div>
  );
}

function friendly(code: string): string {
  if (code.includes("invalid_credentials")) return "Wrong email or password.";
  if (code.includes("email_taken")) return "That email already has a workspace.";
  if (code.includes("invalid")) return "Check the fields and try again (password is 8+ characters).";
  return "Something went wrong. Try again.";
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
