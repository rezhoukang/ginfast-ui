import { defineAsyncComponent } from "vue";
import type { MenuExtension } from "@/layout/components/Menu/extensions";
import { isChoicePath, resolveView, queryText } from "./workspace/navigation";
import { menuKey, menuTarget, menuOpenKeys } from "./workspace/menu";
import { reopenChoiceContent, loadChoiceNavigationSet } from "./workspace/context";

export default {
  path: "/choice/sets",
  component: defineAsyncComponent(() => import("./components/NavigationMenu.vue")),
  openKeys: menuOpenKeys,
  expand(key, router) {
    const match = /^choice-branch:set:(\d+)$/.exec(key);
    if (match) void loadChoiceNavigationSet(router, Number(match[1]));
  },
  selectedKey(route) {
    if (!isChoicePath(route.path)) return;
    const view = resolveView(route.path, route.query);
    if (view === "history" || view === "take") return;
    if (view === "library" || view === "browse") return menuKey({ view: "library" });
    const query: Record<string, string> = {};
    for (const key of ["question", "option", "item"]) if (queryText(route.query[key])) query[key] = queryText(route.query[key]);
    return menuKey({ view, set: queryText(route.query.set), query });
  },
  select(key, router) {
    const target = menuTarget(key);
    if (!target) return false;
    if (!reopenChoiceContent(router, target)) void router.push(target);
    return true;
  }
} satisfies MenuExtension;
