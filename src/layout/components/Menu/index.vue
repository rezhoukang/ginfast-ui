<template>
  <a-menu
    :breakpoint="layoutType != 'layoutHead' ? 'xl' : undefined"
    :mode="'vertical'"
    :theme="asideDark ? 'dark' : 'light'"
    :collapsed="collapsed"
    :auto-scroll-into-view="true"
    :auto-open-selected="true"
    :accordion="isAccordion"
    :selected-keys="[selectedMenu]"
    v-model:open-keys="openKeys"
    @menu-item-click="onMenuItem"
    @sub-menu-click="onSubMenu"
  >
    <MenuItem :route-tree="props.routeTree" />
  </a-menu>
</template>

<script setup lang="ts">
import { menuExtensions } from "./extensions";
import MenuItem from "@/layout/components/Menu/menu-item.vue";
import { useRoutingMethod } from "@/hooks/useRoutingMethod";
import { storeToRefs } from "pinia";
import { useThemeConfig } from "@/store/modules/theme-config";
const route = useRoute();
const router = useRouter();
const themeStore = useThemeConfig();
const { collapsed, isAccordion, layoutType, asideDark } = storeToRefs(themeStore);

interface Props {
  routeTree: Menu.MenuOptions[];
}
// props的数据类型
// type类型参考：https://cn.vuejs.org/guide/typescript/composition-api.html#typing-component-props
const props = withDefaults(defineProps<Props>(), {
  routeTree: () => []
});

const onMenuItem = (path: string) => {
  if (!menuExtensions.some(extension => extension.select(path, router))) void router.push(path);
};
const onSubMenu = (key: string) => menuExtensions.forEach(extension => extension.expand?.(key, router));

const selectedMenu = computed(() => {
  for (const extension of menuExtensions) {
    const key = extension.selectedKey(route);
    if (key) return key;
  }
  const { getAllParentRoute } = useRoutingMethod();
  const find = getAllParentRoute(route.matched.at(-1).path);
  if (!find) return "";
  let path = "";
  for (let i = find.length - 1; i >= 0; i--) {
    if (find[i].meta && !find[i].meta.hide) {
      path = find[i].path;
      break;
    }
  }
  return path;
});
const openKeys = ref<string[]>();
watch(
  selectedMenu,
  () => {
    const extension = menuExtensions.find(item => item.selectedKey(route));
    if (!extension) return;
    const parents = useRoutingMethod().getAllParentRoute(extension.path) || [];
    openKeys.value = [
      ...new Set([
        ...(openKeys.value || []),
        ...parents.filter(item => item.path !== extension.path).map(item => item.path),
        ...extension.openKeys(route)
      ])
    ];
  },
  { immediate: true }
);
</script>

<style lang="scss" scoped></style>
