<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getAttempt, type Attempt } from "../api/choice";
import { describeError } from "../utils/errors";
import { useChoice } from "../hooks/useChoice";
import ResultSummary from "../components/ResultSummary.vue";
const { route } = useChoice();
const id = ref<number>();
const result = ref<Attempt>();
const busy = ref(false);
const error = ref("");
async function find() {
  if (!id.value || !Number.isSafeInteger(id.value) || id.value < 1) return;
  busy.value = true;
  error.value = "";
  result.value = undefined;
  try {
    result.value = await getAttempt(id.value);
  } catch (e) {
    error.value = describeError(e);
  } finally {
    busy.value = false;
  }
}
onMounted(() => {
  const value = Number(route.query.attempt);
  if (Number.isSafeInteger(value) && value > 0) {
    id.value = value;
    find();
  }
});
</script>
<template>
  <a-space direction="vertical" fill :size="16">
    <a-form :model="{ id }" layout="inline" @submit="find"
      ><a-form-item label="答卷编号"
        ><a-input-number v-model="id" :min="1" :precision="0" placeholder="输入答卷编号" /></a-form-item
      ><a-form-item><a-button html-type="submit" type="primary" :loading="busy">查询答卷</a-button></a-form-item></a-form
    >
    <a-alert v-if="error" type="error">{{ error }}</a-alert>
    <template v-if="result"
      ><a-descriptions :column="2"
        ><a-descriptions-item label="题集">{{ result.setId }}</a-descriptions-item
        ><a-descriptions-item label="版本">{{ result.versionId }}</a-descriptions-item></a-descriptions
      ><ResultSummary :result="result.result" :attempt-id="result.id"
    /></template>
    <a-empty v-else-if="!busy" description="输入答卷编号，查询自己的测评结果" />
  </a-space>
</template>
