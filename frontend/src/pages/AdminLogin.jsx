import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAdminAuth } from '../context/AdminAuthContext';

// Helper to grab the CSRF token from the cookie Laravel sets via /sanctum/csrf-cookie
function getCsrfToken() {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
}

const AdminLogin = () => {
    const navigate = useNavigate();
    const { login } = useAdminAuth();

    const [form, setForm] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleChange = (e) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Fetch CSRF cookie first (required for Laravel Sanctum session auth)
            await fetch('/sanctum/csrf-cookie', { credentials: 'include' });

            const res = await fetch('/api/admin/login', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                    Accept: 'application/json',
                },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.message || 'Login failed.');
                return;
            }

            login(data.user);
            toast.success(`Welcome back, ${data.user.name}!`);
            navigate('/');
        } catch (err) {
            console.error(err);
            toast.error('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.page}>
            {/* Ambient background shapes */}
            <div style={styles.blob1} />
            <div style={styles.blob2} />

            <div style={styles.card}>
                {/* Logo / Brand */}
                <div style={styles.brand}>
                    <div style={styles.logoMark}>
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                            <rect x="2" y="14" width="4" height="12" rx="1" fill="#6ee7b7" />
                            <rect x="8" y="9" width="4" height="17" rx="1" fill="#34d399" />
                            <rect x="14" y="4" width="4" height="22" rx="1" fill="#10b981" />
                            <rect x="20" y="8" width="4" height="18" rx="1" fill="#059669" />
                        </svg>
                    </div>
                    <span style={styles.brandName}>OnlyMetric</span>
                </div>

                <h2 style={styles.heading}>Admin Sign In</h2>
                <p style={styles.subheading}>Access your management dashboard</p>

                <form onSubmit={handleSubmit} style={styles.form}>
                    {/* Email / Username */}
                    <div style={styles.fieldGroup}>
                        <label style={styles.label} htmlFor="email">
                            Email or Username
                        </label>
                        <div style={styles.inputWrapper}>
                            <svg style={styles.inputIcon} viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                            <input
                                id="email"
                                name="email"
                                type="text"
                                autoComplete="username"
                                required
                                value={form.email}
                                onChange={handleChange}
                                placeholder="admin@example.com"
                                style={styles.input}
                                onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                                onBlur={(e) => Object.assign(e.target.style, styles.input)}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div style={styles.fieldGroup}>
                        <label style={styles.label} htmlFor="password">
                            Password
                        </label>
                        <div style={styles.inputWrapper}>
                            <svg style={styles.inputIcon} viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                                <path
                                    fillRule="evenodd"
                                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                required
                                value={form.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                style={{ ...styles.input, paddingRight: '44px' }}
                                onFocus={(e) => Object.assign(e.target.style, { ...styles.inputFocus, paddingRight: '44px' })}
                                onBlur={(e) => Object.assign(e.target.style, { ...styles.input, paddingRight: '44px' })}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                style={styles.eyeBtn}
                                tabIndex={-1}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                        <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={loading ? { ...styles.submitBtn, ...styles.submitBtnDisabled } : styles.submitBtn}
                    >
                        {loading ? (
                            <span style={styles.spinnerRow}>
                                <span style={styles.spinner} />
                                Signing in…
                            </span>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

            </div>
        </div>
    );
};

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const styles = {
    page: {
        minHeight: '100vh',
        background: '#0a0f0d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        position: 'relative',
        overflow: 'hidden',
        padding: '24px',
    },
    blob1: {
        position: 'absolute',
        top: '-120px',
        right: '-80px',
        width: '420px',
        height: '420px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    blob2: {
        position: 'absolute',
        bottom: '-100px',
        left: '-60px',
        width: '360px',
        height: '360px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(52,211,153,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    card: {
        position: 'relative',
        zIndex: 1,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '48px 40px',
        width: '100%',
        maxWidth: '420px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
    },
    brand: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '32px',
    },
    logoMark: {
        display: 'flex',
        alignItems: 'center',
    },
    brandName: {
        fontSize: '18px',
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: '-0.3px',
    },
    heading: {
        margin: '0 0 6px',
        fontSize: '26px',
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: '-0.5px',
    },
    subheading: {
        margin: '0 0 32px',
        fontSize: '14px',
        color: 'rgba(255,255,255,0.4)',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    },
    fieldGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    label: {
        fontSize: '13px',
        fontWeight: '500',
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: '0.1px',
    },
    inputWrapper: {
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    inputIcon: {
        position: 'absolute',
        left: '14px',
        color: 'rgba(255,255,255,0.25)',
        pointerEvents: 'none',
        flexShrink: 0,
    },
    input: {
        width: '100%',
        padding: '12px 14px 12px 42px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '10px',
        color: '#ffffff',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s, background 0.2s',
        boxSizing: 'border-box',
    },
    inputFocus: {
        width: '100%',
        padding: '12px 14px 12px 42px',
        background: 'rgba(16,185,129,0.06)',
        border: '1px solid rgba(16,185,129,0.4)',
        borderRadius: '10px',
        color: '#ffffff',
        fontSize: '14px',
        outline: 'none',
        transition: 'border-color 0.2s, background 0.2s',
        boxSizing: 'border-box',
    },
    eyeBtn: {
        position: 'absolute',
        right: '12px',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'rgba(255,255,255,0.3)',
        padding: '4px',
        display: 'flex',
        alignItems: 'center',
    },
    submitBtn: {
        marginTop: '8px',
        padding: '13px',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        border: 'none',
        borderRadius: '10px',
        color: '#ffffff',
        fontSize: '15px',
        fontWeight: '600',
        cursor: 'pointer',
        letterSpacing: '0.1px',
        transition: 'opacity 0.2s, transform 0.1s',
        boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
    },
    submitBtnDisabled: {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
    spinnerRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
    },
    spinner: {
        width: '16px',
        height: '16px',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTop: '2px solid #ffffff',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        display: 'inline-block',
    },
    footer: {
        marginTop: '28px',
        textAlign: 'center',
        fontSize: '13px',
        color: 'rgba(255,255,255,0.3)',
    },
    link: {
        color: '#10b981',
        textDecoration: 'none',
        fontWeight: '500',
    },
};

// Inject spinner keyframes into the document head once
if (typeof document !== 'undefined' && !document.getElementById('om-spin-style')) {
    const s = document.createElement('style');
    s.id = 'om-spin-style';
    s.textContent = `@keyframes spin { to { transform: rotate(360deg); } }
    input::placeholder { color: rgba(255,255,255,0.2); }`;
    document.head.appendChild(s);
}

export default AdminLogin;
