import type { WpsMasterInput } from "@/lib/validations/wps-master"
import type { WpsMaster, WeldPassRow, TensileTestRow } from "@/types/database"

/** See item-master.ts for why this lives outside any "use client" file. */
export function wpsMasterToFormValues(wps: WpsMaster): WpsMasterInput {
  const gas    = (wps.gas_json               ?? {}) as Record<string, string>
  const elec   = (wps.electrical_params_json ?? {}) as Record<string, string>
  const tech   = (wps.technique_json         ?? {}) as Record<string, string>
  const joint  = (wps.joint_json             ?? {}) as Record<string, string>
  const base   = (wps.base_metal_json        ?? {}) as Record<string, string>
  const filler = (wps.filler_metal_json      ?? {}) as Record<string, string>
  const passes: WeldPassRow[]     = wps.weld_passes_json     ?? []
  const tensile: TensileTestRow[] = wps.tensile_tests_json   ?? []

  return {
    wps_no:           wps.wps_no,
    pqr_no:           wps.pqr_no           ?? undefined,
    welding_process:  wps.welding_process  ?? undefined,
    type:             wps.type             ?? undefined,
    scope:            wps.scope            ?? undefined,
    date_of_welding:  wps.date_of_welding  ?? undefined,
    joint_design:     wps.joint_design     ?? undefined,
    base_material:    wps.base_material    ?? undefined,
    filler_material:  wps.filler_material  ?? undefined,
    filler_aws_class: wps.filler_aws_class ?? undefined,
    filler_size:      wps.filler_size      ?? undefined,
    position:         wps.position         ?? undefined,
    weld_progression: wps.weld_progression ?? undefined,
    preheat_min:      wps.preheat_min   != null ? String(wps.preheat_min)   : undefined,
    interpass_max:    wps.interpass_max != null ? String(wps.interpass_max) : undefined,
    preheat_other:    wps.preheat_other ?? undefined,
    pwht_required:    wps.pwht_required,
    pwht_temp_min:    wps.pwht_temp_min != null ? String(wps.pwht_temp_min) : undefined,
    pwht_temp_max:    wps.pwht_temp_max != null ? String(wps.pwht_temp_max) : undefined,
    pwht_time_range:  wps.pwht_time_range      ?? undefined,
    pwht_cooling_method:  wps.pwht_cooling_method  ?? undefined,
    pwht_rate_of_heating: wps.pwht_rate_of_heating ?? undefined,
    pwht_loading_temp:    wps.pwht_loading_temp    ?? undefined,
    pwht_unloading_temp:  wps.pwht_unloading_temp  ?? undefined,

    joint_root_gap:      joint.root_gap      ?? undefined,
    joint_root_face:     joint.root_face     ?? undefined,
    joint_groove_angle:  joint.groove_angle  ?? undefined,
    joint_groove_length: joint.groove_length ?? undefined,
    joint_groove_width:  joint.groove_width  ?? undefined,
    joint_backing:       joint.backing       ?? undefined,
    joint_retainer:      joint.retainer      ?? undefined,

    base_material_spec:       base.material_spec         ?? undefined,
    base_material_type_grade: base.type_grade            ?? undefined,
    base_material_pno:        base.p_no                  ?? undefined,
    base_material_heat_no:    base.heat_no               ?? undefined,
    test_coupon_thickness:    base.test_coupon_thickness ?? undefined,
    test_coupon_diameter:     base.test_coupon_diameter  ?? undefined,

    filler_sfa_spec:      filler.sfa_spec             ?? undefined,
    filler_fno:           filler.f_no                 ?? undefined,
    filler_ano:           filler.a_no                 ?? undefined,
    filler_feed_rate:     filler.feed_rate            ?? undefined,
    weld_metal_thickness: filler.weld_metal_thickness ?? undefined,

    gas_shielding:    gas.shielding   ?? undefined,
    gas_trailing:     gas.trailing    ?? undefined,
    gas_backing:      gas.backing     ?? undefined,
    gas_composition:  gas.composition ?? undefined,
    gas_flow_rate:    gas.flow_rate   ?? undefined,

    elec_current_type:           elec.current_type            ?? undefined,
    elec_polarity:                elec.polarity                 ?? undefined,
    elec_current_range:           elec.current_range            ?? undefined,
    elec_voltage_range:           elec.voltage_range            ?? undefined,
    elec_travel_speed:            elec.travel_speed             ?? undefined,
    elec_heat_input:              elec.heat_input               ?? undefined,
    elec_tungsten_electrode_size: elec.tungsten_electrode_size  ?? undefined,

    tech_bead_type:              tech.bead_type              ?? undefined,
    tech_oscillation:            tech.oscillation            ?? undefined,
    tech_pass_type:              tech.pass_type              ?? undefined,
    tech_multi_single_layer:     tech.multi_single_layer     ?? undefined,
    tech_multi_single_electrode: tech.multi_single_electrode ?? undefined,
    tech_back_gouging:           tech.back_gouging           ?? undefined,
    tech_contact_tube_distance:  tech.contact_tube_distance  ?? undefined,
    tech_orifice_gas_cup_size:   tech.orifice_gas_cup_size   ?? undefined,
    tech_cleaning_method:        tech.cleaning_method        ?? undefined,
    tech_electrode_spacing:      tech.electrode_spacing      ?? undefined,
    tech_change_of_process:      tech.change_of_process      ?? undefined,
    tech_peening:                tech.peening                ?? undefined,
    tech_transfer_mode:          tech.transfer_mode          ?? undefined,
    tech_torch_orifice_dia:      tech.torch_orifice_dia      ?? undefined,
    tech_filler_metal_delivery:  tech.filler_metal_delivery  ?? undefined,
    tech_use_of_thermal_process: tech.use_of_thermal_process ?? undefined,

    weld_passes:   passes.length   ? passes   : undefined,
    tensile_tests: tensile.length  ? tensile  : undefined,

    approved_by:    wps.approved_by  ?? undefined,
    reviewed_by:    wps.reviewed_by  ?? undefined,
    revision:       wps.revision,
    effective_date: wps.effective_date ?? undefined,
    notes:          wps.notes         ?? undefined,
  }
}
