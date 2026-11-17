import { effectScope, ref } from "vue";
import { describe, expect, it } from "vitest";
import { useChoicePagination } from "./useChoicePagination";

describe("Choice draft pagination", () => {
  it("maps later-page edits and deletions to the full draft and clamps an emptied last page", () => {
    const scope = effectScope();
    scope.run(() => {
      const rows = ref(Array.from({ length: 11 }, (_, i) => ({ code: `Q${i + 1}`, title: "original" })));
      const pages = useChoicePagination(() => rows.value.length, 5);
      pages.bindings.onPageChange(2);
      rows.value[pages.index(0)].title = "edited";
      expect(rows.value[5].title).toBe("edited");
      expect(rows.value[0].title).toBe("original");
      rows.value.splice(pages.index(1), 1);
      expect(rows.value.map(row => row.code)).not.toContain("Q7");
      expect(rows.value[1].code).toBe("Q2");
      pages.bindings.onPageChange(2);
      while (rows.value.length > 5) rows.value.splice(pages.index(0), 1);
      expect(pages.bindings.pagination.current).toBe(1);
      expect(rows.value.map(row => row.code)).toEqual(["Q1", "Q2", "Q3", "Q4", "Q5"]);
    });
    scope.stop();
  });

  it("keeps the full draft while revealing additions and moves across pages", () => {
    const scope = effectScope();
    scope.run(() => {
      const rows = ref(Array.from({ length: 10 }, (_, i) => i));
      const pages = useChoicePagination(() => rows.value.length, 5);
      rows.value.push(10);
      expect(pages.bindings.pagination.current).toBe(3);
      expect(pages.index(0)).toBe(10);
      pages.bindings.onPageSizeChange(10);
      expect(pages.bindings.pagination.current).toBe(2);
      const i = pages.index(0);
      [rows.value[i - 1], rows.value[i]] = [rows.value[i], rows.value[i - 1]];
      pages.reveal(i - 1);
      expect(pages.bindings.pagination.current).toBe(1);
      expect(rows.value[9]).toBe(10);
      expect(rows.value.length).toBe(11);
      rows.value = [];
      expect(pages.bindings.pagination.current).toBe(1);
      expect(pages.bindings.pagination.total).toBe(0);
    });
    scope.stop();
  });
});
