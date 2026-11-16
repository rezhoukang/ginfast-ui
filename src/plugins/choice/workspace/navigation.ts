export const viewTitles = {
  library: "题集管理",
  overview: "题集设置",
  questions: "题目管理",
  options: "选项管理",
  dimensions: "变量管理",
  rules: "组合结论",
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
  return `/choice/${view === "library" ? "sets" : view}`;
}
export function resolveView(path: string, query: Record<string, unknown>): ChoiceView {
  const segment = path.split("/").pop() || "";
  if (segment === "sets") return query.section === "details" || query.set === "new" ? "overview" : "library";
  if (segment in viewTitles) return segment as ChoiceView;
  const legacy = queryText(query.view);
  return legacy in viewTitles ? (legacy as ChoiceView) : "library";
}
export function workspaceKey(query: Record<string, unknown>): string {
  const id = queryText(query.set);
  return id;
}
