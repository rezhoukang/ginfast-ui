import { computed, inject, onBeforeUnmount, provide, reactive, watch, type InjectionKey } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";
import { Message, Modal } from "@arco-design/web-vue";
import { getSet, listSets, saveSet, publishSet, archiveSet, type Definition, type Detail, type ChoiceSet } from "../api/choice";
import { draftIssues, type DraftIssue } from "./readiness";
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
export const describeError = (error: unknown) => (error instanceof Error ? error.message : "请求失败，请稍后重试");

function createState() {
  return reactive({
    scope: "",
    generation: 0,
    current: undefined as Detail | undefined,
    draft: undefined as Definition | undefined,
    baseline: "",
    loadedKey: "",
    pendingKey: "",
    busy: false,
    error: "",
    showIssues: false,
    catalog: [] as ChoiceSet[],
    details: {} as Record<string, Detail>,
    catalogPage: 0,
    catalogTotal: 0,
    catalogBusy: false,
    catalogError: "",
    expandedKeys: [] as string[],
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
function createWorkspace(registerGuards = true) {
  const route = useRoute();
  const router = useRouter();

  if (!sessions.has(router)) sessions.set(router, createState());
  const state = sessions.get(router)!;
  function reset(scope = state.scope) {
    const generation = state.generation + 1;
    Object.assign(state, createState(), { scope, generation });
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
      if (!target && state.loadedKey && !state.busy && !["library", "browse", "history"].includes(resolveView(to.path, to.query)))
        return { path: to.path, query: { ...to.query, set: state.loadedKey } };
      if (state.busy) return target === state.loadedKey && !dirty.value;
      if (!target || target === state.loadedKey || target === state.pendingKey) return await confirmDiscard(true);
      return !state.busy && (await confirmDiscard());
    }
    if (state.busy || !(await confirmDiscard())) return false;
    reset();
    return true;
  }
  if (registerGuards) {
    onBeforeRouteUpdate(guard);
    onBeforeRouteLeave(guard);
  }
  function unload(e: BeforeUnloadEvent) {
    if (dirty.value || state.editorDirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  }
  if (registerGuards) {
    window.addEventListener("beforeunload", unload);
    onBeforeUnmount(() => window.removeEventListener("beforeunload", unload));
  }
  function install(detail: Detail) {
    state.current = detail;
    state.details[String(detail.set.id)] = detail;
    const catalogIndex = state.catalog.findIndex(s => s.id === detail.set.id);
    if (catalogIndex >= 0) state.catalog[catalogIndex] = detail.set;
    else state.catalog.unshift(detail.set);
    state.draft = JSON.parse(JSON.stringify(detail.version.definition));
    state.baseline = JSON.stringify(state.draft);
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
    () => [workspaceKey(route.query), state.scope] as const,
    async ([key]) => {
      if (!isChoicePath(route.path) || !key || key === state.loadedKey || key === state.pendingKey) return;
      state.current = undefined;
      state.draft = undefined;
      state.baseline = "";
      state.loadedKey = "";
      state.error = "";
      state.pendingKey = key;
      const generation = state.generation;
      await run(async () => {
        if (queryText(route.query.set) === "new") state.draft = blankDefinition();
        else {
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
      query: { ...(target === "overview" ? { section: "details" } : {}), ...(target === "browse" ? { all: "1" } : {}), ...query }
    };
  }
  function navigate(target: ChoiceView, query: Record<string, string> = {}) {
    return router.push(
      location(target, {
        ...(!["library", "browse", "history"].includes(target) && state.loadedKey ? { set: state.loadedKey } : {}),
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
  async function loadCatalog(reset = false) {
    if (state.catalogBusy) return;
    state.catalogBusy = true;
    state.catalogError = "";
    const generation = state.generation;
    try {
      const page = reset ? 1 : state.catalogPage + 1;
      const data = await listSets(page);
      if (generation !== state.generation) return;
      const merged = new Map((reset ? [] : state.catalog).map(s => [s.id, s]));
      (data.list || []).forEach(s => merged.set(s.id, s));
      if (state.current) merged.set(state.current.set.id, state.current.set);
      state.catalog = [...merged.values()];
      state.catalogPage = page;
      state.catalogTotal = data.total;
      if (reset) state.details = state.current ? { [state.current.set.id]: state.current } : {};
    } catch (e) {
      if (generation === state.generation) state.catalogError = describeError(e);
    } finally {
      if (generation === state.generation) state.catalogBusy = false;
    }
  }
  async function loadTreeSet(id: number) {
    if (!state.details[id]) {
      try {
        state.details[id] = await getSet(id);
      } catch (e) {
        state.catalogError = describeError(e);
        throw e;
      }
    }
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
      state.baseline = "";
      state.showIssues = false;
      state.error = "";
    }
    return openContent("new", "overview");
  }
  async function persist(startTest = false) {
    if (!state.draft || state.busy || state.editorOpen) return false;
    state.showIssues = true;
    if (issues.value.length) return false;
    if (state.current && !dirty.value) {
      if (startTest) await navigate("preview", { test: "1" });
      return true;
    }
    let saved = false;
    await run(async () => {
      const detail = await saveSet(state.current?.set.id, state.current?.version.id || 0, state.draft!);
      install(detail);
      state.loadedKey = String(detail.set.id);
      await router.replace({
        path: startTest ? viewPath("preview") : route.path,
        query: { ...(startTest ? { test: "1" } : route.query), set: String(detail.set.id) }
      });
      state.showIssues = false;
      saved = true;
      Message.success("草稿已保存");
    });
    return saved;
  }
  const save = () => persist();
  const startPreview = () => persist(true);
  async function publish() {
    if (!state.current || dirty.value) return;
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
    reset,
    dirty,
    issues,
    fixIssue,
    view,
    route,
    navigate,
    openSet,
    openContent,
    loadCatalog,
    loadTreeSet,
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

// The main navigation shares state, but route guards belong only to the page.
export const useChoiceNavigation = () => createWorkspace(false);
// Arrow expansion loads only navigation data, without switching or replacing a draft.
export async function loadChoiceNavigationSet(router: ReturnType<typeof useRouter>, id: number) {
  const state = sessions.get(router);
  if (!state || state.details[id]) return;
  const generation = state.generation;
  try {
    const detail = await getSet(id);
    if (generation === state.generation) state.details[id] = detail;
  } catch (error) {
    if (generation === state.generation) state.catalogError = describeError(error);
  }
}
export function reopenChoiceContent(router: ReturnType<typeof useRouter>, target: string) {
  const resolved = router.resolve(target);
  const current = router.currentRoute.value;
  const sorted = (query: Record<string, unknown>) => JSON.stringify(Object.entries(query).sort(([a], [b]) => a.localeCompare(b)));
  if (resolved.path !== current.path || sorted(resolved.query) !== sorted(current.query)) return false;
  const state = sessions.get(router);
  if (state && !state.editorOpen) state.focusRequest++;
  return true;
}
