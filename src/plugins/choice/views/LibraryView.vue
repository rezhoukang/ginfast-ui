<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { Message } from "@arco-design/web-vue";
import { deleteSet, setEnabled, listSets, type ChoiceSet } from "../api/choice";
import { describeError } from "../utils/errors";
import { useChoice } from "../hooks/useChoice";
import { useRouter } from "vue-router";
import SetEditor from "../components/SetEditor.vue";
import SetTransfer from "../components/SetTransfer.vue";
import WorkspaceActions from "../components/WorkspaceActions.vue";
const { openSet, state, route, view, reset } = useChoice();
const router = useRouter();
const editor = ref<InstanceType<typeof SetEditor>>();
const handledPath = ref("");
const selectedKeys = ref<(string | number)[]>([]);
const transferBusy = ref(false);
watch(
  () => [route.fullPath, state.busy, editor.value] as const,
  async () => {
    if (view.value !== "overview" || state.busy || !editor.value || handledPath.value === route.fullPath) return;
    handledPath.value = route.fullPath;
    const id = Number(route.query.set);
    if (route.query.set === "new") await editor.value.open();
    else if (Number.isSafeInteger(id) && id > 0) await editor.value.open(id);
  },
  { flush: "post", immediate: true }
);
function closeEditor() {
  if (view.value === "overview") void router.replace({ path: "/choice/sets" });
}
async function remove(ids: number[]) {
  if (!ids.length || busy.value || state.busy || changingId.value || transferBusy.value) return;
  busy.value = true;
  error.value = "";
  let deleted = 0;
  let failure = "";
  try {
    for (const id of [...new Set(ids)]) {
      await deleteSet(id);
      deleted++;
      selectedKeys.value = selectedKeys.value.filter(key => Number(key) !== id);
      if (state.current?.set.id === id) reset();
    }
    Message.success(`已删除${deleted}个题集`);
  } catch (e) {
    failure = `已删除${deleted}个题集，操作已停止：${describeError(e)}。未完成项仍保留勾选，请刷新核对后重试。`;
  } finally {
    await load();
    if (failure) error.value = failure + (error.value ? ` ${error.value}` : "");
    busy.value = false;
  }
}
const changingId = ref<number>();
async function changeEnabled(record: ChoiceSet, enabled: boolean) {
  if (changingId.value || state.busy || busy.value) return;
  changingId.value = record.id;
  error.value = "";
  try {
    const updated = await setEnabled(record.id, enabled);
    record.enabled = updated.enabled;
    // Status changes must not overwrite any locally edited definition/version.
    if (state.current?.set.id === record.id) state.current.set.enabled = updated.enabled;
  } catch (e) {
    error.value = describeError(e);
  } finally {
    changingId.value = undefined;
  }
}
const sets = ref<ChoiceSet[]>([]);
const page = ref(1);
const pageSize = ref(20);
const total = ref(0);
const busy = ref(false);
const error = ref("");
async function load() {
  busy.value = true;
  error.value = "";
  try {
    let data = await listSets(page.value, pageSize.value);
    const lastPage = Math.max(1, Math.ceil(data.total / pageSize.value));
    if (page.value > lastPage) {
      page.value = lastPage;
      data = await listSets(page.value, pageSize.value);
    }
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
    <s-layout-tools>
      <template #left>
        <a-space wrap>
          <a-button type="primary" :disabled="state.busy || busy || !!changingId || transferBusy" @click="editor?.open()"
            ><template #icon><icon-plus /></template>新建题集</a-button
          >
          <a-button :loading="busy" :disabled="!!changingId || transferBusy" @click="load">刷新</a-button>
          <SetTransfer
            :selected-ids="selectedKeys.map(Number)"
            :disabled="state.busy || busy || !!changingId"
            @busy="transferBusy = $event"
            @imported="load"
          />
          <a-popconfirm
            :content="`确认删除勾选的${selectedKeys.length}个题集？历史版本和答卷保留。`"
            :disabled="!selectedKeys.length || busy || state.busy || !!changingId || transferBusy"
            @ok="remove(selectedKeys.map(Number))"
          >
            <a-button
              status="danger"
              :disabled="!selectedKeys.length || busy || state.busy || !!changingId || transferBusy"
            >删除</a-button>
          </a-popconfirm>
          <a-typography-text v-if="selectedKeys.length" type="secondary"
            >已勾选 {{ selectedKeys.length }} 个题集</a-typography-text
          >
          <a-button v-if="selectedKeys.length" type="text" :disabled="transferBusy" @click="selectedKeys = []">清空勾选</a-button>
        </a-space>
      </template>
      <template #right><WorkspaceActions /></template>
    </s-layout-tools>
    <a-alert v-if="error" type="error">{{ error }}</a-alert>
    <a-table
      :data="sets"
      row-key="id"
      v-model:selected-keys="selectedKeys"
      :row-selection="{ type: 'checkbox', showCheckedAll: true, onlyCurrent: false }"
      :loading="busy"
      :pagination="{
        current: page,
        total,
        pageSize,
        showTotal: true,
        showPageSize: true,
        pageSizeOptions: [10, 20, 50],
        showJumper: true
      }"
      :bordered="{ wrapper: true, cell: true }"
      @page-size-change="
        pageSize = $event;
        page = 1;
        load();
      "
      @page-change="
        page = $event;
        load();
      "
    >
      <template #columns
        ><a-table-column
          align="center"
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="ID"
          data-index="id"
          :width="80"
        /><a-table-column
          align="center"
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="题集名称"
          data-index="name"
        /><a-table-column
          align="center"
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="草稿版本"
          data-index="currentVersionId"
        />
        <a-table-column
          align="center"
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="发布状态"
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
          align="center"
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="启用状态"
          :width="120"
        >
          <template #cell="{ record }">
            <a-switch
              type="round"
              :model-value="record.enabled"
              :loading="changingId === record.id"
              :disabled="busy || state.busy || !!changingId || transferBusy"
              :aria-label="`${record.name}启用状态`"
              checked-text="启用"
              unchecked-text="停用"
              @change="changeEnabled(record, $event as boolean)"
            />
          </template>
        </a-table-column>
        <a-table-column
          align="center"
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="操作"
          :width="260"
          ><template #cell="{ record }"
            ><a-space wrap
              ><a-button
                size="small"
                :disabled="state.busy || busy || !!changingId || transferBusy"
                @click="editor?.open(record.id)"
                >编辑</a-button
              ><a-button
                size="small"
                type="primary"
                :disabled="state.busy || transferBusy || state.current?.set.id === record.id"
                @click="openSet(record.id, 'library')"
                >{{ state.current?.set.id === record.id ? "已选" : "选择" }}</a-button
              >
              <a-popconfirm content="删除后题集将从列表移除，历史版本和答卷保留。确认删除？" @ok="remove([record.id])">
                <a-button size="small" status="danger" :disabled="busy || state.busy || !!changingId || transferBusy"
                  >删除</a-button
                >
              </a-popconfirm></a-space
            ></template
          ></a-table-column
        >
      </template>
    </a-table>
    <SetEditor ref="editor" @saved="load" @closed="closeEditor" />
  </a-space>
</template>
