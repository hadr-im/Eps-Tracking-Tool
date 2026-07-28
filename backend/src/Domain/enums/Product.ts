export enum Product {
  GV  = 'GV',   // Global Volunteer : EXPA code 9
  GTA = 'GTA',  // Global Talent    : EXPA code 8
  GTE = 'GTE',  // Global Teacher   : EXPA code 10
}

// Maps each Product to its EXPA numeric programme code (for GraphQL queries)
export const EXPA_PROGRAMME_CODE: Record<Product, number> = {
  [Product.GV]:  9,
  [Product.GTA]: 8,
  [Product.GTE]: 10,
};

// Maps EXPA numeric codes back to Product enum (for deserialization)
export const PROGRAMME_FROM_EXPA_CODE: Record<number, Product> = {
  9:  Product.GV,
  8:  Product.GTA,
  10: Product.GTE,
};

// Maps each product to its department ID in the DB
export const PROGRAMME_DEPARTMENT_ID: Record<Product, string> = {
  [Product.GV]:  'dpt-gv',
  [Product.GTA]: 'dpt-gta',
  [Product.GTE]: 'dpt-gte',
};
