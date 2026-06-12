"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")
  return { supabase, user }
}

export async function acknowledgeAlert(alertId: string): Promise<{ error?: string }> {
  const { supabase, user } = await getUser()
  const { error } = await supabase
    .from("alerts")
    .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: user.id })
    .eq("id", alertId)
  if (error) return { error: error.message }
  revalidatePath("/alerts")
  return {}
}
