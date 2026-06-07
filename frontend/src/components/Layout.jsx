import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAdminAuth } from '../context/AdminAuthContext';

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { admin, logout } = useAdminAuth();

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location]);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const handleLogout = async () => {
        await logout();
        toast.success('Logged out successfully.');
        navigate('/admin/login');
    };

    return (
        <>
            <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={toggleSidebar}></div>
            <div className="app-layout">
                <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
                    <div className="sidebar-header-container">
                        <h1 className="sidebar-header">OnlyMetric</h1>
                        <button className="sidebar-close-btn" onClick={toggleSidebar}>
                            &times;
                        </button>
                    </div>

                    <nav className="sidebar-nav">
                        <ul>
                            <li><NavLink to="/">Dashboard</NavLink></li>
                            <li><NavLink to="/suppliers">Suppliers</NavLink></li>
                            <li><NavLink to="/invoices">Invoices</NavLink></li>
                            <li><NavLink to="/ingredients">Ingredients</NavLink></li>
                            <li><NavLink to="/recipes">Recipes</NavLink></li>
                            <li><NavLink to="/staff">Staff & Rostering</NavLink></li>
                            <li><NavLink to="/ai-insights">AI Insights & KPI Manager</NavLink></li>
                            <li><NavLink to="/sales-reconciliation">Sales Reconciliation</NavLink></li>
                        </ul>
                    </nav>

                    {/* User info + Logout pinned to bottom of sidebar (desktop) */}
                    <div className="sidebar-footer">
                        {admin && (
                            <div className="sidebar-user">
                                <div className="sidebar-user-avatar">
                                    {admin.name?.charAt(0).toUpperCase()}
                                </div>
                                <div className="sidebar-user-info">
                                    <span className="sidebar-user-name">{admin.name}</span>
                                    <span className="sidebar-user-role">{admin.role}</span>
                                </div>
                            </div>
                        )}
                        <button className="sidebar-logout-btn" onClick={handleLogout}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                                <polyline points="16 17 21 12 16 7" />
                                <line x1="21" y1="12" x2="9" y2="12" />
                            </svg>
                            <span className="logout-btn-label">Logout</span>
                        </button>
                    </div>
                </aside>

                <main className="main-content-area">
                    {/* Mobile & Tablet top bar */}
                    <div className="mobile-header">
                        <button className="hamburger-btn" onClick={toggleSidebar}>
                            &#9776;
                        </button>
                        <span className="mobile-header-title">OnlyMetric</span>

                        <div className="mobile-header-right">
                            {/* Avatar + name — visible on tablet only */}
                            {admin && (
                                <div className="mobile-user-chip">
                                    <div className="mobile-user-avatar">
                                        {admin.name?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="mobile-user-name">{admin.name}</span>
                                </div>
                            )}

                            {/* Logout — icon-only on mobile, icon + label on tablet */}
                            <button className="mobile-logout-btn" onClick={handleLogout} title="Logout">
                                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                                    <polyline points="16 17 21 12 16 7" />
                                    <line x1="21" y1="12" x2="9" y2="12" />
                                </svg>
                                <span className="mobile-logout-label">Logout</span>
                            </button>
                        </div>
                    </div>

                    <div className="content-wrapper">
                        <Outlet />
                    </div>
                </main>
            </div>

            <style>{`
                /* ─── Sidebar footer ──────────────────────────────────── */
                .sidebar-footer {
                    margin-top: auto;
                    padding: 16px;
                    border-top: 1px solid rgba(255,255,255,0.07);
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .sidebar-user {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 4px;
                }

                .sidebar-user-avatar {
                    width: 34px;
                    height: 34px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #10b981, #059669);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    font-weight: 700;
                    color: #fff;
                    flex-shrink: 0;
                }

                .sidebar-user-info {
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .sidebar-user-name {
                    font-size: 13px;
                    font-weight: 600;
                    color: black;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .sidebar-user-role {
                    font-size: 11px;
                    color: black;
                    text-transform: capitalize;
                }

                .sidebar-logout-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                    padding: 10px 12px;
                    background: rgba(239,68,68,0.08);
                    border: 1px solid rgba(239,68,68,0.15);
                    border-radius: 8px;
                    color: rgba(239,68,68,0.8);
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.2s, color 0.2s, border-color 0.2s;
                    box-sizing: border-box;
                }

                .sidebar-logout-btn:hover {
                    background: rgba(239,68,68,0.15);
                    color: #ef4444;
                    border-color: rgba(239,68,68,0.3);
                }

                /* ─── Mobile header right cluster ─────────────────────── */
                .mobile-header-right {
                    margin-left: auto;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                /* User chip (avatar + name) — hidden on mobile, shown on tablet */
                .mobile-user-chip {
                    display: none;
                    align-items: center;
                    gap: 7px;
                }

                .mobile-user-avatar {
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #10b981, #059669);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 11px;
                    font-weight: 700;
                    color: #fff;
                    flex-shrink: 0;
                }

                .mobile-user-name {
                    font-size: 13px;
                    font-weight: 600;
                    color: rgba(255,255,255,0.8);
                    white-space: nowrap;
                }

                /* Logout button in mobile header */
                .mobile-logout-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 7px 9px;
                    background: rgba(239,68,68,0.08);
                    border: 1px solid rgba(239,68,68,0.2);
                    border-radius: 7px;
                    color: rgba(239,68,68,0.85);
                    font-size: 13px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: background 0.2s, color 0.2s, border-color 0.2s;
                    white-space: nowrap;
                    /* Active / tap feedback for touch devices */
                    -webkit-tap-highlight-color: transparent;
                }

                .mobile-logout-btn:hover,
                .mobile-logout-btn:active {
                    background: rgba(239,68,68,0.16);
                    color: #ef4444;
                    border-color: rgba(239,68,68,0.35);
                }

                /* Text label hidden by default (mobile) */
                .mobile-logout-label {
                    display: none;
                }

                /* ─── Breakpoints ─────────────────────────────────────── */

                /* ── Mobile  (≤ 480px): icon-only, no user chip ── */
                @media (max-width: 480px) {
                    .mobile-logout-btn {
                        padding: 7px 8px;
                    }
                    .mobile-logout-label {
                        display: none;
                    }
                    .mobile-user-chip {
                        display: none;
                    }
                }

                /* ── Tablet  (481px – 1024px): label + user chip visible ── */
                @media (min-width: 481px) and (max-width: 1024px) {
                    .mobile-logout-label {
                        display: inline;
                    }
                    .mobile-user-chip {
                        display: flex;
                    }
                    .mobile-logout-btn {
                        padding: 7px 14px;
                    }
                }

                /* ── Desktop (> 1024px): hide header logout — sidebar handles it ── */
                @media (min-width: 1025px) {
                    .mobile-logout-btn {
                        display: none;
                    }
                    .mobile-user-chip {
                        display: none;
                    }
                }
            `}</style>
        </>
    );
};

export default Layout;
