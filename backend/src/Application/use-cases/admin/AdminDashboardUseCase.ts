import {
  IAdminRepository,
  CompletionRow,
  CompletionRollup,
  ExpaUsage,
  ExpaRange,
} from '../../../Domain/abstracts/IAdminRepository';
import { UserRole, isAdmin } from '../../../Domain/enums/UserRole';
import { AppError } from '../../errors/AppError';

export interface AdminCaller {
  id: string;
  role: UserRole;
}

export interface ChampionDto {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  role: string;
  department: string | null;
  rate: number;
  epCount: number;
}

export interface AdminDashboardDto {
  /*
    Whoever is on top, and anyone tied with them. Ties are kept rather than
    broken arbitrarily: two people on 97.4% are both the champion, and
    picking one by name order would be a lie the page tells every week.
  */
  champions: ChampionDto[];
  rollups: { lc: CompletionRollup; departments: CompletionRollup[]; teams: CompletionRollup[] };
  /** Best and worst ten, by completion rate. */
  top: CompletionRow[];
  bottom: CompletionRow[];
  /** Everyone, for the table. */
  people: CompletionRow[];
  expa: ExpaUsage;
}

/*
  How far back "this week" and "this month" reach. Resolved here rather than
  in the browser because these windows are about the committee's calendar,
  not the reader's clock, and every admin should see the same number.
*/
export type AdminPeriod = 'week' | 'month' | 'all';

function windowFor(period: AdminPeriod): { from?: Date } {
  if (period === 'all') return {};
  const from = new Date();
  if (period === 'week') from.setDate(from.getDate() - 7);
  else from.setMonth(from.getMonth() - 1);
  return { from };
}

export class AdminDashboardUseCase {
  constructor(private readonly repo: IAdminRepository) {}

  async getDashboard(
    caller: AdminCaller,
    period: AdminPeriod = 'month',
    expaRange: ExpaRange = 'day',
  ): Promise<AdminDashboardDto> {
    if (!isAdmin(caller.role)) {
      throw new AppError('Admins only', 403);
    }

    const window = windowFor(period);

    const [people, rollups, expa] = await Promise.all([
      this.repo.getCompletionByUser(window),
      this.repo.getCompletionRollups(window),
      this.repo.getExpaUsage(expaRange),
    ]);

    /*
      Only people with something to be scored on are ranked.

      Someone holding no EPs scores 0% by arithmetic, not by conduct, and
      letting those rows fill the bottom ten would bury the people who
      actually are behind — which is the entire point of the list.
    */
    const ranked = [...people].filter((p) => p.expected > 0);
    const byRate = [...ranked].sort((a, b) => b.rate - a.rate || b.epCount - a.epCount);

    const best = byRate[0]?.rate ?? 0;
    const champions = byRate
      .filter((p) => p.rate === best && p.expected > 0)
      .map((p) => ({
        userId: p.userId,
        fullName: p.fullName,
        avatarUrl: p.avatarUrl,
        role: p.role,
        department: p.department,
        rate: p.rate,
        epCount: p.epCount,
      }));

    return {
      champions,
      rollups,
      top: byRate.slice(0, 10),
      // Ascending, so the person most in need of a nudge is first.
      bottom: [...byRate].reverse().slice(0, 10),
      people,
      expa,
    };
  }
}
