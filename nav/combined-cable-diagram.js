// ==================== COMBINED CABLE LAYOUT DIAGRAM ====================
// Unified cable diagram for combined multi-screen view.
// Shows multiple LED walls sharing processors, distribution boxes, and power.
// Renders into #combinedCableDiagramCanvas inside the combined tab.

// ---- Combined Cabling Configuration (DERIVED, not user-editable) ----
// The combined view is read-only: every cabling value comes from the screens themselves,
// edited in each screen's own Cable tab. This object is rebuilt from the selection on each
// render purely so the existing consumers (calculateCombinedCabling, the combined gear
// list) keep a single place to read the few genuinely rig-wide values from.
let combinedCablingConfig = {
  processor: 'Brompton_SX40',
  frameRate: 60,
  bitDepth: 8,
  redundancy: false,
  mx40ConnectionMode: 'direct',
  voltage: 208,
  breaker: 20,
  wallToFloor: 5,
  distroToWall: 10,
  processorToWall: 15,
  cablePick: 0,
  cableDropPosition: 'behind',
  powerInPosition: 'top',
  distBoxOnWall: false,
  xdPlacement: 'proc',
  xdToProcessor: 25,
  distBoxMainHorizPosition: 'center',
  distBoxMainVertPosition: 'top',
  distBoxBackupHorizPosition: 'center',
  distBoxBackupVertPosition: 'top'
};

// Per-screen cabling values, with the same defaults the Cable tab uses.
function screenCablingValues(screenId) {
  const d = (screens[screenId] && screens[screenId].data) ? screens[screenId].data : {};
  return {
    wallToFloor: d.wallToFloor ?? 5,
    distroToWall: d.distroToWall ?? 10,
    processorToWall: d.processorToWall ?? 15,
    cablePick: d.cablePick ?? 0,
    cableDropPosition: d.cableDropPosition ?? 'behind',
    powerInPosition: d.powerInPosition ?? 'top',
    xdPlacement: (typeof resolveXdPlacement === 'function') ? resolveXdPlacement(d) : 'proc',
    xdToProcessor: d.xdToProcessor ?? 25,
    xdToWall: d.xdToWall ?? 40,
    redundancy: !!d.redundancy,
    voltage: d.voltage ?? 208,
    breaker: d.breaker ?? 20,
    processor: d.processor || 'Brompton_SX40',
    mx40ConnectionMode: d.mx40ConnectionMode || 'direct'
  };
}

// Rebuild the derived config from the current selection. Rig-wide values (wall height,
// distro distance) take the largest across the selection so nothing is under-reported.
function deriveCombinedCablingConfig(selectedScreenIds) {
  const ids = (selectedScreenIds || []).filter(id => screens[id] && screens[id].data);
  if (!ids.length) return combinedCablingConfig;
  const first = screenCablingValues(ids[0]);
  const cfg = combinedCablingConfig;
  cfg.processor = first.processor;
  cfg.mx40ConnectionMode = first.mx40ConnectionMode;
  cfg.voltage = first.voltage;
  cfg.breaker = first.breaker;
  cfg.frameRate = (screens[ids[0]].data.frameRate) || 60;
  cfg.bitDepth = (screens[ids[0]].data.bitDepth) || 8;
  cfg.redundancy = ids.some(id => screenCablingValues(id).redundancy);
  cfg.wallToFloor = Math.max.apply(null, ids.map(id => screenCablingValues(id).wallToFloor));
  cfg.distroToWall = Math.max.apply(null, ids.map(id => screenCablingValues(id).distroToWall));
  cfg.processorToWall = Math.max.apply(null, ids.map(id => screenCablingValues(id).processorToWall));
  cfg.cablePick = Math.max.apply(null, ids.map(id => screenCablingValues(id).cablePick));
  cfg.xdToProcessor = Math.max.apply(null, ids.map(id => screenCablingValues(id).xdToProcessor));
  // Placement is rig-wide only in the sense that the floor lane needs to know whether ANY
  // screen puts its box out on the floor; per-screen placement still drives each run.
  const placements = ids.map(id => screenCablingValues(id).xdPlacement);
  cfg.xdPlacement = placements.includes('remote') ? 'remote'
    : (placements.includes('wall') ? 'wall' : 'proc');
  cfg.distBoxOnWall = cfg.xdPlacement === 'wall';
  cfg.cableDropPosition = first.cableDropPosition;
  cfg.powerInPosition = first.powerInPosition;
  return cfg;
}

// ---- Source Feeds ----
// One signal source per processor. Feeds are numbered by processor ORDER in the project,
// not by model, so swapping an SX40 for an S8 keeps that feed's name and distance.
// sourceFeeds.list[i] holds the i-th processor's settings; anything unset falls back to
// the defaults.
const SOURCE_FEED_DEFAULT_NAME = 'Source';

// projectDataUnits() with its processors in feed order: first appearance walking the
// screens in tab order. Its own order is by processor number, which would slot a new
// screen's processor in among the existing ones and shift every feed after it.
function sourceFeedUnits() {
  const units = (typeof projectDataUnits === 'function') ? projectDataUnits() : { procs: [], boxes: [], byScreen: new Map() };
  const ordered = [];
  const seen = new Set();
  getScreenIdsInOrder().forEach(id => {
    const reach = units.byScreen.get(id);
    if(!reach) return;
    units.procs.forEach(u => {
      if(reach.procUnitIds.has(u.unitId) && !seen.has(u.unitId)) { seen.add(u.unitId); ordered.push(u); }
    });
  });
  units.procs.forEach(u => { if(!seen.has(u.unitId)) ordered.push(u); });
  return { procs: ordered, boxes: units.boxes, byScreen: units.byScreen };
}

function sourceFeedEntry(index) {
  const e = sourceFeeds.list[index] || {};
  return {
    name: (typeof e.name === 'string' && e.name.trim()) ? e.name : SOURCE_FEED_DEFAULT_NAME,
    // No distance of its own: the project default, in metres the nearest whole metre
    distance: (typeof e.distance === 'number' && e.distance >= 0) ? e.distance : cableDefaultFt(sourceFeeds.defaultDistance),
    sameAs: (typeof e.sameAs === 'number') ? e.sameAs : null
  };
}

function setSourceFeedField(index, field, value) {
  if(!sourceFeeds.list[index]) sourceFeeds.list[index] = {};
  sourceFeeds.list[index][field] = value;
}

// The feed that actually carries a processor's signal: its own, or the one it shares.
// A pointer to a processor that no longer exists, or a loop, counts as its own feed.
function resolveSourceFeedIndex(index, procCount) {
  const seen = new Set();
  let i = index;
  while(!seen.has(i)) {
    seen.add(i);
    const next = sourceFeedEntry(i).sameAs;
    if(next === null || next < 0 || next >= procCount) return i;
    i = next;
  }
  return index;
}

// Feed indices a screen's data lines reach. A screen with no data plan yet still has a
// source, so it falls back to the first feed.
function screenSourceFeedIndices(screenId, units) {
  const reach = units.byScreen.get(screenId);
  const out = [];
  units.procs.forEach((u, i) => { if(reach && reach.procUnitIds.has(u.unitId)) out.push(i); });
  return out.length ? out : [0];
}

// The feed a single screen's cable diagram and the Cable tab show: its first processor's.
function screenSourceFeed(screenId) {
  const units = sourceFeedUnits();
  const index = resolveSourceFeedIndex(screenSourceFeedIndices(screenId, units)[0], units.procs.length);
  return Object.assign({ index: index }, sourceFeedEntry(index));
}

// Equipment box label: upper-case, split onto two lines at the space nearest the middle
// so a name like "MEDIA SERVER" fits the box.
function sourceFeedBoxLabel(name) {
  const words = String(name).toUpperCase().split(/\s+/).filter(Boolean);
  if(words.length < 2) return words.join('');
  let best = 1, bestDiff = Infinity;
  for(let i = 1; i < words.length; i++) {
    const diff = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if(diff < bestDiff) { bestDiff = diff; best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}

// The Cable tab edits the screen it is showing: the gear tab's active screen, otherwise
// the current one — same target the cabling input listeners use.
function sourceFeedCableTabScreenId() {
  return (typeof currentAppMode !== 'undefined' && currentAppMode === 'gear' && gearActiveScreenId && screens[gearActiveScreenId])
    ? gearActiveScreenId : currentScreenId;
}

function saveSourceFeedFromCableTab() {
  const index = screenSourceFeed(sourceFeedCableTabScreenId()).index;
  const nameEl = document.getElementById('sourceFeedName');
  const distEl = document.getElementById('serverToProcessor');
  if(nameEl) setSourceFeedField(index, 'name', nameEl.value.trim());
  if(distEl) setSourceFeedField(index, 'distance', readCableInput(distEl, sourceFeeds.defaultDistance, sourceFeedEntry(index).distance));
}

function loadSourceFeedIntoCableTab(screenId) {
  if(!screens[screenId]) return;
  const feed = screenSourceFeed(screenId);
  const nameEl = document.getElementById('sourceFeedName');
  const distEl = document.getElementById('serverToProcessor');
  if(nameEl) nameEl.value = feed.name === SOURCE_FEED_DEFAULT_NAME ? '' : feed.name;
  if(distEl) distEl.value = cableInputValue(feed.distance, sourceFeeds.defaultDistance);
  // A multi-screen project sets its feeds per processor in the Combined view — and the
  // cable unit, whose Cable tab toggle locks the same way
  if(typeof updateCableUnitControls === 'function') updateCableUnitControls();
  const locked = Object.keys(screens).length > 1;
  [nameEl, distEl].forEach(el => { if(el) el.disabled = locked; });
  const hint = document.getElementById('sourceFeedLockHint');
  if(hint) hint.style.display = locked ? '' : 'none';
  updateCableTabSourceFeeds(screenId);
}

// A one-screen project has no reason to open the Combined view, so when its screen needs
// more than one processor the Cable tab shows every feed itself: one row per feed, and
// the Combined cable diagram. Multi-screen projects set feeds in the Combined view.
function cableTabShowsAllFeeds(screenId) {
  if(Object.keys(screens).length !== 1 || !screens[screenId]) return false;
  const reach = sourceFeedUnits().byScreen.get(screenId);
  return !!reach && reach.procUnitIds.size > 1;
}

// Swap the Cable tab's single Source fields for one row per feed, or back
function updateCableTabSourceFeeds(screenId) {
  const list = document.getElementById('cableTabSourceFeeds');
  if(!list) return;
  const showAll = cableTabShowsAllFeeds(screenId);
  list.style.display = showAll ? '' : 'none';
  ['sourceFeedName', 'serverToProcessor'].forEach(id => {
    const label = document.getElementById(id)?.closest('label');
    if(label) label.style.display = showAll ? 'none' : '';
  });
  if(showAll) renderSourceFeedRows([screenId], list);
}

// A screen whose data needs more than one main processor: ask once whether its extra
// processors take the same source signal as its first one. The one answer covers every
// extra processor not yet asked about, and is saved on their feeds (asked, plus sameAs
// for "same"), so the screen is never asked again — a screen needing five processors
// asks once, not four times. The alert modal is shared, so never open over another
// dialog — a later calculate() asks instead.
function checkSourceFeedOverflow() {
  if(isLoadingScreenData || isWelcomePageVisible) return;
  const modal = document.getElementById('customAlertModal');
  if(!modal || modal.classList.contains('active')) return;
  const units = sourceFeedUnits();
  for(const screenId of getScreenIdsInOrder()) {
    // A split screen's processors each take a different canvas — a different output of
    // the source — so there is nothing to ask; each keeps its own feed
    if(screens[screenId].data.split) continue;
    const reach = units.byScreen.get(screenId);
    if(!reach || reach.procUnitIds.size < 2) continue;
    const indices = screenSourceFeedIndices(screenId, units);
    const extras = indices.slice(1).filter(i => !(sourceFeeds.list[i] && sourceFeeds.list[i].asked));
    if(!extras.length) continue;
    const first = indices[0];
    const labels = [first].concat(extras).map(i => units.procs[i].label);
    const named = labels.length === 2 ? labels.join(' and ')
      : labels.slice(0, -1).join(', ') + ' and ' + labels[labels.length - 1];
    const question = labels.length === 2 ? 'Do both processors get the same source signal?'
      : 'Do all ' + labels.length + ' processors get the same source signal?';
    showConfirm('"' + screens[screenId].name + '" needs more than one processor (' + named + '). ' + question,
      'Source Signal', 'Same Signal', 'Different Signals')
      .then(same => {
        extras.forEach(i => {
          setSourceFeedField(i, 'asked', true);
          if(same) setSourceFeedField(i, 'sameAs', first);
        });
        calculate();
      });
    return;
  }
}

function getSourceFeedsForSave() {
  return { defaultDistance: sourceFeeds.defaultDistance, list: sourceFeeds.list.map(e => e || {}) };
}

// Restore feeds from a project file (untrusted input). Files from before per-processor
// feeds carried a server distance on every screen and the gear list used the longest,
// so that becomes every feed's starting distance.
function loadProjectSourceFeeds(saved) {
  if(saved && typeof saved === 'object' && !Array.isArray(saved) && Array.isArray(saved.list)) {
    sourceFeeds = {
      defaultDistance: (typeof saved.defaultDistance === 'number' && saved.defaultDistance >= 0) ? saved.defaultDistance : 50,
      list: saved.list.slice(0, 64).map(e => {
        const out = {};
        if(!e || typeof e !== 'object') return out;
        if(typeof e.name === 'string') out.name = e.name.slice(0, 24);
        if(typeof e.distance === 'number' && e.distance >= 0) out.distance = e.distance;
        if(Number.isInteger(e.sameAs) && e.sameAs >= 0) out.sameAs = e.sameAs;
        if(e.asked === true) out.asked = true;
        return out;
      })
    };
    return;
  }
  const old = Object.keys(screens)
    .map(id => screens[id].data ? (screens[id].data.serverToProcessor ?? screens[id].data.fohToProcessor) : null)
    .filter(v => typeof v === 'number' && v >= 0);
  sourceFeeds = { defaultDistance: old.length ? Math.max.apply(null, old) : 50, list: [] };
}

// Rows in the combined Cabling panel, one per feed: the selection's feeds, or every feed
// in the project when nothing is selected. Rebuilt only when the set of feeds changes,
// so typing in a row never loses focus to a re-render. The Cable tab passes its own list.
function renderSourceFeedRows(selectedScreenIds, listEl) {
  const list = listEl || document.getElementById('combinedSourceFeeds');
  if(!list) return;
  const units = sourceFeedUnits();
  let indices = [];
  (selectedScreenIds || []).forEach(id => {
    screenSourceFeedIndices(id, units).forEach(i => { if(!indices.includes(i)) indices.push(i); });
  });
  if(!indices.length) indices = units.procs.length ? units.procs.map((u, i) => i) : [0];
  indices.sort((a, b) => a - b);

  const sig = JSON.stringify([indices, units.procs.map(u => u.label)]);
  if(list.dataset.sig !== sig) {
    list.dataset.sig = sig;
    list.replaceChildren();
    indices.forEach(i => list.appendChild(buildSourceFeedRow(i, units)));
  }

  list.querySelectorAll('[data-feed]').forEach(el => {
    if(el === document.activeElement) return;
    const feed = sourceFeedEntry(parseInt(el.dataset.feed, 10));
    if(el.dataset.field === 'name') el.value = feed.name === SOURCE_FEED_DEFAULT_NAME ? '' : feed.name;
    else if(el.dataset.field === 'distance') el.value = cableInputValue(feed.distance, sourceFeeds.defaultDistance);
    else el.value = feed.sameAs === null ? '' : String(feed.sameAs);
  });
}

function buildSourceFeedRow(index, units) {
  const row = document.createElement('div');
  row.className = 'source-feed-row';

  const addField = (labelText, control, field) => {
    control.dataset.feed = String(index);
    control.dataset.field = field;
    control.addEventListener('input', onSourceFeedRowInput);
    const label = document.createElement('label');
    const span = document.createElement('span');
    span.textContent = labelText;
    label.append(span, control);
    row.appendChild(label);
    return span;
  };

  const name = document.createElement('input');
  name.type = 'text';
  name.maxLength = 24;
  name.placeholder = SOURCE_FEED_DEFAULT_NAME;
  const nameLabel = addField('Source', name, 'name');
  // The processor this feed drives, beside the Source label
  if(units.procs[index]) {
    const tag = document.createElement('span');
    tag.className = 'source-feed-proc';
    tag.textContent = units.procs[index].label;
    nameLabel.appendChild(tag);
  }

  const dist = document.createElement('input');
  dist.type = 'number';
  dist.min = '0';
  dist.step = '0.1';
  dist.placeholder = cableDefaultDisplay(sourceFeeds.defaultDistance);
  addField('Source to Proc Distance', dist, 'distance');

  if(units.procs.length > 1) {
    const sel = document.createElement('select');
    sel.add(new Option('Own Feed', ''));
    units.procs.forEach((u, i) => { if(i !== index) sel.add(new Option(u.label, String(i))); });
    addField('Source Signal', sel, 'sameAs');
  }
  return row;
}

function onSourceFeedRowInput(e) {
  const el = e.target;
  const index = parseInt(el.dataset.feed, 10);
  if(el.dataset.field === 'name') setSourceFeedField(index, 'name', el.value.trim());
  else if(el.dataset.field === 'distance') setSourceFeedField(index, 'distance', readCableInput(el, sourceFeeds.defaultDistance, sourceFeedEntry(index).distance));
  else setSourceFeedField(index, 'sameAs', el.value === '' ? null : parseInt(el.value, 10));
  // The Cable tab shows one screen's feed, which may be the one just edited
  loadSourceFeedIntoCableTab(sourceFeedCableTabScreenId());
  // A feed only changes the cable diagram and the gear lists. Redrawing the whole combined
  // view rebuilds every canvas above this panel and throws the page's scroll position.
  if(combinedSelectedScreens.size > 0) {
    const selectedScreenIds = combinedSelectedScreenIdsInOrder();
    renderCombinedCableDiagram(selectedScreenIds, combinedScreenDimensions);
    renderCombinedGearList(selectedScreenIds);
  }
  if(typeof generateGearList === 'function') generateGearList();
}

// ---- Processor Dist Box Support Check ----
function processorSupportsDistBox(processorId, mx40Mode) {
  // resolveProcessorTopology() reads getAllProcessors(), so custom processors are
  // matched here too — the previous lookup only saw the built-in table.
  return resolveProcessorTopology(processorId, mx40Mode).usesDistBox;
}

// ---- Color Constants (let for eco/greyscale reassignment) ----
let CC_POWER_COLOR = '#FF6B35';
let CC_DATA_COLOR = '#00CED1';
let CC_BACKUP_COLOR = '#FF69B4';
let CC_DISTBOX_COLOR = '#FFD700';
let CC_TRUNK_COLOR = '#FFD700';
let CC_TRUNK_BACKUP_COLOR = '#FFFFFF';
let CC_PICK_COLOR = '#7CFC00';
let CC_SERVER_COLOR = '#AB47BC';
let CC_PROC_COLOR = '#4ECDC4';
let CC_BG_COLOR = '#1a1a1a';
let CC_FLOOR_COLOR = '#555555';
let CC_PANEL_COLOR = '#555555';
let CC_DELETED_COLOR = '#333333';
let CC_PANEL_FILL = '#2a2a2a';

// ---- BFS Grid Pathfinding (knockout avoidance) ----

function findNearestNonDeleted(col, row, pw, ph, deletedPanels) {
  if (!deletedPanels.has(col + ',' + row)) return { col: col, row: row };
  var visited = new Set();
  var queue = [{ col: col, row: row }];
  visited.add(col + ',' + row);
  var dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  while (queue.length > 0) {
    var cur = queue.shift();
    for (var d = 0; d < dirs.length; d++) {
      var nc = cur.col + dirs[d][0];
      var nr = cur.row + dirs[d][1];
      if (nc < 0 || nc >= pw || nr < 0 || nr >= ph) continue;
      var key = nc + ',' + nr;
      if (visited.has(key)) continue;
      visited.add(key);
      if (!deletedPanels.has(key)) return { col: nc, row: nr };
      queue.push({ col: nc, row: nr });
    }
  }
  return { col: col, row: row };
}

function findCableGridPath(startCol, startRow, endCol, endRow, pw, ph, deletedPanels) {
  if (startCol === endCol && startRow === endRow) return [{ col: startCol, row: startRow }];
  if (!deletedPanels || deletedPanels.size === 0) return null;

  var visited = new Set();
  var parent = {};
  var queue = [{ col: startCol, row: startRow }];
  var startKey = startCol + ',' + startRow;
  visited.add(startKey);
  parent[startKey] = null;
  var dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  var found = false;
  var endKey = endCol + ',' + endRow;

  while (queue.length > 0) {
    var cur = queue.shift();
    if (cur.col === endCol && cur.row === endRow) { found = true; break; }
    for (var d = 0; d < dirs.length; d++) {
      var nc = cur.col + dirs[d][0];
      var nr = cur.row + dirs[d][1];
      if (nc < 0 || nc >= pw || nr < 0 || nr >= ph) continue;
      var key = nc + ',' + nr;
      if (visited.has(key)) continue;
      if (deletedPanels.has(key) && key !== endKey) continue;
      visited.add(key);
      parent[key] = cur.col + ',' + cur.row;
      queue.push({ col: nc, row: nr });
    }
  }

  if (!found) return null;

  var fullPath = [];
  var k = endKey;
  while (k !== null) {
    var parts = k.split(',');
    fullPath.unshift({ col: parseInt(parts[0]), row: parseInt(parts[1]) });
    k = parent[k];
  }

  if (fullPath.length <= 2) return fullPath;

  var simplified = [fullPath[0]];
  for (var i = 1; i < fullPath.length - 1; i++) {
    var prev = fullPath[i - 1];
    var curr = fullPath[i];
    var next = fullPath[i + 1];
    if ((curr.col - prev.col) !== (next.col - curr.col) || (curr.row - prev.row) !== (next.row - curr.row)) {
      simplified.push(curr);
    }
  }
  simplified.push(fullPath[fullPath.length - 1]);
  return simplified;
}

// ---- Combined Cabling Calculation ----

function calculateCombinedCabling(selectedScreenIds, config) {
  const allPanels = typeof getAllPanels === 'function' ? getAllPanels() : (typeof panels !== 'undefined' ? panels : {});
  const allProcessors = typeof getAllProcessors === 'function' ? getAllProcessors() : (typeof processors !== 'undefined' ? processors : {});
  const pr = allProcessors[config.processor];
  if (!pr) return null;

  const M_TO_FT = 3.28084;
  const screenResults = [];
  let totalPixels = 0;
  let totalDataLines = 0;

  for (const screenId of selectedScreenIds) {
    const screen = screens[screenId];
    if (!screen || !screen.data) continue;

    const data = screen.data;
    const panelType = data.panelType;
    const p = allPanels[panelType];
    if (!p) continue;

    const pw = data.panelsWide || 0;
    const ph = data.panelsHigh || 0;
    if (pw === 0 || ph === 0) continue;

    const panelWidthFt = p.width_m * M_TO_FT;
    const panelHeightFt = p.height_m * M_TO_FT;
    let wallHeightFt = ph * panelHeightFt;
    let wallWidthFt = pw * panelWidthFt;

    const halfRows = getCB5HalfRows(data, panelType);
    const halfRowCount = halfRows.top + halfRows.bottom;
    const hasCB5HalfRow = halfRowCount > 0;
    if (hasCB5HalfRow) {
      const halfP = allPanels['CB5_MKII_HALF'];
      if (halfP) wallHeightFt += halfRowCount * halfP.height_m * M_TO_FT;
    }

    const effectivePh = ph + halfRowCount;
    const pixelsPerPanel = p.res_x * p.res_y;
    const deletedPanelsSet = data.deletedPanels || new Set();

    // Count active panels (full and half)
    const _live = countCB5LivePanels(pw, ph, halfRows, deletedPanelsSet);
    const activePanelCount = _live.full + _live.half;

    const screenPixels = activePanelCount * pixelsPerPanel;
    totalPixels += screenPixels;

    // Data lines for this screen — resolved from THIS screen's own processor, frame rate,
    // bit depth and Max Panels Per Data override, via the same shared helper the combined
    // data canvas and the Complex canvas use (core/calculate.js). Deriving it from the
    // combined-level config instead is what let the cable runs disagree with the data
    // lines actually drawn on the canvas.
    const panelsPerDataLine = resolvePanelsPerDataLine({
      panel: p,
      halfPanel: allPanels['CB5_MKII_HALF'],
      processor: allProcessors[data.processor],
      frameRate: parseInt(data.frameRate) || 60,
      bitDepth: parseInt(data.bitDepth) || 8,
      fullPanels: _live.full,
      halfPanels: _live.half,
      userMax: parseInt(data.maxPanelsPerData)
    });
    const dataLines = typeof calculateActualDataLines === 'function'
      ? calculateActualDataLines(pw, effectivePh, panelsPerDataLine, data.dataStartDir || 'top', deletedPanelsSet, data.customDataLineAssignments, data.split)
      : Math.ceil((pw * effectivePh) / panelsPerDataLine);

    totalDataLines += dataLines;

    // Entry/exit points
    const entryPoints = typeof getDataLineEntryPoints === 'function'
      ? getDataLineEntryPoints(pw, effectivePh, panelsPerDataLine, data.dataStartDir || 'top', deletedPanelsSet, data.customDataLineAssignments, data.split)
      : {};

    // Exit points (last panel per data line — for backup/redundancy cables)
    let exitPoints = {};
    if (typeof getDataLinePanelOrdering === 'function') {
      const ordering = getDataLinePanelOrdering(pw, effectivePh, panelsPerDataLine, data.dataStartDir || 'top', deletedPanelsSet, data.customDataLineAssignments, data.split);
      for (const dlIndex of Object.keys(ordering)) {
        const panelList = ordering[dlIndex];
        if (panelList.length > 0) exitPoints[dlIndex] = panelList[panelList.length - 1];
      }
    }

    // Power circuits for this screen. Voltage/breaker stay the combined view's own (one
    // distro feeds every wall), but Max/Avg and the Max Panels Per Circuit override are
    // per-screen — the override is the user's quick way to re-circuit a wall without
    // assigning every panel by hand, so it has to apply here too. Mirrors the combined
    // canvas (nav/combined.js) so the cable runs match the circuits it draws.
    const powerType = data.powerType || 'max';
    const perPanelW = powerType === 'avg' ? (p.power_avg_w || p.power_max_w * 0.5) : p.power_max_w;
    const derate = data.derate ? 0.8 : 1.0;
    const circuitCapacityW = config.voltage * config.breaker * derate;
    const calculatedPanelsPerCircuit = Math.max(1, Math.floor(circuitCapacityW / perPanelW));
    const userMaxPanelsPerCircuit = parseInt(data.maxPanelsPerCircuit);
    const panelsPerCircuit = userMaxPanelsPerCircuit > 0 ? userMaxPanelsPerCircuit : calculatedPanelsPerCircuit;
    const columnsPerCircuit = Math.max(1, Math.floor(panelsPerCircuit / ph));
    const circuitsNeeded = Math.ceil(pw / columnsPerCircuit);
    const socaCount = Math.ceil(circuitsNeeded / 6);

    // SOCA column spans from the screen's as-assigned per-panel grouping, so a manual
    // Assign SOCA # routes here the same way it does on the power canvas. Circuiting still
    // uses this view's own combined config (voltage/breaker/powerType), not per-screen power.
    let socaSpans = null;
    if (typeof assignCircuits === 'function' && typeof assignSocas === 'function' && typeof computeSocaSpans === 'function') {
      const toMap = v => v instanceof Map ? v : new Map(Array.isArray(v) ? v : []);
      // Circuits over the full rows only; they start below any half rows on top, so the
      // keys go in relative to the first full row and come back out in grid rows.
      const _top = halfRows.top;
      const panelToCircuit = shiftCB5RowKeys(assignCircuits(pw, ph, panelsPerCircuit,
        shiftCB5RowKeys(deletedPanelsSet, -_top), shiftCB5RowKeys(toMap(data.customCircuitAssignments), -_top)).panelToCircuit, _top);
      const panelToSoca = assignSocas(panelToCircuit, toMap(data.customSocaAssignments));
      socaSpans = computeSocaSpans(panelToCircuit, panelToSoca);
      const labelMap = (typeof sharedDistroSocaLabelMap === 'function') ? sharedDistroSocaLabelMap(screenId) : null;
      socaSpans.forEach(sp => { sp.labelIdx = (labelMap && labelMap.has(sp.socaIdx)) ? labelMap.get(sp.socaIdx) : sp.socaIdx; });
    }

    screenResults.push({
      screenId,
      screenName: screen.name || screenId,
      screenColor: screen.color || '#888',
      panelType, pw, ph, effectivePh, hasCB5HalfRow,
      panelWidthFt, panelHeightFt,
      wallWidthFt: Math.round(wallWidthFt * 10) / 10,
      wallHeightFt: Math.round(wallHeightFt * 10) / 10,
      activePanelCount, screenPixels,
      dataLines, entryPoints, exitPoints, panelsPerDataLine,
      circuitsNeeded, socaCount, columnsPerCircuit, socaSpans,
      deletedPanelsSet
    });
  }

  if (screenResults.length === 0) return null;

  // Aggregated processor/distribution calculation
  const redundancyMultiplier = config.redundancy ? 2 : 1;
  const portsNeeded = totalDataLines;
  const portsNeededFinal = portsNeeded * redundancyMultiplier;

  let processorCount = 1;
  let distributionBoxCount = 0;
  let distributionBoxName = '';

  // Box name/count from the processor spec (specs/processor-topology.js).
  const topology = resolveProcessorTopology(config.processor, config.mx40ConnectionMode);
  const boxCounts = computeProcessorAndBoxCounts({
    topology: topology,
    mainPorts: portsNeeded,
    totalPixels: totalPixels,
    hasRedundancy: !!config.redundancy,
    screenCount: 1
  });
  distributionBoxCount = boxCounts.distBoxCount;
  distributionBoxName = boxCounts.distBoxName;

  // Processor count here mirrors the per-screen path in core/calculate.js and stays
  // pixel-driven; only the distribution-box resolution above was unified.
  if (config.processor === 'Brompton_SX40' && portsNeeded > 0) {
    processorCount = Math.ceil(totalPixels / pr.total_pixels);
  } else if (config.processor === 'NovaStar_MX40_Pro' && portsNeeded > 0) {
    if (config.mx40ConnectionMode === 'direct') {
      processorCount = Math.max(Math.ceil(portsNeededFinal / 20), Math.ceil(totalPixels / 9000000));
    } else {
      processorCount = Math.max(Math.ceil(totalPixels / 9000000), Math.ceil(distributionBoxCount / 4));
    }
  } else {
    processorCount = Math.max(1, Math.ceil(totalPixels / (pr.total_pixels || 9000000)));
  }

  return {
    screens: screenResults,
    shared: {
      processorCount, distributionBoxCount, distributionBoxName,
      totalDataLines, totalPixels, portsNeeded, portsNeededFinal
    },
    config
  };
}

// ---- Main Renderer ----

// `target` ({ canvasId, containerId }) draws into another canvas instead — the Cable tab's,
// for a one-screen project that needs more than one processor. That tab keeps its own
// Source rows, so the Combined panel's are left alone.
function renderCombinedCableDiagram(selectedScreenIds, screenDimensions, target) {
  if (!target) renderSourceFeedRows(selectedScreenIds);

  // Eco/greyscale print mode support — reassign module-level colors
  var isPrintMode = ecoPrintMode || greyscalePrintMode || pdfWhiteBgMode;
  function ccPrintColor(hex) {
    if (greyscalePrintMode && typeof toGreyscale === 'function') return toGreyscale(hex);
    if (ecoPrintMode && typeof toPastelColor === 'function') return toPastelColor(hex);
    return hex;
  }
  CC_POWER_COLOR = ccPrintColor('#FF6B35');
  CC_DATA_COLOR = ccPrintColor('#00CED1');
  CC_BACKUP_COLOR = ccPrintColor('#FF69B4');
  CC_DISTBOX_COLOR = ccPrintColor('#FFD700');
  CC_TRUNK_COLOR = ccPrintColor('#FFD700');
  CC_TRUNK_BACKUP_COLOR = isPrintMode ? '#333333' : '#FFFFFF';
  CC_PICK_COLOR = ccPrintColor('#7CFC00');
  CC_SERVER_COLOR = ccPrintColor('#AB47BC');
  CC_PROC_COLOR = ccPrintColor('#4ECDC4');
  CC_BG_COLOR = isPrintMode ? '#ffffff' : '#1a1a1a';
  CC_FLOOR_COLOR = isPrintMode ? '#cccccc' : '#555555';
  CC_PANEL_COLOR = isPrintMode ? '#000000' : '#555555';
  CC_DELETED_COLOR = isPrintMode ? '#dddddd' : '#333333';
  CC_PANEL_FILL = isPrintMode ? '#f5f5f5' : '#2a2a2a';
  var ccFgColor = isPrintMode ? '#000000' : '#ffffff';
  var ccDimColor = isPrintMode ? '#000000' : '#999999';
  var ccLegendTextColor = isPrintMode ? '#000000' : '#cccccc';
  var ccSummaryColor = isPrintMode ? '#000000' : '#888888';

  const canvas = document.getElementById(target ? target.canvasId : 'combinedCableDiagramCanvas');
  const container = document.getElementById(target ? target.containerId : 'combinedCableDiagramCanvasWrapper');
  if (!canvas || !container) return;

  // Empty state — matches other combined canvases (100x100, no CSS stretch)
  if (!selectedScreenIds || selectedScreenIds.length === 0 || !screenDimensions || screenDimensions.length === 0) {
    container.classList.remove('has-diagram');
    canvas.width = 100;
    canvas.height = 100;
    canvas.style.width = '';
    canvas.style.height = '';
    var c = canvas.getContext('2d');
    c.fillStyle = CC_BG_COLOR;
    c.fillRect(0, 0, 100, 100);
    c.fillStyle = '#888';
    c.font = '10px Arial';
    c.textAlign = 'center';
    c.fillText('No screens', 50, 45);
    c.fillText('selected', 50, 58);
    return;
  }

  container.classList.add('has-diagram');

  const cfg = deriveCombinedCablingConfig(selectedScreenIds);
  const calcData = calculateCombinedCabling(selectedScreenIds, cfg);
  if (!calcData || calcData.screens.length === 0) return;

  const allPanels = typeof getAllPanels === 'function' ? getAllPanels() : {};
  const M_TO_FT = 3.28084;
  // Derive redundancy from any selected screen's setting (no separate combined toggle)
  var redundancy = cfg.redundancy;
  if (!redundancy) {
    for (var si = 0; si < selectedScreenIds.length; si++) {
      var scr = screens[selectedScreenIds[si]];
      if (scr && scr.data && scr.data.redundancy) { redundancy = true; break; }
    }
  }
  // Placement is per screen now; these are only used for the rig-wide dimension labels.
  const xdScreenDistances = selectedScreenIds.map(function(id) {
    const scr = screens[id];
    return (scr && scr.data && scr.data.xdToWall != null) ? scr.data.xdToWall : 40;
  });
  const minXdToWall = xdScreenDistances.length ? Math.min.apply(null, xdScreenDistances) : 40;
  const dropPos = cfg.cableDropPosition;

  // ---- Recover panelSize and compute feet-to-pixel conversion ----
  const firstDim = screenDimensions[0];
  const panelSize = firstDim.width / firstDim.pw;
  const firstPanel = allPanels[firstDim.data.panelType || 'CB5_MKII'];
  const panelWidthFt = firstPanel ? firstPanel.width_m * M_TO_FT : 1.64;
  const ftToPx = panelSize / panelWidthFt; // pixels per foot (in panelSize units)

  // ---- Build screen positions matching standard layout ----
  const screenPos = [];
  screenDimensions.forEach(function(dim) {
    var customPos = (typeof combinedScreenPositions !== 'undefined' ? combinedScreenPositions[dim.screenId] : null) || { x: 0, y: 0 };
    var calcScreen = calcData.screens.find(function(s) { return s.screenId === dim.screenId; });
    if (!calcScreen) return;

    screenPos.push({
      x: dim.x + customPos.x,
      y: customPos.y,
      width: dim.width,
      height: dim.height,
      pw: dim.pw,
      ph: dim.ph,
      data: dim.data,
      screen: dim.screen,
      screenId: dim.screenId,
      calc: calcScreen
    });
  });

  if (screenPos.length === 0) return;

  // ---- Bounding box of ALL screens (the "unified wall") ----
  var bbL = Infinity, bbR = -Infinity, bbT = Infinity, bbB = -Infinity;
  screenPos.forEach(function(sp) {
    bbL = Math.min(bbL, sp.x);
    bbR = Math.max(bbR, sp.x + sp.width);
    bbT = Math.min(bbT, sp.y);
    bbB = Math.max(bbB, sp.y + sp.height);
  });
  var bbW = bbR - bbL;
  var bbH = bbB - bbT;

  // ---- Canvas Sizing ----
  var containerWidth = container.clientWidth || 400;
  var canvasW = containerWidth;
  var isSmall = canvasW < 500;
  var isPdf = (typeof pdfWhiteBgMode !== 'undefined' && pdfWhiteBgMode);
  var rightMarginExtra = (dropPos === 'sl') ? 15 : 0;
  var MARGIN = { top: isSmall ? 30 : 50, bottom: isSmall ? 25 : 40, left: isSmall ? 14 : 20, right: (isSmall ? 25 : 30) + rightMarginExtra };
  var BOX_W = isPdf ? (isSmall ? 52 : 64) : (isSmall ? 38 : 48);
  var BOX_H = isPdf ? (isSmall ? 28 : 34) : (isSmall ? 18 : 24);

  // ---- Scene layout in feet (matching per-screen cable diagram pattern) ----
  var wallWidthFt = bbW / ftToPx;
  var wallHeightFt = bbH / ftToPx;

  // Every physical unit the selection's data lines land on. Numbering is already pooled
  // globally by buildDataPortPlan, so two screens on the same processor share one box here.
  var dataUnits = (typeof projectDataUnits === 'function') ? projectDataUnits() : { procs: [], boxes: [], byScreen: new Map() };
  var selectedIdSet = new Set(selectedScreenIds);
  var reachedProcIds = new Set();
  var reachedBoxIds = new Set();
  var remoteBoxIds = new Set();
  selectedScreenIds.forEach(function(id) {
    var reach = dataUnits.byScreen.get(id);
    if (!reach) return;
    var place = screenCablingValues(id).xdPlacement;
    reach.procUnitIds.forEach(function(u) { reachedProcIds.add(u); });
    reach.boxUnitIds.forEach(function(u) {
      reachedBoxIds.add(u);
      // Only a REMOTE box gets its own box on the floor; 'proc' keeps it at the
      // processor and 'wall' draws it on the screen itself.
      if (place === 'remote') remoteBoxIds.add(u);
    });
  });
  var floorProcs = dataUnits.procs.filter(function(u) { return reachedProcIds.has(u.unitId); });
  var floorBoxes = dataUnits.boxes.filter(function(u) { return remoteBoxIds.has(u.unitId); });
  if (!floorProcs.length) floorProcs = [{ unitId: '__proc__', label: 'PROC' }];
  var distroCount = 1; // Phase 1: one distro for the whole rig, as today
  var floorBoxCount = distroCount + floorProcs.length + floorBoxes.length;

  // Floor equipment sits in a FIXED lane left of the wall, in the order distro(s),
  // processor(s), then the XD boxes nearest the wall. The distances are schematic:
  // changing one only updates its dimension label, it never moves a box. The lane is
  // sized in feet so it scales with the scene, and grows with the number of units so
  // more boxes get more room rather than being squeezed together.

  var totalVertFt = wallHeightFt + cfg.wallToFloor + 3;

  // Right padding in feet — extra room for an SL drop/pick on any screen
  var anySlPick = selectedScreenIds.some(function(id) {
    var c = screenCablingValues(id);
    return c.cableDropPosition === 'sl';
  });
  var rightPadFt = 4;
  if (anySlPick) rightPadFt += (cfg.cablePick > 0 ? 3 : 1);

  // Floor equipment needs a real gap between boxes to stay readable. Spacing is generous
  // when there are few units and tightens gracefully as the count grows, but never below
  // a readable gap. The lane is sized in pixels, independent of scale.
  var drawableW = canvasW - MARGIN.left - MARGIN.right;
  // Two rows once the lane gets busy: XD boxes on a shelf, distro + processors on the
  // floor. The lane then only has to be as wide as the BIGGER row, which keeps a large
  // rig on screen instead of scrolling sideways.
  var floorRowCount = 1 + floorProcs.length;          // distro + processors
  var shelfRowCount = floorBoxes.length;              // XD boxes
  // The proc→XD trunks live in the gap between the shelf and the floor row, so the gap
  // has to be tall enough to hold one line per box on the busiest processor.
  var trunksPerProc = {};
  floorBoxes.forEach(function(u) { trunksPerProc[u.procUnitId] = (trunksPerProc[u.procUnitId] || 0) + 1; });
  var maxTrunksPerProc = 0;
  Object.keys(trunksPerProc).forEach(function(k) { if (trunksPerProc[k] > maxTrunksPerProc) maxTrunksPerProc = trunksPerProc[k]; });
  var TRUNK_STEP = isSmall ? 4 : 5;
  var SHELF_GAP = (isSmall ? 8 : 12) + maxTrunksPerProc * TRUNK_STEP;
  var useShelf = shelfRowCount > 0 && (floorRowCount + shelfRowCount) > 6;
  var laneUnits = useShelf ? (Math.max(shelfRowCount, floorRowCount + 0.5) + 1)
                           : (floorBoxCount + 1);

  var idealSlot = BOX_W + (isSmall ? 22 : 52);
  var minSlot = BOX_W + (isSmall ? 8 : 12);
  var laneBudget = Math.max(drawableW * 0.40, minSlot * 3);
  var equipSlotPx = Math.min(idealSlot, Math.max(minSlot, laneBudget / laneUnits));
  var equipLaneW = equipSlotPx * laneUnits;

  // The screens must keep at least this share of the width, so a rig with a lot of floor
  // units widens the canvas (the wrapper scrolls) rather than squashing the walls.
  var WALL_SHARE = 0.55;
  var neededDrawableW = (BOX_W + equipLaneW) / (1 - WALL_SHARE);
  if (drawableW < neededDrawableW) {
    drawableW = neededDrawableW;
    canvasW = drawableW + MARGIN.left + MARGIN.right;
  }

  // The wall takes whatever the lane leaves
  var scale = Math.min((drawableW - BOX_W - equipLaneW) / (wallWidthFt + rightPadFt), 80);
  var wallWidthPx = wallWidthFt * scale;

  // Pick vertical space (only for "behind" position)
  var PICK_GAP = isSmall ? 30 : 45;
  var PICK_RADIUS = 12;
  // Any screen with a behind-pick needs headroom above the wall
  var anyBehindPick = selectedScreenIds.some(function(id) {
    var c = screenCablingValues(id);
    return c.cablePick > 0 && c.cableDropPosition === 'behind';
  });
  var pickVertSpace = anyBehindPick ? PICK_GAP + PICK_RADIUS * 2 + 10 : 0;

  // Below-floor band: every screen's converging runs get their own row, then the
  // dimension lines sit under them. Sized from the screen count so a big rig gets a
  // taller drawing rather than a pile of overlapping cables on one line.
  var FLOOR_ROW_STEP = isSmall ? 11 : 16;
  var FLOOR_BAND_TOP = 10;
  var floorBandPx = FLOOR_BAND_TOP + selectedScreenIds.length * FLOOR_ROW_STEP;
  var dimRowsPx = ((floorBoxes.length ? 3 : 2) * 15) + 12;
  var belowFloorPx = floorBandPx + dimRowsPx;
  var dpr = window.devicePixelRatio || 1;
  var legendExtra = isSmall ? 20 : 0;
  // A stretched wall-to-floor gap (shelf headroom) adds height the feet-based figure
  // does not know about
  var shelfExtraPx = useShelf ? Math.max(0, (2 * BOX_H + SHELF_GAP + 24) - cfg.wallToFloor * scale) : 0;
  var canvasH = MARGIN.top + totalVertFt * scale + pickVertSpace + belowFloorPx + MARGIN.bottom + legendExtra + shelfExtraPx;

  canvas.width = canvasW * dpr;
  canvas.height = canvasH * dpr;
  canvas.style.width = canvasW + 'px';
  canvas.style.height = canvasH + 'px';

  var ctx = canvas.getContext('2d');
  ctx.save();
  ctx.scale(dpr, dpr);

  // Background
  ctx.fillStyle = CC_BG_COLOR;
  ctx.fillRect(0, 0, canvasW, canvasH);

  // ---- Wall positioning: the wall sits to the right of the equipment lane ----
  var sceneWidthPx = BOX_W + equipLaneW + wallWidthPx + rightPadFt * scale;
  var sceneOffsetX = MARGIN.left + Math.max(0, (drawableW - sceneWidthPx) / 2);
  var wallLeftX = sceneOffsetX + BOX_W + equipLaneW;
  var wallRightX = wallLeftX + wallWidthFt * scale;
  var wallTopY = MARGIN.top + pickVertSpace;
  var wallBottomY = wallTopY + wallHeightFt * scale;
  // The shelf lives between the wall and the floor, so guarantee it room. These
  // positions are schematic anyway — the wall-to-floor figure is a label, not a
  // measured span — so stretching the gap costs nothing but readability gained.
  var minFloorGapPx = useShelf ? (2 * BOX_H + SHELF_GAP + 24) : 0;
  var floorY = wallBottomY + Math.max(cfg.wallToFloor * scale, minFloorGapPx);

  // Convert panelSize-pixel coords to canvas coords
  var pxToCanvas = scale / ftToPx;
  var toX = function(px) { return wallLeftX + (px - bbL) * pxToCanvas; };
  var toY = function(py) { return wallTopY + (py - bbT) * pxToCanvas; };

  // ---- Per-screen geometry: each screen drops its own cables ----
  // Cables come down the back or the side of the screen they serve and only converge on
  // the floor, so every screen gets its own drop point and pick from its OWN Cable tab
  // settings — exactly what that screen shows in its own cable diagram.
  var SIDE_DROP_PAD = 20;
  screenPos.forEach(function(sp, i) {
    sp.cab = screenCablingValues(sp.screenId);
    sp.left = toX(sp.x);
    sp.right = toX(sp.x + sp.width);
    sp.top = toY(sp.y);
    sp.bottom = toY(sp.y + sp.height);
    sp.order = i;

    if (sp.cab.cableDropPosition === 'sr') sp.dropX = sp.left - SIDE_DROP_PAD;
    else if (sp.cab.cableDropPosition === 'sl') sp.dropX = sp.right + SIDE_DROP_PAD;
    else sp.dropX = (sp.left + sp.right) / 2;

    if (sp.cab.cablePick > 0) {
      if (sp.cab.cableDropPosition === 'behind') {
        sp.pickCX = sp.dropX;
        sp.pickCY = sp.top - PICK_GAP - PICK_RADIUS;
      } else if (sp.cab.cableDropPosition === 'sr') {
        sp.pickCX = sp.left - PICK_GAP - PICK_RADIUS;
        sp.pickCY = sp.top + PICK_RADIUS;
      } else {
        sp.pickCX = sp.right + PICK_GAP + PICK_RADIUS;
        sp.pickCY = sp.top + PICK_RADIUS;
      }
    }
  });

  // Fallback drop for the few rig-wide bits (pick dimension, legend anchoring)
  var dropX = screenPos[0].dropX;

  // ---- Draw Floor Line ----
  ctx.strokeStyle = CC_FLOOR_COLOR;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(MARGIN.left, floorY);
  ctx.lineTo(canvasW - MARGIN.right, floorY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = ccDimColor;
  ctx.font = (isPdf ? 15 : 9) + 'px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('FLOOR', MARGIN.left + 4, floorY + 12);

  // ---- Draw Panel Grids (matching standard layout positions) ----
  screenPos.forEach(function(sp) {
    var screenLeft = toX(sp.x);
    var screenTop = toY(sp.y);
    var screenW = sp.width * pxToCanvas;
    var screenH = sp.height * pxToCanvas;

    var panelType = sp.data.panelType || 'CB5_MKII';
    var heightRatio = typeof getPanelHeightRatio === 'function' ? getPanelHeightRatio(panelType) : 1;
    // sp.ph is the full rows only; CB5 half rows sit above and/or below them
    var rowGeo = cb5RowGeometry(sp.ph, getCB5HalfRows(sp.data, panelType),
      panelSize * heightRatio * pxToCanvas, panelSize * pxToCanvas);

    var pxW = panelSize * pxToCanvas;
    var pxH = panelSize * heightRatio * pxToCanvas;
    var halfPxH = rowGeo.halfH;

    var deletedPanels = sp.calc.deletedPanelsSet || new Set();

    // Draw full panels
    for (var c = 0; c < sp.pw; c++) {
      for (var r = rowGeo.top; r < rowGeo.top + sp.ph; r++) {
        var x = screenLeft + c * pxW;
        var y = screenTop + rowGeo.y(r);
        var key = c + ',' + r;
        var isDeleted = deletedPanels.has(key);

        if (isDeleted) {
          ctx.strokeStyle = CC_DELETED_COLOR;
          ctx.lineWidth = 0.5;
          ctx.setLineDash([2, 2]);
          ctx.strokeRect(x, y, pxW, pxH);
          ctx.setLineDash([]);
        } else {
          ctx.fillStyle = CC_PANEL_FILL;
          ctx.fillRect(x, y, pxW, pxH);
          ctx.strokeStyle = CC_PANEL_COLOR;
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, pxW, pxH);
        }
      }
    }

    // CB5 half rows
    for (var hr = 0; hr < rowGeo.rows; hr++) {
      if (!rowGeo.isHalf(hr)) continue;
      for (var c2 = 0; c2 < sp.pw; c2++) {
        var hx = screenLeft + c2 * pxW;
        var hy = screenTop + rowGeo.y(hr);
        ctx.fillStyle = CC_PANEL_FILL;
        ctx.fillRect(hx, hy, pxW, halfPxH);
        ctx.strokeStyle = CC_PANEL_COLOR;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(hx, hy, pxW, halfPxH);
      }
    }

    // Screen border
    var screenColor = sp.screen.color || '#888';
    ctx.strokeStyle = screenColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(screenLeft, screenTop, screenW, screenH);

    // Screen label (name only, no per-screen dimensions)
    ctx.fillStyle = isPrintMode ? ccFgColor : screenColor;
    ctx.font = 'bold ' + (isPdf ? (isSmall ? '15' : '17') : (isSmall ? '9' : '11')) + 'px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(sp.screen.name || sp.screenId, screenLeft + screenW / 2, screenTop - 14);
  });

  // ---- Equipment on Floor (ONE set for unified wall) ----
  // Equipment positions use feet-based scale (matching per-screen diagram)
  // FIXED lane, left to right: distro, proc, XD. The XD (when remote) sits closest to
  // the wall; without it the processor does. Distances only change their labels.
  // equipSlotPx / equipLaneW were sized with the canvas up top so the boxes always get a
  // readable gap; the lane is simply laid out here.
  var equipY = floorY - BOX_H; // boxes sit ON TOP of floor line
  var dataEndY = equipY + BOX_H;

  // The lane is TWO rows: XD boxes on a shelf, distro + processors on the floor below.
  // Stacking keeps a big rig from running off the side, and vertical room is the cheap
  // dimension here. The shelf is offset by half a slot so a cable rising to a shelf box
  // always passes between two floor boxes rather than through one.
  var shelfY = useShelf ? (equipY - BOX_H - SHELF_GAP) : equipY;
  var unitX = {};
  var unitY = {};   // the Y a cable terminating on this unit should rise/drop to
  var laneSlots = [];

  var shelfCursorX = wallLeftX - equipSlotPx;
  floorBoxes.slice().reverse().forEach(function(u) {
    unitX[u.unitId] = shelfCursorX;
    unitY[u.unitId] = useShelf ? (shelfY + BOX_H) : (equipY + BOX_H);
    // With more than one processor a bare "XD A" is ambiguous — box indices restart per
    // processor, so the label carries the processor too, stacked onto its own line.
    laneSlots.push({ x: shelfCursorX, y: useShelf ? shelfY : equipY,
                     label: (floorProcs.length > 1 && u.labelLines) ? u.labelLines : u.label,
                     color: CC_DISTBOX_COLOR, kind: 'box', unit: u });
    shelfCursorX -= equipSlotPx;
  });

  var floorCursorX = wallLeftX - equipSlotPx * (useShelf ? 1.5 : 1);
  if (!useShelf) floorCursorX = shelfCursorX;
  floorProcs.slice().reverse().forEach(function(u) {
    unitX[u.unitId] = floorCursorX;
    unitY[u.unitId] = equipY + BOX_H;
    laneSlots.push({ x: floorCursorX, y: equipY, label: u.label, color: CC_PROC_COLOR, kind: 'proc', unit: u });
    floorCursorX -= equipSlotPx;
  });
  var distroCanvasX = floorCursorX;
  laneSlots.push({ x: distroCanvasX, y: equipY, label: isSmall ? 'DIST' : 'DISTRO',
                   color: CC_POWER_COLOR, kind: 'distro' });

  // Representative processor X, used by the server cable and any single-unit fallback
  var procCanvasX = floorProcs.length ? unitX[floorProcs[0].unitId] : (wallLeftX - equipSlotPx);
  var distroEquipY = equipY;
  var dataEndYFor = function(x) {
    // Match a terminating X back to its unit so the run stops at the right row
    var hit = null;
    Object.keys(unitX).forEach(function(k) { if (Math.abs(unitX[k] - x) < 0.5) hit = k; });
    return hit && unitY[hit] !== undefined ? unitY[hit] : (equipY + BOX_H);
  };

  // Where one screen's data run terminates: its remote XD box if it has one on the
  // floor, otherwise the processor that feeds it.
  function screenDataTargets(screenId) {
    var reach = dataUnits.byScreen.get(screenId);
    var place = screenCablingValues(screenId).xdPlacement;
    var out = [];
    if (reach && place === 'remote') {
      reach.boxUnitIds.forEach(function(u) { if (unitX[u] !== undefined) out.push(unitX[u]); });
    }
    if (!out.length && reach) {
      reach.procUnitIds.forEach(function(u) { if (unitX[u] !== undefined) out.push(unitX[u]); });
    }
    if (!out.length) out.push(procCanvasX);
    out.sort(function(a, b) { return a - b; });
    return out;
  }

  // Source feeds: one box per feed carrying its own signal, in processor order, side by
  // side from the far left, vertically centered between wall top and floor. A processor
  // sharing another feed's signal gets a branch off that feed's run instead of a box.
  var sourceBoxY = (wallTopY + floorY) / 2 - BOX_H / 2;
  var sourceBoxGap = isSmall ? 6 : 10;
  var feedUnits = sourceFeedUnits();
  var feedBoxes = [];
  var feedByIndex = {};
  floorProcs.forEach(function(u) {
    var procIdx = feedUnits.procs.findIndex(function(p) { return p.unitId === u.unitId; });
    var own = resolveSourceFeedIndex(procIdx < 0 ? 0 : procIdx, feedUnits.procs.length);
    if (!feedByIndex[own]) {
      feedByIndex[own] = { feed: sourceFeedEntry(own), procXs: [] };
      feedBoxes.push(feedByIndex[own]);
    }
    feedByIndex[own].procXs.push(unitX[u.unitId] !== undefined ? unitX[u.unitId] : procCanvasX);
  });
  feedBoxes.forEach(function(fb, i) { fb.x = MARGIN.left + i * (BOX_W + sourceBoxGap); });

  // Use abbreviated labels on mobile
  var distLabel = isSmall ? 'DIST' : 'DISTRO';
  var procLabel = 'PROC';

  // Remote XD trunks: each floor XD box is fed by the processor that owns it. Length is
  // a label, not a measured span. The backup box sits beside the main one, so redundancy
  // only adds a second run.
  // Runs from one processor to several boxes would sit on top of each other, so each
  // trunk is lifted onto its own line above the boxes and drops into its target.
  var trunkSeq = {};
  floorBoxes.forEach(function(u) {
    var boxX = unitX[u.unitId];
    var srcX = (unitX[u.procUnitId] !== undefined) ? unitX[u.procUnitId] : procCanvasX;
    if (boxX === undefined) return;
    var seq = (trunkSeq[u.procUnitId] = (trunkSeq[u.procUnitId] || 0) + 1);
    // On a shelf the run rises out of the processor, crosses just under the shelf and
    // drops into the box; on a single row it arcs over the boxes as before.
    var boxBottomY = unitY[u.unitId] !== undefined ? unitY[u.unitId] : (equipY + BOX_H);
    var trunkMidY = useShelf
      ? (shelfY + BOX_H + 4 + seq * TRUNK_STEP)
      : (equipY - 6 - seq * (isSmall ? 5 : 7));
    var drawTrunkRun = function(nudge) {
      ctx.beginPath();
      ctx.moveTo(srcX, equipY);
      ctx.lineTo(srcX, trunkMidY + nudge);
      ctx.lineTo(boxX, trunkMidY + nudge);
      ctx.lineTo(boxX, useShelf ? boxBottomY : equipY);
      ctx.stroke();
    };
    ctx.setLineDash([]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = CC_TRUNK_COLOR;
    drawTrunkRun(redundancy ? -2 : 0);
    if (redundancy) {
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = CC_TRUNK_BACKUP_COLOR;
      drawTrunkRun(2);
      ctx.setLineDash([]);
    }

    // Every trunk off a processor is the same length, so label the first one only —
    // repeating it under each box just produced a pile of overlapping numbers.
    if (seq > 1) return;
    var trunkLabelText = cableLabel(cfg.xdToProcessor);
    var trunkLabelX = boxX;
    var trunkLabelY = trunkMidY - (redundancy ? 2 : 0);
    var trunkFontSize = isPdf ? 18 : (isSmall ? 8 : 10);
    ctx.font = 'bold ' + trunkFontSize + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    var trunkTw = ctx.measureText(trunkLabelText).width + 6;
    var trunkTh = trunkFontSize + 6;
    ctx.fillStyle = CC_BG_COLOR;
    ctx.fillRect(trunkLabelX - trunkTw / 2, trunkLabelY - trunkTh / 2, trunkTw, trunkTh);
    ctx.fillStyle = isPrintMode ? ccFgColor : CC_TRUNK_COLOR;
    ctx.fillText(trunkLabelText, trunkLabelX, trunkLabelY);
    ctx.textBaseline = 'alphabetic';
  });

  // Every unit in the lane, plus the source feeds
  if (typeof drawCableEquipmentBox === 'function') {
    laneSlots.forEach(function(slot) {
      drawCableEquipmentBox(ctx, slot.x - BOX_W / 2, slot.y, BOX_W, BOX_H, slot.label, slot.color);
    });
    feedBoxes.forEach(function(fb) {
      drawCableEquipmentBox(ctx, fb.x, sourceBoxY, BOX_W, BOX_H, sourceFeedBoxLabel(fb.feed.name), CC_SERVER_COLOR);
    });
  }

  // Source-to-processor cables. Each runs OVER the floor lane on its own line rather than
  // straight through the distro box, then drops into its processor's top edge — the same
  // treatment the proc→XD trunks get, one line clear of the topmost trunk. Later feeds
  // ride higher, so a run never crosses the drop of the feed to its left.
  // With a shelf the trunks already fill the shelf-to-floor gap, so the runs go over the
  // top of the shelf; on a single row they clear the topmost trunk instead.
  var baseRunY;
  if (useShelf) {
    baseRunY = shelfY - (isSmall ? 5 : 7);
  } else {
    var maxTrunkSeq = 0;
    Object.keys(trunkSeq).forEach(function(k) { if (trunkSeq[k] > maxTrunkSeq) maxTrunkSeq = trunkSeq[k]; });
    baseRunY = equipY - 6 - (maxTrunkSeq + 1) * (isSmall ? 5 : 7) - (isSmall ? 3 : 5);
  }
  feedBoxes.forEach(function(fb, i) {
    if (!(fb.feed.distance > 0)) return;
    // Never ride up into the screens
    var runY = Math.max(baseRunY - i * (isSmall ? 5 : 7), wallBottomY + 4);
    var dropX = fb.x + BOX_W / 2;

    ctx.strokeStyle = CC_SERVER_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(dropX, sourceBoxY + BOX_H);
    ctx.lineTo(dropX, runY);
    ctx.lineTo(fb.procXs[0], runY);
    ctx.lineTo(fb.procXs[0], equipY);
    ctx.stroke();
    // Processors sharing this feed's signal branch off the same run
    fb.procXs.slice(1).forEach(function(px) {
      ctx.beginPath();
      ctx.moveTo(dropX, runY);
      ctx.lineTo(px, runY);
      ctx.lineTo(px, equipY);
      ctx.stroke();
    });

    // Distance label on the vertical segment
    var srvLabelText = cableLabel(fb.feed.distance);
    var srvLabelX = dropX + 4;
    var srvLabelMidY = (sourceBoxY + BOX_H + runY) / 2;
    ctx.font = 'bold ' + (isPdf ? (isSmall ? 13 : 16) : (isSmall ? 7 : 10)) + 'px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    var srvTw = ctx.measureText(srvLabelText).width + 6;
    ctx.fillStyle = CC_BG_COLOR;
    ctx.fillRect(srvLabelX, srvLabelMidY - 7, srvTw, 14);
    ctx.fillStyle = isPrintMode ? ccFgColor : CC_SERVER_COLOR;
    ctx.fillText(srvLabelText, srvLabelX + 2, srvLabelMidY);
    ctx.textBaseline = 'alphabetic';
  });

  // Cable picks are per screen — set on each screenPos above, drawn after the cables.

  // ---- Cable Offset Constants (matching per-screen diagram separation) ----
  var POWER_DROP_OFFSET = -3;      // power cables offset left of drop X
  var DATA_OFFSET = 6;             // primary data offset right of drop X
  var BACKUP_OFFSET = 16;          // backup data offset further right
  var DATA_WALL_OFFSET = 10;       // data runs 10px outside wall edge for visual separation
  // Every screen's converging runs get their OWN row in the band below the floor, so a
  // seven-screen rig reads as seven separate runs instead of one thick smear. Within a
  // row, power / data / backup are nudged apart.
  function screenFloorRow(order) { return floorY + FLOOR_BAND_TOP + order * FLOOR_ROW_STEP; }
  var ROW_POWER = 0;
  var ROW_DATA = FLOOR_ROW_STEP * 0.32;
  var ROW_BACKUP = FLOOR_ROW_STEP * 0.64;

  // ---- Unified Power (SOCA) Cable Routing ----
  // All circuits from all screens route to ONE drop → floor → distro
  screenPos.forEach(function(sp) {
    var calc = sp.calc;
    if (!calc) return;

    var screenLeft = toX(sp.x);
    var screenTop = toY(sp.y);
    var screenBottom = toY(sp.y + sp.height);
    var pxW = panelSize * pxToCanvas;
    var powerHeightRatio = typeof getPanelHeightRatio === 'function'
      ? getPanelHeightRatio(sp.data.panelType || 'CB5_MKII') : 1;
    var pxRowH = panelSize * powerHeightRatio * pxToCanvas;

    // One cable per SOCA. Spans come from the screen's as-assigned grouping when available
    // (calc.socaSpans), falling back to the geometric soca s = circuits s*6..s*6+5.
    // The row span rides along so a hand-assigned SOCA that breaks off part way down the
    // wall feeds from its own row instead of the screen's top/bottom edge.
    var socaRuns = (Array.isArray(calc.socaSpans) && calc.socaSpans.length)
      ? calc.socaSpans.map(function(span) {
          return {
            firstCol: Math.max(0, Math.min(span.firstCol, calc.pw - 1)),
            lastCol: Math.max(0, Math.min(span.lastCol, calc.pw - 1)),
            firstRow: (typeof span.firstRow === 'number') ? Math.max(0, Math.min(span.firstRow, calc.effectivePh - 1)) : null,
            lastRow: (typeof span.lastRow === 'number') ? Math.max(0, Math.min(span.lastRow, calc.effectivePh - 1)) : null,
            colRows: Array.isArray(span.colRows) ? span.colRows : null
          };
        })
      : Array.from({ length: calc.socaCount }, function(_unused, si) {
          var firstCircuit = si * 6;
          var lastCircuit = Math.min(firstCircuit + 5, calc.circuitsNeeded - 1);
          return {
            firstCol: firstCircuit * calc.columnsPerCircuit,
            lastCol: Math.min((lastCircuit + 1) * calc.columnsPerCircuit - 1, calc.pw - 1),
            firstRow: null, lastRow: null, colRows: null
          };
        });

    for (var si = 0; si < socaRuns.length; si++) {
      var run = socaRuns[si];
      var firstCol = run.firstCol;
      var lastCol = run.lastCol;
      var landingCenterX = screenLeft + ((firstCol + lastCol + 1) / 2) * pxW;

      // Snap the feed point off any deleted panel it lands on, staying within
      // this SOCA's own column span (mirrors the data-cable edge-row search)
      var dp = calc.deletedPanelsSet || new Set();
      var fromBottom = sp.cab.powerInPosition === 'bottom';
      var wallEdgeRow = fromBottom ? (calc.effectivePh - 1) : 0;
      // This SOCA's own boundary row in a given column. Spans saved before rows were
      // tracked have none, so they fall back to the screen edge exactly as before.
      var socaRowInCol = function(col) {
        if (run.colRows) {
          for (var ci = 0; ci < run.colRows.length; ci++) {
            if (run.colRows[ci].col === col) {
              var rr = fromBottom ? run.colRows[ci].lastRow : run.colRows[ci].firstRow;
              return Math.max(0, Math.min(rr, calc.effectivePh - 1));
            }
          }
        }
        var overall = fromBottom ? run.lastRow : run.firstRow;
        return (typeof overall === 'number') ? overall : wallEdgeRow;
      };
      var colUnder = Math.min(lastCol, Math.floor((firstCol + lastCol + 1) / 2));
      if (colUnder < firstCol) colUnder = firstCol;
      var landingCol = colUnder;
      var edgeRow = socaRowInCol(colUnder);
      if (dp.size > 0 && dp.has(colUnder + ',' + edgeRow)) {
        var foundInSpan = false;
        for (var pdist = 1; pdist <= lastCol - firstCol; pdist++) {
          if (colUnder - pdist >= firstCol && !dp.has((colUnder - pdist) + ',' + socaRowInCol(colUnder - pdist))) {
            landingCol = colUnder - pdist; edgeRow = socaRowInCol(landingCol);
            landingCenterX = screenLeft + (landingCol + 0.5) * pxW; foundInSpan = true; break;
          }
          if (colUnder + pdist <= lastCol && !dp.has((colUnder + pdist) + ',' + socaRowInCol(colUnder + pdist))) {
            landingCol = colUnder + pdist; edgeRow = socaRowInCol(landingCol);
            landingCenterX = screenLeft + (landingCol + 0.5) * pxW; foundInSpan = true; break;
          }
        }
        if (!foundInSpan && typeof findNearestNonDeleted === 'function') {
          var nn = findNearestNonDeleted(colUnder, edgeRow, calc.pw, calc.effectivePh, dp);
          landingCol = nn.col; edgeRow = nn.row;
          landingCenterX = screenLeft + (landingCol + 0.5) * pxW;
        }
      }
      // A SOCA on the screen's own edge row leaves straight off that edge as before; one
      // that starts inboard picks up at its own row and climbs its column to the edge.
      var powerInboard = edgeRow !== wallEdgeRow;
      if (powerInboard) landingCenterX = screenLeft + (landingCol + 0.5) * pxW;

      // Each screen's SOCAs come down THAT screen's own drop, then run along the floor
      // to the distro. A small per-screen lane offset keeps converging runs readable.
      var spDropX = sp.dropX;
      var spPowerFloorY = screenFloorRow(sp.order) + ROW_POWER;
      ctx.strokeStyle = CC_POWER_COLOR;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();

      var powerEdgeY = fromBottom ? screenBottom + 14 : screenTop - 14;
      var powerStartY = powerInboard
        ? (screenTop + (edgeRow + 0.5) * pxRowH)
        : (fromBottom ? screenBottom : screenTop);
      ctx.moveTo(landingCenterX + POWER_DROP_OFFSET, powerStartY);
      ctx.lineTo(landingCenterX + POWER_DROP_OFFSET, powerEdgeY);
      ctx.lineTo(spDropX + POWER_DROP_OFFSET, powerEdgeY);
      if (sp.cab.cablePick > 0 && sp.pickCX !== undefined) {
        ctx.lineTo(sp.pickCX + POWER_DROP_OFFSET, sp.pickCY);
        ctx.lineTo(sp.pickCX + POWER_DROP_OFFSET, spPowerFloorY);
      } else {
        ctx.lineTo(spDropX + POWER_DROP_OFFSET, spPowerFloorY);
      }
      ctx.lineTo(distroCanvasX, spPowerFloorY);
      ctx.lineTo(distroCanvasX, distroEquipY + BOX_H);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  });

  // ---- Per-screen Data Cable Routing ----
  // Each screen's data lines come down THAT screen's own drop and then run along the floor
  // to the specific processor or XD box those lines are assigned to. buildDataPortPlan()
  // already resolved that mapping globally, so two screens sharing a unit converge on one
  // box here rather than each getting their own.
  var hasDistBox = calcData.shared.distributionBoxCount > 0;

  // Canvas-space bounding box, still needed for the wall-edge lanes and dimension lines
  var bbCanvasL = toX(bbL);
  var bbCanvasR = toX(bbR);
  var bbCanvasT = toY(bbT);
  var bbCanvasB = toY(bbB);
  var bbCanvasW = bbCanvasR - bbCanvasL;

  // Where one data line terminates on the floor. Backups land on their own loop-back
  // box on a paired_boxes processor, so they get their own target.
  function lineTargetX(screenId, lineNum, place, useBackup) {
    try {
      var plan = cachedDataPortPlan();
      var lineMap = plan.perScreen.get(screenId);
      var dest = lineMap && lineMap.get(lineNum);
      if (!dest) return procCanvasX;
      var group = plan.groups.get(dest.groupKey);
      var box = useBackup && dest.backup ? dest.backup.box : dest.box;
      if (place === 'remote' && group && group.usesDistBox && box !== null && box !== undefined) {
        var boxUnitId = dest.groupKey + '|' + dest.proc + '|' + box;
        if (unitX[boxUnitId] !== undefined) return unitX[boxUnitId];
      }
      var procUnitId = dest.groupKey + '|' + dest.proc + '|-';
      if (unitX[procUnitId] !== undefined) return unitX[procUnitId];
    } catch (err) { /* fall through */ }
    return procCanvasX;
  }

  screenPos.forEach(function(sp) {
    var calc = sp.calc;
    if (!calc) return;

    var place = sp.cab.xdPlacement;
    var panelType = sp.data.panelType || 'CB5_MKII';
    var heightRatio = typeof getPanelHeightRatio === 'function' ? getPanelHeightRatio(panelType) : 1;
    var pxW = panelSize * pxToCanvas;
    var pxH = panelSize * heightRatio * pxToCanvas;
    var dp = calc.deletedPanelsSet || new Set();
    var rowGeo = cb5RowGeometry(calc.ph, getCB5HalfRows(sp.data, panelType), pxH, panelSize * pxToCanvas);
    var rowMidY = function(r) { return sp.top + cableRowFracOff(rowGeo, r, 0.5); };

    var dataFlip = sp.data.dataFlip || false;
    var entryPts = dataFlip ? (calc.exitPoints || {}) : (calc.entryPoints || {});
    var exitPts  = dataFlip ? (calc.entryPoints || {}) : (calc.exitPoints || {});

    // Per-screen floor lane so converging runs stay individually readable
    var spRow = screenFloorRow(sp.order);
    var spDataFloorY = spRow + ROW_DATA;
    var spBackupFloorY = spRow + ROW_BACKUP;

    // Collect this screen's points, tagged with where each line terminates
    var mains = [], backups = [];
    for (var dl of dataLineIndexes(entryPts)) {
      var e = entryPts[dl];
      if (e) mains.push({ col: e.col, row: e.row, targetX: lineTargetX(sp.screenId, dl + 1, place, false),
                          cx: sp.left + (e.col + 0.5) * pxW, cy: rowMidY(e.row) });
      var x = exitPts[dl];
      if (x) backups.push({ col: x.col, row: x.row, targetX: lineTargetX(sp.screenId, dl + 1, place, true),
                            cx: sp.left + (x.col + 0.5) * pxW, cy: rowMidY(x.row) });
    }
    if (!mains.length) return;

    // ---- ON WALL: each processor's box sits on the stretch of wall its lines cover ----
    // A screen on one processor has one stretch, the whole wall. With redundancy, a
    // Backup position different from Main gives the backups their own box and trunk.
    if (place === 'wall' && hasDistBox) {
      var mainHoriz = sp.data.distBoxMainHorizPosition || sp.data.distBoxHorizPosition || 'center';
      var mainVert = sp.data.distBoxMainVertPosition || 'top';
      var backupHoriz = sp.data.distBoxBackupHorizPosition || sp.data.distBoxHorizPosition || 'center';
      var backupVert = sp.data.distBoxBackupVertPosition || 'top';
      var twoBoxes = redundancy && (mainHoriz !== backupHoriz || mainVert !== backupVert);

      var wallGroups = [];
      var wallGroupByTarget = {};
      var addToWallGroup = function(ep, key) {
        var g = wallGroupByTarget[ep.targetX];
        if (!g) {
          g = wallGroupByTarget[ep.targetX] = { targetX: ep.targetX, mains: [], backups: [], minCol: ep.col, maxCol: ep.col };
          wallGroups.push(g);
        }
        g[key].push(ep);
        g.minCol = Math.min(g.minCol, ep.col);
        g.maxCol = Math.max(g.maxCol, ep.col);
      };
      mains.forEach(function(ep) { addToWallGroup(ep, 'mains'); });
      backups.forEach(function(ep) { addToWallGroup(ep, 'backups'); });

      wallGroups.forEach(function(g, gi) {
        var procUnit = dataUnits.procs.find(function(u) { return unitX[u.unitId] === g.targetX; });
        var procTag = (wallGroups.length > 1 && procUnit) ? procUnit.label : null;
        var boxW = twoBoxes || procTag ? 48 : 40;
        var boxH = procTag ? 26 : 18;
        var regionL = sp.left + g.minCol * pxW;
        var regionR = sp.left + (g.maxCol + 1) * pxW;
        // Panel-quantised, matching the per-screen diagram and the gear-list length math
        var boxCenterX = function(horiz) {
          var x = (horiz === 'sr') ? regionL + 2 * pxW
                : (horiz === 'sl') ? regionR - 2 * pxW
                : (regionL + regionR) / 2;
          return Math.max(regionL + boxW / 2, Math.min(regionR - boxW / 2, x));
        };
        var boxTopY = function(vert) { return vert === 'bottom' ? sp.bottom - boxH - 6 : sp.top + 6; };
        var mainX = boxCenterX(mainHoriz), mainY = boxTopY(mainVert);
        var backupX = twoBoxes ? boxCenterX(backupHoriz) : mainX;
        var backupY = twoBoxes ? boxTopY(backupVert) : mainY;
        var backupBoxVert = twoBoxes ? backupVert : mainVert;

        var drawWallFan = function(points, boxX, fanY, color, alpha, nudgeX) {
          points.forEach(function(ep) {
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.moveTo(ep.cx < boxX ? boxX - boxW / 2 : boxX + boxW / 2, fanY);
            ctx.lineTo(ep.cx + nudgeX, fanY);
            ctx.lineTo(ep.cx + nudgeX, ep.cy);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
          });
        };
        drawWallFan(g.mains, mainX, mainY + boxH / 2 - (redundancy && !twoBoxes ? 3 : 0), CC_DATA_COLOR, 0.5, -2);
        if (redundancy) {
          drawWallFan(g.backups, backupX, backupY + boxH / 2 + (twoBoxes ? 0 : 3), CC_BACKUP_COLOR, 0.4, 2);
        }

        // Trunk: box → this screen's top or bottom edge → own drop → floor → its processor.
        // A top run comes down through the pick; one from the bottom edge drops straight.
        var drawWallTrunk = function(boxX, boxY, vert, color, offsetX, floorY, endNudge) {
          var fromBottom = vert === 'bottom';
          var edgeY = fromBottom ? sp.bottom + 4 + gi * 3 : sp.top - 4 - gi * 3;
          var fy = floorY + gi * 3;
          var tx = g.targetX + endNudge;
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(boxX + offsetX, fromBottom ? boxY + boxH : boxY);
          ctx.lineTo(boxX + offsetX, edgeY);
          ctx.lineTo(sp.dropX + offsetX, edgeY);
          if (!fromBottom && sp.cab.cablePick > 0 && sp.pickCX !== undefined) {
            ctx.lineTo(sp.pickCX + offsetX, sp.pickCY);
            ctx.lineTo(sp.pickCX + offsetX, fy);
          } else {
            ctx.lineTo(sp.dropX + offsetX, fy);
          }
          ctx.lineTo(tx, fy);
          ctx.lineTo(tx, dataEndYFor(g.targetX));
          ctx.stroke();
        };
        drawWallTrunk(mainX, mainY, mainVert, CC_TRUNK_COLOR, DATA_OFFSET, spDataFloorY, 0);
        if (redundancy) {
          drawWallTrunk(backupX, backupY, backupBoxVert, CC_TRUNK_BACKUP_COLOR, BACKUP_OFFSET, spBackupFloorY, 8);
        }

        if (typeof drawCableEquipmentBox === 'function') {
          var boxLabel = function(name) { return procTag ? [procTag, name] : name; };
          drawCableEquipmentBox(ctx, mainX - boxW / 2, mainY, boxW, boxH, boxLabel(twoBoxes ? 'MAIN' : 'XD'), CC_DISTBOX_COLOR);
          if (twoBoxes) {
            drawCableEquipmentBox(ctx, backupX - boxW / 2, backupY, boxW, boxH, boxLabel('BACKUP'), CC_DISTBOX_COLOR);
          }
        }
      });
      return;
    }

    // ---- AT PROC / REMOTE: fan to this screen's own drop, then run to each target ----
    // Fan segments: entry panel → this screen's own top/bottom edge → its own drop
    function drawFan(points, color, width, alpha, offsetX) {
      points.forEach(function(ep) {
        var isBottom = ep.row >= calc.effectivePh / 2;
        var wallEdgeY = isBottom ? sp.bottom + DATA_WALL_OFFSET : sp.top - DATA_WALL_OFFSET;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.globalAlpha = alpha;
        ctx.beginPath();

        var targetRow = isBottom ? calc.effectivePh - 1 : 0;
        var targetCol = ep.col;
        if (dp.size > 0 && dp.has(targetCol + ',' + targetRow)) {
          var found = false;
          for (var d = 1; d < calc.pw; d++) {
            if (targetCol - d >= 0 && !dp.has((targetCol - d) + ',' + targetRow)) { targetCol -= d; found = true; break; }
            if (targetCol + d < calc.pw && !dp.has((targetCol + d) + ',' + targetRow)) { targetCol += d; found = true; break; }
          }
          if (!found && typeof findNearestNonDeleted === 'function') {
            var nn = findNearestNonDeleted(targetCol, targetRow, calc.pw, calc.effectivePh, dp);
            targetCol = nn.col; targetRow = nn.row;
          }
        }
        if (dp.size > 0 && typeof findCableGridPath === 'function') {
          var path = findCableGridPath(ep.col, ep.row, targetCol, targetRow, calc.pw, calc.effectivePh, dp);
          if (path && path.length) {
            ctx.moveTo(ep.cx + offsetX * 0.2, ep.cy);
            path.forEach(function(node) {
              ctx.lineTo(sp.left + (node.col + 0.5) * pxW + offsetX * 0.2, rowMidY(node.row));
            });
            ctx.lineTo(sp.left + (targetCol + 0.5) * pxW + offsetX * 0.2, wallEdgeY);
          } else {
            ctx.moveTo(ep.cx + offsetX * 0.2, ep.cy);
            ctx.lineTo(ep.cx + offsetX * 0.2, wallEdgeY);
          }
        } else {
          ctx.moveTo(ep.cx + offsetX * 0.2, ep.cy);
          ctx.lineTo(ep.cx + offsetX * 0.2, wallEdgeY);
        }
        ctx.lineTo(sp.dropX + offsetX, wallEdgeY);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      });
    }

    // Bundle: this screen's drop → pick → floor → each distinct target unit
    function drawBundles(points, color, width, offsetX, floorTargetY, extraX) {
      var byTarget = {};
      points.forEach(function(ep) { (byTarget[ep.targetX] = byTarget[ep.targetX] || []).push(ep); });
      Object.keys(byTarget).forEach(function(key, i) {
        var tx = parseFloat(key) + extraX;
        var hasTop = byTarget[key].some(function(ep) { return ep.row < calc.effectivePh / 2; });
        var startY = hasTop ? sp.top - DATA_WALL_OFFSET : sp.bottom + DATA_WALL_OFFSET;
        var fy = floorTargetY + i * 3;
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(sp.dropX + offsetX, startY);
        if (sp.cab.cablePick > 0 && sp.pickCX !== undefined) {
          ctx.lineTo(sp.pickCX + offsetX, sp.pickCY);
          ctx.lineTo(sp.pickCX + offsetX, fy);
        } else {
          ctx.lineTo(sp.dropX + offsetX, fy);
        }
        ctx.lineTo(tx, fy);
        ctx.lineTo(tx, dataEndYFor(parseFloat(key)));
        ctx.stroke();
      });
    }

    drawBundles(mains, CC_DATA_COLOR, 2.5, DATA_OFFSET, spDataFloorY, 0);
    drawFan(mains, CC_DATA_COLOR, 1.5, 0.6, DATA_OFFSET);
    if (redundancy && backups.length) {
      drawBundles(backups, CC_BACKUP_COLOR, 2, BACKUP_OFFSET, spBackupFloorY, 8);
      drawFan(backups, CC_BACKUP_COLOR, 1.2, 0.45, BACKUP_OFFSET);
    }
  });

  // ---- Draw each screen's cable pick ON TOP of its cables ----
  screenPos.forEach(function(sp) {
    if (!(sp.cab.cablePick > 0) || sp.pickCX === undefined) return;

    // Fill background to erase cable lines inside the circle
    ctx.fillStyle = CC_BG_COLOR;
    ctx.beginPath();
    ctx.arc(sp.pickCX, sp.pickCY, PICK_RADIUS + 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = CC_PICK_COLOR;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sp.pickCX, sp.pickCY, PICK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = isPrintMode ? ccFgColor : CC_PICK_COLOR;
    ctx.font = 'bold 9px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PICK', sp.pickCX, sp.pickCY);
    ctx.textBaseline = 'alphabetic';

    if (typeof drawCableDimensionLine === 'function') {
      var pos = sp.cab.cableDropPosition;
      if (pos === 'behind') {
        var pickDimX = sp.pickCX - (isSmall ? 15 : 25);
        drawCableDimensionLine(ctx, pickDimX, sp.pickCY - PICK_RADIUS, pickDimX, sp.top,
          cableLabel(sp.cab.cablePick), ccDimColor, CC_BG_COLOR);
      } else if (pos === 'sr') {
        var pickDimY = sp.pickCY - PICK_RADIUS - 14;
        drawCableDimensionLine(ctx, sp.pickCX - PICK_RADIUS, pickDimY, sp.left, pickDimY,
          cableLabel(sp.cab.cablePick), ccDimColor, CC_BG_COLOR);
      } else {
        var pickDimY2 = sp.pickCY - PICK_RADIUS - 14;
        drawCableDimensionLine(ctx, sp.right, pickDimY2, sp.pickCX + PICK_RADIUS, pickDimY2,
          cableLabel(sp.cab.cablePick), ccDimColor, CC_BG_COLOR);
      }
    }
  });

  // ---- Redraw screen labels + borders on top of cables ----
  screenPos.forEach(function(sp) {
    var screenLeft = toX(sp.x);
    var screenTop = toY(sp.y);
    var screenW = sp.width * pxToCanvas;
    var screenH = sp.height * pxToCanvas;
    var screenColor = sp.screen.color || '#888';

    // Screen border
    ctx.strokeStyle = screenColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(screenLeft, screenTop, screenW, screenH);

    // Screen label with background for readability
    var labelText = sp.screen.name || sp.screenId;
    ctx.font = 'bold ' + (isPdf ? (isSmall ? '15' : '17') : (isSmall ? '9' : '11')) + 'px Arial';
    ctx.textAlign = 'center';
    var labelW = ctx.measureText(labelText).width + 6;
    var labelH = isSmall ? 15 : 17;
    var labelX = screenLeft + screenW / 2;
    var labelY = screenTop - 14;
    ctx.fillStyle = CC_BG_COLOR;
    ctx.fillRect(labelX - labelW / 2, labelY - labelH, labelW, labelH + 2);
    ctx.fillStyle = isPrintMode ? ccFgColor : screenColor;
    ctx.fillText(labelText, labelX, labelY);
  });

  // ---- Dimension Lines ----
  if (typeof drawCableDimensionLine === 'function') {
    // Combined wall width — above bounding box (tighter on mobile to avoid label overlap)
    var totalWidthFt = bbW / ftToPx;
    var dimAboveWall = isSmall ? 16 : 32;
    drawCableDimensionLine(ctx, bbCanvasL, bbCanvasT - dimAboveWall, bbCanvasR, bbCanvasT - dimAboveWall,
      cableLabel(totalWidthFt), ccDimColor, CC_BG_COLOR);

    // Combined wall height — SL: left side to avoid drop/pick overlap; otherwise right side
    var totalHeightFt = bbH / ftToPx;
    if (dropPos === 'sl') {
      var dimOffL1 = isSmall ? 8 : 15;
      drawCableDimensionLine(ctx, bbCanvasL - dimOffL1, bbCanvasT, bbCanvasL - dimOffL1, bbCanvasB,
        cableLabel(totalHeightFt), ccDimColor, CC_BG_COLOR);
    } else {
      var dimOffR1 = isSmall ? 8 : 15;
      drawCableDimensionLine(ctx, bbCanvasR + dimOffR1, bbCanvasT, bbCanvasR + dimOffR1, bbCanvasB,
        cableLabel(totalHeightFt), ccDimColor, CC_BG_COLOR);
    }

    // Wall-to-floor — SL: left side; otherwise right side
    if (cfg.wallToFloor > 0) {
      if (dropPos === 'sl') {
        var dimOffL2 = isSmall ? 18 : 35;
        drawCableDimensionLine(ctx, bbCanvasL - dimOffL2, bbCanvasB, bbCanvasL - dimOffL2, floorY,
          cableLabel(cfg.wallToFloor), ccDimColor, CC_BG_COLOR);
      } else {
        var dimOffR2 = isSmall ? 18 : 35;
        drawCableDimensionLine(ctx, bbCanvasR + dimOffR2, bbCanvasB, bbCanvasR + dimOffR2, floorY,
          cableLabel(cfg.wallToFloor), ccDimColor, CC_BG_COLOR);
      }
    }

    // Distances to the drop — below floor, nested so the box nearest the wall reads
    // first. The lane is fixed, so these only ever change their label, never their
    // extent. Proc-to-XD is labelled on the run itself rather than measured here.
    // Measured from the nearest screen edge, since each screen now has its own drop.
    var dimAnchorX = bbCanvasL;
    // Sit under the per-screen floor rows rather than on top of them
    var dimRowY = floorY + floorBandPx + 10;
    if (floorBoxes.length) {
      drawCableDimensionLine(ctx, unitX[floorBoxes[0].unitId], dimRowY, dimAnchorX, dimRowY,
        cableLabel(minXdToWall), ccDimColor, CC_BG_COLOR);
      dimRowY += 15;
    }
    drawCableDimensionLine(ctx, procCanvasX, dimRowY, dimAnchorX, dimRowY,
      cableLabel(cfg.processorToWall), ccDimColor, CC_BG_COLOR);
    dimRowY += 15;
    drawCableDimensionLine(ctx, distroCanvasX, dimRowY, dimAnchorX, dimRowY,
      cableLabel(cfg.distroToWall), ccDimColor, CC_BG_COLOR);
  }

  // ---- Legend (wraps to multiple rows on small screens) ----
  var legendItems = [
    { color: CC_POWER_COLOR, label: 'Power' },
    { color: CC_DATA_COLOR, label: 'Data' },
    { color: CC_PROC_COLOR, label: 'Proc' },
    { color: CC_POWER_COLOR, label: 'Distro' },
    { color: CC_SERVER_COLOR, label: 'Source' }
  ];
  if (redundancy) legendItems.push({ color: CC_BACKUP_COLOR, label: 'Backup' });
  if (floorBoxes.length) {
    legendItems.push({ color: CC_DISTBOX_COLOR, label: 'Dist Box' });
    legendItems.push({ color: CC_TRUNK_COLOR, label: redundancy ? 'Main Trunk' : 'Trunk' });
    if (redundancy) legendItems.push({ color: CC_TRUNK_BACKUP_COLOR, label: 'Backup Trunk' });
  }
  if (cfg.cablePick > 0) legendItems.push({ color: CC_PICK_COLOR, label: 'Pick' });

  var legendFontSize = isPdf ? (isSmall ? 14 : 16) : (isSmall ? 8 : 9);
  var legendSpacing = isPdf ? (isSmall ? 26 : 38) : (isSmall ? 18 : 28);
  var legendSq = isPdf ? 14 : 8;
  var legendTx = isPdf ? 18 : 12;
  ctx.font = legendFontSize + 'px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  var legendX = MARGIN.left + 4;
  var legendY = isPdf ? canvasH - 24 : canvasH - 22;
  var legendMaxX = canvasW - MARGIN.right;

  for (var li = 0; li < legendItems.length; li++) {
    var item = legendItems[li];
    var itemW = ctx.measureText(item.label).width + legendTx + legendSpacing;
    // Wrap to next row if this item would overflow
    if (legendX + itemW > legendMaxX && legendX > MARGIN.left + 10) {
      legendX = MARGIN.left + 4;
      legendY += isPdf ? 18 : 14;
    }
    ctx.fillStyle = item.color;
    ctx.fillRect(legendX, legendY - legendSq / 2, legendSq, legendSq);
    ctx.fillStyle = ccLegendTextColor;
    ctx.fillText(item.label, legendX + legendTx, legendY);
    legendX += ctx.measureText(item.label).width + legendSpacing;
  }

  // ---- Summary Text ----
  ctx.fillStyle = ccSummaryColor;
  ctx.font = (isPdf ? (isSmall ? 14 : 16) : (isSmall ? 8 : 9)) + 'px Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  var shared = calcData.shared;
  // Processor and box counts from the gear list, which reads the data plan — the
  // pixel-only estimate in calculateCombinedCabling() misses a screen split across
  // processors
  var gearGroup = (typeof buildGearListData === 'function')
    ? buildGearListData(selectedScreenIds).processorGroups[cfg.processor] : null;
  var summaryProcCount = gearGroup ? gearGroup.processorCount : shared.processorCount;
  var summaryBoxCount = gearGroup ? gearGroup.distBoxCount : shared.distributionBoxCount;
  var summaryBoxName = (gearGroup && gearGroup.distBoxName) || shared.distributionBoxName;
  var summaryParts = [
    summaryProcCount + 'x ' + cfg.processor.replace(/_/g, ' '),
    shared.totalDataLines + ' data lines'
  ];
  if (summaryBoxCount > 0) {
    summaryParts.push(summaryBoxCount + 'x ' + summaryBoxName);
  }
  ctx.fillText(summaryParts.join('  |  '), MARGIN.left + 4, canvasH - 4);

  ctx.restore();
}
