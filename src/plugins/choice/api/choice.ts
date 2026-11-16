import { http } from "@/utils/http";
import { baseUrlApi } from "@/api/utils";
import type { BaseResult } from "@/api/types";

export interface Term {
  dimension: string;
  weight: number;
}
export interface Dimension {
  code: string;
  name: string;
  initial: number;
  terms: Term[];
}
export interface Effect {
  dimension: string;
  delta: number;
}
export interface Option {
  id?: number;
  code: string;
  text: string;
  value?: boolean;
  correct?: boolean;
  effects: Effect[];
}
export interface Question {
  id?: number;
  code: string;
  title: string;
  kind: "single" | "multiple" | "boolean";
  required: boolean;
  options: Option[];
}
export interface Condition {
  dimension: string;
  operator: string;
  value: number;
  compareTo?: string;
}
export interface Rule {
  group: string;
  code: string;
  name: string;
  description: string;
  mode: "all" | "any";
  conditions: Condition[];
}
export interface Definition {
  name: string;
  description: string;
  separator: string;
  dimensions: Dimension[];
  questions: Question[];
  rules: Rule[];
}
export interface ChoiceSet {
  id: number;
  name: string;
  currentVersionId: number;
  publishedVersionId: number;
}
export interface Detail {
  set: ChoiceSet;
  version: { id: number; setId: number; publishedAt: string | null; definition: Definition };
}
export interface Answer {
  questionId: number;
  optionIds: number[];
}
export interface Result {
  dimensions: Record<string, number>;
  derived: Record<string, number>;
  matches: { group: string; code: string; name: string; description: string }[];
  code: string;
  answered: number;
  correctQuestions: number;
  gradedQuestions: number;
}
export interface Attempt {
  id: number;
  setId: number;
  versionId: number;
  result: Result;
}

async function request<T>(
  method: "get" | "post" | "put" | "delete",
  path: string,
  data?: unknown,
  params?: Record<string, string | number>
) {
  const res = await http.request<BaseResult<T>>(method, baseUrlApi(`plugins/choice${path}`), { data, params });
  if (res.code !== 0) throw new Error(res.message || "操作失败");
  return res.data;
}
export const listSets = (pageNum: number) =>
  request<{ list: ChoiceSet[]; total: number }>("get", "/sets", undefined, { pageNum, pageSize: 20 });
export const getSet = (id: number) => request<Detail>("get", `/sets/${id}`);
export const saveSet = (id: number | undefined, expectedVersionId: number, definition: Definition) =>
  request<Detail>(id ? "put" : "post", id ? `/sets/${id}` : "/sets", { expectedVersionId, definition });
export const publishSet = (id: number, expectedVersionId: number) =>
  request<Detail>("post", `/sets/${id}/publish`, { expectedVersionId });
export const archiveSet = (id: number) => request<null>("delete", `/sets/${id}`);
export const playSet = (id: number) => request<Detail>("get", `/sets/${id}/play`);
export const preview = (setId: number, versionId: number, answers: Answer[]) =>
  request<Result>("post", "/preview", { setId, versionId, answers });
export const submit = (setId: number, versionId: number, requestKey: string, answers: Answer[]) =>
  request<Attempt>("post", "/attempts", { setId, versionId, requestKey, answers });
export const getAttempt = (id: number) => request<Attempt>("get", `/attempts/${id}`);

export type BrowseKind = "questions" | "options" | "dimensions" | "rules";
export interface BrowseItem {
  id: number;
  setId: number;
  setName: string;
  code: string;
  title: string;
  questionCode: string;
  questionTitle: string;
  group?: string;
}
export const browseItems = (kind: BrowseKind, pageNum: number) =>
  request<{ list: BrowseItem[]; total: number }>("get", "/browse", undefined, { kind, pageNum, pageSize: 20 });
