"use client";

import { useState, useTransition } from "react";
import { parseAndValidateCSV, commitCSVImportAction, type CSVValidationResult } from "@/lib/test-cases/csv";
import { Upload, X, AlertCircle, CheckCircle, FileText, ArrowRight } from "lucide-react";

export function CSVImportModal({
  workspaceId,
  projectId,
  isProjectArchived = false,
}: {
  workspaceId: string;
  projectId: string;
  isProjectArchived?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "success">("upload");
  const [validationResult, setValidationResult] = useState<CSVValidationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (isProjectArchived) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("File size exceeds 2MB limit.");
      return;
    }

    try {
      const text = await file.text();
      const result = await parseAndValidateCSV(projectId, text);
      setValidationResult(result);
      setStep("preview");
      setErrorMsg(null);
    } catch {
      setErrorMsg("Failed to read and parse CSV file.");
    }
  };

  const handleConfirmImport = () => {
    if (!validationResult || validationResult.validRows.length === 0) return;

    startTransition(async () => {
      const res = await commitCSVImportAction(workspaceId, projectId, validationResult.validRows);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setStep("success");
      }
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep("upload");
    setValidationResult(null);
    setErrorMsg(null);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium rounded-lg border border-zinc-800 transition"
      >
        <Upload className="w-3.5 h-3.5 text-zinc-400" />
        <span>Import CSV</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-2xl p-5 relative max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-zinc-800 text-zinc-300 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-zinc-100 text-sm">Import Test Cases from CSV</h3>
                  <p className="text-[11px] text-zinc-500">Two-phase validation preview and confirmation</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="my-3 p-2.5 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-start gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto py-3">
              {step === "upload" && (
                <div className="space-y-3.5">
                  <div className="border border-dashed border-zinc-800 rounded-xl p-8 text-center hover:border-zinc-700 bg-zinc-950/40 transition">
                    <FileText className="w-8 h-8 text-zinc-400 mx-auto mb-2.5" />
                    <label
                      htmlFor="csv-file-input"
                      className="cursor-pointer font-medium text-xs text-zinc-200 hover:text-white underline transition"
                    >
                      Choose CSV file
                      <input
                        id="csv-file-input"
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                    <p className="text-[11px] text-zinc-500 mt-1">UTF-8 encoded CSV up to 2MB (max 500 rows)</p>
                  </div>

                  <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800 text-xs text-zinc-400">
                    <p className="font-medium text-zinc-300 mb-1">Expected CSV Column Headers:</p>
                    <code className="text-zinc-400 font-mono text-[11px] block overflow-x-auto">
                      Title, Module, Preconditions, Steps, Expected Result, Priority, Test Types, Tags, Lifecycle
                    </code>
                  </div>
                </div>
              )}

              {step === "preview" && validationResult && (
                <div className="space-y-3.5">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-zinc-950/60 border border-zinc-800 p-2.5 rounded-lg text-center">
                      <p className="text-[10px] text-zinc-500">Total Rows</p>
                      <p className="text-base font-semibold text-zinc-100 font-mono">{validationResult.totalRows}</p>
                    </div>
                    <div className="bg-zinc-950/60 border border-zinc-800 p-2.5 rounded-lg text-center">
                      <p className="text-[10px] text-emerald-400">Valid Rows</p>
                      <p className="text-base font-semibold text-emerald-400 font-mono">{validationResult.validCount}</p>
                    </div>
                    <div className="bg-zinc-950/60 border border-zinc-800 p-2.5 rounded-lg text-center">
                      <p className="text-[10px] text-rose-400">Errors</p>
                      <p className="text-base font-semibold text-rose-400 font-mono">{validationResult.errorCount}</p>
                    </div>
                  </div>

                  {/* Errors List */}
                  {validationResult.errors.length > 0 && (
                    <div className="border border-rose-900/40 bg-rose-950/20 rounded-lg p-3">
                      <p className="text-xs font-medium text-rose-300 mb-1.5">Rows with Validation Errors:</p>
                      <div className="space-y-1 max-h-32 overflow-y-auto text-[11px] text-rose-400 font-mono">
                        {validationResult.errors.map((err, idx) => (
                          <div key={idx} className="flex gap-2">
                            <span className="font-bold">Row {err.rowNumber}:</span>
                            <span>{err.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Valid Rows Preview Table */}
                  {validationResult.validRows.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-zinc-300 mb-1.5">
                        Preview Ready Rows ({validationResult.validRows.length}):
                      </p>
                      <div className="border border-zinc-800 rounded-lg overflow-x-auto max-h-44 overflow-y-auto text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-zinc-950 text-zinc-400 sticky top-0 border-b border-zinc-800">
                            <tr>
                              <th className="px-3 py-1.5">Title</th>
                              <th className="px-3 py-1.5">Module</th>
                              <th className="px-3 py-1.5">Priority</th>
                              <th className="px-3 py-1.5">Steps</th>
                              <th className="px-3 py-1.5">Lifecycle</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/60">
                            {validationResult.validRows.slice(0, 20).map((r, idx) => (
                              <tr key={idx} className="text-zinc-300 hover:bg-zinc-900/40">
                                <td className="px-3 py-1.5 font-medium truncate max-w-xs">{r.title}</td>
                                <td className="px-3 py-1.5 text-zinc-400">{r.moduleName || "—"}</td>
                                <td className="px-3 py-1.5 capitalize">{r.priority}</td>
                                <td className="px-3 py-1.5">{r.steps.length} step(s)</td>
                                <td className="px-3 py-1.5 capitalize">{r.lifecycle}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === "success" && (
                <div className="text-center py-6">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-2.5">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <h4 className="text-base font-semibold text-zinc-100">Import Successful</h4>
                  <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                    {validationResult?.validCount} test cases have been imported into the repository with sequential IDs and revision history.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Controls */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0">
              {step === "preview" && (
                <>
                  <button
                    type="button"
                    onClick={() => setStep("upload")}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 transition"
                  >
                    Back to Upload
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={isPending || validationResult?.validCount === 0}
                    className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:cursor-not-allowed text-zinc-950 text-xs font-medium rounded-lg transition flex items-center gap-1.5"
                  >
                    {isPending ? (
                      <div className="w-3.5 h-3.5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Confirm Import ({validationResult?.validCount} rows)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </>
              )}

              {step === "success" && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 text-xs font-medium rounded-lg transition"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
