import { Routes, Route, Link, useLocation } from 'react-router-dom';
import InvestmentsList from './src/app/routes/InvestmentsList';
import './src/app/styles.css';

export default function App(){
    const loc = useLocation();
    return (
        <>
            <nav style={{
                position:'sticky',top:0,zIndex:10,background:'#fff',
                borderBottom:'1px solid var(--line)',padding:'10px 16px',display:'flex',gap:16
            }}>
                <Link to="/" style={{fontWeight: loc.pathname==='/'?700:400}}>Investments</Link>
            </nav>

            <Routes>
                <Route path="/" element={<InvestmentsList/>}/>
            </Routes>
        </>
    );
}
