import { describe, expect, it } from "vitest";
import { effectText, normalizeEffect, validEffect } from "./effects";

describe("variable operations", () => {
  it("loads old signed increments as explicit operations without changing their meaning", () => {
    expect(normalizeEffect({ dimension: "a", delta: -3 })).toEqual({ dimension: "a", operation: "subtract", value: 3 });
    expect(effectText({ dimension: "b", delta: 0 })).toBe("增加 0");
    expect(effectText({ dimension: "a", operation: "set", value: 0 })).toBe("设为 0");
    expect(validEffect({ dimension: "a", operation: "set", value: -5 })).toBe(true);
  });
  it("rejects missing values, mixed formats and negative increments", () => {
    expect(validEffect({ dimension: "a", operation: "set" })).toBe(false);
    expect(validEffect({ dimension: "a", operation: "add", value: -1 })).toBe(false);
    expect(validEffect({ dimension: "a", operation: "set", value: 2, delta: 1 })).toBe(false);
    expect(validEffect({ dimension: "a", operation: "set", value: Infinity })).toBe(false);
  });
});
