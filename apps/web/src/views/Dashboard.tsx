import { useEffect, useState } from "react";
import { api, type AnalyticsOverview, type CatalogStats } from "../api.js";
import { PageHead, Stat } from "../components.js";

export function Dashboard() {
  const [stats, setStats] = useState<CatalogStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.catalogStats(), api.analytics()])
      .then(([s, a]) => {
        setStats(s);
        setAnalytics(a);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, []);

  const coverage =
    stats && analytics ? Math.round((analytics.liveListings / stats.total) * 100) : 0;

  return (
    <>
      <PageHead
        title="Dashboard"
        sub="Your distribution at a glance — coverage, live listings, and earned authority."
      />

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
          Couldn't reach the API ({error}). Start it with <code>npm run dev</code> in apps/api.
        </div>
      )}

      <div className="grid grid-4">
        <Stat
          label="Live listings"
          value={analytics?.liveListings ?? "—"}
          sub={`of ${stats?.total ?? "—"} directories`}
        />
        <Stat label="Referring domains" value={analytics?.referringDomains ?? "—"} sub="unique live links" />
        <Stat
          label="Backlink authority"
          value={analytics?.backlinkAuthority ?? "—"}
          sub="sum of live-listing DA"
        />
        <Stat label="Avg directory DA" value={stats?.avgDomainAuthority ?? "—"} sub="catalog quality" />
      </div>

      <div className="spacer" />

      <div className="card">
        <div className="flex-between" style={{ marginBottom: "var(--s4)" }}>
          <p className="section-label" style={{ margin: 0 }}>
            Campaign coverage
          </p>
          <span className="da">{coverage}%</span>
        </div>
        <div className="progress">
          <span style={{ width: `${coverage}%` }} />
        </div>
        <p className="stat-sub" style={{ marginTop: "var(--s3)" }}>
          {analytics?.liveListings ?? 0} of {stats?.total ?? 0} curated directories are live.
        </p>
      </div>

      <div className="spacer" />

      <div className="grid grid-3">
        <Stat label="Automated targets" value={stats?.byClass.auto ?? "—"} sub="handled by worker fleet" />
        <Stat label="Assisted targets" value={stats?.byClass.assisted ?? "—"} sub="one-click in cockpit" />
        <Stat label="Manual targets" value={stats?.byClass.manual ?? "—"} sub="paste & submit in cockpit" />
      </div>
    </>
  );
}
