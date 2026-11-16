<template>
  <template v-for="item in props.routeTree" :key="item.path">
    <a-menu-item
      v-if="menuShow(item) && choiceMenuLocked(item.path, selectedChoiceId)"
      :key="item.path"
      disabled
      title="请先在题集列表选择题集"
    >
      <template #icon v-if="item.meta.svgIcon || item.meta.icon">
        <MenuItemIcon :svg-icon="item.meta.svgIcon" :icon="item.meta.icon" />
      </template>
      <span>{{ $t(`menu.${item.meta.title}`) }}</span>
    </a-menu-item>
    <a-sub-menu v-else-if="menuShow(item)" :key="item.path">
      <template #icon v-if="item.meta.svgIcon || item.meta.icon">
        <MenuItemIcon :svg-icon="item.meta.svgIcon" :icon="item.meta.icon" />
      </template>
      <template #title>{{ $t(`menu.${item.meta.title}`) }}</template>
      <MenuItem :route-tree="item.children || []" />
    </a-sub-menu>
    <a-menu-item v-else-if="aMenuShow(item)" :key="item?.path">
      <template #icon v-if="item.meta.svgIcon || item.meta.icon">
        <MenuItemIcon :svg-icon="item.meta.svgIcon" :icon="item.meta.icon" />
      </template>
      <span>{{ $t(`menu.${item.meta.title}`) }}</span>
    </a-menu-item>
  </template>
</template>

<script setup lang="ts">
import MenuItem from "@/layout/components/Menu/menu-item.vue";
import MenuItemIcon from "@/layout/components/Menu/menu-item-icon.vue";
import { useMenuMethod } from "@/hooks/useMenuMethod";
import { useRouter } from "vue-router";
import { choiceMenuLocked, choiceSelection } from "@/plugins/choice/workspace/selection";
const selectedChoiceId = choiceSelection(useRouter());
defineOptions({ name: "MenuItem", inheritAttrs: false });

interface Props {
  routeTree: Menu.MenuOptions[];
}
// props的数据类型
// type类型参考：https://cn.vuejs.org/guide/typescript/composition-api.html#typing-component-props
const props = withDefaults(defineProps<Props>(), {
  routeTree: () => []
});

const { menuShow, aMenuShow } = useMenuMethod();
</script>

<style lang="scss" scoped></style>
