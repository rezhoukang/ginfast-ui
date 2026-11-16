<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import { provideChoice } from "../workspace/context";
import { viewTitles } from "../workspace/navigation";
const { state, dirty, issues, fixIssue, view, navigate, save } = provideChoice();
const views = {
  library: defineAsyncComponent(() => import("./LibraryView.vue")),
  overview: defineAsyncComponent(() => import("./OverviewView.vue")),
  questions: defineAsyncComponent(() => import("./QuestionsView.vue")),
  options: defineAsyncComponent(() => import("./OptionsView.vue")),
  dimensions: defineAsyncComponent(() => import("./DimensionsView.vue")),
  rules: defineAsyncComponent(() => import("./RulesView.vue")),
  preview: defineAsyncComponent(() => import("./PreviewView.vue")),
  history: defineAsyncComponent(() => import("./HistoryView.vue")),
  take: defineAsyncComponent(() => import("./TakeView.vue"))
};
const editing = computed(() => !["library", "history", "take"].includes(view.value));
</script>
<template>
  <div class="snow-page">
    <div class="snow-inner">
      <a-card :bordered="false" :loading="state.busy">
        <template v-if="editing && state.draft" #extra>
          <a-space wrap
            ><a-tag>{{ state.draft.name }}</a-tag
            ><a-tag :color="dirty ? 'orange' : 'green'">{{ dirty ? "有未保存修改" : "已保存" }}</a-tag>
            <a-button @click="navigate('library')">切换题集</a-button>
            <a-button type="primary" :loading="state.busy" :disabled="!dirty || state.editorOpen" @click="save"
              >保存草稿</a-button
            >
          </a-space>
        </template>
        <a-space direction="vertical" fill :size="16">
          <a-alert v-if="editing && state.showIssues && issues.length" type="warning">
            <template #title>还有 {{ issues.length }} 项待完善，点击直接处理</template>
            <a-space direction="vertical" fill>
              <a-link v-for="(issue, i) in issues" :key="i" @click="fixIssue(issue)">{{ issue.message }}</a-link>
            </a-space>
          </a-alert>
          <a-alert v-if="state.error" type="error" closable @close="state.error = ''">{{ state.error }}</a-alert>
          <component :is="views[view]" v-if="!editing || state.draft" :key="view + state.loadedKey" />
          <template v-else-if="!state.busy"
            ><a-alert>请先选择题集，再配置{{ viewTitles[view] }}。</a-alert><component :is="views.library"
          /></template>
        </a-space>
      </a-card>
    </div>
  </div>
</template>

<style>
/* GinFast's theme makes header cells flex containers, including teleported dialogs. */
.choice-table-header > .arco-table-cell {
  justify-content: center;
}
</style>
