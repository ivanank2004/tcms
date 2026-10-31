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
    } catch (err) {
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition"
      >
        <Upload className="w-3.5 h-3.5" />
        <span>Import CSV</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-2xl p-6 relative max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-base">Import Test Cases from CSV</h3>
                  <p className="text-xs text-slate-400">Two-phase validation preview and confirmation</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-md hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="my-4 p-3 bg-red-950/60 border border-red-800/80 rounded-lg text-sm text-red-300 flex items-start gap-2.5 shrink-0">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto py-4">
              {step === "upload" && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-800 rounded-xl p-8 text-center hover:border-slate-700 transition">
                    <FileText className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
                    <label
                      htmlFor="csv-file-input"
                      className="cursor-pointer font-medium text-sm text-indigo-400 hover:text-indigo-300 transition"
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
                    <p className="text-xs text-slate-500 mt-1">UTF-8 encoded CSV up to 2MB (max 500 rows)</p>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400">
                    <p className="font-semibold text-slate-300 mb-1">Expected CSV Column Headers:</p>
                    <code className="text-slate-400 font-mono text-[11px] block overflow-x-auto">
                      Title, Module, Preconditions, Steps, Expected Result, Priority, Test Types, Tags, Lifecycle
                    </code>
                  </div>
                </div>
              )}

              {step === "preview" && validationResult && (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-center">
                      <p className="text-xs text-slate-500">Total Rows</p>
                      <p className="text-lg font-bold text-white">{validationResult.totalRows}</p>
                    </div>
                    <div className="bg-emerald-950/30 border border-emerald-900/50 p-3 rounded-lg text-center">
                      <p className="text-xs text-emerald-400">Valid Rows</p>
                      <p className="text-lg font-bold text-emerald-300">{validationResult.validCount}</p>
                    </div>
                    <div className="bg-red-950/30 border border-red-900/50 p-3 rounded-lg text-center">
                      <p className="text-xs text-red-400">Errors</p>
                      <p className="text-lg font-bold text-red-300">{validationResult.errorCount}</p>
                    </div>
                  </div>

                  {/* Errors List */}
                  {validationResult.errors.length > 0 && (
                    <div className="border border-red-900/40 bg-red-950/20 rounded-lg p-3">
                      <p className="text-xs font-semibold text-red-300 mb-2">Rows with Validation Errors:</p>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs text-red-400 font-mono">
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
                      <p className="text-xs font-semibold text-slate-300 mb-2">
                        Preview Ready Rows ({validationResult.validRows.length}):
                      </p>
                      <div className="border border-slate-800 rounded-lg overflow-x-auto max-h-48 overflow-y-auto text-xs">
                        <table className="w-full text-left">
                          <thead className="bg-slate-950 text-slate-400 sticky top-0">
                            <tr>
                              <th className="px-3 py-2">Title</th>
                              <th className="px-3 py-2">Module</th>
                              <th className="px-3 py-2">Priority</th>
                              <th className="px-3 py-2">Steps</th>
                              <th className="px-3 py-2">Lifecycle</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {validationResult.validRows.slice(0, 20).map((r, idx) => (
                              <tr key={idx} className="text-slate-300">
                                <td className="px-3 py-1.5 font-medium truncate max-w-xs">{r.title}</td>
                                <td className="px-3 py-1.5 text-slate-400">{r.moduleName || "—"}</td>
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
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-bold text-white">Import Successful!</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {validationResult?.validCount} test cases have been imported into the repository with sequential stable IDs and initial revisions.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Controls */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3 shrink-0">
              {step === "preview" && (
                <>
                  <button
                    type="button"
                    onClick={() => setStep("upload")}
                    className="px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 transition"
                  >
                    Back to Upload
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmImport}
                    disabled={isPending || validationResult?.validCount === 0}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800/60 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg shadow transition flex items-center gap-2"
                  >
                    {isPending ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition"
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
