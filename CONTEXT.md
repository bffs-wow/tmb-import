# TMB Import

Automates pulling raid/loot data out of ThatsMyBis (TMB) and publishing it to the
`bffs-wow/loot` GitHub Pages site, so the raid team can browse who received and
wish-listed what.

## Language

**Import run**:
One execution of the pipeline: scrape TMB → write the snapshot → publish to
`loot`. Every scheduled run is an import run, whether or not the data changed.
_Avoid_: sync, refresh, job

**Snapshot**:
The exported TMB dataset for one run, wrapped as
`{ "data": [...], "imported": "<ISO run timestamp>" }` and published to
`loot` as `assets/tmb-data.json`. The `imported` field records *when the run
happened*; the `data` array is the *content*.
_Avoid_: dump, export file

**Data change**:
A difference in the `data` array between the previous snapshot and the current
one — i.e. a difference that is NOT the `imported` timestamp. The timestamp
changes every run; the payload is what the site actually consumes.
_Avoid_: file change, diff, "something changed"

**Empty import**:
An import run whose `data` payload is identical to the previous snapshot's.
Still published (so the site shows a fresh timestamp), but produces no
discord notification.
_Avoid_: no-op, skipped run

**Discord notification**:
The webhook message sent to the raid Discord channel, but ONLY when an import
run contains a data change. Summarises the change in plain English with links
to the relevant TMB pages.
_Avoid_: alert, ping, notification (bare)

**Received item**:
An item marked as looted by a character in TMB, appearing under a character's
`received` array with a `pivot.type` of `received`.
_Avoid_: drop, loot (bare), grant

**Wishlist item**:
An item a character has wish-listed in TMB, appearing under a character's
`wishlist` array with a `pivot.type` of `wishlist`. Loot filters and priorities
derive from it.
_Avoid_: wish, wishlisted item, BiS list