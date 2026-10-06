# Moto Plan

A small offline app for planning the road to a motorcycle licence and a first bike. It keeps three things in one place: a step-by-step plan, a personal knowledge base and a savings budget.

The interface is in Polish.

## Status

Early development.

### Progress

- [x] App shell and navigation
- [x] UI components, light and dark theme
- [x] Local database and content packs
- [x] Plan screen
- [ ] Backup export and import
- [ ] Knowledge base
- [ ] Budget
- [ ] Start screen
- [ ] Desktop layout
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

The app starts empty. Its content (stages, steps, questions, goals and costs) comes from a JSON file called a content pack. On first start the app offers to load the bundled example pack or to start with an empty plan. Stages and steps can also be added, edited and deleted in the app.

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
- `answer` is plain text. A blank line starts a new paragraph. Lines starting with `- ` form a list.
- `sourceUrl` is shown as a link only when it starts with `https://`. Any other address is kept, but shown without a link.
- Other fields are ignored, including fields starting with `_` and progress fields such as `done`.

A pack with any of these problems is rejected as a whole. The app lists the problems and saves nothing.

### Updating a pack

Keep `packId` and record ids stable and raise `version`. Before saving, the app shows how many entries are new, updated, unchanged and skipped. Importing a newer version adds new records and updates the ones you have not edited. Your progress, notes, edits and deleted records are left alone, and records missing from the new version are kept.

Loading the same version again changes nothing. A version older than the one already loaded is rejected. A pack with a different `packId` is added next to the content you already have.

A pack is data only. Its text is shown as plain text. Packs never contain deposits or settings.

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

## License

Not chosen yet.
