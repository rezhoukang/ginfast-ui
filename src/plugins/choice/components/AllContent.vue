<script setup lang="ts">
import { computed } from "vue";
import { useChoice } from "../workspace/context";
import type { BrowseKind } from "../api/choice";
const { route, navigate } = useChoice();
const selected = computed(() => (route.query.all === "1" ? String(route.query.kind || "questions") : "sets"));
const types: { key: "sets" | BrowseKind; title: string }[] = [
  { key: "sets", title: "全部题集" },
  { key: "questions", title: "全部题目" },
  { key: "options", title: "全部选项" },
  { key: "dimensions", title: "全部维度" },
  { key: "rules", title: "全部规则" }
];
function change(value: string | number | boolean) {
  return value === "sets" ? navigate("library") : navigate("browse", { kind: String(value) });
}
</script>
<template>
  <a-radio-group type="button" :model-value="selected" @change="change">
    <a-radio v-for="item in types" :key="item.key" :value="item.key">{{ item.title }}</a-radio>
  </a-radio-group>
</template>
