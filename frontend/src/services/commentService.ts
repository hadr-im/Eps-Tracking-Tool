// commentService.ts 
// Composed by useComments / useAddComment hooks

import { apiClient } from './apiClient';
import type {
  Comment,
  CommentsApiResponse,
  CommentApiResponse,
  AddCommentPayload,
} from '../types/comment';

// GET /eps/:id/comments
// All authenticated department users can read
export async function fetchComments(epId: string): Promise<Comment[]> {
  const { data } = await apiClient.get<CommentsApiResponse>(`/eps/${epId}/comments`);
  return data.data;
}

// POST /eps/:id/comments
// TL / VP only
export async function postComment(epId: string, payload: AddCommentPayload): Promise<Comment> {
  const { data } = await apiClient.post<CommentApiResponse>(`/eps/${epId}/comments`, payload);
  return data.data;
}
