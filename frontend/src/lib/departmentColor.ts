/*
  The colour that stands for a department, wherever one is named.

  These are the product tokens the rest of the app already uses for a
  programme badge, so a GV pill on the admin page is the same red as a GV
  pill in the CRM. Colour follows the entity, never its rank or its position
  in a list: a department keeps its hue whether it is top or bottom, and
  whether four are on screen or one.

  The LC is not a department and takes the brand blue, which no department
  uses — so "everything" never reads as one of the three.
*/

export const DEPARTMENT_COLOR: Record<string, string> = {
  GV: 'var(--gv)',
  GTA: 'var(--gta)',
  GTE: 'var(--gte)',
};

export const LC_COLOR = 'var(--chart-blue)';

export function departmentColor(name: string | null | undefined): string {
  if (!name) return LC_COLOR;
  return DEPARTMENT_COLOR[name.toUpperCase()] ?? LC_COLOR;
}

/*
  A translucent version of the same hue, for a badge fill or a card tint.

  color-mix keeps this to one source of truth: the tint always derives from
  the token above, so changing a department's colour changes its badge, its
  bar and its backdrop together. Mixed in oklab so the result stays the same
  hue rather than drifting toward grey the way an sRGB blend does.
*/
export function departmentTint(name: string | null | undefined, percent: number): string {
  return `color-mix(in oklab, ${departmentColor(name)} ${percent}%, transparent)`;
}
