import { useEffect, useRef, useState, ReactNode } from 'react';
import Spinner from '@/components/ui/Spinner';

const THRESHOLD = 70;
const MAX_PULL = 100;
// Dead zone before we commit to "this is a pull" and call preventDefault.
// Without this, a stray pixel of touch jitter in the wrong direction on the
// very first touchmove re-renders the indicator (changing its height, which
// shifts the layout while the finger is still down) — that's what was
// confusing touch-scroll tracking on Android/tablet (iOS is more forgiving).
const DRAG_THRESHOLD = 10;

interface Props {
  onRefresh: () => Promise<unknown>;
  className?: string;
  children: ReactNode;
}

type Gesture = 'pull' | 'scroll' | null;

// Pull-to-refresh for a scrollable container. Only activates when the
// container is already scrolled to the top, so it never fights normal
// scrolling — matches the native mobile pattern of "pull down at the top
// to refresh".
//
// Touch listeners are attached natively via useEffect rather than React's
// onTouchStart/onTouchMove JSX props — React registers those as passive
// listeners internally, which makes e.preventDefault() silently do nothing.
export default function PullToRefresh({ onRefresh, className, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  // Once a gesture is classified, that classification sticks for the rest of
  // the touch sequence — prevents a curved/wobbly swipe from flip-flopping
  // between "pull" and "scroll" mid-gesture.
  const gesture = useRef<Gesture>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Native listeners are attached once (empty dep array) and read these refs
  // instead of closing over `pull`/`refreshing`/`onRefresh` directly, so the
  // listeners never go stale and never need to be torn down/reattached.
  const pullRef = useRef(pull);
  pullRef.current = pull;
  const refreshingRef = useRef(refreshing);
  refreshingRef.current = refreshing;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: globalThis.TouchEvent) {
      if (refreshingRef.current) return;
      if (el!.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        gesture.current = null;
      } else {
        startY.current = null;
        gesture.current = 'scroll';
      }
    }

    function onTouchMove(e: globalThis.TouchEvent) {
      if (startY.current === null || refreshingRef.current || gesture.current === 'scroll') return;
      if (el!.scrollTop > 0) {
        gesture.current = 'scroll';
        setPull(0);
        return;
      }
      const delta = e.touches[0].clientY - startY.current;
      if (delta < DRAG_THRESHOLD) {
        // Below the dead zone — not a confirmed pull yet. Any hint of
        // upward movement means the user is scrolling; lock it in and never
        // touch this gesture again.
        if (delta < 0) gesture.current = 'scroll';
        setPull(0);
        return;
      }
      gesture.current = 'pull';
      if (e.cancelable) e.preventDefault();
      setPull(Math.min((delta - DRAG_THRESHOLD) * 0.5, MAX_PULL));
    }

    async function onTouchEnd() {
      const wasPull = gesture.current === 'pull';
      startY.current = null;
      gesture.current = null;
      if (wasPull && pullRef.current >= THRESHOLD) {
        setRefreshing(true);
        setPull(THRESHOLD);
        try {
          await onRefreshRef.current();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    // Must be non-passive — this is the whole point: without it,
    // preventDefault() below is silently ignored by the browser.
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return (
    <div ref={containerRef} className={className} style={{ overscrollBehaviorY: 'contain' }}>
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out"
        style={{ height: refreshing ? THRESHOLD : pull }}
      >
        {(pull > 0 || refreshing) && (
          <div style={{ opacity: refreshing ? 1 : Math.min(pull / THRESHOLD, 1) }}>
            <Spinner size="sm" />
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
