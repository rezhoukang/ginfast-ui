import { isAxiosError } from "axios";

export const describeError = (error: unknown) => {
  if (isAxiosError(error) && typeof error.response?.data?.message === "string") return error.response.data.message;
  return error instanceof Error ? error.message : "请求失败，请稍后重试";
};
