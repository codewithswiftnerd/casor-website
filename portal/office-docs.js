// ============================================================
//  EXCO OFFICES - the official list of offices (Article 9 Section B
//  of the CASOR UNIPORT constitution). Used by:
//    * dashboard.html  - one card per office under "Unit Reports"
//    * signup.html     - the "position" dropdown
//    * approve.html    - assigning an office when approving
//    * meeting.html    - grouping the live meeting board
//
//  ACCESS CONTROL
//  There are no office passwords any more. The old design kept SHA-256
//  password hashes (with the default passwords written in comments) in
//  this public file and plaintext copies in Firestore, so anyone could
//  read or brute-force them, and the check only ran in the browser.
//
//  Now an admin assigns each approved EXCO to their office (dashboard ->
//  Approvals -> Office column). Firestore rules then let that account -
//  and admins - read and write ONLY that office's documents. The check
//  happens on Google's servers and can't be bypassed from devtools.
//  To change who runs an office, just reassign it. To lock someone out,
//  remove them or reset their login password from the Approvals tab.
//
//  ADMINISTRATIVE ARM
//  President, Vice President, General Secretary and Assistant General
//  Secretary (adminArm: true) lead the fellowship. They are not a unit and
//  do NOT present unit reports or vision statements. Their document types
//  are the General Secretary's: Minutes, Agenda and Proposed Semester
//  Calendar (ADMIN_ARM_DOC_TYPES). The dashboard and the Firestore rules
//  both enforce this.
//
//  HOW TO ADD AN OFFICE
//  Copy one { ... } block, give it a unique "id" (also add that id to
//  OFFICE_IDS in functions/index.js), and set "name" and "category".
//  "photo" is the default card picture (office holders can override it).
// ============================================================

const ADMIN_ARM_DOC_TYPES = ['Minutes', 'Agenda', 'Proposed Semester Calendar'];
const UNIT_DOC_TYPES = ['Minutes', 'Report', 'Vision Statement'];
function officeDocTypes(office) {
    return office && office.adminArm ? ADMIN_ARM_DOC_TYPES : UNIT_DOC_TYPES;
}

const OFFICE_DOCS = [
    // ---------- Administrative Arm (not a unit) ----------
    {
        id: 'president', name: 'President', category: 'Administrative Arm', adminArm: true,
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'vice-president', name: 'Vice President', category: 'Administrative Arm', adminArm: true,
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'general-secretary', name: 'General Secretary', category: 'Administrative Arm', adminArm: true,
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'asst-general-secretary', name: 'Assistant General Secretary', category: 'Administrative Arm', adminArm: true,
        photo: '../images/CASOR.jpg'
    },

    // ---------- Finance ----------
    {
        id: 'financial-secretary', name: 'Financial Secretary', category: 'Finance',
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'treasurer', name: 'Treasurer', category: 'Finance',
        photo: '../images/CASOR.jpg'
    },

    // ---------- Organizing ----------
    {
        id: 'organizing-secretary', name: 'Organizing Secretary', category: 'Organizing',
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'asst-organizing-secretary', name: 'Assistant Organizing Secretary', category: 'Organizing',
        photo: '../images/CASOR.jpg'
    },

    // ---------- Brothers' & Sisters' Leadership ----------
    {
        id: 'brothers-leader', name: "Brothers' Leader", category: "Brothers' & Sisters' Leadership",
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'brothers-welfare-secretary', name: "Brothers' Welfare Secretary", category: "Brothers' & Sisters' Leadership",
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'sisters-leader', name: "Sisters' Leader", category: "Brothers' & Sisters' Leadership",
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'sisters-welfare-secretary', name: "Sisters' Welfare Secretary", category: "Brothers' & Sisters' Leadership",
        photo: '../images/CASOR.jpg'
    },

    // ---------- Publicity, Media & PR ----------
    {
        id: 'publicity-secretary', name: 'Publicity / Media Secretary', category: 'Publicity, Media & PR',
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'asst-publicity-secretary', name: 'Assistant Publicity / Media Secretary', category: 'Publicity, Media & PR',
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'public-relations-officer', name: 'Public Relations Officer', category: 'Publicity, Media & PR',
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'press-academic-secretary', name: 'Press & Academic Secretary', category: 'Publicity, Media & PR',
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'asst-press-academic-secretary', name: 'Assistant Press & Academic Secretary', category: 'Publicity, Media & PR',
        photo: '../images/CASOR.jpg'
    },

    // ---------- Follow-up & Bible Study ----------
    {
        id: 'followup-secretary', name: 'Follow-up Secretary', category: 'Follow-up & Bible Study',
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'asst-followup-secretary', name: 'Assistant Follow-up Secretary', category: 'Follow-up & Bible Study',
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'bible-study-secretary', name: 'Bible Study Secretary', category: 'Follow-up & Bible Study',
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'asst-bible-study-secretary', name: 'Assistant Bible Study Secretary', category: 'Follow-up & Bible Study',
        photo: '../images/CASOR.jpg'
    },

    // ---------- Evangelism & Outreach ----------
    {
        id: 'evangelism-secretary', name: 'Evangelism Secretary', category: 'Evangelism & Outreach',
        photo: '../images/Evangelism.jpg'
    },
    {
        id: 'asst-evangelism-secretary', name: 'Assistant Evangelism Secretary', category: 'Evangelism & Outreach',
        photo: '../images/Evangelism.jpg'
    },
    {
        id: 'outreach-secretary', name: 'Outreach Secretary', category: 'Evangelism & Outreach',
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'asst-outreach-secretary', name: 'Assistant Outreach Secretary', category: 'Evangelism & Outreach',
        photo: '../images/CASOR.jpg'
    },

    // ---------- Worship & Arts ----------
    {
        id: 'shalom-leader', name: 'Shalom Leader', category: 'Worship & Arts',
        photo: '../images/worship.jpg'
    },
    {
        id: 'asst-shalom-leader', name: 'Assistant Shalom Leader', category: 'Worship & Arts',
        photo: '../images/worship.jpg'
    },
    {
        id: 'drama-leader', name: 'Drama Leader', category: 'Worship & Arts',
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'asst-drama-leader', name: 'Assistant Drama Leader', category: 'Worship & Arts',
        photo: '../images/CASOR.jpg'
    },

    // ---------- Prayer ----------
    {
        id: 'prayer-secretary', name: 'Prayer Secretary', category: 'Prayer',
        photo: '../images/prayer.jpg'
    },
    {
        id: 'asst-prayer-secretary', name: 'Assistant Prayer Secretary', category: 'Prayer',
        photo: '../images/prayer_unit.jpg'
    },

    // ---------- Hostel Coordinators ----------
    {
        id: 'male-hostel-coordinator', name: 'Male Hostel Coordinator', category: 'Hostel Coordinators',
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'female-hostel-coordinator', name: 'Female Hostel Coordinator', category: 'Hostel Coordinators',
        photo: '../images/CASOR.jpg'
    }
];
