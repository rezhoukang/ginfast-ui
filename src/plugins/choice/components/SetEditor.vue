<script setup lang="ts">
import { choiceModalLayout } from "../workspace/modal";
import { onBeforeUnmount, ref, watch } from "vue";
import { Message } from "@arco-design/web-vue";
import { getSet, saveSet, type Definition, type Detail } from "../api/choice";
import { blankDefinition, describeError, useChoice } from "../workspace/context";
import DefinitionTransfer from "./DefinitionTransfer.vue";
const { state, dirty, save, acceptSaved } = useChoice();
const emit = defineEmits<{ saved: [detail: Detail]; closed: [] }>();
const owner = Symbol("set-editor");
const visible = ref(false);
const loading = ref(false);
const saving = ref(false);
const loadFailed = ref(false);
const error = ref("");
const detail = ref<Detail>();
const form = ref<Definition>(blankDefinition());
const baseline = ref("");
const jsonDirty = ref(false);
const transfer = ref<InstanceType<typeof DefinitionTransfer>>();
let request = 0;
function release() {
  if (state.editorOwner === owner) {
    state.editorOwner = undefined;
    state.editorOpen = false;
    state.editorDirty = false;
  }
}
watch(
  [visible, form, jsonDirty],
  () => {
    if (visible.value) {
      state.editorOwner = owner;
      state.editorOpen = true;
      state.editorDirty = jsonDirty.value || JSON.stringify(form.value) !== baseline.value;
    } else release();
  },
  { deep: true, flush: "sync" }
);
onBeforeUnmount(() => {
  request++;
  release();
});
async function open(id?: number) {
  if (state.busy || saving.value) return;
  // Flush existing edits before reading the version used by this modal.
  if (dirty.value && !(await save())) return;
  const currentRequest = ++request;
  error.value = "";
  detail.value = undefined;
  form.value = blankDefinition();
  baseline.value = JSON.stringify(form.value);
  jsonDirty.value = false;
  loading.value = !!id;
  loadFailed.value = false;
  visible.value = true;
  if (!id) return;
  try {
    const result = await getSet(id);
    if (currentRequest !== request || !visible.value) return;
    detail.value = result;
    baseline.value = JSON.stringify(result.version.definition);
    form.value = JSON.parse(baseline.value);
  } catch (e) {
    if (currentRequest === request) {
      error.value = describeError(e);
      loadFailed.value = true;
    }
  } finally {
    if (currentRequest === request) loading.value = false;
  }
}
async function confirm() {
  if (loading.value || saving.value || loadFailed.value) return false;
  if (transfer.value && !transfer.value.prepare()) return false;
  if (!form.value.name.trim()) {
    error.value = "请填写题集名称";
    return false;
  }
  saving.value = true;
  error.value = "";
  try {
    const result = await saveSet(detail.value?.set.id, detail.value?.version.id || 0, JSON.parse(JSON.stringify(form.value)));
    acceptSaved(result);
    emit("saved", result);
    Message.success("保存成功");
    return true;
  } catch (e) {
    error.value = describeError(e);
    return false;
  } finally {
    saving.value = false;
  }
}
function closed() {
  request++;
  release();
  emit("closed");
}
defineExpose({ open });
</script>
<template>
  <a-modal
    v-bind="choiceModalLayout"
    v-model:visible="visible"
    :title="detail ? '编辑题集' : '新建题集'"
    width="min(800px,94vw)"
    :mask-closable="!saving"
    :esc-to-close="!saving"
    :closable="!saving"
    :cancel-button-props="{ disabled: saving }"
    :ok-button-props="{ disabled: loading }"
    :on-before-ok="confirm"
    ok-text="确认"
    unmount-on-close
    @close="closed"
  >
    <a-spin :loading="loading || saving" style="width: 100%">
      <a-space direction="vertical" fill :size="16">
        <a-alert v-if="error" type="error">{{ error }}</a-alert>
        <a-form :model="form" auto-label-width>
          <a-form-item label="题集名称" required><a-input v-model="form.name" :max-length="120" /></a-form-item>
          <a-form-item label="题集说明"
            ><a-textarea v-model="form.description" :max-length="4000" :auto-size="{ minRows: 3, maxRows: 6 }"
          /></a-form-item>
        </a-form>
        <a-collapse :bordered="false"
          ><a-collapse-item header="高级操作" key="advanced">
            <DefinitionTransfer ref="transfer" v-model="form" @dirty="jsonDirty = $event" /> </a-collapse-item
        ></a-collapse>
      </a-space>
    </a-spin>
  </a-modal>
</template>
