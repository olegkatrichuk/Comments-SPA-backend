import axios from "axios";
import type {
  CaptchaData,
  Comment,
  CreateCommentData,
  PagedResult,
  SortDirection,
  SortField,
} from "./types";

const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    Accept: "application/json",
  },
});

export async function getComments(
  page: number = 1,
  pageSize: number = 25,
  sortField: SortField = "CreatedAt",
  sortDirection: SortDirection = "Descending"
): Promise<PagedResult<Comment>> {
  const { data } = await apiClient.get<PagedResult<Comment>>("/comments", {
    params: {
      page,
      pageSize,
      sortField,
      sortDirection,
    },
  });
  return data;
}

export async function getCommentById(id: string): Promise<Comment> {
  const { data } = await apiClient.get<Comment>(`/comments/${id}`);
  return data;
}

export async function createComment(
  commentData: CreateCommentData
): Promise<Comment> {
  const formData = new FormData();
  formData.append("userName", commentData.userName);
  formData.append("email", commentData.email);
  formData.append("text", commentData.text);
  formData.append("captchaKey", commentData.captchaKey);
  formData.append("captchaAnswer", commentData.captchaAnswer);

  if (commentData.homePage) {
    formData.append("homePage", commentData.homePage);
  }

  if (commentData.parentCommentId) {
    formData.append("parentCommentId", commentData.parentCommentId);
  }

  if (commentData.attachment) {
    formData.append("attachment", commentData.attachment);
  }

  const { data } = await apiClient.post<Comment>("/comments", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}

export async function getCaptcha(): Promise<CaptchaData> {
  const { data } = await apiClient.get<CaptchaData>("/captcha");
  return data;
}

export async function searchComments(
  query: string,
  page: number = 1,
  pageSize: number = 25
): Promise<PagedResult<Comment>> {
  const { data } = await apiClient.get<PagedResult<Comment>>(
    "/search",
    {
      params: {
        q: query,
        page,
        pageSize,
      },
    }
  );
  return data;
}

export function getFileUrl(fileName: string): string {
  return `/api/files/${encodeURIComponent(fileName)}`;
}
