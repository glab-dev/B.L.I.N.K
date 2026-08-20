// ==================== LED PROCESSOR SPECIFICATIONS ====================
// Hardware specs for all built-in video processors.
// Each processor includes: pixel capacity, frame rate, bit depth, output configuration.
//
// Topology fields (read by specs/processor-topology.js):
//   output_ports          — data ports on the processor itself (direct mode)
//   uses_distribution_box — true when data lines land on a box, not the processor
//   distribution_box_name / distribution_box_ports — that box and its port count
//   boxes_per_processor   — how many boxes one processor can feed
//   supports_direct       — processor can run with OR without the box
//   processors_from       — 'boxes' derives processor count from box count,
//                           'ports' derives it from total ports (the default)
//   pixel_limited         — processor count also respects total_pixels
// Custom processors carry the same field names (specs/custom-processors.js).

const processors = {
  "Brompton_SX40": {name:"Brompton SX40", base_pixels_1g:525000, base_framerate:60, base_bitdepth:8, pixels_per_10g:9000000, total_pixels:9000000, outputs:"4 × 10G trunks", output_ports:4, uses_distribution_box:true, distribution_box_name:"XD", distribution_box_ports:10, boxes_per_processor:4, supports_direct:false, processors_from:'boxes', pixel_limited:false, redundancy_doubles:'boxes', box_label_style:'letter'},
  "Brompton_S8": {name:"Brompton S8", base_pixels_1g:525000, base_framerate:60, base_bitdepth:8, total_pixels:4500000, outputs:"8 × 1G", output_ports:8, uses_distribution_box:false, supports_direct:true, processors_from:'ports', pixel_limited:false},
  "Brompton_M2": {name:"Brompton M2", base_pixels_1g:500000, base_framerate:60, base_bitdepth:8, total_pixels:2000000, outputs:"4 × 1G", output_ports:4, uses_distribution_box:false, supports_direct:true, processors_from:'ports', pixel_limited:false},
  "Brompton_S4": {name:"Brompton S4", base_pixels_1g:525000, base_framerate:60, base_bitdepth:8, total_pixels:2070000, outputs:"4 × 1G", output_ports:4, uses_distribution_box:false, supports_direct:true, processors_from:'ports', pixel_limited:false},
  "Brompton_T1": {name:"Brompton T1", base_pixels_1g:525000, base_framerate:60, base_bitdepth:8, total_pixels:525000, outputs:"1 × 1G", output_ports:1, uses_distribution_box:false, supports_direct:true, processors_from:'ports', pixel_limited:false},
  "Brompton_SQ200": {name:"Brompton SQ200", base_pixels_1g:525000, base_framerate:60, base_bitdepth:8, total_pixels:36000000, outputs:"Dual 100G QSFP28", output_ports:8, uses_distribution_box:false, supports_direct:true, processors_from:'ports', pixel_limited:false},
  "NovaStar_MX40_Pro": {name:"NovaStar MX40 Pro", base_pixels_1g:659722, base_framerate:60, base_bitdepth:8, total_pixels:9000000, outputs:"20 × 1G + 4 × 10G", pixels_1g_by_bitdepth:{8:659722, 10:494792, 12:329861}, ports_1g:20, ports_10g:4, output_ports:20, uses_distribution_box:true, distribution_box_name:"CVT-10 Pro", distribution_box_ports:10, boxes_per_processor:4, supports_direct:true, processors_from:'boxes', pixel_limited:true}
};