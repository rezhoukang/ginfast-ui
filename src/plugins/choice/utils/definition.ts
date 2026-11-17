import type { Definition } from "../api/choice";

export function blankDefinition(): Definition {
  return {
    name: "新题集",
    description: "",
    separator: "",
    dimensions: [{ code: "score", name: "得分", initial: 0, terms: [] }],
    questions: [],
    rules: []
  };
}
