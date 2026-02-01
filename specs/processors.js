// ==================== LED PROCESSOR SPECIFICATIONS ====================
// Hardware specs for all built-in video processors.
// Each processor includes: pixel capacity, frame rate, bit depth, output configuration.

const processors = {
  "Brompton_SX40": {name:"Brompton SX40", base_pixels_1g:525000, base_framerate:60, base_bitdepth:8, pixels_per_10g:9000000, total_pixels:9000000, outputs:"4 × 10G trunks"},
  "Brompton_S8": {name:"Brompton S8", base_pixels_1g:525000, base_framerate:60, base_bitdepth:8, total_pixels:4500000, outputs:"8 × 1G"},
  "Brompton_M2": {name:"Brompton M2", base_pixels_1g:500000, base_framerate:60, base_bitdepth:8, total_pixels:2000000, outputs:"4 × 1G"},
  "Brompton_S4": {name:"Brompton S4", base_pixels_1g:525000, base_framerate:60, base_bitdepth:8, total_pixels:2070000, outputs:"4 × 1G"},
  "Brompton_T1": {name:"Brompton T1", base_pixels_1g:525000, base_framerate:60, base_bitdepth:8, total_pixels:525000, outputs:"1 × 1G"},
  "Brompton_SQ200": {name:"Brompton SQ200", base_pixels_1g:525000, base_framerate:60, base_bitdepth:8, total_pixels:36000000, outputs:"Dual 100G QSFP28"},
  "NovaStar_MX40_Pro": {name:"NovaStar MX40 Pro", base_pixels_1g:659722, base_framerate:60, base_bitdepth:8, total_pixels:9000000, outputs:"20 × 1G + 4 × 10G", pixels_1g_by_bitdepth:{8:659722, 10:494792, 12:329861}, ports_1g:20, ports_10g:4}
};
