import type { Effect } from "../api/choice";

export function normalizeEffect(effect: Effect): Effect {
  if (effect.operation) return { ...effect };
  const delta = effect.delta ?? 0;
  return { dimension: effect.dimension, operation: delta < 0 ? "subtract" : "add", value: Math.abs(delta) };
}
export function validEffect(effect: Effect): boolean {
  const finite = (value: unknown): value is number =>
    typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 1e6;
  if (!effect.operation) return effect.value === undefined && finite(effect.delta);
  return (
    ["set", "add", "subtract"].includes(effect.operation) &&
    finite(effect.value) &&
    (effect.delta === undefined || effect.delta === 0) &&
    (effect.operation === "set" || effect.value >= 0)
  );
}
export function effectText(effect: Effect): string {
  const item = normalizeEffect(effect);
  return `${item.operation === "set" ? "设为" : item.operation === "subtract" ? "减少" : "增加"} ${item.value}`;
}
