<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class AuthController extends Controller
{
    /**
     * Handle admin login.
     * POST /api/admin/login
     */
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|string',
            'password' => 'required|string',
        ]);

        // Allow login with either email or username
        $field = filter_var($request->email, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        $credentials = [
            $field     => $request->email,
            'password' => $request->password,
        ];

        if (!Auth::attempt($credentials, $request->boolean('remember', true))) {
            return response()->json([
                'message' => 'Invalid credentials. Please check your email/username and password.',
            ], 401);
        }

        /** @var User $user */
        $user = Auth::user();

        // Optional: restrict login to admin role only
        if ($user->role !== 'admin') {
            Auth::logout();
            return response()->json([
                'message' => 'Access denied. Administrator privileges required.',
            ], 403);
        }

        $request->session()->regenerate();

        return response()->json([
            'message' => 'Login successful.',
            'user'    => [
                'id'       => $user->id,
                'name'     => $user->name,
                'username' => $user->username,
                'email'    => $user->email,
                'role'     => $user->role,
            ],
        ]);
    }

    /**
     * Handle admin logout.
     * POST /api/admin/logout
     */
    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    /**
     * Check if the current user is authenticated.
     * GET /api/admin/check-auth
     */
    public function checkAuth(Request $request)
    {
        if (Auth::check()) {
            /** @var User $user */
            $user = Auth::user();

            return response()->json([
                'authenticated' => true,
                'user'          => [
                    'id'       => $user->id,
                    'name'     => $user->name,
                    'username' => $user->username,
                    'email'    => $user->email,
                    'role'     => $user->role,
                ],
            ]);
        }

        return response()->json(['authenticated' => false], 401);
    }
}
