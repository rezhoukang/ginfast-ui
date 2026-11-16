import type { Component } from "vue";
import { useRouter } from "vue-router";

export interface MenuExtension {
  path: string;
  component: Component;
  selectedKey: (route: { path: string; query: Record<string, unknown> }) => string | undefined;
  openKeys: (route: { path: string; query: Record<string, unknown> }) => string[];
  expand?: (key: string, router: ReturnType<typeof useRouter>) => void;
  select: (key: string, router: ReturnType<typeof useRouter>) => boolean;
}
// Optional plugins can extend their own authorized menu entry without changing
// the persisted route tree, or becoming a hard dependency of the host layout.
const modules = import.meta.glob<{ default: MenuExtension }>("@/plugins/*/menu-extension.ts", { eager: true });
export const menuExtensions = Object.values(modules).map(module => module.default);
export const menuExtension = (path: string) => menuExtensions.find(extension => extension.path === path);
