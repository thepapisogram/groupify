"use client";

import { useCallback, useMemo, useReducer, useState } from "react";
import { toast } from "sonner";
import {
  computeGroupSizes,
  moveMember as moveMemberIn,
  renameGroup as renameGroupIn,
  type DistributionMode,
  type Group,
  type GroupBy,
  type Person,
  type Rule,
  type RuleType,
} from "@/lib/grouping";
import { groupPeopleAsync } from "@/lib/grouping-client";

export type { Rule, RuleType };

/** The user-adjustable settings worth remembering between visits. */
export interface GroupingSettings {
  by: GroupBy;
  size: number;
  count: number;
  mode: DistributionMode;
  rules: Rule[];
  balanceBy: string | null;
}

const HISTORY_LIMIT = 15;

export interface ResultsState {
  groups: Group[];
  /** Earlier versions of `groups`, newest last, for undo. */
  history: Group[][];
  warnings: string[];
}

export type ResultsAction =
  | { type: "commit"; groups: Group[]; warnings: string[] }
  | { type: "undo" }
  | { type: "rename"; groupId: number; label: string }
  | { type: "move"; from: number; index: number; to: number }
  | { type: "restore"; groups: Group[] }
  | { type: "clear" };

const remember = (history: Group[][], current: Group[]): Group[][] =>
  current.length > 0 ? [...history.slice(-(HISTORY_LIMIT - 1)), current] : history;

// Pure, so React can safely re-run it (strict mode) without double-recording history.
export function resultsReducer(state: ResultsState, action: ResultsAction): ResultsState {
  switch (action.type) {
    case "commit":
      return { groups: action.groups, warnings: action.warnings, history: remember(state.history, state.groups) };
    case "undo": {
      if (state.history.length === 0) return state;
      return {
        groups: state.history[state.history.length - 1],
        history: state.history.slice(0, -1),
        warnings: [],
      };
    }
    case "rename": {
      const groups = renameGroupIn(state.groups, action.groupId, action.label);
      return groups === state.groups ? state : { ...state, groups, history: remember(state.history, state.groups) };
    }
    case "move": {
      const groups = moveMemberIn(state.groups, action.from, action.index, action.to);
      return groups === state.groups
        ? state
        : { groups, warnings: [], history: remember(state.history, state.groups) };
    }
    case "restore":
      return { groups: action.groups, history: [], warnings: [] };
    case "clear":
      return { groups: [], history: [], warnings: [] };
  }
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * State and actions shared by the quick tool and the form dashboard: sizing
 * controls, rules, generating, editing results and undo.
 */
export function useGrouping(people: Person[], initial?: Partial<GroupingSettings>) {
  const [by, setBy] = useState<GroupBy>(initial?.by ?? "size");
  const [size, setSize] = useState(initial?.size ?? 4);
  const [count, setCount] = useState(initial?.count ?? 2);
  const [mode, setMode] = useState<DistributionMode>(initial?.mode ?? "best");
  const [rules, setRules] = useState<Rule[]>(initial?.rules ?? []);
  const [balanceBy, setBalanceBy] = useState<string | null>(initial?.balanceBy ?? null);

  const [{ groups, warnings, history }, dispatch] = useReducer(resultsReducer, {
    groups: [],
    history: [],
    warnings: [],
  });
  const [isWorking, setIsWorking] = useState(false);

  const n = people.length;

  // Whichever of size/count the user is not editing is derived, so the two can never disagree.
  const derivedCount = useMemo(() => computeGroupSizes(n, "size", size, mode).length, [n, size, mode]);
  const derivedSize = useMemo(() => Math.max(2, Math.ceil(n / Math.max(1, count))), [n, count]);
  const shownSize = by === "size" ? size : derivedSize;
  const shownCount = by === "count" ? count : derivedCount;

  const onGroupByChange = useCallback(
    (next: GroupBy) => {
      if (next === by) return;
      if (n > 0) {
        if (next === "count") setCount(Math.max(1, derivedCount));
        else setSize(derivedSize);
      }
      setBy(next);
    },
    [by, n, derivedCount, derivedSize],
  );

  const onSizeChange = useCallback((value: number) => {
    setSize(value);
    setBy("size");
  }, []);

  const onGroupCountChange = useCallback((value: number) => {
    setCount(value);
    setBy("count");
  }, []);

  const run = useCallback(
    async (kind: "generate" | "reshuffle"): Promise<Group[] | null> => {
      if (n === 0) {
        toast.error("Enter at least one name to start");
        return null;
      }
      if (by === "size" && size < 2) {
        toast.error("Group size must be at least 2");
        return null;
      }

      // Rules only apply to people who are still in the list.
      const present = new Set(people.map((p) => p.key));
      const usable = rules
        .map((r) => ({ ...r, keys: r.keys.filter((k) => present.has(k)) }))
        .filter((r) => r.keys.length >= 2);

      setIsWorking(true);
      try {
        const result = await groupPeopleAsync(people, {
          by,
          value: by === "size" ? size : count,
          mode,
          together: usable.filter((r) => r.type === "together").map((r) => r.keys),
          apart: usable.filter((r) => r.type === "apart").map((r) => r.keys),
          balanceBy: balanceBy ?? undefined,
        });

        dispatch({ type: "commit", groups: result.groups, warnings: result.warnings });

        if (result.warnings.length > 0) {
          toast.warning(result.warnings[0]);
        } else if (kind === "generate") {
          toast.success(`${plural(result.groups.length, "group")} created from ${plural(n, "name")}`);
        } else {
          toast.success("Reshuffled!");
        }
        return result.groups;
      } catch {
        toast.error(kind === "generate" ? "Failed to generate groups" : "Shuffle failed");
        return null;
      } finally {
        setIsWorking(false);
      }
    },
    [n, by, size, count, mode, people, rules, balanceBy],
  );

  const generate = useCallback(() => run("generate"), [run]);
  const reshuffle = useCallback(() => run("reshuffle"), [run]);

  const undo = useCallback(() => dispatch({ type: "undo" }), []);

  const rename = useCallback(
    (groupId: number, label: string) => dispatch({ type: "rename", groupId, label }),
    [],
  );

  const move = useCallback(
    (from: number, index: number, to: number) => dispatch({ type: "move", from, index, to }),
    [],
  );

  /** Load groups from elsewhere (e.g. a saved grouping) without recording history. */
  const restore = useCallback((next: Group[]) => dispatch({ type: "restore", groups: next }), []);

  const clearResults = useCallback(() => dispatch({ type: "clear" }), []);

  const addRule = useCallback((type: RuleType, keys: string[]) => {
    const unique = Array.from(new Set(keys));
    if (unique.length < 2) return;
    setRules((prev) => [...prev, { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, type, keys: unique }]);
  }, []);

  const removeRule = useCallback((id: string) => setRules((prev) => prev.filter((r) => r.id !== id)), []);

  const settings: GroupingSettings = { by, size, count, mode, rules, balanceBy };

  const applySettings = useCallback((next: GroupingSettings) => {
    setBy(next.by);
    setSize(next.size);
    setCount(next.count);
    setMode(next.mode);
    setRules(next.rules);
    setBalanceBy(next.balanceBy);
  }, []);

  return {
    // sizing
    by,
    size: shownSize,
    groupCount: shownCount,
    mode,
    onGroupByChange,
    onSizeChange,
    onGroupCountChange,
    onModeChange: setMode,
    settings,
    applySettings,
    // rules
    rules,
    addRule,
    removeRule,
    balanceBy,
    setBalanceBy,
    // results
    groups,
    warnings,
    isWorking,
    canUndo: history.length > 0,
    hasResults: groups.length > 0,
    generate,
    reshuffle,
    undo,
    rename,
    move,
    restore,
    clearResults,
  };
}

export type GroupingController = ReturnType<typeof useGrouping>;
