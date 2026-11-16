import { ref, type Ref } from "vue";

// Share validated selection with the host sidebar without importing the editor.
const selections: WeakMap<object, Ref<number | undefined>> = import.meta.hot?.data.choiceSelections || new WeakMap();
if (import.meta.hot) import.meta.hot.data.choiceSelections = selections;

export function choiceSelection(router: object) {
  if (!selections.has(router)) selections.set(router, ref<number>());
  return selections.get(router)!;
}

export function choiceMenuLocked(path: string, selectedId: number | undefined) {
  return ["/choice/dimensions", "/choice/rules"].includes(path) && !selectedId;
}
