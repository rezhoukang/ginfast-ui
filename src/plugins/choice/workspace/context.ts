import { computed, inject, onBeforeUnmount, provide, reactive, watch, type InjectionKey } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";
import { Message, Modal } from "@arco-design/web-vue";
import { isAxiosError } from "axios";
import { getSet, saveSet, publishSet, archiveSet, type Definition, type Detail } from "../api/choice";
import { draftIssues, type DraftIssue } from "./readiness";
import { choiceSelection } from "./selection";
import { queryText, resolveView, workspaceKey, isChoicePath, viewPath, type ChoiceView } from "./navigation";

export function blankDefinition(): Definition {
  return {
    name: "新题集",
    description: "",
    separator: "",
    dimensions: [{ code: "score", name: "得分", initial: 0, terms: [] }],
    questions: [],
    rules: []
  };
}
export const describeError = (error: unknown) => {
  if (isAxiosError(error) && typeof error.response?.data?.message === "string") return error.response.data.message;
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
};

function createState() {
  return reactive({
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
  });
}
// GinFast keys routed components by fullPath. Keep a single session per router
// so navigating the framework's separate menu pages does not lose edits.
const sessions: WeakMap<object, ReturnType<typeof createState>> = import.meta.hot?.data.choiceSessions || new WeakMap();
if (import.meta.hot) import.meta.hot.data.choiceSessions = sessions;
// Cached menu views share one timer, so one edit creates only one version.
const saveQueues = new WeakMap<object, { timer?: ReturnType<typeof setTimeout>; failed: string }>();
function createWorkspace() {
  const route = useRoute();
  const router = useRouter();

  if (!sessions.has(router)) sessions.set(router, createState());
  const state = sessions.get(router)!;
  const selectedId = choiceSelection(router);
  watch(
    () =>
      state.current && !state.pendingKey && state.loadedKey === String(state.current.set.id) ? state.current.set.id : undefined,
    id => {
      selectedId.value = id;
    },
    { immediate: true, flush: "sync" }
  );
  if (!saveQueues.has(state)) saveQueues.set(state, { failed: "" });
  const queue = saveQueues.get(state)!;
  function cancelAutoSave() {
    clearTimeout(queue.timer);
    queue.timer = undefined;
  }
  function reset() {
    cancelAutoSave();
    queue.failed = "";
    const generation = state.generation + 1;
    Object.assign(state, createState(), { generation });
  }
  const dirty = computed(() => !!state.draft && JSON.stringify(state.draft) !== state.baseline);
  const issues = computed(() => (state.draft ? draftIssues(state.draft) : []));
  const view = computed(() => resolveView(route.path, route.query));
  async function confirmDiscard(localOnly = false) {
    if (!state.editorDirty && (localOnly || !dirty.value)) return true;
    return new Promise<boolean>(resolve =>
      Modal.confirm({
        title: localOnly ? "离开当前选项？" : "离开当前题集？",
        maskClosable: true,
        onClose: () => resolve(false),
        content: localOnly
          ? "当前选项的编辑尚未确认，离开将放弃这次编辑，已应用到题集草稿的内容仍保留。"
          : "还有未保存的修改。切换编辑视图会保留它们，离开题集则会丢弃。",
        okText: "丢弃并离开",
        cancelText: "继续编辑",
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      })
    );
  }
  async function guard(to: { path: string; query: Record<string, unknown> }) {
    if (isChoicePath(to.path)) {
      const target = workspaceKey(to.query);
      if (!target && state.loadedKey && !state.busy && !["library", "history"].includes(resolveView(to.path, to.query)))
        return { path: to.path, query: { ...to.query, set: state.loadedKey } };
      if (state.busy) return target === state.loadedKey && !dirty.value;
      if (!target || target === state.loadedKey || target === state.pendingKey) return await confirmDiscard(true);
      if (dirty.value && !state.editorOpen && !(await persist(false, true, false))) return false;
      return !state.busy && (await confirmDiscard());
    }
    if (dirty.value && !state.busy && !state.editorOpen && !(await persist(false, true, false))) return false;
    if (state.busy || !(await confirmDiscard())) return false;
    reset();
    return true;
  }
  onBeforeRouteUpdate(guard);
  onBeforeRouteLeave(guard);
  function unload(e: BeforeUnloadEvent) {
    if (dirty.value || state.editorDirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  }
  window.addEventListener("beforeunload", unload);
  onBeforeUnmount(() => window.removeEventListener("beforeunload", unload));
  function install(detail: Detail) {
    state.current = detail;
    state.draft = JSON.parse(JSON.stringify(detail.version.definition));
    state.baseline = JSON.stringify(state.draft);
    state.saveFailed = false;
    queue.failed = "";
  }
  function acceptSaved(detail: Detail) {
    if (state.loadedKey === String(detail.set.id)) install(detail);
  }
  async function run(action: () => Promise<void>) {
    if (state.busy) return;
    state.busy = true;
    state.error = "";
    const generation = state.generation;
    try {
      await action();
    } catch (e) {
      if (generation === state.generation) state.error = describeError(e);
    } finally {
      if (generation === state.generation) state.busy = false;
    }
  }
  watch(
    () => workspaceKey(route.query),
    async key => {
      if (!isChoicePath(route.path) || !key || key === state.loadedKey || key === state.pendingKey) return;
      state.current = undefined;
      state.draft = undefined;
      state.baseline = "";
      state.loadedKey = "";
      state.error = "";
      state.saveFailed = false;
      state.pendingKey = key;
      const generation = state.generation;
      await run(async () => {
        if (queryText(route.query.set) === "new") {
          state.draft = blankDefinition();
          state.baseline = JSON.stringify(state.draft);
        } else {
          const id = Number(queryText(route.query.set));
          if (!Number.isSafeInteger(id) || id < 1) throw new Error("题集编号无效");
          const detail = await getSet(id);
          if (generation !== state.generation) return;
          install(detail);
        }
        if (generation === state.generation) state.loadedKey = key;
      });
      if (generation === state.generation) state.pendingKey = "";
    },
    { immediate: true }
  );
  function location(target: ChoiceView, query: Record<string, string> = {}) {
    return {
      path: viewPath(target),
      query
    };
  }
  function navigate(target: ChoiceView, query: Record<string, string> = {}) {
    return router.push(
      location(target, {
        ...(!["library", "history"].includes(target) && state.loadedKey ? { set: state.loadedKey } : {}),
        ...query
      })
    );
  }
  function openContent(set: string | number, target: ChoiceView, query: Record<string, string> = {}) {
    const destination = location(target, { set: String(set), ...query });
    if (route.path === destination.path && JSON.stringify(route.query) === JSON.stringify(destination.query)) {
      if (!state.editorOpen) state.focusRequest++;
      return Promise.resolve();
    }
    return router.push(destination);
  }
  function fixIssue(issue: DraftIssue) {
    return issue.question ? openOptions(issue.question) : navigate(issue.view);
  }
  function openOptions(code: string) {
    return router.push({
      path: viewPath("options"),
      query: { ...(state.loadedKey ? { set: state.loadedKey } : {}), question: code }
    });
  }
  function openSet(id: number, target: ChoiceView = "questions") {
    return openContent(id, target);
  }
  async function create() {
    if (state.loadedKey === "new") {
      if (!(await confirmDiscard())) return;
      state.draft = blankDefinition();
      state.current = undefined;
      state.baseline = JSON.stringify(state.draft);
      state.showIssues = false;
      state.error = "";
    }
    return openContent("new", "overview");
  }
  async function persist(startTest = false, automatic = false, updateRoute = true) {
    if (!state.draft || state.busy || state.editorOpen) return false;
    cancelAutoSave();
    if (startTest) {
      state.showIssues = true;
      if (issues.value.length) return false;
    }
    if (state.current && !dirty.value) {
      if (startTest) await navigate("preview", { test: "1" });
      return true;
    }
    let saved = false;
    const snapshot = JSON.stringify(state.draft);
    const generation = state.generation;
    await run(async () => {
      let detail: Detail;
      try {
        detail = await saveSet(state.current?.set.id, state.current?.version.id || 0, JSON.parse(snapshot));
      } catch (e) {
        queue.failed = snapshot;
        state.saveFailed = true;
        throw new Error(`保存失败，修改仍保留在当前页面：${describeError(e)}`);
      }
      if (generation !== state.generation) return;
      // Do not overwrite edits made while this request was in flight.
      if (JSON.stringify(state.draft) === snapshot) install(detail);
      else {
        state.current = detail;
        state.baseline = snapshot;
        state.saveFailed = false;
        queue.failed = "";
      }
      state.loadedKey = String(detail.set.id);
      if (updateRoute) {
        await router.replace({
          path: startTest ? viewPath("preview") : route.path,
          query: { ...(startTest ? { test: "1" } : route.query), set: String(detail.set.id) }
        });
      }
      state.showIssues = false;
      saved = true;
      if (!automatic) Message.success("保存成功");
    });
    return saved;
  }
  const save = () => persist();
  watch(
    () => [JSON.stringify(state.draft), state.loadedKey, state.pendingKey, state.busy, state.editorOpen] as const,
    ([snapshot]) => {
      cancelAutoSave();
      if (
        !isChoicePath(route.path) ||
        !state.draft ||
        !state.loadedKey ||
        state.pendingKey ||
        state.busy ||
        state.editorOpen ||
        !dirty.value
      )
        return;
      // Opening a new, untouched form must not create an empty set by itself.
      if (state.loadedKey === "new" && snapshot === JSON.stringify(blankDefinition())) return;
      if (snapshot === queue.failed) return;
      queue.timer = setTimeout(() => {
        if (isChoicePath(route.path)) void persist(false, true);
      }, 600);
    },
    { immediate: true, flush: "post" }
  );
  const startPreview = () => persist(true);
  async function publish() {
    if (!state.current || dirty.value || issues.value.length) return;
    await run(async () => {
      install(await publishSet(state.current!.set.id, state.current!.version.id));
      Message.success("题集已发布");
    });
  }
  async function archive() {
    if (!state.current) return;
    await run(async () => {
      await archiveSet(state.current!.set.id);
      state.baseline = JSON.stringify(state.draft);
    });
    if (!state.error) {
      reset();
      await navigate("library");
    }
  }
  return {
    state,
    acceptSaved,
    reset,
    dirty,
    issues,
    fixIssue,
    view,
    route,
    navigate,
    openSet,
    openContent,
    openOptions,
    create,
    save,
    startPreview,
    publish,
    archive,
    run
  };
}
type Workspace = ReturnType<typeof createWorkspace>;
const key: InjectionKey<Workspace> = Symbol.for("ginfast.choice.workspace");
export function provideChoice() {
  const workspace = createWorkspace();
  provide(key, workspace);
  return workspace;
}
export function useChoice() {
  const workspace = inject(key);
  if (!workspace) throw new Error("Choice workspace missing");
  return workspace;
}
