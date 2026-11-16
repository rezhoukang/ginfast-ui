<script setup lang="ts">
import { useChoice } from "../workspace/context";
import DefinitionTransfer from "../components/DefinitionTransfer.vue";
const { state, archive, navigate, issues, fixIssue } = useChoice();
</script>
<template>
  <a-space v-if="state.draft" direction="vertical" fill :size="16">
    <a-form :model="state.draft" auto-label-width>
      <a-form-item label="题集名称" required><a-input v-model="state.draft.name" :max-length="120" /></a-form-item>
      <a-form-item label="题集说明"
        ><a-textarea v-model="state.draft.description" :max-length="4000" :auto-size="{ minRows: 3, maxRows: 6 }"
      /></a-form-item>
      <a-form-item label="内容配置">
        <a-space wrap>
          <a-button @click="navigate('dimensions')">维度配置 · {{ state.draft.dimensions.length }}</a-button>
          <a-button type="primary" @click="navigate('questions')">题目管理 · {{ state.draft.questions.length }}</a-button>
          <a-button @click="navigate('rules')">结果规则 · {{ state.draft.rules.length }}</a-button>
          <a-button @click="navigate('preview')">预览与发布</a-button>
        </a-space>
        <template #help>先配置要统计的维度，再添加题目和选项；结果规则可选，不配置时直接输出各维度分数。</template>
      </a-form-item>
      <a-form-item label="发布状态"
        ><a-tag :color="state.current?.set.publishedVersionId ? 'green' : 'gray'">{{
          state.current?.set.publishedVersionId ? "已发布 · 版本 " + state.current.set.publishedVersionId : "未发布"
        }}</a-tag></a-form-item
      >
    </a-form>
    <a-alert v-if="issues.length && !state.showIssues" type="info" title="接下来完善这些内容">
      <a-space direction="vertical" fill
        ><a-link v-for="(issue, i) in issues.slice(0, 5)" :key="i" @click="fixIssue(issue)">{{ issue.message }}</a-link
        ><a-typography-text v-if="issues.length > 5"
          >另外还有 {{ issues.length - 5 }} 项，保存时会列出。</a-typography-text
        ></a-space
      >
    </a-alert>
    <a-collapse :bordered="false"
      ><a-collapse-item header="高级操作" key="advanced"
        ><a-space wrap>
          <DefinitionTransfer />
          <a-popconfirm content="归档后停止新的作答，历史答卷保留。确认归档？" @ok="archive"
            ><a-button status="danger" :disabled="!state.current || state.busy">归档题集</a-button></a-popconfirm
          >
        </a-space></a-collapse-item
      ></a-collapse
    >
  </a-space>
</template>
