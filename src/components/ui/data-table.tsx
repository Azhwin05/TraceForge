"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Search, ChevronLeft, ChevronRight, SearchX } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  pageSize?: number
  /** Noun for the row-count line, e.g. "job card". Pluralised automatically. */
  noun?: string
  emptyTitle?: string
  emptyDescription?: string
  /** Widest the table may shrink before it scrolls sideways instead of crushing. */
  minWidthClassName?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search…",
  pageSize = 20,
  noun = "record",
  emptyTitle = "Nothing to show",
  emptyDescription,
  minWidthClassName = "min-w-[56rem]",
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
    initialState: { pagination: { pageSize } },
  })

  const search = (table.getColumn(searchKey ?? "")?.getFilterValue() as string) ?? ""
  const filtered = table.getFilteredRowModel().rows.length
  const rows = table.getRowModel().rows
  const { pageIndex } = table.getState().pagination
  const pageCount = table.getPageCount()

  return (
    <div className="space-y-3">
      {searchKey && (
        <div className="relative max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
            className="pl-8"
            aria-label={searchPlaceholder}
          />
        </div>
      )}

      {/* The gradient is a scroll affordance: on narrow screens the table runs
          past the right edge, and without it there is nothing to suggest so. */}
      <div className="relative overflow-hidden rounded-lg border border-border bg-card">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-20 w-8 bg-gradient-to-l from-card to-transparent lg:hidden"
        />
        {/* min-width forces sideways scrolling on narrow screens; without it the
            table obeys w-full and crushes ten columns into a phone. */}
        <Table
          stickyHeader
          className={minWidthClassName}
          containerClassName="max-h-[70vh] overflow-y-auto"
        >
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="bg-surface-sunken hover:bg-surface-sunken">
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="py-14">
                  <div className="flex flex-col items-center text-center">
                    <span
                      aria-hidden
                      className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground"
                    >
                      <SearchX className="h-5 w-5" />
                    </span>
                    <p className="text-md font-semibold text-foreground">
                      {search ? `No matches for “${search}”` : emptyTitle}
                    </p>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      {search
                        ? "Check the spelling, or clear the search to see everything."
                        : emptyDescription}
                    </p>
                    {search && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-4"
                        onClick={() => table.getColumn(searchKey!)?.setFilterValue("")}
                      >
                        Clear search
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="tabular">
          {filtered.toLocaleString()} {noun}
          {filtered === 1 ? "" : "s"}
          {filtered !== data.length && ` of ${data.length.toLocaleString()}`}
        </span>

        {pageCount > 1 && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft />
            </Button>
            <span className={cn("px-1 tabular")}>
              Page {pageIndex + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
