"use client"

import { useState } from "react"
import { ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StockTransferDialog } from "@/components/inventory/stock-transfer-dialog"

type LocationOption = { id: string; code: string; name: string }

/**
 * Per-location "Transfer" trigger on the Item Detail page. Stock Transfer
 * already existed, but only from /inventory/stock — an item's own page (where
 * a client reported being unable to change an item's storage location at
 * all) had no path to it whatsoever. Pre-fills both the item and the source
 * location, so this is a one-click "move this specific parcel elsewhere"
 * action rather than a blank form.
 */
export function ItemLocationTransferButton({
  item,
  fromLocationId,
  locations,
  balances,
}: {
  item: { id: string; item_code: string; item_name: string; uom: string }
  fromLocationId: string
  locations: LocationOption[]
  balances: { item_id: string; storage_location_id: string; balance_qty: number }[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ArrowLeftRight className="h-3.5 w-3.5" />
        Transfer
      </Button>
      <StockTransferDialog
        open={open}
        onOpenChange={setOpen}
        items={[item]}
        locations={locations}
        balances={balances}
        initialItemId={item.id}
        initialFromLocationId={fromLocationId}
      />
    </>
  )
}
