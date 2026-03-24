function renderClinics() {
    const tbody = document.getElementById('clinicTableBody');
    
    if (clinics.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:var(--text3);">등록된 거래처가 없습니다</td></tr>';
        return;
    }
    
    tbody.innerHTML = clinics.map(c => `
        <tr>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td>${escapeHtml(c.owner || '-')}</td>
            <td>${escapeHtml(c.phone || '-')}</td>
            <td>${escapeHtml(c.businessNumber || '-')}</td>
            <td>
                <div class="row-actions">
                    <button class="btn btn-ghost btn-sm" onclick="editClinic(${c.id})" title="수정">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteClinic(${c.id})" title="삭제">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openClinicModal(id = null) {
    document.getElementById('clinicModal').classList.add('open');
    document.getElementById('clinicModalTitle').textContent = id ? '🏢 거래처 수정' : '🏢 거래처 추가';
    document.getElementById('clinicId').value = id || '';
    document.getElementById('clinicName').value = '';
    document.getElementById('clinicOwner').value = '';
    document.getElementById('clinicPhone').value = '';
    document.getElementById('clinicBusinessNum').value = '';
    document.getElementById('clinicPassword').value = '';
    
    if (id) {
        const c = clinics.find(x => x.id === id);
        if (c) {
            document.getElementById('clinicName').value = c.name || '';
            document.getElementById('clinicOwner').value = c.owner || '';
            document.getElementById('clinicPhone').value = c.phone || '';
            document.getElementById('clinicBusinessNum').value = c.businessNumber || '';
            document.getElementById('clinicPassword').value = '';
            document.getElementById('clinicPassword').placeholder = c.passwordHash ? '변경 시에만 입력' : '비밀번호 입력';
            loadClinicPromises(c.promises || []);
        }
    } else {
        document.getElementById('clinicPassword').placeholder = '비밀번호 입력';
        loadClinicPromises([]);
    }
}

function autoFillClinicLogin() {
    const name = document.getElementById('clinicName').value;
    const businessNum = document.getElementById('clinicBusinessNum').value.replace(/-/g, '');
    
    if (!document.getElementById('clinicPassword').value && businessNum.length >= 5) {
        document.getElementById('clinicPassword').value = businessNum.slice(-5);
    }
}

function closeClinicModal() {
    document.getElementById('clinicModal').classList.remove('open');
}

async function saveClinic() {
    const id = document.getElementById('clinicId').value;
    const name = validateInput(document.getElementById('clinicName').value, 50);
    const owner = validateInput(document.getElementById('clinicOwner').value, 30);
    const phone = validateInput(document.getElementById('clinicPhone').value, 20);
    const businessNumber = validateInput(document.getElementById('clinicBusinessNum').value, 20);
    let password = validateInput(document.getElementById('clinicPassword').value, 30);
    
    const promises = [];
    document.querySelectorAll('[id^="clinicPromise"]').forEach(input => {
        if (input && input.value) {
            const val = input.value.trim();
            if (val) promises.push(val);
        }
    });
    
    if (!name || !businessNumber) {
        alert('치과명과 사업자등록번호는 필수입니다.');
        return;
    }
    
    if (!password && businessNumber.length >= 5) {
        password = businessNumber.replace(/-/g, '').slice(-5);
    }
    
    let passwordHash = null;
    if (password) {
        passwordHash = await hashPassword(password);
    }
    
    if (id) {
        const idx = clinics.findIndex(x => x.id === parseInt(id));
        if (idx !== -1) {
            const existingClinic = clinics[idx];
            clinics[idx] = { 
                ...existingClinic, 
                name, owner, phone, businessNumber, 
                promises 
            };
            if (password) {
                clinics[idx].passwordHash = passwordHash;
                delete clinics[idx].password;
            }
        }
    } else {
        const newId = clinics.length > 0 ? Math.max(...clinics.map(c => c.id)) + 1 : 1;
        clinics.push({ 
            id: newId, 
            name, 
            owner, 
            phone, 
            businessNumber, 
            passwordHash,
            promises 
        });
    }
    
    saveData();
    renderClinics();
    populateRegisterOptions();
    closeClinicModal();
    
    if (id) {
        alert('거래처 정보가 수정되었습니다.');
    } else {
        alert('거래처가 추가되었습니다.\n\n로그인 아이디: ' + name + '\n비밀번호: ' + password);
    }
}

function addPromiseField() {
    const container = document.getElementById('clinicPromisesList');
    const count = container.querySelectorAll('[id^="clinicPromise"]').length + 1;
    const div = document.createElement('div');
    div.style.cssText = 'display:flex;gap:8px;align-items:center;';
    div.innerHTML = `<input class="form-input" id="clinicPromise${count}" placeholder="약속/주의사항" style="flex:1"><button type="button" onclick="this.parentElement.remove()" style="padding:6px 12px;background:var(--red-l);border:1px solid var(--red);border-radius:6px;color:var(--red);cursor:pointer;">×</button>`;
    container.appendChild(div);
}

function loadClinicPromises(promises) {
    const container = document.getElementById('clinicPromisesList');
    container.innerHTML = '';
    if (promises && promises.length > 0) {
        promises.forEach((p, i) => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;gap:8px;align-items:center;';
            div.innerHTML = `<input class="form-input" id="clinicPromise${i+1}" value="${escapeHtml(p)}" placeholder="약속/주의사항" style="flex:1"><button type="button" onclick="this.parentElement.remove()" style="padding:6px 12px;background:var(--red-l);border:1px solid var(--red);border-radius:6px;color:var(--red);cursor:pointer;">×</button>`;
            container.appendChild(div);
        });
    }
    addPromiseField();
}

function editClinic(id) {
    openClinicModal(id);
}

function deleteClinic(id) {
    if (!isAdmin()) {
        alert('삭제는 관리자만 가능합니다.');
        return;
    }
    if (confirm('삭제하시겠습니까?')) {
        const inUse = cases.some(c => c.clinicId === id);
        if (inUse) {
            alert('사용 중인 거래처는 삭제할 수 없습니다.');
            return;
        }
        clinics = clinics.filter(c => c.id !== id);
        saveData();
        renderClinics();
        populateRegisterOptions();
    }
}
