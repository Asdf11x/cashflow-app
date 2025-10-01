import { useState } from 'react';
import { useInvestStore } from '../../core/state/useInvestStore';
import { fmtMoney } from '../../core/domain/calc';
import ObjectCreateSheet from '../shared/ObjectCreateSheet';
import '../styles.css';

export default function InvestmentsList() {
    const objects = useInvestStore(s => s.objects);
    const [open, setOpen] = useState(false);

    return (
        <div className="container">
            <div className="h1">Investments</div>

            <div className="card" style={{overflow:'hidden'}}>
                <table className="table">
                    <thead>
                    <tr>
                        <th>Name</th>
                        <th>Kaufpreis</th>
                        <th>monatl. Gewinn</th>
                    </tr>
                    </thead>
                    <tbody>
                    {objects.map(o => (
                        <tr key={o.id}>
                            <td>{o.name}</td>
                            <td>{fmtMoney(o.purchasePrice)}</td>
                            <td>{fmtMoney(o.netGainMonthly)}</td>
                        </tr>
                    ))}
                    {objects.length === 0 && (
                        <tr><td colSpan={3} style={{color:'#94a3b8',padding:'24px'}}>Noch keine Investments. Rechts unten auf „+“ klicken.</td></tr>
                    )}
                    </tbody>
                </table>
            </div>

            <button className="fab" onClick={()=>setOpen(true)}>+</button>
            {open && <ObjectCreateSheet onClose={()=>setOpen(false)} />}
        </div>
    );
}
