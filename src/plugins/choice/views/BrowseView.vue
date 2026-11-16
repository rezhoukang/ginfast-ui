<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { browseItems, type BrowseItem, type BrowseKind } from "../api/choice";
import { describeError, useChoice } from "../workspace/context";
import AllContent from "../components/AllContent.vue";
const { route, openContent } = useChoice();
const kind = computed<BrowseKind>(() =>
  ["questions", "options", "dimensions", "rules"].includes(String(route.query.kind))
    ? (route.query.kind as BrowseKind)
    : "questions"
);
const page = ref(1),
  total = ref(0),
  busy = ref(false),
  error = ref("");
const items = ref<BrowseItem[]>([]);
let request = 0;
async function load() {
  const sequence = ++request;
  busy.value = true;
  error.value = "";
  try {
    const data = await browseItems(kind.value, page.value);
    if (sequence === request) {
      items.value = data.list;
      total.value = data.total;
    }
  } catch (e) {
    if (sequence === request) {
      error.value = describeError(e);
      items.value = [];
    }
  } finally {
    if (sequence === request) busy.value = false;
  }
}
watch(
  kind,
  () => {
    page.value = 1;
    void load();
  },
  { immediate: true }
);
function open(item: BrowseItem) {
  if (kind.value === "questions") return openContent(item.setId, "options", { question: item.code });
  if (kind.value === "options") return openContent(item.setId, "options", { question: item.questionCode, option: item.code });
  return openContent(item.setId, kind.value, { item: kind.value === "rules" ? `${item.group}/${item.code}` : item.code });
}
</script>
<template>
  <a-space direction="vertical" fill :size="16">
    <AllContent />
    <a-space
      ><a-typography-text type="secondary">当前可访问题集的最新已保存草稿，共 {{ total }} 项。</a-typography-text
      ><a-button :loading="busy" @click="load">刷新</a-button></a-space
    >
    <a-alert v-if="error" type="error">{{ error }}</a-alert>
    <a-table
      :data="items"
      :loading="busy"
      :pagination="{ current: page, total, pageSize: 20 }"
      :bordered="{ cell: true }"
      @page-change="
        page = $event;
        load();
      "
    >
      <template #columns>
        <a-table-column title="所属题集" header-cell-class="choice-table-header"
          ><template #cell="{ record }"
            ><a-link @click="openContent(record.setId, 'questions')">{{ record.setName }}</a-link></template
          ></a-table-column
        >
        <a-table-column v-if="kind === 'options'" title="所属题目" header-cell-class="choice-table-header"
          ><template #cell="{ record }">{{ record.questionCode }} · {{ record.questionTitle }}</template></a-table-column
        >
        <a-table-column title="编号" data-index="code" :width="100" header-cell-class="choice-table-header" />
        <a-table-column title="内容 / 名称" data-index="title" header-cell-class="choice-table-header" />
        <a-table-column title="操作" :width="100" header-cell-class="choice-table-header"
          ><template #cell="{ record }"><a-button size="small" @click="open(record)">打开</a-button></template></a-table-column
        >
      </template>
    </a-table>
  </a-space>
</template>
