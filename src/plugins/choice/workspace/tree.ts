import type { TreeNodeData } from "@arco-design/web-vue/es/tree/interface";
import type { ChoiceSet, Definition } from "../api/choice";
import type { ChoiceView } from "./navigation";
export interface ContentNode extends TreeNodeData {
  key: string;
  set?: string;
  view: ChoiceView;
  query?: Record<string, string>;
  children?: ContentNode[];
}
export function setNode(set: Pick<ChoiceSet, "name"> & { id: string | number }, definition?: Definition): ContentNode {
  const id = String(set.id);
  const root = `set:${id}`;
  const node = (
    key: string,
    title: string,
    view: ChoiceView,
    query?: Record<string, string>,
    children?: ContentNode[]
  ): ContentNode => ({ key: `${root}:${key}`, title, set: id, view, query, children, isLeaf: !children });
  return {
    key: root,
    title: definition?.name || set.name,
    set: id,
    view: "questions",
    isLeaf: false,
    children: definition
      ? [
          node("details", "题集信息", "overview"),
          node(
            "questions",
            `题目（${definition.questions.length}）`,
            "questions",
            undefined,
            definition.questions.map(q =>
              node(
                `question:${q.code}`,
                `${q.code} · ${q.title || "未填写题目"}`,
                "options",
                { question: q.code },
                q.options.map(o =>
                  node(`question:${q.code}:option:${o.code}`, `${o.code} · ${o.text || "未填写选项"}`, "options", {
                    question: q.code,
                    option: o.code
                  })
                )
              )
            )
          ),
          node(
            "dimensions",
            `维度（${definition.dimensions.length}）`,
            "dimensions",
            undefined,
            definition.dimensions.map(d => node(`dimension:${d.code}`, d.name || d.code, "dimensions", { item: d.code }))
          ),
          node(
            "rules",
            `结果规则（${definition.rules.length}）`,
            "rules",
            undefined,
            definition.rules.map(r =>
              node(`rule:${r.group}/${r.code}`, r.name || r.code, "rules", { item: `${r.group}/${r.code}` })
            )
          ),
          node("preview", "预览与发布", "preview")
        ]
      : undefined
  };
}
export function selectedTreeKey(view: ChoiceView, set: string, query: Record<string, unknown>): string {
  if (view === "library" || view === "browse") return "all";
  if (!set) return "";
  const root = `set:${set}`;
  if (view === "overview") return `${root}:details`;
  if (view === "options" && typeof query.question === "string")
    return `${root}:question:${query.question}${typeof query.option === "string" ? `:option:${query.option}` : ""}`;
  if (view === "dimensions" && typeof query.item === "string") return `${root}:dimension:${query.item}`;
  if (view === "rules" && typeof query.item === "string") return `${root}:rule:${query.item}`;
  return `${root}:${view}`;
}
