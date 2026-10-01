export enum Product {
  GV  = 'GV',   // Global Volunteer : EXPA code 7
  GTA = 'GTA',  // Global Talent    : EXPA code 8
  GTE = 'GTE',  // Global Teacher   : EXPA code 9
}

// Maps each Product to its EXPA numeric programme code (for GraphQL queries).
// Verified against the live API: querying an opportunity per programme returns
// short_name_display GV=7, GTa=8, GTe=9. Code 10 does not exist.
export const EXPA_PROGRAMME_CODE: Record<Product, number> = {
  [Product.GV]:  7,
  [Product.GTA]: 8,
  [Product.GTE]: 9,
};

// Maps EXPA numeric codes back to Product enum (for deserialization)
export const PROGRAMME_FROM_EXPA_CODE: Record<number, Product> = {
  7: Product.GV,
  8: Product.GTA,
  9: Product.GTE,
};

// Maps each product to its department ID in the DB
export const PROGRAMME_DEPARTMENT_ID: Record<Product, string> = {
  [Product.GV]:  'dpt-gv',
  [Product.GTA]: 'dpt-gta',
  [Product.GTE]: 'dpt-gte',
};
