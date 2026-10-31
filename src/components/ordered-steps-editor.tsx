"use client";

import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { StepInput } from "@/lib/test-cases/actions";

export function OrderedStepsEditor({
  steps,
  onChange,
}: {
  steps: StepInput[];
  onChange: (steps: StepInput[]) => void;
}) {
  const addStep = () => {
    onChange([
      ...steps,
      {
        stepNumber: steps.length + 1,
        instruction: "",
        expectedResult: "",
      },
    ]);
  };

  const updateStep = (index: number, field: "instruction" | "expectedResult", value: string) => {
    const updated = steps.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    onChange(updated);
  };

  const removeStep = (index: number) => {
    const filtered = steps.filter((_, i) => i !== index);
    const reindexed = filtered.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    onChange(reindexed);
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === steps.length - 1)
    ) {
      return;
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newSteps = [...steps];
    const temp = newSteps[index];
    newSteps[index] = newSteps[targetIndex];
    newSteps[targetIndex] = temp;

    const reindexed = newSteps.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    onChange(reindexed);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-slate-300">
          Ordered Test Steps ({steps.length})
        </label>
        <button
          type="button"
          onClick={addStep}
          className="inline-flex items-center gap-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Step
        </button>
      </div>

      {steps.length === 0 ? (
        <div className="p-4 border border-dashed border-slate-800 rounded-lg text-center bg-slate-950/40">
          <p className="text-xs text-slate-500">No steps defined yet. Click "Add Step" to begin.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 relative group"
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-indigo-400">Step {step.stepNumber}</span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveStep(idx, "up")}
                    disabled={idx === 0}
                    className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:hover:text-slate-500 transition"
                    title="Move Step Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(idx, "down")}
                    disabled={idx === steps.length - 1}
                    className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:hover:text-slate-500 transition"
                    title="Move Step Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    className="p-1 text-slate-500 hover:text-red-400 transition ml-1"
                    title="Delete Step"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  required
                  value={step.instruction}
                  onChange={(e) => updateStep(idx, "instruction", e.target.value)}
                  placeholder="Action instruction (e.g. Navigate to /checkout and click 'Pay Now')"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={step.expectedResult || ""}
                  onChange={(e) => updateStep(idx, "expectedResult", e.target.value)}
                  placeholder="Optional step expected outcome (e.g. Payment modal displays with order total)"
                  className="w-full px-3 py-1.5 bg-slate-900/60 border border-slate-800/80 rounded text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
