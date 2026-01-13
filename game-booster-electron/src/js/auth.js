const auth = {
    login: async () => {
        const user = document.getElementById('login-username').value;
        const pass = document.getElementById('login-password').value;
        const error = document.getElementById('error-msg');

        if (!user || !pass) {
            error.innerText = "CRITICAL: Input Invalid";
            return;
        }

        const result = await window.api.invoke('auth-login', { user, pass });

        if (result.success) {
            localStorage.setItem('remembered_user', user);
            localStorage.setItem('current_user', user); // Internal session context

            if (result.active) {
                window.location.href = 'index.html';
            } else {
                showActivation(result.reason); // reason is "missing" or "expired"
            }
        } else {
            error.innerText = "ERROR: " + result.message;
        }
    },

    register: async () => {
        const user = document.getElementById('reg-username').value;
        const pass = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-confirm').value;
        const error = document.getElementById('error-msg');

        if (!user || !pass) {
            error.innerText = "CRITICAL: Input Invalid";
            return;
        }

        if (pass !== confirm) {
            error.innerText = "ERROR: Passwords do not match";
            return;
        }

        const result = await window.api.invoke('auth-register', { user, pass });

        if (result.success) {
            localStorage.setItem('remembered_user', user);
            alert("IDENTITY ESTABLISHED. PLEASE LOGIN TO ACTIVATE.");
            showLogin();
        } else {
            error.innerText = "ERROR: " + result.message;
        }
    },

    activate: async () => {
        const user = localStorage.getItem('current_user');
        const key = document.getElementById('activation-key').value;
        const error = document.getElementById('error-msg');

        if (!key) {
            error.innerText = "ERROR: Enter Key";
            return;
        }

        try {
            const result = await window.api.invoke('auth-activate', { user, key });
            if (result.success) {
                alert("LICENSE ACTIVATED. ACCESS GRANTED.");
                window.location.href = 'index.html';
            } else {
                error.innerText = "ERROR: " + result.message;
            }
        } catch (e) {
            error.innerText = "CRITICAL: Connection Error";
            console.error(e);
        }
    }
};

// Handle Remembered User on Load
window.addEventListener('DOMContentLoaded', () => {
    const remembered = localStorage.getItem('remembered_user');
    if (remembered) {
        const loginUser = document.getElementById('login-username');
        const regUser = document.getElementById('reg-username');

        if (loginUser) {
            loginUser.value = remembered;
            loginUser.readOnly = true;
            loginUser.style.opacity = "0.7";
            loginUser.style.cursor = "not-allowed";
        }
        if (regUser) {
            regUser.value = remembered;
            regUser.readOnly = true;
            regUser.style.opacity = "0.7";
            regUser.style.cursor = "not-allowed";
        }
    }
});
