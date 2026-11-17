<script setup lang="ts">
import { useChoicePagination } from "../hooks/useChoicePagination";
import { choiceModalLayout } from "../config/modal";
import { ref } from "vue";
import { Message } from "@arco-design/web-vue";
import { optionIssue, validCode } from "../utils/readiness";
import type { Question } from "../api/choice";
const questions = defineModel<Question[]>({ required: true });
const emit = defineEmits<{ options: [code: string] }>();
const visible = ref(false);
const createdCode = ref("");
function afterClose() {
  if (createdCode.value) emit("options", createdCode.value);
  createdCode.value = "";
}
const index = ref(-1);
const form = ref<Question>({ code: "", title: "", kind: "single", required: true, options: [] });
const pages = useChoicePagination(() => questions.value.length);
const kindNames = { single: "单选", multiple: "多选" };
function edit(i = -1) {
  index.value = i;
  if (i >= 0) pages.reveal(i);
  let code = questions.value.length + 1;
  while (questions.value.some(q => q.code === `Q${code}`)) code++;
  form.value =
    i < 0
      ? {
          code: `Q${code}`,
          title: "",
          kind: "single",
          required: true,
          options: [
            { code: "a", text: "", effects: [] },
            { code: "b", text: "", effects: [] }
          ]
        }
      : JSON.parse(JSON.stringify(questions.value[i]));
  visible.value = true;
}
function apply() {
  if (!validCode(form.value.code) || !form.value.title.trim()) {
    Message.warning("请填写题目内容；编号以字母开头，仅使用字母、数字和下划线");
    return false;
  }
  if (questions.value.some((q, i) => i !== index.value && q.code === form.value.code)) {
    Message.warning("题目编号不能重复");
    return false;
  }
  if (index.value < 0) {
    questions.value.push(form.value);
    createdCode.value = form.value.code;
  } else questions.value[index.value] = form.value;
  return true;
}
function move(i: number, delta: number) {
  [questions.value[i], questions.value[i + delta]] = [questions.value[i + delta], questions.value[i]];
  pages.reveal(i + delta);
}
</script>
<template>
  <a-space direction="vertical" fill :size="16">
    <s-layout-tools>
      <template #left
        ><a-space
          ><a-button type="primary" :disabled="questions.length >= 500" @click="edit()"
            ><template #icon><icon-plus /></template>新增题目</a-button
          ></a-space
        ></template
      >
      <template #right><slot name="actions" /></template>
    </s-layout-tools>
    <a-table :data="questions" v-bind="pages.bindings" :bordered="{ wrapper: true, cell: true }"
      ><template #columns>
        <a-table-column
          align="center"
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="编号"
          data-index="code"
          :width="90"
        /><a-table-column
          align="center"
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="题目"
          data-index="title"
        />
        <a-table-column
          align="center"
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="题型"
          :width="80"
          ><template #cell="{ record }">{{ kindNames[record.kind as Question["kind"]] }}</template></a-table-column
        ><a-table-column
          align="center"
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="选项状态"
          :width="150"
          ><template #cell="{ record }"
            ><a-tag :color="optionIssue(record) ? 'orange' : 'green'"
              >{{ record.options.length }} 项 · {{ optionIssue(record) ? "待完善" : "已配置" }}</a-tag
            ></template
          ></a-table-column
        ><a-table-column
          align="center"
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="必答"
          :width="70"
          ><template #cell="{ record }">{{ record.required ? "是" : "否" }}</template></a-table-column
        >
        <a-table-column
          align="center"
          header-cell-class="choice-table-header"
          :header-cell-style="{ textAlign: 'center' }"
          title="操作"
          :width="370"
          ><template #cell="{ rowIndex }"
            ><a-space
              ><a-button size="small" @click="edit(pages.index(rowIndex))">编辑</a-button
              ><a-button size="small" @click="emit('options', questions[pages.index(rowIndex)].code)">选项管理</a-button
              ><a-button size="small" :disabled="pages.index(rowIndex) === 0" @click="move(pages.index(rowIndex), -1)">上移</a-button
              ><a-button size="small" :disabled="pages.index(rowIndex) === questions.length - 1" @click="move(pages.index(rowIndex), 1)">下移</a-button
              ><a-popconfirm content="移除此题目？" @ok="questions.splice(pages.index(rowIndex), 1)"
                ><a-button size="small" status="danger">删除</a-button></a-popconfirm
              ></a-space
            ></template
          ></a-table-column
        >
      </template></a-table
    >
    <a-modal
      v-bind="choiceModalLayout"
      v-model:visible="visible"
      :title="index < 0 ? '新增题目' : '编辑题目'"
      width="min(720px,94vw)"
      :mask-closable="true"
      :on-before-ok="apply"
      :ok-text="index < 0 ? '下一步：配置选项' : '应用到草稿'"
      @close="afterClose"
      ><a-form :model="form" auto-label-width>
        <a-form-item label="编号" required
          ><a-input v-model="form.code" :max-length="32" /><template #help>已自动生成，一般无需修改。</template></a-form-item
        >
        <a-form-item label="题目内容" required><a-textarea v-model="form.title" :max-length="2000" /></a-form-item>
        <a-form-item label="题型"
          ><a-select v-model="form.kind"
            ><a-option value="single">单选</a-option><a-option value="multiple">多选</a-option></a-select
          ></a-form-item
        >
        <a-form-item label="必答"><a-switch v-model="form.required" /></a-form-item> </a-form
    ></a-modal>
  </a-space>
</template>
