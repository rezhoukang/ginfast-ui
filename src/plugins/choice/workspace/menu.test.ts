import { describe, expect, it } from "vitest";
import { menuKey, menuOpenKeys, menuTarget } from "./menu";

describe("Choice main sidebar navigation", () => {
  it("round trips option and rule identifiers without query collisions", () => {
    const key = menuKey({ view: "options", set: "12", query: { question: "Q & 1", option: "0" } });
    expect(key).toBe(menuKey({ view: "options", set: "12", query: { option: "0", question: "Q & 1" } }));
    const target = new URL(menuTarget(key)!, "http://localhost");
    expect(target.pathname).toBe("/choice/options");
    expect(Object.fromEntries(target.searchParams)).toEqual({ set: "12", question: "Q & 1", option: "0" });
    const rule = new URL(menuTarget(menuKey({ view: "rules", set: "12", query: { item: "type/A+B" } }))!, "http://localhost");
    expect(rule.searchParams.get("item")).toBe("type/A+B");
    expect(menuTarget("/system/user")).toBeUndefined();
    expect(menuTarget("choice-content:https://example.com")).toBeUndefined();
  });
  it("distinguishes set details and all-content browsing on their shared route", () => {
    expect(menuTarget(menuKey({ view: "overview", set: "12" }))).toBe("/choice/sets?section=details&set=12");
    expect(menuTarget(menuKey({ view: "browse" }))).toBe("/choice/sets?all=1");
    expect(menuTarget(menuKey({ view: "library" }))).toBe("/choice/sets");
  });
  it("restores ancestors from deep links before asynchronous menu data arrives", () => {
    expect(menuOpenKeys({ path: "/choice/options", query: { set: "12", question: "Q1", option: "b" } })).toEqual([
      "choice-content-root",
      "choice-branch:set:12",
      "choice-branch:set:12:question:Q1"
    ]);
    expect(menuOpenKeys({ path: "/choice/rules", query: { set: "12", item: "type/a" } })).toEqual([
      "choice-content-root",
      "choice-branch:set:12",
      "choice-branch:set:12:rules"
    ]);
    expect(menuOpenKeys({ path: "/choice/sets", query: { all: "1" } })).toEqual(["choice-content-root"]);
  });
});
