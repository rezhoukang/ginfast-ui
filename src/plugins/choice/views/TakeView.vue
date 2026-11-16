<script setup lang="ts">
import { watch, ref } from "vue";
import { playSet, type Detail } from "../api/choice";
import { useChoice, describeError } from "../workspace/context";
import AssessmentRunner from "../components/AssessmentRunner.vue";
const { state, route, navigate } = useChoice();
const detail = ref<Detail>();
const error = ref("");
watch(
  () => route.query.set || state.current?.set.id,
  async id => {
    try {
      if (id && Number.isSafeInteger(Number(id))) detail.value = await playSet(Number(id));
    } catch (e) {
      error.value = describeError(e);
    }
  },
  { immediate: true }
);
</script>
<template>
  <a-space direction="vertical" fill :size="16"
    ><a-button @click="navigate('preview')">返回预览与发布</a-button><a-alert v-if="error" type="error">{{ error }}</a-alert
    ><AssessmentRunner v-if="detail" :detail="detail" :formal="true" /><a-empty
      v-else-if="!state.current"
      description="请先选择已发布的题集"
  /></a-space>
</template>
