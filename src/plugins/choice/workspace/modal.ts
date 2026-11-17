import type { CSSProperties } from "vue";

// Shared only by Choice dialogs; keep the host's modal defaults untouched.
export const choiceModalLayout: { modalStyle: CSSProperties; bodyStyle: CSSProperties } = {
  modalStyle: {
    height: "min(640px, calc(100dvh - 48px))",
    display: "inline-flex",
    flexDirection: "column"
  },
  bodyStyle: {
    flex: "1 1 0%",
    minHeight: "0",
    overflow: "auto"
  }
};
