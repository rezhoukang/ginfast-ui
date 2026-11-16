import { createRenderer, defineComponent, h, nextTick } from "vue";
import { createMemoryHistory, createRouter, RouterView } from "vue-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { provideChoice, blankDefinition } from "./context";
import { getSet, saveSet } from "../api/choice";
import { Modal } from "@arco-design/web-vue";
vi.mock("../api/choice", () => ({
  getSet: vi.fn(),
  saveSet: vi.fn(),
  publishSet: vi.fn(),
  archiveSet: vi.fn()
}));
vi.mock("@arco-design/web-vue", () => ({ Message: { success: vi.fn() }, Modal: { confirm: vi.fn() } }));
// Match the host: every fullPath gets a fresh routed component instance.
const renderer = createRenderer<any, any>({
  createElement: () => ({}),
  createText: () => ({}),
  createComment: () => ({}),
  insert: () => {},
  remove: () => {},
  setText: () => {},
  setElementText: () => {},
  patchProp: () => {},
  parentNode: () => null,
  nextSibling: () => null
});
let workspace: ReturnType<typeof provideChoice>;
function completeDraft() {
  workspace.state.draft!.questions = [
    {
      code: "Q1",
      title: "选择一项",
      kind: "single",
      required: true,
      options: [
        { code: "a", text: "第一项", effects: [] },
        { code: "b", text: "第二项", effects: [] }
      ]
    }
  ];
}
let dispose: (() => void) | undefined;
async function mount(path = "/choice/overview?set=new") {
  const page = defineComponent({
    setup() {
      workspace = provideChoice();
      return () => h("div");
    }
  });
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      ...["overview", "sets", "questions", "options", "dimensions", "rules", "preview", "history"].map(key => ({
        path: `/choice/${key}`,
        component: page
      })),
      { path: "/outside", component: defineComponent({ render: () => h("div") }) }
    ]
  });
  await router.push(path);
  await router.isReady();
  const app = renderer.createApp(
    defineComponent({
      setup: () => {
        return () =>
          h(RouterView, null, {
            default: ({ Component, route }: any) => (Component ? h(Component, { key: route.fullPath }) : null)
          });
      }
    })
  );
  app.use(router);
  app.mount({});
  dispose = () => app.unmount();
  await flush();
  return router;
}
async function flush() {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
    await nextTick();
  }
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("window", { addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(() => {
  dispose?.();
  vi.unstubAllGlobals();
});
describe("Choice framework page navigation", () => {
  it("retains the same unsaved draft across menu pages and the set library", async () => {
    const router = await mount();
    workspace.state.draft!.name = "保留草稿";
    const draft = workspace.state.draft;
    await router.push("/choice/questions");
    await flush();
    expect(workspace.view.value).toBe("questions");
    expect(workspace.state.draft).toBe(draft);
    await router.push("/choice/sets");
    await router.push("/choice/dimensions");
    await flush();
    expect(workspace.state.draft!.name).toBe("保留草稿");
    expect(Modal.confirm).not.toHaveBeenCalled();
  });
  it("canceling a set switch or leaving the plugin preserves the draft", async () => {
    const router = await mount();
    workspace.state.draft!.name = "未保存";
    vi.mocked(Modal.confirm).mockImplementation((options: any) => {
      options.onCancel();
      return {} as any;
    });
    await router.push("/choice/overview?set=2");
    await flush();
    expect(workspace.state.draft!.name).toBe("未保存");
    expect(getSet).not.toHaveBeenCalled();
    await router.push("/outside");
    expect(router.currentRoute.value.path).toBe("/choice/overview");
  });
  it("saving a new set changes its ID without reloading or discarding the definition", async () => {
    const router = await mount();
    workspace.state.draft!.name = "保存题集";
    completeDraft();
    const definition = JSON.parse(JSON.stringify(workspace.state.draft));
    vi.mocked(saveSet).mockResolvedValue({
      set: { id: 12, name: definition.name, currentVersionId: 7, publishedVersionId: 0 },
      version: { id: 7, setId: 12, publishedAt: null, definition }
    });
    await workspace.save();
    await flush();
    expect(router.currentRoute.value.query.set).toBe("12");
    expect(workspace.dirty.value).toBe(false);
    expect(workspace.state.draft!.name).toBe("保存题集");
    expect(getSet).not.toHaveBeenCalled();
    await router.push("/choice/rules");
    await flush();
    expect(workspace.state.current!.version.id).toBe(7);
    expect(router.currentRoute.value.query.set).toBe("12");
  });
  it("keeps question selection and option edits when saving from the options page", async () => {
    const router = await mount();
    completeDraft();
    await workspace.openOptions("Q1");
    await flush();
    expect(workspace.view.value).toBe("options");
    workspace.state.draft!.questions[0].options[0].text = "独立编辑选项";
    const definition = JSON.parse(JSON.stringify(workspace.state.draft));
    vi.mocked(saveSet).mockResolvedValue({
      set: { id: 12, name: definition.name, currentVersionId: 7, publishedVersionId: 0 },
      version: { id: 7, setId: 12, publishedAt: null, definition }
    });
    await workspace.save();
    await flush();
    expect(router.currentRoute.value.query).toMatchObject({ set: "12", question: "Q1" });
    await workspace.navigate("questions");
    await flush();
    expect(workspace.state.draft!.questions[0].options[0].text).toBe("独立编辑选项");
    expect(Modal.confirm).not.toHaveBeenCalled();
  });
  it("closing the discard confirmation cancels navigation", async () => {
    const router = await mount();
    vi.mocked(Modal.confirm).mockImplementation((options: any) => {
      expect(options.maskClosable).toBe(true);
      options.onClose();
      return {} as any;
    });
    await router.push("/outside");
    expect(router.currentRoute.value.path).toBe("/choice/overview");
    expect(workspace.state.draft).toBeDefined();
  });
  it("loads a directly linked set and blocks navigation while it is loading", async () => {
    let finish!: (value: any) => void;
    vi.mocked(getSet).mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      })
    );
    const router = await mount("/choice/questions?set=5");
    await router.push("/choice/overview?set=6");
    expect(router.currentRoute.value.query.set).toBe("5");
    finish({
      set: { id: 5, name: "链接题集", currentVersionId: 9, publishedVersionId: 0 },
      version: { id: 9, setId: 5, publishedAt: null, definition: blankDefinition() }
    });
    await flush();
    expect(workspace.state.current!.set.id).toBe(5);
    expect(getSet).toHaveBeenCalledTimes(1);
  });
  it("blocks incomplete saves and links directly to the unfinished question", async () => {
    const router = await mount();
    completeDraft();
    workspace.state.draft!.questions[0].options[0].text = "";
    expect(await workspace.save()).toBe(false);
    expect(saveSet).not.toHaveBeenCalled();
    await workspace.fixIssue(workspace.issues.value[0]);
    await flush();
    expect(router.currentRoute.value.query).toMatchObject({ set: "new", question: "Q1" });
  });
  it("saves once before opening preview and stays put when saving fails", async () => {
    const router = await mount();
    completeDraft();
    vi.mocked(saveSet).mockRejectedValueOnce(new Error("保存失败"));
    await workspace.startPreview();
    expect(router.currentRoute.value.path).toBe("/choice/overview");
    const definition = JSON.parse(JSON.stringify(workspace.state.draft));
    vi.mocked(saveSet).mockResolvedValue({
      set: { id: 12, name: definition.name, currentVersionId: 7, publishedVersionId: 0 },
      version: { id: 7, setId: 12, publishedAt: null, definition }
    });
    await workspace.startPreview();
    await flush();
    expect(router.currentRoute.value.path).toBe("/choice/preview");
    expect(router.currentRoute.value.query).toMatchObject({ set: "12", test: "1" });
    await workspace.startPreview();
    expect(saveSet).toHaveBeenCalledTimes(2);
  });
  it("starting another new set asks before replacing the current new draft", async () => {
    await mount();
    workspace.state.draft!.name = "保留原稿";
    vi.mocked(Modal.confirm).mockImplementation((options: any) => {
      options.onCancel();
      return {} as any;
    });
    await workspace.create();
    expect(workspace.state.draft!.name).toBe("保留原稿");
    vi.mocked(Modal.confirm).mockImplementation((options: any) => {
      options.onOk();
      return {} as any;
    });
    await workspace.create();
    expect(workspace.state.draft!.name).toBe("新题集");
    expect(workspace.state.draft!.questions).toEqual([]);
  });
  it("protects unconfirmed option edits when selecting a different menu page", async () => {
    const router = await mount();
    workspace.state.editorOpen = true;
    workspace.state.editorDirty = true;
    vi.mocked(Modal.confirm).mockImplementation((options: any) => {
      options.onCancel();
      return {} as any;
    });
    await workspace.navigate("dimensions");
    expect(router.currentRoute.value.path).toBe("/choice/overview");
    expect(await workspace.save()).toBe(false);
    expect(saveSet).not.toHaveBeenCalled();
  });
});
