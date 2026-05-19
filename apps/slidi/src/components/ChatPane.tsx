"use client";

import { useSlidiStore, Provider } from "@/store/slidiStore";
import { generatePresentation, generatePlanModeResponse, generatePlanQuestions, generateOutlineFromAnswers, generateSlideEdit, detectOutlineApproval } from "@/lib/ai";
import { buildWindowedEditMessages, spliceSlideBlock } from "@/lib/ai/contextManager";
import { classifyTask, selectModelForTask } from "@/lib/ai/adessoOptimizer";
import { getCachedLayout, setCachedLayout, detectSlideType, clearSemanticCache } from "@/lib/ai/semanticCache";
import { useVoiceToText } from "@/hooks/useVoiceToText";
import { detectLayoutAntiPatterns } from "@/lib/ai/layoutValidator";
import { THEMES } from "@/lib/themes";
import { extractSessionName } from "@/lib/sessions";
import {
  ArrowRight,
  Trash2,
  MousePointer,
  SquareDashedBottomCode,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  PanelLeft,
  SquarePen,
  ChevronDown,
  MoreVertical,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  RefreshCcw,
  AlignLeft,
  Plus,
  SlidersHorizontal,
  Mic,
  ArrowUp,
  Key,
  ShieldAlert,
  ChevronUp,
  Settings,
  Briefcase,
  Smile,
} from "lucide-react";
import { ADESSO_MODELS, isFreeAdessoModel } from "@/lib/ai";
import { useRef, useState, useEffect, KeyboardEvent, memo, useCallback } from "react";
import { parsePlanResponse, buildAttachedFilesBlock } from "@/lib/prompt";
import { AttachButton, AttachedFilePills, FileDropZone } from "@/components/FileUploadZone";

type PlanPhase = "idle" | "generating-questions" | "answering" | "generating-outline" | "outline-ready";

interface OutlineSlide { number: number; title: string; description: string }

function stripMd(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
}

function parseOutline(text: string): OutlineSlide[] {
  return text
    .split("\n")
    .map((line) => {
      const m = line.match(/^(\d+)\.\s+(.+?)(?:\s+[—–-]{1,2}\s+(.+))?$/);
      if (!m) return null;
      return { number: parseInt(m[1], 10), title: stripMd(m[2].trim()), description: stripMd(m[3]?.trim() ?? "") };
    })
    .filter((x): x is OutlineSlide => x !== null);
}

interface ChatPaneProps {
  onSettings?: () => void;
  onInsecure?: () => void;
}


function ChatPaneInner({ onSettings, onInsecure }: ChatPaneProps) {
  const messages = useSlidiStore((s) => s.messages);
  const addMessage = useSlidiStore((s) => s.addMessage);
  const apiKey = useSlidiStore((s) => s.apiKey);
  const provider = useSlidiStore((s) => s.provider);
  const adessoModel = useSlidiStore((s) => s.adessoModel);
  const pushVersion = useSlidiStore((s) => s.pushVersion);
  const removeMessageAt = useSlidiStore((s) => s.removeMessageAt);
  const isGenerating = useSlidiStore((s) => s.isGenerating);
  const setIsGenerating = useSlidiStore((s) => s.setIsGenerating);
  const theme = useSlidiStore((s) => s.theme);
  const pendingEditContext = useSlidiStore((s) => s.pendingEditContext);
  const setPendingEditContext = useSlidiStore((s) => s.setPendingEditContext);
  const generatedCode = useSlidiStore((s) => s.generatedCode);
  const cachedPlan = useSlidiStore((s) => s.cachedPlan);
  const setCachedPlan = useSlidiStore((s) => s.setCachedPlan);
  const setStreamingPreview = useSlidiStore((s) => s.setStreamingPreview);
  const clearMessages = useSlidiStore((s) => s.clearMessages);
  const planMode = useSlidiStore((s) => s.planMode);
  const isPlanModeActive = useSlidiStore((s) => s.isPlanModeActive);
  const setPlanMode = useSlidiStore((s) => s.setPlanMode);
  const setIsPlanModeActive = useSlidiStore((s) => s.setIsPlanModeActive);
  const userContext = useSlidiStore((s) => s.userContext);
  const presentationMode = useSlidiStore((s) => s.presentationMode);
  const setPresentationMode = useSlidiStore((s) => s.setPresentationMode);
  const setPresentationName = useSlidiStore((s) => s.setPresentationName);
  const sessions = useSlidiStore((s) => s.sessions);
  const attachedFiles = useSlidiStore((s) => s.attachedFiles);
  const clearAttachedFiles = useSlidiStore((s) => s.clearAttachedFiles);
  const currentSlide = useSlidiStore((s) => s.currentSlide);
  const totalSlides = useSlidiStore((s) => s.totalSlides);
  const [input, setInput] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showFreeModelPopup, setShowFreeModelPopup] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const keys = useSlidiStore((s) => s.keys);
  const setApiKey = useSlidiStore((s) => s.setApiKey);
  const setAdessoModel = useSlidiStore((s) => s.setAdessoModel);
  const [planPhase, setPlanPhase] = useState<PlanPhase>("idle");
  const [planQuestions, setPlanQuestions] = useState<string[]>([]);
  const [planAnswers, setPlanAnswers] = useState<string[]>([]);
  const [planCurrentPair, setPlanCurrentPair] = useState(0);
  const [planPairInputs, setPlanPairInputs] = useState<[string, string]>(["", ""]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  // Slide-edit mode: when active, all prompts target only the current slide
  const [slideEditMode, setSlideEditMode] = useState(false);

  // Voice-to-text via Web Speech API (extracted into reusable hook)
  const { isRecording, isSupported: isVoiceSupported, toggleRecording } = useVoiceToText({
    onTranscript: (text) => {
      setInput((prev) => prev + (prev.endsWith(" ") || !prev ? "" : " ") + text);
    },
  });

  const copyToClipboard = useCallback((text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    } else {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
  }, []);

  // Guard against SSR/client hydration mismatch + close dropdown on outside click
  useEffect(() => {
    setIsMounted(true);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Pre-fill input when the user clicks an element in contextual edit mode
  useEffect(() => {
    if (!pendingEditContext) return;

    setInput(pendingEditContext);

    setTimeout(() => {
      textareaRef.current?.focus();
      if (textareaRef.current) {
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 50);
  }, [pendingEditContext]);

  // Reset wizard state when messages are cleared
  useEffect(() => {
    if (messages.length === 0) {
      setPlanPhase("idle");
      setPlanQuestions([]);
      setPlanAnswers([]);
      setPlanCurrentPair(0);
      setPlanPairInputs(["", ""]);
    }
  }, [messages.length]);

  const hasKey = isMounted && !!apiKey;

  const updateGenerationStatus = useCallback((text: string) => {
    useSlidiStore.setState((state) => {
      const msgs = [...state.messages];
      if (msgs.length === 0) return state;
      const i = msgs.length - 1;
      const last = msgs[i];
      if (last.role !== "system" || last.isError || last.isOutput) return state;
      msgs[i] = { ...last, content: text };
      return { messages: msgs };
    });
  }, []);

  /** Shared post-generation handler — saves plan, pushes version, shows status. */
  const handleGenerationResult = useCallback(async (
    result: Awaited<ReturnType<typeof generatePresentation>>,
    slideType: ReturnType<typeof detectSlideType>,
    triggerInput: string,
    skipPlanningWas: boolean
  ) => {
    if (result.planText) {
      setCachedPlan(result.planText);
      if (slideType) setCachedLayout(triggerInput, result.planText);
    }
    setStreamingPreview(null);
    pushVersion(result.code);
    // Clear attached files after a successful generation
    clearAttachedFiles();

    // Extract the presentation title directly from the generated code so the
    // header always reflects the current content without relying on the iframe.
    // Only update when a meaningful title is found (not a generic "Presentation N" fallback).
    const extracted = extractSessionName(result.code, sessions);
    if (extracted && !extracted.startsWith("Presentation ")) {
      setPresentationName(extracted);
    }

    if (!skipPlanningWas) clearSemanticCache();

    const isMissingSignificantly =
      !result.isComplete &&
      result.slideCount !== null &&
      result.slideCount < result.expectedCount * 0.8;

    // Replace the status message with success/incomplete BEFORE adding any extra messages
    useSlidiStore.setState((state) => {
      const msgs = [...state.messages];
      msgs[msgs.length - 1] = isMissingSignificantly
        ? {
            role: "system",
            content: `Deck incomplete — ${result.slideCount} of ${result.expectedCount} slides generated.`,
            isIncomplete: true,
            incompleteSlideCount: result.slideCount ?? undefined,
            incompleteExpectedCount: result.expectedCount,
          }
        : { role: "system", content: "Presentation updated successfully.", isOutput: true };
      return { messages: msgs };
    });

    // Append layout warnings after the status message has been replaced
    const layoutWarnings = detectLayoutAntiPatterns(result.code);
    if (layoutWarnings.length > 0) {
      const summary = layoutWarnings
        .slice(0, 3)
        .map((w) => w.slideIndex !== null ? `Slide ${w.slideIndex + 1}: ${w.message}` : w.message)
        .join(" · ");
      addMessage({ role: "system", content: `Layout notes: ${summary}`, isLayoutWarning: true });
    }
  }, [setCachedPlan, setStreamingPreview, pushVersion, addMessage, setPresentationName, sessions, clearAttachedFiles]);

  /** Trigger full generation from an existing plan conversation. */
  const triggerGenerationFromPlan = useCallback(async (planMessages: typeof messages) => {
    setIsPlanModeActive(false);
    addMessage({ role: "system", content: "Outline approved — generating your presentation..." });
    setIsGenerating(true);
    try {
      // Extract the outline text from the last plan response message so the
      // generator follows the exact slide titles and count from the outline.
      const outlineMsg = [...planMessages].reverse().find((m) => m.isOutlineReady || m.isPlanResponse);
      const cachedPlan = outlineMsg?.content
        ? `Follow this outline EXACTLY — use the exact slide titles and count specified:\n\n${outlineMsg.content}`
        : null;

      const effectiveAdessoModel = provider === "adesso"
        ? selectModelForTask(adessoModel, classifyTask(planMessages[planMessages.length - 1]?.content ?? ""))
        : adessoModel;
      const result = await generatePresentation(
        planMessages,
        apiKey,
        THEMES[theme].systemPromptBlock,
        provider,
        effectiveAdessoModel,
        (stage) => {
          if (stage === "planning")   updateGenerationStatus("Planning deck structure...");
          if (stage === "generating") updateGenerationStatus("Generating full presentation code...");
          if (stage === "finalizing") updateGenerationStatus("Finalizing and repairing output...");
        },
        { skipPlanning: true, cachedPlan, userContext, presentationMode },
        (partial) => setStreamingPreview(partial)
      );
      await handleGenerationResult(result, null, "", true);
    } catch (err: unknown) {
      setStreamingPreview(null);
      const message = err instanceof Error ? err.message : "Unknown error";
      useSlidiStore.setState((state) => {
        const msgs = [...state.messages];
        msgs[msgs.length - 1] = { role: "system", content: `Error: ${message}`, isError: true };
        return { messages: msgs };
      });
    } finally {
      setIsGenerating(false);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [setIsPlanModeActive, addMessage, setIsGenerating, provider, adessoModel, apiKey, theme, userContext, presentationMode, updateGenerationStatus, setStreamingPreview, handleGenerationResult]);

  /** Wizard: submit the current pair of answers, advance or trigger outline generation. */
  const handlePairSubmit = useCallback(async () => {
    const [a1, a2] = planPairInputs;
    if (!a1.trim()) return;

    const q1idx = planCurrentPair * 2;
    const q2idx = q1idx + 1;

    const newAnswers = [...planAnswers];
    newAnswers[q1idx] = a1.trim();
    if (planQuestions[q2idx]) newAnswers[q2idx] = a2.trim();
    setPlanAnswers(newAnswers);

    // Add collapsed pair summary to chat
    const summaryParts: string[] = [`Q: ${planQuestions[q1idx]}\nA: ${a1.trim()}`];
    if (planQuestions[q2idx]) summaryParts.push(`Q: ${planQuestions[q2idx]}\nA: ${a2.trim()}`);
    addMessage({ role: "system", content: summaryParts.join("\n\n"), isPlanPairSummary: true });

    const totalPairs = Math.ceil(planQuestions.length / 2);

    if (planCurrentPair < totalPairs - 1) {
      // More pairs to answer
      setPlanCurrentPair(planCurrentPair + 1);
      setPlanPairInputs(["", ""]);
    } else {
      // All pairs answered — generate outline
      setPlanPhase("generating-outline");
      setIsGenerating(true);
      addMessage({ role: "system", content: "Building your outline..." });
      const topic = messages.find((m) => m.role === "user")?.content ?? "";
      const effectiveModel = provider === "adesso" ? selectModelForTask(adessoModel, classifyTask(topic)) : adessoModel;
      try {
        const aiResponse = await generateOutlineFromAnswers(topic, planQuestions, newAnswers, apiKey, provider, effectiveModel, userContext, presentationMode);
        const outlineReady = detectOutlineApproval(aiResponse);
        const parsed = parsePlanResponse(aiResponse);
        useSlidiStore.setState((state) => {
          const msgs = [...state.messages];
          msgs[msgs.length - 1] = { role: "system", content: parsed.displayText, isOutlineReady: outlineReady, isPlanResponse: true };
          return { messages: msgs };
        });
        setPlanPhase("outline-ready");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        useSlidiStore.setState((state) => { const msgs = [...state.messages]; msgs[msgs.length - 1] = { role: "system", content: `Error: ${msg}`, isError: true }; return { messages: msgs }; });
        setPlanPhase("idle");
      } finally {
        setIsGenerating(false);
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [planPairInputs, planCurrentPair, planAnswers, planQuestions, addMessage, setPlanPhase, setIsGenerating, messages, provider, adessoModel, apiKey, userContext, presentationMode]);

  const handleSubmit = useCallback(async (options?: { skipPlanning?: boolean; text?: string }) => {
    const textToUse = options?.text ?? input;
    const trimmed = textToUse.trim();
    if (!trimmed || isGenerating || !apiKey) return;

    // ── Plan Mode flow ──────────────────────────────────────────────────────
    if (planMode) {
      // Wizard answering/generating phases: textarea is replaced by wizard, ignore text submit
      if (planPhase === "answering" || planPhase === "generating-questions" || planPhase === "generating-outline") return;

      // Outline ready: user types approval or feedback
      if (planPhase === "outline-ready") {
        if (detectOutlineApproval("", trimmed)) {
          addMessage({ role: "user", content: trimmed });
          setInput("");
          await triggerGenerationFromPlan([...messages, { role: "user", content: trimmed }]);
          return;
        }
        // Feedback → send to AI for revised outline
        addMessage({ role: "user", content: trimmed });
        setInput("");
        setIsGenerating(true);
        addMessage({ role: "system", content: "Revising outline..." });
        const effectiveModel = provider === "adesso" ? selectModelForTask(adessoModel, classifyTask(trimmed)) : adessoModel;
        try {
          const conversationSoFar = [...messages, { role: "user" as const, content: trimmed }];
          const aiResponse = await generatePlanModeResponse(conversationSoFar, apiKey, provider, effectiveModel, userContext, presentationMode);
          const outlineReady = detectOutlineApproval(aiResponse);
          const parsed = parsePlanResponse(aiResponse);
          useSlidiStore.setState((state) => {
            const msgs = [...state.messages];
            msgs[msgs.length - 1] = { role: "system", content: parsed.displayText, isOutlineReady: outlineReady, isPlanResponse: true };
            return { messages: msgs };
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          useSlidiStore.setState((state) => { const msgs = [...state.messages]; msgs[msgs.length - 1] = { role: "system", content: `Error: ${msg}`, isError: true }; return { messages: msgs }; });
        } finally {
          setIsGenerating(false);
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        return;
      }

      // Phase 1: generate questions from the user's topic
      addMessage({ role: "user", content: trimmed });
      setInput("");
      setIsPlanModeActive(true);
      setPlanPhase("generating-questions");
      setIsGenerating(true);
      addMessage({ role: "system", content: "Generating questions..." });

      const effectiveAdessoModel = provider === "adesso"
        ? selectModelForTask(adessoModel, classifyTask(trimmed))
        : adessoModel;

      try {
        const questions = await generatePlanQuestions(trimmed, apiKey, provider, effectiveAdessoModel, userContext, presentationMode);
        setPlanQuestions(questions);
        setPlanAnswers(new Array(questions.length).fill(""));
        setPlanCurrentPair(0);
        setPlanPairInputs(["", ""]);
        // Replace status message with a short intro
        useSlidiStore.setState((state) => {
          const msgs = [...state.messages];
          msgs[msgs.length - 1] = { role: "system", content: "Answer these questions so I can build a tailored outline for you:", isPlanResponse: true };
          return { messages: msgs };
        });
        setPlanPhase("answering");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        useSlidiStore.setState((state) => { const msgs = [...state.messages]; msgs[msgs.length - 1] = { role: "system", content: `Error: ${msg}`, isError: true }; return { messages: msgs }; });
        setPlanPhase("idle");
      } finally {
        setIsGenerating(false);
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    // ── Normal generation flow ──────────────────────────────────────────────
    addMessage({
      role: "user",
      content: trimmed,
      attachedFileNames: attachedFiles.length > 0 ? attachedFiles.map((f) => f.name) : undefined,
    });
    setInput("");
    setPendingEditContext(null);
    setIsGenerating(true);

    const { currentSlide, totalSlides } = useSlidiStore.getState();

    // --- Adesso model tiering: use lightweight model for simple edits ---
    const effectiveAdessoModel =
      provider === "adesso"
        ? selectModelForTask(adessoModel, classifyTask(trimmed))
        : adessoModel;

    // --- Semantic cache: check for a matching cached layout ---
    const cachedLayout = getCachedLayout(trimmed);
    const slideType = detectSlideType(trimmed);

    // --- Context windowing: targeted single-slide edit ---
    // Triggers when: (a) user clicked an element in Visual Edit mode, OR
    //                (b) slide edit mode is manually toggled on in the chat input
    const isVisualEdit = (!!pendingEditContext || slideEditMode) && !!generatedCode && totalSlides > 1;

    if (isVisualEdit) {
      addMessage({ role: "system", content: `Editing slide ${currentSlide + 1}…` });
      try {
        const windowedMessages = buildWindowedEditMessages(
          generatedCode,
          currentSlide,
          totalSlides,
          trimmed
        );

        if (windowedMessages) {
          const updatedBlock = await generateSlideEdit(
            windowedMessages,
            apiKey,
            provider,
            effectiveAdessoModel
          );

          if (updatedBlock) {
            const updatedCode = spliceSlideBlock(generatedCode, currentSlide, updatedBlock);
            if (updatedCode) {
              pushVersion(updatedCode);
              useSlidiStore.setState((state) => {
                const msgs = [...state.messages];
                msgs[msgs.length - 1] = {
                  role: "system",
                  content: `Slide ${currentSlide + 1} updated.`,
                  isOutput: true,
                };
                return { messages: msgs };
              });
              setIsGenerating(false);
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              return;
            }
          }
        }

        // Windowed edit failed — if in explicit slide mode, abort rather than
        // falling through to full regeneration (which would rewrite the entire deck).
        if (slideEditMode) {
          useSlidiStore.setState((state) => {
            const msgs = [...state.messages];
            msgs[msgs.length - 1] = {
              role: "system",
              content: "Could not locate slide code to edit. Try switching off slide mode and editing the full presentation.",
              isError: true,
            };
            return { messages: msgs };
          });
          setIsGenerating(false);
          return;
        }

        updateGenerationStatus("Generating full presentation code...");
      } catch {
        if (slideEditMode) {
          useSlidiStore.setState((state) => {
            const msgs = [...state.messages];
            msgs[msgs.length - 1] = { role: "system", content: "Slide edit failed — please try again.", isError: true };
            return { messages: msgs };
          });
          setIsGenerating(false);
          return;
        }
        updateGenerationStatus("Generating full presentation code...");
      }
    }

    const skipPlanning = options?.skipPlanning ?? generatedCode.length > 0;
    if (!isVisualEdit) {
      addMessage({ role: "system", content: skipPlanning ? "Generating presentation..." : "Planning deck structure..." });
    }

    try {
      const contextPrefix = generatedCode && totalSlides > 1
        ? `[Currently viewing slide ${currentSlide + 1} of ${totalSlides}] `
        : "";

      // Append converted file contents to the user message sent to the AI (not stored in chat history)
      const fileContextBlock = buildAttachedFilesBlock(attachedFiles);
      const aiUserContent = contextPrefix + trimmed + fileContextBlock;

      const cachedHint = cachedLayout ?? (slideType ? null : null);
      const effectiveCachedPlan = cachedHint ?? cachedPlan;

      const result = await generatePresentation(
        [...messages, { role: "user", content: aiUserContent }],
        apiKey,
        THEMES[theme].systemPromptBlock,
        provider,
        effectiveAdessoModel,
        (stage) => {
          if (stage === "planning")   updateGenerationStatus("Planning deck structure...");
          if (stage === "generating") updateGenerationStatus("Generating full presentation code...");
          if (stage === "finalizing") updateGenerationStatus("Finalizing and repairing output...");
        },
        { skipPlanning, cachedPlan: effectiveCachedPlan, userContext, presentationMode },
        (partial) => setStreamingPreview(partial)
      );

      await handleGenerationResult(result, slideType, trimmed, skipPlanning);
    } catch (err: unknown) {
      setStreamingPreview(null);
      const message = err instanceof Error ? err.message : "Unknown error";
      useSlidiStore.setState((state) => {
        const msgs = [...state.messages];
        msgs[msgs.length - 1] = {
          role: "system",
          content: `Error: ${message}`,
          isError: true,
        };
        return { messages: msgs };
      });
    } finally {
      setIsGenerating(false);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [input, isGenerating, apiKey, addMessage, setPendingEditContext, setIsGenerating, generatedCode, messages, theme, provider, adessoModel, updateGenerationStatus, cachedPlan, setCachedPlan, setStreamingPreview, pushVersion, pendingEditContext, planMode, planPhase, setIsPlanModeActive, userContext, presentationMode, triggerGenerationFromPlan, handleGenerationResult, attachedFiles]);

  const handleRegenerate = useCallback(() => {
    // Find the last user message and resubmit it
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMsg) {
      handleSubmit({ text: lastUserMsg.content });
    }
  }, [messages, handleSubmit]);
  
  const handleProviderSelect = (p: Provider) => {
    // If we want to switch provider without changing the key (if key exists)
    const existingKey = keys[p];
    setApiKey(existingKey, p);
    setShowModelDropdown(false);
  };

  const toggleMic = () => {
    if (!isVoiceSupported) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }
    toggleRecording(onInsecure);
  };

  const handleComplete = (slideCount: number, expectedCount: number) => {
    const prompt =
      `The presentation was cut off after slide ${slideCount}. ` +
      `Add slides ${slideCount + 1} through ${expectedCount} with the exact same ` +
      `visual style, theme variables (var(--sl-bg), var(--sl-text), var(--sl-accent), var(--sl-sub)), ` +
      `animation classes (sl-slide-up, sl-scale-in, sl-fade-in, sl-delay-1 through sl-delay-5), ` +
      `and component structure as the existing slides. ` +
      `Return the complete updated component with all ${expectedCount} slides.`;
    setInput(prompt);
    setTimeout(() => handleSubmit({ skipPlanning: true }), 0);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTogglePlanMode = useCallback(() => {
    if (planMode && isPlanModeActive) {
      addMessage({ role: "system", content: "Plan Mode deactivated." });
    }
    setPlanMode(!planMode);
    setPlanPhase("idle");
    setPlanQuestions([]);
    setPlanAnswers([]);
    setPlanCurrentPair(0);
    setPlanPairInputs(["", ""]);
    setIsPlanModeActive(false);
  }, [planMode, isPlanModeActive, planPhase, setPlanMode, addMessage, setIsPlanModeActive]);

  return (
    <>
    <aside className="w-full bg-[#f9f9f9] flex flex-col flex-shrink-0 z-10 h-full border-l border-slate-200/60 shadow-[inset_1px_0_0_0_rgba(255,255,255,0.8)] relative">
      {/* --- Header --- */}
      <header className="flex items-center justify-between px-5 py-4 shrink-0 text-slate-700 bg-[#f9f9f9]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${isGenerating ? "bg-blue-500 animate-pulse ring-4 ring-blue-100" : "bg-slate-300"}`}
          />
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            Assistant
          </h2>
        </div>
        
        <button 
          onClick={clearMessages}
          className="hover:bg-red-50 active:scale-[0.96] p-2 rounded-lg transition-all text-red-500"
          title="Clear Chat"
          aria-label="Clear Chat"
        >
          <Trash2 className="w-4 h-4" strokeWidth={2} />
        </button>
      </header>

      {/* --- Chat Area --- */}
      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-[200px] flex flex-col space-y-8 custom-scrollbar scroll-smooth">
        {planMode && planPhase === "answering" && (
          <div className="sticky top-0 z-10 pb-3 pt-1 bg-[#f9f9f9]/90 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Planning — Questions</span>
              <span className="text-[10px] font-bold text-slate-400">Set {planCurrentPair + 1} of {Math.ceil(planQuestions.length / 2)}</span>
            </div>
            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.round(((planCurrentPair) / Math.ceil(planQuestions.length / 2)) * 100)}%` }}
              />
            </div>
          </div>
        )}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60 px-4 py-12">
            <div className="w-12 h-12 rounded-[22px] bg-white flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden p-2.5">
              <img 
                src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/branding/Brand_Icon.svg`}
                alt="Slidi Icon"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Ready to build</p>
              <p className="text-[11px] text-slate-500 mt-2 max-w-[200px] leading-relaxed font-medium">
                Describe your slides or use <span className="font-bold text-blue-600">Visual Edit</span> for precise changes.
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <div key={i} className="flex justify-end animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="flex flex-col items-end gap-1.5 max-w-[85%]">
                  <div className="bg-[#f0f0f0] text-slate-800 px-5 py-3 rounded-[24px] rounded-tr-none text-[15px] font-medium leading-relaxed shadow-sm">
                    {msg.content}
                  </div>
                  {msg.attachedFileNames && msg.attachedFileNames.length > 0 && (
                    <div className="flex flex-wrap gap-1 justify-end">
                      {msg.attachedFileNames.map((name) => (
                        <span
                          key={name}
                          className="flex items-center gap-1 bg-violet-100 text-violet-700 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        >
                          📎 {name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          const isStatus =
            msg.content === "Generating..." ||
            msg.content === "Generating presentation..." ||
            msg.content === "Applying targeted slide edit..." ||
            msg.content === "Planning deck structure..." ||
            msg.content === "Generating full presentation code..." ||
            msg.content === "Finalizing and repairing output..." ||
            msg.content === "Outline approved — generating your presentation...";

          // Pair summary: collapsed Q&A answered in the wizard
          if (msg.isPlanPairSummary) {
            const pairs = msg.content.split("\n\n").map((block) => {
              const lines = block.split("\n");
              return { q: lines[0]?.replace(/^Q: /, "") ?? "", a: lines[1]?.replace(/^A: /, "") ?? "" };
            });
            return (
              <div key={i} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3 animate-in fade-in duration-300">
                {pairs.map((pair, pi) => (
                  <div key={pi} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[11px] text-slate-400 font-medium leading-snug">{pair.q}</p>
                      <p className="text-[13px] text-slate-800 font-semibold leading-snug mt-0.5">{pair.a || <em className="text-slate-400 font-normal">skipped</em>}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          // Outline card renderer — replaces plain text for isOutlineReady messages
          if (msg.isOutlineReady) {
            const slides = parseOutline(msg.content);
            const ACCENT_COLORS = [
              "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-rose-500",
              "bg-amber-500", "bg-cyan-500", "bg-fuchsia-500", "bg-teal-500",
              "bg-orange-500", "bg-indigo-500",
            ];
            return (
              <div key={i} className="w-full animate-in fade-in slide-in-from-left-2 duration-300">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                    Presentation Outline
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">· {slides.length} slides</span>
                </div>

                {/* Slide cards */}
                <div className="space-y-1.5">
                  {slides.map((slide, si) => (
                    <div
                      key={slide.number}
                      className="flex items-start gap-3 bg-white border border-slate-200 rounded-2xl px-3.5 py-3 hover:border-blue-200 hover:shadow-sm transition-all duration-200 group"
                    >
                      <span className={`flex-shrink-0 w-6 h-6 rounded-full ${ACCENT_COLORS[si % ACCENT_COLORS.length]} text-white text-[10px] font-black flex items-center justify-center mt-0.5 shadow-sm`}>
                        {slide.number}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-slate-800 leading-snug">{slide.title}</p>
                        {slide.description && (
                          <p className="text-[11px] text-slate-400 leading-snug mt-0.5 font-medium">{slide.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Generate / exit buttons */}
                {i === messages.length - 1 && (
                  <div className="mt-3 space-y-2">
                    <button
                      onClick={() => triggerGenerationFromPlan(messages.slice(0, i + 1))}
                      disabled={isGenerating}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:bg-blue-200 disabled:scale-100 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate from this outline
                    </button>
                    <button
                      onClick={() => { addMessage({ role: "system", content: "Plan Mode deactivated." }); setPlanMode(false); }}
                      className="w-full py-1.5 text-[10px] text-blue-400 hover:text-blue-700 font-bold uppercase tracking-widest transition-colors"
                    >
                      Exit Plan Mode
                    </button>
                  </div>
                )}
              </div>
            );
          }

          // Success card for completed generation
          if (msg.isOutput) {
            return (
              <div key={i} className="w-full animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="rounded-2xl overflow-hidden border border-emerald-200 bg-emerald-50/60">
                  <div className="flex items-center gap-3 px-4 py-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="block text-[10px] font-black text-emerald-700 uppercase tracking-widest leading-none">
                        Deck Ready
                      </span>
                      <span className="block text-[9px] text-emerald-500 font-medium mt-0.5 truncate">
                        {msg.content}
                      </span>
                    </div>
                  </div>
                  <div className="h-[3px] w-full bg-emerald-200">
                    <div className="h-full w-full bg-gradient-to-r from-emerald-400 to-teal-400" />
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={i} className="flex flex-col max-w-[95%] text-slate-800 text-[15px] leading-relaxed animate-in fade-in slide-in-from-left-2 duration-300">
              <div className={`space-y-4 ${msg.isError ? "text-red-600 bg-red-50/50 p-4 rounded-2xl border border-red-100" : ""}`}>
                {msg.isError && <AlertCircle className="w-4 h-4 text-red-500 mb-1" />}

                {!msg.isLayoutWarning && (
                  <div className="break-words whitespace-pre-wrap">
                    {msg.content.split(/(\*\*.*?\*\*|\*.*?\*)/g).map((part, index) => {
                      if (part.startsWith("**") && part.endsWith("**")) {
                        return <strong key={index}>{part.slice(2, -2)}</strong>;
                      }
                      if (part.startsWith("*") && part.endsWith("*")) {
                        return <em key={index}>{part.slice(1, -1)}</em>;
                      }
                      return part;
                    })}

                  </div>
                )}

                {msg.isIncomplete && (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl space-y-3 mt-4">
                    <p className="text-[13px] text-amber-900 font-medium leading-normal">
                      Presentation was cut off. Would you like to try completing the remaining slides?
                    </p>
                    <button
                      onClick={() => handleComplete(msg.incompleteSlideCount!, msg.incompleteExpectedCount!)}
                      disabled={isGenerating}
                      className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] disabled:bg-amber-200 disabled:scale-100 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm"
                    >
                      Try to Complete
                    </button>
                  </div>
                )}

                {msg.isLayoutWarning && (
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl mt-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] text-amber-800 leading-relaxed">{msg.content}</p>
                      <button
                        onClick={() => removeMessageAt(i)}
                        className="flex-shrink-0 text-amber-400 hover:text-amber-700 transition-colors text-[14px] font-medium leading-none mt-0.5"
                        title="Dismiss"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )}

                {/* isOutlineReady messages are rendered by the outline card renderer above — no duplicate buttons here */}

                {isStatus && (
                  <div className="mt-2 rounded-2xl overflow-hidden border border-blue-100 bg-blue-50/60">
                    {/* Stage header */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-[10px] font-black text-blue-700 uppercase tracking-widest leading-none">
                          {msg.content === "Planning deck structure..."
                            ? "Planning structure"
                            : msg.content === "Generating full presentation code..."
                            ? "Generating slides"
                            : msg.content === "Finalizing and repairing output..."
                            ? "Finalizing output"
                            : "Processing"}
                        </span>
                        <span className="block text-[9px] text-blue-400 font-medium mt-0.5 truncate">
                          {msg.content === "Planning deck structure..."
                            ? "Mapping your deck outline..."
                            : msg.content === "Generating full presentation code..."
                            ? "Building React components..."
                            : msg.content === "Finalizing and repairing output..."
                            ? "Validating & cleaning code..."
                            : "Working on it..."}
                        </span>
                      </div>
                    </div>
                    {/* Animated progress strip */}
                    <div className="h-[3px] w-full relative overflow-hidden bg-blue-100">
                      <div
                        className="absolute top-0 left-0 h-full"
                        style={{
                          width: "40%",
                          background: "linear-gradient(to right, #3b82f6, #6366f1)",
                          animation: "sl-chat-progress 1.6s ease-in-out infinite",
                        }}
                      />
                    </div>
                    <style>{`
                      @keyframes sl-chat-progress {
                        0%   { transform: translateX(-100%); }
                        100% { transform: translateX(350%); }
                      }
                    `}</style>
                  </div>
                )}
              </div>

              {/* AI Message Action Bar */}
              {!isStatus && !msg.isError && (
                <div className="flex items-center space-x-1 mt-2 mb-2 text-slate-400">
                  <button 
                    onClick={() => {
                      copyToClipboard(msg.content);
                      setCopiedIndex(i);
                      setTimeout(() => setCopiedIndex(null), 2000);
                    }}
                    className="p-1.5 hover:bg-slate-200/50 hover:text-slate-900 rounded-lg transition-colors flex items-center gap-1"
                    title="Copy to clipboard"
                  >
                    {copiedIndex === i ? <CheckCircle2 className="w-[16px] h-[16px] text-emerald-500" /> : <Copy className="w-[16px] h-[16px]" />}
                    {copiedIndex === i && <span className="text-[10px] font-bold text-emerald-500 uppercase">Copied!</span>}
                  </button>
                  {i === messages.length - 1 && (
                    <button 
                      onClick={handleRegenerate}
                      className="p-1.5 hover:bg-slate-200/50 hover:text-slate-900 rounded-lg transition-colors flex items-center"
                      title="Regenerate"
                    >
                      <RefreshCcw className="w-[16px] h-[16px]" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* --- Input Area (Sticky Bottom) --- */}
      <div className="absolute bottom-0 left-0 right-0 pt-8 pb-4 px-5 bg-gradient-to-t from-[#f9f9f9] via-[#f9f9f9] to-transparent z-30">
        <FileDropZone disabled={isGenerating || !hasKey}>
        <div data-tour="chat-textarea" className="bg-white border border-slate-200/80 rounded-[28px] p-3 shadow-[0_4px_20px_rgb(0,0,0,0.03)] focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.08)] focus-within:border-blue-200/60 transition-all duration-500 ease-out">
          
          {/* Attached file pills */}
          <AttachedFilePills />

          {/* Slide edit mode pill — shown when a presentation is loaded with multiple slides */}
          {isMounted && generatedCode && totalSlides > 1 && (
            <button
              onClick={() => setSlideEditMode((v) => !v)}
              title={slideEditMode ? "Click to edit the full presentation instead" : "Click to limit edits to the current slide only"}
              className={`flex items-center gap-1.5 border rounded-xl px-3 py-1.5 w-fit mb-2 text-[11px] font-bold uppercase tracking-wider transition-all animate-in slide-in-from-bottom-2 duration-300 ${
                slideEditMode
                  ? "bg-violet-50 border-violet-300 text-violet-700"
                  : "border-slate-100 bg-slate-50/50 text-slate-400 hover:text-slate-600"
              }`}
            >
              <SquareDashedBottomCode className="w-3.5 h-3.5" strokeWidth={2.5} />
              {slideEditMode ? `Editing slide ${currentSlide + 1} of ${totalSlides}` : `Slide ${currentSlide + 1} mode`}
            </button>
          )}

          {/* Context Pill */}
          {pendingEditContext && (
            <div className="flex items-center space-x-2 border border-slate-100 rounded-xl px-3 py-1.5 w-fit mb-2 bg-slate-50/50 animate-in slide-in-from-bottom-2 duration-300 group">
              <AlignLeft className="w-3.5 h-3.5 text-blue-500" strokeWidth={2.5} />
              <span className="text-[11px] font-bold text-slate-600 truncate max-w-[180px] uppercase tracking-wider">{pendingEditContext}</span>
              <button
                onClick={() => { setPendingEditContext(null); setInput(""); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-slate-400 hover:text-red-500"
              >
                ✕
              </button>
            </div>
          )}

          {/* Plan Mode Wizard — replaces textarea while answering questions */}
          {planMode && planPhase === "answering" && planQuestions.length > 0 ? (
            <div className="space-y-3 px-1 py-1">
              {[0, 1].map((offset) => {
                const qIdx = planCurrentPair * 2 + offset;
                if (!planQuestions[qIdx]) return null;
                return (
                  <div key={qIdx} className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-snug">
                      {planQuestions[qIdx]}
                    </label>
                    <input
                      type="text"
                      value={planPairInputs[offset as 0 | 1]}
                      onChange={(e) => {
                        const next: [string, string] = [...planPairInputs] as [string, string];
                        next[offset as 0 | 1] = e.target.value;
                        setPlanPairInputs(next);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handlePairSubmit(); }
                      }}
                      autoFocus={offset === 0}
                      disabled={isGenerating}
                      placeholder="Your answer..."
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[14px] text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all disabled:opacity-50"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={planMode && planPhase === "outline-ready" ? "Comment on the outline or type 'generate'..." : "Ask anything..."}
            disabled={isGenerating || !hasKey || (planMode && (planPhase === "generating-questions" || planPhase === "generating-outline"))}
            className="w-full bg-transparent outline-none resize-none px-2 py-1 text-[15px] placeholder-slate-400 text-slate-800 min-h-[44px] max-h-[180px] leading-relaxed disabled:opacity-50"
            rows={1}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "inherit";
              target.style.height = `${Math.min(target.scrollHeight, 180)}px`;
            }}
          />
          )}

          {/* Input Tools & Submit */}
          <div className="flex items-center justify-between gap-1.5 mt-2 px-1">
            {/* Tool Row */}
            <div className="flex flex-wrap items-center gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-1 relative flex-shrink-0" ref={dropdownRef}>
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className={`flex items-center space-x-1 hover:bg-slate-100 px-2 py-1 rounded-full transition-all text-slate-700 text-[10px] font-bold uppercase tracking-wider bg-slate-50 border ${showModelDropdown ? "border-blue-300 ring-2 ring-blue-50" : "border-slate-100"}`}
                title="Select Model"
              >
                <span className="capitalize">
                  {provider === "adesso" ? ADESSO_MODELS.find(m => m.id === adessoModel)?.label || "adesso" : provider}
                </span>
                {showModelDropdown ? <ChevronUp className="w-3 h-3 text-blue-500" strokeWidth={2.5} /> : <ChevronDown className="w-3 h-3 text-slate-400" strokeWidth={2.5} />}
              </button>

              {showModelDropdown && (
                <div className="absolute bottom-full mb-2 left-0 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 z-50 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="px-3 py-1.5 mb-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Providers</span>
                  </div>
                  {(["openai", "anthropic", "gemini", "adesso"] as const).map((p) => {
                    const hasProviderKey = !!keys[p];
                    const isSelected = provider === p;
                    return (
                      <button
                        key={p}
                        onClick={() => handleProviderSelect(p)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                          isSelected ? "bg-slate-900 text-white" : "hover:bg-slate-50 text-slate-600"
                        }`}
                      >
                        <span className="capitalize">{p}</span>
                        {!hasProviderKey && (
                          <div 
                            className="flex items-center justify-center" 
                            title={`No API Key set for ${p}. Click to select, then add key in settings.`}
                          >
                            <Key className="w-3.5 h-3.5 text-red-500" />
                          </div>
                        )}
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                      </button>
                    );
                  })}
                  
                  {provider === "adesso" && (
                    <>
                      <div className="h-[1px] bg-slate-100 my-2 mx-2" />
                      <div className="px-3 py-1.5 mb-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">adesso AI Hub Models</span>
                      </div>
                      <div className="max-h-[200px] overflow-y-auto custom-scrollbar">
                        {ADESSO_MODELS.map((m) => {
                          const isModelSelected = adessoModel === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => { setAdessoModel(m.id); setShowModelDropdown(false); if (isFreeAdessoModel(m.id)) setShowFreeModelPopup(true); }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[10px] font-bold transition-all ${
                                isModelSelected ? "text-blue-600 bg-blue-50/50" : "hover:bg-slate-50 text-slate-600"
                              }`}
                            >
                              <span className="text-left line-clamp-1">{m.label}</span>
                              {isModelSelected && <CheckCircle2 className="w-3 h-3 text-blue-500" />}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <div className="h-[1px] bg-slate-100 my-1 mx-2" />
                  <button
                    onClick={() => { onSettings?.(); setShowModelDropdown(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all"
                  >
                    <Settings className="w-3 h-3" />
                    Configure Keys
                  </button>
                </div>
              )}

              <AttachButton disabled={isGenerating || !hasKey} />

              <button
                onClick={handleTogglePlanMode}
                title="Plan Mode: AI will ask clarifying questions before generating"
                className={`relative flex items-center space-x-1 px-2 py-1 rounded-full transition-all text-[10px] font-bold uppercase tracking-wider border ${
                  planMode
                    ? "bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-50"
                    : "hover:bg-slate-100 bg-slate-50 border-slate-100 text-slate-700"
                }`}
              >
                {planMode ? (
                  <Sparkles className="w-3 h-3" strokeWidth={2.5} />
                ) : (
                  <SlidersHorizontal className="w-3 h-3" strokeWidth={2.5} />
                )}
                <span>Plan</span>
                {planPhase !== "idle" && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                )}
              </button>
            </div>

              {/* Corporate / Private mode toggle */}
              <div className="flex-shrink-0">
              <button
                onClick={() => setPresentationMode(presentationMode === "corporate" ? "private" : "corporate")}
                title="Corporate: formal, data-driven | Private: casual, expressive"
                className={`flex items-center space-x-1 px-2 py-1 rounded-full transition-all text-[10px] font-bold uppercase tracking-wider border ${
                  presentationMode === "private"
                    ? "bg-purple-50 border-purple-300 text-purple-700"
                    : "hover:bg-slate-100 bg-slate-50 border-slate-100 text-slate-700"
                }`}
              >
                {presentationMode === "private" ? (
                  <Smile className="w-3 h-3" strokeWidth={2.5} />
                ) : (
                  <Briefcase className="w-3 h-3" strokeWidth={2.5} />
                )}
                <span>{presentationMode === "private" ? "Private" : "Corporate"}</span>
              </button>
              {/* Voice Input Button hidden for now */}
              {/* 
              <button
                onClick={toggleMic}
                title={isRecording ? "Stop Recording" : "Voice Input"}
                className={`p-2 rounded-full transition-all flex items-center justify-center ${
                  isRecording 
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200 animate-pulse" 
                    : "hover:bg-slate-100 text-slate-400 active:scale-90"
                }`}
              >
                <Mic className="w-5 h-5" strokeWidth={isRecording ? 2.5 : 2} />
              </button>
              */}
            </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center flex-shrink-0">
              {planMode && planPhase === "answering" ? (
                <button
                  onClick={handlePairSubmit}
                  disabled={isGenerating || !planPairInputs[0].trim()}
                  className="bg-blue-600 hover:bg-blue-700 active:scale-90 disabled:bg-slate-100 text-white px-3 h-8 rounded-full transition-all flex items-center justify-center text-[10px] font-black uppercase tracking-widest shadow-sm disabled:shadow-none disabled:text-slate-300 whitespace-nowrap"
                >
                  {planCurrentPair < Math.ceil(planQuestions.length / 2) - 1 ? "Next" : "Build Outline"}
                </button>
              ) : (
              <button
                onClick={() => handleSubmit()}
                disabled={isGenerating || !hasKey || !input.trim()}
                className="bg-slate-900 hover:bg-blue-600 active:scale-90 disabled:bg-slate-100 text-white p-2 rounded-full transition-all flex items-center justify-center w-8 h-8 shadow-sm disabled:shadow-none"
                aria-label="Send message"
              >
                <ArrowUp className="w-4 h-4 -translate-y-[0.5px]" strokeWidth={3} />
              </button>
              )}
            </div>
          </div>
        </div>
        </FileDropZone>

        {/* Footer Info */}
        <div className="text-center mt-4">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em]">
            {isGenerating ? "AI is typing..." : hasKey ? "AI Engine Online" : "Configuration Required"}
          </span>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #e2e8f0;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: #cbd5e1;
        }
      `}} />
    </aside>

    {showFreeModelPopup && (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-500"
          onClick={() => setShowFreeModelPopup(false)}
        />
        <div className="relative bg-white rounded-[40px] shadow-2xl max-w-sm w-full p-8 flex flex-col items-center text-center animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
          <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mb-6">
            <Sparkles className="w-10 h-10 text-amber-400" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3 tracking-tight">
            Free Model Selected
          </h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-8">
            You selected a <span className="font-bold text-slate-900">free model</span>. Performance may be degraded and presentations are limited to <span className="font-bold text-slate-900">5 slides</span> instead of the usual 10+.
          </p>
          <button
            onClick={() => setShowFreeModelPopup(false)}
            className="w-full bg-slate-900 text-white font-black uppercase tracking-[0.2em] text-[10px] py-4 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
          >
            Got it
          </button>
        </div>
      </div>
    )}
    </>
  );
}

const ChatPane = memo(ChatPaneInner);
export default ChatPane;
