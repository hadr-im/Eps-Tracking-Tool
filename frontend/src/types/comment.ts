// Comment types (mirrors backend CommentDto)
// Keep in sync with:
//   backend/src/Application/use-cases/ep/EpManagementUseCase.ts (CommentDto)

export interface Comment {
  id: string;
  epId: string;
  authorId: string | null;
  fieldName: string | null;
  content: string;
  createdAt: string; // ISO date string
}

// API response envelopes
export interface CommentsApiResponse {
  data: Comment[];
  count: number;
}

export interface CommentApiResponse {
  data: Comment;
}

// Payload for POST /eps/:id/comments
export interface AddCommentPayload {
  content: string;
  fieldName?: string | null;
}
