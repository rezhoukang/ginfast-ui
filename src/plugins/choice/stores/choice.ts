import { computed, reactive } from "vue";
import { acceptHMRUpdate, defineStore } from "pinia";
import type { Definition, Detail } from "../api/choice";
import { draftIssues, type DraftIssue } from "../utils/readiness";

function createState() {
  return {
    generation: 0,
    current: undefined as Detail | undefined,
    draft: undefined as Definition | undefined,
    baseline: "",
    loadedKey: "",
    pendingKey: "",
    busy: false,
    error: "",
    saveFailed: false,
    showIssues: false,
    editorOwner: undefined as symbol | undefined,
    editorOpen: false,
    editorDirty: false,
    focusRequest: 0
  };
}

// Pinia keeps the draft shared across GinFast's separate routed view instances.
// The host declares the pinia module without types; keep this plugin's public
// store contract explicit so consumers retain typed draft data.
interface ChoiceStore {
  state: ReturnType<typeof createState>;
  dirty: boolean;
  issues: DraftIssue[];
  resetState: () => void;
}
export const useChoiceStore: () => ChoiceStore = defineStore("choice-editor", () => {
  const state = reactive(createState());
  const dirty = computed(() => !!state.draft && JSON.stringify(state.draft) !== state.baseline);
  const issues = computed(() => (state.draft ? draftIssues(state.draft) : []));
  function resetState() {
    const generation = state.generation + 1;
    Object.assign(state, createState(), { generation });
  }
  return { state, dirty, issues, resetState };
});

if (import.meta.hot) import.meta.hot.accept(acceptHMRUpdate(useChoiceStore, import.meta.hot));
