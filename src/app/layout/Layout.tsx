import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="layout">
      <button className="burger" onClick={() => setOpen(!open)}>
        ☰
      </button>
      <aside className={`sidebar ${open ? 'open' : ''}`} onClick={() => setOpen(false)}>
        <div className="brand">cashflow-app</div>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Investments
          </NavLink>
          <NavLink to="/credits" className={({ isActive }) => (isActive ? 'active' : '')}>
            Credits
          </NavLink>
          <NavLink to="/cashflow" className={({ isActive }) => (isActive ? 'active' : '')}>
            Cashflow
          </NavLink>
          <NavLink to="/options" className={({ isActive }) => (isActive ? 'active' : '')}>
            Options
          </NavLink>
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
