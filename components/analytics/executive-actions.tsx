"use client";

import { downloadCsv, toCsv } from "@/lib/csv";

export type ExecutiveSummary = {
  tenantName: string;
  scopeLabel: string;
  generatedAt: string;
  kpis: { label: string; value: string }[];
  topCourses: { title: string; enrolled: number; completed: number; passRate: number }[];
  overdueLearners: { name: string; course: string; progress: number }[];
};

export function ExecutiveActions({ summary }: { summary: ExecutiveSummary }) {
  function exportCsv() {
    const csv = toCsv(
      summary.kpis.map((k) => ({ metric: k.label, value: k.value })),
      [
        { key: "metric", label: "Metric" },
        { key: "value", label: "Value" },
      ],
    );
    downloadCsv(`analytics-summary-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  function openBrief() {
    const win = window.open("", "_blank");
    if (!win) return;
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${summary.tenantName} — Executive Brief</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #0b1c30; padding: 40px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 24px; margin-bottom: 0; }
  .meta { color: #565e74; font-size: 13px; margin-bottom: 24px; }
  h2 { font-size: 16px; border-bottom: 1px solid #d3e4fe; padding-bottom: 6px; margin-top: 28px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 6px 8px; font-size: 13px; border-bottom: 1px solid #eff4ff; }
  th { color: #565e74; font-weight: 600; }
  .kpi-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 8px; }
  .kpi { background: #eff4ff; border-radius: 8px; padding: 10px 14px; }
  .kpi .label { font-size: 11px; text-transform: uppercase; color: #565e74; }
  .kpi .value { font-size: 20px; font-weight: 700; }
</style>
</head>
<body>
  <h1>${summary.tenantName} — Executive Compliance Brief</h1>
  <div class="meta">Scope: ${summary.scopeLabel} · Generated ${summary.generatedAt}</div>
  <h2>Key Metrics</h2>
  <div class="kpi-grid">
    ${summary.kpis.map((k) => `<div class="kpi"><div class="label">${k.label}</div><div class="value">${k.value}</div></div>`).join("")}
  </div>
  <h2>Course Adoption &amp; Pass Rates</h2>
  <table>
    <thead><tr><th>Course</th><th>Enrolled</th><th>Completed</th><th>Pass Rate</th></tr></thead>
    <tbody>
      ${summary.topCourses.map((c) => `<tr><td>${c.title}</td><td>${c.enrolled}</td><td>${c.completed}</td><td>${Math.round(c.passRate)}%</td></tr>`).join("")}
    </tbody>
  </table>
  <h2>Overdue Learners</h2>
  <table>
    <thead><tr><th>Learner</th><th>Course</th><th>Progress</th></tr></thead>
    <tbody>
      ${
        summary.overdueLearners.length
          ? summary.overdueLearners.map((o) => `<tr><td>${o.name}</td><td>${o.course}</td><td>${Math.round(o.progress)}%</td></tr>`).join("")
          : `<tr><td colspan="3">None — fully compliant.</td></tr>`
      }
    </tbody>
  </table>
  <script>window.onload = () => setTimeout(() => window.print(), 200);</script>
</body>
</html>`;
    win.document.write(html);
    win.document.close();
  }

  return (
    <>
      <button
        className="h-10 px-space-md rounded-lg bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-label-md text-label-md shadow-sm flex items-center gap-2 transition-all hover:scale-[1.01]"
        onClick={exportCsv}
        type="button"
      >
        <span className="material-symbols-outlined text-secondary text-lg">download</span>
        Export CSV
      </button>
      <button
        className="h-10 px-space-md rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md shadow-sm flex items-center gap-2 transition-all hover:scale-[1.01]"
        onClick={openBrief}
        type="button"
      >
        <span className="material-symbols-outlined text-base">picture_as_pdf</span>
        Executive Brief (PDF)
      </button>
    </>
  );
}
