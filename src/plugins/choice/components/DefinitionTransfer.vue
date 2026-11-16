<script setup lang="ts">
import { validEffect } from "../workspace/effects";
import { ref } from "vue";
import type { Definition } from "../api/choice";
import { useChoice, describeError } from "../workspace/context";
const { state } = useChoice();
const jsonVisible = ref(false);
const jsonText = ref("");
const jsonError = ref("");
function openJSON() {
  jsonText.value = JSON.stringify(state.draft, null, 2);
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
    state.draft = d;
    jsonVisible.value = false;
  } catch (e) {
    jsonError.value = describeError(e);
  }
}
function download() {
  const url = URL.createObjectURL(new Blob([JSON.stringify(state.draft, null, 2)], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `choice-${state.current?.set.id || "draft"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>
<template>
  <a-button @click="openJSON">JSON 导入 / 编辑</a-button><a-button @click="download">导出题集</a-button>
  <a-modal v-model:visible="jsonVisible" title="题集 JSON 编辑" width="min(960px,94vw)" :footer="false" :mask-closable="true"
    ><a-space direction="vertical" fill :size="16"
      ><a-alert>确认后自动保存，其他视图同步更新。</a-alert
      ><a-textarea v-model="jsonText" :auto-size="{ minRows: 16, maxRows: 24 }" aria-label="题集 JSON" /><a-alert
        v-if="jsonError"
        type="error"
        >{{ jsonError }}</a-alert
      ><a-button type="primary" @click="applyJSON">确认</a-button></a-space
    ></a-modal
  >
</template>
