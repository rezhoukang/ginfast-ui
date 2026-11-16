<script setup lang="ts">
import { validEffect } from "../workspace/effects";
import { ref, watch } from "vue";
import type { Definition } from "../api/choice";
import { describeError } from "../workspace/context";
const definition = defineModel<Definition>({ required: true });
const emit = defineEmits<{ dirty: [value: boolean] }>();
const jsonVisible = ref(false);
const jsonText = ref("");
const jsonError = ref("");
function openJSON() {
  jsonText.value = JSON.stringify(definition.value, null, 2);
  jsonError.value = "";
  jsonVisible.value = true;
}
function applyJSON() {
  try {
    const d = JSON.parse(jsonText.value) as Definition;
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
      throw new Error("JSON结构无效，请以导出的题集格式为基础编辑");
    // Import older exports as ordinary choices; scoring comes only from effects.
    for (const q of d.questions) {
      if ((q.kind as string) === "boolean") q.kind = "single";
      for (const o of q.options) {
        delete (o as unknown as Record<string, unknown>).correct;
        delete (o as unknown as Record<string, unknown>).value;
      }
    }
    definition.value = d;
    jsonVisible.value = false;
    return true;
  } catch (e) {
    jsonError.value = describeError(e);
    return false;
  }
}
function download() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(definition.value, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `choice-${definition.value.name || "draft"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
watch([jsonVisible, jsonText], () =>
  emit("dirty", jsonVisible.value && jsonText.value !== JSON.stringify(definition.value, null, 2))
);
defineExpose({ prepare: () => !jsonVisible.value || applyJSON() });
</script>
<template>
  <a-space direction="vertical" fill :size="16">
    <a-space><a-button @click="openJSON">JSON 导入 / 编辑</a-button><a-button @click="download">导出题集</a-button></a-space>
    <template v-if="jsonVisible">
      <a-textarea v-model="jsonText" :auto-size="{ minRows: 12, maxRows: 20 }" aria-label="题集 JSON" />
      <a-alert v-if="jsonError" type="error">{{ jsonError }}</a-alert>
      <a-space
        ><a-button @click="jsonVisible = false">取消 JSON 编辑</a-button
        ><a-button @click="applyJSON">应用 JSON</a-button></a-space
      >
    </template>
  </a-space>
</template>
