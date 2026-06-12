import { SearchClient } from "@/components/search/search-client"

export const metadata = { title: "Search — ValveTrack" }

// No data fetched at page load — search fires server actions on demand
export default function SearchPage() {
  return <SearchClient />
}
