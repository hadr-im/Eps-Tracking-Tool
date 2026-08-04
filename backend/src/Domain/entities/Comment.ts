// Domain entity for comments left on an EP
export class Comment {
  constructor(
    public readonly id: string,
    public readonly epId: string,
    public readonly authorId: string | null,
    // Optional: the specific CRM field this comment is about
    public readonly fieldName: string | null,
    public content: string,
    public readonly createdAt: Date,
  ) {}
}
