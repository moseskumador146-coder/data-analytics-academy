// Practice labs — MASTER level (m1l1 … m5l4).

import type { Practice } from "./practices";

export const PRACTICES_D: Record<string, Practice> = {
  m1l1: {
    kind: "quiz",
    title: "Scoping before data",
    brief: "Capstone time. Prove you scope like a senior — the one-pager comes before the SQL.",
    questions: [
      {
        q: "A one-pager scope contains:",
        options: [
          "Problem, decision, deliverables, data, timeline, risks",
          "A wish list of charts",
          "40 KPIs",
          "Only a deadline",
        ],
        correct: 0,
        explain: "Six sections, one page. If the decision is unclear, the analysis has no finish line.",
      },
      {
        q: "'The decision' in your scope means:",
        options: [
          "What will be decided DIFFERENTLY based on this analysis",
          "The font choice",
          "The chart type",
          "The meeting room",
        ],
        correct: 0,
        explain: "Analytics exists to change decisions. Name the decision and the work sharpens instantly.",
      },
      {
        q: "Listing risks upfront:",
        options: [
          "Sets expectations and prevents scope creep",
          "Is negativity",
          "Delays the project",
          "Is optional bureaucracy",
        ],
        correct: 0,
        explain: "'Data may be delayed 1 week' said today is planning; said on D-2 is an excuse.",
      },
    ],
    hints: ["Six sections: problem, decision, deliverables, data, timeline, risks.", "No decision = no finish line."],
  },

  m1l2: {
    kind: "quiz",
    title: "Stakeholder interviews",
    brief: "'They want a sales dashboard' is where projects go to die. Interview like a consultant instead.",
    questions: [
      {
        q: "The single best interview question:",
        options: [
          "'What decision will you make differently based on this?'",
          "'What colours do you like?'",
          "'How many charts should it have?'",
          "'Can we skip this meeting?'",
        ],
        correct: 0,
        explain: "The decision question converts feature requests into outcomes — and usually shrinks the scope by half.",
      },
      {
        q: "'Everyone wants everything' is resolved by:",
        options: [
          "Prioritising against the decision + an explicit trade-off conversation",
          "Working weekends",
          "A bigger monitor",
          "Adding more slides",
        ],
        correct: 0,
        explain: "Priorities come from the decision, trade-offs are AGREED not assumed. Write both down.",
      },
      {
        q: "Right after the interview you send:",
        options: [
          "A recap with agreed definitions and priorities",
          "Nothing — impressions matter more",
          "A meme",
          "The raw database dump",
        ],
        correct: 0,
        explain: "The recap is the contract. Definitions agreed in writing prevent the 'that's not what I meant' loop.",
      },
    ],
    hints: ["Decisions over features.", "The recap is the contract."],
  },

  m1l3: {
    kind: "quiz",
    title: "KPI trees & metric design",
    brief: "Draw the course business's KPI tree in your head, then answer.",
    questions: [
      {
        q: "Revenue = visitors × conversion × AOV is:",
        options: [
          "A KPI tree — driver metrics that roll up into the headline number",
          "A pie chart formula",
          "A SQL join",
          "A cron schedule",
        ],
        correct: 0,
        explain: "Trees decompose headlines into levers someone can actually pull. Three levels deep is the sweet spot.",
      },
      {
        q: "KPI trees help because:",
        options: [
          "When the headline misses, the tree points at WHICH driver broke",
          "They're prettier",
          "They hide detail",
          "They remove accountability",
        ],
        correct: 0,
        explain: "'Revenue −12%' becomes 'signup rate −9% on mobile' — a problem a team can fix by Friday.",
      },
      {
        q: "Course business: enrollments = visitors × signup rate; revenue = enrollments × price. Signup rate FELL. Check first:",
        options: [
          "Traffic quality / landing page changes — the signup-rate drivers",
          "The price font",
          "The logo",
          "Nothing — wait a quarter",
        ],
        correct: 0,
        explain: "Follow the broken branch to its leaves: traffic mix and landing-page conversion are the signup-rate drivers.",
      },
    ],
    hints: ["Headline → drivers → levers.", "Debug the broken branch, not the whole tree."],
  },

  m1l4: {
    kind: "quiz",
    title: "Planning the delivery",
    brief: "D-14 to D-0, real hours, real cuts. Plan like you'll actually work.",
    questions: [
      {
        q: "The '10% point' means:",
        options: [
          "When 10% of time remains: stop adding scope, polish what exists",
          "When the project is 10% done, celebrate",
          "10% of budget for coffee",
          "A metric of panic",
        ],
        correct: 0,
        explain: "The last 10% of time is for polish and surprises — protect it or the surprise eats the demo.",
      },
      {
        q: "A D-14 → D-0 plan is:",
        options: [
          "Deliverable-focused, with a pre-agreed cut-the-tail rule",
          "A wish list",
          "Colour studies",
          "A meeting marathon",
        ],
        correct: 0,
        explain: "Each day produces a visible artifact (data ✓, cleaning ✓, draft ✓). Visible beats busy.",
      },
      {
        q: "When time runs out you cut:",
        options: [
          "Depth on the lowest-value asks — agreed with stakeholders IN ADVANCE",
          "The deadline silently",
          "Quality randomly",
          "The data validation",
        ],
        correct: 0,
        explain: "The cut list is negotiated during scoping, not improvised during the fire. That's what 'risks' in the one-pager buys you.",
      },
    ],
    hints: ["Protect the final 10%.", "Cuts are pre-agreed, not improvised."],
  },

  m2l1: {
    kind: "sql",
    title: "Cohort analysis — the triangle's base",
    brief: "Retention triangles start from cohort keys pulled with SQL. Build the base of the triangle from the orders table.",
    sqlTasks: [
      {
        prompt: "Cohort sizes: number of customers per signup month (customers table).",
        solution:
          "SELECT SUBSTR(c.signup_date,1,7) AS cohort_month, COUNT(*) AS customers FROM customers c GROUP BY SUBSTR(c.signup_date,1,7) ORDER BY cohort_month",
      },
      {
        prompt: "First-order month per customer (the behavioural cohort key).",
        solution:
          "SELECT o.customer_id, MIN(o.order_date) AS first_order FROM orders o GROUP BY o.customer_id ORDER BY o.customer_id",
      },
    ],
    hints: ["SUBSTR(date,1,7) slices '2025-03-14' into '2025-03'.", "MIN(order_date) per customer = first purchase = the cohort anchor.", "Cohort triangles = cohort month × months since first order."],
    functions: ["SUBSTR", "GROUP BY", "MIN", "COUNT"],
  },

  m2l2: {
    kind: "sql",
    title: "RFM — the base table",
    brief: "Recency, Frequency, Monetary: three aggregates per customer that drive segmentation. Build the base.",
    sqlTasks: [
      {
        prompt: "Per customer: last order date (R), order count (F), total spend (M). Join all three tables.",
        solution:
          "SELECT c.id, c.name, MAX(o.order_date) AS last_order, COUNT(DISTINCT o.id) AS frequency, ROUND(SUM(oi.quantity*oi.unit_price),2) AS monetary FROM customers c JOIN orders o ON o.customer_id=c.id JOIN order_items oi ON oi.order_id=o.id GROUP BY c.id, c.name ORDER BY c.id",
      },
    ],
    hints: ["R = MAX(order_date) · F = COUNT(DISTINCT order id) · M = SUM(quantity × unit_price).", "GROUP BY the customer — every aggregate collapses to one row per customer.", "Quintile-scoring these three columns is the segmentation step that follows."],
    functions: ["MAX", "COUNT DISTINCT", "SUM", "JOIN", "GROUP BY"],
  },

  m2l3: {
    kind: "quiz",
    title: "Funnel analysis",
    brief: "The marketing dataset records impressions → clicks → conversions per channel. Read the funnel like a growth analyst.",
    questions: [
      {
        q: "Step conversion is calculated as:",
        options: ["Step n ÷ step n−1 (e.g. clicks ÷ impressions)", "Random", "Clicks ÷ revenue", "Impressions × 100"],
        correct: 0,
        explain: "Each step's rate measures THAT step's quality — isolating where the funnel leaks.",
      },
      {
        q: "The 'worst leak' is the step with:",
        options: [
          "The lowest step-conversion (e.g. clicks → conversions at 1%)",
          "The highest impressions",
          "The best channel",
          "The first step",
        ],
        correct: 0,
        explain: "Compare rates, not volumes — a big step with a 1% rate is the leak worth fixing first.",
      },
      {
        q: "Fixing a clicks→conversions leak on the website starts with:",
        options: [
          "Examining landing/checkout experience for the weak channel's traffic",
          "Buying more impressions",
          "Changing the font",
          "Deleting the channel",
        ],
        correct: 0,
        explain: "Match the fix to the leak's position: traffic-quality leaks are upstream, site-experience leaks are downstream.",
      },
    ],
    hints: ["Rate per step, then compare steps.", "Fixes must match the leak's position in the funnel."],
  },

  m2l4: {
    kind: "quiz",
    title: "Bridging to predictive",
    brief: "Before you promise an ML model in a stakeholder meeting, prove you know the traps.",
    questions: [
      {
        q: "Feature leakage in an attrition model looks like:",
        options: [
          "Including 'resignation date' as a feature",
          "Including department",
          "Including salary band",
          "Including tenure",
        ],
        correct: 0,
        explain: "Anything known only AFTER the outcome (exit date, exit interview) is leakage — perfect accuracy in testing, useless in production.",
      },
      {
        q: "The naive baseline for attrition prediction is:",
        options: [
          "Always predict 'stays' — the majority class accuracy",
          "Always 50%",
          "Random guessing",
          "100%",
        ],
        correct: 0,
        explain: "If 88% stay, predicting 'stays' scores 88%. A model must BEAT that to justify existing.",
      },
      {
        q: "A model deserves deployment when:",
        options: [
          "It beats the baseline AND its errors cost less than the decision it improves",
          "It's complex",
          "It uses AI",
          "It's brand new",
        ],
        correct: 0,
        explain: "Value = (decision improvement) − (cost of errors + cost of maintenance). Otherwise it's a science project.",
      },
    ],
    hints: ["Leakage = future information in features.", "Beat the majority-class baseline or go home."],
  },

  m3l1: {
    kind: "quiz",
    title: "Git for analysts",
    brief: "You ran git init on your portfolio. Confirm the habits that make the log readable.",
    questions: [
      {
        q: "A good commit is:",
        options: [
          "One logical change with a message that says WHY",
          "Everything once a week: 'updates'",
          "Random files with 'fixes'",
          "Binary dumps",
        ],
        correct: 0,
        explain: "'Remove duplicate rows from sales pipeline' beats 'update' — your future self (and reviewers) will thank you.",
      },
      {
        q: "The main branch rule for analytics repos:",
        options: [
          "Always working — experiments happen on branches",
          "Push straight to main, always",
          "No main branch",
          "Delete history weekly",
        ],
        correct: 0,
        explain: "main = the version anyone can run today. Branches = where experiments live safely.",
      },
      {
        q: "A clean git log shows a recruiter:",
        options: [
          "How you think and iterate — real work, real decisions",
          "Your font choices",
          "Nothing at all",
          "Your salary history",
        ],
        correct: 0,
        explain: "Commits are a work sample: incremental, descriptive, alive. Logs like that get interviews.",
      },
    ],
    hints: ["One change, one commit, one reason.", "main always works."],
  },

  m3l2: {
    kind: "quiz",
    title: "dbt concepts",
    brief: "You split Project 4's SQL into staging and marts. Verify the structure stuck.",
    questions: [
      {
        q: "stg_ models are:",
        options: [
          "1:1 with sources — light renames and type cleaning only",
          "Final dashboards",
          "Chart exports",
          "Temporary scratch files",
        ],
        correct: 0,
        explain: "Staging is boring on purpose: rename, cast, nothing else. Boring staging = trustworthy marts.",
      },
      {
        q: "mart_ models are:",
        options: [
          "Business-ready joins and aggregations (e.g. mart_rfm)",
          "Raw dumps",
          "Logs",
          "Test fixtures",
        ],
        correct: 0,
        explain: "Marts encode business logic once — dashboards read from marts, never from raw tables.",
      },
      {
        q: "Tests you'd put on staging models:",
        options: [
          "unique + not_null on keys, accepted_values on status",
          "Colour tests",
          "Speed tests",
          "Font tests",
        ],
        correct: 0,
        explain: "The classic trio: keys unique, keys present, categorical values from an approved list. Failures stop the build.",
      },
    ],
    hints: ["Staging = boring. Marts = business logic.", "unique / not_null / accepted_values."],
  },

  m3l3: {
    kind: "quiz",
    title: "Documentation & catalogs",
    brief: "Catalog entries are how analysis survives your vacation. Check yours would pass.",
    questions: [
      {
        q: "A catalog entry contains:",
        options: ["Owner, grain, refresh cadence, source, caveats", "A screenshot only", "A colour", "A logo"],
        correct: 0,
        explain: "Five fields that answer every question a newcomer asks at 9am when you're asleep.",
      },
      {
        q: "Honest caveats like 'returns excluded before 2025-03':",
        options: [
          "Build trust and prevent misreading",
          "Are optional decoration",
          "Hide problems",
          "Slow queries",
        ],
        correct: 0,
        explain: "Every metric has edges. Documenting them is the difference between analysis and advocacy.",
      },
      {
        q: "Documentation lives:",
        options: [
          "Next to the code, versioned in the repo",
          "In someone's head",
          "In chat scrollback",
          "On paper",
        ],
        correct: 0,
        explain: "Docs-in-repo get reviewed and updated with the code they describe. Heads and chats forget.",
      },
    ],
    hints: ["Owner, grain, refresh, source, caveats.", "Docs live with code."],
  },

  m3l4: {
    kind: "quiz",
    title: "CI/CD for analytics",
    brief: "Your portfolio repo is about to ship like engineering. Verify the pipeline.",
    questions: [
      {
        q: "CI on a portfolio repo should:",
        options: [
          "Lint + run SQL/Python tests on sample data on every push",
          "Deploy to production",
          "Send memes",
          "Do nothing",
        ],
        correct: 0,
        explain: "Every push gets the same automated scrutiny: does it parse, do the queries run, do the tests pass.",
      },
      {
        q: "A failing test means:",
        options: [
          "The change doesn't merge until it's fixed",
          "Ignore it",
          "Delete the test",
          "Force-push over it",
        ],
        correct: 0,
        explain: "Red build = not done. The discipline IS the value — green means something.",
      },
      {
        q: "'Ship like engineers' means:",
        options: [
          "Small reviewed changes, tested, documented",
          "Big-bang releases",
          "No tests on Fridays",
          "Deploying from your laptop",
        ],
        correct: 0,
        explain: "Small + reviewed + tested is how you move fast WITHOUT breaking things — the actual engineering edge.",
      },
    ],
    hints: ["Every push tested. Red = blocked.", "Small changes, always reviewed."],
  },

  m4l1: {
    kind: "quiz",
    title: "Executive communication",
    brief: "Rewrite the fog. Grade your BLUF rewrite.",
    questions: [
      {
        q: "BLUF stands for:",
        options: ["Bottom Line Up Front", "Big Lists Under Facts", "Blue Layout For Users", "Baseline Under Forecast"],
        correct: 0,
        explain: "The recommendation is the first sentence. Everything else is support.",
      },
      {
        q: "An exec memo opens with:",
        options: [
          "The recommendation + the number behind it",
          "Methodology",
          "Apologies for the delay",
          "The data dictionary",
        ],
        correct: 0,
        explain: "'South electronics revenue fell 18% since March. Recommend a supplier audit by Friday.' — then, and only then, the how.",
      },
      {
        q: "'We found interesting patterns in the South with electronics...' becomes:",
        options: [
          "'South electronics revenue fell 18% since March — recommend supplier audit by Friday'",
          "'Interesting stuff is happening'",
          "'See attached, 40 pages'",
          "'It's complicated'",
        ],
        correct: 0,
        explain: "Number + direction + action. If the exec reads one line, that line must be enough.",
      },
    ],
    hints: ["BLUF = the answer first.", "One line: number, direction, action."],
  },

  m4l2: {
    kind: "quiz",
    title: "Storytelling frameworks",
    brief: "SCR, the so-what ladder, the ask. Grade your narrative toolkit.",
    questions: [
      {
        q: "SCR stands for:",
        options: ["Situation, Complication, Resolution", "Story, Chart, Result", "Scale, Colour, Rank", "Some Charts Rule"],
        correct: 0,
        explain: "The McKinsey classic: here's the context, here's what broke, here's what we do. 60 seconds when done right.",
      },
      {
        q: "The so-what ladder:",
        options: [
          "Each line answers 'so what?' until you reach an action",
          "Adds words",
          "Adds charts",
          "Adds disclaimers",
        ],
        correct: 0,
        explain: "'Sales fell.' → So what? 'South is worst.' → So what? 'Returns are driving it.' → So what? 'Audit the supplier.' Done.",
      },
      {
        q: "The ask must be:",
        options: ["Specific, owned, and dated", "Vague", "Optional", "A secret"],
        correct: 0,
        explain: "'Approve a supplier audit; Alex leads; decision by Friday' — an ask without an owner is a wish.",
      },
    ],
    hints: ["S → C → R in 60 seconds.", "Asks get owners and dates."],
  },

  m4l3: {
    kind: "quiz",
    title: "Stakeholder management",
    brief: "'Need 40 metrics by tomorrow for the board.' Practice the professional response.",
    questions: [
      {
        q: "'No with alternatives' means:",
        options: [
          "Decline the ask as stated, then offer a smaller/faster option that serves the goal",
          "Just say no",
          "Always say yes",
          "Go silent",
        ],
        correct: 0,
        explain: "You're not rejecting the person — you're reshaping the work to actually serve their deadline.",
      },
      {
        q: "The right reply to '40 metrics by tomorrow':",
        options: [
          "'The 3 metrics that decide the board question by tomorrow; the rest next sprint — here's why'",
          "'Sure!' then panic",
          "'Impossible' and leave",
          "Ghost them",
        ],
        correct: 0,
        explain: "Serve the real goal (a good board meeting) instead of the literal ask. That's senior behaviour.",
      },
      {
        q: "Influence with stakeholders grows when you:",
        options: [
          "Deliver small wins predictably",
          "Promise everything",
          "Escalate often",
          "Hide the misses",
        ],
        correct: 0,
        explain: "Trust compounds: say, ship, repeat. One hidden miss costs ten wins.",
      },
    ],
    hints: ["Reshape the ask around the goal.", "Trust = predictable small wins."],
  },

  m4l4: {
    kind: "quiz",
    title: "Building the team",
    brief: "Four analysts, one retail company. Design it like a lead.",
    questions: [
      {
        q: "Team design starts from:",
        options: [
          "Business domains — sales, marketing, ops, platform",
          "Friend groups",
          "Seniority alone",
          "Random assignment",
        ],
        correct: 0,
        explain: "Domain ownership gives each analyst context, relationships, and accountability — the ingredients of fast, correct work.",
      },
      {
        q: "Each member's first 90-day priority is:",
        options: [
          "One owned workflow each, shipped end-to-end",
          "40 KPIs each",
          "A reorg proposal",
          "A wiki nobody reads",
        ],
        correct: 0,
        explain: "One workflow, end-to-end, owned. Shipped work builds credibility faster than any onboarding deck.",
      },
      {
        q: "Leading analysts means:",
        options: [
          "Unblocking, providing context and stakes — not micromanaging tools",
          "Assigning fonts",
          "Reading their code daily",
          "Doing nothing",
        ],
        correct: 0,
        explain: "Analysts do their best work with clear stakes and air cover. Your job is the 'why' and the 'what', rarely the 'how'.",
      },
    ],
    hints: ["Domains, not friendships.", "One shipped workflow per person."],
  },

  m5l1: {
    kind: "quiz",
    title: "The portfolio that gets interviews",
    brief: "Your Workspace README is about to face a recruiter's 90 seconds. Grade it.",
    questions: [
      {
        q: "A project README opens with:",
        options: [
          "The business problem + the quantified outcome",
          "Your biography",
          "The folder tree",
          "The license",
        ],
        correct: 0,
        explain: "'Cut weekly reporting from 6 hours to 20 minutes' — outcomes first, everything else second.",
      },
      {
        q: "The 90-second scan passes when:",
        options: [
          "A stranger gets problem → work → result without opening the code",
          "The fonts are nice",
          "It's very long",
          "It's colourful",
        ],
        correct: 0,
        explain: "Recruiters skim. Structure (problem, approach, result, evidence) beats prose every time.",
      },
      {
        q: "The strongest portfolio proof is:",
        options: [
          "3 deep projects with decisions explained",
          "20 copied tutorials",
          "Certificates only",
          "A list of tools",
        ],
        correct: 0,
        explain: "Depth shows judgment: trade-offs made, assumptions tested, results measured. Tutorials show attendance.",
      },
    ],
    hints: ["Outcome first.", "3 deep > 20 shallow."],
  },

  m5l2: {
    kind: "quiz",
    title: "Resume & LinkedIn",
    brief: "Three bullets, one headline. Apply the formula.",
    questions: [
      {
        q: "The strong resume bullet is:",
        options: [
          "'Built ETL pipeline cutting weekly reporting from 6h to 20min (pandas + SQL)'",
          "'Responsible for data'",
          "'Team player with analytics'",
          "'Used Excel'",
        ],
        correct: 0,
        explain: "Verb, artifact, measured outcome, tools. 'Responsible for' is where metrics go to die.",
      },
      {
        q: "The bullet formula is:",
        options: [
          "Action verb + what you built + measured outcome",
          "Adjectives + vibes",
          "Job title + years",
          "Tool names only",
        ],
        correct: 0,
        explain: "Numbers make bullets believable. 'Improved performance' → 'cut load time 73%'.",
      },
      {
        q: "A strong LinkedIn headline:",
        options: [
          "'Retail analyst · SQL/Python · dashboards that cut reporting 80%'",
          "'Seeking opportunities'",
          "'Data Ninja | Wizard | Guru'",
          "(empty)",
        ],
        correct: 0,
        explain: "Role + domain + proof. Recruiters search for exactly those tokens.",
      },
    ],
    hints: ["Verb + artifact + number.", "Headline = role + domain + proof."],
  },

  m5l3: {
    kind: "quiz",
    title: "Interview case drills",
    brief: "'Bookings dropped 10%.' Six minutes. Go.",
    questions: [
      {
        q: "Your FIRST move in the case:",
        options: [
          "Clarify: since when, which segment, compared to what baseline",
          "Open a dashboard and point at things",
          "Blame the sales team",
          "Guess a cause",
        ],
        correct: 0,
        explain: "Clarifying questions buy structure and signal seniority. Interviewers score the questions as much as the answers.",
      },
      {
        q: "A good hypothesis tree is:",
        options: [
          "MECE — mutually exclusive, collectively exhaustive branches",
          "Random branches",
          "One branch",
          "Leaves without a trunk",
        ],
        correct: 0,
        explain: "Product / region / channel / cohort — no overlaps, no gaps. Then prune with data.",
      },
      {
        q: "Closing the case requires:",
        options: [
          "Most likely cause + the data check that would confirm it + the next action",
          "Repeating the question",
          "Listing everything you know",
          "Apologising",
        ],
        correct: 0,
        explain: "Cases end with a decision, not a summary. Cause → check → action is the landing.",
      },
    ],
    hints: ["Clarify → tree → prune → conclude.", "MECE: no overlaps, no gaps."],
  },

  m5l4: {
    kind: "quiz",
    title: "Negotiation & growth",
    brief: "Two scripts, rehearsed aloud. Verify the wording.",
    questions: [
      {
        q: "The 'delay ask' script:",
        options: [
          "'I can deliver A by Friday, or A+B by Wednesday next week — which serves you best?'",
          "'I'll try my best'",
          "'No'",
          "Silence and overtime",
        ],
        correct: 0,
        explain: "You're not asking to delay — you're offering a quality trade-off with a choice. Managers respect options.",
      },
      {
        q: "The anchored ask means:",
        options: [
          "Name your number first, backed by market evidence",
          "Wait to be told",
          "Apologise first",
          "Say 'whatever is fair'",
        ],
        correct: 0,
        explain: "First numbers anchor the range. Bring market data and let the anchor do its work.",
      },
      {
        q: "Rehearse aloud because:",
        options: [
          "Hesitation is the only failure mode — fluency signals conviction",
          "It's fun",
          "To memorise fonts",
          "To waste time",
        ],
        correct: 0,
        explain: "The same sentence delivered fluently lands; delivered haltingly fails. Reps are the difference.",
      },
    ],
    hints: ["Offer trade-offs, not delays.", "Anchor first, with evidence."],
  },
};
