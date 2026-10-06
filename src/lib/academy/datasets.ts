// Deterministic, seeded datasets used across all tools and projects.
// All generation is pure & seeded so data is identical on every load (no delays, no fetch).

export type Cell = string | number;
export type Row = Record<string, Cell>;

export interface ColumnDef {
  key: string;
  name: string;
  type: "text" | "number" | "date" | "currency";
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  columns: ColumnDef[];
  rows: Row[];
}

/* ---------------- seeded RNG ---------------- */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(rng: () => number, arr: T[]): T => arr[Math.floor(rng() * arr.length)];
const int = (rng: () => number, min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min;

const REGIONS = ["North", "South", "East", "West"];
const CATEGORIES = ["Electronics", "Furniture", "Office Supplies", "Appliances", "Sports"];
const CHANNELS = ["Online Store", "Retail Partner", "Direct Sales", "Marketplace"];
const PAYMENTS = ["Credit Card", "Bank Transfer", "Cash", "PayPal"];
const PRODUCTS: Record<string, { name: string; price: number }[]> = {
  Electronics: [
    { name: "Wireless Mouse", price: 24.99 },
    { name: "Mechanical Keyboard", price: 89.5 },
    { name: "USB-C Hub", price: 42.0 },
    { name: "27in Monitor", price: 229.99 },
    { name: "Laptop Stand", price: 34.95 },
  ],
  Furniture: [
    { name: "Office Chair", price: 149.0 },
    { name: "Standing Desk", price: 399.0 },
    { name: "Bookshelf", price: 79.9 },
    { name: "Desk Lamp", price: 29.95 },
  ],
  "Office Supplies": [
    { name: "Notebook Pack", price: 12.5 },
    { name: "Pen Set", price: 8.99 },
    { name: "Stapler", price: 6.75 },
    { name: "Sticky Notes", price: 4.25 },
  ],
  Appliances: [
    { name: "Coffee Maker", price: 89.0 },
    { name: "Mini Fridge", price: 179.99 },
    { name: "Air Purifier", price: 129.5 },
    { name: "Electric Kettle", price: 39.99 },
  ],
  Sports: [
    { name: "Yoga Mat", price: 19.99 },
    { name: "Dumbbell Set", price: 59.0 },
    { name: "Resistance Bands", price: 14.5 },
    { name: "Jump Rope", price: 9.99 },
  ],
};
const FIRST = ["Ava", "Liam", "Noah", "Mia", "Ethan", "Zoe", "Lucas", "Emma", "Omar", "Sofia", "Kenji", "Priya", "Diego", "Lena", "Marco", "Nadia", "Tom", "Yara", "Ivan", "Chloe"];
const LAST = ["Nguyen", "Patel", "Garcia", "Kim", "Smith", "Okafor", "Rossi", "Haddad", "Johansson", "Silva", "Chen", "Dubois", "Novak", "Torres", "Weber"];

function isoDate(rng: () => number, start: Date, days: number) {
  const d = new Date(start.getTime() + Math.floor(rng() * days) * 86400000);
  return d.toISOString().slice(0, 10);
}

/* ---------------- clean retail sales ---------------- */
function buildCleanSales(): Row[] {
  const rng = mulberry32(42);
  const rows: Row[] = [];
  const start = new Date("2025-01-01T00:00:00Z");
  let id = 1000;
  for (let i = 0; i < 340; i++) {
    const cat = pick(rng, CATEGORIES);
    const prod = pick(rng, PRODUCTS[cat]);
    const units = int(rng, 1, 12);
    const price = +(prod.price * (1 + (rng() - 0.5) * 0.1)).toFixed(2);
    rows.push({
      order_id: `ORD-${id++}`,
      order_date: isoDate(rng, start, 364),
      customer: `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
      region: pick(rng, REGIONS),
      category: cat,
      product: prod.name,
      units,
      unit_price: price,
      revenue: +(units * price).toFixed(2),
      channel: pick(rng, CHANNELS),
      payment_method: pick(rng, PAYMENTS),
    });
  }
  return rows.sort((a, b) => String(a.order_date).localeCompare(String(b.order_date)));
}

/* ---------------- messy retail sales (for the cleaning project) ---------------- */
function buildMessySales(): Row[] {
  const rng = mulberry32(7);
  const rows: Row[] = [];
  const start = new Date("2024-07-01T00:00:00Z");
  let id = 5001;
  for (let i = 0; i < 160; i++) {
    const cat = pick(rng, CATEGORIES);
    const prod = pick(rng, PRODUCTS[cat]);
    const name = `${pick(rng, FIRST)} ${pick(rng, LAST)}`;
    const region = pick(rng, REGIONS);
    const units = int(rng, 1, 14);
    const price = prod.price;
    // deliberately messy values
    let cust = name;
    let reg = region;
    let u: Cell = units;
    let p: Cell = price;
    let date = isoDate(rng, start, 180);
    const r = rng();
    if (r < 0.14) cust = `  ${cust.toUpperCase()} `;
    else if (r < 0.26) cust = ` ${cust.toLowerCase()}`;
    if (rng() < 0.12) reg = pick(rng, ["north", " SOUTH", "east ", "WEST", "NORTH"]);
    if (rng() < 0.1) u = `"${units}"`;
    if (rng() < 0.09) p = `$${price.toFixed(2)}`;
    if (rng() < 0.08) date = date.replaceAll("-", "/");
    if (rng() < 0.06) u = 0;
    if (rng() < 0.05) p = -price;
    if (rng() < 0.07) u = "";
    if (rng() < 0.05) cust = "";
    if (rng() < 0.06) p = "";
    if (rng() < 0.05) date = "";
    rows.push({
      order_id: `ord_${id++}`,
      order_date: date,
      customer: cust,
      region: reg,
      category: cat,
      product: prod.name,
      units: u,
      unit_price: p,
      revenue: "",
      channel: pick(rng, CHANNELS),
    });
    // duplicate ~8% of rows
    if (rng() < 0.08) rows.push({ ...rows[rows.length - 1] });
  }
  return rows;
}

/* ---------------- marketing campaigns ---------------- */
function buildMarketing(): Row[] {
  const rng = mulberry32(99);
  const channels = ["Google Ads", "Meta Ads", "Email", "Influencer", "SEO Blog"];
  const audiences = ["SMB Owners", "Enterprise", "Students", "Freelancers"];
  const rows: Row[] = [];
  const months = ["2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12"];
  for (const m of months) {
    for (const ch of channels) {
      const spend = int(rng, 2000, 18000);
      const impressions = spend * int(rng, 40, 160);
      const clicks = Math.round(impressions * (0.01 + rng() * 0.04));
      const conversions = Math.round(clicks * (0.02 + rng() * 0.08));
      rows.push({
        month: m,
        channel: ch,
        audience: pick(rng, audiences),
        spend,
        impressions,
        clicks,
        conversions,
        revenue: +(conversions * (80 + rng() * 160)).toFixed(2),
      });
    }
  }
  return rows;
}

/* ---------------- HR employees ---------------- */
function buildHR(): Row[] {
  const rng = mulberry32(1234);
  const depts = ["Sales", "Engineering", "HR", "Finance", "Marketing", "Support"];
  const roles: Record<string, string[]> = {
    Sales: ["Rep", "Account Exec", "Sales Manager"],
    Engineering: ["SWE I", "SWE II", "Senior SWE", "Eng Manager"],
    HR: ["Recruiter", "HR Generalist", "HRBP"],
    Finance: ["Analyst", "Sr Analyst", "Controller"],
    Marketing: ["Specialist", "Manager", "Content Lead"],
    Support: ["Agent", "Sr Agent", "Support Lead"],
  };
  const rows: Row[] = [];
  for (let i = 1; i <= 220; i++) {
    const dept = pick(rng, depts);
    const role = pick(rng, roles[dept]);
    const age = int(rng, 22, 58);
    const tenure = +(rng() * 9).toFixed(1);
    const perf = +(2 + rng() * 3).toFixed(1);
    const salary = Math.round((38000 + tenure * 4200 + (perf - 2) * 6000 + (dept === "Engineering" ? 18000 : 0)) / 500) * 500;
    const overtime = int(rng, 0, 22);
    const satisfaction = +(1 + rng() * 4).toFixed(1);
    const attrition =
      overtime > 14 && satisfaction < 2.6
        ? rng() < 0.75
          ? "Yes"
          : "No"
        : rng() < 0.14
          ? "Yes"
          : "No";
    rows.push({
      employee_id: `E${String(i).padStart(3, "0")}`,
      department: dept,
      role,
      age,
      salary,
      tenure_years: tenure,
      performance_score: perf,
      overtime_hours: overtime,
      satisfaction_score: satisfaction,
      attrition,
    });
  }
  return rows;
}

/* ---------------- web traffic ---------------- */
function buildTraffic(): Row[] {
  const rng = mulberry32(555);
  const rows: Row[] = [];
  const sources = ["Organic Search", "Paid Ads", "Social", "Email", "Direct"];
  const start = new Date("2025-07-01T00:00:00Z");
  for (let d = 0; d < 92; d++) {
    const day = new Date(start.getTime() + d * 86400000).toISOString().slice(0, 10);
    for (const src of sources) {
      const base = src === "Organic Search" ? 1400 : src === "Direct" ? 700 : 500;
      const visits = Math.round(base * (0.7 + rng() * 0.9));
      rows.push({
        date: day,
        source: src,
        visits,
        signups: Math.round(visits * (0.02 + rng() * 0.06)),
        bounce_rate: +(20 + rng() * 45).toFixed(1),
        avg_seconds: int(rng, 25, 340),
      });
    }
  }
  return rows;
}

/* ---------------- support tickets ---------------- */
function buildTickets(): Row[] {
  const rng = mulberry32(777);
  const cats = ["Billing", "Login Issues", "Feature Request", "Bug Report", "How-To"];
  const prios = ["Low", "Medium", "High", "Critical"];
  const rows: Row[] = [];
  const start = new Date("2025-08-01T00:00:00Z");
  for (let i = 1; i <= 150; i++) {
    const opened = new Date(start.getTime() + Math.floor(rng() * 60) * 86400000);
    const hours = +(rng() * 72).toFixed(1);
    rows.push({
      ticket_id: `T${String(i).padStart(4, "0")}`,
      opened_date: opened.toISOString().slice(0, 10),
      category: pick(rng, cats),
      priority: pick(rng, prios),
      first_response_hours: +(rng() * 10).toFixed(1),
      resolution_hours: hours,
      satisfaction: int(rng, 1, 5),
      escalated: rng() < 0.2 ? "Yes" : "No",
    });
  }
  return rows;
}

/* ---------------- SQL playground tables ---------------- */
export interface SqlTable {
  name: string;
  description: string;
  columns: { name: string; type: string }[];
  rows: Row[];
}

function buildSqlTables(): Record<string, SqlTable> {
  const rng = mulberry32(2025);
  const cities = ["New York", "London", "Berlin", "Tokyo", "Sydney", "Toronto", "Paris", "Singapore"];
  const segments = ["Consumer", "Small Business", "Enterprise"];
  const customers: Row[] = [];
  for (let i = 1; i <= 45; i++) {
    customers.push({
      id: i,
      name: `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
      city: pick(rng, cities),
      segment: pick(rng, segments),
      signup_date: isoDate(rng, new Date("2024-01-01T00:00:00Z"), 500),
    });
  }
  const products: Row[] = [];
  let pid = 1;
  for (const cat of CATEGORIES)
    for (const p of PRODUCTS[cat])
      products.push({ id: pid++, name: p.name, category: cat, price: p.price });

  const statuses = ["completed", "completed", "completed", "pending", "cancelled", "refunded"];
  const orders: Row[] = [];
  for (let i = 1; i <= 230; i++) {
    const cust = customers[Math.floor(rng() * customers.length)];
    orders.push({
      id: i,
      customer_id: cust.id as number,
      order_date: isoDate(rng, new Date("2025-01-01T00:00:00Z"), 360),
      status: pick(rng, statuses),
      shipping: pick(rng, ["Standard", "Express", "Same-day"]),
    });
  }
  const items: Row[] = [];
  let iid = 1;
  for (const o of orders) {
    const n = int(rng, 1, 4);
    for (let k = 0; k < n; k++) {
      const prod = products[Math.floor(rng() * products.length)];
      items.push({
        id: iid++,
        order_id: o.id as number,
        product_id: prod.id as number,
        quantity: int(rng, 1, 8),
        unit_price: +(prod.price as number * (1 + (rng() - 0.5) * 0.08)).toFixed(2),
      });
    }
  }
  const employees: Row[] = [];
  const depts = ["Sales", "Engineering", "HR", "Finance", "Marketing"];
  for (let i = 1; i <= 32; i++) {
    employees.push({
      id: i,
      name: `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
      dept: pick(rng, depts),
      salary: int(rng, 45, 165) * 1000,
      hire_date: isoDate(rng, new Date("2019-01-01T00:00:00Z"), 2200),
      manager_id: i <= 6 ? null : int(rng, 1, 6),
    });
  }
  return {
    customers: {
      name: "customers",
      description: "Customer master data with segment and location",
      columns: [
        { name: "id", type: "INTEGER" },
        { name: "name", type: "TEXT" },
        { name: "city", type: "TEXT" },
        { name: "segment", type: "TEXT" },
        { name: "signup_date", type: "TEXT" },
      ],
      rows: customers,
    },
    products: {
      name: "products",
      description: "Product catalog with category and list price",
      columns: [
        { name: "id", type: "INTEGER" },
        { name: "name", type: "TEXT" },
        { name: "category", type: "TEXT" },
        { name: "price", type: "REAL" },
      ],
      rows: products,
    },
    orders: {
      name: "orders",
      description: "Order headers: customer, date, status",
      columns: [
        { name: "id", type: "INTEGER" },
        { name: "customer_id", type: "INTEGER" },
        { name: "order_date", type: "TEXT" },
        { name: "status", type: "TEXT" },
        { name: "shipping", type: "TEXT" },
      ],
      rows: orders,
    },
    order_items: {
      name: "order_items",
      description: "Line items per order (quantity × unit price)",
      columns: [
        { name: "id", type: "INTEGER" },
        { name: "order_id", type: "INTEGER" },
        { name: "product_id", type: "INTEGER" },
        { name: "quantity", type: "INTEGER" },
        { name: "unit_price", type: "REAL" },
      ],
      rows: items,
    },
    employees: {
      name: "employees",
      description: "Staff list with dept, salary, manager",
      columns: [
        { name: "id", type: "INTEGER" },
        { name: "name", type: "TEXT" },
        { name: "dept", type: "TEXT" },
        { name: "salary", type: "INTEGER" },
        { name: "hire_date", type: "TEXT" },
        { name: "manager_id", type: "INTEGER" },
      ],
      rows: employees,
    },
  };
}

/* ---------------- module-level singletons ---------------- */
const cache: Record<string, Dataset> = {};

function makeDataset(
  id: string,
  name: string,
  description: string,
  columns: ColumnDef[],
  rows: Row[]
): Dataset {
  if (!cache[id]) cache[id] = { id, name, description, columns, rows };
  return cache[id];
}

export function getCleanSales() {
  return makeDataset(
    "clean_sales",
    "Retail Sales 2025 (Clean)",
    "A full year of clean retail transactions — orders, regions, products and revenue.",
    [
      { key: "order_id", name: "Order ID", type: "text" },
      { key: "order_date", name: "Order Date", type: "date" },
      { key: "customer", name: "Customer", type: "text" },
      { key: "region", name: "Region", type: "text" },
      { key: "category", name: "Category", type: "text" },
      { key: "product", name: "Product", type: "text" },
      { key: "units", name: "Units", type: "number" },
      { key: "unit_price", name: "Unit Price", type: "currency" },
      { key: "revenue", name: "Revenue", type: "currency" },
      { key: "channel", name: "Channel", type: "text" },
      { key: "payment_method", name: "Payment", type: "text" },
    ],
    buildCleanSales()
  );
}

export function getMessySales() {
  return makeDataset(
    "messy_sales",
    "Retail Sales H2-2024 (Messy)",
    "Raw export from a legacy POS: mixed case, whitespace, bad dates, text numbers, duplicates and blanks.",
    [
      { key: "order_id", name: "Order ID", type: "text" },
      { key: "order_date", name: "Order Date", type: "text" },
      { key: "customer", name: "Customer", type: "text" },
      { key: "region", name: "Region", type: "text" },
      { key: "category", name: "Category", type: "text" },
      { key: "product", name: "Product", type: "text" },
      { key: "units", name: "Units", type: "text" },
      { key: "unit_price", name: "Unit Price", type: "text" },
      { key: "revenue", name: "Revenue", type: "text" },
      { key: "channel", name: "Channel", type: "text" },
    ],
    buildMessySales()
  );
}

export function getMarketing() {
  return makeDataset(
    "marketing",
    "Marketing Spend 2025",
    "Monthly channel performance: spend, impressions, clicks, conversions and revenue.",
    [
      { key: "month", name: "Month", type: "text" },
      { key: "channel", name: "Channel", type: "text" },
      { key: "audience", name: "Audience", type: "text" },
      { key: "spend", name: "Spend", type: "currency" },
      { key: "impressions", name: "Impressions", type: "number" },
      { key: "clicks", name: "Clicks", type: "number" },
      { key: "conversions", name: "Conversions", type: "number" },
      { key: "revenue", name: "Revenue", type: "currency" },
    ],
    buildMarketing()
  );
}

export function getHR() {
  return makeDataset(
    "hr",
    "HR Employees Survey",
    "Demographics, salary, performance and attrition flags for 220 employees.",
    [
      { key: "employee_id", name: "Employee ID", type: "text" },
      { key: "department", name: "Department", type: "text" },
      { key: "role", name: "Role", type: "text" },
      { key: "age", name: "Age", type: "number" },
      { key: "salary", name: "Salary", type: "currency" },
      { key: "tenure_years", name: "Tenure (yrs)", type: "number" },
      { key: "performance_score", name: "Performance", type: "number" },
      { key: "overtime_hours", name: "Overtime", type: "number" },
      { key: "satisfaction_score", name: "Satisfaction", type: "number" },
      { key: "attrition", name: "Attrition", type: "text" },
    ],
    buildHR()
  );
}

export function getTraffic() {
  return makeDataset(
    "traffic",
    "Website Traffic (92 days)",
    "Daily visits and signups split by acquisition source.",
    [
      { key: "date", name: "Date", type: "date" },
      { key: "source", name: "Source", type: "text" },
      { key: "visits", name: "Visits", type: "number" },
      { key: "signups", name: "Signups", type: "number" },
      { key: "bounce_rate", name: "Bounce %", type: "number" },
      { key: "avg_seconds", name: "Avg Time (s)", type: "number" },
    ],
    buildTraffic()
  );
}

export function getTickets() {
  return makeDataset(
    "tickets",
    "Support Tickets",
    "150 tickets: category, priority, response/resolution times and satisfaction.",
    [
      { key: "ticket_id", name: "Ticket ID", type: "text" },
      { key: "opened_date", name: "Opened", type: "date" },
      { key: "category", name: "Category", type: "text" },
      { key: "priority", name: "Priority", type: "text" },
      { key: "first_response_hours", name: "First Resp (h)", type: "number" },
      { key: "resolution_hours", name: "Resolution (h)", type: "number" },
      { key: "satisfaction", name: "CSAT (1-5)", type: "number" },
      { key: "escalated", name: "Escalated", type: "text" },
    ],
    buildTickets()
  );
}

export function getAllDatasets(): Dataset[] {
  return [getCleanSales(), getMarketing(), getHR(), getTraffic(), getTickets()];
}

export function getDatasetById(id: string): Dataset | undefined {
  if (id === "clean_sales") return getCleanSales();
  if (id === "messy_sales") return getMessySales();
  if (id === "marketing") return getMarketing();
  if (id === "hr") return getHR();
  if (id === "traffic") return getTraffic();
  if (id === "tickets") return getTickets();
  return getAllDatasets().find((d) => d.id === id);
}

let sqlTablesCache: Record<string, SqlTable> | null = null;
export function getSqlTables(): Record<string, SqlTable> {
  if (!sqlTablesCache) sqlTablesCache = buildSqlTables();
  return sqlTablesCache;
}

/* ---------------- CSV helpers ---------------- */
export function rowsToCSV(rows: Row[], columns?: ColumnDef[]): string {
  if (!rows.length) return "";
  const keys = columns ? columns.map((c) => c.key) : Object.keys(rows[0]);
  const esc = (v: Cell) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
  };
  const head = keys.join(",");
  const body = rows.map((r) => keys.map((k) => esc(r[k])).join(",")).join("\n");
  return `${head}\n${body}`;
}

export function downloadFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
