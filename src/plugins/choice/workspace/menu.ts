import type { ContentNode } from "./tree";
import { viewPath, viewTitles, resolveView, queryText } from "./navigation";

const prefix = "choice-content:";
export function menuKey(node: Pick<ContentNode, "view" | "set" | "query">): string {
  const query = new URLSearchParams();
  if (node.set) query.set("set", node.set);
  if (node.view === "overview") query.set("section", "details");
  if (node.view === "browse") query.set("all", "1");
  for (const [key, value] of Object.entries(node.query || {})) query.set(key, value);
  query.sort();
  return prefix + viewPath(node.view) + (query.size ? `?${query}` : "");
}
export function menuOpenKeys(route: { path: string; query: Record<string, unknown> }): string[] {
  const keys = ["choice-content-root"];
  const view = resolveView(route.path, route.query);
  const set = queryText(route.query.set);
  if (!set || view === "library" || view === "browse") return keys;
  const root = `choice-branch:set:${set}`;
  keys.push(root);
  if (view === "options" && queryText(route.query.question)) keys.push(`${root}:question:${queryText(route.query.question)}`);
  if (view === "dimensions" || view === "rules") keys.push(`${root}:${view}`);
  return keys;
}
export function menuTarget(key: string): string | undefined {
  if (!key.startsWith(prefix)) return;
  const target = key.slice(prefix.length);
  if (!Object.keys(viewTitles).some(view => target.split("?")[0] === viewPath(view as keyof typeof viewTitles))) return;
  return target;
}
