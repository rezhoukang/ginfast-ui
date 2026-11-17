<script setup lang="ts">
import { useChoice } from "../workspace/context";
const { state } = useChoice();
</script>
<template>
  <a-space v-if="state.draft" wrap>
    <a-tag>当前题集：{{ state.draft.name }}</a-tag>
  </a-space>
</template>
