function renderProstheticTable() {
    const tbody = document.getElementById('prostheticTableBody');
    
    if (prosthetics.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:40px;color:var(--text3);">등록된 보철이 없습니다</td></tr>';
        return;
    }
    
    tbody.innerHTML = prosthetics.map(p => `
        <tr>
            <td><strong>${escapeHtml(p.name)}</strong></td>
            <td>${(p.price || 0).toLocaleString()}원</td>
            <td>
                <div class="row-actions">
                    <button class="btn btn-ghost btn-sm" onclick="editProsthetic(${p.id})" title="수정">✏️</button>
                    <button class="btn btn-ghost btn-sm" onclick="deleteProsthetic(${p.id})" title="삭제">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function openProstheticModal(id = null) {
    document.getElementById('prostheticModal').classList.add('open');
    document.getElementById('prostheticModalTitle').textContent = id ? '🦷 보철 수정' : '🦷 보철 추가';
    document.getElementById('edit-prosthetic-id').value = id || '';
    document.getElementById('prosthetic-name').value = '';
    document.getElementById('prosthetic-price').value = '';
    
    if (id) {
        const p = prosthetics.find(x => x.id === id);
        if (p) {
            document.getElementById('prosthetic-name').value = p.name || '';
            document.getElementById('prosthetic-price').value = p.price || '';
        }
    }
}

function closeProstheticModal() {
    document.getElementById('prostheticModal').classList.remove('open');
}

function saveProsthetic() {
    const id = document.getElementById('edit-prosthetic-id').value;
    const name = document.getElementById('prosthetic-name').value.trim();
    const price = parseInt(document.getElementById('prosthetic-price').value) || 0;
    
    if (!name) {
        alert('보철명을 입력해 주세요.');
        return;
    }
    
    if (id) {
        const idx = prosthetics.findIndex(x => x.id === parseInt(id));
        if (idx !== -1) {
            prosthetics[idx] = { ...prosthetics[idx], name, price };
        }
    } else {
        const newId = prosthetics.length > 0 ? Math.max(...prosthetics.map(p => p.id)) + 1 : 1;
        prosthetics.push({ id: newId, name, price });
    }
    
    saveData();
    renderProstheticTable();
    populateTypeFilter();
    closeProstheticModal();
    alert('저장되었습니다.');
}

function editProsthetic(id) {
    openProstheticModal(id);
}

function deleteProsthetic(id) {
    if (!isAdmin()) {
        alert('삭제는 관리자만 가능합니다.');
        return;
    }
    if (confirm('삭제하시겠습니까?')) {
        prosthetics = prosthetics.filter(p => p.id !== id);
        saveData();
        renderProstheticTable();
        populateTypeFilter();
    }
}

function openClinicPriceModal() {
    priceViewMode = 'edit';
    document.getElementById('priceEditView').style.display = 'block';
    document.getElementById('priceSummaryView').style.display = 'none';
    renderClinicPriceList();
    document.getElementById('clinicPriceModal').classList.add('open');
}

function closeClinicPriceModal() {
    document.getElementById('clinicPriceModal').classList.remove('open');
}

function renderClinicPriceList() {
    const container = document.getElementById('clinicPriceList');
    if (clinicPrices.length === 0) {
        container.innerHTML = '<p style="color:var(--text3);text-align:center;padding:20px;">설정된 가격이 없습니다.</p>';
        return;
    }
    
    let html = '';
    clinicPrices.forEach((rule, idx) => {
        const prosthetic = prosthetics.find(p => p.name === rule.prostheticName);
        const basePrice = prosthetic?.price || 0;
        const calculatedPrice = rule.customPrice > 0 ? rule.customPrice : Math.round(basePrice * (1 + (rule.discountPercent || 0) / 100));
        
        html += `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 100px;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
            <select id="cp-clinic-${idx}" class="form-select" style="font-size:12px;">
                <option value="">치과 선택</option>
                ${clinics.map(c => `<option value="${c.id}" ${c.id === rule.clinicId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
            <select id="cp-prosthetic-${idx}" class="form-select" style="font-size:12px;">
                <option value="">보철 선택</option>
                ${prosthetics.map(p => `<option value="${p.name}" ${p.name === rule.prostheticName ? 'selected' : ''}>${escapeHtml(p.name)} (${(p.price || 0).toLocaleString()}원)</option>`).join('')}
            </select>
            <div style="display:flex;gap:4px;align-items:center;">
                <input type="number" id="cp-price-${idx}" class="form-input" placeholder="단가" value="${rule.customPrice > 0 ? rule.customPrice : ''}" style="width:80px;font-size:12px;">
                <span style="font-size:11px;color:var(--text3);">또는</span>
                <input type="number" id="cp-discount-${idx}" class="form-input" placeholder="%" value="${rule.discountPercent || ''}" style="width:60px;font-size:12px;">
                <span style="font-size:11px;">%</span>
            </div>
            <button class="btn btn-ghost btn-sm" onclick="removeClinicPrice(${idx})" style="color:var(--red);">🗑️</button>
        </div>`;
    });
    container.innerHTML = html;
}

function addClinicPriceRow() {
    clinicPrices.push({ clinicId: 0, prostheticName: '', customPrice: 0, discountPercent: 0 });
    renderClinicPriceList();
}

function removeClinicPrice(idx) {
    clinicPrices.splice(idx, 1);
    renderClinicPriceList();
}

function switchPriceView(mode) {
    priceViewMode = mode;
    const editView = document.getElementById('priceEditView');
    const summaryView = document.getElementById('priceSummaryView');
    if (mode === 'summary') {
        editView.style.display = 'none';
        summaryView.style.display = 'block';
        renderClinicPriceSummary();
    } else {
        editView.style.display = 'block';
        summaryView.style.display = 'none';
    }
}

function renderClinicPriceSummary() {
    const container = document.getElementById('clinicPriceSummary');
    
    if (clinics.length === 0 || prosthetics.length === 0) {
        container.innerHTML = '<p style="color:var(--text3);text-align:center;padding:20px;">거래처 또는 보철 종류가 없습니다.</p>';
        return;
    }
    
    let tableHtml = `<table style="width:100%;border-collapse:collapse;font-size:12px;">`;
    
    tableHtml += `<thead><tr style="background:#f1f5f9;">
        <th style="padding:10px 8px;border:1px solid #e2e8f0;position:sticky;left:0;background:#f1f5f9;z-index:1;">치과 / 보철</th>`;
    
    prosthetics.forEach(p => {
        tableHtml += `<th style="padding:10px 8px;border:1px solid #e2e8f0;text-align:center;min-width:100px;">${escapeHtml(p.name)}<br><span style="font-size:10px;color:#666;">${(p.price || 0).toLocaleString()}원</span></th>`;
    });
    tableHtml += `</tr></thead><tbody>`;
    
    clinics.forEach(clinic => {
        tableHtml += `<tr><td style="padding:10px 8px;border:1px solid #e2e8f0;font-weight:600;position:sticky;left:0;background:#fff;z-index:1;">${escapeHtml(clinic.name)}</td>`;
        
        prosthetics.forEach(p => {
            const rule = clinicPrices.find(r => r.clinicId === clinic.id && r.prostheticName === p.name);
            const basePrice = p.price || 0;
            let displayPrice = '-';
            let displayClass = '';
            let bgColor = '';
            
            if (rule) {
                if (rule.customPrice > 0) {
                    displayPrice = rule.customPrice.toLocaleString();
                    displayClass = 'color:#dc2626;font-weight:700;';
                    bgColor = '#fef2f2';
                } else if (rule.discountPercent !== 0) {
                    const finalPrice = Math.round(basePrice * (1 + rule.discountPercent / 100));
                    displayPrice = finalPrice.toLocaleString() + `<br><span style="font-size:10px;">(${rule.discountPercent > 0 ? '+' : ''}${rule.discountPercent}%)</span>`;
                    displayClass = rule.discountPercent < 0 ? 'color:#dc2626;font-weight:700;' : 'color:#16a34a;font-weight:700;';
                    bgColor = rule.discountPercent < 0 ? '#fef2f2' : '#f0fdf4';
                }
            }
            
            tableHtml += `<td style="padding:8px;border:1px solid #e2e8f0;text-align:center;${displayClass}${bgColor ? 'background:' + bgColor + ';' : ''}">${displayPrice}</td>`;
        });
        
        tableHtml += `</tr>`;
    });
    
    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;
}

function saveAllClinicPrices() {
    const newPrices = [];
    
    document.querySelectorAll('[id^="cp-clinic-"]').forEach((select, idx) => {
        const clinicId = parseInt(select.value) || 0;
        const prostheticName = (document.getElementById(`cp-prosthetic-${idx}`)?.value || '').trim();
        const customPriceRaw = document.getElementById(`cp-price-${idx}`)?.value || '';
        const discountRaw = document.getElementById(`cp-discount-${idx}`)?.value || '';
        
        const customPrice = customPriceRaw ? parseInt(customPriceRaw) || 0 : 0;
        let discountPercent = 0;
        if (discountRaw) {
            discountPercent = parseFloat(discountRaw) || 0;
        }
        
        if (clinicId && prostheticName) {
            newPrices.push({ clinicId, prostheticName, customPrice, discountPercent });
        }
    });
    
    clinicPrices = newPrices;
    saveData();
    closeClinicPriceModal();
    alert('치과별 단가 설정이 저장되었습니다.');
}
