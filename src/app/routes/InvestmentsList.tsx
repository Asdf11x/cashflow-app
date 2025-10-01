import React, { useState } from 'react';
import { useInvestStore } from '../../core/state/useInvestStore';
import { fmtMoney } from '../../core/domain/calc';
import ObjectCreateSheet from '../shared/ObjectCreateSheet';

export default function InvestmentsList() {
  const objects = useInvestStore((s) => s.objects);
  const removeObject = useInvestStore((s) => s.removeObject);
  const [open, setOpen] = useState(false);

  return (
    <div className="container">
      <div className="h1">Investments</div>

      <table className="table" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '40%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
        </colgroup>
        <thead>
          <tr>
            <th>Name</th>
            <th>Kaufpreis</th>
            <th>monatl. Gewinn</th>
            <th>Rendite p.a.</th>
          </tr>
        </thead>
        <tbody>
          {objects.map((o) => (
            <tr key={o.id}>
              <td colSpan={4} style={{ padding: 0, borderBottom: '1px solid var(--line)' }}>
                {/* keep swipe-to-delete row */}
                <div className="swipe-wrap" style={{ height: 56 }}>
                  <div className="swipe-bg" style={{ height: 56 }}>
                    <svg className="basket" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="currentColor"
                        d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 6h2v10h-2V9zm4 0h2v10h-2V9zM7 9h2v10H7V9z"
                      />
                    </svg>
                  </div>
                  <SwipeRowLike onDelete={() => removeObject(o.id)}>
                    <div style={{ display: 'grid', gridTemplateColumns: '40% 20% 20% 20%' }}>
                      <div style={{ padding: '12px' }}>{o.name}</div>
                      <div style={{ padding: '12px' }}>{fmtMoney(o.purchasePrice)}</div>
                      <div style={{ padding: '12px' }}>{fmtMoney(o.netGainMonthly)}</div>
                      <div style={{ padding: '12px' }}>{o.yieldPctYearly} %</div>
                    </div>
                  </SwipeRowLike>
                </div>
              </td>
            </tr>
          ))}
          {objects.length === 0 && (
            <tr>
              <td colSpan={4} style={{ color: '#94a3b8', padding: '24px' }}>
                Noch keine Investments. Unten rechts „+“ klicken.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <button className="fab" onClick={() => setOpen(true)}>
        +
      </button>
      {open && <ObjectCreateSheet onClose={() => setOpen(false)} />}
    </div>
  );
}

/* tiny inline variant so you don't need to import; uses same logic as SwipeRow */
function SwipeRowLike({ onDelete, children }: { onDelete: () => void; children: React.ReactNode }) {
  const [tx, setTx] = React.useState(0);
  const start = React.useRef(0);
  const cur = React.useRef(0);
  const TH = 120,
    MAX = 160;
  const down = (e: React.PointerEvent) => {
    start.current = e.clientX;
    cur.current = 0;
    (e.target as any).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!start.current) return;
    const nx = Math.max(-MAX, Math.min(0, e.clientX - start.current));
    cur.current = nx;
    setTx(nx);
  };
  const up = () => {
    if (Math.abs(cur.current) > TH) {
      setTx(-400);
      setTimeout(onDelete, 120);
    } else setTx(0);
    start.current = 0;
    cur.current = 0;
  };
  return (
    <div
      className="swipe-fg"
      style={{ transform: `translateX(${tx}px)` }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={() => start.current && up()}
    >
      {children}
    </div>
  );
}
