<script setup lang="ts">
import { computed, onMounted, watch } from "vue";
import type { TreeNodeData } from "@arco-design/web-vue/es/tree/interface";
import { useChoice } from "../workspace/context";
import { selectedTreeKey, setNode, type ContentNode } from "../workspace/tree";
const { state, view, route, navigate, openContent, loadCatalog, loadTreeSet } = useChoice();
const nodes = computed<ContentNode[]>(() => {
  const items = state.catalog.map(s =>
    setNode(s, String(s.id) === state.loadedKey && state.draft ? state.draft : state.details[s.id]?.version.definition)
  );
  if (state.loadedKey === "new" && state.draft) items.unshift(setNode({ id: "new", name: state.draft.name }, state.draft));
  return [{ key: "all", title: "查看全部", view: "library", isLeaf: true }, ...items];
});
const selected = computed(() => selectedTreeKey(view.value, state.loadedKey, route.query));
watch(
  selected,
  () => {
    if (!state.loadedKey || ["library", "browse"].includes(view.value)) return;
    const root = `set:${state.loadedKey}`;
    const ancestors = [root];
    if (view.value === "options") ancestors.push(`${root}:questions`, `${root}:question:${String(route.query.question || "")}`);
    else if (["questions", "dimensions", "rules"].includes(view.value)) ancestors.push(`${root}:${view.value}`);
    state.expandedKeys = [...new Set([...state.expandedKeys, ...ancestors])];
  },
  { immediate: true }
);
onMounted(() => {
  if (!state.catalogPage) void loadCatalog(true);
});
async function load(node: TreeNodeData) {
  const item = node as ContentNode;
  if (item.set && item.set !== "new" && item.key === `set:${item.set}`) await loadTreeSet(Number(item.set));
}
function select(_keys: (string | number)[], event: { node?: TreeNodeData }) {
  const node = event.node as ContentNode | undefined;
  if (!node) return;
  if (node.key === "all") void navigate("library");
  else if (node.set) void openContent(node.set, node.view, node.query);
}
</script>
<template>
  <a-space direction="vertical" fill :size="12">
    <a-space
      ><a-typography-text bold>内容目录</a-typography-text
      ><a-button size="mini" :loading="state.catalogBusy" @click="loadCatalog(true)">刷新</a-button></a-space
    >
    <a-alert v-if="state.catalogError" type="error"
      >{{ state.catalogError
      }}<template #action><a-button size="mini" @click="loadCatalog(true)">重试</a-button></template></a-alert
    >
    <a-tree
      :data="nodes"
      show-line
      block-node
      :selected-keys="[selected]"
      v-model:expanded-keys="state.expandedKeys"
      :load-more="load"
      @select="select"
    />
    <a-button v-if="state.catalogPage * 20 < state.catalogTotal" :loading="state.catalogBusy" long @click="loadCatalog()"
      >加载更多题集</a-button
    >
  </a-space>
</template>
