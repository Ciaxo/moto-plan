# Moto Plan

A small offline app for planning the road to a motorcycle licence and a first bike. It keeps three things in one place: a step-by-step plan, a personal knowledge base and a savings budget.

The interface is in Polish. It is built for phones first. From a window width of 900 px the bottom tab bar turns into a side panel with an extra link to the Data screen.

## Status

Early development.

### Progress

- [x] App shell and navigation
- [x] UI components, light and dark theme
- [x] Local database and content packs
- [x] Plan screen
- [x] Backup export and import
- [x] Knowledge base
- [x] Budget
- [x] Start screen
- [x] Desktop layout
- [ ] Installable, works offline
- [ ] Published on GitHub Pages
- [ ] Content pack export

## Principles

- **Local only.** No server, no account, no analytics. The app makes no requests outside its own origin.
- **No dependencies.** Plain HTML, CSS and JavaScript. No framework, no build step.
- **Your data stays with you.** Everything is stored in the browser on your device. Backup is a single JSON file you export and keep.
- **Content is not part of the app.** Stages, steps, questions and costs come from a content pack you import, so everyone can use their own plan.

## Run locally

You need Python 3 or any other static file server.

```
python -m http.server 8000
```

Open `http://localhost:8000`.

## Content packs

The app starts empty. Its content (stages, steps, questions, goals and costs) comes from a JSON file called a content pack. On first start the app offers to load a pack from a file, to load the bundled example pack or to start with an empty plan. Later you load packs with the import button on the Data screen, the same one that restores backups (see [Backups](#backups)). Stages, steps, questions and costs can also be added, edited and deleted in the app, and a new category can be created while adding a question. Goals are not edited in the app (see [Budget](#budget)).

A minimal pack:

```json
{
  "app": "moto-plan",
  "type": "content",
  "formatVersion": 1,
  "packId": "my-plan",
  "title": "My plan",
  "version": 1,
  "stages": [
    { "id": "my-stage-1", "order": 1, "title": "Theory", "period": "winter" }
  ],
  "steps": [
    { "id": "my-step-1", "stageId": "my-stage-1", "order": 1, "title": "Pass the theory exam", "dueDate": "2027-02", "cost": 59, "hint": "" }
  ]
}
```

See [data/example-pack.json](data/example-pack.json) for a full example.

### Pack fields

| Field | Description |
|---|---|
| `app`, `type` | Required. Always `moto-plan` and `content`. |
| `formatVersion` | Format version, currently `1`. Packs with a higher version are rejected. |
| `packId` | Required. Stable id of the pack. Never changes between versions. |
| `title` | Required. Name shown in the app. |
| `version` | Required. Integer, raised with every update of the pack. |

Every collection below is optional, so a pack can hold only questions, for example. Each record needs an `id` that is unique within its collection.

| Collection | Required fields | Optional fields |
|---|---|---|
| `stages` | `title` | `order`, `period`, `headline` |
| `steps` | `stageId`, `title` | `order`, `dueDate`, `cost`, `hint` |
| `categories` | `title` | `order` |
| `questions` | `categoryId`, `question` | `order`, `answer`, `sourceTitle`, `sourceUrl` |
| `goals` | `title` | `order` |
| `costs` | `title`, `amount`, `group`, `goalId` | `order`, `date` |

- `title` and `question` are non-empty text. Other text fields default to an empty string.
- `order` is a number. Without it, records keep their order from the file.
- Amounts are whole złoty. `amount` is an integer greater than zero. `cost` is an integer greater than zero, or `null`, which is the default.
- Dates are empty or written as `YYYY`, `YYYY-MM` or `YYYY-MM-DD`.
- `group` is `once`, `yearly` or `hidden`.
- `stageId`, `categoryId` and `goalId` must point to a record in the same pack or one already in the app.
- `answer` is plain text. A blank line starts a new paragraph. Lines starting with `- ` form a list. Any other line break is kept as a line break within the paragraph.
- `sourceUrl` is shown as a link only when it starts with `https://`. Any other address is kept, but shown without a link.
- Other fields are ignored, including fields starting with `_` and progress fields such as `done`.

A pack with any of these problems is rejected as a whole. The app lists the problems and saves nothing.

### Updating a pack

Keep `packId` and record ids stable and raise `version`. Before saving, the app shows how many entries are new, updated, unchanged and skipped. Importing a newer version adds new records and updates the ones you have not edited. Your progress, notes, edits and deleted records are left alone, and records missing from the new version are kept.

Loading the same version again changes nothing. A version older than the one already loaded is rejected. A pack with a different `packId` is added next to the content you already have.

A pack is data only. Its text is shown as plain text. Packs never contain deposits or settings.

## Start

The Start screen sums up the plan and the budget.

- The current stage is the first one that is not closed. A stage is closed when it has steps and all of them are done. When every stage is closed, the last one is current. The screen title is the stage's `headline`, or its `title` when there is none.
- The gauge shows the share of done steps, rounded down, so it reaches 100% only when every step is done. On a phone the bar below it has one segment per stage. On a wide screen the cards stand side by side and a separate Stages card (*Etapy*) shows every stage by name with its done and total steps.
- Next steps (*Najbliższe kroki*) lists up to three steps that are not done, the earliest due first. A due date of only a year counts as the end of that year, a month as the end of that month, and steps without a date come last. Steps with the same due date keep their order in the plan. A step can be ticked off right there.
- The savings card shows the same amounts and purchase estimate as the Budget screen and opens it. It appears once there is at least one cost.

The Motorcycle tab is a preview of a later version. When the purchase month is estimated, it also says how many months are left.

## Knowledge base

Questions and answers are grouped in categories. The list can be narrowed to one category and searched as you type. The search looks in the question, the answer and your notes, and ignores letter case and Polish diacritics, so `lancuch` finds "łańcuch".

Each question has a status, *don't know* or *know*, and a notes field that saves itself a moment after you stop typing. Notes and status count as your progress: a newer version of the pack still updates a question you have only taken notes on. Editing the question itself in the app keeps it as you wrote it.

A source link opens in a new tab. It is the only link that leads outside the app.

## Budget

The Budget screen compares the costs with the money you have put aside. All amounts are whole złoty.

- Every cost counts towards the total, whatever its kind: one-off, yearly or hidden (*Jednorazowe*, *Roczne*, *Ukryte i rezerwa*). A cost is either planned or paid.
- Collected (*Zebrane*) is the sum of all deposits. On account (*Na koncie*) is collected minus the paid costs and can be negative. Missing (*Brakuje*) is the total minus collected, never below zero.
- With a monthly deposit set, the app estimates the purchase month: the month in which the missing amount is covered, counting a started month as a whole one. A monthly deposit of 0 means no estimate.

Costs belong to goals, which come from the content pack. When you add the first cost and there is no goal yet, the app creates one called *Mój cel*.

With two or more goals you can switch between one goal (*Jeden cel*) and separate goals (*Osobne cele*). The switch changes only the view: amounts and assignments stay as they are. In the separate view each goal shows its value, the sum of its costs, and how much of the deposits it has received:

1. A deposit can be assigned to a goal. It counts only for that goal, even above the goal's value.
2. Deposits without a goal are shared out in goal order. Each goal takes what it still needs, and the last goal takes whatever is left.

Money assigned above a goal's value stays with that goal, so the last goal card shows what the whole budget is missing and the estimated purchase month.

## Backups

Backups live on the Data screen, which opens from the settings icon on the Start screen, or on a wide screen from the side panel.

Export saves everything stored in the app to one file named `moto-plan-YYYY-MM-DD.json`, with the local date. The file holds every record, deleted ones included, so deletions carry over when you import it on another device.

```json
{
  "app": "moto-plan",
  "type": "backup",
  "schemaVersion": 1,
  "exportedAt": "2027-01-14T18:20:00.000Z",
  "data": {
    "stages": [], "steps": [], "categories": [], "questions": [],
    "goals": [], "costs": [], "deposits": [], "settings": []
  }
}
```

There is one import button for backups and content packs. The app tells them apart by `type`. Before saving a backup, it shows how many entries are new, newer than in the app and unchanged, and lets you choose:

- **Merge** (*Połącz*) adds entries the app does not have. An entry already in the app is replaced only when the one in the file has a later `updatedAt`. On equal dates the entry in the app stays.
- **Replace all** (*Zastąp wszystko*) clears the app and loads the file as it is. It asks for confirmation first.

A backup from a newer version of the app is rejected, and so is a damaged one. Every record needs a non-empty `id`, `deleted` set to `true` or `false`, and `createdAt` and `updatedAt` written exactly as JavaScript's `toISOString()` writes them, for example `2027-01-14T18:20:00.000Z`. Nothing is saved from a rejected file.

The Data screen shows when you last exported a backup. When there has never been one, or the last one is more than 7 days old, and the app has changes made after it, a dot appears next to that line and on the settings icon on the Start screen, or on a wide screen next to the Data link in the side panel.

**Delete all data** (*Usuń wszystkie dane*) at the bottom of the Data screen removes the database and the stored theme from this browser after two confirmations. It cannot be undone, so export a backup first if you want to keep anything.

## Privacy

This repository contains code and a generic example only. Personal backups and private content packs are ignored by git (`moto-plan-*.json`, `prywatne/`). Do not commit them.

## Project layout

Target layout. Files appear as the app is built.

```
index.html              app shell
css/                    styles, design tokens in tokens.css
js/                     app code (ES modules)
js/lib/                 pure functions, covered by tests
js/views/               one module per screen
icons/                  icon sprite and app icons
data/example-pack.json  example content pack
tests/                  browser test page
```

## Development

- `master` always works. Each change is made on a short-lived branch and merged when its checks pass.
- Commits are small and do one thing. Messages are one short line in the imperative: `Add hash router`, `Fix step counter after delete`.
- Tests for the pure functions run in the browser at `http://localhost:8000/tests/`.
- The version number is in `js/version.js` and is shown at the bottom of the Data screen.

## License

Not chosen yet.
