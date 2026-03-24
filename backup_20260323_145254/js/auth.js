async function hashPassword(password) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    } catch (e) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }
}

async function verifyPassword(password, hashedPassword) {
    const inputHash = await hashPassword(password);
    if (inputHash.length !== hashedPassword.length) return false;
    let result = 0;
    for (let i = 0; i < inputHash.length; i++) {
        result |= inputHash.charCodeAt(i) ^ hashedPassword.charCodeAt(i);
    }
    return result === 0;
}

async function initializeAdminAccount() {
    let adminConfig = JSON.parse(localStorage.getItem(AppConfig.storageKeys.admin) || 'null');
    if (!adminConfig) {
        const defaultPasswordHash = await hashPassword(AppConfig.defaultAdminPassword);
        adminConfig = {
            loginId: AppConfig.defaultAdminId,
            passwordHash: defaultPasswordHash,
            createdAt: new Date().toISOString()
        };
        localStorage.setItem(AppConfig.storageKeys.admin, JSON.stringify(adminConfig));
    }
    return adminConfig;
}

async function changeAdminPassword(newPassword) {
    const adminConfig = JSON.parse(localStorage.getItem(AppConfig.storageKeys.admin) || 'null');
    if (!adminConfig) {
        return { success: false, message: '관리자 계정이 없습니다.' };
    }
    const newHash = await hashPassword(newPassword);
    adminConfig.passwordHash = newHash;
    adminConfig.updatedAt = new Date().toISOString();
    localStorage.setItem(AppConfig.storageKeys.admin, JSON.stringify(adminConfig));
    return { success: true, message: '비밀번호가 변경되었습니다.' };
}

function isAdmin() {
    return sessionStorage.getItem(AppConfig.roleKey) === 'admin';
}

function getUserClinicId() {
    return parseInt(sessionStorage.getItem(AppConfig.clinicIdKey)) || null;
}

function getMyClinicCases(allCases) {
    if (isAdmin()) return allCases;
    const myClinicId = getUserClinicId();
    return allCases.filter(c => c.clinicId === myClinicId);
}

function checkSession() {
    const session = sessionStorage.getItem(AppConfig.sessionKey);
    const role = sessionStorage.getItem(AppConfig.roleKey);
    const userName = sessionStorage.getItem(AppConfig.userKey);
    
    if (session === 'valid') {
        return { valid: true, role, userName };
    }
    return { valid: false };
}

function createSession(user, role, clinicId = null) {
    sessionStorage.setItem(AppConfig.sessionKey, 'valid');
    sessionStorage.setItem(AppConfig.userKey, user);
    sessionStorage.setItem(AppConfig.roleKey, role);
    if (clinicId) {
        sessionStorage.setItem(AppConfig.clinicIdKey, clinicId);
    }
}

function destroySession() {
    sessionStorage.removeItem(AppConfig.sessionKey);
    sessionStorage.removeItem(AppConfig.userKey);
    sessionStorage.removeItem(AppConfig.roleKey);
    sessionStorage.removeItem(AppConfig.clinicIdKey);
}
