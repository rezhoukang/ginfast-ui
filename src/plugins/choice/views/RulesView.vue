<script setup lang="ts">
import WorkspaceActions from "../components/WorkspaceActions.vue";
import { useChoice } from "../workspace/context";
import RuleEditor from "../components/RuleEditor.vue";
const { state, route } = useChoice();
</script>
<template>
  <a-space v-if="state.draft" direction="vertical" fill :size="16">
    <a-form :model="state.draft" layout="inline"
      ><a-form-item label="结果连接符"
        ><a-input v-model="state.draft.separator" :max-length="16" placeholder="如 / 或 -；留空则直接连接" /></a-form-item
    ></a-form>
    <a-alert>每组按顺序取首条命中规则，再按分组顺序连接结果。空条件的“全部满足”可作为组内最后一条兜底规则。</a-alert>
    <RuleEditor
      v-model="state.draft.rules"
      :dimensions="state.draft.dimensions"
      :focus-request="state.focusRequest"
      :focus-code="String(route.query.item || '')"
      ><template #actions><WorkspaceActions /></template
    ></RuleEditor>
  </a-space>
</template>
