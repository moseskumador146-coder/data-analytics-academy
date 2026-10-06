// Deterministic, seeded datasets used across all tools and projects.
// All generation is pure & seeded so data is identical on every load (no delays, no fetch).

export type Cell = string | number | null;
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

/* ---------------- e-commerce orders (LARGE) ---------------- */
function buildEcomOrders(): Row[] {
  const rng = mulberry32(2024);
  const rows: Row[] = [];
  const cities: [string, string][] = [
    ["New York", "East"], ["Chicago", "Midwest"], ["Austin", "South"], ["Seattle", "West"],
    ["Denver", "West"], ["Miami", "South"], ["Boston", "East"], ["Portland", "West"],
    ["Atlanta", "South"], ["Detroit", "Midwest"], ["Phoenix", "West"], ["Dallas", "South"],
  ];
  const brands: Record<string, string[]> = {
    Electronics: ["Voltix", "Sonique", "Brightcore"],
    Furniture: ["OakHaus", "LoftLiving"],
    "Office Supplies": ["PaperTrail", "Deskly"],
    Appliances: ["BrewMaster", "PureAir"],
    Sports: ["FitForge", "Trailblaze"],
  };
  const statuses = ["delivered", "delivered", "delivered", "shipped", "processing", "cancelled", "returned"];
  const start = new Date("2025-01-01T00:00:00Z");
  let id = 50000;
  for (let i = 0; i < 2600; i++) {
    const cat = pick(rng, CATEGORIES);
    const prod = pick(rng, PRODUCTS[cat]);
    const [city, region] = pick(rng, cities);
    const units = int(rng, 1, 9);
    const price = +(prod.price * (1 + (rng() - 0.5) * 0.12)).toFixed(2);
    const discount = pick(rng, [0, 0, 0, 0.05, 0.1, 0.15, 0.2]);
    const d = new Date(start.getTime() + Math.floor(rng() * 364) * 86400000);
    // seasonal peak in Nov-Dec
    const month = d.getUTCMonth();
    const seasonBoost = month === 10 || month === 11 ? 1 + rng() * 0.8 : 1;
    if (rng() > 0.42 * seasonBoost) continue; // thin the volume but keep seasonal shape
    rows.push({
      order_id: `EC-${id++}`,
      order_date: d.toISOString().slice(0, 10),
      customer: `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
      city,
      region,
      category: cat,
      subcategory: `${cat.slice(0, 3)}-${pick(rng, ["Core", "Pro", "Lite", "Max"])}`,
      product: prod.name,
      brand: pick(rng, brands[cat]),
      units,
      unit_price: price,
      discount_pct: discount,
      revenue: +(units * price * (1 - discount)).toFixed(2),
      shipping_cost: +(3.99 + rng() * 14).toFixed(2),
      payment_method: pick(rng, PAYMENTS),
      status: pick(rng, statuses),
      delivery_days: int(rng, 1, 9),
    });
  }
  return rows.sort((a, b) => String(a.order_date).localeCompare(String(b.order_date)));
}

/* ---------------- web server logs (HUGE) ---------------- */
function buildServerLogs(): Row[] {
  const rng = mulberry32(8888);
  const rows: Row[] = [];
  const endpoints = [
    ["/", "GET"], ["/api/products", "GET"], ["/api/cart", "GET"], ["/api/cart", "POST"],
    ["/api/checkout", "POST"], ["/api/login", "POST"], ["/api/search", "GET"],
    ["/api/orders", "GET"], ["/static/app.js", "GET"], ["/static/styles.css", "GET"],
    ["/api/recommendations", "GET"], ["/api/user/profile", "GET"], ["/api/payment", "POST"],
  ] as [string, string][];
  const regions = ["us-east", "us-west", "eu-central", "ap-south", "sa-east"];
  const devices = ["desktop", "mobile", "tablet"];
  const referrers = ["google.com", "direct", "facebook.com", "newsletter", "twitter.com", "bing.com", ""];
  const start = new Date("2026-09-28T00:00:00Z");
  for (let i = 0; i < 6200; i++) {
    const [endpoint, method] = pick(rng, endpoints);
    const ts = new Date(start.getTime() + Math.floor(rng() * 3 * 86400000) + Math.floor(rng() * 86400) * 1000);
    const slow = endpoint === "/api/recommendations" || endpoint === "/api/search";
    const latency = Math.max(2, Math.round((slow ? 180 : 35) * (0.3 + rng() * 2.2) + (rng() < 0.02 ? rng() * 2000 : 0)));
    const status = rng() < 0.04 ? pick(rng, [404, 500, 503]) : rng() < 0.1 ? 301 : 200;
    rows.push({
      request_id: i + 1,
      timestamp: ts.toISOString().slice(0, 19).replace("T", " "),
      method,
      endpoint,
      status_code: status,
      latency_ms: rng() < 0.006 ? -1 : latency, // occasional bad sensor reading
      bytes_sent: int(rng, 240, 48000),
      region: pick(rng, regions),
      device: pick(rng, devices),
      referrer: rng() < 0.04 ? "" : pick(rng, referrers),
      cache_status: pick(rng, ["HIT", "MISS", "MISS", "BYPASS"]),
    });
  }
  return rows.sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
}

/* ---------------- finance GL export (MESSY MEDIUM) ---------------- */
function buildFinanceGL(): Row[] {
  const rng = mulberry32(4242);
  const rows: Row[] = [];
  const accounts: [string, string][] = [
    ["4010", "Product Revenue"], ["4020", "Services Revenue"], ["5010", "Salaries & Wages"],
    ["5020", "Marketing Spend"], ["5030", "Software & SaaS"], ["6010", "Office Rent"],
    ["6020", "Travel"], ["6100", "Misc Expenses"],
  ];
  const depts = ["Engineering", "Sales", "marketing", " FINANCE", "hr", "Support", "sales"];
  const curs = ["USD", "USD", "USD", "usd", "EUR"];
  const start = new Date("2025-01-01T00:00:00Z");
  let id = 90000;
  for (let i = 0; i < 640; i++) {
    const [acct, name] = pick(rng, accounts);
    let date = new Date(start.getTime() + Math.floor(rng() * 180) * 86400000).toISOString().slice(0, 10);
    if (rng() < 0.12) date = date.replaceAll("-", "/");
    let amount: Cell = +(rng() * 24000 + 120).toFixed(2);
    if (rng() < 0.15) amount = `$${(amount as number).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    if (rng() < 0.08) amount = `${(amount as number).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
    if (rng() < 0.05) amount = -(amount as number);
    if (rng() < 0.04) amount = "";
    const type = String(acct).startsWith("4") ? pick(rng, ["credit", "Credit", "CREDIT"]) : pick(rng, ["debit", "Debit", "DEBIT"]);
    rows.push({
      entry_id: `GL-${id++}`,
      posting_date: date,
      account: acct,
      account_name: name,
      department: rng() < 0.1 ? "" : pick(rng, depts),
      description: rng() < 0.06 ? `  ${pick(rng, ["Monthly accrual", "Vendor payment", "Card charge", "Payroll batch"])}  ` : pick(rng, ["Monthly accrual", "Vendor payment", "Card charge", "Payroll batch", "Refund", "Bonus", "Ad spend", "Utility bill"]),
      debit_credit: type,
      amount,
      currency: pick(rng, curs),
      approved: rng() < 0.85 ? "Y" : pick(rng, ["N", "n", ""]),
    });
    if (rng() < 0.09) rows.push({ ...rows[rows.length - 1], entry_id: `GL-${id++}` }); // same-entry duplicates
  }
  return rows;
}

/* ---------------- messy HR export (MESSY MEDIUM) ---------------- */
function buildMessyHR(): Row[] {
  const rng = mulberry32(31337);
  const rows: Row[] = [];
  const depts = ["Sales", "Engineering", "HR", "Finance", "Marketing", "Support"];
  for (let i = 1; i <= 360; i++) {
    const dept = pick(rng, depts);
    let salary: Cell = Math.round((38000 + rng() * 90000) / 500) * 500;
    if (rng() < 0.18) salary = `$${(salary as number).toLocaleString("en-US")}`;
    if (rng() < 0.06) salary = "";
    let tenure: Cell = +(rng() * 9).toFixed(1);
    if (rng() < 0.12) tenure = "";
    if (rng() < 0.05) tenure = -tenure;
    let age: Cell = int(rng, 21, 64);
    if (rng() < 0.04) age = 999; // sentinel junk
    let deptOut = dept;
    if (rng() < 0.22) deptOut = pick(rng, ["engineering", " SALES ", "hr", "Finance ", "MARKETING", "support"]);
    if (rng() < 0.05) deptOut = "";
    rows.push({
      emp_no: `EMP-${1000 + i}`,
      name: rng() < 0.14 ? `  ${pick(rng, FIRST)} ${pick(rng, LAST)} `.toUpperCase() : `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
      department: deptOut,
      age,
      annual_salary: salary,
      tenure_years: tenure,
      performance: +(1 + rng() * 4).toFixed(1),
      engagement: rng() < 0.08 ? "" : int(rng, 1, 100),
      attrition_flag: pick(rng, ["Yes", "No", "No", "No", "Y", "N"]),
      last_review: rng() < 0.1 ? "2025/0" + int(rng, 1, 9) : `2025-0${int(rng, 1, 9)}`,
    });
    if (rng() < 0.07) rows.push({ ...rows[rows.length - 1] });
  }
  return rows;
}

/* ---------------- CRM leads (MEDIUM CLEAN) ---------------- */
function buildCrmLeads(): Row[] {
  const rng = mulberry32(60606);
  const rows: Row[] = [];
  const sources = ["Website", "Webinar", "Trade Show", "Referral", "Cold Email", "LinkedIn Ads"];
  const industries = ["SaaS", "Retail", "Manufacturing", "Healthcare", "Finance", "Education"];
  const sizes = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
  const statuses = ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"];
  const start = new Date("2025-06-01T00:00:00Z");
  for (let i = 1; i <= 920; i++) {
    const status = pick(rng, statuses);
    const score = Math.min(100, Math.max(1, Math.round((statuses.indexOf(status) / 5) * 70 + rng() * 35)));
    rows.push({
      lead_id: `LD-${String(i).padStart(5, "0")}`,
      created_date: new Date(start.getTime() + Math.floor(rng() * 300) * 86400000).toISOString().slice(0, 10),
      company: `${pick(rng, ["Northwind", "Acme", "Lumen", "Vertex", "Bluepeak", "Crafton", "Redwood", "Zenith"])} ${pick(rng, ["LLC", "Inc", "Group", "Labs", "Holdings", "Co"])}`,
      industry: pick(rng, industries),
      company_size: pick(rng, sizes),
      region: pick(rng, REGIONS),
      source: pick(rng, sources),
      owner: `${pick(rng, FIRST)} ${pick(rng, LAST)}`,
      status,
      lead_score: score,
      est_value: Math.round((2000 + rng() * 48000) / 100) * 100,
      days_to_close: status === "Won" || status === "Lost" ? int(rng, 5, 90) : "",
    });
  }
  return rows;
}

/* ---------------- inventory snapshot (SMALL MESSY) ---------------- */
function buildInventory(): Row[] {
  const rng = mulberry32(77);
  const rows: Row[] = [];
  const whs = ["WH-1", "WH-2", "WH-3", "wh-1", " WH-2 "];
  let n = 0;
  for (const cat of CATEGORIES) {
    for (const p of PRODUCTS[cat]) {
      for (const wh of ["WH-1", "WH-2", "WH-3"]) {
        n++;
        let cost: Cell = p.price;
        if (rng() < 0.15) cost = `$${p.price.toFixed(2)}`;
        if (rng() < 0.05) cost = "";
        let counted = new Date(2025 + (n % 2), n % 12, 1 + (n % 27)).toISOString().slice(0, 10);
        if (rng() < 0.18) counted = counted.replaceAll("-", "/");
        if (rng() < 0.06) counted = "";
        const onHand = int(rng, 0, 240);
        rows.push({
          sku: `SKU-${String(n).padStart(4, "0")}`,
          product: p.name,
          category: cat,
          warehouse: rng() < 0.25 ? pick(rng, whs) : wh,
          on_hand: rng() < 0.05 ? "" : onHand,
          reserved: int(rng, 0, Math.max(1, Math.floor(onHand * 0.4))),
          reorder_point: pick(rng, [20, 40, 60, 80]),
          unit_cost: cost,
          last_counted: counted,
          shrinkage_units: rng() < 0.85 ? 0 : int(rng, 1, 6),
        });
        if (rng() < 0.06) rows.push({ ...rows[rows.length - 1] });
      }
    }
  }
  return rows;
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

export function getEcomOrders() {
  return makeDataset(
    "ecom_orders",
    "E-commerce Orders 2025 (Large)",
    "2,000+ orders with city, brand, discounts, shipping and status — realistic seasonal peaks. Great for big-file practice.",
    [
      { key: "order_id", name: "Order ID", type: "text" },
      { key: "order_date", name: "Order Date", type: "date" },
      { key: "customer", name: "Customer", type: "text" },
      { key: "city", name: "City", type: "text" },
      { key: "region", name: "Region", type: "text" },
      { key: "category", name: "Category", type: "text" },
      { key: "subcategory", name: "Subcategory", type: "text" },
      { key: "product", name: "Product", type: "text" },
      { key: "brand", name: "Brand", type: "text" },
      { key: "units", name: "Units", type: "number" },
      { key: "unit_price", name: "Unit Price", type: "currency" },
      { key: "discount_pct", name: "Discount", type: "number" },
      { key: "revenue", name: "Revenue", type: "currency" },
      { key: "shipping_cost", name: "Shipping", type: "currency" },
      { key: "payment_method", name: "Payment", type: "text" },
      { key: "status", name: "Status", type: "text" },
      { key: "delivery_days", name: "Delivery Days", type: "number" },
    ],
    buildEcomOrders()
  );
}

export function getServerLogs() {
  return makeDataset(
    "server_logs",
    "Web Server Logs 3 Days (Huge)",
    "6,000+ raw request logs: endpoint, status codes, latency, cache, device. Find the slow endpoints and error spikes.",
    [
      { key: "request_id", name: "Request ID", type: "number" },
      { key: "timestamp", name: "Timestamp", type: "text" },
      { key: "method", name: "Method", type: "text" },
      { key: "endpoint", name: "Endpoint", type: "text" },
      { key: "status_code", name: "Status", type: "number" },
      { key: "latency_ms", name: "Latency (ms)", type: "number" },
      { key: "bytes_sent", name: "Bytes", type: "number" },
      { key: "region", name: "Region", type: "text" },
      { key: "device", name: "Device", type: "text" },
      { key: "referrer", name: "Referrer", type: "text" },
      { key: "cache_status", name: "Cache", type: "text" },
    ],
    buildServerLogs()
  );
}

export function getFinanceGL() {
  return makeDataset(
    "finance_gl",
    "Finance GL Export (Messy)",
    "650+ general-ledger rows straight from the ERP: mixed date formats, $-text amounts, case-variant departments, duplicates.",
    [
      { key: "entry_id", name: "Entry ID", type: "text" },
      { key: "posting_date", name: "Posting Date", type: "text" },
      { key: "account", name: "Account", type: "text" },
      { key: "account_name", name: "Account Name", type: "text" },
      { key: "department", name: "Department", type: "text" },
      { key: "description", name: "Description", type: "text" },
      { key: "debit_credit", name: "Debit/Credit", type: "text" },
      { key: "amount", name: "Amount", type: "text" },
      { key: "currency", name: "Currency", type: "text" },
      { key: "approved", name: "Approved", type: "text" },
    ],
    buildFinanceGL()
  );
}

export function getMessyHR() {
  return makeDataset(
    "messy_hr",
    "HR Export (Messy)",
    "380+ employee rows with $-text salaries, junk ages (999), case-variant departments, mixed review dates and duplicates.",
    [
      { key: "emp_no", name: "Employee No", type: "text" },
      { key: "name", name: "Name", type: "text" },
      { key: "department", name: "Department", type: "text" },
      { key: "age", name: "Age", type: "number" },
      { key: "annual_salary", name: "Annual Salary", type: "text" },
      { key: "tenure_years", name: "Tenure (yrs)", type: "text" },
      { key: "performance", name: "Performance", type: "number" },
      { key: "engagement", name: "Engagement", type: "number" },
      { key: "attrition_flag", name: "Attrition", type: "text" },
      { key: "last_review", name: "Last Review", type: "text" },
    ],
    buildMessyHR()
  );
}

export function getCrmLeads() {
  return makeDataset(
    "crm_leads",
    "CRM Leads (Medium)",
    "900+ pipeline leads: source, industry, size, owner, score, stage and estimated value — perfect for funnel dashboards.",
    [
      { key: "lead_id", name: "Lead ID", type: "text" },
      { key: "created_date", name: "Created", type: "date" },
      { key: "company", name: "Company", type: "text" },
      { key: "industry", name: "Industry", type: "text" },
      { key: "company_size", name: "Company Size", type: "text" },
      { key: "region", name: "Region", type: "text" },
      { key: "source", name: "Source", type: "text" },
      { key: "owner", name: "Owner", type: "text" },
      { key: "status", name: "Stage", type: "text" },
      { key: "lead_score", name: "Lead Score", type: "number" },
      { key: "est_value", name: "Est. Value", type: "currency" },
      { key: "days_to_close", name: "Days to Close", type: "number" },
    ],
    buildCrmLeads()
  );
}

export function getInventory() {
  return makeDataset(
    "inventory",
    "Inventory Snapshot (Small, Messy)",
    "Warehouse stock counts with case-variant warehouses, $-text costs, mixed date formats and duplicate rows.",
    [
      { key: "sku", name: "SKU", type: "text" },
      { key: "product", name: "Product", type: "text" },
      { key: "category", name: "Category", type: "text" },
      { key: "warehouse", name: "Warehouse", type: "text" },
      { key: "on_hand", name: "On Hand", type: "number" },
      { key: "reserved", name: "Reserved", type: "number" },
      { key: "reorder_point", name: "Reorder Point", type: "number" },
      { key: "unit_cost", name: "Unit Cost", type: "text" },
      { key: "last_counted", name: "Last Counted", type: "text" },
      { key: "shrinkage_units", name: "Shrinkage", type: "number" },
    ],
    buildInventory()
  );
}

/* ---------------- sample-file catalog (for pickers & library) ---------------- */
export interface SampleFileInfo {
  id: string;
  name: string;
  rows: number;
  cols: number;
  size: "Small" | "Medium" | "Large" | "Huge";
  messy: boolean;
  description: string;
}

const SIZE_ORDER: Record<SampleFileInfo["size"], number> = { Small: 0, Medium: 1, Large: 2, Huge: 3 };

function sizeOf(n: number): SampleFileInfo["size"] {
  if (n <= 200) return "Small";
  if (n <= 1000) return "Medium";
  if (n <= 3000) return "Large";
  return "Huge";
}

const CATALOG_IDS = [
  "clean_sales", "marketing", "hr", "traffic", "tickets", "crm_leads",
  "ecom_orders", "server_logs", "messy_sales", "messy_hr", "finance_gl", "inventory",
];

let catalogCache: SampleFileInfo[] | null = null;
export function getSampleCatalog(): SampleFileInfo[] {
  if (!catalogCache) {
    catalogCache = CATALOG_IDS.map((id) => {
      const ds = getDatasetById(id)!;
      return {
        id: ds.id,
        name: ds.name,
        rows: ds.rows.length,
        cols: ds.columns.length,
        size: sizeOf(ds.rows.length),
        messy: /messy|gl/i.test(ds.id) || ds.id === "inventory",
        description: ds.description,
      };
    }).sort((a, b) => SIZE_ORDER[a.size] - SIZE_ORDER[b.size] || a.name.localeCompare(b.name));
  }
  return catalogCache;
}

export function getAllDatasets(): Dataset[] {
  return CATALOG_IDS.map((id) => getDatasetById(id)!).filter(Boolean);
}

export function getDatasetById(id: string): Dataset | undefined {
  switch (id) {
    case "clean_sales": return getCleanSales();
    case "messy_sales": return getMessySales();
    case "marketing": return getMarketing();
    case "hr": return getHR();
    case "traffic": return getTraffic();
    case "tickets": return getTickets();
    case "ecom_orders": return getEcomOrders();
    case "server_logs": return getServerLogs();
    case "finance_gl": return getFinanceGL();
    case "messy_hr": return getMessyHR();
    case "crm_leads": return getCrmLeads();
    case "inventory": return getInventory();
    default: return undefined;
  }
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
