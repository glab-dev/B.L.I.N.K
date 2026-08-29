// ==================== TAB DRAG-TO-REORDER ====================
// Drives both tab strips: #screenTabsContainer (simple + complex modes) and
// #canvasTabsContainer (canvas + raster views). Both render by replacing the
// container's innerHTML on every state change, so every listener here is
// delegated from the container and never bound to a tab element.
//
// Activation differs by input type: a mouse drag starts after 6px of travel so
// a plain click still falls through to the tab's own onclick, while touch uses
// a 350ms long-press (the same idiom as setupMobileLongPress in touch-gestures.js)
// so the tab strip stays scrollable.

const TAB_REORDER_MOUSE_THRESHOLD = 6;
const TAB_REORDER_LONG_PRESS_MS = 350;
const TAB_REORDER_LONG_PRESS_SLOP = 10;

let _tabReorderState = null;

function initTabReorder(containerId, opts) {
  const container = document.getElementById(containerId);
  if(!container) return;

  const idAttr = opts.idAttr;
  const commit = opts.commit;

  function tabsWrapper() {
    return container.querySelector('.screen-tabs');
  }

  function tabElements() {
    const wrapper = tabsWrapper();
    if(!wrapper) return [];
    return Array.prototype.filter.call(wrapper.children, function(el) {
      return el.classList && el.classList.contains('screen-tab');
    });
  }

  container.addEventListener('pointerdown', function(e) {
    if(_tabReorderState) return;
    if(e.button !== 0 && e.pointerType === 'mouse') return;

    const tab = e.target.closest ? e.target.closest('.screen-tab') : null;
    if(!tab || !container.contains(tab)) return;
    // A mouse press on ✎ or × belongs to that button, not to a drag. Touch is different:
    // once the tabs wrap, those buttons sit right in the middle of the tab, so refusing
    // them here would make most of a tab's surface undraggable on a phone. A long-press
    // there drags; a short tap still falls through to the button's own click.
    if(e.pointerType === 'mouse' && e.target.closest('.screen-tab-edit, .screen-tab-close')) return;

    const id = tab.dataset[idAttr];
    if(!id) return;
    if(tabElements().length < 2) return;

    _tabReorderState = {
      container: container,
      tabsWrapper: tabsWrapper,
      tabElements: tabElements,
      commit: commit,
      idAttr: idAttr,
      pointerId: e.pointerId,
      tab: tab,
      startX: e.clientX,
      startY: e.clientY,
      isTouch: e.pointerType !== 'mouse',
      active: false,
      longPressTimer: null,
      ghost: null
    };

    if(_tabReorderState.isTouch) {
      _tabReorderState.longPressTimer = setTimeout(function() {
        if(!_tabReorderState) return;
        _tabReorderState.longPressTimer = null;
        _tabReorderActivate(e.clientX, e.clientY);
      }, TAB_REORDER_LONG_PRESS_MS);
    }
  });
}

function _tabReorderActivate(x, y) {
  const st = _tabReorderState;
  if(!st || st.active) return;
  st.active = true;

  if(typeof vibrate === 'function') vibrate(20);

  const rect = st.tab.getBoundingClientRect();
  const ghost = st.tab.cloneNode(true);
  ghost.className = 'tab-drag-ghost';
  ghost.style.width = rect.width + 'px';
  ghost.style.height = rect.height + 'px';
  ghost.style.left = rect.left + 'px';
  ghost.style.top = rect.top + 'px';
  st.ghostOffsetX = x - rect.left;
  st.ghostOffsetY = y - rect.top;
  document.body.appendChild(ghost);
  st.ghost = ghost;

  st.tab.classList.add('dragging');
  document.body.classList.add('tab-reordering');
}

// Insertion index in reading order: earlier rows first, then left-to-right within a
// row. The strip is flex-wrap, so on narrow viewports tabs sit on several rows and a
// plain x comparison picks the wrong slot; nearest-centre gets the row right but lands
// on the wrong side when the pointer is out past a row's first or last tab.
function _tabReorderDropIndex(x, y) {
  const st = _tabReorderState;
  const others = st.tabElements().filter(function(el) { return el !== st.tab; });

  let index = others.length;
  for(let i = 0; i < others.length; i++) {
    const r = others[i].getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    // Rows overlap by the tab's negative margin-top, so a row is matched against the
    // element's vertical band rather than raw top/bottom edges.
    const sameRow = Math.abs(y - cy) <= r.height / 2;
    if(!sameRow && y < cy) { index = i; break; }
    if(sameRow && x < cx) { index = i; break; }
  }

  return { index: index, others: others };
}

function _tabReorderMove(x, y) {
  const st = _tabReorderState;
  if(!st || !st.active) return;

  if(st.ghost) {
    st.ghost.style.left = (x - st.ghostOffsetX) + 'px';
    st.ghost.style.top = (y - st.ghostOffsetY) + 'px';
  }

  const wrapper = st.tabsWrapper();
  if(!wrapper) return;

  const drop = _tabReorderDropIndex(x, y);
  const reference = drop.others[drop.index] || null;
  if(reference !== st.tab.nextElementSibling || reference === null) {
    wrapper.insertBefore(st.tab, reference);
  }
}

function _tabReorderFinish() {
  const st = _tabReorderState;
  if(!st) return;
  _tabReorderState = null;

  if(st.longPressTimer) clearTimeout(st.longPressTimer);
  if(!st.active) return;

  if(st.ghost && st.ghost.parentNode) st.ghost.parentNode.removeChild(st.ghost);
  st.tab.classList.remove('dragging');
  document.body.classList.remove('tab-reordering');

  // A mouse drag ends with a click on the tab it was released over — swallow it so
  // releasing a drag doesn't also switch screens. A drag released over a different
  // element fires no click at all, so the listener is torn down on the next task
  // rather than left armed to eat the user's next real click.
  const swallowClick = function(e) {
    e.stopPropagation();
    e.preventDefault();
    document.removeEventListener('click', swallowClick, true);
  };
  document.addEventListener('click', swallowClick, true);
  setTimeout(function() {
    document.removeEventListener('click', swallowClick, true);
  }, 0);

  const orderedIds = st.tabElements().map(function(el) { return el.dataset[st.idAttr]; })
    .filter(function(id) { return !!id; });
  st.commit(orderedIds);
}

document.addEventListener('pointermove', function(e) {
  const st = _tabReorderState;
  if(!st || e.pointerId !== st.pointerId) return;

  const dx = Math.abs(e.clientX - st.startX);
  const dy = Math.abs(e.clientY - st.startY);

  if(!st.active) {
    if(st.isTouch) {
      // Moving before the long-press fires means the user is scrolling, not reordering.
      if(st.longPressTimer && (dx > TAB_REORDER_LONG_PRESS_SLOP || dy > TAB_REORDER_LONG_PRESS_SLOP)) {
        clearTimeout(st.longPressTimer);
        _tabReorderState = null;
      }
      return;
    }
    if(dx > TAB_REORDER_MOUSE_THRESHOLD || dy > TAB_REORDER_MOUSE_THRESHOLD) {
      _tabReorderActivate(e.clientX, e.clientY);
    }
    if(!st.active) return;
  }

  _tabReorderMove(e.clientX, e.clientY);
});

// The long-press fires with the finger stationary, so no scroll has begun yet and
// preventDefault here still stops the page from scrolling under the drag. Must be
// non-passive to be allowed to cancel.
document.addEventListener('touchmove', function(e) {
  if(_tabReorderState && _tabReorderState.active) e.preventDefault();
}, { passive: false });

document.addEventListener('pointerup', function(e) {
  if(_tabReorderState && e.pointerId === _tabReorderState.pointerId) _tabReorderFinish();
});

document.addEventListener('pointercancel', function(e) {
  if(_tabReorderState && e.pointerId === _tabReorderState.pointerId) _tabReorderFinish();
});

// ==================== WIRING ====================

function initTabReorderHandlers() {
  initTabReorder('screenTabsContainer', {
    idAttr: 'screenId',
    commit: function(orderedIds) {
      screenOrder = orderedIds;
      applyScreenReorder();
    }
  });

  initTabReorder('canvasTabsContainer', {
    idAttr: 'canvasId',
    commit: function(orderedIds) {
      canvasOrder = orderedIds;
      renderCanvasTabs();
    }
  });
}

// Screen order feeds SOCA grouping (sharedDistroGroupIds) and data port assignment
// (dataPortScreenIds), so a reorder has to recalculate — the same refresh deleteScreen()
// runs after it changes the screen set.
function applyScreenReorder() {
  renderScreenTabs();
  if(typeof calculate === 'function') calculate();
  if(typeof showCanvasView === 'function') showCanvasView();
  if(typeof currentAppMode !== 'undefined' && currentAppMode === 'raster' &&
     typeof renderRasterScreenTable === 'function') {
    renderRasterScreenTable();
  }
  if(typeof currentAppMode !== 'undefined' && currentAppMode === 'gear' &&
     typeof initGearView === 'function') {
    initGearView();
  }
}

window.addEventListener('load', function() {
  setTimeout(initTabReorderHandlers, 500);
});
