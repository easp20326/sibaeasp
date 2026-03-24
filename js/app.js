let isLoggedIn = false;

async function initApp() {
    updateTopbarDate();
    setInterval(updateTopbarDate, 60000);
    checkSession();
}

function initData() {
    loadData();
    initDefaultData();
    populateRegisterOptions();
    populateClinicFilter();
    populateTypeFilter();
}

function showMainApp(role, userName, clinicId = null) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').classList.add('logged-in');
    updateSidebarUser(role === 'admin' ? '관리자' : userName, role === 'admin' ? 'Administrator' : '거래처');
    document.getElementById('topbarUser').textContent = role === 'admin' ? '👑 관리자' : '🏢 ' + userName;
    document.getElementById('topbarUser').className = 'topbar-user' + (role === 'admin' ? ' admin' : '');
    
    if (role !== 'admin') {
        document.getElementById('caseTableContainer').classList.add('price-hidden');
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.clinic-only').forEach(el => el.style.display = 'inline-block');
        document.querySelectorAll('input[type="number"]#reg-price, input[type="number"]#edit-price').forEach(el => el.closest('.form-row').style.display = 'none');
        updateClinicAlertBadge();
        renderAdminNotice();
    } else {
        document.getElementById('caseTableContainer').classList.remove('price-hidden');
        renderAdminNotice();
    }
    
    isLoggedIn = true;
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const userIdInput = document.getElementById('userId').value.trim();
    const passwordInput = document.getElementById('password').value;
    
    loginBtn.classList.add('loading');
    loginBtn.textContent = '';
    loginError.classList.remove('show');
    
    try {
        const adminConfig = await initializeAdminAccount();
        
        loadData();
        
        if (clinics.length === 0) {
            const pwd1 = await hashPassword('seoul123');
            const pwd2 = await hashPassword('busan456');
            const pwd3 = await hashPassword('daegu789');
            
            clinics = [
                { id: 1, name: '서울치과', owner: '김서울', phone: '02-1234-5678', businessNumber: '123-45-67890', loginId: '서울치과', passwordHash: pwd1, promises: ['색상: 자연치 색 선호', '배송: 익일 오전必'] },
                { id: 2, name: '부산치과', owner: '박부산', phone: '051-1234-5678', businessNumber: '234-56-78901', loginId: '부산치과', passwordHash: pwd2, promises: [] },
                { id: 3, name: '대구치과', owner: '이대구', phone: '053-1234-5678', businessNumber: '345-67-89012', loginId: '대구치과', passwordHash: pwd3, promises: ['재질: 지르코니아만'] },
            ];
            saveData();
        }
        
        if (userIdInput === adminConfig.loginId) {
            const isValid = await verifyPassword(passwordInput, adminConfig.passwordHash);
            
            if (isValid) {
                createSession('이룸', 'admin');
                initData();
                await initDB();
                await checkStorageUsage();
                renderStats();
                renderTable();
                showMainApp('admin', '이룸');
            } else {
                throw new Error('invalid');
            }
        } else {
            let clinicUser = null;
            
            for (const clinic of clinics) {
                if (clinic.name === userIdInput) {
                    if (clinic.passwordHash) {
                        const isValid = await verifyPassword(passwordInput, clinic.passwordHash);
                        if (isValid) {
                            clinicUser = clinic;
                            break;
                        }
                    } else if (clinic.password === passwordInput) {
                        clinicUser = clinic;
                        clinic.passwordHash = await hashPassword(passwordInput);
                        delete clinic.password;
                        saveData();
                        break;
                    }
                }
            }
            
            if (clinicUser) {
                createSession(clinicUser.name, 'clinic', clinicUser.id);
                initData();
                await initDB();
                await checkStorageUsage();
                renderStats();
                renderTable();
                showMainApp('clinic', clinicUser.name, clinicUser.id);
            } else {
                throw new Error('invalid');
            }
        }
        
    } catch (error) {
        loginError.textContent = '아이디 또는 비밀번호를 확인해주세요.';
        loginError.classList.add('show');
        loginBtn.classList.remove('loading');
        loginBtn.textContent = '로그인';
    }
});

document.getElementById('registerForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const clinicId = parseInt(document.getElementById('reg-clinic').value);
    const patient = validateInput(document.getElementById('reg-patient').value, 50);
    const tooth = validateInput(document.getElementById('reg-tooth').value, 20);
    const type = document.getElementById('reg-type').value;
    const unitType = document.querySelector('input[name="reg-unitType"]:checked').value;
    const isRemake = document.getElementById('reg-isRemake').checked;
    const shipDate = document.getElementById('reg-ship').value;
    const price = parseInt(document.getElementById('reg-price').value) || 0;
    const memo = validateInput(document.getElementById('reg-memo').value, 500);
    
    if (!clinicId || !patient || !tooth || !type) {
        alert('필수 항목을 모두 입력해주세요.');
        return;
    }
    
    const newCase = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        clinicId: clinicId,
        patient: patient,
        tooth: tooth,
        type: type,
        unitType: unitType + (isRemake ? ' (리메이크)' : ''),
        price: price,
        status: 'working',
        shipDate: shipDate || '',
        memo: memo,
        isRemake: isRemake
    };
    
    cases.unshift(newCase);
    saveData();
    renderStats();
    renderTable();
    
    alert('접수 등록이 완료되었습니다!');
    resetRegisterForm();
    
    showPage('list');
    document.querySelector('.nav-item').classList.add('active');
});

document.getElementById('reg-clinic')?.addEventListener('change', calculateAndSetPrice);
document.getElementById('reg-type')?.addEventListener('change', function() {
    calculateAndSetPrice();
});

document.getElementById('edit-type')?.addEventListener('change', function() {
    const clinicId = parseInt(document.getElementById('edit-clinic')?.value) || 0;
    const prostheticName = this.value;
    if (clinicId && prostheticName) {
        const toothCount = (document.getElementById('edit-tooth')?.value || '').split(',').length;
        const finalPrice = getFinalPrice(clinicId, prostheticName, toothCount);
        document.getElementById('edit-price').value = finalPrice;
    }
});

document.getElementById('searchInput')?.addEventListener('input', debounceSearch);

document.getElementById('saveClinicBtn')?.addEventListener('click', async function() {
    const btn = this;
    btn.disabled = true;
    btn.textContent = '저장 중...';
    
    try {
        await saveClinic();
    } catch (error) {
        console.error('거래처 저장 오류:', error);
        alert('저장 중 오류가 발생했습니다.');
    } finally {
        btn.disabled = false;
        btn.textContent = '저장';
    }
});

document.getElementById('admin-new-pwd')?.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        handleAdminPasswordChange();
    }
});

async function handleAdminPasswordChange() {
    const newPwd = document.getElementById('admin-new-pwd')?.value;
    const statusEl = document.getElementById('admin-password-status');
    
    if (!newPwd) {
        statusEl.textContent = '새 비밀번호를 입력하세요.';
        statusEl.style.color = 'var(--red)';
        return;
    }
    
    if (newPwd.length < 8) {
        statusEl.textContent = '비밀번호는 최소 8자 이상이어야 합니다.';
        statusEl.style.color = 'var(--red)';
        return;
    }
    
    const result = await changeAdminPassword(newPwd);
    
    if (result.success) {
        statusEl.textContent = '✅ 비밀번호가 변경되었습니다!';
        statusEl.style.color = 'var(--green)';
        document.getElementById('admin-new-pwd').value = '';
    } else {
        statusEl.textContent = '❌ ' + result.message;
        statusEl.style.color = 'var(--red)';
    }
}

function updateClinicAlertBadge() {
    const badge = document.getElementById('clinicAlertBadge');
    const count = document.getElementById('clinicAlertCount');
    if (!badge || !count) return;
    
    if (isAdmin()) {
        badge.style.display = 'none';
        return;
    }
    
    const myCases = getMyClinicCases(cases);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const urgentCases = myCases.filter(c => {
        if (!c.shipDate || c.status === 'done') return false;
        const shipDate = new Date(c.shipDate);
        shipDate.setHours(0, 0, 0, 0);
        const diff = Math.ceil((shipDate - today) / (1000 * 60 * 60 * 24));
        return diff <= 3;
    });
    
    if (urgentCases.length > 0) {
        badge.style.display = 'block';
        count.textContent = urgentCases.length;
    } else {
        badge.style.display = 'none';
    }
}

function showClinicAlerts() {
    const container = document.getElementById('clinicAlertList');
    const myCases = getMyClinicCases(cases);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const urgentCases = myCases.filter(c => {
        if (!c.shipDate || c.status === 'done') return false;
        const shipDate = new Date(c.shipDate);
        shipDate.setHours(0, 0, 0, 0);
        const diff = Math.ceil((shipDate - today) / (1000 * 60 * 60 * 24));
        return diff <= 3;
    }).sort((a, b) => new Date(a.shipDate) - new Date(b.shipDate));
    
    if (urgentCases.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text3);padding:20px;">🔔 출고 알림이 없습니다</p>';
    } else {
        let html = '';
        urgentCases.forEach(c => {
            const shipDate = new Date(c.shipDate);
            shipDate.setHours(0, 0, 0, 0);
            const diff = Math.ceil((shipDate - today) / (1000 * 60 * 60 * 24));
            let badge = '';
            let bgColor = '#fef3c7';
            if (diff < 0) {
                badge = '🔴 지연';
                bgColor = '#fee2e2';
            } else if (diff === 0) {
                badge = '🟡 오늘';
                bgColor = '#fef9c3';
            } else if (diff === 1) {
                badge = '🟠 내일';
                bgColor = '#ffedd5';
            } else {
                badge = `⏰ ${diff}일 후`;
            }
            html += `<div style="padding:12px;background:${bgColor};border-radius:8px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
                <div>
                    <div style="font-weight:600;">${escapeHtml(c.patient)} - ${escapeHtml(c.type)}</div>
                    <div style="font-size:12px;color:#666;">치아: ${escapeHtml(c.tooth)}</div>
                </div>
                <div style="text-align:right;">
                    <div style="font-weight:700;">${badge}</div>
                    <div style="font-size:11px;color:#888;">${c.shipDate}</div>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    }
    
    document.getElementById('clinicAlertModal').classList.add('open');
}

function closeClinicAlerts() {
    document.getElementById('clinicAlertModal').classList.remove('open');
}

function updateMessageBadge() {
    const badge = document.getElementById('messageBadge');
    if (!badge) return;
    
    if (isAdmin()) {
        const unread = messages.filter(m => !m.isRead && m.to === 'admin').length;
        if (unread > 0) {
            badge.style.display = 'block';
            badge.textContent = unread;
        } else {
            badge.style.display = 'none';
        }
    }
}

function showSendMessage() {
    currentMessageFilter = 'clinic';
    document.getElementById('messageModalTitle').textContent = '💬 관리자에게 메시지';
    document.getElementById('messageModal').classList.add('open');
    renderClinicMessages();
}

function showMessageCenter() {
    currentMessageFilter = 'admin';
    document.getElementById('messageModalTitle').textContent = '💬 메시지 함';
    document.getElementById('messageModal').classList.add('open');
    renderAdminMessages();
    
    messages.forEach(m => {
        if (m.to === 'admin') m.isRead = true;
    });
    saveMessages();
    updateMessageBadge();
}

function renderClinicMessages() {
    const container = document.getElementById('messageContent');
    const myClinicId = getUserClinicId();
    
    let sent = messages.filter(m => m.fromId === myClinicId);
    let received = messages.filter(m => m.toClinicId === myClinicId);
    
    let html = '<div style="max-height:350px;overflow-y:auto;margin-bottom:12px;">';
    
    sent.forEach(m => {
        html += `<div style="padding:10px;background:#dbeafe;border-radius:10px 10px 0 10px;margin-bottom:8px;margin-left:20%;">
            <div style="font-size:11px;color:#666;margin-bottom:4px;">나 → 관리자</div>
            <div>${escapeHtml(m.text)}</div>
            <div style="font-size:10px;color:#999;margin-top:4px;text-align:right;">${new Date(m.date).toLocaleString()}</div>
        </div>`;
    });
    
    received.forEach(m => {
        html += `<div style="padding:10px;background:#dcfce7;border-radius:10px 10px 10px 0;margin-bottom:8px;margin-right:20%;">
            <div style="font-size:11px;color:#666;margin-bottom:4px;">관리자 → 나</div>
            <div>${escapeHtml(m.text)}</div>
            <div style="font-size:10px;color:#999;margin-top:4px;">${new Date(m.date).toLocaleString()}</div>
        </div>`;
    });
    
    html += '</div>';
    html += '<div id="messageListContainer"></div>';
    container.innerHTML = html;
    container.scrollTop = container.scrollHeight;
    
    document.getElementById('messageInput').style.display = 'block';
    document.getElementById('messageInput').placeholder = '관리자에게 메시지 입력...';
    document.getElementById('messageInput').value = '';
    document.getElementById('messageInput').focus();
}

function renderAdminMessages() {
    const container = document.getElementById('messageContent');
    
    let filtered = messages.filter(m => m.to === 'admin');
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:var(--text3);padding:20px;">메시지가 없습니다</p>';
    } else {
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        let html = '<div style="margin-bottom:12px;"><select id="msgClinicFilter" onchange="filterMessagesByClinic()" style="padding:8px;border:1px solid var(--border);border-radius:8px;width:100%;"><option value="all">전체 거래처</option>';
        const clinicIds = [...new Set(filtered.map(m => m.fromId))];
        clinicIds.forEach(id => {
            const clinic = clinics.find(c => c.id === id);
            if (clinic) {
                html += `<option value="${id}">${escapeHtml(clinic.name)}</option>`;
            }
        });
        html += '</select></div>';
        html += '<div id="messageListContainer">';
        html += renderMessageItems(filtered);
        html += '</div>';
        html += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);"><button class="btn btn-secondary btn-sm" onclick="exportMessagesCSV()">📊 CSV 내보내기</button></div>';
        container.innerHTML = html;
    }
    
    document.getElementById('messageInput').style.display = 'none';
    document.querySelector('#messageModal .modal-footer button').style.display = 'none';
}

function filterMessagesByClinic() {
    const filter = document.getElementById('msgClinicFilter').value;
    let filtered = messages.filter(m => m.to === 'admin');
    
    if (filter !== 'all') {
        filtered = filtered.filter(m => m.fromId === parseInt(filter));
    }
    
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    document.getElementById('messageListContainer').innerHTML = renderMessageItems(filtered);
}

function renderMessageItems(msgList) {
    let html = '';
    msgList.forEach(m => {
        const clinic = clinics.find(c => c.id === m.fromId);
        const sender = clinic?.name || '알 수 없음';
        html += `<div style="padding:12px;background:#e0f2fe;border-radius:8px;margin-bottom:8px;position:relative;" id="msg-${m.id}">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
                <strong>${escapeHtml(sender)}</strong>
                <span style="font-size:11px;color:#666;">${new Date(m.date).toLocaleString()}</span>
            </div>
            <div id="msg-text-${m.id}">${escapeHtml(m.text)}</div>
            <div style="margin-top:8px;display:flex;gap:8px;">
                <button class="btn btn-ghost btn-sm" onclick="editMessage(${m.id})" style="color:var(--blue);">✏️ 수정</button>
                <button class="btn btn-ghost btn-sm" onclick="deleteMessage(${m.id})" style="color:var(--red);">🗑️ 삭제</button>
            </div>
        </div>`;
    });
    return html;
}

function editMessage(id) {
    const msg = messages.find(m => m.id === id);
    if (!msg) return;
    
    const currentText = msg.text;
    const newText = prompt('메시지 수정:', currentText);
    if (newText !== null && newText.trim() !== '') {
        msg.text = newText.trim();
        saveMessages();
        filterMessagesByClinic();
    }
}

function deleteMessage(id) {
    if (!confirm('이 메시지를 삭제하시겠습니까?')) return;
    messages = messages.filter(m => m.id !== id);
    saveMessages();
    filterMessagesByClinic();
}

function exportMessagesCSV() {
    let filtered = messages.filter(m => m.to === 'admin');
    
    let csv = '날짜,거래처,메시지\n';
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(m => {
        const clinic = clinics.find(c => c.id === m.fromId);
        csv += `"${new Date(m.date).toLocaleString()}","${clinic?.name || ''}","${m.text.replace(/"/g, '""')}"\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '이룸덴탈Lab_메시지_' + new Date().toISOString().slice(0,10) + '.csv';
    link.click();
}

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;
    
    const myClinicId = getUserClinicId();
    const myName = sessionStorage.getItem(AppConfig.userKey);
    
    messages.push({
        id: Date.now(),
        fromId: myClinicId,
        fromName: myName,
        to: 'admin',
        text: text,
        date: new Date().toISOString(),
        isRead: false
    });
    
    saveMessages();
    input.value = '';
    alert('메시지가 전송되었습니다.');
    closeMessageModal();
}

function closeMessageModal() {
    document.getElementById('messageModal').classList.remove('open');
    currentMessageFilter = 'all';
}

function showToast(title, body, type = 'admin', fromId = null) {
    const container = document.getElementById('toastContainer');
    const id = 'toast-' + Date.now();
    
    const toast = document.createElement('div');
    toast.className = 'toast' + (type === 'clinic' ? ' clinic-toast' : '');
    toast.id = id;
    toast.innerHTML = `
        <div class="toast-header">
            <span class="toast-title">💬 ${escapeHtml(title)}</span>
            <button class="toast-close" onclick="closeToast('${id}')">&times;</button>
        </div>
        <div class="toast-body">${escapeHtml(body)}</div>
        ${type === 'admin' && fromId ? `<button class="btn btn-primary btn-sm" onclick="replyToClinic(${fromId}, '${id}')" style="margin-top:8px;width:100%;">📩 답장하기</button>` : ''}
        <div class="toast-time">${new Date().toLocaleTimeString()}</div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => closeToast(id), 8000);
}

function replyToClinic(clinicId, toastId) {
    closeToast(toastId);
    const clinic = clinics.find(c => c.id === clinicId);
    
    const replyText = prompt(`${clinic?.name || '거래처'}에게 답장:\n\n메시지를 입력하세요`);
    
    if (replyText && replyText.trim()) {
        messages.push({
            id: Date.now(),
            fromId: 0,
            fromName: '관리자',
            to: 'clinic',
            toClinicId: clinicId,
            text: replyText.trim(),
            date: new Date().toISOString(),
            isRead: false
        });
        saveMessages();
        alert('답장이 전송되었습니다.');
    }
}

function closeToast(id) {
    const toast = document.getElementById(id);
    if (toast) {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }
}

function checkNewMessages() {
    if (!isLoggedIn) return;
    
    if (isAdmin()) {
        const newMessages = messages.filter(m => m.to === 'admin' && !m.isRead);
        
        if (newMessages.length > lastMessageCount) {
            const latest = newMessages[newMessages.length - 1];
            const clinic = clinics.find(c => c.id === latest.fromId);
            showToast(clinic?.name || '거래처', latest.text.substring(0, 50) + (latest.text.length > 50 ? '...' : ''), 'admin', latest.fromId);
        }
        
        lastMessageCount = newMessages.length;
        updateMessageBadge();
    } else {
        const myClinicId = getUserClinicId();
        const replies = messages.filter(m => m.toClinicId === myClinicId && !m.isRead);
        
        if (replies.length > 0) {
            replies.forEach(r => {
                showToast('관리자', r.text.substring(0, 50) + (r.text.length > 50 ? '...' : ''), 'clinic');
                r.isRead = true;
            });
            saveMessages();
        }
    }
}

setInterval(checkNewMessages, 5000);

function exportExcel() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    let data = cases.filter(c => {
        if (currentFilter !== 'all' && c.status !== currentFilter) return false;
        if (search) {
            const clinicName = getClinicName(c.clinicId).toLowerCase();
            return c.patient.toLowerCase().includes(search) || 
                   clinicName.includes(search) ||
                   c.tooth.toLowerCase().includes(search) ||
                   c.type.toLowerCase().includes(search);
        }
        return true;
    });
    
    if (data.length === 0) {
        alert('내보낼 데이터가 없습니다.');
        return;
    }
    
    let csv = '접수일,치과,환자,치식,보철종류,구분,단가,상태,출고일,메모\n';
    data.forEach(c => {
        const dateStr = ' ' + (c.date || '');
        const shipDateStr = ' ' + (c.shipDate || '');
        const row = [
            dateStr,
            getClinicName(c.clinicId),
            c.patient,
            c.tooth,
            c.type,
            c.unitType,
            c.price || 0,
            getStatusLabel(c.status),
            shipDateStr,
            (c.memo || '').replace(/,/g, ';')
        ];
        csv += row.join(',') + '\n';
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '이룸덴탈랩_접수목록_' + new Date().toISOString().slice(0,10) + '.csv';
    link.click();
}

function importExcel(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const text = e.target.result;
            const lines = text.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                alert('데이터가 없습니다.');
                return;
            }
            
            const header = parseCSVLine(lines[0]);
            const requiredCols = ['접수일', '치과', '환자', '치식', '보철종류'];
            const hasRequired = requiredCols.every(col => header.some(h => h.includes(col)));
            
            if (!hasRequired) {
                alert('CSV 파일 형식이 올바르지 않습니다.\n필수 열: 접수일, 치과, 환자, 치식, 보철종류');
                return;
            }
            
            let imported = 0;
            let errors = [];
            
            for (let i = 1; i < lines.length; i++) {
                try {
                    const values = parseCSVLine(lines[i]);
                    if (values.length < 5) continue;
                    
                    const row = {};
                    header.forEach((col, idx) => {
                        row[col] = values[idx] || '';
                    });
                    
                    const clinicName = row['치과'] || '';
                    const patient = row['환자'] || '';
                    const tooth = row['치식'] || '';
                    const type = row['보철종류'] || '';
                    const date = row['접수일'] || new Date().toISOString().slice(0,10);
                    const unitType = row['구분'] || '싱글';
                    const price = parseInt(row['단가']) || 0;
                    const shipDate = row['출고일'] || '';
                    const memo = row['메모'] || '';
                    const isRemake = row['리메이크'] === 'true' || row['리메이크'] === '1' || row['리메이크'] === '예';
                    
                    const clinic = clinics.find(c => c.name === clinicName);
                    if (!clinic) {
                        errors.push(`${patient}: "${clinicName}" 치과를 찾을 수 없음`);
                        continue;
                    }
                    
                    const newId = Math.max(0, ...cases.map(c => c.id)) + 1;
                    cases.push({
                        id: newId,
                        date: date,
                        clinicId: clinic.id,
                        patient: patient,
                        tooth: tooth,
                        type: type,
                        unitType: unitType,
                        price: price,
                        status: 'working',
                        shipDate: shipDate,
                        memo: memo,
                        isRemake: isRemake
                    });
                    imported++;
                } catch (err) {
                    errors.push(`줄 ${i + 1}: ${err.message}`);
                }
            }
            
            if (imported > 0) {
                saveData();
                renderTable();
                renderStats();
                populateTypeFilter();
            }
            
            let msg = `${imported}건 등록 완료`;
            if (errors.length > 0) {
                msg += `\n${errors.length}건 실패:\n` + errors.slice(0, 5).join('\n');
                if (errors.length > 5) msg += `\n... 외 ${errors.length - 5}건`;
            }
            alert(msg);
            
        } catch (err) {
            alert('파일 읽기 실패: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

initApp();
