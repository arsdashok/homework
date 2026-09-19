# Homework Hub

Teacher index: https://arsdashok.github.io/homework/67f5f7644ece6050/

The root remains a neutral landing page. Student pages have no links to the
teacher index. The hub is unlisted and marked noindex; it has no sign-in gate.

`scripts/build_hub.py` scans published `<folder>/index.html` pages and groups them
by `body[data-student]`. It reads `body[data-sheet]` for the assignment title/date.
Older pages may use `<title>Student · Subject · Date</title>` instead.

Every push to main builds the hub and deploys the complete site through GitHub
Actions. The latest dated homework is the primary link for each student; earlier
assignments appear under “All homework”. Titles containing “test” are labelled as
test pages and come after normal assignments. Only pupils with published pages
are listed. No answer fields, submissions, answer keys or completion status are
read by this index.

To preview the generated HTML locally:

    python3 scripts/build_hub.py

To prepare the deployable artifact:

    python3 scripts/build_hub.py --site /tmp/homework-site

The artifact contains only the root page, student page folders, public assets and
the generated hub. `_keys`, dot directories and build scripts are excluded.
Keep the hub token in `hub-config.json` stable so bookmarks keep working.

## Submitted work

The existing Homework mailer Apps Script now saves each submission to the owner's
private Google Drive before emailing it. It stores an answers text file and the
original filled PDF; if no PDF arrives it attempts to create a PDF answer report.
PDF failures still leave the answers text file intact. New submissions get unique
timestamped names and never overwrite older work.

Each hub assignment has a `Submitted work` link. Existing assignment folder URLs
are in `hub-config.json`; future assignments use a Drive search for the exact
`hw-submissions-<sheetId>` folder, created automatically on first submission.
The generator reads `data-sheet-id` or a legacy inline `sheetId` from each page.
Folders and files are not shared publicly, and pupil pages have no submitted-work
links. The hub does not imply that an empty folder contains a submission.

Backend source and pre-change backup live locally in `Admin/Homework backend/`,
outside this public repository. The deployed Apps Script URL is unchanged.
`node check_storage.cjs` in that folder tests storage order and failure handling.
Timmy's English demo folder contains a clearly labelled storage test, not pupil work.
