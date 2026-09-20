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

The original private Drive archive remains available as a backup. Existing assignment folder URLs
are in `hub-config.json`; future assignments use a Drive search for the exact
`hw-submissions-<sheetId>` folder, created automatically on first submission.
The generator reads `data-sheet-id` or a legacy inline `sheetId` from each page.
Folders and files are not shared publicly, and pupil pages have no submitted-work
links. The hub does not imply that an empty folder contains a submission.

Backend source and pre-change backup live locally in `Admin/Homework backend/`,
outside this public repository. The deployed Apps Script URL is unchanged.
`node check_storage.cjs` in that folder tests storage order and failure handling.
Timmy's English demo folder contains a clearly labelled storage test, not pupil work.

## Private web review

`Review work` now opens the HTML teacher workspace instead of a Drive PDF folder.
`reviewApp` in `hub-config.json` is a separate Apps Script deployment restricted
by Google to **Only myself**. Its doGet and every teacher RPC also require the
actual active user to equal the teacher account; effective-user identity is never
used as an authorization check. The public pupil send endpoint remains separate.

The workspace displays submission history, question text, pupil answers, private
keys/guidance, automatic exact-answer comparisons, manual marks and private notes.
Keys can be edited on the page and are stored only in private Drive storage.
Saving a review does not notify or disclose it to pupils. Review revision checks
prevent accidentally overwriting a review changed in another tab.

New submissions additionally save structured JSON. Existing answers.txt submissions
remain readable; known original question labels map to field IDs for answer keys.
Unmatched old questions show no key until one is added; no IDs are guessed.
Private source, HTML, local question catalogue and tests are in
`Admin/Homework backend/`. Never copy them into this public repository.

When adding or changing teacher code, update both deployments to the same tested
version, keeping the teacher deployment restricted and the pupil deployment open.
Run `node check_teacher.cjs` and `node check_storage.cjs` in the backend folder.

## Maksim: merged homework, 19–20 September

The canonical pupil page is `maksim-2026-09-20-490f07/`. It combines the two
assignments into three exercises (10 answer fields). The 19 September URL is a
redirect, copied into the deployed artifact but omitted from the hub index via
`data-homework-redirect="true"`. Original files remain in Git history and the
student's local Homework folder; previous submissions are not deleted.

The page intentionally exposes its selected practice answers after a pupil
clicks Check; these are not exam secrets. `assets/maksim-homework.js` contains only
the pupil-facing answers, not the private teacher guidance in `_keys`. Open
responses receive a teacher-review message, not an automatic wrong mark.
Styles and checking are scoped to this page; other pupils retain their behavior.
The original 20 September sheet ID and retained field IDs remain unchanged.
Vocabulary answers d1–d3 are copied from the old browser draft only if missing;
the old draft and archived submissions are preserved. The local private key
file includes d1–d3 for the existing private-key upload workflow.
