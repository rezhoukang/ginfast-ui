import { validEffect } from "./effects";
import type { Definition, Question } from "../api/choice";
import type { ChoiceView } from "./navigation";

export interface DraftIssue {
  message: string;
  view: ChoiceView;
  question?: string;
}
export const validCode = (code: string) => /^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(code);
const finite = (value: number) => Number.isFinite(value) && Math.abs(value) <= 1000000;

export function optionIssue(q: Question): string {
  if (q.options.length < 2 || q.options.length > 28) return "需要 2–28 个选项";
  if (q.options.some(o => !o.text.trim())) return "还有选项未填写内容";
  if (new Set(q.options.map(o => o.code)).size !== q.options.length || q.options.some(o => !/^[a-z01]$/.test(o.code)))
    return "选项编号重复或无效";
  return "";
}

// Editing guidance only. The backend remains authoritative for full validation.
export function draftIssues(d: Definition): DraftIssue[] {
  const issues: DraftIssue[] = [];
  const add = (view: ChoiceView, message: string, question?: string) => issues.push({ view, message, question });
  if (!d.name.trim()) add("overview", "填写题集名称");
  if (!d.dimensions.length) add("dimensions", "添加至少一个题集变量");
  const dimensions = new Map(d.dimensions.map(dim => [dim.code, dim]));
  const base = (code: string) => dimensions.has(code) && !dimensions.get(code)!.terms.length;
  const seenDimensions = new Set<string>();
  for (const dim of d.dimensions) {
    if (!validCode(dim.code) || seenDimensions.has(dim.code) || !dim.name.trim() || !finite(dim.initial))
      add("dimensions", `变量 ${dim.name || dim.code}：检查编号、名称和初始值`);
    seenDimensions.add(dim.code);
    if (
      dim.terms.some(t => !base(t.dimension) || !finite(t.weight)) ||
      new Set(dim.terms.map(t => t.dimension)).size !== dim.terms.length
    )
      add("dimensions", `变量 ${dim.name}：计算项须引用不重复的基础变量`);
  }
  if (!d.questions.length) add("questions", "添加至少一道题目");
  const seenQuestions = new Set<string>();
  for (const q of d.questions) {
    if (!q.title.trim() || !validCode(q.code) || seenQuestions.has(q.code))
      add("questions", `题目 ${q.code}：完善题目内容和唯一编号`);
    seenQuestions.add(q.code);
    const problem = optionIssue(q);
    if (problem) add("options", `${q.code}：${problem}`, q.code);
    if (
      q.options.some(
        o =>
          o.effects.some(e => !base(e.dimension) || !validEffect(e)) ||
          new Set(o.effects.map(e => e.dimension)).size !== o.effects.length
      )
    )
      add("options", `${q.code}：检查选项引用的变量、操作及数值`, q.code);
  }
  const seenRules = new Set<string>();
  for (const rule of d.rules) {
    const key = `${rule.group}/${rule.code}`;
    if (!validCode(rule.group) || !validCode(rule.code) || !rule.name.trim() || seenRules.has(key))
      add("rules", `规则 ${rule.name || rule.code}：检查分组、编号和名称`);
    seenRules.add(key);
    if (
      rule.conditions.some(
        c =>
          !dimensions.has(c.dimension) ||
          (c.compareTo && !dimensions.has(c.compareTo)) ||
          !finite(c.value) ||
          ![">", ">=", "<", "<=", "==", "!="].includes(c.operator)
      )
    )
      add("rules", `规则 ${rule.name}：检查比较变量及条件`);
  }
  return issues;
}
