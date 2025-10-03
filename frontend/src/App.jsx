import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Outlet } from 'react-router-dom';

// --- Context and Protected Route ---
import { StaffAuthProvider } from './context/StaffAuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// --- Core Layout & Pages ---
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import IngredientManagement from './pages/IngredientManagement';
import IngredientDetail from './pages/IngredientDetail';
import RecipeManagement from './pages/RecipeManagement';
import RecipeDetail from './pages/RecipeDetail';
import InvoiceManagement from './pages/InvoiceManagement';
import InvoiceDetail from './pages/InvoiceDetail';
import SupplierManagement from './pages/SupplierManagement';
import SupplierDetail from './pages/SupplierDetail';

// --- Staff Management Pages (for Managers) ---
import StaffDirectory from './pages/StaffManagement/StaffDirectory';
import Timesheets from './pages/StaffManagement/Timesheets';

// --- Standalone Staff Time Clock Pages (for Employees) ---
import StaffTimeClockLogin from './pages/StaffManagement/StaffTimeClockLogin';
import StaffTimeClockDetail from './pages/StaffManagement/StaffTimeClockDetail';

const StaffLayout = () => (
    <div>
        <div className="page-tabs">
            <NavLink to="/staff" end className="tab-link">Staff Directory</NavLink>
            <NavLink to="/staff/timesheets" className="tab-link">Timesheets</NavLink>
        </div>
        <Outlet />
    </div>
);


function App() {
    return (
        <BrowserRouter>
            {/* 1. Wrap the entire application in the StaffAuthProvider */}
            {/* This makes the login state available everywhere. */}
            <StaffAuthProvider>
                <Routes>
                    {/* --- Main Application Routes (Unchanged) --- */}
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="recipes" element={<RecipeManagement />} />
                        <Route path="recipes/:id" element={<RecipeDetail />} />
                        <Route path="ingredients" element={<IngredientManagement />} />
                        <Route path="ingredients/:id" element={<IngredientDetail />} />
                        <Route path="invoices" element={<InvoiceManagement />} />
                        <Route path="invoices/:id" element={<InvoiceDetail />} />
                        <Route path="suppliers" element={<SupplierManagement />} />
                        <Route path="suppliers/:id" element={<SupplierDetail />} />

                        <Route path="staff" element={<StaffLayout />}>
                            <Route index element={<StaffDirectory />} />
                            <Route path="timesheets" element={<Timesheets />} />
                        </Route>
                    </Route>

                    {/* --- Standalone Routes for the Staff Time Clock --- */}
                    <Route path="/staff/time-clock" element={<StaffTimeClockLogin />} />

                    {/* 2. Wrap the detail page in our new ProtectedRoute component */}
                    {/* This prevents direct access without logging in. */}
                    <Route
                        path="/staff/time-clock/:staffId"
                        element={
                            <ProtectedRoute>
                                <StaffTimeClockDetail />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </StaffAuthProvider>
        </BrowserRouter>
    );
}

export default App;
