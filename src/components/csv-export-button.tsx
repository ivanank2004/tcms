"use client";

import { useState } from "react";
import { exportTestCasesToCSV } from "@/lib/test-cases/csv";
import { Download } from "lucide-react";

export function CSVExportButton({
  projectId,
  projectKey,
}: {
  projectId: string;
  projectKey: string;
}) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const csvContent = await exportTestCasesToCSV(projectId);
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${projectKey}-test-cases-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("CSV export failed:", err);
      alert("Failed to export test cases.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-800 transition"
    >
      <Download className="w-3.5 h-3.5 text-zinc-400" />
      <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
    </button>
  );
}
