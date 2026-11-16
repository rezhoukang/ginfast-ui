<script setup lang="ts">
import { ref, watch } from "vue";
import { Message } from "@arco-design/web-vue";
import { validCode } from "../workspace/readiness";
import type { Dimension, Rule } from "../api/choice";
const rules = defineModel<Rule[]>({ required: true });
const props = defineProps<{ dimensions: Dimension[]; focusCode?: string; focusRequest?: number }>();
const visible = ref(false);
const index = ref(-1);
const form = ref<Rule>({ group: "result", code: "", name: "", description: "", mode: "all", conditions: [] });
function edit(i = -1) {
  index.value = i;
  form.value =
    i < 0
      ? { group: "result", code: `R${rules.value.length + 1}`, name: "", description: "", mode: "all", conditions: [] }
      : JSON.parse(JSON.stringify(rules.value[i]));
  visible.value = true;
}
watch(
  () => [props.focusCode, props.focusRequest] as const,
  ([code]) => {
    const i = rules.value.findIndex(d => `${d.group}/${d.code}` === code);
    if (code && i >= 0) edit(i);
  },
  { immediate: true }
);
function apply() {
  if (!validCode(form.value.group) || !validCode(form.value.code) || !form.value.name.trim()) {
    Message.warning("请填写名称；分组和编号以字母开头，仅使用字母、数字和下划线");
    return false;
  }
  if (rules.value.some((r, i) => i !== index.value && r.group === form.value.group && r.code === form.value.code)) {
    Message.warning("同一分组的结果编号不能重复");
    return false;
  }
  if (form.value.conditions.some(c => !c.dimension)) {
    Message.warning("请选择每个条件的维度");
    return false;
  }
  if (index.value < 0) rules.value.push(form.value);
  else rules.value[index.value] = form.value;
  return true;
}
function move(i: number, delta: number) {
  [rules.value[i], rules.value[i + delta]] = [rules.value[i + delta], rules.value[i]];
}
</script>
<template>
  <a-space direction="vertical" fill :size="16">
    <s-layout-tools>
      <template #left
        ><a-space
          ><a-button type="primary" :disabled="rules.length >= 256" @click="edit()"
            ><template #icon><icon-plus /></template>新增规则</a-button
          ></a-space
        ></template
      >
      <template #right><slot name="actions" /></template>
    </s-layout-tools>
    <a-table :data="rules" :pagination="false" :bordered="{ wrapper: true, cell: true }"
      ><template #columns>
        <a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="顺序"
          :width="70"
          ><template #cell="{ rowIndex }">{{ rowIndex + 1 }}</template></a-table-column
        ><a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="分组"
          data-index="group"
        /><a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="输出编号"
          data-index="code"
        /><a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="结果名称"
          data-index="name"
        />
        <a-table-column header-cell-class="choice-table-header" :header-cell-style="{ textAlign: 'center' }" title="条件"
          ><template #cell="{ record }"
            >{{ record.mode === "all" ? "全部满足" : "任意满足" }} · {{ record.conditions.length }} 项</template
          ></a-table-column
        >
        <a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="操作"
          :width="280"
          ><template #cell="{ rowIndex }"
            ><a-space
              ><a-button size="small" @click="edit(rowIndex)">编辑</a-button
              ><a-button size="small" :disabled="rowIndex === 0" @click="move(rowIndex, -1)">上移</a-button
              ><a-button size="small" :disabled="rowIndex === rules.length - 1" @click="move(rowIndex, 1)">下移</a-button
              ><a-popconfirm content="移除此规则？" @ok="rules.splice(rowIndex, 1)"
                ><a-button size="small" status="danger">删除</a-button></a-popconfirm
              ></a-space
            ></template
          ></a-table-column
        >
      </template></a-table
    >
    <a-modal
      v-model:visible="visible"
      :title="index < 0 ? '新增规则' : '编辑规则'"
      width="min(960px,94vw)"
      :mask-closable="true"
      :on-before-ok="apply"
      ok-text="应用到草稿"
      ><a-form :model="form" auto-label-width>
        <a-form-item label="结果分组" required><a-input v-model="form.group" :max-length="32" /></a-form-item
        ><a-form-item label="输出编号" required><a-input v-model="form.code" :max-length="32" /></a-form-item
        ><a-form-item label="结果名称" required><a-input v-model="form.name" :max-length="120" /></a-form-item
        ><a-form-item label="结果解释"><a-textarea v-model="form.description" :max-length="4000" /></a-form-item>
        <a-form-item label="匹配方式"
          ><a-radio-group v-model="form.mode"
            ><a-radio value="all">全部满足</a-radio><a-radio value="any">任意满足</a-radio></a-radio-group
          ></a-form-item
        >
        <a-form-item label="条件"
          ><a-space direction="vertical" fill
            ><a-table :data="form.conditions" :pagination="false"
              ><template #columns>
                <a-table-column header-cell-class="choice-table-header" :header-cell-style="{ textAlign: 'center' }" title="维度"
                  ><template #cell="{ record }"
                    ><a-select v-model="record.dimension"
                      ><a-option v-for="d in dimensions" :key="d.code" :value="d.code"
                        >{{ d.name }} ({{ d.code }})</a-option
                      ></a-select
                    ></template
                  ></a-table-column
                >
                <a-table-column
                  header-cell-class="choice-table-header"
                  :header-cell-style="{ textAlign: 'center' }"
                  title="比较"
                  :width="90"
                  ><template #cell="{ record }"
                    ><a-select v-model="record.operator"
                      ><a-option v-for="op in ['>', '>=', '<', '<=', '==', '!=']" :key="op" :value="op">{{
                        op
                      }}</a-option></a-select
                    ></template
                  ></a-table-column
                >
                <a-table-column
                  header-cell-class="choice-table-header"
                  :header-cell-style="{ textAlign: 'center' }"
                  title="比较对象"
                  ><template #cell="{ record }"
                    ><a-select v-model="record.compareTo"
                      ><a-option value="">固定数值</a-option
                      ><a-option v-for="d in dimensions" :key="d.code" :value="d.code"
                        >{{ d.name }} ({{ d.code }})</a-option
                      ></a-select
                    ></template
                  ></a-table-column
                >
                <a-table-column
                  header-cell-class="choice-table-header"
                  :header-cell-style="{ textAlign: 'center' }"
                  title="阈值"
                  :width="120"
                  ><template #cell="{ record }"
                    ><a-input-number v-model="record.value" :disabled="!!record.compareTo" /></template></a-table-column
                ><a-table-column
                  header-cell-class="choice-table-header"
                  :header-cell-style="{ textAlign: 'center' }"
                  title="操作"
                  :width="80"
                  ><template #cell="{ rowIndex }"
                    ><a-button size="small" status="danger" @click="form.conditions.splice(rowIndex, 1)">移除</a-button></template
                  ></a-table-column
                >
              </template></a-table
            ><a-button @click="form.conditions.push({ dimension: '', operator: '>=', value: 0, compareTo: '' })"
              >新增条件</a-button
            ></a-space
          ></a-form-item
        >
      </a-form></a-modal
    >
  </a-space>
</template>
