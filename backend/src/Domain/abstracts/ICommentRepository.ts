import { Comment } from '../entities/Comment';

export interface ICommentRepository {
  // Creates a new comment on an EP
  create(
    epId: string,
    authorId: string,
    fieldName: string | null,
    content: string,
  ): Promise<Comment>;

  // Returns all comments for a given EP ordered oldest first
  findByEpId(epId: string): Promise<Comment[]>;

  // Updates the content of an existing comment (author check is done in the use case)
  update(commentId: string, content: string): Promise<Comment>;

  // Deletes a comment by ID
  delete(commentId: string): Promise<void>;
}
