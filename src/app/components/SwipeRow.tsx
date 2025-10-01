import React, { useRef, useState } from 'react';

type Props = {
  onDelete: () => void;
  children: React.ReactNode; // your <tr> content rendered inside
  height?: number; // row height for the bg alignment
};

export default function SwipeRow({ onDelete, children, height = 48 }: Props) {
  const fgRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const curX = useRef(0);
  const [tx, setTx] = useState(0);
  const deleting = useRef(false);

  const THRESHOLD = 120; // px to trigger delete
  const MAX_PULL = 160; // max visual drag

  const onPointerDown = (e: React.PointerEvent) => {
    deleting.current = false;
    startX.current = e.clientX;
    curX.current = 0;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === 0) return;
    const delta = e.clientX - startX.current;
    // only react to left-swipe
    const nx = Math.max(-MAX_PULL, Math.min(0, delta));
    curX.current = nx;
    setTx(nx);
  };

  const onPointerUp = () => {
    if (Math.abs(curX.current) > THRESHOLD) {
      deleting.current = true;
      // quick animate off-screen then delete
      setTx(-400);
      setTimeout(onDelete, 120);
    } else {
      // snap back
      setTx(0);
    }
    startX.current = 0;
    curX.current = 0;
  };

  return (
    <div className="swipe-wrap" style={{ height }}>
      <div className="swipe-bg" style={{ height }}>
        {/* basket icon (inline svg) */}
        <svg className="basket" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v10h-2V9zm4 0h2v10h-2V9zM7 9h2v10H7V9z"
          />
        </svg>
      </div>
      <div
        className="swipe-fg"
        ref={fgRef}
        style={{ transform: `translateX(${tx}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          if (startX.current !== 0) onPointerUp();
        }}
      >
        {children}
      </div>
    </div>
  );
}
