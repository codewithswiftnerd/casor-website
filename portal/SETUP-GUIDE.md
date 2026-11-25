> **Nov 2026 update — read `/CHANGES.md` first.** Office passwords have been
> removed (office access is now tied to each EXCO account via the Approvals
> tab), signup approval uses a secure review page (`portal/approve.html`), the
> Firestore rules were rewritten, and there is a new public Meeting Board
> (`meeting.html`). Where this guide describes office passwords, one-click
> email approval or the old rules, `/CHANGES.md` and
> `portal/firestore-rules/firestore.rules` take precedence.

# CASOR EXCO Portal — Setup Guide

## What you have now
A `/portal` folder with 4 files, meant to sit alongside your existing public site:
- `login.html` — EXCO sign-in page
- `signup.html` — EXCO account creation (with email verification)
- `dashboard.html` — protected page: share Google Drive file links, maintain the CASORites members database, manage the public Library, News and Statutory Programs, log Unit Reports & Vision Statements (as uploaded documents/photos), control Site Images and Site Content, and approve new EXCO signups
- `firebase-config.js` — where your Firebase project keys go

Two access levels exist: **Admin** (full access to every tab) and **EXCO** (the default — can only read/write Unit Reports & Vision Statements, and can view but not edit News). See **How roles & permissions work** below.

Push notifications are also built: a public-site opt-in banner, and an automatic alert sent to subscribed visitors whenever News or a Statutory Program is posted. It needs 2-3 manual switch-on steps before it actually sends anything — see **How push notifications work** below.

Your public site (`index.html`) is untouched, aside from a new page: `library.html` — a public, no-login-required page where students search/filter and download past questions, textbooks and study guides. It reads from the same Firestore project as the portal (read-only, no sign-in needed), and is managed from the "Library" tab in `dashboard.html`.

File sharing, Library resources, and Site Images all work the same way: paste a Google Drive shareable link rather than uploading through the site, so you only need Authentication and Firestore — **Firebase Storage isn't used and doesn't need to be turned on** (it requires the paid Blaze plan, so this avoids that entirely).

### How Site Images work
Every photo across the main site (hero banners, unit photos, gallery, event cards) has a name — a "slot" — like `unit-prayer` or `hero-about`. In the dashboard's **Site Images** tab, you paste a Google Drive link next to that slot's label and hit Save. Behind the scenes, that Drive link is converted into a direct image URL and stored in Firestore; every page on the site checks Firestore for its slots and swaps the photo in immediately, no redeploy needed. If a slot has never been set, the page just keeps showing its original bundled photo — nothing breaks. Make sure each file is shared as "Anyone with the link" in Drive, or the image won't load for visitors.

### How Site Content (the admin text editor) works
Same idea as Site Images, but for text. Certain pieces of copy on the public site — right now: the homepage's hero service line and "What's CASOR About" section, every event's date badge / tag / title (on both the homepage and `events.html`), and the footer's service times, tagline, address and phone number (shown on every page) — are tagged with a "slot" name in the HTML, e.g. `home-about-p1` or `event-kickoff-title`.

In the dashboard's **Site Content** tab, each of those fields is listed with a box to type into. Type your replacement text and hit **Save** — it's stored in Firestore and every page checks it live, no redeploy needed. Leave a field blank and never touch it, and the page just keeps showing its original bundled copy. A field marked "2 lines" (like a date badge or a service time) breaks onto a new line wherever you press Enter while typing. Use **Reset** to clear a custom value and go back to the default.

This covers the copy most likely to change often (events, service times, contact info, the homepage pitch) without touching code. It doesn't yet cover every word on every page — new slots are cheap to add (one `data-text-slot="..."` attribute in the HTML, one entry in the dashboard's list) if there's other text you'd like editable this way; just point out what you want and it can be added.

### How News works
A proper blog/announcements page — `news.html`, linked in the nav and footer on every page. Unlike Site Content (which edits fixed text in fixed spots), News is a real add/edit/delete list, the same shape as the Library: in the dashboard's **News** tab, write a headline and the post body, optionally paste a Google Drive photo link, and hit **Post**. It appears on `news.html` immediately, newest first, no login needed to read it. Edit or delete any post any time from the same tab; deleting removes it from the public page right away too. The News page banner photo is editable from Site Images → Page Banners → "News Page Banner", same as every other page's banner.

### How Statutory Programs works
Replaces the old fixed "#CASORStrong Events" section. In the dashboard's **Statutory Programs** tab, add a title, pick a program from the list (Covenant Renewal Service, Outreach, Prayer Vigil, Semester Launch, Finance Seminar, Total Evangelism 1/2, Bible Study 1/2) or just type your own if it isn't listed, and optionally a date and a Google Drive photo link. It shows up immediately under "What's Happening" on the homepage (latest 3) and in full on `events.html`, newest first, no login needed to read it. Because it's a real add/edit/delete list rather than fixed slots, new programs can be added at any time — even right after hosting one — with no code changes.

### How Unit Reports & Vision Statements work
Internal only — never shown on the public site. In the dashboard's **Unit Reports** tab, pick the unit, pick Report or Vision Statement, give it a title, and paste a Google Drive "Anyone with the link" URL to the actual document or photo (not typed text) — upload the file to Drive first, share it, then paste the link here, same as Files and Library.

### The four leadership positions
President, Vice President, General Secretary and Assistant General Secretary are set up the same way every other unit is: they appear on `units.html`, they have their own entries in the Unit Reports dropdown (so their documents can be logged there), and their photos are editable from Site Images → Units, same as any unit.

## 1. Create the Firebase project
1. Go to https://console.firebase.google.com → **Add project** → name it (e.g. `casor-uniport`).
2. In the project, click the **Web (</>)** icon to register a web app → copy the `firebaseConfig` object it gives you.
3. Paste those values into `firebase-config.js`, replacing the placeholders.

## 2. Turn on the services you need
In the Firebase Console sidebar:
- **Authentication** → Sign-in method → enable **Email/Password**.
- **Firestore Database** → Create database → start in **production mode**.

## 3. Lock down access (important)

⚠️ **Bug found and fixed here:** the rules that were originally in this
guide (`allow read, write: if request.auth != null;`) only check that
*someone* is logged in — they don't check *who*. But `login.html`'s and
`signup.html`'s "approval" step both work by writing `status: 'approved'`
to the signed-in user's own profile and just hoping the rules reject
that write for people who shouldn't be approved. With the old rules,
that write **never gets rejected** for anyone. Concretely: anyone could
open `signup.html`, create an account, click the verification link in
their email, and be a fully approved EXCO on their very next check —
no admin ever had to approve them. Worse, because enforcement was only
happening in the page's JavaScript, someone comfortable with browser
dev tools could read/write every file link and record directly,
verified or not, approved or not.

The fix below adds a second collection, `preapproved`, that only *you*
(the admin) can populate from the Firebase Console — a user can only
self-approve if their email is already sitting in that list, closing
the hole. `login.html`, `signup.html`, and `dashboard.html` don't need
any further code changes for this — they already write exactly the
shape of data these rules expect.

In **Firestore → Rules**, use:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }
    function isVerified() {
      return isSignedIn() && request.auth.token.email_verified == true;
    }
    function myProfile() {
      return get(/databases/$(database)/documents/excos/$(request.auth.uid)).data;
    }
    // Permanent admin(s), true no matter what any Firestore document
    // says. Add more emails here (comma-separated) if you ever want
    // more than one person to always have admin, no matter what.
    function isBootstrapAdmin() {
      return isSignedIn() && request.auth.token.email in ['igrie318@gmail.com'];
    }
    function isApprovedExco() {
      return isBootstrapAdmin() || (isVerified() && myProfile().status == 'approved');
    }
    // Full access. Everyone else (role 'exco', the default) only gets
    // Unit Reports read/write and News read.
    function isAdmin() {
      return isBootstrapAdmin() || (isApprovedExco() && ('role' in myProfile()) && myProfile().role == 'admin');
    }
    // True only if this approved EXCO's own profile has been assigned
    // (by an admin, in the dashboard's Approvals tab) to exactly this
    // office. Guards the 'office' key the same way isAdmin() guards
    // 'role' above - profiles created before this field existed, or
    // never assigned one, simply don't have it yet.
    function hasOffice(officeId) {
      return isApprovedExco() && ('office' in myProfile()) && myProfile().office == officeId;
    }

    match /excos/{uid} {
      // Admins can list everyone (needed for the Approvals tab's
      // "pending signups" view). Anyone else can only ever read their
      // own profile.
      allow read: if isAdmin() || (isSignedIn() && request.auth.uid == uid);

      // signup.html creates its own profile, always starting as
      // status 'pending', role 'exco' — nothing else about this write
      // is trusted from the client. hasOnly() also blocks a self-
      // registering user from sneaking an 'office' field onto their
      // own doc at creation (see office_passwords below for why that
      // field matters) - office can only ever be set afterwards, by
      // an admin, via the update rule.
      allow create: if isSignedIn() && request.auth.uid == uid
                     && request.resource.data.status == 'pending'
                     && request.resource.data.role == 'exco'
                     && request.resource.data.keys().hasOnly(
                          ['name', 'email', 'status', 'role', 'uid', 'approveToken', 'createdAt']);

      // ONLY an admin can ever change status or role after that — via
      // the dashboard's Approve button / role toggle, or via the
      // one-click email-approval Cloud Function (which uses the Admin
      // SDK and bypasses these rules anyway). There's no path left for
      // a user to approve or promote themselves.
      allow update: if isAdmin();

      // Powers the "Remove" button on the Approvals tab's EXCO list.
      // This only deletes the Firestore profile - it does NOT delete
      // their actual login, which a client-side rule can never do for
      // someone else's account. The dashboard calls deleteExco (a
      // Cloud Function) for that half; this rule just lets that same
      // admin action also clear the profile doc.
      allow delete: if isAdmin();
    }

    // Office/Unit Reports password hashes (NOT the real password - see
    // office_passwords_plain below for that). Doc id = office id, e.g.
    // office_passwords/president = { hash, updatedBy, updatedAt }.
    // Read is open to any approved EXCO, not just admins, because every
    // office holder's own browser needs the CURRENT hash to check what
    // they type into that office's unlock prompt against - if this were
    // admin-only, an admin's password change would work for the admin
    // but never actually take effect for the real office holder. This
    // is the same "light lock, not bank-grade" exposure office-docs.js
    // already documents for the bundled default hashes, which are
    // sitting in a public JS file anyone can already read.
    // Write used to be open to ANY approved EXCO for ANY officeId - an
    // ordinary EXCO in one office could overwrite (though not read)
    // the lock on a totally different office. Now scoped: an EXCO can
    // only write the office recorded on their own profile (set by an
    // admin in the dashboard's Approvals tab - see the excos/{uid}
    // update rule above, and dashboard.html's office-assign dropdown).
    match /office_passwords/{officeId} {
      allow read: if isApprovedExco();
      allow write: if isAdmin() || hasOffice(officeId);
    }

    // The actual current plaintext password for each office - what
    // lets the admin-only "Office Passwords" card show what a password
    // IS, not just whether it's been changed. Admin-read-only, by
    // design: unlike the hash above, there's no reason every EXCO's
    // browser needs to read every other office's real password, and
    // keeping it out of their browser entirely is strictly safer than
    // relying on the UI to just not display it. Write is scoped the
    // same way as office_passwords above: an approved EXCO can only
    // write their OWN assigned office's plaintext password, not
    // anyone else's - they're writing their own office's new
    // password, they just can't read anyone else's afterward.
    match /office_passwords_plain/{officeId} {
      allow read: if isAdmin();
      allow write: if isAdmin() || hasOffice(officeId);
    }

    // Office photo overrides shown in the Unit Reports tab's office
    // cards (separate from Site Images' unit photos on the public
    // site). Same shape/reasoning and same per-office scoping as
    // office_passwords above.
    match /office_photos/{officeId} {
      allow read: if isApprovedExco();
      allow write: if isAdmin() || hasOffice(officeId);
    }

    match /files/{fileId} {
      allow read, write: if isAdmin();
    }

    // The CASORites members database (name, level, dept, DOB, phone,
    // email, address, etc). Personal data - admin-only, same as
    // files, never exposed to the public site.
    match /members/{memberId} {
      allow read, write: if isAdmin();
    }

    // The public Library (library.html). READ is open to everyone - no
    // sign-in - since it's meant for any CASORite to browse and
    // download. Only admins can add/edit/delete.
    match /library/{resourceId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Site Images (hero photos, unit photos, gallery, event cards).
    // Same public-read / admin-write shape as Library - every page on
    // the main site reads this to know which photos to show.
    match /site_images/{slot} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Site Content (editable text - homepage copy, event dates/tags/
    // titles, footer service times & contact info). Same public-read /
    // admin-write shape as Site Images.
    match /site_content/{slot} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Past Presidents (presidents.html + dashboard's Presidents tab).
    // Same public-read / admin-write shape as News and Site Images.
    match /presidents/{sessionId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Past ABC Officials (abc-officials.html + dashboard's ABC
    // Officials tab, linked from the ABC/FYBF cards on units.html).
    // Same public-read / admin-write shape as Presidents.
    match /abc_officials/{sessionId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Hall Pastors (units.html + dashboard's Hall Pastors tab). A
    // plain list rather than sessions, since the count varies every
    // administration. Same public-read / admin-write shape as
    // Presidents/ABC Officials.
    match /hall_pastors/{entryId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // News / blog posts (news.html). Anyone can read the posts, no
    // sign-in, and any signed-in approved EXCO can read them in the
    // dashboard too - but only admins can add, edit or delete one.
    match /news/{postId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Unit Reports & Vision Statements. Internal only - nothing here is
    // ever shown on the public site. This is the one collection every
    // approved EXCO (not just admins) can read AND write - it's the
    // whole point of their access.
    match /unit_reports/{reportId} {
      allow read, write: if isApprovedExco();
    }

    // Statutory Programs (homepage "What's Happening" + events.html).
    // Same public-read / admin-write shape as News.
    match /programs/{programId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Push notification subscribers. Anyone (even not signed in) can
    // create their own subscription - that's the whole point of the
    // opt-in banner - and can delete it (e.g. an unsubscribe flow),
    // identified only by knowing their own token, which acts like a
    // bearer secret. Admins CAN read/list this collection: the
    // dashboard needs the token list to pass along to the Apps Script
    // backend the moment a News post or Statutory Program is saved
    // (see apps-script/Code.gs's handlePushRequest) - it's no longer a
    // Cloud Function using the Admin SDK, so it can't bypass these
    // rules the way the old approach did.
    match /push_subscribers/{token} {
      allow read: if isAdmin();
      // Was `allow create: if true` with no shape check at all - open
      // to writing arbitrary fields onto an arbitrary number of docs,
      // which is a storage-quota/cost abuse vector even though FCM
      // itself would reject a garbage token when a push is actually
      // sent. push-subscribe.js only ever writes {createdAt, page},
      // so require exactly that shape, same style as `subscribers`
      // below.
      allow create: if request.resource.data.keys().hasOnly(['createdAt', 'page'])
                      && request.resource.data.page is string;
      allow delete: if true;
      allow update: if false;
    }

    // Newsletter subscribers (the "Stay Connected" form in every
    // page's footer). The doc ID IS the lowercased email - that's
    // what makes duplicate signups impossible: a second signup with
    // the same address is a write to an ID that already exists, which
    // Firestore treats as an "update" - and public updates are only
    // allowed for the one narrow case below (self-unsubscribe), never
    // a full open update. A public visitor can only ever CREATE their
    // own new record, never read the list or touch anyone else's.
    match /subscribers/{email} {
      allow read: if isAdmin();
      allow create: if request.resource.data.status == 'active'
                      && request.resource.data.email == email
                      && request.resource.data.keys().hasOnly(
                           ['email', 'subscribedAt', 'status', 'unsubscribeToken']);
      // Public self-unsubscribe: allowed WITHOUT login, but only if the
      // request proves it already knows this exact record's private
      // unsubscribeToken (the value emailed to that subscriber and
      // nowhere else) and only touches status/unsubscribedAt - nothing
      // else about the record can change, and the token itself can't
      // be swapped out. This is what unsubscribe.html uses.
      allow update: if isAdmin() || (
                      request.resource.data.diff(resource.data).affectedKeys()
                        .hasOnly(['status', 'unsubscribedAt']) &&
                      request.resource.data.status == 'unsubscribed' &&
                      request.resource.data.unsubscribeToken == resource.data.unsubscribeToken
                    );
      allow delete: if isAdmin();
    }

    // Newsletter send history (Compose Newsletter tab). Written
    // directly by the dashboard client after a send completes (the
    // client is already an authenticated admin at that point, same as
    // every other admin-only collection here) - nothing server-side
    // touches Firestore for this project, since Cloud Functions need
    // the paid Blaze plan. See "How the newsletter system works" below.
    match /newsletters/{newsletterId} {
      allow read, write: if isAdmin();
    }
  }
}
```

**Why this version is simpler than what came before:** there used to be a
second collection, `preapproved`, that had to be kept perfectly in sync
with each person's `excos` document — same email, same role, in both
places — and a user "approved themselves" the moment they verified
their email, by writing their own `excos` doc to match whatever was in
`preapproved`. Any mismatch between the two documents (a typo, a
missing field, a stale token) silently broke access with no clear
error. That's gone now. There is exactly **one** document per person
(`excos/{uid}`), and the only way its `status` or `role` ever changes
after signup is an admin's own write — nothing else, ever. On top of
that, `igrie318@gmail.com` is hardcoded into `isBootstrapAdmin()` as a
permanent admin no matter what any document says, so a documents-only
mistake can never lock the actual admin out again.

**How the new signup/approval flow works:**
1. Someone fills out `signup.html`. A record is created for them with status `pending`. Their email app also opens automatically, pre-addressed to the admin (`igrie318@gmail.com`) with their name and email - they just hit send. Separately, if the email-approval Cloud Function is deployed (see **How automatic email approval works** below), the admin also gets a real email with one-click Approve buttons.
2. They verify their email from the link Firebase sends them. This can happen before or after step 3 - order doesn't matter.
3. The admin either clicks **Approve** in `dashboard.html`'s **Approvals** tab, or clicks a button in the automatic approval email. Either one writes `status: 'approved'` (and the chosen role) directly onto that person's own record - nothing else to keep in sync.
4. The moment BOTH their email is verified AND an admin has approved them, they can sign in and land in the dashboard. The signup page's animated waiting screen (and login.html, if they close that tab and come back later) shows this automatically - no further action needed once both are true.

There's no more "add someone to preapproved ahead of time" shortcut, because there's no separate list to add them to — every account starts by signing up through `signup.html`, and every approval is a single write on their own record.

This means: only *admin-approved*, signed-in, verified EXCOs can read or write file links, the members database, and unit reports, and only they can add to the Library, News, or Statutory Programs, or change Site Images, or approve new signups. Anyone, no login, can read/download from the Library, browse News and Statutory Programs, and see whatever photos are set in Site Images. Unit Reports & Vision Statements stay fully internal, never exposed to the public site.

**Promoting an existing EXCO to Admin (or the reverse):** the Approvals tab's **Current EXCOs & Admins** list shows everyone already approved, with a button to flip their role instantly — no Firebase Console trip needed, and they don't have to log out and back in for it to take effect. The same list now also has a **Remove** button per person (see **Office/Unit passwords** under Recent Additions) for offboarding past EXCOs entirely.

## 4. Deploy
Upload the whole site (public pages + `/portal` folder) to your host as normal. Firebase Hosting also works well and is free for this scale, if you want everything under one roof — ask if you'd like that set up instead of your current host.

## 5. Test it
Visit `yoursite.com/portal/signup.html`, create an account — your email app should open pre-addressed to the admin. Verify your email, then have the admin sign in at `yoursite.com/portal/dashboard.html` → **Approvals** tab and click **Approve**. Sign in at `yoursite.com/portal/login.html` and confirm you land in the dashboard. Try sharing a Google Drive link and adding a member under the "Members" tab, then add a resource under the "📚 Library" tab and confirm it shows up on `yoursite.com/library.html` in a private/incognito window (to be sure it's really visible without being logged in). Do the same check with **Site Content**: change one field (e.g. the "About" heading), save, then reload the homepage in a private/incognito window and confirm the new text shows up there too. Same with **News**: post something, then check it shows up on `yoursite.com/news.html`. Same with **Statutory Programs**: add one, then check it shows up on the homepage and on `yoursite.com/events.html`.

---

## Recent additions

**App Splash (homepage intro) — longer, more photos.** Was 6 photos over ~3 seconds; now 10 photos over 15 seconds. The original 6 still fly in during the first second like before; 4 new ones (`splash-photo-7` through `-10`, top-center and bottom-center) drift in later - at roughly 4s, 6s, 8s, and 11s - so new images keep appearing well into the longer splash instead of everything happening at once and then sitting still. All 10 also get a slow continuous bob once they've settled, for the same reason. New slots are registered in the dashboard's Site Images tab (**App Splash / Loading Screen** group) same as the original 6 - they currently reuse a couple of the existing bundled photos as placeholders (no new distinct images were in the upload), so it's worth pointing each at its own Google Drive photo from there when you get a chance. Pure HTML/CSS/JS, no Firestore rules or Cloud Functions involved - works on the free Spark plan.

**Office/Unit passwords — three bugs fixed, two features added.** Everything in this entry is plain Firestore (rules + reads/writes) and works fully on the **free Spark plan** - no Blaze upgrade needed for any of it. (Only the separate "Removing past EXCOs" feature below needs Blaze.) Redeploy Firestore Rules for this one.
1. *Bug:* `office_passwords` (and `office_photos`) had no Firestore rule at all, same class of mistake as the Presidential Page bug below - meaning the admin-only "Office Passwords" card's Save/Reset always silently failed with a permission error, no matter who was logged in. Fixed by the new `match /office_passwords/{officeId}` and `match /office_photos/{officeId}` blocks in Section 3 above.
2. *Bug:* even once that's fixed, only `loadOfficePasswords()` running for admins meant an admin's password change would never reach the actual office holder's browser - an ordinary EXCO's unlock check only ever compared against the original default hash baked into `office-docs.js`, forever, regardless of what an admin set it to. Fixed: every approved user now loads current hashes, not just admins.
3. *Bug:* the dashboard UI only trusted the `role` field on an admin's own `excos` Firestore doc to decide whether to show them admin tabs (including the Office Passwords card) - unlike the Firestore rules' `isBootstrapAdmin()`, which has always granted `igrie318@gmail.com` full access no matter what any document says. If that field was ever missing for the real admin, they'd have full permission behind the scenes but see the plain EXCO view with no admin tabs at all. Fixed: `dashboard.html` now has its own `BOOTSTRAP_ADMIN_EMAILS` list (keep it in sync with the rules' copy) and checks it the same way.
4. *New:* the admin-only Office Passwords card now shows each office's actual **current password**, not just whether it's "custom" vs "default" - stored in a new admin-only-readable `office_passwords_plain` collection, separate from the hash collection every EXCO can read.
5. *New:* any EXCO who has an office card unlocked can now change that office's password themselves from inside the unlocked view, no admin round-trip needed - a "Change Password" field sits right under the photo-update one.

**Removing past EXCOs — new.** The Approvals tab's "Current EXCOs & Admins" list has a **Remove** button next to everyone but yourself. This deletes both their `excos` Firestore profile AND their actual login - not just the profile - so they genuinely can't sign back in, not just disappear from the list. Deleting someone else's login needs the Admin SDK, so this calls a Cloud Function, `deleteExco`, the same way email-approval does (push notifications used to work this way too, but have since moved to the free Apps Script backend - see **How push notifications work**). **This needs the paid Blaze plan** - Cloud Functions don't deploy at all on the free Spark plan, even at zero usage. **To switch it on once you're on Blaze:** deploy functions once more (`firebase deploy --only functions`) - no new secrets or config needed, it reuses everything already set up for the other functions. Until then, the button will show an error when clicked - the rest of the site (including everything else in this update) works fine on the free plan in the meantime.

**Presidential Page — bug fix + expanded.** The `presidents` collection
had no rule at all in the Firestore rules block above - under
production-mode rules that means "denied by default," so the public
page's read *and* the dashboard's writes to it would have silently
failed until the rules below were redeployed with the new
`match /presidents/{sessionId}` block added. **If your live Firestore
rules were set up before this note, redeploy them now.** While in
there: the page and dashboard form now also capture General Secretary
and Assistant General Secretary (name + optional photo each) per
session, alongside President and VP - all four show as a 2x2 grid on
each session's card. There's also a one-click "Add 3 Sample Sessions"
button in the dashboard's Presidents tab so the page never launches
empty; seeded entries are clearly flagged as samples (on both the
public page and in the admin list) until edited.

**Admin site editor — done, for the highest-value fields.** Rather than the heavier rework originally scoped here (rebuilding every page to pull *all* of its HTML from Firestore), it uses the same lightweight pattern as Site Images: specific fields are tagged in the HTML, and only those get admin-editable. See **How Site Content (the admin text editor) works** above. More slots (any text on any page) can be added on request — just say what you want to be able to edit.

**News / blog section — done.** See **How News works** above.

### How automatic email approval works
Beyond the dashboard's Approvals tab, `functions/index.js` has two more functions: the moment someone signs up, `notifyAdminOnSignup` emails `igrie318@gmail.com` a real message with **"Approve as EXCO"** and **"Approve as Admin"** buttons; clicking either hits `approveSignup`, which checks a one-time token against that person's own signup record and, if it matches, approves them immediately - no dashboard visit needed. This uses the same Blaze plan and Cloud Functions deploy as `deleteExco` above (push notifications used to share this too, but have since moved to the free Apps Script backend), plus a Gmail "App Password" for sending. To switch it on:
1. Turn on 2-Step Verification on the Gmail account that will send these emails, then generate an App Password at myaccount.google.com/apppasswords.
2. `firebase functions:secrets:set GMAIL_USER` and `firebase functions:secrets:set GMAIL_APP_PASSWORD` (paste the sending address, then the app password).
3. Deploy once (`firebase deploy --only functions`), copy the URL Firebase prints, paste it into `FUNCTIONS_BASE_URL` near the top of `functions/index.js`, then deploy again.

Until this is switched on, the mailto: fallback from step 1 above still works fine - the admin just has to visit the Approvals tab themselves instead of clicking a button in a real email.

### How roles & permissions work
EXCOs (the default role) can only read/write Unit Reports & Vision Statements, and can view (not post/edit/delete) News. Admins keep full access to every tab — Files, Members, Library, News, Statutory Programs, Site Images, Site Content, and Approvals. See **Section 3** above for the rules — `igrie318@gmail.com` is hardcoded as a permanent admin there (`isBootstrapAdmin()`), so no Firestore *data* setup step is needed for that account specifically. `dashboard.html` now keeps its own matching `BOOTSTRAP_ADMIN_EMAILS` list so the UI shows that account every admin tab too, not just the rules granting them admin-level access behind the scenes (see **Office/Unit passwords** under Recent Additions) — if you ever add a second permanent admin email, add it to both lists, redeploy rules, and redeploy the site.

⚠️ **Security bug found and fixed here: office password write access
was unscoped.** `office_passwords`/`office_passwords_plain`/
`office_photos` used to let ANY approved EXCO write to ANY officeId -
so, say, the Bible Study Secretary could overwrite the President's
office password lock, not just their own. Fixed with a new `office`
field on each person's `excos/{uid}` profile (one of the `id` values
from `office-docs.js`'s `OFFICE_DOCS`, e.g. `'president'` or
`'prayer-secretary'`) and a `hasOffice(officeId)` rules helper that
only lets someone write an office's password/photo if it's the one
recorded on their own profile. **Admin-only to set** - the
`excos/{uid}` create rule now explicitly rejects an `office` field at
signup (`hasOnly([...])`), so it can only ever be assigned afterwards,
by an admin, via `update`. **To assign one:** dashboard.html's
Approvals tab → "Current EXCOs & Admins" table has a new **Office**
column - pick the office each approved EXCO holds from the dropdown
(or leave "(none)" for people who don't hold a password-gated office).
Nobody has an office assigned by default, including existing accounts
from before this change, so revisit that table once after deploying.

### How push notifications work
**Built. Here's what you got and what's left to switch on.**

⚠️ **Security bug found and fixed here:** `handlePushRequest` in
`apps-script/Code.gs` used to only check that the caller had *a* valid
Firebase login, not that they were an admin - unlike the newsletter
sender right next to it, which does check. Since `signup.html` lets
anyone self-register and gets them a usable ID token immediately
(before email verification or admin approval), and the Apps Script
Web App URL is deployed with "Who has access: Anyone", this meant
anyone could sign up and call that URL directly to push an arbitrary
title/body/link notification to every subscribed device. Fixed by
adding the same `ADMIN_EMAILS` check the newsletter path already has.
**This fix only takes effect once you redeploy:** script.google.com →
open the CASOR script → paste in the updated `Code.gs` → Deploy →
Manage deployments → pencil icon → **New version**. Saving in the
editor alone does not update the live URL.

What's already in the code, working with the free Spark plan, no setup beyond a couple of one-time steps:
- A bottom banner on every public page asking visitors to allow notifications (`push-subscribe.js`)
- `firebase-messaging-sw.js` at the site root, which is what lets a
  notification pop up even when the CASOR tab/app is closed
- `manifest.json`, needed for the browser to register the site for push
- Every subscribed device's token saved to Firestore (`push_subscribers`)

**Sending no longer uses Cloud Functions, and no longer needs Blaze at
all.** Sending a push needs your Firebase project's private
credentials, which can never sit in a browser file someone can view -
that part has to run on a server. Cloud Functions is the usual way to
do that, but it requires the paid Blaze plan just to deploy, even at
zero usage. So instead this reuses the same free Google Apps Script
"Web App" that already sends the newsletter (`apps-script/Code.gs`) -
Apps Script is a genuinely free Google server, no billing card, no
plan upgrade. `portal/dashboard.html` calls it directly the instant a
News post or Statutory Program is saved (not on edits) - no Firestore
trigger involved, so there's nothing to poll or watch.

**To switch it on:**
1. **Get a VAPID key** — Firebase Console → Project Settings → Cloud
   Messaging → "Web Push certificates" → Generate key pair. Paste the
   result into `VAPID_KEY` near the top of `push-subscribe.js`.
2. **Get a service account key** — Firebase Console → Project Settings
   → Service Accounts → "Generate new private key". This downloads a
   JSON file - open it and copy its entire contents.
3. **Set up (or reuse) the Apps Script project** — if you already
   deployed `apps-script/Code.gs` for the newsletter, you're reusing
   the same deployment, no new one needed. Either way:
   - script.google.com → open the CASOR script → gear icon → Script
     Properties → add `FCM_SERVICE_ACCOUNT_JSON` = the whole JSON file
     content from step 2.
   - Deploy → Manage deployments → pencil icon → **New version**, so
     the push-sending code in Code.gs actually goes live. The
     `APPS_SCRIPT_URL` already pasted in `dashboard.html` keeps
     working unchanged - it's the same URL for both jobs.
4. **Update Firestore rules** — the `push_subscribers` rule now needs
   `allow read: if isAdmin();` instead of `allow read: if false;` (the
   dashboard has to read the subscriber token list to pass along).
   It's already updated in the rules block in Section 3 above; just
   redeploy rules.
5. `functions/index.js` no longer sends push at all - that code was
   removed from it. Leave the rest of that file (signup-approval
   emails, `deleteExco`) alone; those still need Blaze only if you
   choose to deploy them, which is a separate decision from push.

Until steps 1–4 are done, the banner and subscribe flow work fine and
quietly collect subscribers - they just won't receive anything yet.

### How the newsletter system works
A separate thing from push notifications above - this is a real email
newsletter, sent to whoever typed their email into the "Stay
Connected" form in the footer of every public page.

**Important: this does NOT use Firebase Cloud Functions or the Blaze
plan.** Cloud Functions require a billing card on file even to deploy
at zero cost, which isn't realistic for every CASOR admin. Instead,
sending uses a free Google Apps Script "Web App" - genuinely free
forever, no card needed at all - which calls Brevo to actually deliver
the emails.

**What's already in the code:**
- The public subscribe form (footer, every page) writes straight to
  Firestore (`newsletter-subscribe.js`) - validates the email, blocks
  duplicates, shows a success/error message. No setup needed, this
  part works the moment the Firestore rules in Section 3 are deployed.
- Dashboard → **Subscribers** tab (admin-only): total count, search by
  email, subscription date, status, a Remove/Unsubscribe button per
  row, a Reactivate button for anyone unsubscribed, and an **Export
  CSV** button.
- Dashboard → **Compose Newsletter** tab (admin-only): subject, title,
  body text, optional image (same Google Drive link pattern as Site
  Images/Library - paste an "Anyone with the link" URL), an optional
  button/link, a live preview, and a Send button.
- `/apps-script/Code.gs` does the actual sending. When Send is
  clicked, the dashboard sends it the newsletter content plus the
  active subscriber list (which the dashboard, as a logged-in admin,
  can already read) and proof of who's sending it (a Firebase ID
  token). The script checks that token is genuinely valid and that the
  signed-in email is on an admin allow-list, then calls Brevo once per
  subscriber. It never sees or stores your Brevo key anywhere a
  browser could read it.
- The dashboard writes the result to a `newsletters` Firestore
  collection itself right after sending, which the **Compose
  Newsletter** tab shows as a history list (subject, date, recipient
  count, status).
- Every newsletter email includes an Unsubscribe link, pointing to
  `unsubscribe.html` (a plain page at your site's root) - clicking it
  needs no login. It works entirely client-side: Firestore only
  accepts that one specific write if the link's token matches what's
  already stored on that subscriber's record, which only the
  subscriber's own email could have contained.

**To switch it on:**
1. **Create a free Brevo account** at brevo.com (no credit card
   needed for the free tier - 300 emails/day, forever free).
2. **Verify a sender address** — Brevo dashboard → "Senders, Domains &
   Dedicated IPs" → add and verify the email you want newsletters to
   come from (this can be the same address as `FROM_EMAIL` in
   `apps-script/Code.gs`). Brevo won't send until this is done.
3. **Get an API key** — Brevo dashboard → click your profile → "SMTP &
   API" → "API Keys" tab → Generate a new key. (This is different from
   an SMTP login/password - Apps Script uses Brevo's HTTP API.)
4. **Create the Apps Script project** — go to script.google.com → New
   project → delete the placeholder code → paste in the entire
   contents of `apps-script/Code.gs`.
5. **Add two Script Properties** — in the Apps Script editor, click
   the gear icon (Project Settings) → Script Properties → Add property,
   twice:
   - `BREVO_API_KEY` = the key from step 3
   - `ADMIN_EMAILS` = a comma-separated list of exactly the emails
     allowed to send a newsletter, e.g.
     `igrie318@gmail.com,anotheradmin@gmail.com` (must match what each
     admin actually logs into the dashboard with)
6. **Edit two constants near the top of `Code.gs`** (in the Apps
   Script editor, not the copy in your site files) - `SITE_URL` (your
   real site address, no trailing slash) and `FROM_EMAIL` if it's not
   already right - then save.
7. **Deploy** — Deploy → New deployment → type "Web app" → Execute as
   **Me**, Who has access **Anyone** → Deploy → authorize when Google
   asks → copy the URL it gives you (ends in `/exec`).
8. **Paste that URL** into `APPS_SCRIPT_URL` near the top of
   `portal/dashboard.html`'s `<script>` section, then re-upload that
   file to your host.
9. **Add the `subscribers` and `newsletters` Firestore rules** — both
   already included in Section 3 above; redeploy rules (paste them
   into Firebase Console → Firestore → Rules → Publish) if you haven't
   already.

Whenever you edit `Code.gs` again later, you have to make a **new
deployment** (Deploy → Manage deployments → pencil icon → New version)
for the change to take effect - just saving isn't enough.

Until step 8 is done, the Subscribers tab still works fully (view,
search, export, remove) - only the actual **Send** button in Compose
Newsletter needs this set up, since that's the step that emails real
people.

**A trade-off worth knowing:** because this skips Cloud Functions,
admin-checking happens in Apps Script by comparing the signed-in
email against the `ADMIN_EMAILS` list you set in step 5, rather than
checking Firestore's `excos` collection directly the way the rest of
the dashboard does. In practice this means adding a new admin who
should be able to send newsletters requires adding their email to
that Script Property too, not just approving them in the Approvals
tab. If CASOR ever moves to the Blaze plan for another reason (e.g.
for push notifications), sending could be moved back to a proper
Cloud Function that checks roles the same way everything else does -
not necessary for now, just worth knowing.

**Why Brevo instead of Gmail (via `GmailApp`, which Apps Script could
also use for free):** Gmail's sending is fine for one email at a time,
but pushing the same message to a whole subscriber list in a short
window is exactly the pattern Gmail's anti-abuse systems watch for - a
personal account can get rate-limited or temporarily locked, and the
free `GmailApp` quota (100 recipients/day) is tighter than Brevo's
free tier (300/day) anyway. Brevo's free tier is built specifically
for this kind of bulk-but-modest sending and won't put a real Gmail
inbox at risk.

## What's genuinely not done yet
Answering your real question directly — beyond the 3 switch-on steps above (which are things only you can do, like your own billing account), here's what's actually still missing:

- **No unsubscribe control.** Once someone taps Allow, there's no button anywhere to turn it back off — they'd have to go into their own browser/phone notification settings. A "stop notifications" toggle can be added if you want one.
- **No recurring/scheduled reminders** (e.g. "Bible Study every Thursday 6pm, automatically"). What's built only fires *when you post* News or a Program. A weekly auto-reminder needs a second, separate Cloud Function (Cloud Scheduler) — same Blaze plan, just more code, not built yet.
- **None of this has been deployed or tested against a live Firebase project** — I checked every file's syntax is valid, but I have no way to actually run it, so real-world testing (does a notification really arrive on a phone) happens the first time you deploy and try it, per **Section 5, Test it**.
- **This pass was scoped to permissions + push only** — nothing else in the portal or public site was touched.
