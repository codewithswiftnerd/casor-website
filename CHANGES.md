# CASOR Website & EXCO Portal: Audit, Fixes and Redesign (Nov 2026)

Read this before deploying. It lists every change, what still needs manual setup, and what could not be verified.

---

## A. Files changed

### New
| File | Purpose |
|---|---|
| `theme.css` | Bolt-style theme layer loaded after `style.css` on every public page. It adds a light sticky header, big tight headlines, rounded pill buttons, rounded photos, and the Meeting Board and Library planner styles. Remove it to get the old look back. |
| `anthem.js` | Interactive anthem section on the homepage. The big headline pops in one anthem line at a time (tap to skip). The full anthem lights up word by word as you scroll. If an audio link is set, a Play button appears. |
| `meeting.html` + `meeting.js` | Public **Meeting Board**. While an admin has a meeting "live", the house reads each office's minutes, vision statements and reports on their phones. Documents can be filtered and searched, and open in an in-page reader (the Android back button closes it). |
| `portal/approve.html` | Review page linked from the signup email. The admin must sign in and press Approve or Reject. Opening the link does nothing on its own. |
| `firebase.json`, `.firebaserc`, `firestore.indexes.json` | Let `firebase deploy` find the rules and functions. Project id: `casorwebsite`. |
| `.gitignore` | Keeps `node_modules` and env files out of Git. |
| `CHANGES.md` | This file. |

### Modified
| File | Change |
|---|---|
| `portal/firestore-rules/firestore.rules` | Rewritten. See section B. |
| `functions/index.js` | Rewrote the approval flow: tokens are generated on the server, stored as hashes, expire after 72 h and work once. Added the `reviewSignup` callable, rate limiting and audit logging. The legacy `approveSignup` URL now only redirects. `deleteExco` is now also rate-limited and audited. |
| `portal/office-docs.js` | Removed all password hashes and the default passwords that were written in comments. It is now just the office list. |
| `portal/dashboard.html` | Office password lock replaced by account-based office access. Added an Overview tab, General Meetings management, the current-session setting, a "Minutes" document type, "Present at meeting", Reject and Reset password buttons for approvals, an office picker on approve, and an Activity Log. Added audit logging to about 40 admin actions. Added Site Content slots for the anthem and the hero video, and a "Study Planner" library category. Refreshed the styles and made the tabs scrollable on phones. |
| `portal/signup.html` | No client-side approval token any more. Asks for the position held and an optional phone number. |
| `portal/minutes.html` | Retired. It redirects to the Meeting Board, because its password lock is gone. |
| `portal/firebase-config.js` | Auth is optional, so public pages no longer download the Auth SDK. |
| `index.html` | New Bolt-style hero with an optional hero video and photo fallback, the anthem section, and quick-link tiles for the E-Library, Meeting Board and Programmes. |
| `library.html` | Study Planner feature box. Google Docs and Sheets get **Make my copy** plus Word/Excel/PDF downloads, and Drive files get a direct download. |
| `unsubscribe.html` | Writes `unsubscribeProof` so the new rule can check the token (see B5). |
| `apps-script/Code.gs` | `SITE_URL` now holds the real site URL from the canonical tags. Only verified emails pass the admin check. |
| All public pages | Loads `theme.css` and the Inter fonts. Removed Montserrat/Poppins and the unused Auth SDK. Added a "Meetings" nav link, a skip link, `aria-current`, a keyboard-accessible menu, and lazy-loaded images. |
| `style.css` | Fonts now come from CSS variables, and the duplicate Google Fonts `@import` is removed. Nothing else changed. |
| `animations.js` | The header gets a hairline once you scroll. Menu supports keyboard, Esc and `aria-expanded`. |
| `sitemap.xml` | Added `meeting.html`. |
| `units.html` | Restructured into three sections: **The Administrative Arm** (President, VP, Gen Sec, Asst Gen Sec, no longer listed as units), **Our Units** (an interactive, searchable list you tap to open; no photos), and **Current Serving EXCOs** (all the unit leaders' photos, labelled by role). The image slot names haven't changed, so photos set in Site Images keep working. |
| Administrative Arm rules | In `office-docs.js` these four offices are marked `adminArm`. Their document types are the General Secretary's: **Minutes, Agenda, Proposed Semester Calendar**. Units keep Minutes, Unit Report and Vision Statement. `firestore.rules` enforces both lists. The Meeting Board has filters for Agenda and Semester Calendar. |
| CASOR Anthem | Built into `anthem.js` from the handbook (Section E). An admin can still override it from Site Content. Two line endings were cut off in the photo ("aching to **hear**", "never give **up**"), so check them against the handbook. |
| Fivefold Covenant | New section on the homepage and the About page: Life, Royalty, Perfect Health, Peace, Fruitfulness. |
| `presidents.html` + dashboard | Now **Past Admin Houses**. Each administration shows as a 4-photo grid (President, VP, Gen Sec, Asst Gen Sec) with names and tap-to-call phone numbers. Edit it from the dashboard's "Past Admin Houses" tab, which has new phone fields. |
| Member self-registration | New `register.html` + `register.js`, plus a "Get counted in the family" band on the homepage and a footer link. Visitors submit their name, phone, email, gender, level, department, unit, birthday and hostel/address, and must tick a consent box. Each submission goes into the private `members` collection as **New**. The public can only create records, never read them (see the `members` rule). In Dashboard → Members: a "New registrations" filter, a **Verify** button, possible-duplicate flags (same phone), **Export CSV**, and a count on the Overview. |
| Our Covering (units.html) | Now Patron, **Patroness** (was Matron), **District Coordinator** (replaces Staff Adviser) and the new **Alumni President**, shown in a 4-card grid. Photo slots are unchanged (`patron`, `matron`, `staff-adviser`), plus a new `alumni-president` slot in Site Images. |
| Upload from device (no Blaze) | New `portal/uploader.js` adds an **Upload photo / Upload file** button under every link field in the dashboard. Files go to the free Apps Script backend (`handleUploadRequest` in `apps-script/Code.gs`), which checks the uploader is an approved EXCO, saves the file in a "CASOR Website Uploads" folder in the script owner's Google Drive, makes it viewable by link, and fills the link in automatically. Photos are shrunk in the browser first. Limit is 20 MB per file. **Setup:** paste the new `Code.gs` and deploy a new version, accepting the Drive permission. |
| Arrows removed | Removed the decorative arrows ("I'd like to join this unit →", the Meeting Board chevrons) and centred those links. Navigation buttons such as gallery and slideshow next/previous are kept. |
| Homepage tweaks | Removed the green "Join us" badge and the small arrows on the quick-link tiles, and centred the tile text. The welcome line now reads "Join us on Sundays by 2:00 PM at Our Saviour's Chapel, Children Hall." You can edit it from Site Content. |

---

## B. Security issues found and fixed

1. **Anyone could approve themselves as Admin.** `signup.html` wrote the approval token onto the applicant's own `excos/{uid}` document, which the applicant is allowed to read. They could then open `approveSignup?...&role=admin` themselves.
   *Fix:* the token is now created by the Cloud Function and only its SHA-256 hash is stored, in `approval_tokens/{uid}`, which no client can read. It expires and works once. Approval also needs a signed-in admin to press a button.
2. **Email scanners could approve accounts.** The old link approved on a plain GET.
   *Fix:* the link opens `approve.html`, which needs an admin login and an explicit confirmation.
3. **Office passwords were public.** Every office's SHA-256 hash, plus its default password in a comment, sat in `office-docs.js`. Plaintext copies were stored in `office_passwords_plain`. The check only ran in the browser.
   *Fix:* the password system is removed. Office access now comes from the `office` an admin assigns to each EXCO account, and the Firestore rules enforce it on the server. Admins reset logins with **Reset password**, which sends Firebase's reset email, so nobody ever sees a password.
4. **Any approved EXCO could read and edit every office's reports.** The `unit_reports` rule allowed it.
   *Fix:* only the assigned office, or an admin, can read or write that office's reports. Fields are validated: type, title length, https link, and `submittedByUid` must match the user.
5. **Anyone could unsubscribe any email.** The old rule compared the stored token with itself whenever the write left it out.
   *Fix:* the token must be sent in `unsubscribeProof` and must match.
6. **Bootstrap admin email had no verification check.** It was checked by address only.
   *Fix:* the rules, functions and Apps Script now require a verified email.
7. **Missing rules for `folders` and `galleryPhotos`.** The public Gallery and Library folders were being denied.
   *Fix:* they are now public-read and admin-write, with field checks.
8. **Self-escalation.** Users can only create their own profile as `pending`/`exco`, with a fixed set of fields. Only admins can change status, role or office. Server code refuses self-approval and self-removal.
9. **Audit trail.** New append-only `audit_logs` collection. Client entries are pinned to the user's own uid and server time. Edit and delete are blocked for everyone, so not even an admin can rewrite history from the browser.

## C. Testing done, and its limits

Everything below ran **offline** against a mock of Firebase. No real Firebase project was reachable from my environment.

- JavaScript syntax: every inline and standalone script parses (`node --check`).
- Pages rendered in headless Chrome at 390 px (Android phone) and 1366 px with **no console errors**: Home (hero, anthem, tiles, sections), About, Library (planner box and editable-download buttons), Meeting Board (live state, grouping, filters, reader), Signup, Approve, and Dashboard as both Admin and EXCO (Overview, Meetings, office modal with "Present at meeting", Approvals, Activity Log).
- Office ids in `office-docs.js` and `functions/index.js` match: 33 offices in each.
- No broken local links in any page.

**Not tested:** the Firestore rules (the emulator couldn't be installed offline), real sign-in, sending email, push notifications, the newsletter, Cloud Function deployment, and Google Drive previews. Test these on a staging copy first (see E).

## D. Manual setup still needed
1. **Anthem words**: Dashboard → Site Content → "Fellowship Anthem". Put one line per line, plus an optional title and audio link. Until then the section shows the motto lines, labelled "Who we are".
2. **Study planner**: make it a Google Doc or Sheet, share it as "Anyone with the link can view", and add it in Library with category **Study Planner**.
3. **Assign offices**: Dashboard → Approvals → Office column, for every existing EXCO. **Until you do this, non-admin EXCOs can't open any office.**
4. **Set the session**: Dashboard → Unit Reports → "Current administration / session", e.g. `2025/2026`.
5. **Cloud Functions (Blaze plan)**: `firebase functions:secrets:set GMAIL_USER` and `GMAIL_APP_PASSWORD`. Without Functions, approval still works from the dashboard, and `approve.html` falls back to a direct admin write. Removing someone's login (not just their profile) needs Functions.
6. **Apps Script**: paste the updated `Code.gs`, then create a **new deployment version**. Check that the `ADMIN_EMAILS` and `BREVO_API_KEY` Script Properties are set.
7. **Delete the old collections** `office_passwords` and `office_passwords_plain` in the Firebase Console. They hold plaintext passwords.
8. Optional: set a hero video in Site Content → "Hero video".

## E. Deploy
```bash
npm install -g firebase-tools      # once
firebase login
cd "<project folder>"
firebase deploy --only firestore:rules
# Blaze plan only:
cd functions && npm install && cd ..
firebase functions:secrets:set GMAIL_USER
firebase functions:secrets:set GMAIL_APP_PASSWORD
firebase deploy --only functions
```
Then upload the site files to Netlify as before (drag the folder in, or push to the connected Git repo).
Recommended order: deploy the site files and rules together, then assign offices straight away.

## F. Known limitations
- Meeting Board documents are public while a meeting is live, because the house reads them without logging in. Don't present anything that shouldn't be public, and close the meeting afterwards.
- Google Drive previews only work if each file is shared as "Anyone with the link".
- The audio player can't play every Google Drive link. A direct `.mp3` URL is the most reliable.
- Client-side audit entries are honest about *who* acted (uid and time are enforced), but the action text is supplied by the client.
- Existing `unit_reports` created before this update have no `submittedByUid`. They stay readable and editable by their office and admins.

---

## Update: 25 Nov 2026 (Admin House, share links, covenant symbols)

| File | Change |
|---|---|
| `index.html` | The unit photos ("Find Your Place") are gone from the homepage. The **Admin House** now shows there instead: President, VP, Gen Sec, Asst Gen Sec. Photos use the same Site Images slots as units.html, so one upload updates both pages. Each card has a **Share** button. |
| `share.js` (new) | Share sheet with **WhatsApp**, **Copy link** and **More** (the phone's own share menu). Loaded on index, units and gallery. |
| `units.html` | Every unit and every Admin House office has its own link and Share button, e.g. `units.html#unit-prayer`, `units.html#president`. Opening the link scrolls to that unit, opens it and highlights it. |
| `gallery.html` | Share an album (icon on each album cover, and "Share album" inside an album) or a single photo ("Share photo" in the viewer). Links: `gallery.html?album=ID` and `gallery.html?album=ID&photo=ID`. |
| Fivefold Covenant (index + about) | Roman numerals replaced with symbols: Life = green tree, Royalty = gold crown, Perfect Health = heartbeat, Peace = dove, Fruitfulness = fruit. |
| `theme.css` | Styles for all of the above, added at the end. |

---

## Update: 26 Nov 2026 (My Office, password-protected Meeting Board, share previews)

| Area | Change |
|---|---|
| Dashboard, **My Office** tab (was "Unit Reports") | Each EXCO lands on their own office page. Folders: Vision Statements, Unit Reports (or Agenda and Semester Calendar for the Admin House), Minutes, Handover Notes, Other Documents. Each folder has an Add button. Admins get a "Viewing office" switch. |
| Meeting Board | Locked with a password. Admins set it in Dashboard, then My Office, then General Meetings. Members type it once per phone. Changing it locks everyone out until they enter the new one. Signed-in EXCOs don't need it. |
| `portal/firestore-rules/firestore.rules` | New types (Handover Note, Other, and Vision Statement for the Admin House). New `board_private` and `board_access` collections. Meeting documents can only be read with the board password or an EXCO account. |
| `netlify/edge-functions/share-preview.js` | WhatsApp previews show the shared item's own title and picture. |

**One-time setup:** publish the new Firestore rules, and turn on Firebase Authentication > Sign-in method > **Anonymous**.

---

## Update: 27 Nov 2026 (Study Help in the e-library)

| Area | Change |
|---|---|
| `library.html` + `study-help.js` | New **Study Help** section with three tabs. **Get a tutor**: browse tutors by course and send a request. **Study groups**: groups with a "Join on WhatsApp" button. **Become a tutor**: members offer to tutor. Phone numbers are never shown publicly. |
| Dashboard, **Study Help** tab | Visible only to the Press & Academic Secretary, the Assistant, and admins. Assign a tutor to each request (preferred and matching tutors listed first), with WhatsApp buttons that send each side the other's details. Approve or decline tutor offers, hide or remove tutors, and add or edit study groups. |
| `firestore.rules` | New collections: `tutor_requests`, `tutor_applications`, `tutors`, `tutor_private`, `study_groups`. Anyone can send requests and offers; only the academic office and admins can read them. |
| Edge function | Shared study group links (`library.html?group=...`) preview on WhatsApp. |

**Setup:** publish the updated Firestore rules.
