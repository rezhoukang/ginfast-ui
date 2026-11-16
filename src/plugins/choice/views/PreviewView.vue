<script setup lang="ts">
import WorkspaceActions from "../components/WorkspaceActions.vue";
import { computed } from "vue";
import { useChoice } from "../workspace/context";
import AssessmentRunner from "../components/AssessmentRunner.vue";
const { state, dirty, issues, fixIssue, route, publish, navigate, startPreview } = useChoice();
const testing = computed(() => route.query.test === "1" && !dirty.value);
const published = computed(() => !!state.current && state.current.set.publishedVersionId === state.current.version.id);
</script>
<template>
  <a-space direction="vertical" fill :size="16">
    <a-alert v-if="issues.length && !state.showIssues" type="warning" title="完善以下内容后即可试算">
      <a-space direction="vertical" fill
        ><a-link v-for="(issue, i) in issues" :key="i" @click="fixIssue(issue)">{{ issue.message }}</a-link></a-space
      >
    </a-alert>
    <a-alert v-else-if="!issues.length" :type="published && !dirty ? 'success' : 'info'">
      {{
        published && !dirty
          ? "当前版本已发布，可以打开正式测评。"
          : dirty
            ? "内容已具备试算条件，开始试算时会一并保存草稿。"
            : "草稿已保存，可以先试答检查结果，再发布。"
      }}
    </a-alert>
    <s-layout-tools>
      <template #left
        ><a-space wrap>
          <a-button type="primary" :loading="state.busy" :disabled="!!issues.length || testing" @click="startPreview">{{
            dirty ? "保存并试算" : testing ? "正在试算" : "开始试算"
          }}</a-button>
          <a-popconfirm content="发布后将使用当前已保存的题目和计分规则供正式作答，确认发布？" @ok="publish">
            <a-button :disabled="!state.current || dirty || published || state.busy">{{
              published && !dirty ? "当前版本已发布" : "发布当前版本"
            }}</a-button>
          </a-popconfirm>
          <a-button :disabled="!state.current?.set.publishedVersionId" @click="navigate('take')">打开正式测评</a-button>
        </a-space></template
      >
      <template #right><WorkspaceActions /></template>
    </s-layout-tools>
    <a-typography-text v-if="dirty && state.current?.set.publishedVersionId" type="secondary"
      >正式测评仍使用上一次发布的内容；本次修改需要保存后重新发布。</a-typography-text
    >
    <AssessmentRunner v-if="testing && state.current" :key="state.current.version.id" :detail="state.current" :formal="false" />
  </a-space>
</template>
