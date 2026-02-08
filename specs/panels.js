// ==================== LED PANEL SPECIFICATIONS ====================
// Hardware specs for all built-in LED panels, structural components, and accessories.
// Each panel includes: dimensions, resolution, power, weight, cable/jumper specs,
// bumper weights, and panel-specific features (floor frames, etc.)

const panels = {
  "BP2_V2": {brand:"ROE Visual", name:"Black Pearl BP2 V2", pixel_pitch_mm:2.84, width_m:0.5, height_m:0.5, depth_mm:90, res_x:176, res_y:176, weight_kg:9.35, power_max_w:190, power_avg_w:95, brightness_nits:1500, max_hanging:20, max_stacking:12, bumper_1w_lbs:7.38, bumper_2w_lbs:17.1, max_panels_per_circuit:8, max_panels_per_data:16, power_jumper_ft:"1'", data_jumper_ft:"1'", data_cross_jumper_ft:"2'", jumpers_builtin:false},
  "CB5_MKII": {brand:"ROE Visual", name:"Carbon CB5 MKII", pixel_pitch_mm:5.77, width_m:0.6, height_m:1.2, depth_mm:80, res_x:104, res_y:208, weight_kg:23.65, power_max_w:480, power_avg_w:240, brightness_nits:6000, max_hanging:12, max_stacking:5, bumper_1w_lbs:13.9, bumper_2w_lbs:27.5, bumper_4w_lbs:66.15, max_panels_per_circuit:3, max_panels_per_data:24, power_jumper_ft:null, data_jumper_ft:null, data_cross_jumper_ft:"3'", jumpers_builtin:true},
  "CB5_MKII_HALF": {brand:"ROE Visual", name:"Carbon CB5 MKII Half Panel", pixel_pitch_mm:5.77, width_m:0.6, height_m:0.6, depth_mm:79, res_x:104, res_y:104, weight_kg:13.903, power_max_w:250, power_avg_w:125, brightness_nits:6000, max_hanging:24, max_stacking:10, bumper_1w_lbs:13.9, bumper_2w_lbs:27.5, bumper_4w_lbs:66.15, max_panels_per_circuit:6, max_panels_per_data:48, power_jumper_ft:null, data_jumper_ft:null, data_cross_jumper_ft:"3'", jumpers_builtin:true},
  "MC7H": {brand:"ROE Visual", name:"MC7H", pixel_pitch_mm:7.5, width_m:0.6, height_m:0.6, depth_mm:90, res_x:80, res_y:80, weight_kg:14.8, power_max_w:420, power_avg_w:210, brightness_nits:5000, max_hanging:20, max_stacking:8, bumper_1w_lbs:15.44, bumper_2w_lbs:28.22, max_panels_per_circuit:4, max_panels_per_data:82, power_jumper_ft:null, data_jumper_ft:null, data_cross_jumper_ft:"3'", jumpers_builtin:true},
  "BO3": {brand:"ROE Visual", name:"Black Onyx BO3", pixel_pitch_mm:3.47, width_m:0.5, height_m:0.5, depth_mm:90, res_x:144, res_y:144, weight_kg:9.35, power_max_w:170, power_avg_w:85, brightness_nits:1500, max_hanging:20, max_stacking:8, bumper_1w_lbs:7.38, bumper_2w_lbs:17.1, max_panels_per_circuit:9, max_panels_per_data:25, power_jumper_ft:"1'", data_jumper_ft:"1'", data_cross_jumper_ft:"2'", jumpers_builtin:false},
  "BM4_MATTE": {brand:"ROE Visual", name:"Black Marble BM4 (Matte)", pixel_pitch_mm:4.76, width_m:0.61, height_m:0.61, depth_mm:140, res_x:128, res_y:128, weight_kg:17.5, power_max_w:280, power_avg_w:140, brightness_nits:2000, max_hanging:null, max_stacking:null, bumper_1w_lbs:null, bumper_2w_lbs:null, max_panels_per_circuit:5, max_panels_per_data:32, power_jumper_ft:"4'", data_jumper_ft:"4'", data_cross_jumper_ft:"4'", jumpers_builtin:false, uses_bumpers:false, is_floor_panel:true, floor_frames:{frame_1x1:{name:"1x1 (1 panel)", panels:1, weight_lbs:26.5}, frame_2x1:{name:"2x1 (2 panels)", panels:2, weight_lbs:41.9}, frame_2x2:{name:"2x2 (4 panels)", panels:4, weight_lbs:62.8}, frame_3x2:{name:"3x2 (6 panels)", panels:6, weight_lbs:80.5}}},
  "DM2_6": {brand:"ROE Visual", name:"DM2.6", pixel_pitch_mm:2.6, width_m:0.5, height_m:0.5, depth_mm:80, res_x:192, res_y:192, weight_kg:5.76, power_max_w:180, power_avg_w:90, brightness_nits:1500, max_hanging:20, max_stacking:12, bumper_1w_lbs:7.38, bumper_2w_lbs:17.1, max_panels_per_circuit:8, max_panels_per_data:14, power_jumper_ft:"1.5'", data_jumper_ft:"1.5'", data_cross_jumper_ft:"3'", jumpers_builtin:false},
  "INFILED_AMT8_3": {brand:"INFiLED", name:"AMT 8.3", pixel_pitch_mm:8.33, width_m:1.0, height_m:1.0, depth_mm:107, res_x:120, res_y:120, weight_kg:15.8, power_max_w:720, power_avg_w:360, brightness_nits:5000, max_hanging:18, max_stacking:18, bumper_1w_lbs:20, bumper_2w_lbs:40, max_panels_per_circuit:2, max_panels_per_data:36, power_jumper_ft:"1.5'", data_jumper_ft:"1.5'", data_cross_jumper_ft:"4'", jumpers_builtin:false}
};

// ==================== CONNECTING PLATE WEIGHTS ====================
const PLATE_WEIGHTS = {
  plate2wayKg: 0.141, // 2-way plate weight (0.31 lbs)
  plate4wayKg: 0.249  // 4-way plate weight (0.55 lbs)
};

// ==================== GROUND SUPPORT HARDWARE WEIGHTS ====================
// All weights in lbs
const GROUND_SUPPORT_WEIGHTS = {
  rearTruss: 10.1,              // per rear truss piece (1000mm)
  baseTruss: 28.2,              // per base truss (1000mm)
  bridgeClamp: 2.2,             // per bridge clamp
  rearBridgeClampAdapter: 1.1,  // per adapter (DM2.6 only)
  pipe: 5.0,                    // per pipe
  swivelCheeseborough: 1.2,     // per swivel cheeseborough
  sandbag: 25.0                 // per sandbag (25lb sandbags)
};

// ==================== FLOOR FRAME COLORS ====================
const floorFrameColors = {
  frame_1x1: '#ff6b6b', // Red
  frame_2x1: '#4ecdc4', // Teal
  frame_2x2: '#ffe66d', // Yellow
  frame_3x2: '#b794f4'  // Purple
};
