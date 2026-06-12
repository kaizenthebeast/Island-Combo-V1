import { Skeleton } from '@/shared/components/ui/skeleton'

// Streams in while the account page (profile + addresses + cards) loads.
// Mirrors AccountContainer: sidebar nav left, content card right.
export default function Loading() {
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 p-4 md:p-6">
      <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
        {/* Sidebar nav */}
        <aside className="h-fit rounded-xl border bg-white p-4 shadow-xs">
          <Skeleton className="mb-4 h-6 w-32" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            ))}
          </div>
        </aside>

        {/* Content panel */}
        <section className="flex flex-col gap-5">
          <div className="rounded-xl border bg-white p-5 shadow-xs">
            <Skeleton className="h-5 w-40" />
            <div className="mt-5 space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-9 w-full max-w-md rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
