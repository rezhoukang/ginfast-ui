import { describe, expect, it } from "vitest";
import { setNode, selectedTreeKey } from "./tree";
import { resolveView, viewPath } from "./navigation";
import type { Definition } from "../api/choice";
const definition: Definition = {
  name: "题集",
  description: "",
  separator: "",
  dimensions: [{ code: "score", name: "得分", initial: 0, terms: [] }],
  questions: [{ code: "Q1", title: "题目", kind: "single", required: true, options: [{ code: "a", text: "选项", effects: [] }] }],
  rules: [{ group: "result", code: "pass", name: "合格", description: "", mode: "all", conditions: [] }]
};
describe("Choice content hierarchy", () => {
  it("scopes equal question and option codes to their own set", () => {
    const a = setNode({ id: 1, name: "A" }, definition);
    const b = setNode({ id: 2, name: "B" }, definition);
    const option = a.children![1].children![0].children![0];
    expect(option.query).toEqual({ question: "Q1", option: "a" });
    expect(option.set).toBe("1");
    expect(option.key).not.toBe(b.children![1].children![0].children![0].key);
    expect(selectedTreeKey("options", "1", option.query!)).toBe(option.key);
    expect(a.children![2].children![0].query).toEqual({ item: "score" });
    expect(a.children![3].children![0].query).toEqual({ item: "result/pass" });
  });
  it("merges details into set management and separates global browsing", () => {
    expect(viewPath("overview")).toBe("/choice/sets");
    expect(resolveView("/choice/sets", { section: "details", set: "1" })).toBe("overview");
    expect(resolveView("/choice/sets", { all: "1", kind: "options" })).toBe("browse");
    expect(selectedTreeKey("browse", "1", {})).toBe("all");
    expect(setNode({ id: 1, name: "A" }).children).toBeUndefined();
  });
});
