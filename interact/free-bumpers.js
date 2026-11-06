// ==================== FREE-DRAW MANUAL BUMPERS ====================
// Editing a drawn wall's bumpers by hand, as Manually Distribute Bumpers does on grid
// screens (structure/bumpers.js, structure/drawing.js) and with the same controls. In
// manual mode: click a bumper to select it (Ctrl/Shift/⌘ adds), drag it along the panels
// its row of bumpers sits on, right-click it to change it to a 1W / 2W, move its ladder or
// delete it, and right-click an empty spot over an edge panel to add one. On touch: tap to
// select, tap a selected bumper for its options, hold (or turn on Select Mode) and drag to
// move, long-press an empty spot to add one. Once edited, the wall keeps its own bumpers
// (data.freeBumpers, for the edge data.freeBumpersPosition) until its panels change, and
// the structure Undo / Redo step through them with the app's undo.

let freeBumperHoverId = null;
let freeBumperDrag = null;      // {id, grab, saved} while a bumper is dragged
let freeBumperListenersSetup = false;

// Manual mode just turned on: the wall's bumpers become its own to edit
// (calculateFreeStructure() copies them)
function ensureFreeBumpersCustom() {
  calculateFreeStructure(screens[currentScreenId].data, getAllPanels());
}

// Change the hand-edited bumpers, undoably, then recalculate everything they feed
function editFreeBumpers(change) {
  saveState();
  change(screens[currentScreenId].data.freeBumpers);
  calculate();
  updateStructureUndoRedoButtons();
}

// The edge panel under cell x on a bumper row, and the panel right beside it on that row
function freeEdgeSlotAt(level, cellX) {
  const data = screens[currentScreenId].data;
  const edge = freeEdgeLevels(data, getAllPanels(), freeStructureState.position).get(level) || [];
  const i = edge.findIndex(p => cellX >= p.gx && cellX < p.gx + p.cw);
  if(i < 0) return null;
  const next = edge[i + 1] && edge[i + 1].gx === edge[i].gx + edge[i].cw ? edge[i + 1] : null;
  return {slot: edge[i], next};
}

// A 1W on a slot's panel, or a 2W on it and the panel beside it
function freeBumperOnSlot(type, level, at) {
  return {type, gx: at.slot.gx, cw: at.slot.cw + (type === '2w' ? at.next.cw : 0), gy: level,
    panelType: at.slot.type, firstCw: at.slot.cw};
}

function freeBumperOverlaps(list, cand, exceptId) {
  return list.some(b => b.id !== exceptId && b.gy === cand.gy && b.gx < cand.gx + cand.cw && cand.gx < b.gx + b.cw);
}

function freeStructurePoint(clientX, clientY) {
  return freeLayerCanvasPoint(document.getElementById('structureCanvas'), clientX, clientY);
}

// The hand-edited bumper under a point of the Structure layout
function freeBumperAt(clientX, clientY) {
  const st = freeStructureState;
  if(!st) return null;
  const p = freeStructurePoint(clientX, clientY);
  const hit = st.bumpers.find(b => b.id && b.rect && p.x >= b.rect.x && p.x < b.rect.x + b.rect.w && p.y >= b.rect.y && p.y < b.rect.y + b.rect.h);
  return hit ? hit.id : null;
}

// The empty spot for a bumper under a point: a bumper row's band over an edge panel
function freeBumperSpotAt(clientX, clientY) {
  const st = freeStructureState, v = freeStructureView;
  if(!st || !st.position || !v) return null;
  const data = screens[currentScreenId].data;
  const p = freeStructurePoint(clientX, clientY);
  const cellX = p.x / v.cellPx;
  for(const level of freeEdgeLevels(data, getAllPanels(), st.position).keys()) {
    const edgeY = v.top + Math.round(level * v.cellPx);
    const inBand = st.position === 'top' ? (p.y >= edgeY - v.bumperH && p.y < edgeY) : (p.y >= edgeY && p.y < edgeY + v.bumperH);
    if(!inBand) continue;
    const at = freeEdgeSlotAt(level, cellX);
    if(at) return {level, at};
  }
  return null;
}

// "column.row" of the edge panel a slot is, for the menus
function freeSlotName(level, slot) {
  const data = screens[currentScreenId].data;
  const allPanels = getAllPanels();
  const names = freePanelNames(data.freePanels, allPanels, data.freeCell_mm);
  const fp = data.freePanels.find(f => f.gx === slot.gx &&
    (freeStructureState.position === 'top' ? f.gy === level : f.gy + freeCells(allPanels[f.type], data.freeCell_mm).ch === level));
  return fp ? names.get(`${fp.gx},${fp.gy}`) : '';
}

// A context menu like the grid structure layout's (same element, so hideContextMenu() and
// its outside-click close it)
function showFreeBumperMenu(x, y, options) {
  hideContextMenu();
  const menu = document.createElement('div');
  menu.id = 'bumperContextMenu';
  menu.style.cssText = `
    position: fixed;
    left: ${x}px;
    top: ${y}px;
    background: #242424;
    border: 1px solid #555;
    border-radius: 6px;
    padding: 4px 0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    z-index: 10000;
    min-width: 180px;
    font-family: -apple-system, BlinkMacSystemFont, Arial, sans-serif;
  `;
  options.forEach(opt => {
    if(opt.separator) {
      const sep = document.createElement('div');
      sep.style.cssText = 'height: 1px; background: #383838; margin: 4px 0;';
      menu.appendChild(sep);
      return;
    }
    const item = document.createElement('div');
    item.textContent = opt.label;
    item.style.cssText = `
      padding: 8px 16px;
      cursor: pointer;
      color: ${opt.danger ? '#ff6b6b' : '#e0e0e0'};
      font-size: 13px;
    `;
    item.addEventListener('mouseenter', function() { this.style.background = opt.danger ? '#4a2020' : '#3a3a3a'; });
    item.addEventListener('mouseleave', function() { this.style.background = 'transparent'; });
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      opt.action();
      hideContextMenu();
    });
    menu.appendChild(item);
  });
  document.body.appendChild(menu);
  contextMenuVisible = true;
  const r = menu.getBoundingClientRect();
  if(r.right > window.innerWidth) menu.style.left = (window.innerWidth - r.width - 10) + 'px';
  if(r.bottom > window.innerHeight) menu.style.top = (window.innerHeight - r.height - 10) + 'px';
}

// A bumper's options: 1W <-> 2W, the ladder's panel on a ground-stacked 2W, delete
function showFreeBumperOptions(id, x, y) {
  const data = screens[currentScreenId].data;
  const b = data.freeBumpers.find(bb => bb.id === id);
  if(!b) return;
  const options = [];
  if(b.type === '2w') {
    options.push({label: 'Replace with 1W Bumper', action: () => editFreeBumpers(list => {
      const t = list.find(bb => bb.id === id);
      t.type = '1w';
      t.cw = t.firstCw;
      delete t.ladderRight;
    })});
    if(freeStructureState.position === 'bottom') {
      options.push({label: b.ladderRight ? 'Move Ladder to Left Panel' : 'Move Ladder to Right Panel', action: () => editFreeBumpers(list => {
        const t = list.find(bb => bb.id === id);
        t.ladderRight = !t.ladderRight;
      })});
    }
  } else if(b.type === '1w') {
    const at = freeEdgeSlotAt(b.gy, b.gx);
    if(at && at.next) {
      const cand = freeBumperOnSlot('2w', b.gy, at);
      if(!freeBumperOverlaps(data.freeBumpers, cand, id)) {
        options.push({label: 'Replace with 2W Bumper', action: () => editFreeBumpers(list => {
          Object.assign(list.find(bb => bb.id === id), cand);
        })});
      }
    }
  }
  options.push({separator: true});
  options.push({label: 'Delete Bumper', danger: true, action: () => editFreeBumpers(list => {
    list.splice(list.findIndex(bb => bb.id === id), 1);
    selectedBumpers.delete(id);
  })});
  showFreeBumperMenu(x, y, options);
}

// An empty spot's options: a 2W on its panel and the next, or a 1W on its panel
function showFreeBumperAddOptions(spot, x, y) {
  const data = screens[currentScreenId].data;
  const options = [];
  const add = type => {
    const cand = freeBumperOnSlot(type, spot.level, spot.at);
    if(freeBumperOverlaps(data.freeBumpers, cand, null)) return;
    const label = type === '2w'
      ? `Add 2W Bumper at ${freeSlotName(spot.level, spot.at.slot)}–${freeSlotName(spot.level, spot.at.next)}`
      : `Add 1W Bumper at ${freeSlotName(spot.level, spot.at.slot)}`;
    options.push({label, action: () => editFreeBumpers(list => {
      list.push(Object.assign({id: Math.max(0, ...list.map(bb => bb.id)) + 1}, cand));
    })});
  };
  if(spot.at.next) add('2w');
  add('1w');
  if(options.length) showFreeBumperMenu(x, y, options);
}

// Dragging a bumper: it moves to the edge panel under the pointer on its own row, when it
// fits there (a 2W needs the panel beside it too) without landing on another bumper
function moveFreeBumperTo(clientX) {
  const drag = freeBumperDrag;
  const data = screens[currentScreenId].data;
  const b = data.freeBumpers.find(bb => bb.id === drag.id);
  if(!b) return;
  const cellX = freeStructurePoint(clientX, 0).x / freeStructureView.cellPx - drag.grab;
  const at = freeEdgeSlotAt(b.gy, cellX + 0.01);
  if(!at || at.slot.gx === b.gx || (b.type === '2w' && !at.next)) return;
  const cand = freeBumperOnSlot(b.type, b.gy, at);
  if(freeBumperOverlaps(data.freeBumpers, cand, b.id)) return;
  if(!drag.saved) {
    saveState();
    drag.saved = true;
  }
  Object.assign(b, cand);
  delete b.ladderRight;
  calculateFreeStructure(data, getAllPanels());
  renderFreeStructureLayout();
}

function startFreeBumperDrag(id, clientX) {
  const b = screens[currentScreenId].data.freeBumpers.find(bb => bb.id === id);
  freeBumperDrag = {id, grab: freeStructurePoint(clientX, 0).x / freeStructureView.cellPx - b.gx, saved: false};
}

function endFreeBumperDrag() {
  const drag = freeBumperDrag;
  freeBumperDrag = null;
  if(drag && drag.saved) {
    calculate();
    updateStructureUndoRedoButtons();
  }
}

function selectFreeBumper(id, additive) {
  if(!additive) selectedBumpers.clear();
  if(selectedBumpers.has(id) && additive) selectedBumpers.delete(id);
  else selectedBumpers.add(id);
  renderFreeStructureLayout();
}

// Listeners on the Structure canvas, attached once. They only act on a drawn screen in
// Draw mode; the grid's own structure listeners stand aside for drawn screens.
function setupFreeBumperInteractivity() {
  if(freeBumperListenersSetup) return;
  freeBumperListenersSetup = true;
  const canvas = document.getElementById('structureCanvas');
  const drawn = () => freeDrawMode && isFreeCurrentScreen() && !!freeStructureView && !!freeStructureState;
  const active = () => drawn() && manualBumperMode;

  canvas.addEventListener('mousedown', function(e) {
    if(e.button !== 0 || !active()) return;
    if(Date.now() - lastTouchInteraction < 700) return;
    const id = freeBumperAt(e.clientX, e.clientY);
    if(id) {
      e.preventDefault();
      selectFreeBumper(id, e.ctrlKey || e.metaKey || e.shiftKey);
      startFreeBumperDrag(id, e.clientX);
      canvas.style.cursor = 'grabbing';
    } else if(!(e.ctrlKey || e.metaKey || e.shiftKey) && selectedBumpers.size) {
      selectedBumpers.clear();
      renderFreeStructureLayout();
    }
  });

  canvas.addEventListener('mousemove', function(e) {
    if(!active() || freeBumperDrag) return;
    const id = freeBumperAt(e.clientX, e.clientY);
    canvas.style.cursor = id ? 'grab' : 'default';
    if(id !== freeBumperHoverId) {
      freeBumperHoverId = id;
      renderFreeStructureLayout();
    }
  });

  canvas.addEventListener('mouseleave', function() {
    if(!drawn() || !freeBumperHoverId) return;
    freeBumperHoverId = null;
    renderFreeStructureLayout();
  });

  document.addEventListener('mousemove', function(e) {
    if(freeBumperDrag) moveFreeBumperTo(e.clientX);
  });

  document.addEventListener('mouseup', function() {
    if(!freeBumperDrag) return;
    canvas.style.cursor = 'grab';
    endFreeBumperDrag();
  });

  canvas.addEventListener('contextmenu', function(e) {
    if(!active()) return;
    e.preventDefault();
    const id = freeBumperAt(e.clientX, e.clientY);
    if(id) {
      if(!selectedBumpers.has(id)) selectFreeBumper(id, false);
      showFreeBumperOptions(id, e.clientX, e.clientY);
      return;
    }
    const spot = freeBumperSpotAt(e.clientX, e.clientY);
    if(spot) showFreeBumperAddOptions(spot, e.clientX, e.clientY);
  });

  // Touch: tap selects, tap a selected bumper for its options, hold (or Select Mode) and
  // drag to move; a long press on an empty spot turns manual mode on and offers a bumper
  let touch = null;
  canvas.addEventListener('touchstart', function(e) {
    if(!drawn() || e.touches.length !== 1) return;
    lastTouchInteraction = Date.now();
    const t = e.touches[0];
    const id = manualBumperMode ? freeBumperAt(t.clientX, t.clientY) : null;
    touch = {x: t.clientX, y: t.clientY, id, wasSelected: !!id && selectedBumpers.has(id), dragging: false, timer: null};
    if(id) {
      if(bumperSelectMode) touch.armed = true;
      else touch.timer = setTimeout(() => { touch.armed = true; vibrate(30); }, 300);
    } else {
      touch.timer = setTimeout(() => {
        touch.longPressed = true;
        vibrate(50);
        if(!manualBumperMode) toggleManualBumperMode();
        const spot = freeBumperSpotAt(touch.x, touch.y);
        if(spot) showFreeBumperAddOptions(spot, touch.x, touch.y);
      }, 600);
    }
  }, {passive: true});

  canvas.addEventListener('touchmove', function(e) {
    if(!touch || e.touches.length !== 1) return;
    const t = e.touches[0];
    const moved = Math.abs(t.clientX - touch.x) > 10 || Math.abs(t.clientY - touch.y) > 10;
    if(!touch.dragging && moved) {
      if(!touch.armed || !touch.id) {
        clearTimeout(touch.timer);
        touch = null;
        return;
      }
      touch.dragging = true;
      selectFreeBumper(touch.id, false);
      startFreeBumperDrag(touch.id, touch.x);
    }
    if(touch.dragging) {
      e.preventDefault();
      moveFreeBumperTo(t.clientX);
    }
  }, {passive: false});

  canvas.addEventListener('touchend', function(e) {
    lastTouchInteraction = Date.now();
    const done = touch;
    touch = null;
    if(!done) return;
    clearTimeout(done.timer);
    if(done.dragging) {
      endFreeBumperDrag();
      return;
    }
    if(done.longPressed) {
      e.preventDefault();
      return;
    }
    if(!done.id) return;
    if(done.wasSelected) {
      vibrate(30);
      showFreeBumperOptions(done.id, done.x, done.y);
    } else {
      vibrate(10);
      selectFreeBumper(done.id, false);
    }
  });

  canvas.addEventListener('touchcancel', function() {
    if(touch) clearTimeout(touch.timer);
    touch = null;
    if(freeBumperDrag) endFreeBumperDrag();
  });
}
