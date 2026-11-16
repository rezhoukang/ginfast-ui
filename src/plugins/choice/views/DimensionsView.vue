<script setup lang="ts">
import { useChoice } from "../workspace/context";
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
  />
</template>
