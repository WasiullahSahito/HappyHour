import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Outlet } from 'react-router-dom';
import { StaffAuthProvider } from './context/StaffAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
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
import StaffDirectory from './pages/StaffManagement/StaffDirectory';
import Timesheets from './pages/StaffManagement/Timesheets';
import StaffDetail from './pages/StaffManagement/StaffDetail'; // <-- IMPORT THE NEW COMPONENT


import StaffTimeClockLogin from './pages/StaffManagement/StaffTimeClockLogin';
import StaffTimeClockDetail from './pages/StaffManagement/StaffTimeClockDetail';
import RegisterStaff from './pages/StaffManagement/RegisterStaff'; // <-- IMPORT NEW PAGE


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
            <StaffAuthProvider>
                <Routes>
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
                        <Route path="staff/:id" element={<StaffDetail />} />

                    </Route>
                    <Route path="/staff/register" element={<RegisterStaff />} />


                    <Route path="/staff/time-clock" element={<StaffTimeClockLogin />} />
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
