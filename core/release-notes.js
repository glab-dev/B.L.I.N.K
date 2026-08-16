// ==================== RELEASE NOTES ====================
// Release history shown in the "What's New" popup (auto-shown once per new
// version, and openable from the home-page footer button).
// A new entry is prepended on every version bump (see /commit workflow).
// Newest first. Depends on: APP_VERSION (declared inline in index.html).

const RELEASE_NOTES = [
  { version: '2.11.123', date: '2026-08-16', notes: 'Match combined power SOCA outlines and labels to complex, fix CB5 half row' },
  { version: '2.11.122', date: '2026-08-13', notes: 'Apply NEC 80% derate to combined power layout, cable diagram and circuit limit' },
  { version: '2.11.121', date: '2026-08-13', notes: 'Stop deleted panels showing selection outlines in the combined view' },
  { version: '2.11.120', date: '2026-08-05', notes: 'Add drag-box panel selection, match cable and gear SOCA spans to manual assignments' },
  { version: '2.11.119', date: '2026-08-05', notes: 'Sync panel counts and wall size in every dimension mode, fix combined view crash' },
  { version: '2.11.118', date: '2026-08-04', notes: 'Label each visible screen island with its own canvas coordinates and size' },
  { version: '2.11.117', date: '2026-08-04', notes: 'Count data cross jumpers at both ends of each column crossing' },
  { version: '2.11.116', date: '2026-08-04', notes: 'Stop release-notes popup from breaking Playwright runs, correct PDF and font docs' },
  { version: '2.11.115', date: '2026-08-04', notes: 'Remove stale agent tooling and empty test scaffolding, fix SW asset list' },
  { version: '2.11.114', date: '2026-08-04', notes: 'Make canvas PNG exports pixel-perfect and keep screen labels whole across dead panels' },
  { version: '2.11.113', date: '2026-08-04', notes: 'Inherit canvas size on new screens and size screen labels per panel' },
  { version: '2.11.112', date: '2026-08-04', notes: 'Split Resolume slices around dead panels and name exports after the project' },
  { version: '2.11.111', date: '2026-08-04', notes: 'Route behind-drop cables through live panels and snap SOCA feed points off dead panels' },
  { version: '2.11.110', date: '2026-08-04', notes: 'Add Pixels dimension mode and fix dimension mode persistence across screens' },
  { version: '2.11.109', date: '2026-08-02', notes: 'Open loaded project files under their saved file name' },
  { version: '2.11.108', date: '2026-07-26', notes: 'Blank combined dead panels with overlay labels, add release-notes popup, fix data-line gaps and tall-panel structure sizing' },
  { version: '2.11.107', date: '2026-07-26', notes: 'Keep red centre-of-wall mark in structure view when bumpers are off' },
  { version: '2.11.106', date: '2026-07-25', notes: 'Rework connecting plates for gaps and bumpers, keep bumper config, add shared-distro phase balance' },
  { version: '2.11.105', date: '2026-07-23', notes: 'Add red center-of-wall mark on bumpers in structure view' },
  { version: '2.11.104', date: '2026-07-23', notes: 'Show + half row suffix in Simple mode wall dimensions specs' },
  { version: '2.11.103', date: '2026-07-13', notes: 'Add phase-balance feedback, SOCA-local circuit labels, LED/SOCA numbering fixes, preview sizing' },
  { version: '2.11.102', date: '2026-07-09', notes: 'Reset the screen name to default when resetting a screen' },
  { version: '2.11.101', date: '2026-07-09', notes: 'Recalculate on panel-type change and add reset button to screen edit modal' },
  { version: '2.11.100', date: '2026-07-09', notes: 'Replace header Load and Save icons with Recents and Export' },
  { version: '2.11.99', date: '2026-07-09', notes: 'Ignore deleted panels in SOCA/circuit assignment; add green SOCA label outline, refine coordinate labels' },
  { version: '2.11.98', date: '2026-07-09', notes: 'Use newest-wins cloud sync so a stale device can\'t overwrite a fresher copy of projects, panels, or processors' },
  { version: '2.11.97', date: '2026-07-09', notes: 'Reorganize hamburger menu Configuration into Save/Save As/Load, Recent/Export, and Send to Jared rows' },
  { version: '2.11.96', date: '2026-07-09', notes: 'Shorten panel display names by dropping brand-line words across dropdowns, gear, and PDF' },
  { version: '2.11.95', date: '2026-07-09', notes: 'Enlarge the CB5 +½ chip text and widen it for readability' },
  { version: '2.11.94', date: '2026-07-09', notes: 'Add CB5 +½ half-panel-row toggle to Screens table, sync main Dimensions toggle' },
  { version: '2.11.93', date: '2026-07-08', notes: 'Show full Screens table on Canvas page in simple and complex modes' },
  { version: '2.11.92', date: '2026-07-02', notes: 'Make SOCA outline flush with panel edges and scale down small-wall PDF layouts' },
  { version: '2.11.91', date: '2026-07-02', notes: 'Rework Canvas export options into aligned grid with Export in its own row' },
  { version: '2.11.90', date: '2026-07-01', notes: 'Align Band Height control with Header/Footer toggles on mobile' },
  { version: '2.11.89', date: '2026-07-01', notes: 'Fix Send to Jared email choice modal hidden behind Export modal' },
  { version: '2.11.88', date: '2026-06-30', notes: 'Hide redundant menu and canvas export controls, drop Export button icon' }
];

// Build the list of release entries into #releaseNotesList.
function renderReleaseNotesList() {
  const list = document.getElementById('releaseNotesList');
  if (!list) return;
  list.textContent = '';
  RELEASE_NOTES.forEach(function(rel) {
    const entry = document.createElement('div');
    entry.className = 'release-note-entry';

    const heading = document.createElement('div');
    heading.className = 'release-note-heading';
    const ver = document.createElement('span');
    ver.className = 'release-note-version';
    ver.textContent = 'v' + rel.version;
    const date = document.createElement('span');
    date.className = 'release-note-date';
    date.textContent = rel.date;
    heading.appendChild(ver);
    heading.appendChild(date);

    const body = document.createElement('p');
    body.className = 'release-note-text';
    body.textContent = rel.notes;

    entry.appendChild(heading);
    entry.appendChild(body);
    list.appendChild(entry);
  });
}

function openReleaseNotesModal() {
  const modal = document.getElementById('releaseNotesModal');
  if (modal) {
    renderReleaseNotesList();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeReleaseNotesModal() {
  const modal = document.getElementById('releaseNotesModal');
  if (modal) {
    modal.classList.remove('active');
    if (!isWelcomePageVisible) {
      document.body.style.overflow = '';
    }
  }
  // Mark this version as seen so the popup won't auto-show again.
  if (typeof APP_VERSION !== 'undefined') {
    localStorage.setItem('lastSeenWelcomeVersion', APP_VERSION);
  }
}

// Auto-show the popup once on launch when the running version is new to this user.
function maybeAutoShowReleaseNotes() {
  if (typeof APP_VERSION === 'undefined') return;
  if (localStorage.getItem('lastSeenWelcomeVersion') !== APP_VERSION) {
    openReleaseNotesModal();
  }
}
