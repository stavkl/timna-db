/**
 * Authentication Module
 * Handles login, logout, and session management
 */

const API_BASE = window.location.origin + '/api';

// Global auth state
const authState = {
    sessionId: null,
    isLoggedIn: false
};

/**
 * Initialize authentication on page load
 */
function initAuth() {
    // Check for existing session
    const sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
        authState.sessionId = sessionId;
        authState.isLoggedIn = true;
        updateConnectionStatus(true);
        return true;
    }
    return false;
}

/**
 * Handle login form submission
 */
async function login(username, password) {
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Login failed');
        }

        // Store session
        authState.sessionId = data.sessionId;
        authState.isLoggedIn = true;
        localStorage.setItem('sessionId', data.sessionId);

        updateConnectionStatus(true);
        return { success: true };

    } catch (error) {
        return { success: false, error: error.message };
    }
}

/**
 * Handle logout
 */
function logout() {
    authState.sessionId = null;
    authState.isLoggedIn = false;
    localStorage.removeItem('sessionId');
    localStorage.removeItem('formSchema');
    localStorage.removeItem('formSchemaTimestamp');

    updateConnectionStatus(false);

    // Redirect to main page
    window.location.href = '/src/index.html';
}

/**
 * Get current session ID
 */
function getSessionId() {
    return authState.sessionId;
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
    return authState.isLoggedIn;
}

/**
 * Update connection status badge
 */
function updateConnectionStatus(connected) {
    const statusBadge = document.getElementById('connection-status');
    if (statusBadge) {
        if (connected) {
            statusBadge.className = 'status-badge connected';
            statusBadge.textContent = 'Connected';
        } else {
            statusBadge.className = 'status-badge disconnected';
            statusBadge.textContent = 'Not Connected';
        }
    }
}

/**
 * Make authenticated API request
 */
async function authenticatedFetch(url, options = {}) {
    if (!authState.sessionId) {
        throw new Error('Not authenticated');
    }

    const headers = {
        ...options.headers,
        'X-Session-ID': authState.sessionId
    };

    const response = await fetch(url, {
        ...options,
        headers
    });

    // If unauthorized, clear session and redirect to login
    if (response.status === 401) {
        logout();
        throw new Error('Session expired. Please login again.');
    }

    return response;
}
