import { PrismaClient } from '@prisma/client';
import type { Comment as PrismaComment } from '@prisma/client';

import { ICommentRepository } from '../../Domain/abstracts/ICommentRepository';
import { Comment } from '../../Domain/entities/Comment';
import { prisma } from '../Database/PrismaService';

export class CommentRepository implements ICommentRepository {
  private readonly db: PrismaClient;

  constructor(db: PrismaClient = prisma) {
    this.db = db;
  }

  // Creates a new comment on an EP
  async create(
    epId: string,
    authorId: string,
    fieldName: string | null,
    content: string,
  ): Promise<Comment> {
    const row = await this.db.comment.create({
      data: {
        epId,
        authorId,
        fieldName,
        content,
      },
    });
    return this.toEntity(row);
  }

  // Returns all comments for a given EP, ordered oldest-first
  async findByEpId(epId: string): Promise<Comment[]> {
    const rows = await this.db.comment.findMany({
      where: { epId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((r) => this.toEntity(r));
  }

  // Updates the text content of an existing comment
  async update(commentId: string, content: string): Promise<Comment> {
    const row = await this.db.comment.update({
      where: { id: commentId },
      data: { content },
    });
    return this.toEntity(row);
  }

  // Deletes a comment by ID
  async delete(commentId: string): Promise<void> {
    await this.db.comment.delete({ where: { id: commentId } });
  }

  // Private mapper
  // Prisma row -> domain entity
  private toEntity(row: PrismaComment): Comment {
    return new Comment(
      row.id,
      row.epId,
      row.authorId,
      row.fieldName,
      row.content,
      row.createdAt,
    );
  }
}
