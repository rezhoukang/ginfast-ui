<script setup lang="ts">
import { ref, watch } from "vue";
import { Message } from "@arco-design/web-vue";
import { validCode } from "../workspace/readiness";
import type { Definition, Dimension } from "../api/choice";
const props = defineProps<{ definition: Definition; focusCode?: string; focusRequest?: number }>();
const dimensions = defineModel<Dimension[]>({ required: true });
const visible = ref(false);
const index = ref(-1);
const form = ref<Dimension>({ code: "", name: "", initial: 0, terms: [] });
function edit(i = -1) {
  index.value = i;
  let code = dimensions.value.length + 1;
  while (dimensions.value.some(d => d.code === `D${code}`)) code++;
  form.value =
    i < 0
      ? { code: `D${code}`, name: "", initial: 0, terms: [] }
      : structuredClone(JSON.parse(JSON.stringify(dimensions.value[i])));
  visible.value = true;
}
watch(
  () => [props.focusCode, props.focusRequest] as const,
  ([code]) => {
    const i = dimensions.value.findIndex(d => d.code === code);
    if (code && i >= 0) edit(i);
  },
  { immediate: true }
);
function apply() {
  if (!validCode(form.value.code) || !form.value.name.trim()) {
    Message.warning("请填写名称；编号以字母开头，仅使用字母、数字和下划线");
    return false;
  }
  if (dimensions.value.some((d, i) => i !== index.value && d.code === form.value.code)) {
    Message.warning("维度编号不能重复");
    return false;
  }
  if (
    form.value.terms.some(
      t => !dimensions.value.some((d, i) => i !== index.value && !d.terms.length && d.code === t.dimension)
    ) ||
    new Set(form.value.terms.map(t => t.dimension)).size !== form.value.terms.length
  ) {
    Message.warning("请选择不重复的原始维度作为计算项");
    return false;
  }
  const previous = dimensions.value[index.value];
  if (previous && !previous.terms.length && form.value.terms.length && baseReferences(previous.code)) {
    Message.warning("该原始维度被选项或派生指标使用，请先调整引用再更改类型");
    return false;
  }
  if (previous && previous.code !== form.value.code) {
    props.definition.questions.forEach(q =>
      q.options.forEach(o =>
        o.effects.forEach(e => {
          if (e.dimension === previous.code) e.dimension = form.value.code;
        })
      )
    );
    dimensions.value.forEach(d =>
      d.terms.forEach(t => {
        if (t.dimension === previous.code) t.dimension = form.value.code;
      })
    );
    props.definition.rules.forEach(r =>
      r.conditions.forEach(c => {
        if (c.dimension === previous.code) c.dimension = form.value.code;
        if (c.compareTo === previous.code) c.compareTo = form.value.code;
      })
    );
  }
  if (index.value < 0) dimensions.value.push(form.value);
  else dimensions.value[index.value] = form.value;
  return true;
}
function baseReferences(code: string) {
  return (
    props.definition.questions.some(q => q.options.some(o => o.effects.some(e => e.dimension === code))) ||
    dimensions.value.some(d => d.terms.some(t => t.dimension === code))
  );
}
function remove(i: number) {
  const code = dimensions.value[i].code;
  if (
    baseReferences(code) ||
    props.definition.rules.some(r => r.conditions.some(c => c.dimension === code || c.compareTo === code))
  ) {
    Message.warning("此维度仍被选项、派生指标或结果规则使用，请先调整引用");
    return;
  }
  dimensions.value.splice(i, 1);
}
</script>
<template>
  <a-space direction="vertical" fill :size="16">
    <a-space
      ><a-button type="primary" :disabled="dimensions.length >= 64" @click="edit()"
        ><template #icon><icon-plus /></template>新增维度</a-button
      ></a-space
    >
    <a-table :data="dimensions" :pagination="false" :bordered="{ wrapper: true, cell: true }"
      ><template #columns>
        <a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="编号"
          data-index="code"
        /><a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="名称"
          data-index="name"
        /><a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="初始值 / 常数项"
          data-index="initial"
        />
        <a-table-column header-cell-class="choice-table-header" :header-cell-style="{ textAlign: 'center' }" title="类型"
          ><template #cell="{ record }"
            ><a-tag :color="record.terms.length ? 'purple' : 'blue'">{{
              record.terms.length ? "派生指标" : "原始维度"
            }}</a-tag></template
          ></a-table-column
        >
        <a-table-column
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="操作"
          :width="170"
          ><template #cell="{ rowIndex }"
            ><a-space
              ><a-button size="small" @click="edit(rowIndex)">编辑</a-button
              ><a-popconfirm content="确认删除此维度？已被引用的维度会保留。" @ok="remove(rowIndex)"
                ><a-button size="small" status="danger">删除</a-button></a-popconfirm
              ></a-space
            ></template
          ></a-table-column
        >
      </template></a-table
    >
    <a-modal
      v-model:visible="visible"
      :title="index < 0 ? '新增维度' : '编辑维度'"
      width="min(760px,94vw)"
      :mask-closable="true"
      :on-before-ok="apply"
      ok-text="应用到草稿"
    >
      <a-form :model="form" auto-label-width
        ><a-form-item label="编号" required><a-input v-model="form.code" :max-length="32" /></a-form-item
        ><a-form-item label="名称" required><a-input v-model="form.name" :max-length="120" /></a-form-item
        ><a-form-item :label="form.terms.length ? '常数项' : '初始值'"
          ><a-input-number v-model="form.initial" :min="-1000000" :max="1000000"
        /></a-form-item>
        <a-form-item label="派生计算"
          ><a-space direction="vertical" fill
            ><a-alert>不添加计算项时为原始维度；添加后按“常数项 + 原始维度 × 权重”计算。</a-alert>
            <a-table :data="form.terms" :pagination="false"
              ><template #columns
                ><a-table-column
                  header-cell-class="choice-table-header"
                  :header-cell-style="{ textAlign: 'center' }"
                  title="原始维度"
                  ><template #cell="{ record }"
                    ><a-select v-model="record.dimension" placeholder="选择原始维度"
                      ><a-option
                        v-for="d in dimensions.filter((d, i) => i !== index && !d.terms.length)"
                        :key="d.code"
                        :value="d.code"
                        >{{ d.name }} ({{ d.code }})</a-option
                      ></a-select
                    ></template
                  ></a-table-column
                ><a-table-column header-cell-class="choice-table-header" :header-cell-style="{ textAlign: 'center' }" title="权重"
                  ><template #cell="{ record }"><a-input-number v-model="record.weight" /></template></a-table-column
                ><a-table-column
                  header-cell-class="choice-table-header"
                  :header-cell-style="{ textAlign: 'center' }"
                  title="操作"
                  :width="80"
                  ><template #cell="{ rowIndex }"
                    ><a-button status="danger" size="small" @click="form.terms.splice(rowIndex, 1)">移除</a-button></template
                  ></a-table-column
                ></template
              ></a-table
            >
            <a-button @click="form.terms.push({ dimension: '', weight: 1 })">添加计算项</a-button></a-space
          ></a-form-item
        >
      </a-form>
    </a-modal>
  </a-space>
</template>
