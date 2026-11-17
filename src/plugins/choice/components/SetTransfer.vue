<script setup lang="ts">
import { ref } from "vue";
import { Message } from "@arco-design/web-vue";
import { getSet, saveSet, type Definition } from "../api/choice";
import { useChoice } from "../hooks/useChoice";
import { useChoicePagination } from "../hooks/useChoicePagination";
import { choiceModalLayout } from "../config/modal";
import { describeError } from "../utils/errors";
import { parseSetFile, serializeSets, transferBytes, transferLimit } from "../utils/transfer";

const props = defineProps<{ selectedIds: number[]; disabled: boolean }>();
const emit = defineEmits<{ busy: [value: boolean]; imported: [] }>();
const { state, dirty, save } = useChoice();
const fileInput = ref<HTMLInputElement>();
const visible = ref(false);
const exporting = ref(false);
const importing = ref(false);
const fileName = ref("");
const error = ref("");
type ImportRow = { id: number; definition: Definition; status: "pending" | "done" | "failed"; message: string };
const rows = ref<ImportRow[]>([]);
const pages = useChoicePagination(() => rows.value.length, 5);

async function readFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file || props.disabled || exporting.value || importing.value) return;
  error.value = "";
  try {
    if (file.size > transferBytes) throw new Error("文件不能超过16MB");
    const definitions = parseSetFile(await file.text());
    rows.value = definitions.map((definition, id) => ({ id, definition, status: "pending", message: "待导入" }));
    pages.reset();
    fileName.value = file.name;
    visible.value = true;
  } catch (e) {
    Message.error(`读取失败：${describeError(e)}`);
  }
}

async function importSets() {
  if (props.disabled || importing.value) return false;
  importing.value = true;
  emit("busy", true);
  error.value = "";
  let created = 0;
  try {
    for (const row of rows.value) {
      if (row.status === "done") continue;
      try {
        const detail = await saveSet(undefined, 0, row.definition);
        row.status = "done";
        row.message = `已导入 · ID ${detail.set.id}`;
        created++;
      } catch (e) {
        row.status = "failed";
        row.message = describeError(e);
        pages.reveal(row.id);
        error.value = "导入已停止，已成功的题集会保留。请检查失败项；网络中断时先刷新题集列表核对，避免重复创建。";
        return false;
      }
    }
    Message.success(`已导入${rows.value.length}个题集`);
    return true;
  } finally {
    importing.value = false;
    emit("busy", false);
    if (created) emit("imported");
  }
}

async function exportSets() {
  if (props.disabled || exporting.value || !props.selectedIds.length) return;
  const ids = [...props.selectedIds];
  if (ids.length > transferLimit) {
    Message.warning(`每次最多导出${transferLimit}个题集，请分批选择`);
    return;
  }
  exporting.value = true;
  emit("busy", true);
  try {
    if (state.current && ids.includes(state.current.set.id) && dirty.value && !(await save()))
      throw new Error("当前题集未能保存，请保存成功后再导出");
    const definitions: Definition[] = [];
    for (const id of ids) definitions.push((await getSet(id)).version.definition);
    const content = serializeSets(definitions);
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `choice-sets-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    Message.success(`已导出${ids.length}个题集`);
  } catch (e) {
    Message.error(`导出失败：${describeError(e)}`);
  } finally {
    exporting.value = false;
    emit("busy", false);
  }
}
</script>
<template>
  <a-space>
    <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="readFile" />
    <a-button :disabled="disabled || exporting || importing" @click="fileInput?.click()">导入</a-button>
    <a-button :loading="exporting" :disabled="disabled || importing || !selectedIds.length" @click="exportSets">
      导出<span v-if="selectedIds.length">（{{ selectedIds.length }}）</span>
    </a-button>
  </a-space>
  <a-modal
    v-bind="choiceModalLayout"
    v-model:visible="visible"
    title="导入题集"
    width="min(900px,94vw)"
    :mask-closable="!importing"
    :esc-to-close="!importing"
    :closable="!importing"
    :cancel-button-props="{ disabled: importing }"
    :on-before-ok="importSets"
    ok-text="确认导入"
    unmount-on-close
  >
    <a-space direction="vertical" fill :size="16">
      <a-typography-text>{{ fileName }} · {{ rows.length }} 个题集</a-typography-text>
      <a-alert>导入为新的题集草稿，不覆盖现有题集，需发布后才能正式作答。</a-alert>
      <a-alert v-if="error" type="error">{{ error }}</a-alert>
      <a-table :data="rows" row-key="id" v-bind="pages.bindings" :bordered="{ cell: true }">
        <template #columns>
          <a-table-column
            header-cell-class="choice-table-header"
            :header-cell-style="{ textAlign: 'center' }"
            title="题集名称"
            align="center"
            ><template #cell="{ record }">{{ record.definition.name }}</template></a-table-column
          >
          <a-table-column
            header-cell-class="choice-table-header"
            :header-cell-style="{ textAlign: 'center' }"
            title="题目数"
            align="center"
            ><template #cell="{ record }">{{ record.definition.questions.length }}</template></a-table-column
          >
          <a-table-column
            header-cell-class="choice-table-header"
            :header-cell-style="{ textAlign: 'center' }"
            title="变量数"
            align="center"
            ><template #cell="{ record }">{{ record.definition.dimensions.length }}</template></a-table-column
          >
          <a-table-column
            header-cell-class="choice-table-header"
            :header-cell-style="{ textAlign: 'center' }"
            title="结论数"
            align="center"
            ><template #cell="{ record }">{{ record.definition.rules.length }}</template></a-table-column
          >
          <a-table-column
            header-cell-class="choice-table-header"
            :header-cell-style="{ textAlign: 'center' }"
            title="状态"
            align="center"
            ><template #cell="{ record }">
              <a-tag :color="record.status === 'done' ? 'green' : record.status === 'failed' ? 'red' : 'gray'">{{
                record.message
              }}</a-tag>
            </template></a-table-column
          >
        </template>
      </a-table>
    </a-space>
  </a-modal>
</template>
