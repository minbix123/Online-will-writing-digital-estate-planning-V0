"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { questionnaireConfig } from "@/lib/questionnaire";

// Typed definitions for questionnaire configuration
interface QuestionCondition {
  field: string;
  operator: "equals" | "not_equals" | string;
  value: any;
}

interface QuestionField {
  id: string;
  type: string;
  label: string;
  required?: boolean;
}

interface QuestionOption {
  label: string;
  value: string;
}

interface Question {
  id: string;
  type: string;
  label: string;
  required?: boolean;
  options?: QuestionOption[];
  conditions?: QuestionCondition[];
  fields?: QuestionField[];
}

interface Section {
  id: string;
  title: string;
  description: string;
  conditions?: QuestionCondition[];
  questions: Question[];
}

export interface QuestionnaireEngineProps {
  caseId: string;
  initialAnswers?: Record<string, any>;
}

export default function QuestionnaireEngine({
  caseId,
  initialAnswers = {},
}: QuestionnaireEngineProps) {
  const router = useRouter();
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>(initialAnswers);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isFlushing, setIsFlushing] = useState(false);

  // Debounce refs to avoid duplicate / concurrent network requests
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<Record<string, any>>(initialAnswers);

  // Synchronize ref whenever answers change
  useEffect(() => {
    pendingDataRef.current = answers;
  }, [answers]);

  // Cleanup pending timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Dynamic condition checker against current answers
  const checkConditions = useCallback(
    (conditions?: QuestionCondition[], currentAnswers: Record<string, any> = answers): boolean => {
      if (!conditions || conditions.length === 0) return true;
      for (const cond of conditions) {
        const val = currentAnswers[cond.field];
        if (cond.operator === "equals" && val !== cond.value) {
          return false;
        }
        if (cond.operator === "not_equals" && val === cond.value) {
          return false;
        }
      }
      return true;
    },
    [answers]
  );

  // Derive active sections dynamically; unlocks guardian section when hasChildren & hasMinorChildren are "Yes"
  const activeSections: Section[] = useMemo(() => {
    const rawSections = questionnaireConfig.sections as unknown as Section[];
    return rawSections.filter((sec) => checkConditions(sec.conditions, answers));
  }, [answers, checkConditions]);

  // Clamp currentSectionIndex if active sections count shrinks due to conditional changes
  useEffect(() => {
    if (currentSectionIndex >= activeSections.length && activeSections.length > 0) {
      setCurrentSectionIndex(activeSections.length - 1);
    }
  }, [activeSections.length, currentSectionIndex]);

  const currentSection: Section | undefined =
    activeSections[currentSectionIndex] || activeSections[0];

  // Accurate progress calculation matching test runner test_utils.calculateProgress
  const progressPercentage: number = useMemo(() => {
    const sections = questionnaireConfig.sections as unknown as Section[];
    if (!sections || sections.length === 0) return 0;

    let totalRequired = 0;
    let answeredRequired = 0;

    for (const sec of sections) {
      if (sec.conditions && !checkConditions(sec.conditions, answers)) {
        continue;
      }

      for (const q of sec.questions || []) {
        if (q.conditions && !checkConditions(q.conditions, answers)) {
          continue;
        }

        if (q.required) {
          totalRequired++;
          const val = answers[q.id];
          if (val !== undefined && val !== null && val !== "") {
            if (Array.isArray(val) ? val.length > 0 : true) {
              answeredRequired++;
            }
          }
        }
      }
    }

    return totalRequired === 0 ? 100 : Math.round((answeredRequired / totalRequired) * 100);
  }, [answers, checkConditions]);

  // Core autosave function
  const saveSectionData = useCallback(
    async (sectionId: string, dataToSave: Record<string, any>) => {
      setSaveStatus("saving");
      setSaveError(null);

      try {
        const res = await fetch("/api/questionnaire/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caseId,
            sectionId,
            data: dataToSave,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || `Server responded with status ${res.status}`);
        }

        setSaveStatus("saved");
        const now = new Date();
        setLastSavedTime(
          now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
      } catch (err: any) {
        console.error("Autosave error:", err);
        setSaveStatus("error");
        setSaveError(err.message || "Save failed - retrying...");
      }
    },
    [caseId]
  );

  // Keystroke handler with 1000ms debounce (increased from 500ms for better performance)
  const handleChange = (questionId: string, value: any) => {
    const updated = { ...answers, [questionId]: value };
    setAnswers(updated);
    pendingDataRef.current = updated;

    // Immediately show saving indicator
    setSaveStatus("saving");

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const currentSecId = currentSection?.id;
    if (currentSecId) {
      debounceTimerRef.current = setTimeout(() => {
        saveSectionData(currentSecId, pendingDataRef.current);
      }, 1000);
    }
  };

  // Immediate flush before navigation to guarantee zero data loss
  const flushPendingSave = async (sectionId: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setIsFlushing(true);
    try {
      await saveSectionData(sectionId, pendingDataRef.current);
    } finally {
      setIsFlushing(false);
    }
  };

  const validateCurrentSection = (): boolean => {
    if (!currentSection) return true;

    const missingFields: string[] = [];
    currentSection.questions.forEach((q) => {
      if (!checkConditions(q.conditions)) return;

      if (q.type === "repeater") {
        const list = Array.isArray(answers[q.id]) ? answers[q.id] : [];
        if (q.required && list.length === 0) {
           missingFields.push(q.label);
        } else if (list.length > 0) {
           list.forEach((item: any, idx: number) => {
             q.fields?.forEach((f: QuestionField) => {
               if (f.required && (!item[f.id] || String(item[f.id]).trim() === "")) {
                 missingFields.push(`${q.label} (Item #${idx + 1}: ${f.label})`);
               }
             });
           });
        }
      } else {
        if (q.required) {
          const val = answers[q.id];
          if (val === undefined || val === null || String(val).trim() === "") {
            missingFields.push(q.label);
          }
        }
      }
    });

    if (missingFields.length > 0) {
      setSaveError(`Please fill out required fields (*). Missing: ${missingFields.join(", ")}`);
      setSaveStatus("error");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return false; // Invalid
    }

    setSaveError(null);
    return true; // Valid
  };

  const handleNext = async () => {
    if (!currentSection || isFlushing) return;

    if (!validateCurrentSection()) {
      return; // BLOCK NAVIGATION
    }

    await flushPendingSave(currentSection.id);

    if (currentSectionIndex < activeSections.length - 1) {
      setCurrentSectionIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Completed questionnaire -> route to review & checkout
      router.push(`/customer/checkout?caseId=${caseId}`);
    }
  };

  const handleBack = async () => {
    if (isFlushing) return;

    if (currentSection) {
      await flushPendingSave(currentSection.id);
    }

    if (currentSectionIndex > 0) {
      setCurrentSectionIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (!currentSection) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="rounded-2xl bg-[#0a0a0a] border border-[#222222] p-8">
          <p className="text-sm font-medium text-[#a3a3a3]">Loading questionnaire sections...</p>
        </div>
      </div>
    );
  }

  const isLastSection = currentSectionIndex === activeSections.length - 1;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-2xl bg-[#0a0a0a] border border-[#222222] shadow-[0_4px_30px_rgba(0,0,0,0.9)] overflow-hidden">
        {/* Window Titlebar */}
        <div className="bg-[#111111] border-b border-[#222222] px-5 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]/70 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]/70 inline-block" />
          </div>

          <span className="text-xs font-semibold text-[#e5e5e5] tracking-wide truncate max-w-[200px] sm:max-w-md font-mono">
            Legal Will Preparation — Case #{caseId.slice(-8).toUpperCase()}
          </span>

          {/* Real-Time Autosave Status Indicator */}
          <div className="flex items-center">
            {saveStatus === "saving" && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-950/40 text-amber-300 border border-amber-800/60 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5 animate-ping inline-block" />
                Saving...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/40 text-emerald-300 border border-emerald-800/60">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 inline-block" />
                All changes saved {lastSavedTime ? `at ${lastSavedTime}` : ""}
              </span>
            )}
            {saveStatus === "error" && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-950/40 text-rose-300 border border-rose-800/60">
                <span className="w-2 h-2 rounded-full bg-rose-400 mr-1.5 inline-block" />
                Save failed - retrying...
              </span>
            )}
            {saveStatus === "idle" && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#161616] text-[#a3a3a3] border border-[#262626]">
                <span className="w-2 h-2 rounded-full bg-[#737373] mr-1.5 inline-block" />
                {lastSavedTime ? `Saved at ${lastSavedTime}` : "Autosave Active"}
              </span>
            )}
          </div>
        </div>

        {/* Window Content */}
        <div className="bg-[#0a0a0a]">
          {/* Progress & Section Navigation Header */}
          <div className="p-5 sm:p-7 border-b border-[#222222] bg-[#0d0d0d]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#161616] text-[#d4a373] border border-[#2a2a2a]">
                    Section {currentSectionIndex + 1} of {activeSections.length}
                  </span>
                  <span className="text-xs font-semibold text-[#a3a3a3]">
                    {currentSection.title}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#e5e5e5]">
                  {currentSection.title}
                </h2>
                <p className="text-xs sm:text-sm text-[#a3a3a3] mt-0.5">
                  {currentSection.description}
                </p>
              </div>

              <div className="flex flex-col sm:items-end gap-1">
                <span className="text-xs font-bold text-[#d4a373] font-mono">
                  {progressPercentage}% Completed
                </span>
                <span className="text-[11px] text-[#737373]">
                  Required questions answered
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-[#161616] p-0.5 border border-[#262626] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400 shadow-[0_0_12px_rgba(212,163,115,0.4)]"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            {/* Horizontal Section Pills */}
            <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
              {activeSections.map((sec, idx) => {
                const isCurrent = idx === currentSectionIndex;
                const isCompleted = idx < currentSectionIndex;
                return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={async () => {
                        if (currentSection && !isFlushing) {
                          // Allow navigating backwards without validation, but block navigating forwards/jumping if invalid
                          if (idx > currentSectionIndex && !validateCurrentSection()) {
                            return;
                          }
                          await flushPendingSave(currentSection.id);
                          setCurrentSectionIndex(idx);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition shrink-0 ${
                      isCurrent
                        ? "bg-[#d4a373] text-neutral-950 font-bold shadow-sm"
                        : isCompleted
                        ? "bg-emerald-950/50 text-emerald-300 border border-emerald-800/60 hover:bg-emerald-900/60"
                        : "bg-[#161616] text-[#737373] hover:text-[#a3a3a3] hover:bg-[#202020] border border-transparent"
                    }`}
                  >
                    {idx + 1}. {sec.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Content Area */}
          <div className="p-6 sm:p-8 space-y-6">
            {saveError && (
              <div className="rounded-lg bg-rose-950/40 p-3.5 border border-rose-800/60 text-xs text-rose-300 font-medium flex items-center justify-between">
                <span>{saveError}</span>
                <button
                  type="button"
                  onClick={() =>
                    currentSection &&
                    saveSectionData(currentSection.id, pendingDataRef.current)
                  }
                  className="text-xs font-bold text-rose-300 underline hover:no-underline ml-2 shrink-0"
                >
                  Retry Save
                </button>
              </div>
            )}

            <div className="space-y-6">
              {currentSection.questions.map((q: Question) => {
                if (!checkConditions(q.conditions)) return null;

                // REPEATER Question Type (Children, Assets, Beneficiaries, Executors)
                if (q.type === "repeater") {
                  const list = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                  return (
                    <div
                      key={q.id}
                      className="p-5 sm:p-6 bg-[#111111] border border-[#222222] rounded-xl space-y-4 shadow-sm"
                    >
                      <div className="flex justify-between items-center">
                        <label className="block text-sm font-bold text-[#e5e5e5]">
                          {q.label}
                          {q.required && <span className="text-rose-400 ml-1">*</span>}
                        </label>
                        <span className="text-xs text-[#737373] font-medium">
                          {list.length} item{list.length === 1 ? "" : "s"} added
                        </span>
                      </div>

                      {list.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-4 bg-[#161616] rounded-lg border border-[#262626] space-y-3"
                        >
                          <div className="flex justify-between items-center border-b border-[#222222] pb-2">
                            <span className="text-xs font-bold text-[#a3a3a3]">
                              Item #{idx + 1}
                            </span>
                            <button
                              type="button"
                              className="text-xs font-semibold text-rose-400 hover:text-rose-300 transition"
                              onClick={() => {
                                const newList = list.filter((_: any, i: number) => i !== idx);
                                handleChange(q.id, newList);
                              }}
                            >
                              ✕ Remove
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {q.fields?.map((f: QuestionField) => (
                              <div key={f.id} className="space-y-1">
                                <label className="block text-xs font-semibold text-[#d4d4d4]">
                                  {f.label}
                                  {f.required && (
                                    <span className="text-rose-400 ml-0.5">*</span>
                                  )}
                                </label>
                                <input
                                  type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                                  className="w-full px-3 py-2 text-xs sm:text-sm rounded-lg bg-[#111111] border border-[#2a2a2a] text-[#e5e5e5] placeholder:text-[#555555] focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373]"
                                  value={item[f.id] ?? ""}
                                  onChange={(e) => {
                                    const newList = [...list];
                                    newList[idx] = {
                                      ...newList[idx],
                                      [f.id]: e.target.value,
                                    };
                                    handleChange(q.id, newList);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-lg bg-[#161616] hover:bg-[#202020] text-[#e5e5e5] border border-[#2a2a2a] hover:border-[#383838] px-4 py-2 text-xs font-semibold transition-all"
                        onClick={() => handleChange(q.id, [...list, {}])}
                      >
                        + Add {q.label.replace(/^Add\s+/i, "")}
                      </button>
                    </div>
                  );
                }

                // Standard Single Fields (Text, Textarea, Select, Yes/No, Date, Email, Phone)
                return (
                  <div key={q.id} className="space-y-1.5">
                    <label className="block text-xs sm:text-sm font-semibold text-[#d4d4d4]">
                      {q.label}
                      {q.required && <span className="text-rose-400 ml-1 font-bold">*</span>}
                    </label>

                    {q.type === "textarea" ? (
                      <textarea
                        rows={3}
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#161616] border border-[#262626] text-[#e5e5e5] placeholder:text-[#555555] focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] transition-colors"
                        value={answers[q.id] ?? ""}
                        onChange={(e) => handleChange(q.id, e.target.value)}
                        placeholder="Enter details..."
                      />
                    ) : q.type === "single_select" || q.type === "yes_no" ? (
                      <select
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#161616] border border-[#262626] text-[#e5e5e5] focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] transition-colors"
                        value={answers[q.id] ?? ""}
                        onChange={(e) => handleChange(q.id, e.target.value)}
                      >
                        <option value="">Select an option</option>
                        {q.type === "yes_no" ? (
                          <>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                          </>
                        ) : (
                          q.options?.map((opt: QuestionOption) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))
                        )}
                      </select>
                    ) : (
                      <input
                        type={
                          q.type === "email"
                            ? "email"
                            : q.type === "phone"
                            ? "tel"
                            : q.type === "date"
                            ? "date"
                            : q.type === "number"
                            ? "number"
                            : "text"
                        }
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-[#161616] border border-[#262626] text-[#e5e5e5] placeholder:text-[#555555] focus:outline-none focus:border-[#d4a373] focus:ring-1 focus:ring-[#d4a373] transition-colors"
                        value={answers[q.id] ?? ""}
                        onChange={(e) => handleChange(q.id, e.target.value)}
                        placeholder={`Enter ${q.label.toLowerCase()}...`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Step Actions */}
            <div className="pt-6 border-t border-[#222222] flex items-center justify-between gap-4">
              <button
                type="button"
                disabled={currentSectionIndex === 0 || isFlushing}
                onClick={handleBack}
                className="inline-flex items-center justify-center rounded-lg bg-[#161616] hover:bg-[#222222] text-[#e5e5e5] border border-[#262626] hover:border-[#383838] px-6 py-2.5 text-xs sm:text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Previous Section
              </button>

              <button
                type="button"
                disabled={isFlushing}
                onClick={handleNext}
                className="inline-flex items-center justify-center rounded-lg bg-[#d4a373] hover:bg-[#c59b27] active:bg-[#b88c1b] text-neutral-950 font-semibold px-8 py-2.5 text-xs sm:text-sm shadow-[0_2px_12px_rgba(212,163,115,0.2)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isFlushing
                  ? "Saving..."
                  : isLastSection
                  ? "Review Answers & Continue →"
                  : "Save & Continue →"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
