<script setup lang="ts">
import { computed, ref, watch } from "vue";
import ResultSummary from "./ResultSummary.vue";
import { Message } from "@arco-design/web-vue";
import { preview, submit, type Detail, type Result } from "../api/choice";
const props = defineProps<{ detail: Detail; formal: boolean }>();
const picks = ref<Record<number, number[]>>({});
const result = ref<Result>();
const attemptID = ref<number>();
const busy = ref(false);
const error = ref("");
const checked = ref(false);
const answered = computed(() => Object.values(picks.value).filter(ids => ids.length).length);
function reset() {
  picks.value = {};
  result.value = undefined;
  attemptID.value = undefined;
  error.value = "";
  checked.value = false;
  requestKey = "";
  lastInput = "";
}
let requestKey = "";
let lastInput = "";
watch(
  () => props.detail.version.id,
  () => {
    picks.value = {};
    result.value = undefined;
    attemptID.value = undefined;
    requestKey = "";
    lastInput = "";
    error.value = "";
  }
);
function select(questionId: number, optionId: number, multiple: boolean, checked: boolean) {
  const current = picks.value[questionId] || [];
  picks.value[questionId] = multiple ? (checked ? [...current, optionId] : current.filter(id => id !== optionId)) : [optionId];
  result.value = undefined;
  attemptID.value = undefined;
  error.value = "";
}
async function calculate() {
  checked.value = true;
  const missing = props.detail.version.definition.questions.find(q => q.required && !picks.value[q.id!]?.length);
  if (missing) {
    error.value = `请回答：${missing.title}`;
    return;
  }
  const answers = Object.entries(picks.value)
    .filter(([, ids]) => ids.length)
    .map(([id, optionIds]) => ({ questionId: Number(id), optionIds }));
  const serialized = JSON.stringify(answers);
  if (!requestKey || serialized !== lastInput) {
    requestKey = crypto.randomUUID();
    lastInput = serialized;
  }
  busy.value = true;
  error.value = "";
  try {
    if (props.formal) {
      const attempt = await submit(props.detail.set.id, props.detail.version.id, requestKey, answers);
      result.value = attempt.result;
      attemptID.value = attempt.id;
      Message.success("测评已保存");
    } else result.value = await preview(props.detail.set.id, props.detail.version.id, answers);
  } catch (e) {
    error.value = e instanceof Error ? e.message : "计算失败，请检查网络后重试";
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <a-space direction="vertical" fill :size="16">
    <a-alert :type="formal ? 'success' : 'info'"
      >{{ formal ? "正式作答：提交后保存结果" : "草稿试算：不保存答卷" }} · 版本 {{ detail.version.id }}</a-alert
    >
    <a-typography-title :heading="5">{{ detail.version.definition.name }}</a-typography-title>
    <a-typography-paragraph>{{ detail.version.definition.description }}</a-typography-paragraph>
    <a-space wrap
      ><a-tag>已答 {{ answered }} / {{ detail.version.definition.questions.length }} 题</a-tag
      ><a-popconfirm content="清空本次选择，重新作答？已提交的历史答卷不会删除。" @ok="reset"
        ><a-button :disabled="busy || !answered">重新作答</a-button></a-popconfirm
      ></a-space
    >
    <a-form :model="picks" layout="vertical" :disabled="busy">
      <a-form-item
        v-for="(q, qi) in detail.version.definition.questions"
        :key="q.id"
        :label="`${qi + 1}. ${q.title}`"
        :required="q.required"
        :validate-status="checked && q.required && !picks[q.id!]?.length ? 'error' : undefined"
        :help="checked && q.required && !picks[q.id!]?.length ? '此题为必答题' : q.kind === 'multiple' ? '可多选' : '请选择一项'"
      >
        <a-space direction="vertical">
          <template v-for="o in q.options" :key="o.id"
            ><a-checkbox
              v-if="q.kind === 'multiple'"
              :model-value="picks[q.id!]?.includes(o.id!) || false"
              @change="select(q.id!, o.id!, true, Boolean($event))"
              >{{ o.code }}. {{ o.text }}</a-checkbox
            ><a-radio v-else :model-value="picks[q.id!]?.[0]" :value="o.id" @change="select(q.id!, o.id!, false, true)"
              >{{ o.code }}. {{ o.text }}</a-radio
            ></template
          >
        </a-space>
        <template #extra
          ><a-button
            v-if="!q.required && picks[q.id!]?.length"
            type="text"
            size="small"
            @click="
              picks[q.id!] = [];
              result = undefined;
              attemptID = undefined;
            "
            >清除本题选择</a-button
          ></template
        >
      </a-form-item>
    </a-form>
    <a-alert v-if="error" type="error">{{ error }}</a-alert
    ><a-button type="primary" :loading="busy" @click="calculate">{{ formal ? "提交并查看结果" : "计算预览结果" }}</a-button>
    <ResultSummary v-if="result" :result="result" :attempt-id="attemptID" :dimensions="detail.version.definition.dimensions" />
  </a-space>
</template>
