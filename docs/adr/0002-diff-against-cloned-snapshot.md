# Diff against the freshly cloned previous snapshot

"Previous snapshot" for the data diff is the `assets/tmb-data.json` already
committed on `loot` `gh-pages`, taken from the fresh clone the import creates
each run — not a sidecar file in `tmb-import` and not a re-fetch. The clone is
already the source of truth the push overwrites, so diffing against it needs
no extra network call and can't drift from what the site currently shows.