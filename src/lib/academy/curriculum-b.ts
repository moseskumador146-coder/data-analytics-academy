// Curriculum part B: Advanced + Master levels.
// Content syntax: **bold**, ~inline code~, "- " bullets, "~~~" code fences, "> " callouts.

import type { PathLevel } from "./curriculum-a";

const advanced: PathLevel = {
  id: "advanced",
  title: "Advanced — Analyst Engineer",
  tagline: "Python, statistics, ETL pipelines, automation and warehouse modeling — build data products, not just reports.",
  duration: "Weeks 11–18",
  outcomes: [
    "Analyze any dataset with pandas (load → clean → group → merge → plot)",
    "Run honest A/B tests and explain statistical significance",
    "Design and build ETL pipelines with quality checks",
    "Automate recurring reports end-to-end",
    "Model warehouses with facts, dimensions and SCDs",
  ],
  modules: [
    {
      id: "a1",
      title: "Python for Data Analysis",
      summary: "pandas in practice: load, inspect, filter, group, merge, plot — the industry-standard stack.",
      lessons: [
        {
          id: "a1l1",
          title: "Python & pandas in 30 Minutes",
          minutes: 10,
          content: `Python is the analyst-engineer's language: it does what spreadsheets do, but **repeatable at any scale**. The library you will live in is **pandas** — think "Excel tables, but programmable".

Core vocabulary (read this like a phrasebook):

- **DataFrame** — a table (rows + named columns). **Series** — one column.
- **Import**: ~import pandas as pd~ — everyone aliases to ~pd~.
- **Load**: ~df = pd.read_csv("sales.csv")~.
- **Peek**: ~df.head()~, ~df.shape~, ~df.info()~, ~df.describe()~ — the pandas version of the profiling you already learned.

~~~
import pandas as pd

df = pd.read_csv("sales.csv")
print(df.shape)        # (rows, columns)
print(df.info())       # types + missing counts — your profile step
print(df.describe())   # mean/std/min/max for numerics
~~~

Why bother when Excel works? Because code is a **recipe**: run it next month on next month's file and get the identical analysis in 3 seconds, zero copy-paste errors, full audit trail. Your Automation Studio projects generate exactly these scripts.

Setup for real life: install **Anaconda** or use **Google Colab** (free, zero install, runs in browser — perfect while traveling). VS Code + Jupyter extension is the pro setup.

> TIP: Every pandas operation maps to something you already know: filter = WHERE, groupby = GROUP BY, merge = JOIN, sort_values = ORDER BY. You are not learning a new subject — you are learning new syntax for analytics you already understand.`,
          takeaways: [
            "DataFrame = table; head/info/describe = profile first",
            "Code = repeatable recipe; rerun on new data in seconds",
            "Colab for zero-install start; Anaconda/VS Code when serious",
          ],
          practice: "In Automation Studio, generate the pandas script for a cleaning pipeline and read it mapping each line to a tool you already used.",
        },
        {
          id: "a1l2",
          title: "Loading & Inspecting Data",
          minutes: 9,
          content: `First contact with any dataset follows a fixed ritual — the pandas version of your Cleaner-tool profiling:

~~~
df = pd.read_csv("messy_sales.csv")

df.head(10)               # eyeball the first rows
df.shape                  # (168, 10)
df.dtypes                 # OBJECT = probably text where you wanted numbers!
df.isna().sum()           # missing per column — the money shot
df.duplicated().sum()     # 12 duplicates found
df["region"].unique()     # ['North', ' south ', 'SOUTH', ...] — chaos visible
df.describe(include="all")# stats + top values for categoricals
~~~

The four smells to hunt in inspection:

1. **Wrong dtypes** — ~unit_price~ showing as ~object~ (text) means ~$~ or commas are present → clean then ~pd.to_numeric(df["unit_price"], errors="coerce")~.
2. **Missing patterns** — ~isna().sum()~ plus *why* (always missing for one category? = structural).
3. **Cardinality checks** — ~nunique()~ per column: ~region~ should have 4 values, not 9.
4. **Head vs tail** — ~df.tail()~ catches trailing junk (footnotes, total rows) that ~head~ misses.

Reading other formats: ~pd.read_excel("file.xlsx", sheet_name="data")~, ~pd.read_json()~, ~pd.read_sql(query, connection)~ — same inspection ritual after every load.

> REAL WORLD: Senior engineers do exactly this dance, just faster. The ritual never changes — only the dataset does. Inspect before clean, clean before analyze; skipping steps is how an 8% duplicate rate becomes a board-level wrong number.`,
          takeaways: [
            "head → shape → dtypes → isna → duplicated → unique: the ritual",
            "object dtype on a numeric column = hidden text characters",
            "Check tail() too — junk hides at the bottom",
          ],
          practice: "Map each inspection line above to a feature in the Data Cleaner tool (which one shows missing counts? duplicates? distinct values?).",
        },
        {
          id: "a1l3",
          title: "Filtering, Grouping & Merging",
          minutes: 11,
          content: `The three verbs of analysis, pandas edition. Your SQL knowledge transfers line by line.

**Filter (WHERE)** — boolean masks:
~~~
done = df[df["status"] == "completed"]
big  = df[(df["revenue"] > 500) & (df["region"] == "North")]   # & | ~ not and/or
~~~

**Group (GROUP BY)**:
~~~
by_region = df.groupby("region")["revenue"].sum().sort_values(ascending=False)
summary   = df.groupby(["region", "category"]).agg(
    orders=("order_id", "count"),
    revenue=("revenue", "sum"),
    aov=("revenue", "mean"),
).reset_index()
~~~

**Merge (JOIN)**:
~~~
enriched = orders.merge(customers, left_on="customer_id", right_on="id", how="left")
never_ordered = customers.merge(orders, left_on="id", right_on="customer_id",
                                how="left", indicator=True).query("_merge == 'left_only'")
~~~
~how=~ is your join family: ~"inner"~, ~"left"~...; the ~indicator~ trick labels unmatched rows — the "never ordered customers" query in two lines.

**Reshape** (the tidy-data tool): ~pd.melt()~ widens→longs (month-columns into a month-column); ~pivot_table~ does long→wide with aggregation — a true programmatic pivot:
~~~
grid = pd.pivot_table(df, index="region", columns="category",
                      values="revenue", aggfunc="sum", margins=True)
~~~

> TIP: Memorize the translation table: WHERE→mask, GROUP BY→groupby, JOIN→merge, ORDER BY→sort_values, HAVING→filter after groupby. Interviews literally ask "how do you groupby-agg in pandas?" — this lesson IS the answer.`,
          takeaways: [
            "Masks filter (&/|, not and/or)",
            "groupby().agg() with named aggregations = the workhorse",
            "merge how='left' + indicator = unmatched-row finder",
          ],
          practice: "Write (or generate via Automation Studio) the code: revenue by region+category with orders count and AOV — the Project 2 summary table.",
        },
        {
          id: "a1l4",
          title: "Plotting & Quick EDA",
          minutes: 9,
          content: `**EDA (exploratory data analysis)** = looking before concluding. pandas + matplotlib make it one-liner fast:

~~~
import matplotlib.pyplot as plt

df["revenue"].plot(kind="hist", bins=30, title="Order size distribution")
df.groupby("month")["revenue"].sum().plot(kind="line", title="Monthly revenue")
df.groupby("region")["revenue"].sum().sort_values().plot(kind="barh")
df.plot(kind="scatter", x="spend", y="conversions")
~~~

The EDA starter kit, in order:

1. **Histogram** of every key numeric — shape, skew, outliers visible at once.
2. **Line** over time for the main metric — trend, seasonality, breaks.
3. **Bar** by each category — who leads.
4. **Scatter** for the relationships you suspect — correlated or noise?
5. **Boxplot** grouped by category (~df.boxplot(column="revenue", by="region")~) — spread differences between groups.

Chart hygiene from your Intermediate level applies 1:1 (titles carry insights, sorted bars, ≤4 lines). The only additions:

- ~plt.tight_layout()~ before saving; ~plt.savefig("chart.png", dpi=150)~ for reports.
- For interactive charts, **plotly** (~px.bar(df, x="region", y="revenue")~) — hover-zoom for stakeholder exploration.

> REAL WORLD: EDA is where unexpected insights live: the histogram that reveals two customer populations, the scatter that shows spend stops working above $20k/day. You cannot prompt-find these — you must *look*. Every Advanced project here includes an EDA step for exactly this reason.`,
          takeaways: [
            "EDA ritual: hist → line → bar → scatter → boxplot",
            "One line per chart with pandas; save with savefig for reports",
            "plotly for interactive stakeholder versions",
          ],
          practice: "List what each EDA chart would reveal for the HR dataset (salary hist, attrition by dept bar, satisfaction vs overtime scatter).",
        },
        {
          id: "a1l5",
          title: "Putting It Together: The Analysis Script",
          minutes: 10,
          content: `The professional deliverable is not a notebook full of clicks — it is a **runnable script** that goes raw-file → insights, top to bottom. The template (this exact shape powers your generated project scripts):

~~~
"""Sales analysis — raw to insights.
Run: python analyze_sales.py
Input: data/raw_sales.csv  Output: output/summary.csv, charts/
"""
import pandas as pd
import matplotlib.pyplot as plt

def load(path):
    df = pd.read_csv(path, parse_dates=["order_date"])
    return df

def clean(df):
    df = df.drop_duplicates()
    df["customer"] = df["customer"].str.strip().str.title()
    df["region"] = df["region"].str.strip().str.title()
    df["revenue"] = df["units"] * df["unit_price"]
    df = df.dropna(subset=["customer", "order_date"])
    return df

def analyze(df):
    summary = (df.groupby("region")
                 .agg(orders=("order_id","count"), revenue=("revenue","sum"))
                 .sort_values("revenue", ascending=False))
    return summary

def main():
    df = clean(load("data/raw_sales.csv"))
    summary = analyze(df)
    summary.to_csv("output/summary.csv")
    print(summary)

if __name__ == "__main__":
    main()
~~~

Why this structure wins:

- **Functions = testable steps** — each mirrors a stage of your cleaning log.
- **main() + paths at top** — anyone (including future you) reruns it in one command.
- **Outputs to files** — the artifacts (summary.csv, charts/) drop into your repo, ready for the README.

This is also your bridge to **automation**: wrap the same script with a scheduler (cron / GitHub Actions / Airflow) and the "weekly report" builds itself — which is exactly Module A14 and Project 5.

> TIP: The rule of thumb: **notebook for exploration, script for production**. Explore freely, then compress into this template. Your GitHub portfolio should show BOTH: the notebook (thinking) and the script (engineering).`,
          takeaways: [
            "load → clean → analyze → output: the four-function template",
            "Scripts make analyses repeatable and reviewable",
            "Notebook = exploration, script = production",
          ],
          practice: "Open Project 5's generated Python script and annotate each function with which lesson taught you that step.",
        },
      ],
    },
    {
      id: "a2",
      title: "Statistics for Business",
      summary: "Sampling, hypothesis testing, A/B tests, regression and forecasting — statistics with a decision-making lens.",
      lessons: [
        {
          id: "a2l1",
          title: "Sampling & Confidence",
          minutes: 9,
          content: `You rarely analyze a whole population — you sample. The rules that keep samples honest:

- **Random sampling** — every unit equally likely; convenience samples (the customers who answer surveys) are systematically biased ("only the angry ones reply").
- **Sample size matters** — small n = wild estimates. The margin of error shrinks with ~1/√n~: quadruple the sample, halve the error.
- **Confidence intervals (CI)** — "AOV is $86 ± $4 at 95% confidence" means: if we resampled forever, 95% of such intervals would contain the true mean. Wider CI = weaker data; overlapping CIs between groups = "don't claim a difference yet".

~~~
# 95% CI for a mean, the idea:
mean ± 1.96 * (std / sqrt(n))
# $86 ± 1.96 * (12 / sqrt(340)) → $86 ± $1.3
~~~

Practical translation for meetings:

- "Up 3% (CI ±1%)" → confident call.
- "Up 3% (CI ±5%)" → honest answer: "directionally positive, not yet conclusive — extend the test."
- Beware **survivorship bias** (analyzing only retained customers) and **selection bias** (only web data when 30% of sales are phone).

> REAL WORLD: Polls, dashboards on subsets, test groups, QA samples — everything is a sample. Analysts who quote ±margins get trusted more, not less: precision about uncertainty IS precision. The sample-size intuition also tells you when a stakeholder's "let's A/B test on 200 users" is statistically hopeless.`,
          takeaways: [
            "Random samples or conclusions are biased at the source",
            "CI width ~ 1/√n — small samples make big lies",
            "Quote ±margin with every subset claim",
          ],
          practice: "Compute (by hand or Python) the 95% CI for mean revenue in the clean sales data: n=340, mean≈?, std≈?. Interpret it in one sentence.",
        },
        {
          id: "a2l2",
          title: "Hypothesis Testing & A/B Tests",
          minutes: 11,
          content: `An **A/B test** is a controlled experiment: randomly split users, show variant B to one group, A to the other, measure the difference. It is the ONLY clean way to say "caused".

The vocabulary (interviews quiz this):

- **H0 (null)** — no difference. **H1** — there is a difference (what you hope).
- **p-value** — probability of seeing a difference *this big* if H0 were true. p < 0.05 → "statistically significant" → reject H0. It is NOT "95% chance B is better".
- **α (alpha) = 0.05** — your false-positive budget. **Power (1−β)** — your chance of detecting a real effect; 80% is standard; low power = "we ran it too short".
- **Type I error** — shipping a dud (false positive). **Type II** — killing a winner (false negative).

The professional workflow:

1. **Size the test BEFORE starting** — minimum n per group based on baseline rate and the smallest effect worth detecting. (Free calculators; Evan Miller's is the classic.)
2. **One primary metric**, decided in advance — switching metrics after peeking is how teams fool themselves.
3. **Run full business cycles** (whole weeks — weekday behavior differs) and **never peek-and-stop**.
4. **Read the result honestly** — significant → ship (if the effect size matters); not significant → "no evidence of an effect" (which is not proof of no effect).

~~~
# Python, two-proportion z-test (conversion):
from statsmodels.stats.proportion import proportions_ztest
z, p = proportions_ztest([conv_a, conv_b], [n_a, n_b])
~~~

> REAL WORLD: Most "test wins" die from peeking (stopping at day 3 because B led) and tiny samples. Guard both and you are already better than most teams running tests. Booking.com famously runs thousands of simultaneous tests — the discipline scales because the rules never change.`,
          takeaways: [
            "Random split, pre-registered metric, full cycles, no peeking",
            "p < 0.05 = unusual under H0, not '95% sure'",
            "Power first: undersized tests waste weeks",
          ],
          practice: "Design an A/B test for a checkout button: primary metric, minimum duration, what would make you ship — write it in 5 lines.",
        },
        {
          id: "a2l3",
          title: "Regression Basics",
          minutes: 9,
          content: `**Linear regression** fits a line: ~y = a + b·x~ — and gives you *informed coefficients* instead of eyeballed trends.

~~~
from sklearn.linear_model import LinearRegression
X = df[["spend", "tempo_of_promos"]]     # predictors
y = df["revenue"]
model = LinearRegression().fit(X, y)
print(model.intercept_, model.coef_)
~~~

Reading the output like an analyst:

- **Intercept a** — baseline revenue at zero spend (often theoretical).
- **Coefficient b** — "each extra $1 of spend associates with +$b revenue, *holding other variables constant*". That ceteris-paribus phrase is the power of multivariate regression — it untangles effects that simple correlation confuses.
- **R²** — share of variance explained; 0.6 on revenue models is respectable, 0.99 means you leaked the future into a feature (check!).
- **Residuals** — what the model missed; patterns in residuals = missing variables or nonlinearity.

Business uses:

- **Driver ranking** — which levers move the metric most per dollar.
- **Price elasticity** — b on price tells you volume lost per $1 up.
- **Forecast baseline** — plug planned driver values into the equation (with honest error bars).

Cautions: linear ≠ automatic causation (same confounder rules apply); beware **multicollinearity** (spend and impressions rise together — coefficients get unstable); beware **extrapolation** (the model knows nothing outside the data range).

> TIP: Even if you never fit a model at work, understanding coefficients makes you the person who *questions* other people's models — "is spend correlated with seasonality in your data?" is a very expensive question to be able to ask.`,
          takeaways: [
            "Coefficient = effect per unit, holding others constant",
            "R² = variance explained; weirdly high R² = leakage suspicion",
            "Regression untangles drivers; it still does not prove causation",
          ],
          practice: "Which variables would you regress revenue on for the retail data? Name one confounder you would worry about.",
        },
        {
          id: "a2l4",
          title: "Forecasting Fundamentals",
          minutes: 9,
          content: `Forecasts answer "what's next quarter look like?" — done honestly, they beat gut feel; done dishonestly, they destroy analyst credibility.

**1. Baseline methods (start here):**
- **Naive** — next = last actual. The benchmark to beat.
- **Moving average** — average of last k periods; smooths noise.
- **Seasonal naive** — "next June = last June". Shockingly strong for seasonal businesses.

**2. Trend + seasonality decomposition.** Split the series: ~actual = trend × seasonal × noise~. Retail: December spike × slow growth trend. Knowing *which part* moved tells you what to act on (trend problem vs seasonal problem).

**3. Exponential smoothing (Holt-Winters)** — weighted averages, recent weighted more, seasonality included. The robust workhorse; ~statsmodels~ does it in a few lines.

**4. ARIMA / Prophet** — classic and modern defaults for richer series. Prophet (free, by Meta) handles holidays and changepoints — great for business series with promotions.

**5. Driver-based forecast** — the analyst's favorite: ~next_rev = traffic_plan × conv_rate × AOV~ with each driver projected (and CI'd) separately. Transparent, arguable in meetings, adjustable live — everything a black-box model is not.

**Forecast hygiene:**

- Always report **error vs naive** (MAPE / MAE) — "our model is 12% wrong" sounds bad until you say "naive is 23% wrong".
- Forecast *ranges* (p10–p90), not single lines — uncertainty is information.
- Backtest on history before trusting the future.

> TIP: Project 4's month-over-month analysis and Project 7's reporting both benefit from a simple 3-month moving average + seasonal-naive combo. Even 'simple' methods, honestly error-barred, outrank gut feeling.`,
          takeaways: [
            "Beat the naive baseline or you have nothing",
            "Decompose: trend vs seasonality vs noise",
            "Driver-based forecasts are transparent and meeting-friendly",
          ],
          practice: "Take monthly revenue from the clean sales data: compute naive, 3-month MA, and seasonal-naive forecasts for the next month. Which wins?",
        },
      ],
    },
    {
      id: "a3",
      title: "ETL & Pipelines",
      summary: "Extract-Transform-Load in practice: batch vs streaming, pipeline design, incremental loads, quality gates.",
      lessons: [
        {
          id: "a3l1",
          title: "What ETL/ELT Really Means",
          minutes: 8,
          content: `**ETL** = Extract (pull from sources) → Transform (clean, reshape, business rules) → Load (write to a warehouse/DB). **ELT** flips the last two: load raw first, transform *inside* the warehouse (the modern default — tools like dbt made it standard).

A concrete sales pipeline (you will build a simulated version in Project 5):

1. **Extract** — pull yesterday's orders from the store API/CSV drop → raw zone.
2. **Validate** — schema check (expected columns exist), row count within expected range, keys not null. Fail loudly, don't silently continue.
3. **Transform** — trim/case, types, dedupe, currency math (revenue = units × price), conform categories, derive date parts.
4. **Load** — upsert into ~fact_orders~ (new rows insert, changed rows update).
5. **Log & alert** — rows in/out, rejects, runtime; alert on failure. A pipeline without logging is a rumour.

**Layers** (the warehouse shape professionals use):
- **Raw/landing** — byte-identical source copy. Rebuild everything else from here.
- **Staging** — cleaned, typed, 1:1 with sources. One model per source table.
- **Marts** — business-shaped stars (fact_orders + dim_customer...) that dashboards read.

Why raw layers matter: when a transform bug corrupts the clean data (it will), you re-run from raw — no panicked emails to the source system asking for re-exports.

> TIP: The Automation Studio implements this exact shape: ingest → clean → transform → output, with a run log of each step. Treat that tool as the ETL sandbox; treat the generated Python as the real-world translation.`,
          takeaways: [
            "ETL: extract → transform → load; modern stacks ELT in-warehouse",
            "Layered: raw → staging → marts; raw is your safety net",
            "Validate + log or the pipeline is a silent liability",
          ],
          practice: "Sketch the 5 steps for a support-tickets pipeline (CSV export → clean CSAT → load facts). What would you validate?",
        },
        {
          id: "a3l2",
          title: "Batch vs Streaming",
          minutes: 7,
          content: `**Batch** — process data in scheduled chunks (hourly/daily). Simple, cheap, debuggable, perfectly fine for 90% of analytics (dashboards, reports, ML training). Latency: minutes to hours.

**Streaming (near-real-time)** — process events as they arrive (Kafka → Flink/Spark Streaming → serving DB). Latency: seconds. Needed for fraud detection, live ops monitoring, dynamic pricing, alerting on critical events.

The decision question: **"how much money does a 1-hour delay cost?"** If the answer is "nothing, really" — batch it. Streaming adds real costs: complex infrastructure, out-of-order events, late data, harder testing, on-call burden.

**Micro-batch** — the middle path (process every 5–15 minutes); what many "real-time" teams actually run, and what dbt/warehouse tools increasingly make easy.

The hybrid reality of most companies:
- **Streaming** for the few metrics where minutes matter (payments failing, site down).
- **Hourly/daily batch** for everything dashboards need.
- Both land in the same warehouse, differing only in freshness.

> REAL WORLD: A classic over-engineering story: team builds streaming for a daily sales dashboard. Cost triples, bugs multiply — nobody needed minute-fresh revenue. Learn to say: "batch is the right SLA here" — that sentence saves companies real money, and interviewers respect it.`,
          takeaways: [
            "Batch by default; stream only when delay costs money",
            "Micro-batch covers most 'real-time' needs",
            "Streaming = latency + complexity + on-call; choose with eyes open",
          ],
          practice: "Classify: fraud alerts, monthly board report, live delivery ETAs, weekly marketing recap. Which truly need streaming?",
        },
        {
          id: "a3l3",
          title: "Building a Sales Pipeline (Design Walkthrough)",
          minutes: 10,
          content: `Design a production-grade pipeline end to end — this is the blueprint Project 5 implements step by step.

**Spec.** Sources: daily CSV export (POS) + marketing spend sheet. Target: mart for the exec dashboard. SLA: ready by 07:00. Grain: one row per order line.

**Staging models (per source):**
~~~
-- stg_pos_orders: one row per line, typed, deduped
select
  order_id, order_date::date, trim(customer), region,
  category, product, units::int, unit_price::numeric
from raw.pos_orders
where order_id is not null
~~~

**Quality gates between steps:**
- Schema: expected columns present, types cast cleanly.
- Volume: today's rows within ±40% of 7-day average (a sudden 0 = source broke, not sales stopped).
- Keys: no null order_ids, no new-region surprises without review.
- Business: ~revenue = units × unit_price~ recomputed vs source where available.

**Fact & dim build:**
- ~dim_customer~ — distinct customers with attributes (SCD-2 if history matters — next module).
- ~fact_order_lines~ — grain enforced: one row per (order, product); duplicates rejected with a log entry, not silently merged.

**Incremental strategy** — process only new/changed data: filter source by ~loaded_date = today~ or ~updated_at > last_run~; full refresh weekly as a safety net. Incremental keeps runs fast as data grows — the difference between a 2-minute and a 2-hour daily job.

**Orchestration** — cron for simple chains; Airflow/Prefect/Dagster when dependencies grow (extract → stage → test → publish → alert). Every run emits: rows in/out, rejects, runtime, status.

> TIP: Write the README of this pipeline BEFORE coding it (sources, SLA, grain, gates, owners). In interviews, walking through this design — especially the quality gates and incremental logic — signals real-world experience louder than any tool name.`,
          takeaways: [
            "Spec first: sources, SLA, grain, gates, owner",
            "Volume + schema + key + business gates catch breakage early",
            "Incremental loads keep pace as data grows; full-refresh weekly",
          ],
          practice: "Write the 8-line README spec for the support-tickets pipeline. Then compare it to Project 5's brief.",
        },
        {
          id: "a3l4",
          title: "Data Quality Checks & Monitoring",
          minutes: 8,
          content: `Pipelines fail quietly unless you instrument them. The professional framework (dbt tests, Great Expectations, and our Automation Studio all implement flavors of it):

**Four test levels:**

1. **Schema tests** — columns exist, types right, no nulls in keys, uniqueness on primary keys.
2. **Volume tests** — row counts within expected bands (vs yesterday, vs 7-day avg). Catches silent upstream changes better than anything.
3. **Value tests** — ranges (price ≥ 0), allowed sets (region ∈ 4 values), referential integrity (every order's customer exists).
4. **Business tests** — revenue reconciliation: ~SUM(fact)~ ≈ source system total within tolerance; cross-metric sanity (AOV between $20 and $200, alarm if not).

**Freshness monitoring** — is the newest data actually new? ~max(order_date)~ within SLA hours, else page someone.

**Alerting discipline:**
- Alert on *failures and anomalies*, not everything (alert fatigue kills monitoring).
- Every alert names: what broke, since when, link to run log, suggested first action.
- Weekly digest of row counts + rejects = the health heartbeat stakeholders learn to trust.

**Incident habit** — when a check fires: freeze dashboards pointing at bad data (or annotate them), fix root cause, backfill, then write a 5-line post-mortem: what happened, why, detection time, fix, prevention. Teams that do this earn the "their numbers are trustworthy" reputation — the most valuable currency an analytics team has.

> TIP: In the Automation Studio, the run log's step timings and reject counts are your mini-monitoring. In Project 5 you add explicit assertions (row count band, non-null keys) — the same asserts you would write as dbt tests in a real warehouse.`,
          takeaways: [
            "Test schema, volume, values, business rules — in that order",
            "Freshness SLAs + actionable alerts = trust",
            "Post-mortems turn incidents into permanent hardening",
          ],
          practice: "Write the 6 assertion list for the orders pipeline (2 schema, 1 volume, 2 value, 1 business). These become Project 5's quality step.",
        },
      ],
    },
    {
      id: "a4",
      title: "Automation",
      summary: "What to automate, scheduled reporting, threshold alerting, and the project patterns that free your week.",
      lessons: [
        {
          id: "a4l1",
          title: "What to Automate First (The Automation Audit)",
          minutes: 8,
          content: `Automation is leverage: every hour saved weekly = ~50 hours a year. But automating the wrong thing wastes weeks. Run this audit:

**Score each recurring task on:**

- **Frequency** — daily? weekly? (high = automate candidate)
- **Steps are identical?** — same filters, same charts, same recipients every time (identical = scriptable; if you redesign each time, don't automate yet)
- **Error cost** — copy-paste slips in a board report are expensive (high = automate)
- **Stability of sources** — file/API format changes often? (unstable = fix the source first)

**The usual first winners (in order of ROI):**

1. **The recurring report** — weekly sales summary emailed as CSV/PDF. 45 min/week → 0.
2. **Data refresh + validation** — pull, clean, load, run checks before anyone notices anything.
3. **Alert reports** — "flag me when X" (stock < threshold, CSAT < 4, spend > budget).
4. **File hygiene** — renaming, merging, archiving exports.
5. **One-off at scale** — "update these 200 rows" tasks.

**Don't automate (yet):** evolving analyses, anything < 10 min/quarter, one-off cleanup, tasks whose *definition* keeps changing.

The litmus test: **if you can write the steps as a numbered list, you can automate it.** Write the list — that list IS the pipeline spec (and the docstring of your script).

> REAL WORLD: An analyst automated the Monday report in a weekend (Python + cron). Six months later they were promoted — not for the script, but because Monday mornings went from "compile numbers" to "review and recommend". Automation buys thinking time; thinking time buys promotions. The Automation Studio teaches the pattern visually first, then hands you the real code.`,
          takeaways: [
            "Audit tasks: frequency × sameness × error cost × source stability",
            "Automate: recurring reports, refresh+validate, alerts, file hygiene",
            "If you can number the steps, you can script them",
          ],
          practice: "List your (or an imaginary analyst's) 5 recurring tasks; score each 1–5 on the audit; pick the first automation target.",
        },
        {
          id: "a4l2",
          title: "Scheduled Reports — From Script to Cron",
          minutes: 9,
          content: `The classic automation: a script that builds the report and a scheduler that runs it. Three layers:

**1. The script** (your generated project code):
~~~
# weekly_report.py
import pandas as pd
from datetime import datetime, timedelta

end = datetime.now()
start = end - timedelta(days=7)
df = pd.read_csv("data/sales.csv", parse_dates=["order_date"])
week = df[df.order_date.between(start, end)]

summary = (week.groupby("region")
             .agg(revenue=("revenue","sum"), orders=("order_id","count")))
summary.to_csv(f"output/weekly_{end:%Y%m%d}.csv")
print(summary.describe())   # sanity log
~~~

**2. The scheduler:**
- **cron** (Linux/macOS): ~0 7 * * 1 python weekly_report.py~ = every Monday 07:00.
- **Windows**: Task Scheduler. **Cloud**: GitHub Actions (free for public repos — and your portfolio is exactly that), Airflow for dependency-heavy DAGs.
- GitHub Actions version: ~.github/workflows/report.yml~ with ~schedule: - cron: "0 7 * * 1"~ — your repo emails/commits the report itself. Interviewers love seeing this in a portfolio.

**3. The delivery** — email via SMTP, Slack webhook, or write-to-shared-drive. Include: the artifact + 3-line summary + data-as-of timestamp. A report without "as of when" breeds distrust.

**Reliability checklist:** re-run safe (idempotent), failure notification (silent failure = worst failure), data-freshness check before sending, log each run (rows, runtime), and a manual-trigger escape hatch.

> TIP: Idempotent = running twice changes nothing (overwrite the file rather than append; upsert rather than duplicate). Cron double-fires happen. Design for it from day one — the Automation Studio's export step overwrites by design for exactly this reason.`,
          takeaways: [
            "Script + scheduler + delivery = automated reporting",
            "GitHub Actions can run your portfolio's reports for free",
            "Idempotent + failure-notifying + logged, or it is not production",
          ],
          practice: "In Automation Studio build the weekly sales report pipeline and export its Python — then sketch the GitHub Actions YAML that would run it Mondays.",
        },
        {
          id: "a4l3",
          title: "Alerting & Threshold Monitoring",
          minutes: 8,
          content: `Alerts are reports with an opinion. They watch metrics and interrupt humans only when attention is genuinely needed.

**The three alert families:**

1. **Threshold** — "stock < 10 units", "CSAT < 4.0 this week", "spend > 90% of budget". Simple, transparent, start here.
~~~
low_stock = df[df["stock"] < df["reorder_point"]]
if not low_stock.empty:
    send_alert(f"{len(low_stock)} SKUs below reorder point")
~~~
2. **Trend/deviation** — "revenue down >20% vs 7-day average", "resolution time rising 3 weeks straight". Catches slow emergencies thresholds miss.
3. **Anomaly** — statistical detection (value outside ±3σ of the same weekday, or Prophet prediction intervals). Fewer false positives than raw thresholds; more complexity; adopt after thresholds prove out.

**Alert design rules (the ones that prevent alert fatigue):**

- **Actionable or die** — every alert names the owner and the first action. If nobody would DO anything, delete the alert.
- **Tiered severity** — page (site down), same-day (SLA miss), weekly digest (trends). Not everything is a siren.
- **Include context in the message** — metric value, threshold, when it crossed, link to the dashboard. "Sales down" is an anti-alert.
- **Deduplicate & settle** — one alert per issue per day, auto-resolve when recovered.

> REAL WORLD: The ops team that gets 200 alerts/day ignores all of them (the boy-who-cried-wolf effect, with revenue consequences). The analyst who prunes 200 alerts to 6 good ones becomes instantly more valuable than the one who built the 200. Curation IS the skill.`,
          takeaways: [
            "Threshold → trend → anomaly: escalate complexity only as needed",
            "Actionable, tiered, contextual, deduplicated — or delete",
            "Alert fatigue is a design failure, not a user failure",
          ],
          practice: "Design 3 alerts for the support dataset: one threshold, one trend, one weekly digest. Write the exact message text each would send.",
        },
        {
          id: "a4l4",
          title: "Automation Project Patterns",
          minutes: 8,
          content: `Four battle-tested patterns cover most workplace automation. Each maps to a project or tool in this academy:

**Pattern 1 — Refresh & Publish** (Project 5):
pull → validate → clean → aggregate → write mart/dashboard source → notify. The daily heartbeat of analytics. Key moves: idempotent writes, freshness check before publish, failure alert with run log.

**Pattern 2 — Watchdog** (alerting lesson):
read metric → compare vs threshold/trend → if breach, send context-rich alert → log the check even when quiet. Quiet logging matters: "checked, fine" history proves the watchdog was awake.

**Pattern 3 — File Factory** (Projects 1–3):
template + data = artifact. The report skeleton (README, exec summary, charts) is generated from data each period, analyst adds commentary. Office-friendly variant: python-docx/openpyxl fill a Word/Excel template. Your portfolio generator uses this exact pattern.

**Pattern 4 — Inbox-to-Insight** (advanced):
files arrive in a folder/mailbox → script watches → ingests, archives originals, appends to warehouse → triggers Pattern 1. The "export arrives every Friday 17:00" reality of corporate life, industrialized.

**Cross-pattern engineering habits:**

- **Config over code** — thresholds/paths/recipients in a config file, not buried in logic.
- **Dry-run flag** — ~python report.py --dry-run~ processes but sends nothing. Test email lists exist for a reason.
- **Secrets outside code** — env vars/secret store, never passwords in scripts (GitHub scans will catch you).
- **Logs > print** — timestamps, rows processed, errors; a ~runs/2025-01-15.log~ per execution.

> TIP: When you export a project here to GitHub, add a ~README.md~ section: "How this runs scheduled" with the cron line and secrets note. Recruiters who read repos notice production thinking immediately — it is the difference between a toy and a tool.`,
          takeaways: [
            "Four patterns: Refresh&Publish, Watchdog, File Factory, Inbox-to-Insight",
            "Config over code; dry-run flag; secrets outside the repo",
            "Log every run, including the quiet ones",
          ],
          practice: "Pick your most annoying recurring task and map it to one of the four patterns in 5 bullet points — that is your next personal automation project.",
        },
      ],
    },
    {
      id: "a5",
      title: "Warehousing & Data Modeling",
      summary: "OLTP vs OLAP, facts & dimensions, slowly changing dimensions, and semantic/metrics layers.",
      lessons: [
        {
          id: "a5l1",
          title: "OLTP vs OLAP — Two Kinds of Databases",
          minutes: 7,
          content: `**OLTP** (Online Transaction Processing) — the databases that *run the business*: Postgres/MySQL behind the app. Optimized for many small writes/reads: place an order, update a cart. Rows normalized (no redundancy), strict constraints, millisecond queries, dislike of big scans.

**OLAP** (Online Analytical Processing) — the databases that *analyze the business*: Snowflake, BigQuery, Redshift, DuckDB. Optimized for few big reads: scan millions of rows, aggregate, return. Columnar storage (read only needed columns), denormalized stars, seconds-to-minutes queries.

Why analysts must care:

- **Don't run heavy analytics on production OLTP** — a 5-minute aggregation can lock tables and slow the checkout line. The extract/pipeline exists to move load off OLTP onto OLAP. This is WHY warehouses exist at all.
- **Source data reflects OLTP physics** — heavily normalized (customers here, addresses there, orders split across tables). Your staging layer's job is to de-normalize into analytics-friendly shapes.
- **Different guarantees** — OLTP: current state ("customer's address"). OLAP: analytical history ("revenue by region over time", slowly changing — next lessons).

The mental picture: the app's database is the **kitchen** (fast, precise, busy); the warehouse is the **pantry + archive** (organized for cooking reports). Pipelines move food from one to the other on a schedule.

> TIP: Interview question staple: "Why not query production directly?" Answer with this lesson: load, locking, no history, wrong shapes — then mention the raw→staging→mart remedy. DuckDB, by the way, is a free laptop-sized OLAP engine — perfect for practicing on your own CSVs.`,
          takeaways: [
            "OLTP runs the app (rows, writes); OLAP analyzes it (columns, scans)",
            "Never run heavy analytics on production OLTP",
            "Warehouse = history + shapes analytics needs",
          ],
          practice: "Label each: 'checkout transaction', 'revenue by region for 3 years', 'update customer email'. Which engine handles which, and why?",
        },
        {
          id: "a5l2",
          title: "Facts, Dimensions & Grain (Modeling Drill)",
          minutes: 9,
          content: `Deep-dive on the star schema mechanics — the modeling vocabulary every warehouse uses.

**Grain statement first, always.** "One row = one order line per day per store." Write it on the model file. Every later confusion ("why did revenue double?") resolves by re-reading the grain.

**Fact types:**
- **Transactional** — one row per event (order line, payment). The default.
- **Periodic snapshot** — one row per period (daily inventory level, monthly balance). For stock levels, account balances.
- **Accumulating snapshot** — one row per process with milestones (order: placed → paid → shipped → delivered). For funnels and cycle-time analysis.

**Dimension design:**
- **Surrogate keys** — warehouse-generated integer keys (not business IDs) for stability and SCD handling.
- **Degenerate dimensions** — order number lives in the fact with no dimension table (no attributes to join; it is just a label).
- **Junk dimensions** — basket of yes/no flags grouped into one small dimension instead of 12 flag columns.
- **Role-playing dimensions** — one date table joined multiple times (order_date, ship_date, delivery_date).

**The modeling drill** (do this for any dataset): 1) state the grain; 2) list measures (additive? semi-additive like balances?); 3) list dimensions and their attributes; 4) declare relationships (1:*, which side); 5) name the table (~fct_order_lines~, ~dim_customer~).

> REAL WORLD: The naming convention itself communicates seniority: ~fct_/stg_/dim_/agg_~ prefixes with a stated grain are the dbt-style standard. Reviewers of your GitHub portfolio will notice within seconds — use it in all project files here.`,
          takeaways: [
            "Grain statement before columns; everything follows from it",
            "Transactional vs snapshot vs accumulating facts — pick by question type",
            "fct_/dim_/stg_ naming + surrogate keys = professional models",
          ],
          practice: "Run the 5-step drill on the support tickets dataset: grain, measures (additive?), dimensions, relationships, table names.",
        },
        {
          id: "a5l3",
          title: "Slowly Changing Dimensions (SCD)",
          minutes: 8,
          content: `Customers move, products get re-priced, employees change titles. A dimension that silently overwrites history corrupts every historical report. **SCD strategy** decides how change is captured:

**SCD Type 1 — overwrite.** Update in place. Old value gone. Fine for typos ("Nortth"→"North"); dangerous for facts like price or region: "December revenue by region" becomes a lie once January's region value overwrites December's.

**SCD Type 2 — version history.** New row per change with effective dates:
~~~
dim_customer
id  name      region  valid_from   valid_to     is_current
7   Ava Chen  North   2024-01-01   2025-03-31   false
7   Ava Chen  South   2025-04-01   null         true
~~~
Facts join via surrogate key + date → the region *as it was at sale time*. This is the analytics standard, and "when did the customer actually live in South" is why. Cost: dimension grows by one row per change (trivial for most businesses).

**SCD Type 0/3** — never change (birth date) / keep one previous value in an extra column (niche).

**Implementation notes:** dbt snapshots (~dbt snapshot~) and most warehouses have SCD-2 primitives; the check (~is_current~, no overlapping ranges) is a classic data test. When joining facts to SCD-2 dims: join on the surrogate key assigned at load time, or on ~fact_date BETWEEN valid_from AND valid_to~ — never on the business key alone, or you duplicate rows.

> REAL WORLD: The classic failure: pricing team updates ~dim_product.price~ in place; the finance report "margin by product last year" silently reprices history. SCD-2 (or storing unit price on the fact line, which the retail data here does!) is the fix. Note: ~order_items.unit_price~ is a fact-side record of price-at-sale — a modeling decision you now can name.`,
          takeaways: [
            "Type 1 overwrites (typos ok); Type 2 preserves history (the standard)",
            "Join facts to SCD-2 via surrogate key or date-between — never business key alone",
            "Store price-at-transaction on facts when history matters",
          ],
          practice: "Which SCD type for: customer email (1), customer region (2), birth date (0), product list price (2 or price-on-fact)? Defend each.",
        },
        {
          id: "a5l4",
          title: "Metrics Layer & Semantic Models",
          minutes: 7,
          content: `The newest warehouse layer: a **semantic/metrics layer** — one governed definition per metric, consumed by every tool (BI, notebooks, AI assistants).

The problem it kills: three teams, three "revenue" definitions (with/without refunds, with/without shipping, order-date vs payment-date). Every cross-team meeting starts with 15 minutes of reconciliation. Every exec asks why slide 3 ≠ dashboard 7.

**How it works** — metrics defined once, centrally:
~~~
# dbt Semantic Layer style (concept)
metrics:
  - name: revenue
    type: sum
    agg: revenue
    description: "Net of refunds, by order date"
  - name: aov
    type: derived
    formula: revenue / orders
~~~

Tools: dbt Semantic Layer/MetricFlow, Cube, LookML (Looker's version, mature for years), Power BI's shared datasets/measures. The pattern matters more than the tool:

1. **Define once** — name, formula, grain, filters, owner, description.
2. **Consume everywhere** — dashboards, notebooks, GPT-style chat tools all hit the same definitions.
3. **Change with review** — metric definitions are versioned like code; a definition change is an *event* with an announcement (last year's board deck numbers must stay explainable).

**The governance habit** that makes this work: a metrics catalog (even a spreadsheet at small scale) — metric, owner, formula, refresh, known caveats. When someone asks "what IS active user here?", the answer is a link, not a meeting.

> TIP: Your generated project READMEs include a 'Metric Definitions' block. Fill it seriously — that section, in interviews, is what separates people who made charts from people who run metrics. Companies adopt semantic layers precisely to escape definition chaos; you can be the person who prevented it.`,
          takeaways: [
            "One definition per metric, owned and versioned",
            "Semantic layers feed BI + notebooks + AI consistently",
            "A metrics catalog is the low-tech starting point — start one",
          ],
          practice: "Write governed definitions for revenue, orders, AOV, active customer on our retail data: formula, grain, filters, caveats. Two lines each.",
        },
      ],
    },
  ],
};

const master: PathLevel = {
  id: "master",
  title: "Master — Lead & Deliver",
  tagline: "Scoping, advanced analytics (cohorts, RFM, funnels), analytics engineering, executive communication and career.",
  duration: "Weeks 19–26",
  outcomes: [
    "Scope and deliver an end-to-end analytics project for stakeholders",
    "Run cohort, RFM and funnel analyses that drive strategy",
    "Apply analytics-engineering craft: Git, tests, docs, CI",
    "Communicate with executives and defend recommendations",
    "Own a portfolio and interview process end-to-end",
  ],
  modules: [
    {
      id: "m1",
      title: "Capstone Strategy",
      summary: "Scoping real business problems, stakeholder interviews, KPI trees and delivery planning.",
      lessons: [
        {
          id: "m1l1",
          title: "Scoping a Business Problem",
          minutes: 9,
          content: `Masters get handed fog: "our numbers feel off", "help us grow". Scoping turns fog into a deliverable. The framework:

**1. Ask the money question.** What decision, worth how much, by when? "Should we expand South-region inventory (~$400k bet, board meets in 3 weeks)" — now the analysis has a deadline, an audience, and a bar for 'enough'.

**2. Define the deliverable backwards.** Board needs: one slide, 3 KPIs, 2 options with risks. Work backwards: what data produces those options? That defines scope — and *excludes* everything else. Scope creep is the capstone killer; the deliverable list is your contract.

**3. Feasibility check.** Data exists? Access granted? Definitions agreed (revenue net of refunds? which date field)? Freshness adequate? **No/unknown answers = risks to surface on day one**, not week four. The most senior sentence in analytics: "I can deliver X by Friday; Y needs a data source we don't have — here's the workaround."

**4. Decompose into analysis questions.** "Should we expand South inventory?" → What is South demand trend? → What is current sell-through and stockout rate? → What does Electronics AOV look like there? → What supply lead time? Each becomes a queryable question with an owner.

**5. Write the one-pager.** Problem, decision, deliverables, data needed, timeline, risks. Stakeholder signs it (even a thumbs-up on Slack). This document is why senior analysts are trusted with ambiguity.

> TIP: Your Project 7 (HR capstone) begins with exactly this one-pager. Doing it *before* opening any tool feels slow and is 10× faster than the alternative — every experienced stakeholder recognizes a scoper within minutes.`,
          takeaways: [
            "Money question: decision × value × deadline",
            "Deliverable-first scoping excludes creep",
            "Surface data risks on day one, in writing",
          ],
          practice: "Write the one-pager for Project 7 before opening the dataset: problem, decision, deliverables, data, timeline, risks.",
        },
        {
          id: "m1l2",
          title: "Stakeholder Interviews",
          minutes: 8,
          content: `Requirements live in stakeholders' heads, not in tickets. A 30-minute interview saves weeks of wrong deliverables. The craft:

**Interview the doers, not just the askers.** The VP asks for "a churn dashboard"; the support lead knows the operational question underneath ("which accounts to call before renewal"). Interview both.

**The five questions that matter:**

1. "Walk me through the last time you made this decision — what did you look at?" (reveals real workflow, real data)
2. "What would make you act differently tomorrow?" (separates nice-to-know from need-to-act)
3. "What number, if it changed, would scare you?" (the alert thresholds, the actual KPIs)
4. "Who else consumes this and what do THEY need?" (audience map)
5. "What's currently broken about how you get this?" (the pain that justifies the project)

**Listen for metric definitions** — when they say "active customer", interrupt kindly: "how do YOU define active?" Write it down. Definitions gathered in interviews become the semantic layer (previous module).

**Close every interview** with: "Here's what I heard — the deliverable is X by Y; the biggest risk is Z. Correct me." That 60-second recap is where misunderstandings die cheap.

> REAL WORLD: The fastest way to be labeled senior as an analyst: stakeholders say "they got what I meant, not what I said." That only happens through interviews + recaps. It is a learnable, mechanical craft — not charisma.`,
          takeaways: [
            "Interview doers and askers — different truths",
            "Five questions: last decision, action trigger, fear metric, audience, current pain",
            "Always close with a written recap for correction",
          ],
          practice: "Simulate: interview a friend about 'they want a sales dashboard' using the 5 questions. Write the recap and the definition list it produced.",
        },
        {
          id: "m1l3",
          title: "KPI Trees & Metric Design",
          minutes: 9,
          content: `A **KPI tree** decomposes a top-line metric into its drivers — the map that tells you WHERE to look when the top number moves. Masters build them before touching data.

**Revenue tree (retail):**
~~~
Revenue = Traffic × Conversion × AOV
        = Visits × (Orders/Visits) × (Revenue/Orders)
AOV     = Units per order × Avg unit price
~~~

Every branch is checkable: Is the dip traffic (marketing problem), conversion (site/ops problem), or AOV (mix/pricing problem)? The tree converts "sales are down" into three named suspects with owners.

**Build one:**
1. Start at the money metric the executive owns.
2. Multiply/divide it into 2–3 driver pairs per level (rates × volumes — your Beginner hygiene).
3. Stop at metrics that (a) exist in data and (b) have an owner who can move them.
4. Annotate each leaf: formula, source table, owner, freshness. That annotation IS the metric catalog.

**Diagnostic drill:** revenue −8% MoM → walk the tree with actuals: traffic −2%, conversion −1%, AOV −5% → AOV fell → units/order flat → avg unit price down → promo mix shifted. Ten minutes, root cause found, meeting over. Without the tree, the same meeting is 40 minutes of flailing.

**Design guardrails:** rates never sum across levels (mix them wrongly and you get Simpson's paradox — segment before concluding); volumes and rates both shown; every tree node ties to one owner.

> TIP: Add your KPI tree as a Mermaid/ASCII diagram in project READMEs — the generator's template has a slot for it. In interviews, drawing a KPI tree on a whiteboard in 60 seconds is the single most impressive move available.`,
          takeaways: [
            "Decompose money metrics into rate × volume drivers",
            "The tree localizes blame: traffic vs conversion vs AOV",
            "Annotate leaves with formula/source/owner = living metric catalog",
          ],
          practice: "Draw the KPI tree for an online course business (revenue → enrollments × price; enrollments → visitors × signup rate...). 3 levels deep.",
        },
        {
          id: "m1l4",
          title: "Planning the Delivery",
          minutes: 8,
          content: `Capstones fail on logistics, not analysis. The delivery plan is short and brutal:

**Milestones (work backwards from the decision date):**
- **D-14** scope signed, data access confirmed
- **D-10** data profiled + cleaned, quality gates passed
- **D-7** core analyses done, hypotheses tested (verdicts logged)
- **D-4** draft deliverable reviewed by a friendly stakeholder (pre-mortem for reactions)
- **D-2** final deck/doc, numbers cross-checked by a second pair of eyes
- **D-0** present, decisions logged, next steps owned

**The pre-review trick (D-4):** show the draft to one stakeholder privately. They will tell you the political landmine ("finance will ask about refunds — include it") that would have exploded in the room. Every master presenter does this; none admit it.

**Risk log on one slide:** data risk (freshness?), definition risk (refunds included?), dependency risk (supplier confirmation needed?), what happens if data says the opposite of expectations (it should be safe to say so — say it explicitly in planning).

**The 10/50/90 rule of effort:** first 10% of time produces 80% of the insight (profile + group-bys); the last 90% of time produces the last 20% (edge cases, polish, one more cut). Time-box the tail: done-and-defensible beats perfect-and-late. The decision date does not move for your chart title font.

**After delivery:** write the 5-line summary of what was decided, archive data + code + README (your workspace export does this), schedule the follow-up check ("did the action move the metric?") — closing the loop is what turns analysis into impact, and impact stories are interview gold.

> TIP: Every project here ends with 'Recommended Actions' + this loop. Fill them as if a board reads them — because in interviews, they do.`,
          takeaways: [
            "Milestones backwards from the decision date",
            "Pre-review with a friendly stakeholder defuses landmines",
            "10/50/90: time-box the polish tail; close the loop after delivery",
          ],
          practice: "Write the D-14 → D-0 plan for Project 7 with your real available hours. Where is your 10% point? Where will you cut the tail?",
        },
      ],
    },
    {
      id: "m2",
      title: "Advanced Analytics",
      summary: "Cohorts & retention, RFM segmentation, funnel analysis, and a practical bridge to prediction.",
      lessons: [
        {
          id: "m2l1",
          title: "Cohort & Retention Analysis",
          minutes: 10,
          content: `A **cohort** = users grouped by a shared start event (usually signup month). **Retention** = what % of each cohort is still active N periods later. Together they answer the question averages hide forever: **"is the product actually keeping people?"**

The artifact is the **triangle** — one row per cohort, one column per month-since-start:

~~~
           M0    M1    M2    M3
Jan cohort 100%   42%   31%   27%
Feb cohort 100%   45%   34%    —
Mar cohort 100%   48%    —     —
~~~

How to read it like a pro:

- **Read DOWN a column** (M1 column): are newer cohorts retaining better at the same age? Onboarding improvements show here first.
- **Read ACROSS a row**: where does each cohort flatten? The flatten point is your "natural retention floor" — the honest base of the business.
- **Classic trap**: overall "monthly active" can RISE while every cohort decays faster — new-user flood masking a leaky bucket. Cohorts catch this; averages never do.

**Building it (SQL/pandas shape):** assign ~cohort_month = first activity month~; ~period = months_since~; ~retention = distinct active users / cohort size~ per (cohort, period). One ~GROUP BY~, one pivot — Project 4 walks it.

**Business actions the triangle triggers:** M1 cliff → onboarding fixes; M2 decay → engagement loops (email digests, streaks); flat-at-30% → find what the 30% do differently (that's your ICP — ideal customer profile).

> REAL WORLD: Investors and growth leads speak in cohort triangles. Presenting "cohort M1 retention improved 42%→48% over two quarters" is a senior-level sentence that no overall-average claim can match. Project 4 has you build one from raw orders.`,
          takeaways: [
            "Cohorts by start month; retention = % active N periods later",
            "Down columns = newer better? Across rows = where it flattens",
            "Overall averages can mask a leaky bucket — cohorts unmask",
          ],
          practice: "From the SQL orders table, sketch the cohort triangle: signup month cohorts × months since, retention = customers ordering in each period.",
        },
        {
          id: "m2l2",
          title: "RFM Customer Segmentation",
          minutes: 9,
          content: `**RFM** scores every customer on three behavioral axes — the cheapest, most actionable segmentation in analytics (no ML required):

- **Recency** — days since last purchase (lower = hotter)
- **Frequency** — number of purchases
- **Monetary** — total spend

**The method:**

1. Compute R, F, M per customer from transactions.
2. Score each 1–5 by **quintiles** (top 20% of recency = 5...). Scoring by rank avoids outlier distortion.
3. Combine: ~RFM = 545~ etc. — 125 cells collapse into named segments:

~~~
Champions      (R5,F5,M5)  — reward, make them evangelists
Loyal          (R4+,F4+)   — upsell, subscription offers
Big spenders   (M5 any R)  — protect, VIP service
At risk        (R1-2,F4-5) — WIN-BACK campaigns NOW (they used to love you)
Hibernating    (R1-2,F1-2) — cheap reactivation only
New            (R5,F1)     — onboard to second purchase (second purchase = retention hinge)
~~~

4. **Count + value each segment** → the action table: "At-risk = 9% of customers but 24% of historical revenue — win-back budget justified."

Why it beats fancy models: every cell has a direct marketing action, the logic explains itself to non-analysts, and it recomputes nightly in a simple query. It is also a perfect interview take-home: shows SQL (window functions for 'last purchase'), business sense (segment naming), and communication (the action table).

> TIP: Project 4's SQL track builds RFM on the store database; the segments feed the 'at-risk revenue' chart. The sentence "24% of revenue sits with at-risk customers" is exactly how analytics earns budget.`,
          takeaways: [
            "RFM = Recency, Frequency, Monetary, scored by quintiles 1–5",
            "Named segments map directly to campaigns (win-back, upsell, onboard)",
            "Report segments by count AND revenue share",
          ],
          practice: "Compute RFM quintile scores for 5 sample customers by hand from orders data. Name each one's segment and one action.",
        },
        {
          id: "m2l3",
          title: "Funnel Analysis",
          minutes: 9,
          content: `A **funnel** tracks users through ordered steps — visit → signup → activate → purchase — and exposes exactly WHERE you lose them.

**Build it honestly:**

1. Define steps with **entry rules** (any order? strict order? time-boxed to one session or 7 days?). Changing step rules changes the funnel — state them.
2. Count unique users per step; conversion = step n+1 ÷ step n.
3. **Segment every funnel** by device/source/cohort — the average funnel lies; mobile's 2% checkout step hides desktop's 40%.

~~~
Visit→Signup   38%
Signup→Active  21%   ← biggest leak
Active→Paid     9%
~~~

**Diagnose the leak before proposing fixes:**

- **Volume vs rate**: a small-step leak on huge volume (visit→signup) can matter more than a big-rate leak on small volume.
- **Time-in-step**: median time from signup→activation; if 3 days, your activation emails are the lever.
- **Drop-off segments**: who falls at signup→active? (one device? one source? one region?)
- **Compare funnels** across periods/variants — the A/B tie-in: did the new checkout step beat the old on step-rate, not vibes.

**The famous ordering trap:** steps are ordered, so an overall conversion is not multiplicative-independent — people can skip steps (direct-to-purchase). Define whether skipping counts, or you will argue with yourself in two charts.

**Actions map to steps** — each leak has a different owner: top-of-funnel leaks → marketing; middle → product/onboarding; bottom → pricing/UX/trust (shipping cost shock is the classic checkout killer).

> TIP: The HR capstone's application funnel and the marketing project's spend→conversion chain both use this. Present funnels with the segment split — "overall 9%, but 14% desktop vs 3% mobile" is the sentence that gets the mobile team funded.`,
          takeaways: [
            "Define step rules; count unique users; convert per step",
            "Segment funnels or the average lies",
            "Each leak has an owner: marketing vs product vs pricing",
          ],
          practice: "Map the marketing dataset into a funnel: impressions → clicks → conversions per channel. Which step leaks worst, for whom?",
        },
        {
          id: "m2l4",
          title: "Bridging to Predictive Analytics",
          minutes: 9,
          content: `You will not become an ML engineer here — but a master analyst must know what ML **is for, when to call it, and how to not get fooled**.

**When classic analytics is enough (most of the time):** descriptive dashboards, drill-downs, cohort/RFM, threshold alerts. If a GROUP BY answers it, ship a GROUP BY.

**When prediction earns its keep:**

- **Ranking problems** — which 5,000 customers to email? Churn score orders the list; the campaign only touches the top decile anyway.
- **Forward-looking numbers** — demand next month for inventory planning.
- **Too many variables** — hundreds of features interacting; a human cannot eyeball it.

**The analyst's toolkit, in ascending order:**

1. **Logistic regression** — churn probability, fully explainable ("each extra day since last order ×1.03 churn odds"). Start here, always.
2. **Tree ensembles (XGBoost/LightGBM)** — tabular workhorses; still interpretable via feature importance + SHAP.
3. **Everything deep** — leave to specialists; your job is the data and the decision framing.

**The discipline that protects you:**

- **Target leakage** — including variables that encode the answer ("cancelled_date" in a churn model). The #1 rookie disaster; weirdly good metrics = investigate.
- **Temporal split** — train on January–October, test on November–December. Random splits leak the future; production performance craters.
- **Class imbalance** — 5% churn rate: a "95% accurate" model that predicts 'no churn' for everyone is worthless. Read precision/recall, not accuracy.
- **Baseline first** — beat "predict the mean" and "last month's value" or the model has no business case.

> TIP: In interviews, the winning shape is: "I'd start with rules + logistic regression as baseline; ML only if the lift justifies complexity." That sentence — scope discipline — is what separates analysts who ship from people who break prod with enthusiasm.`,
          takeaways: [
            "GROUP BY first; prediction when ranking/forecasting/dimensionality demands it",
            "Logistic regression → trees; explainable before exotic",
            "Leakage, temporal split, imbalance, baselines — the four guardrails",
          ],
          practice: "For HR attrition: which features would you include, which would be leakage, what's the naive baseline accuracy to beat?",
        },
      ],
    },
    {
      id: "m3",
      title: "Analytics Engineering",
      summary: "Git, dbt-style modeling & tests, documentation, and CI/CD — the engineering craft that makes analytics trustworthy.",
      lessons: [
        {
          id: "m3l1",
          title: "Version Control for Analysts (Git That Matters)",
          minutes: 10,
          content: `Git is how analytics becomes reviewable, revertible, and collaborative. The 20% of commands you will use daily:

~~~
git init                          # start tracking a folder (your portfolio!)
git add .                         # stage changes
git commit -m "Add sales cleaning project"
git log --oneline                 # history = your audit trail
git checkout -b feature/rfm       # branch for risky work
git merge feature/rfm             # merge after review
git push origin main              # backup + share (GitHub)
~~~

**Why analysts specifically need this:**

- **The audit trail** — "who changed the revenue definition and when?" ~git log~ answers; "I edited the file on the shared drive" does not.
- **Fearless refactoring** — break the model, ~git revert~, nothing lost. Confidence changes how boldly you work.
- **Review culture** — a teammate opens a pull request on your SQL; two eyes per change; the "trust but verify" problem solved structurally.
- **Your portfolio IS a repo** — this academy's workspace export is designed to become your GitHub profile's content. Recruiters read commits: consistent, well-messaged commits read as professionalism.

**Habits that separate pros:** small commits with verb-messages ("Fix region standardization for South"); ~.gitignore~ for data files with PII/large CSVs (never commit secrets or personal data — GitHub remembers forever); README-first repos; branches for experiments.

> REAL WORLD: Teams adopting git+PR review for SQL typically catch a 'wrong number' bug per week in review — bugs that previously shipped to the board deck. The workspace you build here practices exactly this shape: folder structure, READMEs, clean commits.`,
          takeaways: [
            "add → commit → push, with branches for experiments",
            "Git log = the audit trail stakeholders don't know they need",
            "Never commit secrets or PII; .gitignore data folders",
          ],
          practice: "Download your workspace ZIP, run git init, and make 3 meaningful commits (one per project folder). Read your own git log as a recruiter would.",
        },
        {
          id: "m3l2",
          title: "dbt Concepts: Models, Tests & Structure",
          minutes: 9,
          content: `**dbt** turned SQL transformations into engineered software. You may never install it — but you must speak its concepts, because every modern data team does (and this academy's project structure mirrors them).

**Models = versioned SQL files with contracts:**
~~~
-- models/staging/stg_orders.sql
select
  id as order_id,
  customer_id,
  order_date::date as order_date,
  lower(trim(status)) as status
from {{ source('raw', 'orders') }}
~~~
One file, one job, one grain, documented at the top. Models ~ref()~ each other (~ref('stg_orders')~) building a DAG: raw → staging → marts. The tool resolves order, reruns dependencies, and draws the lineage graph everyone can see.

**Tests = assertions in YAML:**
~~~
models:
  - name: stg_orders
    columns:
      order_id: {tests: [unique, not_null]}
      status:   {tests: [accepted_values: [completed, pending, cancelled]]}
~~~
Every run executes your assertions; failures block bad data from reaching dashboards. These are the quality gates from the ETL module, standardized.

**Structure convention** (use this in your portfolio repos even without dbt):

- ~staging/~ — 1:1 with sources, typed, renamed, light cleaning only
- ~marts/~ — business-shaped stars (fct_, dim_), the only layer BI touches
- ~~/.yml files — docs + tests live with the model
- ~README~ — grain statements, owner, SLA

**The mindset shift:** SQL stops being 'queries I run' and becomes 'models I maintain'. Someone asks "where does margin come from?" — answer: click the lineage graph, read the model. Onboarding new analysts drops from weeks to days.

> TIP: In Projects 1/4/5, your generated ~queries/~ folder follows staging→marts naming with a tests block in comments. Reading them after this lesson = a free dbt simulation.`,
          takeaways: [
            "Models = versioned SQL with one grain each, in a DAG",
            "Tests in YAML = quality gates on every run",
            "staging/ + marts/ structure — BI only touches marts",
          ],
          practice: "Take Project 4's SQL and split it into stg_orders, stg_customers, mart_rfm files. Write the unique/not_null test list for each.",
        },
        {
          id: "m3l3",
          title: "Documentation & Data Catalogs",
          minutes: 7,
          content: `Undocumented analytics is a liability with a nice dashboard. Documentation is how knowledge survives people changing teams.

**The three doc layers:**

1. **Model/README docs** — what: grain, owner, refresh cadence, source, known caveats. Where: top of the model file + README. Non-negotiable.
2. **Metric definitions** — the catalog from the semantic-layer lesson: name, formula, filters, owner. One searchable home.
3. **Lineage** — what feeds what (dbt draws it; even an ASCII diagram in the README works). Answers "if I change X, what breaks?" before anyone changes anything.

**The catalog entry template** (steal this):
~~~
### revenue
- Definition: SUM(order_lines.revenue), net of refunds, by order_date
- Grain: order line
- Owner: @ana (analytics)
- Refresh: daily 07:00
- Caveats: excludes marketplace channel until Jan 2025
- Consumers: exec dashboard, weekly report
~~~

**Docs that people actually use** obey three rules: **next to the code** (not a wiki nobody opens), **example-driven** (one real query per metric), and **updated in the same PR as the change** (docs drift = worse than no docs, because they lie confidently).

The culture trick: review docs in PRs like code. "This model changed the filter — where's the caveat update?" Two weeks of that and documentation becomes the default.

> TIP: Your generated project READMEs contain Definition/Caveats blocks for exactly this reason. When you export to GitHub, fill them in properly — hiring managers absolutely read READMEs before they read code.`,
          takeaways: [
            "Three layers: model docs, metric catalog, lineage",
            "Docs live next to code and update in the same PR",
            "Caveats section saves more meetings than any chart",
          ],
          practice: "Write full catalog entries (template above) for revenue and orders from the retail project. Note one honest caveat each.",
        },
        {
          id: "m3l4",
          title: "CI/CD for Analytics (Ship Like Engineers)",
          minutes: 8,
          content: `**CI/CD** (continuous integration/deployment) = every change is automatically built, tested, and deployed by machines. For analytics teams, a pragmatic version is free and transformative:

**The pipeline (GitHub Actions style):**

1. **PR opens** → CI runs: lint SQL (sqlfluff), build models against a sample/dev schema, run tests (unique/not_null/accepted_values), diff row counts vs prod.
2. **Review** → teammate reads model diff + test results + row-count impact. Merge blocked on red.
3. **Merge to main** → deploy to prod warehouse, run full test suite, refresh dashboards, post run summary to Slack.

~~~
# .github/workflows/ci.yml (sketch)
on: pull_request
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install dbt-duckdb sqlfluff
      - run: sqlfluff lint models/
      - run: dbt build --target ci
~~~

**Why analysts should care:**

- **The 2am protection** — the typo'd filter that once wiped a dashboard now fails CI on a PR no human ever merged.
- **Fearless speed** — teams with CI merge 10× more changes because nothing is scary; teams without it freeze around the "critical report".
- **The portfolio signal** — a repo with a green CI badge and real tests reads as *engineering*, and analytics-engineering roles pay accordingly. Your exported projects here can add this exact YAML.

**Start pragmatic:** even without a warehouse — CI that (1) lints SQL, (2) runs Python scripts against a small test CSV, (3) executes pytest assertions on outputs — catches 80% of disasters. Upgrade as the stack grows.

> TIP: Add the CI YAML above to one exported project repo this week. Green checks on your GitHub = the strongest 'I take this seriously' signal you can send without a single interview question being asked.`,
          takeaways: [
            "PR → lint + build + test + row-diff → review → auto-deploy",
            "CI turns 'wrong number' disasters into blocked merges",
            "Green checks in your portfolio repo = instant credibility",
          ],
          practice: "Write the 4-step CI plan for your portfolio repo: what lints, what tests, what runs on sample data, what posts to Slack.",
        },
      ],
    },
    {
      id: "m4",
      title: "Communication & Leadership",
      summary: "Executive summaries, storytelling frameworks, stakeholder management and building analytics teams.",
      lessons: [
        {
          id: "m4l1",
          title: "Executive Communication",
          minutes: 9,
          content: `Executives decide in minutes with incomplete information. Communication is engineering for that constraint.

**The one-page memo format** (works in email, Slack, or slide 1):

~~~
DECISION NEEDED: Expand South-region electronics inventory? (by Fri)
BOTTOM LINE: Yes — pilot $120k stock; modeled +$310k revenue/yr.
WHY: South Electronics sells out 3.1×/month; AOV $412 (top region);
     stockouts explain the Q3 revenue gap; supply lead time is 2 weeks.
RISKS: Demand est. from 6 months; if sell-through <60%, returns risk $30k.
     Mitigation: 8-week pilot before full commitment.
DATA: 12 months of orders + supplier logs; definitions in appendix.
~~~

**The rules that carry it:**

- **BLUF (bottom line up front)** — recommendation in line 1. Never a suspense novel; executives read line 1 and ask questions or move on. Either is a win.
- **One number per claim** — "3.1×/month" beats "very frequently". Precision is persuasion.
- **The 'so what' test** — every bullet must survive "so what does the reader DO with this?"
- **Anticipate the three questions** — refunds included? source? what if demand dips? Answer them in the appendix before they're asked.
- **Quantified uncertainty** — ranges and assumptions stated; false precision discovered later burns trust permanently.

**The meeting itself:** lead with the recommendation, show the two charts that carry it (region trend + stockout impact), park the appendix. If the discussion dives into details you brought but didn't lead with — you won; that's what the appendix is for.

> REAL WORLD: Analysts get promoted for this skill more than for SQL. Two analysts, same analysis: one sends a 14-slide journey; one sends the memo above. Guess whose recommendations ship — and whose name executives remember when a team lead role opens.`,
          takeaways: [
            "BLUF: recommendation in the first line, always",
            "One number per claim; state assumptions and ranges",
            "Pre-answer the three predictable questions in an appendix",
          ],
          practice: "Rewrite this into a BLUF memo: 'We looked at sales by region over several months and found some interesting patterns in the South especially with electronics and stockouts...'",
        },
        {
          id: "m4l2",
          title: "Data Storytelling Frameworks",
          minutes: 8,
          content: `Frameworks turn analysis into narratives that stick. Four to internalize:

**1. Situation–Complication–Resolution (SCR)** — the McKinsey spine. S: "Revenue grew 12% this year." C: "But 60% of growth came from one segment now showing saturation." R: "Diversify: three underpenetrated segments identified, pilot in Q1." Works in every medium from email to keynote.

**2. The Pyramid Principle** — answer first, then three supporting arguments, then evidence. Inverted pyramid = every level could be the stopping point and the reader still leaves correct.

**3. 'So what' laddering** — take any finding and ask so-what until you hit money or risk: "email open rates fell 3%" → so what → "revenue per campaign −$2.1k" → so what → "list fatigue; culling 15% dormant contacts projects +$8k/quarter". Stop at the level the audience can act on.

**4. Show the anomaly, not the average** — stories live in contrast: before/after, us/them, expected/actual. "Churn is 4%" is forgettable; "churn is 4% — but 11% for customers whose first order had a stockout" is a story with a villain and a fix.

**The delivery mechanics:** one chart per idea; annotate the chart with the takeaway (a red circle + "stockout weeks" beats a legend); end every presentation with the **ask** ("approve the pilot" — a meeting without an ask is a briefing).

> TIP: Rehearse the 60-second version of any story: situation, complication, resolution, ask — four sentences. If you can't, the story isn't ready. This drill alone upgrades how senior people perceive your analysis.`,
          takeaways: [
            "SCR = situation, complication, resolution — the universal spine",
            "Ladder 'so what' until you hit money or risk",
            "Contrast tells the story; end every story with an ask",
          ],
          practice: "Take your dashboard's best insight and produce: a 60-second SCR version, the so-what ladder, and the ask.",
        },
        {
          id: "m4l3",
          title: "Stakeholder Management & Influence",
          minutes: 8,
          content: `Analytics is a service business run inside the company. Managing it well = reliable delivery + earned influence.

**Map your stakeholders:**
- **Sponsors** — fund/protect the work (VP). Keep: informed, never surprised.
- **Champions** — use the work daily (ops leads). Keep: co-designers, not customers.
- **Skeptics** — question your numbers (finance). Keep: early previews, definitions agreed in writing — a converted skeptic is your best reference.
- **Critics-without-context** — ignore politely unless they have the sponsor's ear.

**The trust operating system:**

1. **Under-promise, over-deliver by design** — quote Friday, deliver Thursday noon. Reliability compounds; heroics don't.
2. **The definition contract** — agree metric definitions in writing before building. 80% of 'wrong numbers' conflicts are definition conflicts wearing a disguise.
3. **Say no with an alternative** — "Can't do the 200-SKU deep dive this week; CAN give you the top-20 by revenue Wednesday — does that unblock the meeting?" (The magic word is *can*.)
4. **Manage the queue publicly** — a visible intake board (even a shared sheet) converts "why hasn't Ana done my thing" into "Ana has 6 things; mine is #4; let me lobby or escalate."
5. **Close the loop after decisions** — "the pilot moved revenue +$9k" — the analyst whose recommendations get followed AND reviewed becomes the advisor, not the vendor.

**Influence without authority** — the whole job in four words. It is earned by exactly the above: reliability, agreed definitions, honest trade-offs, visible queues, closed loops. No charisma required.

> REAL WORLD: The best data people are rarely the best coders on the team — they are the ones whose requests get prioritized, whose numbers don't get re-litigated, and whom executives call *first*. That position is built with this checklist, one interaction at a time.`,
          takeaways: [
            "Map sponsors/champions/skeptics and manage each differently",
            "Definition contracts kill 80% of conflicts",
            "No = a smaller yes with a deadline; keep queues public",
          ],
          practice: "Write your no-with-alternative reply for: 'Need a 40-metric dashboard by tomorrow for the board.'",
        },
        {
          id: "m4l4",
          title: "Building & Leading Analytics Teams",
          minutes: 8,
          content: `Eventually you lead: a project team, then analysts, then the function. The operating manual:

**Hiring signals that actually predict success:**
- **Portfolio over pedigree** — real projects with READMEs, cleaning logs, and honest caveats (exactly what this academy's workspace exports produce).
- **The scoping question** — give a vague request; listen for clarification questions (decision? deadline? definitions?) not immediate tooling talk.
- **The cleaning test** — hand a dirty CSV; do they profile, document, and ASK about anomalies — or silently click?

**Team structure (the classic triangle):**
- **Analytics engineers** — own pipelines, models, semantic layer (the Advanced level's skills).
- **Analysts** — own business domains (growth, ops, finance), dashboards + deep-dives.
- **Data scientists** (if needed) — experimentation, prediction; hired AFTER the data foundation is trustworthy.

**Operating cadence:**
- **Weekly intake triage** — queue prioritized with sponsors present; the team defends the ranking, not individual requests.
- **Definition council** (30 min, biweekly) — metric changes debated and versioned; kills the three-revenues problem at the root.
- **Show & tell** — monthly, work-in-progress demoed; the quality bar rises socially, no policing needed.
- **Post-mortems without blame** — every wrong-number incident ends with a process fix, never a hunt for a culprit; safety is what makes bugs surface early.

**The leader's real job:** protect the team's credibility (definitions, tests, docs), route effort to the highest-leverage questions (KPI trees, not vanity charts), and grow people via project ownership with review. Teams led this way keep their analysts; teams run as ticket factories lose them.

> TIP: Even as a solo analyst, run these ceremonies in miniature: your personal intake list, your metrics doc, your monthly self-review. Habits scale; retrofitted discipline doesn't.`,
          takeaways: [
            "Hire for portfolio + scoping + cleaning instincts",
            "Engineers own pipelines; analysts own domains; scientists come after trust",
            "Intake triage + definition council + blameless post-mortems = the cadence",
          ],
          practice: "Design your ideal 4-person analytics team for the retail company: roles, domain ownership, and the first 90-day priority each.",
        },
      ],
    },
    {
      id: "m5",
      title: "Career & Portfolio",
      summary: "Portfolio strategy, resume/LinkedIn, interview drills (SQL, cases, Python) and negotiation.",
      lessons: [
        {
          id: "m5l1",
          title: "A Portfolio That Gets Interviews",
          minutes: 9,
          content: `Hiring managers spend ~90 seconds on a portfolio. Design for that scan.

**What earns the callback:**

- **3–5 finished projects, not 15 skeletons** — depth beats breadth; one excellent E2E project (raw → clean → analyze → dashboard → documented → deployed) outweighs ten tutorials.
- **A README that reads like a memo** — business problem, approach, 2–3 insights with charts, recommendation, caveats, how to run. (Every project here exports exactly this structure — fill it honestly.)
- **Evidence of the full loop** — cleaning log (proof of rigor), SQL/pandas code (proof of craft), dashboard screenshot (proof of delivery), 'recommended actions' (proof of judgment).
- **Variety across business domains** — sales, marketing, HR/ops: shows you learn new domains fast.
- **Production touches** — tests, CI badge, a scheduled report via GitHub Actions: the 'this person has shipped' tell.

**Repository hygiene (the 90-second scan):**
- Top-level README: who you are, 3 projects with links + one-line outcomes, contact.
- One repo per project OR one monorepo with folders (this workspace's export shape) — both fine if navigable.
- Commits tell a story: "Add cleaning log", "Fix SCD join" — not "final final v2".
- Pinned repos on your GitHub profile; pin the best 3.

**The distribution layer:** a short blog/LinkedIn post per project ("How I found 24% of revenue sitting with at-risk customers") — posts get interviews; repos convert them. One post per week during a job hunt moves the needle measurably.

> TIP: Your Workspace tab → Download ZIP → GitHub upload guide gets the mechanics done in 15 minutes. The differentiator is the README quality — treat each one as the interview answer it actually is.`,
          takeaways: [
            "3–5 deep projects with memo-grade READMEs",
            "Show the full loop: log → code → dashboard → recommendation",
            "Distribution: one LinkedIn/blog post per project",
          ],
          practice: "Open your Workspace and grade one README against the checklist above. Rewrite its insights until they pass the 90-second scan.",
        },
        {
          id: "m5l2",
          title: "Resume & LinkedIn for Analysts",
          minutes: 8,
          content: `Resumes are scanned by software and skimmed by humans in ~30 seconds. Optimize for both.

**The formula — every bullet = action verb + tool + quantified outcome:**

~~~
✗ "Responsible for reporting and dashboards"
✓ "Automated weekly sales reporting (Python + GitHub Actions), saving 3 hrs/week
   and cutting manual errors to zero across 5 regions"
✗ "Helped with data cleaning"
✓ "Cleaned and standardized 168k-row POS dataset (pandas); fixed duplicate-grain
   bug that had inflated revenue reporting 12%"
~~~

**Structure that passes ATS:** plain single column; standard headings (Experience, Projects, Skills); exact tool keywords from the posting (SQL, Power BI, Python, pandas, dbt...); no tables/graphics/columns that parsers choke on.

**The projects section is your experience when titles aren't** — 3 entries with links, each one line of business outcome. For career-changers it carries the resume; for juniors it *is* the interview agenda.

**LinkedIn specifics:** headline = "Data Analyst | SQL · Python · Power BI | I turn messy data into decisions" (keyword-rich + a point of view); About = 4 lines (what you do, proof, tools, contact); post weekly from your project write-ups; recruiters search by tool keywords — the Skills section is search fuel, not decoration.

**Tailoring ritual (20 min per application):** mirror the posting's top 5 keywords in your bullets; reorder bullets so the most relevant lead; rename file ~Firstname-Lastname-Data-Analyst.pdf~.

> TIP: Numbers beat adjectives everywhere: 'reduced reporting time 60%' outscores 'efficient'. You do not have a real number? Use your project numbers — they are real, and they are yours.`,
          takeaways: [
            "Verb + tool + quantified outcome, every bullet",
            "ATS-safe format; mirror the posting's keywords",
            "Projects section = the experience of career-changers",
          ],
          practice: "Write 3 resume bullets from Project 1–3 using the formula. Then write your LinkedIn headline.",
        },
        {
          id: "m5l3",
          title: "Interview Drills: SQL, Cases & Python",
          minutes: 11,
          content: `Analytics interviews have four rounds — drill each specifically.

**1. SQL round (the gatekeeper).** Live queries on a schema. Drill pattern:
- Joins with aggregates (revenue per customer, top-N per group)
- ~ROW_NUMBER() OVER (PARTITION BY...)~ for "latest/latest-per-group"
- ~LAG~ for MoM changes; self-joins for pairs
- Say your reasoning aloud: "grain of orders is one row per order, joining customers is many-to-1..." — narrators get hired at equal skill.
Practice venues: StrataScratch, DataLemur, LeetCode DB — 20 problems covers most formats.

**2. Case round (the differentiator).** "Bookings dropped 10% — investigate." Framework answer:
- Clarify: which segment? what timeframe? seasonality? definitions? ("bookings" = signed contracts or paid?)
- Structure: decompose with a KPI tree (traffic × conversion × AOV style)
- Hypothesize: list 4–5 causes ranked by prior probability, name the data each needs
- Simulate: "if I see X in the data, it's Y; if Z, it's W"
- Conclude: root cause + action + what you'd validate next.
They grade structure, not the specific answer. Out-loud practice with a friend beats reading frameworks.

**3. Python/pandas round.** Live-coding basics: load CSV, filter, groupby-agg, merge, pivot. Clean environment habits: ~info()~ first, narrate each step, test on ~head()~ before full data.

**4. Behavioral round.** STAR stories (Situation-Task-Action-Result), each ending in a number: the duplicate-grain bug you caught, the stakeholder you turned around, the automation that saved hours. Prepare 5; they recycle across questions.

> TIP: Your projects ARE the behavioral answers. "Tell me about a time you found an insight" → open the at-risk revenue story. "A time you made a mistake" → the 2× revenue grain bug and how you now guard against it. Real artifacts make behavioral rounds easy.`,
          takeaways: [
            "SQL: top-N per group, LAG, latest-per-row — narrate your grain reasoning",
            "Cases: clarify → KPI tree → ranked hypotheses → simulate → conclude",
            "5 STAR stories with numbers, drawn from your projects",
          ],
          practice: "Run the bookings-drop case aloud in 6 minutes: clarifying questions, tree, 4 hypotheses, decision tree of data checks, conclusion.",
        },
        {
          id: "m5l4",
          title: "Negotiation & Career Growth",
          minutes: 8,
          content: `The offer arrived. The next 48 hours are the highest-paid hours of your year — handle them deliberately.

**Never accept on the call.** Script: "I'm excited about this — can I have a few days to review the full package?" (Always yes.) Then evaluate **total compensation**: base, bonus, equity, remote policy, learning budget, and the *level* title implies.

**Negotiate with anchors, not adjectives:**
~~~
"Thank you — I'm excited to join. Based on my research and the scope of the role
 (owning reporting + pipelines for 3 product lines), I was targeting $X.
 Is there flexibility on base?"
~~~
- Research the band: levels.fyi, Glassdoor, local posts. Ask for a specific number ~10–15% above offer, never a range ("$70–80k" anchors to 70).
- Silence after the ask is a tool — state the number and stop.
- Everything is negotiable once: sign-on (easiest), base, title (compounds later), start date, learning budget. If base is frozen: "understood — could we agree a 6-month review tied to specific outcomes?"

**Growth after landing:**
- **Year 1: earn trust** — ship the dashboard no one has to double-check; own the definitions.
- **Then: compound** — automation that frees a day/week; a metric system the company adopts; one stakeholder who calls you first.
- **Promotion memo** — keep a brag file (every saved hour, caught bug, moved metric); promotion cases are written from evidence, and the file is the evidence.
- **The market check** — interviews every 18–24 months (even without leaving) price you accurately and keep skills sharp; counteroffers reveal your true market value.

> REAL WORLD: Data salaries vary 2× for identical skills across companies — the variable is negotiation and targeting, not talent. The two sentences above ('a few days to review' + the anchored ask) are worth more per minute than any skill in this academy. Use them.`,
          takeaways: [
            "Never accept on the call; evaluate total package and level",
            "Anchor with a specific number 10–15% high; then silence",
            "Brag file → promotion memo; market-check every 18–24 months",
          ],
          practice: "Write your two negotiation scripts word-for-word (the delay ask, the anchored ask). Rehearse aloud once — hesitation is the only failure mode.",
        },
      ],
    },
  ],
};

export const CURRICULUM_B: PathLevel[] = [advanced, master];
