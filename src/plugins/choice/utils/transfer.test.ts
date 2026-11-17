import { describe, expect, it } from "vitest";
import { blankDefinition } from "./definition";
import { parseSetFile, serializeSets, transferLimit } from "./transfer";

describe("Choice set transfer", () => {
  it("round trips a selected collection with complete configuration and no database row IDs", () => {
    const first = blankDefinition();
    first.name = "题集一";
    first.questions = [
      {
        id: 77,
        code: "Q1",
        title: "选择",
        kind: "single",
        required: true,
        options: [{ id: 88, code: "a", text: "选项", effects: [{ dimension: "score", operation: "set", value: 0 }] }]
      }
    ];
    first.rules = [
      {
        group: "result",
        code: "R1",
        name: "结论",
        description: "说明",
        mode: "all",
        conditions: [{ dimension: "score", operator: ">=", value: 0 }]
      }
    ];
    const second = blankDefinition();
    second.name = "题集二";
    const output = parseSetFile(serializeSets([first, second]));
    expect(output.map(d => d.name)).toEqual(["题集一", "题集二"]);
    expect(output[0].questions[0].id).toBeUndefined();
    expect(output[0].questions[0].options[0].id).toBeUndefined();
    expect(output[0].questions[0].options[0].effects).toEqual(first.questions[0].options[0].effects);
    expect(output[0].rules).toEqual(first.rules);
    expect(first.questions[0].id).toBe(77);
  });

  it("accepts older single-set files and converts retired grading metadata", () => {
    const d = blankDefinition();
    const input = {
      ...d,
      questions: [
        {
          code: "Q1",
          title: "判断",
          kind: "boolean",
          required: true,
          options: [{ code: "1", text: "正确", correct: true, value: 1, effects: [] }]
        }
      ]
    };
    const output = parseSetFile("\uFEFF" + JSON.stringify(input));
    expect(output[0].questions[0].kind).toBe("single");
    expect(output[0].questions[0].options[0]).not.toHaveProperty("correct");
    expect(output[0].questions[0].options[0]).not.toHaveProperty("value");
  });

  it("rejects invalid collections before starting imports", () => {
    for (const input of [
      null,
      {},
      { ...blankDefinition(), questions: [null] },
      { format: "choice-sets", version: 2, sets: [blankDefinition()] },
      { format: "choice-sets", version: 1, sets: [] },
      { format: "choice-sets", version: 1, sets: [blankDefinition(), {}] }
    ]) {
      expect(() => parseSetFile(JSON.stringify(input))).toThrow();
    }
    expect(() => serializeSets([])).toThrow();
    expect(() => serializeSets(Array.from({ length: transferLimit + 1 }, blankDefinition))).toThrow();
  });
});
