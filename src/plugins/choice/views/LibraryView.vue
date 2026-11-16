<script setup lang="ts">
import AllContent from "../components/AllContent.vue";
import { onMounted, ref } from "vue";
import { listSets, type ChoiceSet } from "../api/choice";
import { describeError, useChoice } from "../workspace/context";
const { openSet, create } = useChoice();
const sets = ref<ChoiceSet[]>([]);
const page = ref(1);
const total = ref(0);
const busy = ref(false);
const error = ref("");
async function load() {
  busy.value = true;
  error.value = "";
  try {
    const data = await listSets(page.value);
    sets.value = data.list || [];
    total.value = data.total;
  } catch (e) {
    error.value = describeError(e);
  } finally {
    busy.value = false;
  }
}
onMounted(load);
</script>
<template>
  <a-space direction="vertical" fill :size="16">
    <AllContent />
    <a-space wrap
      ><a-button type="primary" @click="create()"
        ><template #icon><icon-plus /></template>新建题集</a-button
      ><a-button :loading="busy" @click="load">刷新</a-button></a-space
    >
    <a-alert v-if="error" type="error">{{ error }}</a-alert>
    <a-table
      :data="sets"
      :loading="busy"
      :pagination="{ current: page, total, pageSize: 20 }"
      :bordered="{ wrapper: true, cell: true }"
      @page-change="
        page = $event;
        load();
      "
    >
      <template #columns
        ><a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="ID"
          data-index="id"
          :width="80"
        /><a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="题集名称"
          data-index="name"
        /><a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="草稿版本"
          data-index="currentVersionId"
        />
        <a-table-column header-cell-class="choice-table-header" :header-cell-style="{ textAlign: 'center' }" title="发布状态"
          ><template #cell="{ record }"
            ><a-tag :color="record.publishedVersionId ? 'green' : 'gray'">{{
              record.publishedVersionId ? "已发布 · " + record.publishedVersionId : "未发布"
            }}</a-tag
            ><a-tag v-if="record.publishedVersionId && record.publishedVersionId !== record.currentVersionId" color="orange"
              >有更新未发布</a-tag
            ></template
          ></a-table-column
        >
        <a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="操作"
          :width="260"
          ><template #cell="{ record }"
            ><a-space
              ><a-button size="small" @click="openSet(record.id, 'overview')">编辑题集</a-button
              ><a-button size="small" type="primary" @click="openSet(record.id, 'questions')">管理题目</a-button
              ><a-button size="small" @click="openSet(record.id, 'preview')">预览</a-button></a-space
            ></template
          ></a-table-column
        >
      </template>
    </a-table>
  </a-space>
</template>
