// What each model task is given and what it must return. The prompts in the agents ask for
// exactly these JSON shapes; the sample model in lib/sample/model.ts returns the same shapes.
import type { Fact, Founder, Product, Source } from "../types";

export interface IcpIn {
  product: Product;
  founder: Founder;
}

export interface IcpOut {
  summary: string;
  industries: { name: string; naics?: string | null; confidence: number; why: string }[];
  company_size: { headcount: string; revenue: string; confidence: number; why: string };
  personas: { title: string; seniority: string; function: string; cares_about: string; confidence: number }[];
  triggers: { event: string; why_it_matters: string; confidence: number }[];
  negatives: { signal: string; why: string }[];
  regions: string[];
  expansions: { segment: string; reasoning: string; confidence: number }[];
  search_plan: { query: string; purpose: "accounts" | "competitors"; segment: string }[];
}

export interface Quoted {
  source: number;
  quote: string;
}

export interface AccountsIn {
  shown: Source[];
  segments: string[];
  focus: string | null; // when set, only this company is wanted (a signals search)
  product: Product;
}

export interface AccountOut {
  name: string;
  domain?: string | null;
  industry?: string;
  size?: string | null;
  location?: string | null;
  segment?: string;
  summary?: string;
  evidence?: Quoted[];
  signals?: { kind: string; summary: string; date?: string | null; source: number; quote: string }[];
  uses_competitor?: { name: string; source: number; quote: string } | null;
  negative?: { signal: string; source: number; quote: string } | null;
}

export interface AccountsOut {
  companies: AccountOut[];
}

export interface PeopleIn {
  shown: Source[];
  companies: string[];
  titles: string[];
  anchors: string[]; // the founder's schools and employers
}

export interface PersonOut {
  name: string;
  title: string;
  seniority?: string;
  company: string;
  source: number;
  quote: string;
  studied_at?: { school: string; source: number; quote: string }[];
  previously_at?: { company: string; source: number; quote: string }[];
}

export interface PeopleOut {
  people: PersonOut[];
}

export interface CompetitorsIn {
  shown: Source[];
  product: Product;
}

export interface CompetitorsOut {
  competitors: {
    name: string;
    category: string;
    positioning: string;
    pricing?: string | null;
    our_edge: string;
    evidence: Quoted[];
  }[];
}

export interface WriteIn {
  product: Product;
  sender: string;
  company: string;
  contactName: string | null;
  contactTitle: string | null;
  facts: Fact[];
  variant: "A" | "B";
  angle: string;
  notes: string[]; // the reviewer's notes, when this is a rewrite
}

export interface WriteOut {
  subject: string;
  body: string;
  linkedin_note: string;
  claims: { text: string; fact: number | null }[];
}

export interface ReviewIn {
  subject: string;
  body: string;
  claims: { text: string; fact: number | null }[];
  facts: Fact[];
}

export interface ReviewOut {
  claims: { text: string; fact: number | null; supported: boolean; note?: string }[];
  verdict: "pass" | "fail";
  notes: string[];
}

export interface ReplyIn {
  text: string;
}

export interface ReplyOut {
  intent: "positive" | "neutral" | "negative" | "unsubscribe";
  summary: string;
  next_step: string;
}
