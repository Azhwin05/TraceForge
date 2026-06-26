# ValveTrack ERP - AI Engineering Context Document
## How to Write Production Code in This Codebase

---

## Part 1: Engineering Philosophy

### Core Principles

**1. Server-First Architecture**
- All business logic lives on the server (Next.js Server Actions)
- Client is smart UI + data presentation layer only
- The server is the single source of truth
- Client-side calculations are for UX optimization only, never for security/validation

**2. Database-Level Enforcement**
- RLS policies are the *primary* security mechanism
- The database refuses unauthorized operations; app doesn't check and then deny
- `current_role_name()` SQL function validates role at query time
- This means: no auth failure = no bad data can ever enter the system

**3. Explicit Over Implicit**
- Roles are explicitly checked with `STATUS_ALLOWED_ROLES` mapping
- Every state transition has a list of roles that can perform it
- No "guess if user can do this" — explicit checks everywhere
- TypeScript strict mode catches type errors; no `any`

**4. Fail-Fast Philosophy**
- Validation errors return immediately with clear messages
- No attempting partial operations
- If Zod validation fails, return error — don't continue
- If UUID is invalid, reject before touching database

**5. Immutability Where It Matters**
- Audit log is truly immutable (SECURITY DEFINER trigger only writer)
- Job card status transitions create audit records via triggers, not app code
- This prevents "forget to log" bugs
- Data history is guaranteed

**6. Minimal Abstraction**
- No ORM — direct Supabase client queries
- No query builders — write `.from()/.select()/.insert()` directly
- Three similar functions are better than premature extraction
- Don't build for hypothetical future use cases

**7. Composition Over Inheritance**
- React components composed from smaller pieces
- Tables are composed from shared column definitions + row data
- Forms are composed from Zod schema + React Hook Form + Tailwind UI
- No class hierarchies; functional composition

**8. Performance by Default**
- Server Components by default (zero JS shipped)
- Client Components only where interactivity needed
- React Query handles all async state
- Pagination built into every list (25 records/page standard)
- Skeletons on every page (no UI freeze on nav)

---

## Part 2: Repository Organization Rationale

### Why `src/app/` (Next.js App Router)

```
src/app/
├── (auth)/                  # Route group: no sidebar, no session checks
│   └── login/               # Public login page
├── (app)/                   # Route group: sidebar layout, session required
│   ├── job-cards/           # Feature: Job card CRUD + detail view
│   ├── pmi-reports/         # Feature: PMI inspection module
│   ├── layout.tsx           # Shared layout: header + sidebar + auth guard
│   └── error.tsx            # Global error boundary for app routes
└── api/                      # API routes (server-only)
    └── {module}/[id]/generate/   # PDF generation endpoints
```

**Rationale for route groups**:
- `(auth)` has no sidebar, no session check — login page is public
- `(app)` all share one layout with header/sidebar/auth check
- Layout boundary is at the route group level, not a separate component
- This prevents accidentally showing sidebar on login page

### Why `src/components/`

```
src/components/
├── layout/              # Sidebar, header, breadcrumbs, navigation
├── ui/                  # shadcn components: Button, Input, Dialog, etc.
├── providers/           # QueryProvider, ThemeProvider
├── job-cards/           # Job card-specific: list, detail, forms
├── pmi-reports/         # PMI-specific: list, detail, readings table
├── dimension-reports/   # Dimension-specific components
└── ...{module}/ dirs    # Each module owns its components
```

**Why by module**:
- Components tied to a feature stay with that feature
- Shared components go in `ui/` or `layout/`
- Prevents reaching across feature boundaries
- Import pattern: `@/components/job-cards/JobCardForm.tsx`

### Why `src/lib/`

```
src/lib/
├── auth.ts              # requireAuth(), requireRole(), session logic
├── security.ts          # UUID validation, HTML escaping, LIKE escaping
├── email.ts             # Email template functions
├── env.ts               # Startup env var validation
├── rate-limit.ts        # In-process rate limiter
├── supabase/            # Client instances (server + client)
├── validations/         # Zod schemas per feature
└── utils.ts             # Reusable helpers (cn, etc.)
```

**Rationale**:
- Utilities that can be imported by multiple parts of the codebase
- NOT feature-specific (those stay in components/)
- Ordered by criticality: auth first, then security, then data, then helpers

### Why `src/types/database.ts` (Not `src/types/`)`

This file is *generated* from Supabase (or hand-written to match schema):

```typescript
export type JobCard = Database["public"]["Tables"]["job_cards"]["Row"]
export type PmiReport = Database["public"]["Tables"]["pmi_reports"]["Row"]
// ... one type per table
```

**Why single file**:
- All database types in one place = single source of truth
- Easy to find: "what's the shape of a job card?"
- Matches Supabase generation pattern
- If types are split across multiple files, they diverge from DB

---

## Part 3: Component Architecture & Patterns

### Base Component Pattern: Shadcn Components

Located in `src/components/ui/`:

```typescript
// Button.tsx (Example: NOT created, inherited from shadcn)
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        // ... more variants
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

**Pattern**:
- Use `cva` (class-variance-authority) for variant definitions
- Use `cn()` to merge classNames (handles tailwind-merge)
- Forward refs for DOM access
- All UI components are presentational; no logic

### Feature Component Pattern: Job Card Form

**File**: `src/components/job-cards/JobCardForm.tsx`

```typescript
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { createJobCard } from "@/app/(app)/job-cards/actions"
import { createJobCardSchema } from "@/lib/validations/job-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

// Component is Client, but action is Server
export function JobCardForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createJobCardSchema),
  })

  async function onSubmit(data) {
    setIsSubmitting(true)
    
    // Call server action (type-safe: data is validated by Zod)
    const result = await createJobCard(data)
    
    if (result.error) {
      toast.error(result.error)
      setIsSubmitting(false)
      return
    }

    toast.success("Job card created")
    router.push(`/job-cards/${result.id}`)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <input {...register("jc_number")} />
        {errors.jc_number && (
          <p className="text-sm text-destructive">{errors.jc_number.message}</p>
        )}
      </div>
      {/* ... more fields ... */}
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create
      </Button>
    </form>
  )
}
```

**Pattern**:
- React Hook Form for form state (not useState for each field)
- Zod for validation (both schema and type inference)
- Server Action is imported and called directly (no API fetch)
- Errors are returned as `{ error?: string; data?: T }`
- Toast for feedback
- No data fetching inside component (see React Query pattern below)

### Data Display Component: Table

**Pattern**: Tables follow a specific structure with React Table:

```typescript
// src/components/tables/JobCardTable.tsx
"use client"

import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
} from "@tanstack/react-table"
import { JobCard } from "@/types/database"

interface JobCardTableProps {
  data: JobCard[]
  columns: ColumnDef<JobCard>[]
}

export function JobCardTable({ data, columns }: JobCardTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="rounded-lg border">
      <table className="w-full">
        <thead>
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="px-4 py-2 text-left">
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="border-t">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-4 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

**Column Definition Pattern**:

```typescript
// src/app/(app)/job-cards/columns.tsx
import { ColumnDef } from "@tanstack/react-table"
import { JobCard } from "@/types/database"

export const jobCardColumns: ColumnDef<JobCard>[] = [
  {
    accessorKey: "jc_number",
    header: "JC Number",
    cell: ({ row }) => (
      <Link href={`/job-cards/${row.original.id}`}>
        {row.original.jc_number}
      </Link>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge status={row.original.status} />
    ),
  },
  // ... more columns
]
```

**Pattern**:
- Columns defined as separate export (reusable, testable)
- React Table is headless (we build UI from scratch)
- Cell renders use `row.original` to access full row data
- Pagination handled at page level, not in component

### Layout Components

**App Layout**: `src/app/(app)/layout.tsx`

```typescript
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // SERVER COMPONENT: fetch data server-side
  const session = await getSessionWithProfile()
  if (!session) redirect("/login")

  const { user, profile } = session
  if (!profile?.is_active) redirect("/login")

  return (
    <div className="flex min-h-screen">
      <AppSidebar role={profile.role} />
      <div className="flex-1 flex flex-col">
        <AppHeader email={user.email} fullName={profile.full_name} role={profile.role} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
```

**Pattern**:
- Layouts are SERVER components by default
- Authentication checked here (redirect if not logged in)
- Props to child layouts/pages passed server-side
- Headers set here (metadata, canonical URLs)

### Loading State Component: Skeleton Pattern

Every page has a `loading.tsx`:

```typescript
// src/app/(app)/job-cards/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>
      <div className="rounded-xl border overflow-hidden">
        <div className="border-b border-border px-4 py-3 flex gap-6">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="border-b border-border px-4 py-3.5 flex gap-6">
            {Array.from({ length: 7 }).map((_, j) => (
              <Skeleton key={j} className="h-4 w-20" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
```

**Pattern**:
- Skeleton matches the actual UI shape
- Shows while Server Component is fetching
- Prevents UI freeze on navigation
- Required on every page that has async data

---

## Part 4: Server Action Patterns

### Standard Server Action Structure

**File**: `src/app/(app)/job-cards/actions.ts`

**Pattern**:

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { requireAuth, requireRole } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"

// 1. Define role permissions at top of file
const STATUS_ALLOWED_ROLES: Record<JobCardStatus, UserRole[]> = {
  created: ["admin", "operator"],
  // ... more states ...
}

// 2. Export async server function
export async function createJobCard(
  data: CreateJobCardInput
): Promise<{ error?: string; id?: string }> {
  // 3. Check authentication immediately
  const guard = await requireRole(["admin", "operator"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  // 4. Validate input (Zod handles this before it gets here in forms,
  //    but always validate for direct API calls)
  try {
    const validated = createJobCardSchema.parse(data)
  } catch (e) {
    return { error: "Invalid input" }
  }

  // 5. Business logic: call Supabase
  const { data: result, error } = await supabase
    .from("job_cards")
    .insert({
      jc_number: validated.jc_number,
      // ... fields ...
    })
    .select()
    .single()

  // 6. Error handling: sanitize before returning
  if (error) {
    console.error("[job-cards] createJobCard:", error)
    return { error: sanitizeError(error) }
  }

  // 7. Cache invalidation: revalidate paths that depend on this data
  revalidatePath("/job-cards")
  revalidatePath("/dashboard")

  // 8. Return success with minimal data
  return { id: result.id }
}
```

**Error Response Pattern**:

Every Server Action returns `{ error?: string; data?: T }`:

```typescript
// Success
return { id: jobCard.id }

// Error
return { error: "Job card not found" }

// Component checks:
const result = await createJobCard(data)
if (result.error) {
  toast.error(result.error)
  return
}
// result.id exists here
```

### Authorization Pattern with Role Mapping

```typescript
// At top of actions.ts file, define what roles can do what
const STATUS_ALLOWED_ROLES: Record<JobCardStatus, UserRole[]> = {
  created: ["admin", "operator"],
  wps_pending: ["admin", "operator", "engineer"],
  wps_uploaded: ["admin", "qa"],
  // ... explicit mapping for each state ...
}

// In the action:
export async function updateJobCardStatus(
  id: string,
  newStatus: JobCardStatus
): Promise<{ error?: string }> {
  const { profile, supabase } = await requireAuth()
  const role = profile.role as UserRole

  // Explicit role check against the mapping
  const allowedRoles = STATUS_ALLOWED_ROLES[newStatus]
  if (!allowedRoles?.includes(role)) {
    return { error: "Unauthorized: cannot transition to this status" }
  }

  // Proceed with database operation (RLS will double-check)
  // ...
}
```

**Pattern**:
- Role check happens in application code
- RLS in database is the second layer of defense
- Never rely on just RLS (need application-level feedback)
- Never skip RLS (database is the ultimate truth)

### Idempotency Pattern

For critical operations (approvals, payments), check state before mutating:

```typescript
export async function approvePmiReport(
  reportId: string
): Promise<{ error?: string }> {
  const { supabase } = await requireRole(["qa", "admin"])

  // Fetch current state
  const { data: current } = await supabase
    .from("pmi_reports")
    .select("pmi_status")
    .eq("id", reportId)
    .single()

  // Check: already approved?
  if (current?.pmi_status === "approved") {
    return { error: "Report already approved" }
  }

  // Check: already submitted?
  if (current?.pmi_status === "submitted") {
    return { error: "Cannot approve submitted report" }
  }

  // Safe to approve now
  const { error } = await supabase
    .from("pmi_reports")
    .update({
      pmi_status: "approved",
      approved_at: new Date().toISOString(),
      approved_by_name: profile.full_name,
    })
    .eq("id", reportId)

  if (error) return { error: sanitizeError(error) }

  revalidatePath("/pmi-reports")
  return {}
}
```

**Pattern**:
- Always fetch current state first
- Check preconditions before mutating
- Return error if precondition fails (idempotent: safe to retry)
- Only mutate if safe

---

## Part 5: Database Access Patterns

### Query Pattern with Supabase

```typescript
// Basic select
const { data, error } = await supabase
  .from("job_cards")
  .select("id, jc_number, status, created_at")
  .eq("id", jobCardId)
  .single()

// List with pagination
const PAGE_SIZE = 25
const page = 1
const from = (page - 1) * PAGE_SIZE
const to = from + PAGE_SIZE - 1

const { data, count } = await supabase
  .from("job_cards")
  .select("*", { count: "exact" })
  .range(from, to)

// Filtering
const { data } = await supabase
  .from("job_cards")
  .select("*")
  .eq("status", "created")
  .eq("client_id", clientId)

// Searching (with LIKE injection prevention)
const term = escapeLike(searchTerm)  // Escape %, _, \ first!
const { data } = await supabase
  .from("job_cards")
  .select("*")
  .ilike("jc_number", `%${term}%`)
```

**Pattern**:
- Chain methods for readability
- Use `.single()` for one row (errors if 0 or 2+ rows)
- Use `.maybeSingle()` for optional row (returns null if 0 rows)
- Always destructure `{ data, error }`
- Check `error` before using `data`
- Use `.range(from, to)` for pagination (not `.limit()` + `.offset()`)

### Insert Pattern

```typescript
const { data: jobCard, error } = await supabase
  .from("job_cards")
  .insert({
    jc_number: "JC/2026/001",
    client_id: clientId,
    nbdn_number: "NBDN-2026-001",
    description: "Work order",
    quantity: 5,
    process_type: ["welding"],  // Array type
    status: "created",
    created_by: user.id,
  })
  .select()        // Required: return inserted row
  .single()        // Required: we inserted one row

if (error) return { error: sanitizeError(error) }
return { id: jobCard.id }
```

**Pattern**:
- `.select()` after insert to get generated fields (id, timestamps)
- `.single()` when inserting one row
- Always include `created_by` and timestamps
- Let database defaults handle nullable fields (`|| null`)

### Update Pattern

```typescript
const { error } = await supabase
  .from("job_cards")
  .update({
    status: "wps_pending",
    updated_at: new Date().toISOString(),  // Manual: trigger should do it, but explicit here
  })
  .eq("id", jobCardId)

if (error) return { error: sanitizeError(error) }
revalidatePath("/job-cards")
return {}
```

**Pattern**:
- `.eq()` for where clauses (single condition)
- Return nothing on success (just `{}` or `{ success: true }`)
- Revalidate caches after mutation
- Let database triggers handle audit logs and computed fields

### Many-to-One Relationships

```typescript
const { data: pmiReport } = await supabase
  .from("pmi_reports")
  .select(`
    id,
    readings,
    created_at,
    job_cards ( jc_number, client_id )
  `)
  .eq("id", reportId)
  .single()

// Access: pmiReport.job_cards.jc_number
```

**Pattern**:
- Use backticks for template strings with relationships
- Nested tables retrieved as objects
- Limit selected columns to what you need

---

## Part 6: Validation Strategy

### Zod Schema Pattern

Located in `src/lib/validations/{feature}.ts`:

```typescript
import { z } from "zod"

// Basic schema
export const createJobCardSchema = z.object({
  client_id: z.string().uuid("Must be a valid client"),
  nbdn_number: z.string().min(1, "NBDN number required").max(100),
  quantity: z.number().int("Quantity must be whole number").min(1),
  process_type: z
    .array(z.enum(["welding", "machining", "cladding", "overlay"]))
    .min(1, "Select at least one process"),
})

// Type inference
export type CreateJobCardInput = z.infer<typeof createJobCardSchema>

// Reusable sub-schemas
const addressSchema = z.object({
  street: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
})

export const createClientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  address: addressSchema.optional(),
})

// Custom validations
export const approveReportSchema = z.object({
  reportId: z.string().uuid(),
}).refine(
  async (data) => {
    // Custom async validation if needed
    return true
  },
  { message: "Validation failed" }
)
```

**Pattern**:
- One file per feature (job-card.ts, pmi-report.ts)
- Export both schema and inferred type
- Use `.optional()` for optional fields
- Use `.or(z.literal(""))` for "empty string is treated as undefined"
- `.min()` / `.max()` for string length
- `.min(1)` for arrays to ensure non-empty

### Using Zod in Forms

```typescript
// In React Hook Form:
const {
  register,
  formState: { errors },
} = useForm({
  resolver: zodResolver(createJobCardSchema),  // Validates on submit
})

// In Server Actions:
export async function createJobCard(data: unknown): Promise<...> {
  try {
    const validated = createJobCardSchema.parse(data)  // Throws if invalid
    // Use validated data
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { error: e.errors[0].message }
    }
    return { error: "Validation failed" }
  }
}

// Or with safeParse (no throw):
const result = createJobCardSchema.safeParse(data)
if (!result.success) {
  return { error: result.error.errors[0].message }
}
const validated = result.data
```

---

## Part 7: Security Patterns

### Authentication Pattern

Located in `src/lib/auth.ts`:

```typescript
import { createClient } from "@/lib/supabase/server"

// Guards for routes/actions
export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) redirect("/login")  // Force login
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile || !profile.is_active) redirect("/login?error=disabled")
  
  return { user, profile, supabase }
}

export async function requireRole(allowedRoles: UserRole[]) {
  const { user, profile, supabase } = await requireAuth()
  
  if (!allowedRoles.includes(profile.role)) {
    return { error: "You don't have permission" }  // Don't redirect; return error
  }
  
  return { user, profile, role: profile.role, supabase, error: null }
}
```

**Pattern**:
- `requireAuth()` for "must be logged in"
- `requireRole()` for "must have specific role"
- Redirect on auth failure, return error on auth success + bad role
- Always include `supabase` client in return (for follow-up queries)

### UUID Validation Pattern

```typescript
import { isValidUUID } from "@/lib/security"

export async function getPmiReport(id: string) {
  // Validate UUID format before touching database
  if (!isValidUUID(id)) {
    return { error: "Invalid report ID" }
  }

  const { data } = await supabase
    .from("pmi_reports")
    .select("*")
    .eq("id", id)
    .single()

  // ...
}

// In API routes:
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!isValidUUID(params.id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  }
  // ...
}
```

**Pattern**:
- Validate UUID before any database operation
- Prevents malformed queries
- Clear error message to client

### LIKE Injection Prevention

```typescript
import { escapeLike } from "@/lib/security"

export async function searchJobCards(term: string) {
  // Always escape before using with .ilike()
  const escaped = escapeLike(term)
  
  const { data } = await supabase
    .from("job_cards")
    .select("*")
    .ilike("jc_number", `%${escaped}%`)
}

// What it does:
// Input: "JC/2026%_1" (user accidentally types %)
// Escaped: "JC/2026\\%\\_1" (% and _ are literal, not wildcards)
// Query: .ilike("jc_number", "%JC/2026\%\_1%")  // Searches for literal "%_"
```

**Pattern**:
- Always call `escapeLike()` on user input before `.ilike()`
- Escapes: `\`, `%`, `_`
- Treats special chars as literal instead of wildcards

### HTML Escaping in Email Templates

```typescript
import { escapeHtml } from "@/lib/security"

export async function sendAlert(email: string, jobCardNumber: string) {
  const safeNumber = escapeHtml(jobCardNumber)  // Escape `<>"'&
  
  const html = `
    <p>Job card <strong>${safeNumber}</strong> needs attention.</p>
  `
  
  await resend.emails.send({
    from: "noreply@valvetrack.com",
    to: email,
    html,
  })
}

// What it does:
// Input: "<script>alert('xss')</script>"
// Escaped: "&lt;script&gt;alert('xss')&lt;/script&gt;"
// Email renders as: <script>alert('xss')</script> (literal text, not code)
```

**Pattern**:
- All user-supplied strings in email templates must be escaped
- Escapes: `<`, `>`, `"`, `'`, `&`
- Makes XSS injection impossible

### Error Sanitization

```typescript
import { sanitizeError } from "@/lib/security"

try {
  const { data, error } = await supabase.from("job_cards").insert(...)
  if (error) {
    // Never return error.message directly
    console.error("Insert failed:", error)  // Log full error server-side
    return { error: sanitizeError(error) }  // Return generic error to client
  }
} catch (e) {
  console.error("Unexpected error:", e)
  return { error: sanitizeError(e) }
}

// What it does:
// Postgres error: "duplicate key value violates unique constraint \"job_cards_jc_number_key\""
// Sanitized: "An error occurred. Please try again."
// 
// This prevents leaking:
// - Table names (job_cards)
// - Column names (jc_number)
// - Constraint details
```

**Pattern**:
- Always catch and sanitize Postgres errors before returning to client
- Log full error server-side with `console.error("[context]", error)`
- Return generic message to client
- Prevents information disclosure

---

## Part 8: Error Handling Philosophy

### Error Response Pattern

All Server Actions return the same shape:

```typescript
// Success (no error field)
{ id: "uuid", data: {...} }

// Error (no data field)
{ error: "Human-readable message" }

// Client code:
const result = await createJobCard(data)
if (result.error) {
  toast.error(result.error)
  return
}
// TypeScript knows result.id exists here (safe to use)
```

**Why this pattern**:
- Can't have both success and error (force handling)
- TypeScript narrows types based on error presence
- Client code must acknowledge error before using data

### Toast Notifications

```typescript
import { toast } from "sonner"

// Success
toast.success("Job card created")

// Error (from Server Action)
if (result.error) {
  toast.error(result.error)
}

// Info
toast.info("3 job cards updated")

// Loading (with promise)
toast.promise(
  createJobCard(data),
  {
    loading: "Creating job card...",
    success: "Job card created",
    error: (err) => err.message,
  }
)
```

**Pattern**:
- Sonner is the toast library
- Use `.error()` for failed operations
- Use `.success()` for completed operations
- Don't show stack traces (show `sanitizeError()` result)

### Database Error Prevention

Don't try/catch to prevent errors. Instead, validate:

```typescript
// ❌ BAD: Catch the error
try {
  const { error } = await supabase
    .from("job_cards")
    .update({ status: "invalid_status" })
    .eq("id", id)
  if (error) return { error: "Update failed" }
} catch (e) {
  // Database threw an error because "invalid_status" violates CHECK constraint
}

// ✅ GOOD: Validate before mutation
const validStatuses = ["created", "wps_pending", ...]
if (!validStatuses.includes(newStatus)) {
  return { error: "Invalid status" }
}

const { error } = await supabase
  .from("job_cards")
  .update({ status: newStatus })
  .eq("id", id)
```

**Pattern**:
- Validate at application boundary (never trust user input)
- Database errors mean programmer error (constraint violation)
- Client errors should be caught by validation, not database

---

## Part 9: React Query (State Management)

### QueryProvider Setup

Located in `src/components/providers/query-provider.tsx`:

```typescript
"use client"

import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { toast } from "sonner"

function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5,  // 5 minutes
            refetchOnWindowFocus: true,  // Sync across tabs
            retry: (failureCount, error) => {
              // Don't retry 401/403/404 (no point)
              if (error.status === 401 || error.status === 403 || error.status === 404) {
                return false
              }
              // Retry up to 2 times with backoff
              return failureCount < 2
            },
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
        queryCache: new QueryCache({
          onError: (error, query) => {
            // If we have existing data, show toast (background refetch error)
            if (query.state.data) {
              toast.error("Failed to sync data. Using cached version.")
            }
          },
        }),
        mutationCache: new MutationCache({
          onError: (error) => {
            // All mutations show error toast
            toast.error(error.message || "Operation failed")
          },
        }),
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools />}
    </QueryClientProvider>
  )
}

export { QueryProvider }
```

**Pattern**:
- One QueryClient provider at app root
- Smart retry logic (don't retry 401/403/404)
- Exponential backoff for retries
- Global error handling via MutationCache/QueryCache

### Using React Query in Components

```typescript
"use client"

import { useQuery } from "@tanstack/react-query"

function JobCardDetail({ id }: { id: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["job-cards", id],  // Unique key for this query
    queryFn: async () => {
      const response = await fetch(`/api/job-cards/${id}`)
      if (!response.ok) throw new Error("Failed to load")
      return response.json()
    },
    enabled: !!id,  // Don't fetch until id is ready
    staleTime: 1000 * 60 * 5,  // 5 minutes
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <div>{data.jc_number}</div>
}
```

**Pattern**:
- `queryKey` is array: [resource, filter1, filter2, ...]
- `enabled: !!id` skips fetch if dependencies aren't ready
- Use states: `isLoading`, `error`, `data`
- `staleTime` controls when data is considered fresh

### Mutations (Form Submission)

```typescript
// With Server Actions (no need for useMutation, just await)
async function handleSubmit(data) {
  const result = await createJobCard(data)
  if (result.error) {
    toast.error(result.error)
    return
  }
  
  // Invalidate related queries to refetch
  queryClient.invalidateQueries({ queryKey: ["job-cards"] })
  router.push(`/job-cards/${result.id}`)
}

// Or with useMutation (if not using Server Actions):
const mutation = useMutation({
  mutationFn: async (data) => {
    const response = await fetch("/api/job-cards", {
      method: "POST",
      body: JSON.stringify(data),
    })
    return response.json()
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["job-cards"] })
    toast.success("Created")
  },
})
```

**Pattern**:
- Server Actions are preferred (type-safe, simpler)
- After mutation, call `queryClient.invalidateQueries()` to refetch
- Let global MutationCache show error toast

---

## Part 10: Folder Organization by Feature

### Adding a New Feature: Complete Example

**Scenario**: Build a new "Heat Treatment Logs" feature.

#### 1. Database

Create migration: `supabase/migrations/0015_heat_treatment_logs.sql`

```sql
create table public.heat_treatment_logs (
  id uuid primary key default gen_random_uuid(),
  job_card_id uuid not null references public.job_cards (id) on delete cascade,
  furnace_id text not null,
  temperature_celsius numeric not null,
  duration_minutes integer not null,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.heat_treatment_logs enable row level security;

create policy "heat_treatment_logs_select_all" on public.heat_treatment_logs
  for select using (true);

create policy "heat_treatment_logs_admin_all" on public.heat_treatment_logs
  for all using (current_role_name() = 'admin')
  with check (current_role_name() = 'admin');

create policy "heat_treatment_logs_engineer_insert" on public.heat_treatment_logs
  for insert with check (current_role_name() = 'engineer');

create index idx_heat_treatment_logs_job_card on public.heat_treatment_logs (job_card_id);
```

#### 2. Validation

File: `src/lib/validations/heat-treatment.ts`

```typescript
import { z } from "zod"

export const createHeatTreatmentLogSchema = z.object({
  job_card_id: z.string().uuid(),
  furnace_id: z.string().min(1, "Furnace ID required"),
  temperature_celsius: z.number().min(0).max(1200),
  duration_minutes: z.number().int().min(1),
  notes: z.string().optional(),
})

export type CreateHeatTreatmentLogInput = z.infer<typeof createHeatTreatmentLogSchema>
```

#### 3. Server Actions

File: `src/app/(app)/heat-treatment/actions.ts`

```typescript
"use server"

import { revalidatePath } from "next/cache"
import { requireAuth, requireRole } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"
import { createHeatTreatmentLogSchema } from "@/lib/validations/heat-treatment"

export async function createHeatTreatmentLog(
  data: unknown
): Promise<{ error?: string; id?: string }> {
  const guard = await requireRole(["admin", "engineer"])
  if (guard.error) return { error: guard.error }
  const { supabase, user } = guard

  const validated = createHeatTreatmentLogSchema.parse(data)

  const { data: log, error } = await supabase
    .from("heat_treatment_logs")
    .insert({
      job_card_id: validated.job_card_id,
      furnace_id: validated.furnace_id,
      temperature_celsius: validated.temperature_celsius,
      duration_minutes: validated.duration_minutes,
      notes: validated.notes,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error("[heat-treatment]", error)
    return { error: sanitizeError(error) }
  }

  revalidatePath("/job-cards")
  return { id: log.id }
}
```

#### 4. Components

File: `src/components/heat-treatment/HeatTreatmentForm.tsx`

```typescript
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { createHeatTreatmentLog } from "@/app/(app)/heat-treatment/actions"
import { createHeatTreatmentLogSchema } from "@/lib/validations/heat-treatment"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function HeatTreatmentForm({ jobCardId }: { jobCardId: string }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(createHeatTreatmentLogSchema),
    defaultValues: { job_card_id: jobCardId },
  })

  async function onSubmit(data) {
    const result = await createHeatTreatmentLog(data)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Log created")
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("job_card_id")} />
      <Input {...register("furnace_id")} placeholder="Furnace ID" />
      {errors.furnace_id && <p className="text-sm text-destructive">{errors.furnace_id.message}</p>}
      {/* ... more fields ... */}
      <Button type="submit">Record Log</Button>
    </form>
  )
}
```

#### 5. Pages

File: `src/app/(app)/heat-treatment/page.tsx`

```typescript
import { requireAuth } from "@/lib/auth"
import { HeatTreatmentList } from "@/components/heat-treatment/HeatTreatmentList"

export default async function HeatTreatmentPage() {
  const { supabase } = await requireAuth()

  const { data: logs } = await supabase
    .from("heat_treatment_logs")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Heat Treatment Logs</h1>
      <HeatTreatmentList logs={logs || []} />
    </div>
  )
}
```

#### 6. Navigation

Update `src/components/layout/app-sidebar.tsx`:

```typescript
const NAV_GROUPS: NavGroup[] = [
  // ... existing groups ...
  {
    heading: "Operations",
    roles: ["admin", "engineer"],
    items: [
      { href: "/heat-treatment", label: "Heat Treatment", icon: Flame },
    ],
  },
]
```

#### 7. Types

Update `src/types/database.ts`:

```typescript
export type HeatTreatmentLog = Database["public"]["Tables"]["heat_treatment_logs"]["Row"]
```

**Summary**: Every new feature follows this path:
1. Database migration (with RLS)
2. Validation schema (Zod)
3. Server actions (business logic)
4. Components (UI)
5. Pages (routing)
6. Sidebar (navigation)
7. Types (database schema)

---

## Part 11: AI Constitution - 100 Coding Rules

These are rules that any AI (or human) writing code in this repo MUST follow:

### Authentication & Authorization

1. **Never bypass `requireAuth()`** — Every Server Action that touches user data must call `requireAuth()` or `requireRole()` first.
2. **Never assume a user is logged in** — Always check, always redirect if not.
3. **Never trust user role from client** — Always fetch `profile.role` from `profiles` table.
4. **Never mutate without role check** — Read operations can be lenient, but mutations require explicit role check.
5. **Never skip RLS** — Database RLS is the last line of defense; it must never be disabled or bypassed.
6. **RLS is not the first check** — Application code checks first (fast), RLS checks second (safety).
7. **Never return auth.users directly** — Always join with `profiles` to include role.
8. **Never allow `is_active = false` to access app** — Check this in layouts and Server Actions.
9. **Never store user ID from client** — Always get it from `getUser()` or `requireAuth()`.
10. **Never rely on JWT alone** — Also check `profiles.is_active` before allowing access.

### Database Access

11. **Always use Server Actions for mutations** — Never expose direct INSERT/UPDATE/DELETE to client.
12. **Always validate UUID before querying** — Use `isValidUUID(id)` before `.eq("id", id)`.
13. **Never write raw SQL** — Use Supabase client methods (`.from()/.select()/.insert()`, etc.).
14. **Always check error object** — `if (error)` after every database operation.
15. **Never assume single row exists** — Use `.single()` or `.maybeSingle()` explicitly.
16. **Always use `.select()` after insert** — Needed to get generated fields (id, timestamps).
17. **Never use `.limit()` for pagination** — Use `.range(from, to)` instead.
18. **Always pass `created_by: user.id`** — Log who created each record.
19. **Never store sensitive data in plaintext** — Use Supabase's built-in encryption or hash.
20. **Always add indexes for frequent queries** — If querying by a column often, index it.

### Validation

21. **Always use Zod for input validation** — No custom validation logic; centralize schemas.
22. **Never validate in the component** — Zod handles this; component only displays errors.
23. **Always define one schema per operation** — Create, update, delete, approve = different schemas.
24. **Never use `any` in schemas** — Be explicit: `z.string()`, `z.number()`, `z.array()`, etc.
25. **Always use `.parse()` before trusting data** — Even in Server Actions, re-validate.
26. **Never validate database defaults** — Let the database supply them.
27. **Always limit string length** — Use `.min(1).max(100)`.
28. **Never accept arbitrary JSON** — Use `.json()` with a schema, not `z.unknown()`.
29. **Always use `.or(z.literal(""))` for optional emails** — Users often leave fields blank instead of not filling them.
30. **Never allow empty arrays** — Use `.min(1, "Select at least one")`.

### Security

31. **Always sanitize errors before returning** — Use `sanitizeError()` on Postgres errors.
32. **Always escape HTML in email templates** — Use `escapeHtml()` on all user-supplied strings.
33. **Always escape LIKE wildcards** — Use `escapeLike()` before `.ilike()`.
34. **Never log sensitive data** — Log errors, not passwords or tokens.
35. **Always validate origin header** — Middleware does this; don't disable it.
36. **Never store signed URLs in responses** — Generate them on-demand in a `/generate-url/` endpoint.
37. **Never bypass rate limiting** — Login: 5/60s, API: 100/60s, generate: 10/hr.
38. **Always use HTTPS in production** — Configured in `next.config.mjs`.
39. **Never commit `.env` files** — Use `.env.example` and `.env.local`.
40. **Always use HTTP-only cookies for sessions** — Supabase handles this; don't disable it.
41. **Never accept arbitrary file types** — Validate MIME type server-side.
42. **Never trust client-sent file sizes** — Re-validate on server.
43. **Always scan files for viruses** — If accepting PDFs/images, scan them.
44. **Never expose internal error messages** — Sanitize before sending to client.
45. **Always hash passwords** — Supabase Auth does this; use it.
46. **Never store API keys in code** — Use environment variables.
47. **Always rotate secrets regularly** — Document the rotation process.
48. **Never commit secrets** — Even if deleted later, check git history.
49. **Always use parameterized queries** — Supabase client does this automatically.
50. **Never disable CSP headers** — Configured in `next.config.mjs`.

### State & Data Fetching

51. **Always use React Query for async state** — Never fetch inside Client Components.
52. **Always define queryKey as array** — `["resource", filterId, sortBy]`.
53. **Never hardcode stale times** — Use `staleTime: 1000 * 60 * 5` (5 min).
54. **Always invalidate queries after mutations** — Call `queryClient.invalidateQueries()`.
55. **Never skip `enabled: condition`** — Prevents fetching before data is ready.
56. **Always check `isLoading` state** — Show skeleton, not empty state, while loading.
57. **Never assume data exists** — Check `if (data)` before rendering.
58. **Always use Server Components by default** — Client Components only for `"use client"` features.
59. **Never fetch in Client Components** — Use Server Actions or API routes.
60. **Always cache Server Component results** — Use `revalidatePath()` after mutations.

### Components & UI

61. **Always use shadcn/ui components** — Don't create custom Button, Input, Dialog, etc.
62. **Always use `cn()` to merge classNames** — Handles Tailwind merging correctly.
63. **Never write inline styles** — Use Tailwind classes in className.
64. **Always create a `loading.tsx` file** — Prevents UI freeze on navigation.
65. **Never hardcode colors** — Use Tailwind semantic names (primary, destructive, etc.).
66. **Always make buttons accessible** — Add `aria-label` if no visible text.
67. **Never skip form labels** — Associate `<label>` with `<input>` by `htmlFor`.
68. **Always show error messages** — User needs to know why input was rejected.
69. **Never disable submit button without reason** — Only when validating or submitting.
70. **Always use Lucide React icons** — Consistent icon library.
71. **Never hardcode layout breakpoints** — Use Tailwind's responsive prefixes (sm:, md:, lg:).
72. **Always test with dark mode** — Check `.dark` variant of colors.

### Forms & Input

73. **Always use React Hook Form** — No useState for form fields.
74. **Always use `zodResolver`** — Validates on submit.
75. **Never validate on every keystroke** — React Hook Form waits for blur or submit.
76. **Always show field errors inline** — Below the input, in red.
77. **Never show all errors at once** — React Hook Form shows only first error per field.
78. **Always provide clear success feedback** — Use toast, not a silent redirect.
79. **Never assume form values are valid** — Server must re-validate with Zod.
80. **Always clear error when user retypes** — React Hook Form does this automatically.

### Server Actions

81. **Always start with `"use server"`** — First line of the file.
82. **Always return `{ error?: string; data?: T }`** — Consistent error handling.
83. **Never modify shared state** — Each Server Action is independent.
84. **Always use `revalidatePath()` after mutations** — Invalidates the cache.
85. **Never throw errors** — Return `{ error: message }` instead.
86. **Always console.error() with context** — `console.error("[feature]", error)`.
87. **Never log user input** — Redact sensitive data from logs.
88. **Always use `sanitizeError()` on Postgres errors** — Don't expose schema details.
89. **Never return database constraints to client** — Translate to user-friendly messages.
90. **Always check preconditions for idempotent ops** — Approve, reject, pay = check current state first.

### Testing & Quality

91. **Always write tests for validation schemas** — Zod schema tests in `src/__tests__/validations.test.ts`.
92. **Always run `npm test` before committing** — Catch regressions early.
93. **Never skip type checking** — Run `npx tsc --noEmit` in CI.
94. **Always test error paths** — Not just happy path.
95. **Never assume localhost in tests** — Use environment variables.

### Code Organization

96. **Always follow the folder structure** — Don't create new top-level folders.
97. **Always co-locate related files** — Form + schema + actions + components together.
98. **Never import across feature boundaries** — Each feature is self-contained.
99. **Always use absolute imports** — `@/components/...`, not `../../../components/...`.
100. **Never commit commented-out code** — Delete it; git history has it.

---

## Part 12: Anti-Patterns to Avoid

### Code Smells

1. **Massive components** (> 200 lines) — Split into smaller, composable pieces
2. **Business logic in UI** — Move to Server Actions / utils
3. **Duplicated validation** — Create one Zod schema, reuse everywhere
4. **Hardcoded values** — Use constants or environment variables
5. **Too many prop levels** — Use context or extract component
6. **Client-side auth checks** — Always check server-side
7. **Silent failures** — Always show error message to user
8. **Swallowing errors** — `catch (e) {}` — at least log it
9. **Manual JSON parsing** — Zod does this safely
10. **String concatenation for URLs** — Use `new URL()` or link builder

### Performance Anti-Patterns

11. **Fetching in Client Components** — Use Server Components
12. **Fetching on every render** — React Query handles memoization
13. **Large bundle sizes** — Use dynamic imports for heavy components
14. **Unoptimized images** — Use `<Image>` with width/height
15. **No pagination** — Always paginate lists (25 records/page)
16. **Re-fetching on window focus** — React Query does this; accept it
17. **No caching** — Set `staleTime` appropriately
18. **Infinite loops in useEffect** — Use dependency arrays correctly

### Security Anti-Patterns

19. **Logging user input** — Redact sensitive data
20. **Storing tokens in localStorage** — Use HTTP-only cookies
21. **Client-side encryption** — Encrypt on server
22. **Trusting user role** — Always fetch from database
23. **Skipping RLS** — Database is the final authority
24. **Returning raw Postgres errors** — Sanitize them
25. **Exposing internal structure** — No table/column names in errors
26. **Accepting arbitrary file uploads** — Validate MIME type, size, scan for viruses
27. **Building URLs with string concat** — Use URL constructor
28. **Trusting environment variables** — Validate them at startup
29. **Disabling CSP** — Keep security headers enabled
30. **Storing passwords in plaintext** — Supabase Auth hashes them

---

## Part 13: Repository Statistics

### Code Metrics

| Metric | Count |
|--------|-------|
| TypeScript/TSX files | 200+ |
| React Components | 100+ |
| Server Actions | 15+ |
| API Routes | 4 PDF generation + auth |
| Custom Hooks | 10+ |
| Zod Validation Schemas | 10+ |
| Database Tables | 22 |
| SQL Functions/Triggers | 10+ |
| RLS Policies | 30+ |
| Tests (Jest) | 41 assertions across 4 suites |
| Total LOC (src/) | ~15,000 |

### Largest Files (Need Refactoring?)

| File | Lines | Type |
|------|-------|------|
| `src/components/layout/app-sidebar.tsx` | 190 | Component |
| `src/lib/validations/*.ts` | 70–100 avg | Validation |
| `src/app/(app)/job-cards/actions.ts` | 150+ | Server Actions |
| `src/types/database.ts` | 500+ | Types (generated) |

### Most Reused Components

1. `Button` (shadcn) — used 100+ times
2. `Input` (shadcn) — used 80+ times
3. `Dialog` (shadcn) — used 20+ times
4. `Skeleton` — used in every `loading.tsx`
5. `JobCardTable` — job card list view
6. `StatusBadge` — status indicator across all modules

### Test Coverage

- **security.test.ts** — 25 assertions on validation utils
- **validations.test.ts** — 11 assertions on Zod schemas
- **rate-limit.test.ts** — 5 assertions on rate limiter
- **env.test.ts** — 4 assertions on env validation
- **E2E tests** — 0% (not yet implemented)
- **Component tests** — 0% (not yet implemented)

---

## Part 14: AI MEMORY (For Future Assistants)

This section is optimized for the next AI assistant working on this codebase.

### Architecture Summary

**ValveTrack** is a manufacturing ERP for valve quality tracking. **Stack**: Next.js 14 App Router + React 18 Server Components, TypeScript strict, Tailwind + shadcn/ui, Supabase (PostgreSQL + RLS), Zod validation, React Query, Server Actions (no REST API).

**Key pattern**: Server-first. All business logic in Server Actions (`"use server"`), client is pure UI + data display. Database RLS enforces permissions at query level. Every table has RLS policies. Auth is Supabase JWT + `profiles` table for role. Error handling: return `{ error?: string }` from actions, never throw.

### Code Patterns (Copy-Paste Ready)

**Server Action template**:
```typescript
"use server"
import { requireAuth } from "@/lib/auth"
import { sanitizeError } from "@/lib/security"

export async function doSomething(data: unknown) {
  const guard = await requireRole(["admin"])
  if (guard.error) return { error: guard.error }
  
  try {
    // Validate, query, mutate
  } catch (e) {
    console.error("[feature]", e)
    return { error: sanitizeError(e) }
  }
  
  revalidatePath("/path")
  return { id: result.id }
}
```

**Zod schema**:
```typescript
export const createXSchema = z.object({
  name: z.string().min(1, "Name required"),
})
export type CreateXInput = z.infer<typeof createXSchema>
```

**Form component**:
```typescript
"use client"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

export function XForm() {
  const { register, handleSubmit } = useForm({
    resolver: zodResolver(createXSchema),
  })
  
  async function onSubmit(data) {
    const result = await doSomething(data)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success("Done")
  }
  
  return <form onSubmit={handleSubmit(onSubmit)}>...</form>
}
```

### Folder Structure Rationale

- `src/app/(auth)/` — Public routes (login)
- `src/app/(app)/` — Protected routes (all share layout.tsx with auth guard)
- `src/app/(app)/[feature]/` — Feature folder with actions.ts, page.tsx, loading.tsx
- `src/components/[feature]/` — Feature-specific components
- `src/components/ui/` — shadcn components (don't modify)
- `src/lib/` — Utilities (auth, security, email, env, validations)
- `src/__tests__/` — Jest test suites
- `supabase/migrations/` — SQL migrations (new migration per feature)

### Rules That Matter Most

1. **Always call `requireAuth()` or `requireRole()` in Server Actions** — Non-negotiable.
2. **Always validate with Zod** — Frontend validation + Server Action re-validation.
3. **Always return `{ error?: string }` from actions** — Consistent error handling.
4. **Always use `revalidatePath()` after mutations** — Cache invalidation.
5. **Always use `sanitizeError()` on Postgres errors** — Security.
6. **Always use React Query for async state** — No fetch in Client Components.
7. **Always use Server Components by default** — Client Components only when needed.
8. **Always validate UUID before querying** — Use `isValidUUID()`.
9. **Always add `loading.tsx` to new pages** — Prevents UI freeze.
10. **Never trust user role from client** — Always fetch from database.

### What Not to Do

- Don't write REST API endpoints for crud (Server Actions are simpler)
- Don't store data in useState for async operations (React Query handles it)
- Don't validate in components (Zod + Server Action validation)
- Don't create custom UI components (use shadcn)
- Don't hardcode sensitive values (env vars)
- Don't log user input (redact sensitive data)
- Don't skip RLS (database is the truth)
- Don't throw errors in Server Actions (return { error })
- Don't fetch in Client Components (use Server Components)
- Don't assume data exists (always check null)

### Common Mistakes to Avoid

- Forgetting `.select()` after `.insert()` → no returned ID
- Using `.limit()` instead of `.range()` → pagination breaks
- Calling `revalidatePath("/")` → too broad, cache miss everywhere
- Not checking `if (error)` after DB ops → silent failures
- Returning raw error.message → schema leakage security bug
- Using `any` in Zod → lose type safety
- Fetching in useEffect → use React Query instead
- Not validating UUID before `.eq("id", id)` → SQL injection vulnerability
- Storing signed URLs in response → clients don't have permission
- Forgetting `"use server"` in action file → runs on client

### Where to Find Things

| Need | Location |
|------|----------|
| Auth logic | `src/lib/auth.ts` |
| Validation schemas | `src/lib/validations/{feature}.ts` |
| Security utilities | `src/lib/security.ts` |
| Database types | `src/types/database.ts` |
| Server actions | `src/app/(app)/{feature}/actions.ts` |
| Components | `src/components/{feature}/` |
| Pages | `src/app/(app)/{feature}/page.tsx` |
| Loading UI | `src/app/(app)/{feature}/loading.tsx` |
| Tests | `src/__tests__/{topic}.test.ts` |
| DB schema | `supabase/migrations/` |

---

**Document Generated**: June 26, 2026  
**Purpose**: AI Engineer's handbook for production-quality code  
**Audience**: Future developers and AI assistants contributing to ValveTrack ERP
