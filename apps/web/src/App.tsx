import { useEffect, useState } from "react";
import { Dashboard } from "./views/Dashboard.js";
import { Directories } from "./views/Directories.js";
import { PressKitStudio } from "./views/PressKitStudio.js";
import { Cockpit } from "./views/Cockpit.js";
import { Auth } from "./views/Auth.js";
import { api, getToken, setToken, type AuthResult } from "./api.js";

type View = "dashboard" | "directories" | "presskit" | "cockpit";

const NAV: { id: View; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "directories", label: "Directory Explorer" },
  { id: "presskit", label: "Press Kit Studio" },
  { id: "cockpit", label: "Submission Cockpit" },
];

interface Session {
  user: AuthResult["user"];
  org?: { id: string; name: string };
}

export function App() {
  const [view, setView] = useState<View>("dashboard");
  const [session, setSession] = useState<Session | null>(null);
  const [booting, setBooting] = useState(true);

  // Restore a session from a stored token on load.
  useEffect(() => {
    if (!getToken()) {
      setBooting(false);
      return;
    }
    api
      .me()
      .then((r) => setSession({ user: r.user, org: r.org }))
      .catch(() => setToken(null))
      .finally(() => setBooting(false));
  }, []);

  if (booting) return <div style={{ display: "grid", placeItems: "center", height: "100vh", color: "var(--ink-3)" }}>Loading…</div>;
  if (!session) return <Auth onAuthed={(r) => setSession({ user: r.user, org: r.org })} />;

  function signOut() {
    setToken(null);
    setSession(null);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">L</div>
          <span className="brand-name">Lighthouse</span>
        </div>
        <nav className="nav">
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${view === n.id ? "active" : ""}`}
              onClick={() => setView(n.id)}
            >
              <span className="nav-dot" />
              {n.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div style={{ fontWeight: 600, color: "var(--ink-2)" }}>{session.org?.name ?? "Your workspace"}</div>
          <div>{session.user.email}</div>
          <button className="btn ghost sm" style={{ marginTop: "var(--s2)", padding: 0 }} onClick={signOut}>
            Sign out
          </button>
          <div className="credit">
            Built by{" "}
            <a href="https://github.com/DaCameraGirl" target="_blank" rel="noopener noreferrer">
              Angela Hudson
            </a>
          </div>
        </div>
      </aside>

      <main className="main">
        {view === "dashboard" && <Dashboard />}
        {view === "directories" && <Directories />}
        {view === "presskit" && <PressKitStudio />}
        {view === "cockpit" && <Cockpit />}
      </main>
    </div>
  );
}
