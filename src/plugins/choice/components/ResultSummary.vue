<script setup lang="ts">
import type { Variable, Result } from "../api/choice";
const props = defineProps<{ result: Result; attemptId?: number; dimensions?: Variable[] }>();
const label = (code: string) => props.dimensions?.find(d => d.code === code)?.name || code;
</script>
<template>
  <a-space direction="vertical" fill :size="16" aria-live="polite">
    <a-divider>测评结果：{{ result.code || "多维测评报告" }}</a-divider>
    <a-descriptions :column="2" bordered
      ><a-descriptions-item v-if="attemptId" label="答卷编号">{{ attemptId }}</a-descriptions-item
      ><a-descriptions-item v-if="result.gradedQuestions" label="正确题数"
        >{{ result.correctQuestions }} / {{ result.gradedQuestions }}</a-descriptions-item
      ></a-descriptions
    >
    <a-table v-if="result.matches.length" :data="result.matches" :pagination="false" :bordered="{ cell: true }"
      ><template #columns
        ><a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="分组"
          data-index="group" /><a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="结果"
          data-index="code" /><a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="名称"
          data-index="name" /><a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="解释"
          data-index="description" /></template
    ></a-table>
    <a-descriptions title="基础变量" :column="4" bordered
      ><a-descriptions-item v-for="(value, code) in result.dimensions" :key="code" :label="label(String(code))">{{
        Number(value.toFixed(4))
      }}</a-descriptions-item></a-descriptions
    >
    <a-descriptions v-if="Object.keys(result.derived).length" title="综合指标" :column="4" bordered
      ><a-descriptions-item v-for="(value, code) in result.derived" :key="code" :label="label(String(code))">{{
        Number(value.toFixed(4))
      }}</a-descriptions-item></a-descriptions
    >
  </a-space>
</template>
