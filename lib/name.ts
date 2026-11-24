// The product's name. It is one setting, NEXT_PUBLIC_APP_NAME, and is never hard-coded elsewhere.
// It was "Tact" until Nov 24: an .env.local copied before the rename still says so, and that
// old default counts as not set, so nobody has to edit their file for the new name to show.
const set = (process.env.NEXT_PUBLIC_APP_NAME || "").trim();

export const APP_NAME = !set || set === "Tact" ? "Connet" : set;
