import { computed, reactive, ref, watch } from "vue";

// Arco receives the complete draft and performs display-only pagination.
export function useChoicePagination(length: () => number, initialSize = 10) {
  const current = ref(1);
  const pageSize = ref(initialSize);
  const lastPage = () => Math.max(1, Math.ceil(length() / pageSize.value));
  const changePage = (page: number) => (current.value = Math.max(1, Math.min(page, lastPage())));
  const index = (rowIndex: number) => (current.value - 1) * pageSize.value + rowIndex;
  const reveal = (rowIndex: number) => changePage(Math.floor(Math.max(0, rowIndex) / pageSize.value) + 1);
  const changeSize = (size: number) => {
    const first = index(0);
    pageSize.value = size;
    reveal(first);
  };
  watch(length, (count, previous) => {
    if (count > previous) reveal(count - 1);
    else changePage(current.value);
  }, { flush: "sync" });
  const bindings = computed(() => ({
    pagination: {
      current: current.value,
      pageSize: pageSize.value,
      total: length(),
      showTotal: true,
      showPageSize: true,
      pageSizeOptions: [5, 10, 20, 50],
      showJumper: true
    },
    onPageChange: changePage,
    onPageSizeChange: changeSize
  }));
  return reactive({ bindings, index, reveal, reset: () => changePage(1) });
}
