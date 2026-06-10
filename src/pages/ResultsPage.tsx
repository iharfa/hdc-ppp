import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  records,
  sampleResponses,
  moderationItems,
  countBy,
} from "../services/dataService";
import { getLocalSubmissions } from "../services/storage";
import { Chart, barOption, pieOption, lineOption } from "../components/Chart";
import { StatusBadge } from "../components/StatusBadge";

export function ResultsPage() {
  const allResponses = useMemo(() => [...sampleResponses, ...getLocalSubmissions()], []);

  const completed = records.filter((r) => r.status === "Completed");
  const ongoing = records.filter((r) => r.status === "Ongoing");
  const planned = records.filter((r) => r.status === "Planned");
  const verified = allResponses.filter((r) => r.verification === "efaas-verified").length;
  const pendingModeration = moderationItems.filter((m) => m.status === "pending").length;
  const awaitingSpes = records.filter((r) => ["moderation", "spes-review"].includes(r.workflowStage)).length;

  const yesNo = countBy(
    allResponses.filter((r) => r.answers["q-support"]),
    (r) => r.answers["q-support"],
  );
  const yes = yesNo.find((d) => d.name === "Yes")?.value ?? 0;
  const no = yesNo.find((d) => d.name === "No")?.value ?? 0;
  const avgSupport = yes + no > 0 ? Math.round((yes / (yes + no)) * 100) : 0;

  const byRecord = records
    .map((rec) => ({
      name: rec.title.replace(" (Sample)", "").slice(0, 38),
      value: allResponses.filter((r) => r.recordId === rec.recordId).length,
    }))
    .filter((d) => d.value > 0);

  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of allResponses) {
      const month = r.submittedAt.slice(0, 7);
      map.set(month, (map.get(month) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [allResponses]);

  const byWard = countBy(allResponses, (r) => r.demographics.ward);
  const byAge = countBy(allResponses, (r) => r.demographics.ageGroup);
  const modOutcome = countBy(moderationItems, (m) => m.status);

  const stats = [
    { label: "Total participation records", value: records.length },
    { label: "Active participation records", value: ongoing.length },
    { label: "Completed records", value: completed.length },
    { label: "Planned developments", value: planned.length },
    { label: "Total responses", value: allResponses.length },
    { label: "Verified responses", value: verified },
    { label: "Anonymous responses", value: allResponses.length - verified },
    { label: "Average support level", value: `${avgSupport}%` },
    { label: "Items awaiting moderation", value: pendingModeration },
    { label: "Awaiting SPES decision", value: awaitingSpes },
  ];

  return (
    <div className="page">
      <h1>Results &amp; Dashboard</h1>
      <p className="muted">Aggregated view across all participation processes. Sample POC data only.</p>

      <div className="grid-4" style={{ marginBottom: "1rem" }}>
        {stats.map((s) => (
          <div className="card stat-card" key={s.label} style={{ marginTop: 0 }}>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card" style={{ marginTop: 0 }}>
          <Chart option={barOption("Response totals by record (sample)", byRecord, true)} ariaLabel="Bar chart of response totals by participation record" height={320} />
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <Chart option={pieOption("Overall yes / no split (sample)", yesNo)} ariaLabel="Pie chart of yes and no answers across all surveys" height={320} />
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <Chart
            option={lineOption("Timeline of participation (responses per month, sample)", byMonth.map(([m]) => m), byMonth.map(([, v]) => v))}
            ariaLabel="Line chart of responses per month"
          />
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <Chart option={barOption("Support by ward or area (responses, sample)", byWard)} ariaLabel="Bar chart of responses by ward" />
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <Chart option={pieOption("Demographic breakdown by age group (sample)", byAge)} ariaLabel="Pie chart of responses by age group" />
        </div>
        <div className="card" style={{ marginTop: 0 }}>
          <Chart option={pieOption("Moderation outcome summary (sample)", modOutcome)} ariaLabel="Pie chart of moderation outcomes" />
        </div>
      </div>

      <h2>Completed participation results</h2>
      {completed.length === 0 ? (
        <div className="empty-state">No completed participation processes yet.</div>
      ) : (
        <div className="grid-3">
          {completed.map((r) => (
            <div className="card" key={r.recordId} style={{ marginTop: 0 }}>
              <StatusBadge status={r.status} />
              <h3 style={{ margin: "0.4rem 0", color: "var(--hdc-blue)" }}>{r.title}</h3>
              <p className="muted">Decision published: {r.decision?.decidedOn}</p>
              <Link className="btn btn-sm btn-blue" to={`/results/${r.recordId}`}>
                View results and decision
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
