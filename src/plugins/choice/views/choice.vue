<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import { provideChoice } from "../workspace/context";
const { state, issues, fixIssue, view, save, navigate } = provideChoice();
const views = {
  library: defineAsyncComponent(() => import("./LibraryView.vue")),
  overview: defineAsyncComponent(() => import("./LibraryView.vue")),
  questions: defineAsyncComponent(() => import("./QuestionsView.vue")),
  options: defineAsyncComponent(() => import("./OptionsView.vue")),
  dimensions: defineAsyncComponent(() => import("./DimensionsView.vue")),
  rules: defineAsyncComponent(() => import("./RulesView.vue")),
  preview: defineAsyncComponent(() => import("./PreviewView.vue")),
  history: defineAsyncComponent(() => import("./HistoryView.vue")),
  take: defineAsyncComponent(() => import("./TakeView.vue"))
};
const editing = computed(() => !["library", "overview", "history", "take"].includes(view.value));
</script>
<template>
  <div class="snow-page">
    <div class="snow-inner">
      <a-spin :loading="state.busy" style="width: 100%">
        <a-space direction="vertical" fill :size="16">
          <a-alert v-if="editing && state.showIssues && issues.length" type="warning">
            <template #title>还有 {{ issues.length }} 项待完善，点击直接处理</template>
            <a-space direction="vertical" fill>
              <a-link v-for="(issue, i) in issues" :key="i" @click="fixIssue(issue)">{{ issue.message }}</a-link>
            </a-space>
          </a-alert>
          <a-alert v-if="state.error" type="error" :closable="!state.saveFailed" @close="state.error = ''">
            {{ state.error }}
            <a-button v-if="state.saveFailed" size="small" :loading="state.busy" @click="save">重试保存</a-button>
          </a-alert>
          <component :is="views[view]" v-if="!editing || state.draft" :key="view + state.loadedKey" />
          <a-button v-else-if="!state.busy" type="primary" @click="navigate('library')">前往题集管理</a-button>
        </a-space>
      </a-spin>
    </div>
  </div>
</template>

<style>
/* GinFast's theme makes header cells flex containers, including teleported dialogs. */
.choice-table-header > .arco-table-cell {
  justify-content: center;
}
</style>
