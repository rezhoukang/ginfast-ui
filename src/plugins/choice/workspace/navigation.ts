export const viewTitles = {
  library: "题集管理",
  overview: "题集详情",
  browse: "查看全部",
  questions: "题目管理",
  options: "选项管理",
  dimensions: "维度配置",
  rules: "结果规则",
  preview: "预览与发布",
  history: "历史答卷",
  take: "正式测评"
};
export type ChoiceView = keyof typeof viewTitles;
export function queryText(value: unknown): string {
  return typeof value === "string" ? value : "";
}
export function isChoicePath(path: string) {
  return path === "/choice" || path.startsWith("/choice/");
}
export function viewPath(view: ChoiceView) {
  return `/choice/${["library", "overview", "browse"].includes(view) ? "sets" : view}`;
}
export function resolveView(path: string, query: Record<string, unknown>): ChoiceView {
  const segment = path.split("/").pop() || "";
  if (segment === "sets")
    return query.all === "1" ? "browse" : query.section === "details" || query.set === "new" ? "overview" : "library";
  if (segment in viewTitles) return segment as ChoiceView;
  const legacy = queryText(query.view);
  return legacy in viewTitles ? (legacy as ChoiceView) : "library";
}
export function workspaceKey(query: Record<string, unknown>): string {
  const id = queryText(query.set);
  return id;
}
