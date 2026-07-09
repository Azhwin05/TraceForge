import { z } from "zod"

// Per-pass welding parameter row (QW-409/410 table) and tensile test row (QW-150).
export const weldPassRowSchema = z.object({
  pass_label:            z.string().nullish(),
  process:                z.string().nullish(),
  filler_classification:  z.string().nullish(),
  filler_diameter:        z.string().nullish(),
  current_type_polarity:  z.string().nullish(),
  amps_range:             z.string().nullish(),
  volts_range:            z.string().nullish(),
  travel_speed_range:     z.string().nullish(),
  heat_input:             z.string().nullish(),
})
export type WeldPassRowInput = z.infer<typeof weldPassRowSchema>

export const tensileTestRowSchema = z.object({
  specimen_no:            z.string().nullish(),
  width:                  z.string().nullish(),
  thickness:              z.string().nullish(),
  area:                   z.string().nullish(),
  ultimate_load:          z.string().nullish(),
  ultimate_stress:        z.string().nullish(),
  failure_type_location:  z.string().nullish(),
})
export type TensileTestRowInput = z.infer<typeof tensileTestRowSchema>

export function blankWeldPassRow(): WeldPassRowInput {
  return {
    pass_label: "", process: "", filler_classification: "", filler_diameter: "",
    current_type_polarity: "", amps_range: "", volts_range: "", travel_speed_range: "", heat_input: "",
  }
}

export function blankTensileTestRow(): TensileTestRowInput {
  return {
    specimen_no: "", width: "", thickness: "", area: "",
    ultimate_load: "", ultimate_stress: "", failure_type_location: "",
  }
}

// All numeric fields are stored as strings because HTML <input type="number"> returns
// strings in uncontrolled forms. The action converts them to numbers before DB insertion.
export const wpsMasterSchema = z.object({
  wps_no:           z.string().min(1, "WPS number is required"),
  pqr_no:           z.string().nullish(),
  welding_process:  z.string().nullish(),
  type:             z.string().nullish(),
  scope:            z.string().nullish(),
  date_of_welding:  z.string().nullish(),
  joint_design:     z.string().nullish(),
  base_material:    z.string().nullish(),
  filler_material:  z.string().nullish(),
  filler_aws_class: z.string().nullish(),
  filler_size:      z.string().nullish(),
  position:         z.string().nullish(),

  // Numbers stored as strings; action converts with parseFloat()
  preheat_min:    z.string().nullish(),
  interpass_max:  z.string().nullish(),
  preheat_other:  z.string().nullish(),

  pwht_required:        z.boolean(),
  pwht_temp_min:        z.string().nullish(),
  pwht_temp_max:        z.string().nullish(),
  pwht_time_range:      z.string().nullish(),
  pwht_cooling_method:  z.string().nullish(),
  pwht_rate_of_heating: z.string().nullish(),
  pwht_loading_temp:    z.string().nullish(),
  pwht_unloading_temp:  z.string().nullish(),

  // joint_json (QW-402) sub-fields
  joint_root_gap:      z.string().nullish(),
  joint_root_face:     z.string().nullish(),
  joint_groove_angle:  z.string().nullish(),
  joint_groove_length: z.string().nullish(),
  joint_groove_width:  z.string().nullish(),
  joint_backing:       z.string().nullish(),
  joint_retainer:      z.string().nullish(),

  // base_metal_json (QW-403) sub-fields
  base_material_spec:        z.string().nullish(),
  base_material_type_grade:  z.string().nullish(),
  base_material_pno:         z.string().nullish(),
  base_material_heat_no:     z.string().nullish(),
  test_coupon_thickness:     z.string().nullish(),
  test_coupon_diameter:      z.string().nullish(),

  // filler_metal_json (QW-404) sub-fields
  filler_sfa_spec:           z.string().nullish(),
  filler_fno:                z.string().nullish(),
  filler_ano:                z.string().nullish(),
  filler_feed_rate:          z.string().nullish(),
  weld_metal_thickness:      z.string().nullish(),

  // position (QW-405)
  weld_progression: z.string().nullish(),

  // gas_json sub-fields
  gas_shielding:   z.string().nullish(),
  gas_trailing:    z.string().nullish(),
  gas_backing:     z.string().nullish(),
  gas_composition: z.string().nullish(),
  gas_flow_rate:   z.string().nullish(),

  // electrical_params_json sub-fields
  elec_current_type:          z.string().nullish(),
  elec_polarity:               z.string().nullish(),
  elec_current_range:          z.string().nullish(),
  elec_voltage_range:          z.string().nullish(),
  elec_travel_speed:           z.string().nullish(),
  elec_heat_input:             z.string().nullish(),
  elec_tungsten_electrode_size: z.string().nullish(),

  // technique_json sub-fields
  tech_bead_type:              z.string().nullish(),
  tech_oscillation:            z.string().nullish(),
  tech_pass_type:               z.string().nullish(),
  tech_multi_single_layer:      z.string().nullish(),
  tech_multi_single_electrode:  z.string().nullish(),
  tech_back_gouging:            z.string().nullish(),
  tech_contact_tube_distance:   z.string().nullish(),
  tech_orifice_gas_cup_size:    z.string().nullish(),
  tech_cleaning_method:         z.string().nullish(),
  tech_electrode_spacing:       z.string().nullish(),
  tech_change_of_process:       z.string().nullish(),
  tech_peening:                 z.string().nullish(),
  tech_transfer_mode:           z.string().nullish(),
  tech_torch_orifice_dia:       z.string().nullish(),
  tech_filler_metal_delivery:   z.string().nullish(),
  tech_use_of_thermal_process:  z.string().nullish(),

  // Repeating tables (QW-409/410 per-pass parameters, QW-150 tensile tests)
  weld_passes:    z.array(weldPassRowSchema).optional(),
  tensile_tests:  z.array(tensileTestRowSchema).optional(),

  approved_by:    z.string().nullish(),
  reviewed_by:    z.string().nullish(),
  revision:       z.string().min(1, "Revision is required"),
  effective_date: z.string().nullish(),
  notes:          z.string().nullish(),
})

export type WpsMasterInput = z.infer<typeof wpsMasterSchema>
