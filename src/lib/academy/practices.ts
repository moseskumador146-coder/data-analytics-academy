// Practice Labs — every lesson in the learning path ends with a hands-on,
// AUTO-CHECKED practice test. The lab is embedded directly inside the lesson,
// with real data, the real tool interfaces, hints and help.
//
// Kinds:
//   quiz  — concept checks with instant feedback + explanations
//   excel — formula tasks evaluated by the real formula engine on a virtual sheet
//   sql   — query tasks run by the real SQL engine against the store tables
//   dax   — measure tasks evaluated by the real mini-DAX engine on the Sales model
//   clean — choose-the-right-fix drills on real messy data
//
// Checks are SELF-VERIFYING: for engine kinds the learner's result is compared
// against the authored solution evaluated by the same engine, so answers can
// never drift out of sync with the data.

export type PracticeKind = "quiz" | "excel" | "sql" | "dax" | "clean";

export interface QuizQuestion {
  q: string;
  options: string[];
  correct: number;
  explain: string;
}

export interface ExcelTask {
  prompt: string;
  cell: string; // where the learner's answer goes, e.g. "M2"
  solution: string; // e.g. "=SUM(I2:I199)"
  hint: string;
}

export interface SqlTask {
  prompt: string;
  solution: string; // model query
  orderInsensitive?: boolean; // compare result rows ignoring order
}

export interface DaxTask {
  prompt: string;
  solution: string; // model measure expression
}

export interface CleanIssue {
  situation: string;
  options: string[];
  correct: number;
  explain: string;
}

export interface Practice {
  kind: PracticeKind;
  title: string;
  brief: string; // real-company scenario for this drill
  dataset?: string; // dataset id backing the lab (excel/clean preview)
  questions?: QuizQuestion[];
  tasks?: ExcelTask[];
  sqlTasks?: SqlTask[];
  daxTasks?: DaxTask[];
  issues?: CleanIssue[];
  hints: string[]; // progressive — revealed one at a time
  functions?: string[]; // relevant function names surfaced as help chips
}

import { PRACTICES_A } from "./practices-a";
import { PRACTICES_B } from "./practices-b";
import { PRACTICES_C } from "./practices-c";
import { PRACTICES_D } from "./practices-d";

export const PRACTICES: Record<string, Practice> = {
  ...PRACTICES_A,
  ...PRACTICES_B,
  ...PRACTICES_C,
  ...PRACTICES_D,
};

export function practiceFor(lessonId: string): Practice | undefined {
  return PRACTICES[lessonId];
}

export const PRACTICE_COUNT = Object.keys(PRACTICES).length;

/* Shared notes used by the lab UI */
export const EXCEL_SHEET_NOTE =
  "The lab sheet holds the first 198 data rows of the dataset — row 1 is the header, data lives in rows 2–199.";
export const SQL_TABLES_NOTE =
  "Tables: customers(id, name, city, segment, signup_date) · orders(id, customer_id, order_date, status, shipping) · order_items(id, order_id, product_id, quantity, unit_price) · products(id, name, category, price) · employees(id, name, dept, salary, hire_date, manager_id)";
export const DAX_MODEL_NOTE =
  "Model: one table 'Sales' (340 rows) with columns order_id, order_date, customer, region, category, product, units, unit_price, revenue, channel, payment_method.";
