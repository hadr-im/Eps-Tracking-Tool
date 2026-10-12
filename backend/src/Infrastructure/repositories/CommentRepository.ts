import { PrismaClient } from '@prisma/client';
import type { Comment as PrismaComment } from '@prisma/client';

import {
  ICommentRepository,
  CommentWithAuthor,
} from '../../Domain/abstracts/ICommentRepository';
import { Comment } from '../../Domain/entities/Comment';
import { prisma } from '../Database/PrismaService';

// Only the fields a rendered comment needs — not the whole user row.
const AUTHOR_SELECT = {
  author: { select: { id: true, fullName: true, avatarUrl: true } },
} as const;

type RowWithAuthor = PrismaComment & {
  author: { id: string; fullName: string; avatarUrl: string | null } | null;
};

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
  ): Promise<CommentWithAuthor> {
    const row = await this.db.comment.create({
      data: {
        epId,
        authorId,
        fieldName,
        content,
      },
      include: AUTHOR_SELECT,
    });
    return this.toEntityWithAuthor(row);
  }

  // Returns all comments for a given EP, ordered oldest-first, each joined to
  // its author so the caller does not have to resolve names separately.
  async findByEpId(epId: string): Promise<CommentWithAuthor[]> {
    const rows = await this.db.comment.findMany({
      where: { epId },
      orderBy: { createdAt: 'asc' },
      include: AUTHOR_SELECT,
    });
    return rows.map((r) => this.toEntityWithAuthor(r));
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

  // Private mappers
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

  private toEntityWithAuthor(row: RowWithAuthor): CommentWithAuthor {
    return {
      comment: this.toEntity(row),
      author: row.author
        ? {
            id: row.author.id,
            fullName: row.author.fullName,
            avatarUrl: row.author.avatarUrl,
          }
        : null,
    };
  }
}
