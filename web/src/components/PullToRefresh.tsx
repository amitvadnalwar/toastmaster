import { useRef, useState, TouchEvent, ReactNode } from 'react';
import Spinner from '@/components/ui/Spinner';

const THRESHOLD = 70;
const MAX_PULL = 100;

interface Props {
  onRefresh: () => Promise<unknown>;
  className?: string;
  children: ReactNode;
}

// Pull-to-refresh for a scrollable container. Only activates when the
// container is already scrolled to the top, so it never fights normal
// scrolling — matches the native mobile pattern of "pull down at the top
// to refresh".
export default function PullToRefresh({ onRefresh, className, children }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  function handleTouchStart(e: TouchEvent<HTMLDivElement>) {
    if (refreshing) return;
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    }
  }

  function handleTouchMove(e: TouchEvent<HTMLDivElement>) {
    if (startY.current === null || refreshing) return;
    const el = containerRef.current;
    if (el && el.scrollTop > 0) {
      startY.current = null;
      setPull(0);
      return;
    }
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    if (e.cancelable) e.preventDefault();
    setPull(Math.min(delta * 0.5, MAX_PULL));
  }

  async function handleTouchEnd() {
    if (startY.current === null) return;
    startY.current = null;
    if (pull >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  }

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={className}
      style={{ overscrollBehaviorY: 'contain' }}
    >
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
