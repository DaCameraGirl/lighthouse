import { useState } from "react";
import { Dashboard } from "./views/Dashboard.js";
import { Directories } from "./views/Directories.js";
import { PressKitStudio } from "./views/PressKitStudio.js";
import { Cockpit } from "./views/Cockpit.js";

type View = "dashboard" | "directories" | "presskit" | "cockpit";

const NAV: { id: View; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "directories", label: "Directory Explorer" },
  { id: "presskit", label: "Press Kit Studio" },
  { id: "cockpit", label: "Submission Cockpit" },
];

export function App() {
  const [view, setView] = useState<View>("dashboard");

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
          Get seen everywhere
          <br />
          that matters.
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
