// Text from a PDF whose font was not decoded must never reach the model or the page.
import assert from "node:assert/strict";
import { test } from "node:test";
import { garbled, garbledName, readable } from "../lib/garbled";

// What the search returned for one real page (Nov 24): each letter shifted 29 places down.
const shift = (s: string) => [...s].map((c) => (c === " " ? " " : String.fromCharCode(c.charCodeAt(0) - 29))).join("");
const bad = shift("The Regan Group provides third party fulfillment and warehousing for brands across the country");
const good = "Regal Logistics is expanding its sales team and looking for a VP, Sales, at its Fife warehouse.";

test("shifted text is told from real writing", () => {
  assert.equal(shift("The Regan"), "7KH 5HJDQ");
  assert.equal(garbled(bad), true);
  assert.equal(garbled(good), false);
  assert.equal(garbled("DHL, XPO, NFI and UPS"), false, "a few acronyms are not judged");
  assert.equal(garbled("WAREHOUSE AND DISTRIBUTION SERVICES IN SOUTHERN CALIFORNIA"), false, "capitals alone are fine");
});

test("only the unreadable stretches are cut out of a page", () => {
  assert.equal(readable(good), good);
  assert.equal(readable(`${good}\n${bad}\nSecond real line about dock doors.`), `${good}\nSecond real line about dock doors.`);
  const oneLine = `${good} ${Array(3).fill(bad).join(" ")}`;
  assert.ok(readable(oneLine).startsWith("Regal Logistics is expanding"));
  assert.ok(readable(oneLine).length < oneLine.length / 2);
});

test("a company name made of shifted text is refused; real odd names are not", () => {
  assert.equal(garbledName("7KH 5HJDQ URXS 75 )XO\u0193OOPHQW"), true);
  for (const real of ["3PL Worldwide", "STG Logistics", "NX Logistics Thailand", "DHL Supply Chain", "JB Hunt Transport", "3M", "7-Eleven", "XPO"]) assert.equal(garbledName(real), false, real);
});
