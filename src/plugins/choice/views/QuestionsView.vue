<script setup lang="ts">
import WorkspaceActions from "../components/WorkspaceActions.vue";
import { ref } from "vue";
import { useChoice } from "../workspace/context";
import type { Question } from "../api/choice";
import QuestionEditor from "../components/QuestionEditor.vue";
import OptionEditor from "../components/OptionEditor.vue";
const { state } = useChoice();
const visible = ref(false);
const optionEditing = ref(false);
const editing = ref<Question>();
const sourceCode = ref("");
function openOptions(code: string) {
  const question = state.draft?.questions.find(q => q.code === code);
  if (!question) return;
  sourceCode.value = code;
  editing.value = JSON.parse(JSON.stringify(question));
  optionEditing.value = false;
  visible.value = true;
}
function applyOptions() {
  const question = state.draft?.questions.find(q => q.code === sourceCode.value);
  if (!question || !editing.value) return false;
  question.options = JSON.parse(JSON.stringify(editing.value.options));
  return true;
}
</script>
<template>
  <QuestionEditor v-if="state.draft" v-model="state.draft.questions" @options="openOptions"
    ><template #actions><WorkspaceActions /></template
  ></QuestionEditor>
  <a-modal
    v-model:visible="visible"
    title="选项管理"
    width="min(1120px,94vw)"
    :mask-closable="true"
    :on-before-ok="applyOptions"
    ok-text="应用到草稿"
    :footer="!optionEditing"
    unmount-on-close
  >
    <OptionEditor
      v-if="editing && state.draft"
      v-model="editing"
      :dimensions="state.draft.dimensions"
      @editing="optionEditing = $event"
    />
  </a-modal>
</template>
