import { useMemo, useState } from 'react';
import { useInvestStore } from '../../core/state/useInvestStore.ts';
import type { Objectvestment } from '../../core/domain/types.ts';
import { netMonthly, netYearly, yieldPctYearly, fmtMoney } from '../../core/domain/calc.ts';

type Props = { onClose: () => void };

export default function ObjectCreateSheet({ onClose }: Props) {
  const addObjectRaw = useInvestStore((s) => s.addObjectRaw);

  const [name, setName] = useState('Objekt A');
  const [purchasePrice, setPurchasePrice] = useState('100000.00');
  const [grossGainMonthly, setGrossGainMonthly] = useState('1200.00');
  const [costMonthly, setCostMonthly] = useState('300.00');

  const draft = useMemo<Objectvestment>(
    () => ({
      id: crypto.randomUUID(),
      name,
      kind: 'OBJECT',
      purchasePrice,
      grossGainMonthly,
      costMonthly,
      netGainMonthly: '0',
      netGainYearly: '0',
      yieldPctYearly: '0',
    }),
    [name, purchasePrice, grossGainMonthly, costMonthly],
  );

  const netM = netMonthly(draft);
  const netY = netYearly(draft);
  const yld = yieldPctYearly(draft);

  return (
    <div className="sheet" onClick={onClose}>
      <div className="sheet__panel" onClick={(e) => e.stopPropagation()}>
        <div className="h1" style={{ marginBottom: 8 }}>
          Investment hinzufügen
        </div>

        <div className="grid">
          <div>
            <div className="label">Name</div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="row">
            <div style={{ flex: 1 }}>
              <div className="label">Kaufpreis (€)</div>
              <input
                className="input"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div className="label">Gewinn/Monat (€)</div>
              <input
                className="input"
                value={grossGainMonthly}
                onChange={(e) => setGrossGainMonthly(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="label">Kosten/Monat (€)</div>
            <input
              className="input"
              value={costMonthly}
              onChange={(e) => setCostMonthly(e.target.value)}
            />
          </div>

          <div className="kpi">
            <div>
              <b>Netto monatlich</b>
              <br />
              {fmtMoney(netM)} €
            </div>
            <div>
              <b>Netto jährlich</b>
              <br />
              {fmtMoney(netY)} €
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            <b>Rendite p.a.</b> {yld} %
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            <button
              className="btn"
              onClick={() => {
                addObjectRaw({
                  id: draft.id,
                  name: draft.name,
                  kind: 'OBJECT',
                  purchasePrice,
                  grossGainMonthly,
                  costMonthly,
                });
                onClose();
              }}
            >
              Erstellen
            </button>
            <button className="btn-ghost" onClick={onClose}>
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
