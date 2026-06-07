import React, { createContext, useState, useContext, useEffect } from 'react';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);

    // On mount, check if there's an active session with the server
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/admin/check-auth', {
                    credentials: 'include',
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.authenticated) {
                        setAdmin(data.user);
                    }
                }
            } catch (err) {
                console.error('Auth check failed', err);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, []);

    const login = (userData) => {
        setAdmin(userData);
    };

    const logout = async () => {
        try {
            await fetch('/api/admin/logout', {
                method: 'POST',
                credentials: 'include',
                headers: { 'X-CSRF-TOKEN': getCsrfToken() },
            });
        } catch (err) {
            console.error('Logout error', err);
        }
        setAdmin(null);
    };

    const value = { admin, login, logout, loading };

    return (
        <AdminAuthContext.Provider value={value}>
            {children}
        </AdminAuthContext.Provider>
    );
};

export const useAdminAuth = () => useContext(AdminAuthContext);

// Helper to grab the CSRF token from the cookie Laravel sets
function getCsrfToken() {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}
