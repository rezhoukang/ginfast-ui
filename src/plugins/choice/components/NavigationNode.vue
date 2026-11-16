<script setup lang="ts">
import type { ContentNode } from "../workspace/tree";
import { menuKey } from "../workspace/menu";
defineProps<{ node: ContentNode }>();
const emit = defineEmits<{ open: [node: ContentNode] }>();
</script>
<template>
  <a-sub-menu v-if="!node.isLeaf" :key="'choice-branch:' + node.key">
    <template #title
      ><span :title="node.title" @click="emit('open', node)">{{ node.title }}</span></template
    >
    <a-menu-item :key="menuKey(node)">{{
      node.view === "options" ? "查看本题选项" : node.view === "questions" ? "查看所属题目" : "查看全部"
    }}</a-menu-item>
    <NavigationNode v-for="child in node.children || []" :key="child.key" :node="child" @open="emit('open', $event)" />
  </a-sub-menu>
  <a-menu-item v-else :key="menuKey(node)"
    ><span :title="node.title">{{ node.title }}</span></a-menu-item
  >
</template>
