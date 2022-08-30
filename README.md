# ThatsMyBis JSON Importer

This is a simple node script that takes a discord token, logs into discord, logs into ThatsMyBis, and downloads the export json locally

The task.bat file will run the app, clone the gh-pages repo, update the JSON file, and commit the change.

This file is run as a windows task to keep the site up to date.

To run, create a `.env` file and set the following:

```
DISCORD_TOKEN=...
EXPORT_DATA_URL=https://thatsmybis.com/YOUR/GUILD/PATH/export/characters-with-items/html
EXPORT_ITEMS_URL=https://thatsmybis.com/YOUR/GUILD/PATH/export/item-notes/html
```

Each `EXPORT_.._URL` key is optional. If it is missing, that export won't occur.
