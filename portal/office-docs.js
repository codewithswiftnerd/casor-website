
const ADMIN_ARM_DOC_TYPES = ['Vision Statement', 'Minutes', 'Agenda', 'Proposed Semester Calendar', 'Handover Note', 'Other'];
const UNIT_DOC_TYPES = ['Vision Statement', 'Report', 'Minutes', 'Handover Note', 'Other'];
const DOC_TYPE_INFO = {
    'Vision Statement': { label: 'Vision Statement', plural: 'Vision Statements', icon: 'fa-eye', hint: 'Your vision and goals for this administration.' },
    'Report': { label: 'Unit Report', plural: 'Unit Reports', icon: 'fa-chart-column', hint: 'Activity reports for general meetings.' },
    'Minutes': { label: 'Minutes', plural: 'Minutes', icon: 'fa-file-lines', hint: 'Minutes of your meetings.' },
    'Agenda': { label: 'Agenda', plural: 'Agendas', icon: 'fa-list-check', hint: 'Agendas for upcoming meetings.' },
    'Proposed Semester Calendar': { label: 'Semester Calendar', plural: 'Semester Calendars', icon: 'fa-calendar-days', hint: 'The proposed calendar for the semester.' },
    'Handover Note': { label: 'Handover Note', plural: 'Handover Notes', icon: 'fa-handshake', hint: 'Notes for whoever holds this office next.' },
    'Other': { label: 'Other Document', plural: 'Other Documents', icon: 'fa-folder-open', hint: 'Anything else that belongs to this office.' }
};
function officeDocTypes(office) {
    return office && office.adminArm ? ADMIN_ARM_DOC_TYPES : UNIT_DOC_TYPES;
}

const OFFICE_DOCS = [
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

    {
        id: 'financial-secretary', name: 'Financial Secretary', category: 'Finance',
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'treasurer', name: 'Treasurer', category: 'Finance',
        photo: '../images/CASOR.jpg'
    },

    {
        id: 'organizing-secretary', name: 'Organizing Secretary', category: 'Organizing',
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'asst-organizing-secretary', name: 'Assistant Organizing Secretary', category: 'Organizing',
        photo: '../images/CASOR.jpg'
    },

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

    {
        id: 'prayer-secretary', name: 'Prayer Secretary', category: 'Prayer',
        photo: '../images/prayer.jpg'
    },
    {
        id: 'asst-prayer-secretary', name: 'Assistant Prayer Secretary', category: 'Prayer',
        photo: '../images/prayer_unit.jpg'
    },

    {
        id: 'male-hostel-coordinator', name: 'Male Hostel Coordinator', category: 'Hostel Coordinators',
        photo: '../images/CASOR.jpg'
    },
    {
        id: 'female-hostel-coordinator', name: 'Female Hostel Coordinator', category: 'Hostel Coordinators',
        photo: '../images/CASOR.jpg'
    }
];
