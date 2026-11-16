<script setup lang="ts">
import { useChoice } from "../workspace/context";
const { state, dirty, navigate, save } = useChoice();
</script>
<template>
  <a-space v-if="state.draft" wrap>
    <a-tag>{{ state.draft.name }}</a-tag>
    <a-tag :color="dirty ? 'orange' : 'green'">{{ dirty ? "有未保存修改" : "已保存" }}</a-tag>
    <a-button @click="navigate('library')">切换题集</a-button>
    <a-button type="primary" :loading="state.busy" :disabled="!dirty || state.editorOpen" @click="save">保存草稿</a-button>
  </a-space>
</template>
