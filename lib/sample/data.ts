// Sample data: an invented market around the demo product, so the whole app runs with no keys
// and no network. Every company and person here is made up, every page lives on a made-up
// domain, and the app labels all of it "sample" wherever it is shown.
//
// The pages are written like real search results. The "annotations" are what a model would
// pull out of each page. One of them is wrong on purpose (Atlas STEM Labs): its quote is not on
// the page, so the verifier drops it. That is the check doing its job, not a bug.

export interface SamplePage {
  url: string;
  title: string;
  text: string;
  purpose: ("accounts" | "signals" | "people" | "warm" | "competitors" | "jobs")[];
  company?: string;
  segment?: string;
}

const U = "https://sample.tact.example";

export const PAGES: SamplePage[] = [
  {
    url: `${U}/brightpath/about`,
    title: "Brightpath Learning Centers | About us",
    text: "Brightpath Learning Centers runs 42 after-school tutoring centers across California and Arizona. Our students work through printed math and reading packets with a tutor at every table. Founded in 2009, Brightpath serves more than 11,000 K-8 students each week. Website: brightpath.example.",
    purpose: ["accounts"],
    company: "Brightpath Learning Centers",
    segment: "Tutoring center chains",
  },
  {
    url: `${U}/brightpath/careers`,
    title: "Careers at Brightpath Learning Centers",
    text: "We are hiring 60 part-time math tutors for the spring term as we open six new centers in the Phoenix area. Posted November 12, 2026. Tutors guide students through paper worksheets and give hints, not answers.",
    purpose: ["signals", "jobs"],
    company: "Brightpath Learning Centers",
  },
  {
    url: `${U}/news/brightpath-quiznest-pilot`,
    title: "Brightpath pilots QuizNest homework app in ten centers",
    text: "Brightpath Learning Centers began a pilot of the QuizNest homework app in ten centers this fall. Head of Academics Maya Okafor said the team is still looking for tools that work with paper packets rather than replacing them.",
    purpose: ["signals", "people"],
    company: "Brightpath Learning Centers",
  },
  {
    url: `${U}/people/maya-okafor`,
    title: "Maya Okafor - Head of Academics - Brightpath Learning Centers",
    text: "Maya Okafor is Head of Academics at Brightpath Learning Centers, where she leads curriculum for 42 centers. Education: UCLA, B.A. in Mathematics for Teaching. Previously a curriculum lead at Lumen Education.",
    purpose: ["people", "warm"],
    company: "Brightpath Learning Centers",
  },
  {
    url: `${U}/summit-prep/series-a`,
    title: "Summit Prep Academy raises $12M Series A",
    text: "Summit Prep Academy, a test-prep company with 18 locations in Texas, raised a $12 million Series A on October 28, 2026 to expand its SAT and ACT programs. The company said it will invest in AI-assisted practice that keeps students working on paper, since scratch work still decides scores. Website: summitprep.example.",
    purpose: ["accounts", "signals"],
    company: "Summit Prep Academy",
    segment: "Test prep companies",
  },
  {
    url: `${U}/summit-prep/leadership`,
    title: "Summit Prep Academy | Leadership",
    text: "Daniel Reyes, Director of Curriculum, joined Summit Prep Academy in 2022 and oversees all practice materials. Erin Walsh is Chief Executive Officer and co-founder.",
    purpose: ["people"],
    company: "Summit Prep Academy",
  },
  {
    url: `${U}/people/daniel-reyes`,
    title: "Daniel Reyes - Director of Curriculum - Summit Prep Academy",
    text: "Daniel Reyes is Director of Curriculum at Summit Prep Academy. Education: University of Texas at Austin, M.Ed. in Curriculum and Instruction.",
    purpose: ["warm"],
    company: "Summit Prep Academy",
  },
  {
    url: `${U}/cedar-grove/ai-policy`,
    title: "Cedar Grove Tutoring: our new AI policy for homework help",
    text: "Cedar Grove Tutoring is a family-owned group of nine tutoring centers in Oregon. Starting January 2027 we will allow AI tools in our centers only when they give hints instead of answers. Owner Priya Nair wrote that parents keep asking how we stop students from copying AI answers. Website: cedargrove.example.",
    purpose: ["accounts", "signals", "people"],
    company: "Cedar Grove Tutoring",
    segment: "Tutoring center chains",
  },
  {
    url: `${U}/northlight/jobs/instructional-technology`,
    title: "Northlight Charter Network - Director of Instructional Technology",
    text: "Northlight Charter Network, which operates 14 K-8 campuses in Colorado, is hiring its first Director of Instructional Technology. Posted November 3, 2026. The role will evaluate classroom AI tools that support handwritten student work. Website: northlight.example.",
    purpose: ["accounts", "signals", "jobs"],
    company: "Northlight Charter Network",
    segment: "Charter school networks",
  },
  {
    url: `${U}/northlight/leadership`,
    title: "Northlight Charter Network leadership team",
    text: "Dr. Alan Brooks is Chief Academic Officer of Northlight Charter Network. He previously led instruction at Lumen Education.",
    purpose: ["people", "warm"],
    company: "Northlight Charter Network",
  },
  {
    url: `${U}/paperwise/press/stem-packets`,
    title: "Paperwise Publishing launches printable STEM packets",
    text: "Paperwise Publishing sells printable worksheet packets to more than 3,000 schools and tutoring centers. On November 5, 2026 it launched a new line of middle-school STEM packets and said it is exploring partners for AI feedback on printed pages. Website: paperwise.example.",
    purpose: ["accounts", "signals"],
    company: "Paperwise Publishing",
    segment: "Worksheet publishers",
  },
  {
    url: `${U}/people/hannah-lee`,
    title: "Hannah Lee - VP of Product - Paperwise Publishing",
    text: "Hannah Lee is VP of Product at Paperwise Publishing. Previously she was a product manager at Brightpath Learning Centers from 2018 to 2022.",
    purpose: ["people", "warm"],
    company: "Paperwise Publishing",
  },
  {
    url: `${U}/tutorly/about`,
    title: "Tutorly Online | How it works",
    text: "Tutorly Online is a fully virtual tutoring marketplace with 2,000 tutors. All sessions happen in the browser on a shared digital whiteboard; students do not use paper. Website: tutorly.example.",
    purpose: ["accounts"],
    company: "Tutorly Online",
    segment: "Tutoring center chains",
  },
  {
    url: `${U}/news/ridgeline-hiring-freeze`,
    title: "Ridgeline Test Prep pauses hiring, closes four centers",
    text: "Ridgeline Test Prep, with 25 centers in the Midwest, announced a hiring freeze and closed four centers on November 10, 2026. Website: ridgeline.example.",
    purpose: ["accounts", "signals"],
    company: "Ridgeline Test Prep",
    segment: "Test prep companies",
  },
  {
    url: `${U}/olive-tree/about`,
    title: "Olive Tree Homeschool Co-op",
    text: "Olive Tree Homeschool Co-op supports 400 homeschooling families in Georgia with weekly in-person classes and printed curriculum packets. In 2026 it added two new campuses. Website: olivetree.example.",
    purpose: ["accounts", "signals"],
    company: "Olive Tree Homeschool Co-op",
    segment: "Homeschool co-ops",
  },
  {
    url: `${U}/atlas-stem/home`,
    title: "Atlas STEM Labs",
    text: "Atlas STEM Labs runs weekend robotics workshops for middle-school students in Seattle. Website: atlasstem.example.",
    purpose: ["accounts"],
    company: "Atlas STEM Labs",
    segment: "Tutoring center chains",
  },
  {
    url: `${U}/quiznest/pricing`,
    title: "QuizNest pricing",
    text: "QuizNest is an AI homework app for tutoring centers. Students type or photograph a question and get a full step-by-step solution. Plans start at $6 per student per month.",
    purpose: ["competitors"],
  },
  {
    url: `${U}/scansolve/home`,
    title: "ScanSolve - snap a photo, get the answer",
    text: "ScanSolve gives instant answers from a photo of any math problem. Free with ads; Premium is $9.99 per month.",
    purpose: ["competitors"],
  },
  {
    url: `${U}/tutorbot/schools`,
    title: "TutorBot Pro for schools",
    text: "TutorBot Pro is a chat-based AI tutor for schools. Students type questions into a chat window and get explanations. District pricing on request.",
    purpose: ["competitors"],
  },
  {
    url: `${U}/meridian/jobs/head-of-revenue-operations`,
    title: "Meridian Tutoring Group - Head of Revenue Operations",
    text: "Meridian Tutoring Group is hiring its first Head of Revenue Operations to build the team that will run our go-to-market systems. Posted November 23, 2026. Reports to the VP Sales. Meridian runs 31 tutoring centers across Texas and Oklahoma. Website: meridiantutoring.example.",
    purpose: ["accounts", "jobs"],
    company: "Meridian Tutoring Group",
    segment: "Tutoring center chains",
  },
  {
    url: `${U}/meridian/jobs/revenue-operations-analyst`,
    title: "Meridian Tutoring Group - Revenue Operations Analyst",
    text: "Meridian Tutoring Group is hiring a Revenue Operations Analyst on the Revenue Operations team. Posted November 21, 2026. Reports to the Head of Revenue Operations.",
    purpose: ["jobs"],
    company: "Meridian Tutoring Group",
  },
  {
    url: `${U}/meridian/jobs/sales-engineer`,
    title: "Meridian Tutoring Group - Sales Engineer",
    text: "Meridian Tutoring Group is hiring a Sales Engineer on the Revenue Operations team to support new tooling rollouts. Posted November 19, 2026. Reports to the Head of Revenue Operations.",
    purpose: ["jobs"],
    company: "Meridian Tutoring Group",
  },
  {
    url: `${U}/cedarline/jobs/data-engineer`,
    title: "Cedarline Academies - Data Engineer",
    text: "Cedarline Academies is hiring a Data Engineer to work on student records. Posted November 18, 2026. Cedarline runs nine campuses in Oregon.",
    purpose: ["jobs"],
    company: "Cedarline Academies",
    segment: "Charter school networks",
  },
];

type Ev = { url: string; quote: string };

export interface SampleAccount {
  name: string;
  domain: string;
  industry: string;
  size: string;
  location: string;
  segment: string;
  summary: string;
  evidence: Ev[];
  signals: { kind: string; summary: string; date: string | null; url: string; quote: string }[];
  usesCompetitor?: { name: string; url: string; quote: string };
  negative?: { signal: string; url: string; quote: string };
}

export const ACCOUNTS: SampleAccount[] = [
  {
    name: "Brightpath Learning Centers",
    domain: "brightpath.example",
    industry: "After-school tutoring",
    size: "42 centers, about 11,000 students a week",
    location: "California and Arizona",
    segment: "Tutoring center chains",
    summary: "A 42-center tutoring chain whose students work on printed packets with a tutor at each table.",
    evidence: [
      { url: `${U}/brightpath/about`, quote: "runs 42 after-school tutoring centers across California and Arizona" },
      { url: `${U}/brightpath/about`, quote: "Our students work through printed math and reading packets with a tutor at every table" },
    ],
    signals: [
      { kind: "hiring", summary: "Hiring 60 math tutors and opening six new centers near Phoenix", date: "2026-11-12", url: `${U}/brightpath/careers`, quote: "We are hiring 60 part-time math tutors for the spring term as we open six new centers in the Phoenix area" },
    ],
    usesCompetitor: { name: "QuizNest", url: `${U}/news/brightpath-quiznest-pilot`, quote: "began a pilot of the QuizNest homework app in ten centers this fall" },
  },
  {
    name: "Summit Prep Academy",
    domain: "summitprep.example",
    industry: "Test preparation",
    size: "18 locations",
    location: "Texas",
    segment: "Test prep companies",
    summary: "An SAT and ACT prep company that just raised money and says it wants AI practice that keeps students on paper.",
    evidence: [
      { url: `${U}/summit-prep/series-a`, quote: "a test-prep company with 18 locations in Texas" },
      { url: `${U}/summit-prep/series-a`, quote: "it will invest in AI-assisted practice that keeps students working on paper" },
    ],
    signals: [
      { kind: "funding", summary: "Raised a $12M Series A to expand SAT and ACT programs", date: "2026-10-28", url: `${U}/summit-prep/series-a`, quote: "raised a $12 million Series A on October 28, 2026 to expand its SAT and ACT programs" },
    ],
  },
  {
    name: "Cedar Grove Tutoring",
    domain: "cedargrove.example",
    industry: "After-school tutoring",
    size: "9 centers",
    location: "Oregon",
    segment: "Tutoring center chains",
    summary: "A family-owned group of nine centers that is writing a hints-only AI policy because parents worry about copied answers.",
    evidence: [{ url: `${U}/cedar-grove/ai-policy`, quote: "a family-owned group of nine tutoring centers in Oregon" }],
    signals: [
      { kind: "other", summary: "New policy from January 2027: AI tools only if they give hints instead of answers", date: "2027-01-01", url: `${U}/cedar-grove/ai-policy`, quote: "we will allow AI tools in our centers only when they give hints instead of answers" },
    ],
  },
  {
    name: "Northlight Charter Network",
    domain: "northlight.example",
    industry: "K-8 charter schools",
    size: "14 campuses",
    location: "Colorado",
    segment: "Charter school networks",
    summary: "A 14-campus charter network hiring its first leader for classroom technology, with handwritten work in the brief.",
    evidence: [{ url: `${U}/northlight/jobs/instructional-technology`, quote: "operates 14 K-8 campuses in Colorado" }],
    signals: [
      { kind: "hiring", summary: "Hiring its first Director of Instructional Technology to evaluate AI tools for handwritten work", date: "2026-11-03", url: `${U}/northlight/jobs/instructional-technology`, quote: "is hiring its first Director of Instructional Technology" },
    ],
  },
  {
    name: "Paperwise Publishing",
    domain: "paperwise.example",
    industry: "Educational publishing",
    size: "Sells to more than 3,000 schools and centers",
    location: "United States",
    segment: "Worksheet publishers",
    summary: "A worksheet publisher that launched new STEM packets and is openly looking for an AI feedback partner for printed pages.",
    evidence: [{ url: `${U}/paperwise/press/stem-packets`, quote: "sells printable worksheet packets to more than 3,000 schools and tutoring centers" }],
    signals: [
      { kind: "launch", summary: "Launched middle-school STEM packets and is exploring partners for AI feedback on printed pages", date: "2026-11-05", url: `${U}/paperwise/press/stem-packets`, quote: "said it is exploring partners for AI feedback on printed pages" },
    ],
  },
  {
    name: "Tutorly Online",
    domain: "tutorly.example",
    industry: "Online tutoring marketplace",
    size: "2,000 tutors",
    location: "Online",
    segment: "Tutoring center chains",
    summary: "A fully virtual tutoring marketplace.",
    evidence: [{ url: `${U}/tutorly/about`, quote: "a fully virtual tutoring marketplace with 2,000 tutors" }],
    signals: [],
    negative: { signal: "Fully online: students do not use paper", url: `${U}/tutorly/about`, quote: "students do not use paper" },
  },
  {
    name: "Ridgeline Test Prep",
    domain: "ridgeline.example",
    industry: "Test preparation",
    size: "25 centers",
    location: "Midwest",
    segment: "Test prep companies",
    summary: "A 25-center test-prep chain that is cutting back.",
    evidence: [{ url: `${U}/news/ridgeline-hiring-freeze`, quote: "with 25 centers in the Midwest" }],
    signals: [],
    negative: { signal: "Hiring freeze and center closures", url: `${U}/news/ridgeline-hiring-freeze`, quote: "announced a hiring freeze and closed four centers on November 10, 2026" },
  },
  {
    name: "Olive Tree Homeschool Co-op",
    domain: "olivetree.example",
    industry: "Homeschool co-op",
    size: "400 families",
    location: "Georgia",
    segment: "Homeschool co-ops",
    summary: "A homeschool co-op that teaches in person from printed packets and is adding campuses.",
    evidence: [{ url: `${U}/olive-tree/about`, quote: "weekly in-person classes and printed curriculum packets" }],
    signals: [
      { kind: "expansion", summary: "Added two new campuses in 2026", date: "2026-06-01", url: `${U}/olive-tree/about`, quote: "In 2026 it added two new campuses" },
    ],
  },
  {
    // Wrong on purpose: this quote is not on the page, so the verifier drops the company.
    name: "Atlas STEM Labs",
    domain: "atlasstem.example",
    industry: "STEM enrichment",
    size: "30 partner schools",
    location: "Seattle",
    segment: "Tutoring center chains",
    summary: "Rolling out paper-based AI tutoring to 30 partner schools.",
    evidence: [{ url: `${U}/atlas-stem/home`, quote: "is rolling out paper-based AI tutoring to 30 partner schools this year" }],
    signals: [],
  },
];

/** What a model would pull out of each posting page. The Cedarline quote is not on its page on
    purpose, so the verifier is seen dropping a posting in the offline demo too. */
export interface SampleJobPost {
  company: string;
  title: string;
  team?: string | null;
  reportsTo?: string | null;
  date: string;
  url: string;
  quote: string;
}

export const POSTINGS: SampleJobPost[] = [
  {
    company: "Meridian Tutoring Group",
    title: "Head of Revenue Operations",
    team: "Revenue Operations",
    reportsTo: "VP Sales",
    date: "2026-11-23",
    url: `${U}/meridian/jobs/head-of-revenue-operations`,
    quote: "is hiring its first Head of Revenue Operations to build the team that will run our go-to-market systems",
  },
  {
    company: "Meridian Tutoring Group",
    title: "Revenue Operations Analyst",
    team: "Revenue Operations",
    reportsTo: "Head of Revenue Operations",
    date: "2026-11-21",
    url: `${U}/meridian/jobs/revenue-operations-analyst`,
    quote: "is hiring a Revenue Operations Analyst on the Revenue Operations team",
  },
  {
    company: "Meridian Tutoring Group",
    title: "Sales Engineer",
    team: "Revenue Operations",
    reportsTo: "Head of Revenue Operations",
    date: "2026-11-19",
    url: `${U}/meridian/jobs/sales-engineer`,
    quote: "is hiring a Sales Engineer on the Revenue Operations team to support new tooling rollouts",
  },
  {
    company: "Northlight Charter Network",
    title: "Director of Instructional Technology",
    team: "Technology",
    reportsTo: null,
    date: "2026-11-03",
    url: `${U}/northlight/jobs/instructional-technology`,
    quote: "is hiring its first Director of Instructional Technology",
  },
  {
    company: "Brightpath Learning Centers",
    title: "Math Tutor",
    team: null,
    reportsTo: null,
    date: "2026-11-12",
    url: `${U}/brightpath/careers`,
    quote: "We are hiring 60 part-time math tutors for the spring term as we open six new centers in the Phoenix area",
  },
  {
    company: "Cedarline Academies",
    title: "Data Engineer",
    team: "Data",
    reportsTo: null,
    date: "2026-11-18",
    url: `${U}/cedarline/jobs/data-engineer`,
    quote: "is hiring its first Data Engineer to found the data team",
  },
];

export interface SamplePerson {
  name: string;
  title: string;
  seniority: string;
  company: string;
  url: string;
  quote: string;
  linkedin?: boolean; // treat the page as their profile
  studiedAt?: { school: string; quote: string }[];
  previouslyAt?: { company: string; quote: string }[];
}

export const PEOPLE: SamplePerson[] = [
  {
    name: "Maya Okafor",
    title: "Head of Academics",
    seniority: "executive",
    company: "Brightpath Learning Centers",
    url: `${U}/people/maya-okafor`,
    quote: "Maya Okafor is Head of Academics at Brightpath Learning Centers",
    linkedin: true,
    studiedAt: [{ school: "UCLA", quote: "Education: UCLA, B.A. in Mathematics for Teaching" }],
    previouslyAt: [{ company: "Lumen Education", quote: "Previously a curriculum lead at Lumen Education" }],
  },
  {
    name: "Maya Okafor",
    title: "Head of Academics",
    seniority: "executive",
    company: "Brightpath Learning Centers",
    url: `${U}/news/brightpath-quiznest-pilot`,
    quote: "Head of Academics Maya Okafor said the team is still looking for tools that work with paper packets",
  },
  {
    name: "Daniel Reyes",
    title: "Director of Curriculum",
    seniority: "director",
    company: "Summit Prep Academy",
    url: `${U}/summit-prep/leadership`,
    quote: "Daniel Reyes, Director of Curriculum, joined Summit Prep Academy in 2022",
  },
  {
    name: "Erin Walsh",
    title: "Chief Executive Officer",
    seniority: "executive",
    company: "Summit Prep Academy",
    url: `${U}/summit-prep/leadership`,
    quote: "Erin Walsh is Chief Executive Officer and co-founder",
  },
  {
    name: "Daniel Reyes",
    title: "Director of Curriculum",
    seniority: "director",
    company: "Summit Prep Academy",
    url: `${U}/people/daniel-reyes`,
    quote: "Daniel Reyes is Director of Curriculum at Summit Prep Academy",
    linkedin: true,
    studiedAt: [{ school: "University of Texas at Austin", quote: "Education: University of Texas at Austin, M.Ed. in Curriculum and Instruction" }],
  },
  {
    name: "Priya Nair",
    title: "Owner",
    seniority: "owner",
    company: "Cedar Grove Tutoring",
    url: `${U}/cedar-grove/ai-policy`,
    quote: "Owner Priya Nair wrote that parents keep asking how we stop students from copying AI answers",
  },
  {
    name: "Alan Brooks",
    title: "Chief Academic Officer",
    seniority: "executive",
    company: "Northlight Charter Network",
    url: `${U}/northlight/leadership`,
    quote: "Dr. Alan Brooks is Chief Academic Officer of Northlight Charter Network",
    previouslyAt: [{ company: "Lumen Education", quote: "He previously led instruction at Lumen Education" }],
  },
  {
    name: "Hannah Lee",
    title: "VP of Product",
    seniority: "vp",
    company: "Paperwise Publishing",
    url: `${U}/people/hannah-lee`,
    quote: "Hannah Lee is VP of Product at Paperwise Publishing",
    linkedin: true,
    previouslyAt: [{ company: "Brightpath Learning Centers", quote: "she was a product manager at Brightpath Learning Centers from 2018 to 2022" }],
  },
];

export interface SampleCompetitor {
  name: string;
  category: "direct" | "indirect" | "alternative";
  positioning: string;
  pricing: string | null;
  ourEdge: string;
  url: string;
  quote: string;
}

export const COMPETITORS: SampleCompetitor[] = [
  {
    name: "QuizNest",
    category: "direct",
    positioning: "AI homework app for tutoring centers that returns full step-by-step solutions.",
    pricing: "From $6 per student per month",
    ourEdge: "QuizNest hands over the full solution on a screen. Glyph gives a hint first and works on the printed packet the center already uses.",
    url: `${U}/quiznest/pricing`,
    quote: "Students type or photograph a question and get a full step-by-step solution",
  },
  {
    name: "ScanSolve",
    category: "direct",
    positioning: "Consumer app: photograph a math problem and get the answer.",
    pricing: "Free with ads; Premium $9.99 per month",
    ourEdge: "ScanSolve is the answer-copying tool parents worry about. Glyph holds the answer back unless the student asks for it.",
    url: `${U}/scansolve/home`,
    quote: "gives instant answers from a photo of any math problem",
  },
  {
    name: "TutorBot Pro",
    category: "indirect",
    positioning: "Chat-based AI tutor for schools; students type into a chat window.",
    pricing: "District pricing on request",
    ourEdge: "TutorBot needs a device and typing. Glyph needs a pen: students never leave the page.",
    url: `${U}/tutorbot/schools`,
    quote: "Students type questions into a chat window and get explanations",
  },
];

export const EMAILS: Record<string, { pattern: string; found: { first: string; last: string; position: string; seniority: string; confidence: number; verified: boolean }[] }> = {
  "brightpath.example": { pattern: "{first}.{last}", found: [{ first: "Maya", last: "Okafor", position: "Head of Academics", seniority: "executive", confidence: 96, verified: true }] },
  "summitprep.example": { pattern: "{f}{last}", found: [{ first: "Daniel", last: "Reyes", position: "Director of Curriculum", seniority: "senior", confidence: 91, verified: true }] },
  "cedargrove.example": { pattern: "{first}", found: [{ first: "Priya", last: "Nair", position: "Owner", seniority: "executive", confidence: 88, verified: true }] },
  "northlight.example": { pattern: "{first}.{last}", found: [] },
  "paperwise.example": { pattern: "{first}{l}", found: [{ first: "Hannah", last: "Lee", position: "VP of Product", seniority: "executive", confidence: 79, verified: false }] },
  "olivetree.example": { pattern: "{first}", found: [] },
};

export const GLYPH_PRODUCT = {
  name: "Glyph",
  description:
    "Glyph is an AI tutor that works on paper. A phone camera looks down at the desk; students study on the worksheets they already have and never type. They draw small marks and Glyph answers on a screen beside them: a star next to a problem gives one hint, an underline defines a word, a box checks an answer, a target gives a new practice problem. It gives a hint before it gives an answer, so students still do the thinking and nobody copies solutions. At the end of a session it writes a study guide from what the student highlighted.",
  url: "https://glyph.example",
  pricing: "Per-seat subscription for centers and schools; a pilot is one center for one term.",
  customers: "Early pilots with after-school tutoring centers.",
};

export const GLYPH_FOUNDER = { name: "Yoon Woo", schools: ["UCLA"], employers: [] as string[] };
