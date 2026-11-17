import type { Definition } from "../api/choice";
import { validEffect } from "./effects";

export const transferLimit = 50;
export const transferBytes = 16 * 1024 * 1024;

export function parseDefinition(value: unknown): Definition {
  const d = JSON.parse(JSON.stringify(value)) as Definition;
  // Keep malformed imports out of form components. Semantic checks run on save.
  if (
    !d ||
    typeof d.name !== "string" ||
    typeof d.description !== "string" ||
    typeof d.separator !== "string" ||
    !Array.isArray(d.dimensions) ||
    !Array.isArray(d.questions) ||
    !Array.isArray(d.rules) ||
    !d.dimensions.every(
      x =>
        x &&
        typeof x.code === "string" &&
        typeof x.name === "string" &&
        typeof x.initial === "number" &&
        Array.isArray(x.terms) &&
        x.terms.every(t => t && typeof t.dimension === "string" && typeof t.weight === "number")
    ) ||
    !d.questions.every(
      q =>
        q &&
        typeof q.code === "string" &&
        typeof q.title === "string" &&
        ["single", "multiple", "boolean"].includes(q.kind) &&
        typeof q.required === "boolean" &&
        Array.isArray(q.options) &&
        q.options.every(
          o =>
            o &&
            typeof o.code === "string" &&
            typeof o.text === "string" &&
            Array.isArray(o.effects) &&
            o.effects.every(e => e && typeof e.dimension === "string" && validEffect(e))
        )
    ) ||
    !d.rules.every(
      r =>
        r &&
        typeof r.group === "string" &&
        typeof r.code === "string" &&
        typeof r.name === "string" &&
        typeof r.description === "string" &&
        ["all", "any"].includes(r.mode) &&
        Array.isArray(r.conditions) &&
        r.conditions.every(
          c => c && typeof c.dimension === "string" && typeof c.operator === "string" && typeof c.value === "number"
        )
    )
  )
    throw new Error("JSON结构无效，请使用 Choice 导出的题集文件");
  // Import older exports as ordinary choices; scoring comes only from effects.
  for (const q of d.questions) {
    if ((q.kind as string) === "boolean") q.kind = "single";
    for (const o of q.options) {
      delete (o as unknown as Record<string, unknown>).correct;
      delete (o as unknown as Record<string, unknown>).value;
    }
  }

  for (const q of d.questions) {
    delete q.id;
    for (const option of q.options) delete option.id;
  }
  if (new TextEncoder().encode(JSON.stringify(d)).length > 4 * 1024 * 1024 - 1024)
    throw new Error(`题集“${d.name}”超过单题集大小限制`);
  return d;
}

export function parseSetFile(text: string): Definition[] {
  if (new TextEncoder().encode(text).length > transferBytes) throw new Error("文件不能超过16MB");
  const value = JSON.parse(text.replace(/^\uFEFF/, ""));
  let values: unknown[];
  if (value?.format === "choice-sets") {
    if (value.version !== 1 || !Array.isArray(value.sets)) throw new Error("不支持的题集文件版本或结构");
    values = value.sets;
  } else values = [value]; // Accept earlier single-set JSON exports.
  if (!values.length || values.length > transferLimit) throw new Error(`每次导入须为1–${transferLimit}个题集`);
  return values.map(parseDefinition);
}

export function serializeSets(definitions: Definition[]): string {
  if (!definitions.length || definitions.length > transferLimit) throw new Error(`每次导出须选择1–${transferLimit}个题集`);
  const content = JSON.stringify({ format: "choice-sets", version: 1, sets: definitions.map(parseDefinition) }, null, 2);
  if (new TextEncoder().encode(content).length > transferBytes) throw new Error("导出文件超过16MB，请分批选择题集");
  return content;
}
