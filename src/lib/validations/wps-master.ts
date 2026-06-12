import { z } from "zod"

// All numeric fields are stored as strings because HTML <input type="number"> returns
// strings in uncontrolled forms. The action converts them to numbers before DB insertion.
export const wpsMasterSchema = z.object({
  wps_no:           z.string().min(1, "WPS number is required"),
  pqr_no:           z.string().nullish(),
  welding_process:  z.string().nullish(),
  type:             z.string().nullish(),
  scope:            z.string().nullish(),
  joint_design:     z.string().nullish(),
  base_material:    z.string().nullish(),
  filler_material:  z.string().nullish(),
  filler_aws_class: z.string().nullish(),
  filler_size:      z.string().nullish(),
  position:         z.string().nullish(),

  // Numbers stored as strings; action converts with parseFloat()
  preheat_min:    z.string().nullish(),
  interpass_max:  z.string().nullish(),

  pwht_required:  z.boolean(),
  pwht_temp_min:  z.string().nullish(),
  pwht_temp_max:  z.string().nullish(),
  pwht_time_range: z.string().nullish(),

  // gas_json sub-fields
  gas_shielding:  z.string().nullish(),
  gas_backing:    z.string().nullish(),

  // electrical_params_json sub-fields
  elec_polarity:      z.string().nullish(),
  elec_current_range: z.string().nullish(),
  elec_voltage_range: z.string().nullish(),
  elec_travel_speed:  z.string().nullish(),
  elec_heat_input:    z.string().nullish(),

  // technique_json sub-fields
  tech_bead_type:    z.string().nullish(),
  tech_oscillation:  z.string().nullish(),
  tech_pass_type:    z.string().nullish(),
  tech_back_gouging: z.string().nullish(),

  approved_by:    z.string().nullish(),
  reviewed_by:    z.string().nullish(),
  revision:       z.string().min(1, "Revision is required"),
  effective_date: z.string().nullish(),
  notes:          z.string().nullish(),
})

export type WpsMasterInput = z.infer<typeof wpsMasterSchema>
