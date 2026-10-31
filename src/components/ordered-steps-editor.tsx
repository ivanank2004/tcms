"use client";

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
        <label className="block text-xs font-medium text-zinc-300">
          Ordered Test Steps ({steps.length})
        </label>
        <button
          type="button"
          onClick={addStep}
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-300 hover:text-white transition"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Step
        </button>
      </div>

      {steps.length === 0 ? (
        <div className="p-4 border border-dashed border-zinc-800 rounded-lg text-center bg-zinc-950/40">
          <p className="text-xs text-zinc-500">No steps defined yet. Click "Add Step" to begin.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="p-3 bg-zinc-950/60 border border-zinc-800 rounded-lg space-y-2 relative group"
            >
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-mono font-medium text-zinc-200">Step {step.stepNumber}</span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveStep(idx, "up")}
                    disabled={idx === 0}
                    className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:hover:text-zinc-500 transition"
                    title="Move Step Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStep(idx, "down")}
                    disabled={idx === steps.length - 1}
                    className="p-1 text-zinc-500 hover:text-zinc-300 disabled:opacity-30 disabled:hover:text-zinc-500 transition"
                    title="Move Step Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    className="p-1 text-zinc-500 hover:text-rose-400 transition ml-1"
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
                  placeholder="Action instruction (e.g. Dispatch POST /api/v1/auth/tokens with valid body)"
                  className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={step.expectedResult || ""}
                  onChange={(e) => updateStep(idx, "expectedResult", e.target.value)}
                  placeholder="Optional expected outcome for this step"
                  className="w-full px-2.5 py-1.5 bg-zinc-900/60 border border-zinc-800 rounded-md text-xs text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
