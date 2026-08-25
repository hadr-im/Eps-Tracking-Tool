// TanStack Table meta type augmentation 
// Extends the ColumnMeta interface so `column.columnDef.meta.sticky` etc are typed throughout the codebase without casting to `any`
//
// Import this file in tsconfig paths or via a triple-slash reference if needed
// Currently it is picked up automatically because it sits in src/types/

import '@tanstack/react-table';

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    // 'left' makes the column sticky on the left edge 
    sticky?: 'left';
    // Left offset in px for the sticky column
    stickyOffset?: number;
    // Minimum (and fixed) width in px 
    minWidth?: number;
  }
}
