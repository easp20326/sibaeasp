const AppConfig = {
    name: '이룸덴탈랩',
    dbName: 'EROOM_DentalDB',
    dbVersion: 1,
    maxStorage: 100 * 1024 * 1024,
    maxPhotoSize: 5 * 1024 * 1024,
    defaultAdminId: '이룸',
    defaultAdminPassword: 'jin7102__!!',
    sessionKey: 'eroom_session',
    roleKey: 'eroom_role',
    userKey: 'eroom_user',
    clinicIdKey: 'eroom_clinic_id',
    storageKeys: {
        cases: 'eroom_cases',
        clinics: 'eroom_clinics',
        prosthetics: 'eroom_prosthetics',
        clinicPrices: 'eroom_clinic_prices',
        admin: 'eroom_admin',
        messages: 'eroom_messages',
        photos: 'eroom_photos',
        factory: 'eroom_factory'
    }
};

const StatusConfig = {
    working: { label: '접수중', class: 'status-working', color: '#f59e0b' },
    design: { label: '디자인중', class: 'status-design', color: '#8b5cf6' },
    manufacturing: { label: '제작중', class: 'status-manufacturing', color: '#f97316' },
    ship: { label: '배송중', class: 'status-ship', color: '#3b82f6' },
    done: { label: '완료됨', class: 'status-done', color: '#22c55e' }
};

const ToothNames = ['', '중절치', '측절치', '견치', '제1소구치', '제2소구치', '제1대구치', '제2대구치'];
const ToothQuadrants = {
    1: [17, 16, 15, 14, 13, 12, 11],
    2: [21, 22, 23, 24, 25, 26, 27],
    3: [31, 32, 33, 34, 35, 36, 37],
    4: [47, 46, 45, 44, 43, 42, 41]
};

window.AppConfig = AppConfig;
window.StatusConfig = StatusConfig;
window.ToothNames = ToothNames;
window.ToothQuadrants = ToothQuadrants;
