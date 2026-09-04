# Discord notification is data-driven, not commit-driven

An import run always commits and pushes a fresh snapshot to `loot` so the site
shows an up-to-date `imported` timestamp. The Discord webhook fires only when
the `data` payload actually changed since the previous snapshot — empty imports
are silent. "Import happened" is shown on the site; "import had new data" is
shown in Discord. The two signals are deliberately decoupled.