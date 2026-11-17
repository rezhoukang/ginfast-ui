<script setup lang="ts">
import WorkspaceActions from "../components/WorkspaceActions.vue";
import { useChoice } from "../hooks/useChoice";
import DimensionEditor from "../components/DimensionEditor.vue";
const { state, route } = useChoice();
</script>
<template>
  <DimensionEditor
    v-if="state.draft"
    v-model="state.draft.dimensions"
    :definition="state.draft"
    :focus-request="state.focusRequest"
    :focus-code="String(route.query.item || '')"
    ><template #actions><WorkspaceActions /></template
  ></DimensionEditor>
</template>
