import { cn } from '@/lib/utils';

/** Base shimmer block. Give it width/height/rounding via className. */
export function Skeleton({ className, light }: { className?: string; light?: boolean }) {
  return <div className={cn(light ? 'shimmer-light' : 'shimmer', 'rounded-lg', className)} />;
}

// ── Reusable card/row shapes ────────────────────────────────────────────────

export function StatsRowSkeleton() {
  return (
    <div className="mx-4 mt-4 bg-white rounded-2xl py-4 shadow-md flex">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
          <Skeleton className="w-8 h-5" />
          <Skeleton className="w-12 h-2.5" />
          <Skeleton className="w-8 h-2" />
        </div>
      ))}
    </div>
  );
}

export function MeetingCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl px-4 py-3.5 flex items-center justify-between shadow-sm">
      <div className="flex-1 min-w-0 mr-3">
        <Skeleton className="w-2/3 h-4 mb-2" />
        <Skeleton className="w-1/2 h-3" />
      </div>
      <Skeleton className="w-16 h-5 rounded-full" />
    </div>
  );
}

export function ScheduleRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3.5">
      <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="w-3/4 h-3.5 mb-2" />
        <Skeleton className="w-1/2 h-3" />
      </div>
      <Skeleton className="w-14 h-5 rounded-full" />
    </div>
  );
}

export function MemberRowSkeleton() {
  return (
    <div className="bg-white rounded-xl px-3.5 py-3 flex items-center shadow-sm">
      <Skeleton className="w-[42px] h-[42px] rounded-full mr-3 shrink-0" />
      <div className="flex-1 min-w-0">
        <Skeleton className="w-2/5 h-4 mb-2" />
        <Skeleton className="w-3/5 h-3" />
      </div>
      <Skeleton className="w-2.5 h-2.5 rounded-full ml-2" />
    </div>
  );
}

export function DetailCardSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={cn('px-4 py-3.5 flex items-center justify-between', i > 0 && 'border-t border-gray-50')}>
          <Skeleton className="w-20 h-3.5" />
          <Skeleton className="w-28 h-3.5" />
        </div>
      ))}
    </div>
  );
}

// ── Full-screen skeletons that mirror each page ─────────────────────────────

/** Home dashboard: club banner + stats + cards + schedule (admin & member). */
export function HomeSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto pb-28 max-w-lg mx-auto w-full">
      <StatsRowSkeleton />

      {/* Motive banner */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex-1 mr-3">
          <Skeleton className="w-32 h-4 mb-2" />
          <Skeleton className="w-48 h-3" />
        </div>
        <Skeleton className="w-16 h-9 rounded-[10px]" />
      </div>

      {/* Next meeting card */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-md flex items-center gap-3.5">
        <Skeleton className="w-10 h-16 rounded-xl shrink-0" />
        <div className="w-px self-stretch bg-gray-100" />
        <div className="flex-1">
          <Skeleton className="w-3/4 h-4 mb-2.5" />
          <Skeleton className="w-1/2 h-3 mb-2" />
          <Skeleton className="w-2/5 h-3" />
        </div>
      </div>

      {/* Section header */}
      <div className="mx-4 mt-5 mb-2.5">
        <Skeleton className="w-32 h-4" />
      </div>
      <div className="mx-4 bg-white rounded-2xl shadow-sm overflow-hidden">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={i > 0 ? 'border-t border-gray-100' : ''}>
            <ScheduleRowSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A titled list of meeting cards (admin & member meetings). */
export function MeetingListSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-5 pt-5 pb-28 max-w-lg mx-auto w-full">
      <Skeleton className="w-24 h-3 mb-3" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <MeetingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** A list of member rows. */
export function MembersListSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-5 pt-5 pb-28 max-w-lg mx-auto w-full">
      <Skeleton className="w-20 h-3 mb-3" />
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <MemberRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/** Avatar header + detail card (member/profile detail). */
export function ProfileSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-5 pt-6 pb-28 max-w-lg mx-auto w-full">
      <div className="flex flex-col items-center mb-7">
        <Skeleton className="w-20 h-20 rounded-full mb-3.5" />
        <Skeleton className="w-40 h-6 mb-2" />
        <Skeleton className="w-24 h-3.5" />
      </div>
      <Skeleton className="w-16 h-3 mb-2.5" />
      <DetailCardSkeleton rows={6} />
    </div>
  );
}

/** Meeting detail: title, badges, details card, roster cards, QR. */
export function MeetingDetailSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-5 pt-5 pb-12 max-w-lg mx-auto w-full">
      <Skeleton className="w-3/4 h-6 mb-3" />
      <div className="flex gap-2 mb-5">
        <Skeleton className="w-24 h-6 rounded-full" />
        <Skeleton className="w-28 h-6 rounded-full" />
      </div>
      <Skeleton className="w-16 h-3 mb-2.5" />
      <DetailCardSkeleton rows={4} />
      <div className="h-4" />
      <Skeleton className="w-24 h-3 mb-2.5" />
      <DetailCardSkeleton rows={3} />
    </div>
  );
}
