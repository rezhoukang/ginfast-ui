<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { deleteSet, setEnabled, listSets, type ChoiceSet } from "../api/choice";
import { describeError, useChoice } from "../workspace/context";
import { useRouter } from "vue-router";
import SetEditor from "../components/SetEditor.vue";
const { openSet, state, route, view, reset } = useChoice();
const router = useRouter();
const editor = ref<InstanceType<typeof SetEditor>>();
const handledPath = ref("");
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
async function remove(id: number) {
  busy.value = true;
  error.value = "";
  try {
    await deleteSet(id);
    if (state.current?.set.id === id) reset();
    await load();
  } catch (e) {
    error.value = describeError(e);
  } finally {
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
    <a-space wrap
      ><a-button type="primary" :disabled="state.busy || !!changingId" @click="editor?.open()"
        ><template #icon><icon-plus /></template>新建题集</a-button
      ><a-button :loading="busy" :disabled="!!changingId" @click="load">刷新</a-button></a-space
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
              :disabled="busy || state.busy || !!changingId"
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
              ><a-button size="small" :disabled="state.busy || !!changingId" @click="editor?.open(record.id)">编辑</a-button
              ><a-button
                size="small"
                type="primary"
                :disabled="state.busy || state.current?.set.id === record.id"
                @click="openSet(record.id, 'library')"
                >{{ state.current?.set.id === record.id ? "已选择" : "选择" }}</a-button
              >
              <a-popconfirm content="删除后题集将从列表移除，历史版本和答卷保留。确认删除？" @ok="remove(record.id)">
                <a-button size="small" status="danger" :disabled="busy || state.busy || !!changingId">删除</a-button>
              </a-popconfirm></a-space
            ></template
          ></a-table-column
        >
      </template>
    </a-table>
    <SetEditor ref="editor" @saved="load" @closed="closeEditor" />
  </a-space>
</template>
