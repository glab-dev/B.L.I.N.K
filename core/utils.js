// ==================== UTILITY FUNCTIONS ====================
// Security utilities, color manipulation, and math helpers.
// Must load before specs/custom-panels.js which uses escapeHtml/escapeJsString.

// ==================== SECURITY UTILITIES ====================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function escapeJsString(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'")
    .replace(/"/g, '\\"').replace(/</g, '\\x3c').replace(/>/g, '\\x3e');
}

function escapeXml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function isValidHexColor(str) {
  return typeof str === 'string' && /^#[0-9a-fA-F]{6,8}$/.test(str);
}

function safeColor(color, fallback) {
  return isValidHexColor(color) ? color : (fallback || '#10b981');
}

// Set version number in menu when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  const menuVersion = document.getElementById('menuVersionNumber');
  if(menuVersion) menuVersion.textContent = 'v' + APP_VERSION;

  // Update layout hints based on device type
  updateLayoutHints();
  window.addEventListener('resize', updateLayoutHints);
});

// Update hint text based on mobile vs desktop
function updateLayoutHints() {
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isMobile = window.innerWidth <= 768;

  // Standard layout hint
  const standardHint = document.getElementById('standardLayoutHint');
  if(standardHint) {
    if(isTouchDevice || isMobile) {
      standardHint.textContent = 'Tap to select • Tap again for options • Drag to multi-select';
    } else {
      standardHint.textContent = 'Click to select • Right-click for options • Drag to multi-select';
    }
  }

  // Structure layout hint
  const structureHint = document.getElementById('structureHintText');
  if(structureHint) {
    if(isTouchDevice || isMobile) {
      structureHint.textContent = 'Tap to select • Tap again for options • Hold to drag';
    } else {
      structureHint.textContent = 'Click to select • Right-click for options • Drag to move';
    }
  }
}

// ==================== COLOR UTILITIES ====================
function lightenColor(hex, percent) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const newR = Math.min(255, Math.floor(r + (255 - r) * percent));
  const newG = Math.min(255, Math.floor(g + (255 - g) * percent));
  const newB = Math.min(255, Math.floor(b + (255 - b) * percent));
  return `#${newR.toString(16).padStart(2,'0')}${newG.toString(16).padStart(2,'0')}${newB.toString(16).padStart(2,'0')}`;
}

function hexToRgba(hex, alpha){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function getContrastColor(hex){
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  const brightness=(r*299+g*587+b*114)/1000;
  return brightness<128?'#FFFFFF':'#000000';
}
function colorForIndex(i){
  let base=resistorColors[i%10];
  const cycle=Math.floor(i/10);
  const alpha=Math.max(0.4, 1 - cycle*0.2);
  // Use pastel colors for eco-friendly printing
  if (ecoPrintMode) {
    base = toPastelColor(base);
  }
  // Convert to greyscale for greyscale printing
  if (greyscalePrintMode) {
    base = toGreyscale(base);
    return { fill: base, text: '#000000', solid: base };
  }
  if (ecoPrintMode) {
    return { fill: base, text: '#000000', solid: base };
  }
  return { fill: hexToRgba(base, alpha), text: getContrastColor(base), solid: base };
}

// ==================== MATH HELPERS ====================
function toMeters(v, units){ return units==='m' ? v : v*0.3048; }
function fromMeters(m, units){ return units==='m' ? m : m/0.3048; }

function approxAspectRatio(w,h){
  const ratio=w/h;
  const common=[{n:'16:9',v:16/9},{n:'4:3',v:4/3},{n:'3:2',v:3/2},{n:'2:1',v:2/1},{n:'21:9',v:21/9},{n:'1:1',v:1}];
  for(const c of common){ if(Math.abs(ratio-c.v)/c.v<0.02) return {label:c.n, value:ratio}; }
  let best={num:Math.round(ratio*10), den:10, diff:Math.abs(ratio-Math.round(ratio*10)/10)};
  for(let den=1; den<=20; den++){ const num=Math.round(ratio*den); const diff=Math.abs(ratio-(num/den)); if(diff<best.diff){ best={num,den,diff}; } }
  return {label:`${best.num}:${best.den}`, value:ratio};
}

