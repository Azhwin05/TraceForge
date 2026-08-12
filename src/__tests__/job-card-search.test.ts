import { buildJobCardSearchFilter } from "@/lib/search/job-card-filters"

/**
 * Regression tests for the Job Cards search.
 *
 * The reported bug: typing a client name ("ampo") into the Job Cards list
 * returned "No results found" for jobs that plainly exist, because the table's
 * filter was bound to the jc_number column of the rows already on screen.
 * These assert the filter now reaches client name, every text column, and tags.
 */

type Stub = {
  clientRows?: { id: string }[]
  clientError?: unknown
  tagsSupported?: boolean
}

function makeSupabase({ clientRows = [], clientError = null, tagsSupported = true }: Stub) {
  const calls: { table: string; cols: string }[] = []
  return {
    calls,
    from(table: string) {
      return {
        select(cols: string) {
          calls.push({ table, cols })
          return {
            // job_cards.tags probe
            limit: () =>
              Promise.resolve(
                table === "job_cards"
                  ? {
                      data: tagsSupported ? [] : null,
                      error: tagsSupported ? null : { message: "column job_cards.tags does not exist" },
                    }
                  : { data: clientRows, error: clientError },
              ),
            ilike: () => ({
              limit: () => Promise.resolve({ data: clientRows, error: clientError }),
            }),
          }
        },
      }
    },
  }
}

describe("buildJobCardSearchFilter", () => {
  let warnSpy: jest.SpyInstance
  let errorSpy: jest.SpyInstance
  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {})
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
  })
  afterEach(() => { warnSpy.mockRestore(); errorSpy.mockRestore() })

  it("returns null for terms shorter than two characters", async () => {
    expect(await buildJobCardSearchFilter(makeSupabase({}), "a")).toBeNull()
    expect(await buildJobCardSearchFilter(makeSupabase({}), " ")).toBeNull()
  })

  it("searches every job-card text column", async () => {
    const f = (await buildJobCardSearchFilter(makeSupabase({}), "valve"))!
    for (const col of [
      "jc_number", "nbdn_number", "description",
      "po_number", "drawing_number", "heat_number", "part_number",
    ]) {
      expect(f).toContain(`${col}.ilike."%valve%"`)
    }
  })

  it("includes matching clients by id — the bug that made 'ampo' find nothing", async () => {
    const supabase = makeSupabase({ clientRows: [{ id: "c1" }, { id: "c2" }] })
    const f = (await buildJobCardSearchFilter(supabase, "ampo"))!
    expect(f).toContain("client_id.in.(c1,c2)")
  })

  it("omits the client clause when no client name matches", async () => {
    const f = (await buildJobCardSearchFilter(makeSupabase({ clientRows: [] }), "zzz"))!
    expect(f).not.toContain("client_id.in.")
  })

  it("still searches text columns when the client lookup fails", async () => {
    const supabase = makeSupabase({ clientError: { message: "boom" } })
    const f = (await buildJobCardSearchFilter(supabase, "valve"))!
    expect(f).toContain('jc_number.ilike."%valve%"')
    expect(f).not.toContain("client_id.in.")
    expect(errorSpy).toHaveBeenCalled()
  })

  it("matches tags for simple terms", async () => {
    const f = (await buildJobCardSearchFilter(makeSupabase({}), "Urgent"))!
    // Lowercased to match how updateJobCardTags normalises them on write.
    expect(f).toContain('tags.cs.{"urgent"}')
  })

  it("skips the tag clause for terms with characters that would break the filter", async () => {
    const f = (await buildJobCardSearchFilter(makeSupabase({}), "a,b"))!
    expect(f).not.toContain("tags.cs.")
  })

  it("quotes values so a comma cannot split the filter", async () => {
    const f = (await buildJobCardSearchFilter(makeSupabase({}), "Valve, 6 inch"))!
    // The term must sit inside quotes; an unquoted comma would be read as a
    // filter separator and the query would fail outright.
    expect(f).toContain('jc_number.ilike."%Valve, 6 inch%"')
  })

  it("escapes LIKE wildcards so they are matched literally", async () => {
    const f = (await buildJobCardSearchFilter(makeSupabase({}), "100%"))!
    expect(f).toContain('jc_number.ilike."%100\\\\%%"')
  })
})
