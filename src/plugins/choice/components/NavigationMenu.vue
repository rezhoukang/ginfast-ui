<script setup lang="ts">
import { computed, watch } from "vue";
import { useChoiceNavigation } from "../workspace/context";
import { setNode, type ContentNode } from "../workspace/tree";
import { menuKey } from "../workspace/menu";
import NavigationNode from "./NavigationNode.vue";
import { useUserStore } from "@/store/modules/user";
const { state, openContent, loadCatalog, reset } = useChoiceNavigation();
const user = useUserStore();
watch(
  () => `${user.account.id}:${user.account.tenantID}`,
  scope => {
    if (state.scope !== scope) reset(scope);
  },
  { immediate: true, flush: "sync" }
);
const nodes = computed(() => {
  const items = state.catalog.map(s =>
    setNode(s, String(s.id) === state.loadedKey && state.draft ? state.draft : state.details[s.id]?.version.definition)
  );
  if (state.loadedKey === "new" && state.draft) items.unshift(setNode({ id: "new", name: state.draft.name }, state.draft));
  return items.map(node => ({
    ...node,
    children: node.children?.flatMap(child => (child.key.endsWith(":questions") ? child.children || [] : [child]))
  }));
});
watch(
  () => [state.catalogPage, state.scope],
  () => {
    if (!state.catalogPage && user.account.id) void loadCatalog(true);
  },
  { immediate: true }
);
function open(node: ContentNode) {
  if (node.set) void openContent(node.set, node.view, node.query);
}
</script>
<template>
  <a-sub-menu key="choice-content-root">
    <template #title>题集管理</template>
    <a-menu-item :key="menuKey({ view: 'library' })">查看全部</a-menu-item>
    <NavigationNode v-for="node in nodes" :key="node.key" :node="node" @open="open" />
    <div v-if="state.catalogError" role="alert">
      <a-typography-text type="danger">{{ state.catalogError }}</a-typography-text>
    </div>
    <a-space wrap style="padding: 8px 12px" @click.stop>
      <a-button size="mini" :loading="state.catalogBusy" @click="loadCatalog(true)">刷新题集</a-button>
      <a-button v-if="state.catalogPage * 20 < state.catalogTotal" size="mini" :loading="state.catalogBusy" @click="loadCatalog()"
        >加载更多</a-button
      >
    </a-space>
  </a-sub-menu>
</template>
