import { EpStatus } from '../enums/EpStatus';

// Immutable record of a single EP status transition
export class StatusHistory {
  constructor(
    public readonly id: string,
    public readonly epId: string,
    public readonly fromStatus: EpStatus,
    public readonly toStatus: EpStatus,
    public readonly changedAt: Date,
  ) {}
}
