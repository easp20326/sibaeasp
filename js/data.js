let cases = [];
let clinics = [];
let prosthetics = [];
let clinicPrices = [];
let messages = [];
let adminNotices = [];
let supabaseClient = null;

function initSupabase() {
    if (!supabaseClient && window.supabase) {
        supabaseClient = window.supabase.createClient(
            AppConfig.supabase.url,
            AppConfig.supabase.anonKey
        );
    }
    return supabaseClient;
}

async function loadFromSupabase() {
    const sb = initSupabase();
    if (!sb) return false;
    
    try {
        const { data: clinicsData } = await sb.from('clinics').select('*');
        if (clinicsData && clinicsData.length > 0) {
            clinics = clinicsData.map(c => ({
                id: c.id,
                name: c.name,
                owner: c.owner,
                phone: c.phone,
                businessNumber: c.business_number,
                loginId: c.login_id,
                passwordHash: c.password_hash,
                promises: c.promises || [],
                prices: c.prices || {},
                priceAdjust: c.price_adjust || 0
            }));
            localStorage.setItem(AppConfig.storageKeys.clinics, JSON.stringify(clinics));
        }
        
        const { data: prostheticsData } = await sb.from('prosthetics').select('*');
        if (prostheticsData && prostheticsData.length > 0) {
            prosthetics = prostheticsData.map(p => ({
                id: p.id,
                name: p.name,
                price: p.price
            }));
            localStorage.setItem(AppConfig.storageKeys.prosthetics, JSON.stringify(prosthetics));
        }
        
        const { data: casesData } = await sb.from('cases').select('*').order('id', { ascending: false });
        if (casesData && casesData.length > 0) {
            cases = casesData.map(c => ({
                id: c.id,
                date: c.date,
                clinicId: c.clinic_id,
                patient: c.patient,
                tooth: c.tooth,
                type: c.type,
                unitType: c.unit_type,
                price: c.price,
                isRemake: c.is_remake,
                status: c.status,
                shipDate: c.ship_date,
                memo: c.memo || '',
                photos: c.photos || [],
                doneViewed: c.done_viewed
            }));
            localStorage.setItem(AppConfig.storageKeys.cases, JSON.stringify(cases));
        }
        
        const { data: settingsData } = await sb.from('settings').select('*');
        if (settingsData) {
            settingsData.forEach(s => {
                if (s.key === 'adminPassword') {
                    AppConfig.defaultAdminPassword = s.value;
                }
            });
        }
        
        return true;
    } catch (e) {
        console.error('Supabase 로드 오류:', e);
        return false;
    }
}

async function saveToSupabase(table, data, idField = 'id') {
    const sb = initSupabase();
    if (!sb) return false;
    
    try {
        if (data.id) {
            await sb.from(table).update(data).eq(idField, data.id);
        } else {
            await sb.from(table).insert(data);
        }
        return true;
    } catch (e) {
        console.error('Supabase 저장 오류:', e);
        return false;
    }
}

async function deleteFromSupabase(table, id) {
    const sb = initSupabase();
    if (!sb) return false;
    
    try {
        await sb.from(table).delete().eq('id', id);
        return true;
    } catch (e) {
        console.error('Supabase 삭제 오류:', e);
        return false;
    }
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function validateInput(value, maxLength = 100) {
    if (!value || typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
}

function saveData() {
    localStorage.setItem(AppConfig.storageKeys.cases, JSON.stringify(cases));
    localStorage.setItem(AppConfig.storageKeys.clinics, JSON.stringify(clinics));
    localStorage.setItem(AppConfig.storageKeys.prosthetics, JSON.stringify(prosthetics));
    localStorage.setItem(AppConfig.storageKeys.clinicPrices, JSON.stringify(clinicPrices));
    
    const sb = initSupabase();
    if (!sb) return;
    
    cases.forEach(c => {
        const sbData = {
            date: c.date,
            clinic_id: c.clinicId,
            patient: c.patient,
            tooth: c.tooth,
            type: c.type,
            unit_type: c.unitType,
            price: c.price || 0,
            is_remake: c.isRemake || false,
            status: c.status,
            ship_date: c.shipDate,
            memo: c.memo || '',
            photos: c.photos || [],
            done_viewed: c.doneViewed || false
        };
        if (c.id) {
            sb.from('cases').update(sbData).eq('id', c.id).then();
        } else {
            sb.from('cases').insert(sbData).then();
        }
    });
}

function saveMessages() {
    localStorage.setItem(AppConfig.storageKeys.messages, JSON.stringify(messages));
}

async function loadData() {
    const loadedFromSupabase = await loadFromSupabase();
    
    if (loadedFromSupabase) {
        return;
    }
    
    try {
        const savedCases = localStorage.getItem(AppConfig.storageKeys.cases);
        const savedClinics = localStorage.getItem(AppConfig.storageKeys.clinics);
        const savedProsthetics = localStorage.getItem(AppConfig.storageKeys.prosthetics);
        const savedClinicPrices = localStorage.getItem(AppConfig.storageKeys.clinicPrices);
        const savedMessages = localStorage.getItem(AppConfig.storageKeys.messages);
        
        if (savedCases) {
            const parsed = JSON.parse(savedCases);
            if (Array.isArray(parsed)) cases = parsed;
        }
        if (savedClinics) {
            const parsed = JSON.parse(savedClinics);
            if (Array.isArray(parsed)) clinics = parsed;
        }
        if (savedProsthetics) {
            const parsed = JSON.parse(savedProsthetics);
            if (Array.isArray(parsed)) prosthetics = parsed;
        }
        if (savedClinicPrices) {
            const parsed = JSON.parse(savedClinicPrices);
            if (Array.isArray(parsed)) clinicPrices = parsed;
        }
        if (savedMessages) {
            messages = JSON.parse(savedMessages);
        }
    } catch (e) {
        console.error('데이터 로드 오류:', e);
    }
}

function initDefaultData() {
    if (cases.length === 0) {
        cases = [
            { id: 1, date: '2026-03-18', clinicId: 1, patient: '김*수', tooth: '#46', type: '지르코니아', unitType: '싱글', price: 150000, status: 'working', shipDate: '2026-03-20', memo: '' },
            { id: 2, date: '2026-03-17', clinicId: 2, patient: '이*영', tooth: '#35', type: '라미네이트', unitType: '싱글', price: 200000, status: 'design', shipDate: '2026-03-22', memo: '' },
            { id: 3, date: '2026-03-16', clinicId: 1, patient: '박*민', tooth: '#47', type: '지르코니아', unitType: '브릿지', price: 350000, status: 'manufacturing', shipDate: '2026-03-19', memo: '' },
            { id: 4, date: '2026-03-15', clinicId: 3, patient: '정*현', tooth: '#24', type: '임플란트', unitType: '싱글', price: 500000, status: 'ship', shipDate: '2026-03-18', memo: '' },
            { id: 5, date: '2026-03-14', clinicId: 2, patient: '최*호', tooth: '#16', type: '골드', unitType: '싱글', price: 180000, status: 'done', shipDate: '2026-03-17', memo: '' },
        ];
    }
    
    if (prosthetics.length === 0) {
        prosthetics = [
            { id: 1, name: '지르코니아', price: 150000 },
            { id: 2, name: '라미네이트', price: 200000 },
            { id: 3, name: '임플란트', price: 500000 },
            { id: 4, name: '골드', price: 180000 },
            { id: 5, name: 'PRS', price: 120000 },
        ];
    }
    
    saveData();
}

function getClinicName(id) {
    const clinic = clinics.find(c => c.id === id);
    return clinic ? escapeHtml(clinic.name) : '-';
}

function getCalculatedPrice(clinicId, prostheticName) {
    const prosthetic = prosthetics.find(p => p.name === prostheticName);
    if (!prosthetic) return 0;
    
    const basePrice = prosthetic.price || 0;
    const priceRule = clinicPrices.find(p => p.clinicId === clinicId && p.prostheticName === prostheticName);
    
    if (priceRule) {
        if (priceRule.customPrice > 0) {
            return priceRule.customPrice;
        }
        if (priceRule.discountPercent !== 0) {
            return Math.round(basePrice * (1 + priceRule.discountPercent / 100));
        }
    }
    
    return basePrice;
}

function getClinicDiscount(clinicId, prostheticName) {
    const priceRule = clinicPrices.find(p => p.clinicId === clinicId && p.prostheticName === prostheticName);
    if (priceRule && priceRule.discountPercent !== 0) {
        return priceRule.discountPercent;
    }
    return null;
}

function getBaseProstheticPrice(prostheticName) {
    const prosthetic = prosthetics.find(p => p.name === prostheticName);
    return prosthetic?.price || 0;
}

function getFinalPrice(clinicId, prostheticName, toothCount) {
    const unitPrice = getCalculatedPrice(clinicId, prostheticName);
    return unitPrice * (toothCount || 1);
}

function formatPrice(price) {
    return price.toLocaleString();
}

function getStatusLabel(status) {
    return StatusConfig[status]?.label || status;
}

function getStatusClass(status) {
    return 'status-' + status;
}

function getShipCountdown(shipDate, status) {
    if (!shipDate || status === 'done') return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ship = new Date(shipDate);
    ship.setHours(0, 0, 0, 0);
    
    const diff = Math.ceil((ship - today) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) {
        return '<span style="background:#dc2626;color:#fff;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:bold;">⚠️ ' + Math.abs(diff) + '일 지연</span>';
    } else if (diff === 0) {
        return '<span style="background:#d97706;color:#fff;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:bold;">🚨 오늘 출고!</span>';
    } else if (diff === 1) {
        return '<span style="background:#f59e0b;color:#fff;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:bold;">⚡ 내일 출고!</span>';
    } else if (diff <= 3) {
        return '<span style="background:#fbbf24;color:#000;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:bold;">⏰ ' + diff + '일 남음</span>';
    } else {
        return '<span style="background:#16a34a;color:#fff;padding:3px 8px;border-radius:999px;font-size:11px;font-weight:bold;">✅ ' + diff + '일</span>';
    }
}

function getPeriodRange(p) {
    const d = new Date();
    switch(p) {
        case 'thisMonth':
            return { start: new Date(d.getFullYear(), d.getMonth(), 1), end: new Date(d.getFullYear(), d.getMonth() + 1, 0) };
        case 'lastMonth':
            const lm = new Date(d.getFullYear(), d.getMonth() - 1, 1);
            return { start: lm, end: new Date(lm.getFullYear(), lm.getMonth() + 1, 0) };
        case 'thisYear':
            return { start: new Date(d.getFullYear(), 0, 1), end: new Date(d.getFullYear(), 11, 31) };
        default:
            return { start: new Date(2020, 0, 1), end: new Date(2030, 11, 31) };
    }
}

function getFactorySettings() {
    const defaults = {
        name: '이룸덴탈랩',
        business: '',
        address: '',
        tel: '',
        fax: '',
        extra: ''
    };
    const saved = localStorage.getItem(AppConfig.storageKeys.factory);
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
}

function saveFactoryInfo(info) {
    localStorage.setItem(AppConfig.storageKeys.factory, JSON.stringify(info));
}

async function backupAll() {
    try {
        if (!db) await initDB();
        
        const transaction = db.transaction(['photos'], 'readonly');
        const store = transaction.objectStore('photos');
        const photosRequest = store.getAll();
        
        photosRequest.onsuccess = () => {
            const photos = photosRequest.result;
            
            const backupData = {
                cases: cases,
                clinics: clinics,
                prosthetics: prosthetics,
                photos: photos,
                backupDate: new Date().toISOString()
            };
            
            const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'EROOM_백업_' + new Date().toISOString().slice(0,10) + '.json';
            link.click();
            URL.revokeObjectURL(url);
            
            alert('백업 완료! (' + photos.length + '건의 사진 포함)');
        };
    } catch (e) {
        alert('백업 실패: ' + e.message);
    }
}

async function restoreBackup(file) {
    try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        if (data.cases) cases = data.cases;
        if (data.clinics) clinics = data.clinics;
        if (data.prosthetics) prosthetics = data.prosthetics;
        
        saveData();
        
        if (data.photos && db) {
            const transaction = db.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            
            data.photos.forEach(photo => {
                store.put(photo);
            });
            
            transaction.oncomplete = () => {
                alert('복원 완료!');
            };
        } else {
            alert('복원 완료! (사진 제외)');
        }
    } catch (e) {
        alert('복원 실패: ' + e.message);
    }
}

function getNotices() {
    if (adminNotices.length === 0) {
        adminNotices = JSON.parse(localStorage.getItem('adminNotices') || '[]');
    }
    return adminNotices.filter(n => n.active !== false).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function saveNotices() {
    localStorage.setItem('adminNotices', JSON.stringify(adminNotices));
}

function addAdminNotice(title, content) {
    const notice = {
        id: Date.now(),
        title: title,
        content: content,
        createdAt: new Date().toISOString(),
        active: true
    };
    adminNotices.push(notice);
    saveNotices();
}

function deleteAdminNotice(id) {
    adminNotices = adminNotices.filter(n => n.id !== id);
    saveNotices();
}

function renderNoticeList() {
    const container = document.getElementById('notice-list');
    if (!container) return;
    
    const notices = getNotices();
    if (notices.length === 0) {
        container.innerHTML = '<p style="font-size:12px;color:var(--text3);">등록된 공지가 없습니다.</p>';
        return;
    }
    
    let html = '<div style="margin-top:12px;">';
    notices.forEach(n => {
        html += `<div style="padding:8px;background:var(--surface2);border-radius:4px;margin-bottom:8px;font-size:12px;">
            <div style="font-weight:600;">${escapeHtml(n.title)}</div>
            <div style="color:var(--text3);margin-top:4px;">${escapeHtml(n.content)}</div>
            <button onclick="deleteAdminNotice(${n.id});renderNoticeList();" style="font-size:11px;color:#dc2626;background:none;border:none;cursor:pointer;margin-top:4px;">삭제</button>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}
