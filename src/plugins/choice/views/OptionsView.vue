<script setup lang="ts">
import WorkspaceActions from "../components/WorkspaceActions.vue";
import { computed, ref } from "vue";
import { useChoice } from "../hooks/useChoice";
import { queryText } from "../utils/navigation";
import OptionEditor from "../components/OptionEditor.vue";
const { state, route, openOptions, navigate } = useChoice();
const editingOption = ref(false);
const selected = computed(() => {
  const code = queryText(route.query.question);
  return state.draft?.questions.some(q => q.code === code) ? code : state.draft?.questions[0]?.code || "";
});
const questionIndex = computed(() => state.draft?.questions.findIndex(q => q.code === selected.value) ?? -1);
</script>
<template>
  <a-space v-if="state.draft" direction="vertical" fill :size="16">
    <OptionEditor
      v-if="questionIndex >= 0"
      :key="selected + String(route.query.option || '')"
      v-model="state.draft.questions[questionIndex]"
      :dimensions="state.draft.dimensions"
      :focus-request="state.focusRequest"
      :focus-code="queryText(route.query.option)"
      @editing="editingOption = $event"
      >
      <template #navigation>
        <a-space wrap align="center" style="display: flex">
          <a-button
            :disabled="editingOption || questionIndex === 0"
            @click="openOptions(state.draft.questions[questionIndex - 1].code)"
            >上一题</a-button
          >
          <span>{{ questionIndex + 1 }} / {{ state.draft.questions.length }}</span>
          <a-button
            :disabled="editingOption || questionIndex === state.draft.questions.length - 1"
            @click="openOptions(state.draft.questions[questionIndex + 1].code)"
            >下一题</a-button
          >
          <a-typography-text v-if="editingOption" type="secondary">确认或取消当前选项后可切换题目。</a-typography-text>
        </a-space>
      </template>
      <template #actions><WorkspaceActions /></template
    ></OptionEditor>
    <template v-else>
      <s-layout-tools
        ><template #right><WorkspaceActions /></template
      ></s-layout-tools>
      <a-empty description="还没有题目"><a-button type="primary" @click="navigate('questions')">去添加题目</a-button></a-empty>
    </template>
  </a-space>
</template>
