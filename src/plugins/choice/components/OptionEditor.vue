<script setup lang="ts">
import { normalizeEffect, validEffect, effectText } from "../workspace/effects";
import { computed, ref, watch, onBeforeUnmount } from "vue";
import { Message } from "@arco-design/web-vue";
import type { Variable, Option, Question } from "../api/choice";
import { useChoice } from "../workspace/context";
const { state } = useChoice();
const owner = Symbol("option-editor");
const baseline = ref("");
const question = defineModel<Question>({ required: true });
const props = defineProps<{ dimensions: Variable[]; focusCode?: string; focusRequest?: number }>();
const emit = defineEmits<{ editing: [value: boolean] }>();
const graded = computed(() => question.value.options.some(o => o.correct !== undefined));
function setGraded(value: string | number | boolean) {
  question.value.options.forEach(o => {
    if (value) o.correct = o.correct === true;
    else delete o.correct;
  });
}
function setCorrect(code: string, value: boolean) {
  question.value.options.forEach(o => {
    if (question.value.kind !== "multiple") o.correct = o.code === code;
    else if (o.code === code) o.correct = value;
  });
}
const dimensionName = (code: string) => props.dimensions.find(d => d.code === code)?.name || code;
const visible = ref(false);
watch(visible, value => emit("editing", value));
const index = ref(-1);
const form = ref<Option>({ code: "", text: "", effects: [] });
watch(
  [visible, form],
  () => {
    if (visible.value) {
      state.editorOwner = owner;
      state.editorOpen = true;
      state.editorDirty = JSON.stringify(form.value) !== baseline.value;
    } else if (state.editorOwner === owner) {
      state.editorOpen = false;
      state.editorDirty = false;
      state.editorOwner = undefined;
    }
  },
  { deep: true, flush: "sync" }
);
onBeforeUnmount(() => {
  if (state.editorOwner === owner) {
    state.editorOpen = false;
    state.editorDirty = false;
    state.editorOwner = undefined;
  }
});
const codes = [..."abcdefghijklmnopqrstuvwxyz01"];
const availableCodes = computed(() =>
  codes.filter(code => !question.value?.options.some((o, i) => i !== index.value && o.code === code))
);
function edit(i = -1) {
  if (!question.value) return;
  index.value = i;
  const code = codes.find(c => !question.value!.options.some(o => o.code === c));
  if (i < 0 && (!code || question.value.kind === "boolean")) return;
  form.value = i < 0 ? { code: code!, text: "", effects: [] } : JSON.parse(JSON.stringify(question.value.options[i]));
  form.value.effects = form.value.effects.map(normalizeEffect);
  baseline.value = JSON.stringify(form.value);
  visible.value = true;
}
watch(
  () => [props.focusCode, props.focusRequest] as const,
  ([code]) => {
    const i = question.value.options.findIndex(o => o.code === code);
    if (code && i >= 0) edit(i);
  },
  { immediate: true }
);
function apply() {
  if (!question.value) return false;
  if (!form.value.text.trim()) {
    Message.warning("请填写选项内容");
    return false;
  }
  if (!availableCodes.value.includes(form.value.code)) {
    Message.warning("请选择未使用的选项编号");
    return false;
  }
  if (form.value.effects.some(e => !e.dimension)) {
    Message.warning("请选择每项操作引用的题集变量");
    return false;
  }
  if (new Set(form.value.effects.map(e => e.dimension)).size !== form.value.effects.length) {
    Message.warning("同一选项对同一变量只能配置一项操作");
    return false;
  }
  if (form.value.effects.some(e => !validEffect(e) || !props.dimensions.some(d => d.code === e.dimension && !d.terms.length))) {
    Message.warning("请选择本题集的基础变量；设为可填负数，增加和减少须填非负数");
    return false;
  }
  if (graded.value && form.value.correct === undefined) form.value.correct = false;
  if (index.value < 0) question.value.options.push(form.value);
  else question.value.options[index.value] = form.value;
  visible.value = false;
  return true;
}
function move(i: number, delta: number) {
  if (!question.value) return;
  const options = question.value.options;
  [options[i], options[i + delta]] = [options[i + delta], options[i]];
}
</script>
<template>
  <a-space direction="vertical" fill :size="16">
    <s-layout-tools v-if="!visible || $slots.actions">
      <template #left
        ><a-space v-if="!visible" wrap
          ><template v-if="question"
            ><a-tag>{{ question.code }}</a-tag
            ><a-typography-text>{{ question.title }}</a-typography-text
            ><a-button type="primary" :disabled="question.kind === 'boolean' || question.options.length >= 28" @click="edit()"
              ><template #icon><icon-plus /></template>新增选项</a-button
            ></template
          ></a-space
        ></template
      >
      <template #right><slot name="actions" /></template>
    </s-layout-tools>
    <a-alert v-if="!question" type="warning">未找到当前题目，请从题目列表的“选项管理”进入。</a-alert>
    <template v-else>
      <a-space v-if="!visible" wrap>
        <a-typography-text>判分方式</a-typography-text>
        <a-switch :model-value="graded" checked-text="判对错" unchecked-text="不判对错" @change="setGraded" />
        <a-typography-text type="secondary">{{
          graded
            ? question.kind === "multiple"
              ? "勾选全部正确答案；必须全部选对才算答对。"
              : "在下表选择一个正确答案。"
            : "适合问卷测评，按选项操作更新题集变量。"
        }}</a-typography-text>
      </a-space>
      <a-table v-if="!visible" :data="question.options" :pagination="false" :bordered="{ wrapper: true, cell: true }"
        ><template #columns>
          <a-table-column
            align="center"
            header-cell-class="choice-table-header"
            :header-cell-style="{ textAlign: 'center' }"
            title="编号"
            data-index="code"
            :width="80"
          /><a-table-column
            align="center"
            header-cell-class="choice-table-header"
            :header-cell-style="{ textAlign: 'center' }"
            title="选项内容"
            data-index="text"
          />
          <a-table-column
            align="center"
            header-cell-class="choice-table-header"
            :header-cell-style="{ textAlign: 'center' }"
            v-if="graded"
            title="正确答案"
            :width="120"
            ><template #cell="{ record }">
              <a-checkbox
                v-if="question.kind === 'multiple'"
                :model-value="record.correct === true"
                :aria-label="record.code + ' 为正确答案'"
                @change="setCorrect(record.code, Boolean($event))"
                >正确</a-checkbox
              >
              <a-radio
                v-else
                :model-value="question.options.find(o => o.correct)?.code"
                :value="record.code"
                :aria-label="record.code + ' 为正确答案'"
                @change="setCorrect(record.code, true)"
                >正确</a-radio
              >
            </template></a-table-column
          >
          <a-table-column
            align="center"
            header-cell-class="choice-table-header"
            :header-cell-style="{ textAlign: 'center' }"
            v-if="question.kind === 'boolean'"
            title="判断值"
            :width="90"
            ><template #cell="{ record }">{{ record.value ? "1 / 真" : "0 / 假" }}</template></a-table-column
          >
          <a-table-column
            align="center"
            header-cell-class="choice-table-header"
            :header-cell-style="{ textAlign: 'center' }"
            title="变量操作"
            ><template #cell="{ record }"
              ><a-space wrap
                ><a-tag v-for="effect in record.effects" :key="effect.dimension"
                  >{{ dimensionName(effect.dimension) }} {{ effectText(effect) }}</a-tag
                ><a-typography-text v-if="!record.effects.length" type="secondary">未设置</a-typography-text></a-space
              ></template
            ></a-table-column
          >
          <a-table-column
            align="center"
            header-cell-class="choice-table-header"
            :header-cell-style="{ textAlign: 'center' }"
            title="操作"
            :width="280"
            ><template #cell="{ rowIndex }"
              ><a-space
                ><a-button size="small" @click="edit(rowIndex)">编辑</a-button
                ><a-button size="small" :disabled="rowIndex === 0" @click="move(rowIndex, -1)">上移</a-button
                ><a-button size="small" :disabled="rowIndex === question.options.length - 1" @click="move(rowIndex, 1)"
                  >下移</a-button
                ><a-popconfirm content="移除此选项？" @ok="question.options.splice(rowIndex, 1)"
                  ><a-button size="small" status="danger" :disabled="question.kind === 'boolean' || question.options.length <= 2"
                    >删除</a-button
                  ></a-popconfirm
                ></a-space
              ></template
            ></a-table-column
          >
        </template></a-table
      >
      <a-space v-if="visible" direction="vertical" fill :size="16">
        <a-typography-text bold>{{ index < 0 ? "新增选项" : "编辑选项 " + form.code }} · {{ question.code }}</a-typography-text>
        <a-form :model="form" auto-label-width>
          <a-form-item label="选项编号" required
            ><a-select v-model="form.code" :disabled="question.kind === 'boolean'"
              ><a-option v-for="code in availableCodes" :key="code" :value="code">{{ code }}</a-option></a-select
            ></a-form-item
          >
          <a-form-item label="选项内容" required><a-textarea v-model="form.text" :max-length="2000" /></a-form-item>
          <a-form-item label="变量操作"
            ><a-space direction="vertical" fill
              ><a-table :data="form.effects" :pagination="false"
                ><template #columns>
                  <a-table-column
                    align="center"
                    header-cell-class="choice-table-header"
                    :header-cell-style="{ textAlign: 'center' }"
                    title="基础变量"
                    ><template #cell="{ record }"
                      ><a-select v-model="record.dimension" placeholder="选择变量"
                        ><a-option v-for="d in dimensions.filter(d => !d.terms.length)" :key="d.code" :value="d.code"
                          >{{ d.name }} ({{ d.code }})</a-option
                        ></a-select
                      ></template
                    ></a-table-column
                  >
                  <a-table-column
                    align="center"
                    header-cell-class="choice-table-header"
                    :header-cell-style="{ textAlign: 'center' }"
                    title="执行操作"
                  >
                    <template #cell="{ record }"
                      ><a-select
                        v-model="record.operation"
                        @change="record.operation !== 'set' && (record.value = Math.abs(record.value || 0))"
                      >
                        <a-option value="set">设为</a-option><a-option value="add">增加</a-option
                        ><a-option value="subtract">减少</a-option>
                      </a-select></template
                    >
                  </a-table-column>
                  <a-table-column
                    align="center"
                    header-cell-class="choice-table-header"
                    :header-cell-style="{ textAlign: 'center' }"
                    title="数值"
                    ><template #cell="{ record }"
                      ><a-input-number
                        v-model="record.value"
                        :min="record.operation === 'set' ? -1000000 : 0"
                        :max="1000000" /></template
                  ></a-table-column>
                  <a-table-column
                    align="center"
                    header-cell-class="choice-table-header"
                    :header-cell-style="{ textAlign: 'center' }"
                    title="操作"
                    :width="80"
                    ><template #cell="{ rowIndex }"
                      ><a-button size="small" status="danger" @click="form.effects.splice(rowIndex, 1)">移除</a-button></template
                    ></a-table-column
                  >
                </template></a-table
              ><a-button
                :disabled="!dimensions.some(d => !d.terms.length && !form.effects.some(e => e.dimension === d.code))"
                @click="
                  form.effects.push({
                    dimension: dimensions.find(d => !d.terms.length && !form.effects.some(e => e.dimension === d.code))!.code,
                    operation: 'add',
                    value: 1
                  })
                "
                >添加变量操作</a-button
              ><a-typography-text type="secondary"
                >选中时执行上述操作；设为会覆盖此前的值。不设置则不修改变量。按题目顺序执行，同题多选按选项顺序执行，与点击顺序无关。</a-typography-text
              ></a-space
            ></a-form-item
          >
        </a-form>
        <a-space
          ><a-button @click="visible = false">取消编辑</a-button
          ><a-button type="primary" @click="apply">确认选项</a-button></a-space
        >
      </a-space>
    </template>
  </a-space>
</template>
