// Per-product brand assets: logos and the CSS colour token.
// Keyed by the Department.product value the API returns ('GV' | 'GTA' | 'GTE').

import gvSignup from '@/assets/GV-SIGNUP.png';
import gtaSignup from '@/assets/GTA-SIGNUP.png';
import gteSignup from '@/assets/GTE-SIGNUP.png';
import gvHome from '@/assets/GV-HOME.png';
import gtaHome from '@/assets/GTA-HOME.png';
import gteHome from '@/assets/GTE-HOME.png';

interface ProductBrand {
  // Compact mark, used in dropdowns and lists
  logo: string;
  // Wider lockup, used in the sidebar
  homeLogo: string;
  // A CSS colour value, ready to drop into a style prop
  color: string;
  label: string;
}

const PRODUCT_BRAND: Record<string, ProductBrand> = {
  GV: { logo: gvSignup, homeLogo: gvHome, color: 'var(--gv)', label: 'Global Volunteer' },
  GTA: { logo: gtaSignup, homeLogo: gtaHome, color: 'var(--gta)', label: 'Global Talent' },
  GTE: { logo: gteSignup, homeLogo: gteHome, color: 'var(--gte)', label: 'Global Teacher' },
};

// Falls back to null so an unknown product renders as plain text, never a crash.
export function productBrand(product: string | undefined | null): ProductBrand | null {
  return product ? (PRODUCT_BRAND[product] ?? null) : null;
}

/*
  Department ids are seeded as 'dpt-gv' / 'dpt-gta' / 'dpt-gte', so the product
  is just the suffix. Written as a lookup rather than a string slice so an
  unexpected id returns null instead of a bogus product key.
*/
export function productFromDepartmentId(departmentId: string | null | undefined): string | null {
  if (!departmentId) return null;
  const product = departmentId.replace(/^dpt-/, '').toUpperCase();
  return product in PRODUCT_BRAND ? product : null;
}

export function brandForDepartment(departmentId: string | null | undefined): ProductBrand | null {
  return productBrand(productFromDepartmentId(departmentId));
}
