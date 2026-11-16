import { describe, expect, it } from "vitest";
import { draftIssues, optionIssue } from "./readiness";
import type { Definition, Question } from "../api/choice";
const question = (): Question => ({
  code: "Q1",
  title: "判断",
  kind: "boolean",
  required: true,
  options: [
    { code: "0", text: "错误", value: false, correct: true, effects: [] },
    { code: "1", text: "正确", value: true, correct: false, effects: [] }
  ]
});
describe("draft editing guidance", () => {
  it("keeps boolean value separate from the correct answer", () => {
    const q = question();
    expect(optionIssue(q)).toBe("");
    q.options[1].correct = true;
    expect(optionIssue(q)).toContain("唯一正确答案");
    q.kind = "multiple";
    expect(optionIssue(q)).toBe("");
  });
  it("allows scoring without result rules but links broken references to their editor", () => {
    const d: Definition = {
      name: "测评",
      description: "",
      separator: "",
      dimensions: [{ code: "score", name: "得分", initial: 0, terms: [] }],
      questions: [question()],
      rules: []
    };
    expect(draftIssues(d)).toEqual([]);
    d.questions[0].options[0].effects.push({ dimension: "missing", delta: 1 });
    expect(draftIssues(d)).toEqual([expect.objectContaining({ view: "options", question: "Q1" })]);
  });
});
