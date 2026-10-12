import { Comment } from '../entities/Comment';

/*
  Just enough of the author to render a comment. Returned alongside the comment
  rather than looked up separately, which otherwise meant one extra query per
  distinct author on every panel open.
*/
export interface CommentAuthor {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

// Null author = the account was deleted, or the comment was written by the system.
export interface CommentWithAuthor {
  comment: Comment;
  author: CommentAuthor | null;
}

export interface ICommentRepository {
  // Creates a new comment on an EP
  create(
    epId: string,
    authorId: string,
    fieldName: string | null,
    content: string,
  ): Promise<CommentWithAuthor>;

  // Returns all comments for an EP ordered oldest first, each with its author
  findByEpId(epId: string): Promise<CommentWithAuthor[]>;

  // Updates the content of an existing comment (author check is done in the use case)
  update(commentId: string, content: string): Promise<Comment>;

  // Deletes a comment by ID
  delete(commentId: string): Promise<void>;
}
