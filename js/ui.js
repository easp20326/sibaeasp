let currentPage = 'list';
let currentFilter = 'all';
let currentMessageFilter = 'all';
let selectedTeeth = [];
let lastMessageCount = 0;

function renderAdminNotice() {
    const container = document.getElementById('adminNoticeContainer');
    if (!container) return;
    
    const notices = getNotices();
    if (notices.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div style="margin:0 12px 12px;padding:12px;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:8px;border-left:4px solid #f59e0b;">';
    html += '<div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:6px;">📢 공지</div>';
    
    notices.slice(0, 3).forEach(n => {
        html += `<div style="font-size:12px;color:#78350f;margin-bottom:4px;cursor:pointer;" onclick="showNoticeDetail(${n.id})">• ${escapeHtml(n.title)}</div>`;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

function showNoticeDetail(id) {
    const notices = getNotices();
    const notice = notices.find(n => n.id === id);
    if (notice) {
        alert(`📢 ${notice.title}\n\n${notice.content}`);
    }
}

function addNotice() {
    const title = document.getElementById('notice-title')?.value.trim();
    const content = document.getElementById('notice-content')?.value.trim();
    
    if (!title || !content) {
        alert('제목과 내용을 모두 입력해주세요.');
        return;
    }
    
    addAdminNotice(title, content);
    document.getElementById('notice-title').value = '';
    document.getElementById('notice-content').value = '';
    renderAdminNotice();
    alert('공지가 등록되었습니다.');
}

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    let overlay = document.querySelector('.sidebar-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.onclick = toggleMobileMenu;
        document.body.appendChild(overlay);
    }
    
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('open');
}

function updateTopbarDate() {
    const el = document.getElementById('topbarDate');
    if (!el) return;
    const now = new Date();
    const days = ['일','월','화','수','목','금','토'];
    el.textContent = now.getFullYear() + '.' +
        String(now.getMonth()+1).padStart(2,'0') + '.' +
        String(now.getDate()).padStart(2,'0') + ' (' +
        days[now.getDay()] + ')';
}

function updateHeroBars() {
    const names = ['working','design','manufacturing','ship','done'];
    const nums = names.map(n => parseInt(document.getElementById('cnt-'+n)?.textContent||'0'));
    const total = nums.reduce((a,b)=>a+b,0) || 1;
    names.forEach((n,i)=>{
        const bar = document.getElementById('bar-'+n);
        if(bar) bar.style.width = Math.round(nums[i]/total*100)+'%';
    });
}

function updateSidebarUser(name, role) {
    const nameEl = document.getElementById('sidebarUserName');
    const roleEl = document.getElementById('sidebarUserRole');
    if(nameEl) nameEl.textContent = name || '관리자';
    if(roleEl) roleEl.textContent = role || 'Administrator';
}

function showPage(page) {
    document.querySelectorAll('.content').forEach(p => p.style.display = 'none');
    document.getElementById('page-' + page).style.display = 'block';
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if (event && event.target) {
        const navItem = event.target.closest('.nav-item');
        if (navItem) navItem.classList.add('active');
    }
    
    const titles = {
        'list': '📋 진행현황',
        'statistics': '📊 통계 대시보드',
        'sales': '💰 매출 분석',
        'register': '✏️ 접수 등록',
        'clinics': '🏢 거래처 관리',
        'prosthetics': '🦷 보철 관리',
        'settings': '⚙️ 설정'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;
    currentPage = page;
    
    if (page === 'register') {
        populateRegisterOptions();
    }
    if (page === 'list') {
        populateClinicFilter();
        populateTypeFilter();
    }
    if (page === 'statistics') {
        renderStatistics();
    }
    if (page === 'settings') {
        loadFactorySettings();
        renderNoticeList();
    }
    if (page === 'clinics') {
        renderClinics();
    }
    if (page === 'prosthetics') {
        renderProstheticTable();
    }
    if (page === 'sales') {
        renderSalesAnalysis();
    }
}

function filterStatus(status, btn) {
    document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = status;
    renderTable();
}

function resetAllFilters() {
    document.getElementById('clinicFilter').value = 'all';
    document.getElementById('typeFilter').value = 'all';
    document.getElementById('searchInput').value = '';
    document.getElementById('sortSelect').value = 'date-desc';
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.querySelectorAll('.quick-date-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('dateRangeBar').style.display = 'none';
    
    document.querySelectorAll('.filter-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector('.filter-tab').classList.add('active');
    
    filterStatus('all');
}

function openAdvancedSearch() {
    const bar = document.getElementById('dateRangeBar');
    if (bar.style.display === 'none' || bar.style.display === '') {
        bar.style.display = 'flex';
    } else {
        bar.style.display = 'none';
    }
}

function clearDateRange() {
    document.getElementById('dateFrom').value = '';
    document.getElementById('dateTo').value = '';
    document.querySelectorAll('.quick-date-btn').forEach(btn => btn.classList.remove('active'));
    renderTable();
}

function setQuickDate(type) {
    const today = new Date();
    const dateFrom = document.getElementById('dateFrom');
    const dateTo = document.getElementById('dateTo');
    
    document.querySelectorAll('.quick-date-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('quick-' + type)?.classList.add('active');
    
    if (type === 'today') {
        dateFrom.value = today.toISOString().slice(0, 10);
        dateTo.value = today.toISOString().slice(0, 10);
    } else if (type === 'week') {
        const dayOfWeek = today.getDay();
        const monday = new Date(today);
        monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        dateFrom.value = monday.toISOString().slice(0, 10);
        dateTo.value = sunday.toISOString().slice(0, 10);
    } else if (type === 'month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        dateFrom.value = firstDay.toISOString().slice(0, 10);
        dateTo.value = lastDay.toISOString().slice(0, 10);
    }
    
    document.getElementById('dateRangeBar').style.display = 'flex';
    renderTable();
}

let searchTimeout;
function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => renderTable(), 300);
}

function renderStats() {
    const counts = { working: 0, design: 0, manufacturing: 0, ship: 0, done: 0 };
    let urgent = 0;
    let overdue = 0;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const displayCases = getMyClinicCases(cases);
    
    displayCases.forEach(c => {
        counts[c.status]++;
        
        if (c.shipDate && c.status !== 'done') {
            const ship = new Date(c.shipDate);
            ship.setHours(0, 0, 0, 0);
            const diff = Math.ceil((ship - today) / (1000 * 60 * 60 * 24));
            
            if (diff < 0) overdue++;
            else if (diff <= 1) urgent++;
        }
    });
    
    document.getElementById('cnt-working').textContent = counts.working;
    document.getElementById('cnt-design').textContent = counts.design;
    document.getElementById('cnt-manufacturing').textContent = counts.manufacturing;
    document.getElementById('cnt-ship').textContent = counts.ship;
    document.getElementById('cnt-done').textContent = counts.done;
    setTimeout(updateHeroBars, 100);
    
    document.getElementById('count-working').textContent = counts.working;
    document.getElementById('count-design').textContent = counts.design;
    document.getElementById('count-manufacturing').textContent = counts.manufacturing;
    document.getElementById('count-ship').textContent = counts.ship;
    document.getElementById('count-done').textContent = counts.done;
    
    const shipBadge = document.getElementById('shipBadge');
    if (overdue > 0) {
        shipBadge.textContent = overdue;
        shipBadge.style.background = '#dc2626';
    } else if (urgent > 0) {
        shipBadge.textContent = urgent;
        shipBadge.style.background = '#f59e0b';
    } else {
        shipBadge.textContent = counts.ship;
        shipBadge.style.background = '';
    }
}

function renderTable() {
    const tbody = document.getElementById('caseTableBody');
    const search = document.getElementById('searchInput').value.toLowerCase();
    const sortBy = document.getElementById('sortSelect')?.value || 'ship-asc';
    const clinicFilter = document.getElementById('clinicFilter')?.value || 'all';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let overdueCount = 0;
    let urgentCount = 0;
    
    const tableDisplayCases = getMyClinicCases(cases);
    tableDisplayCases.forEach(c => {
        if (c.shipDate && c.status !== 'done') {
            const ship = new Date(c.shipDate);
            ship.setHours(0, 0, 0, 0);
            const diff = Math.ceil((ship - today) / (1000 * 60 * 60 * 24));
            if (diff < 0) overdueCount++;
            else if (diff <= 1) urgentCount++;
        }
    });
    document.getElementById('count-urgent').textContent = overdueCount + urgentCount;
    
    const remakeCount = cases.filter(c => c.isRemake).length;
    document.getElementById('count-remake').textContent = remakeCount;
    
    let filtered = tableDisplayCases.filter(c => {
        if (currentFilter === 'urgent') {
            if (!c.shipDate || c.status === 'done') return false;
            const ship = new Date(c.shipDate);
            ship.setHours(0, 0, 0, 0);
            const diff = Math.ceil((ship - today) / (1000 * 60 * 60 * 24));
            return diff <= 1;
        }
        if (currentFilter === 'remake') {
            return c.isRemake === true;
        }
        if (currentFilter !== 'all' && c.status !== currentFilter) return false;
        if (clinicFilter !== 'all' && c.clinicId !== parseInt(clinicFilter)) return false;
        
        const typeFilter = document.getElementById('typeFilter')?.value || 'all';
        if (typeFilter !== 'all' && c.type !== typeFilter) return false;
        
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;
        if (dateFrom || dateTo) {
            const caseDate = new Date(c.date);
            if (dateFrom && dateTo) {
                if (caseDate < new Date(dateFrom) || caseDate > new Date(dateTo + 'T23:59:59')) return false;
            } else if (dateFrom) {
                if (caseDate < new Date(dateFrom)) return false;
            } else if (dateTo) {
                if (caseDate > new Date(dateTo + 'T23:59:59')) return false;
            }
        }
        
        if (search) {
            const clinicName = getClinicName(c.clinicId).toLowerCase();
            return c.patient.toLowerCase().includes(search) || 
                   clinicName.includes(search) ||
                   c.tooth.toLowerCase().includes(search) ||
                   c.type.toLowerCase().includes(search);
        }
        return true;
    });
    
    filtered.sort((a, b) => {
        switch(sortBy) {
            case 'date-desc': return new Date(b.date) - new Date(a.date);
            case 'date-asc': return new Date(a.date) - new Date(b.date);
            case 'ship-asc': 
                if (!a.shipDate) return 1;
                if (!b.shipDate) return -1;
                return new Date(a.shipDate) - new Date(b.shipDate);
            case 'price-desc': return b.price - a.price;
            case 'price-asc': return a.price - b.price;
            default: return 0;
        }
    });
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:40px;color:var(--text3);">데이터가 없습니다</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(c => {
        const clinic = clinics.find(cl => cl.id === c.clinicId);
        const promiseIcon = (clinic && clinic.promises && clinic.promises.length > 0) 
            ? `<span style="cursor:pointer;" title="${clinic.promises.join(', ')}" onclick="showClinicPromise('${clinic.promises.join('\n')}')">⚠️</span>` 
            : '';
        
        const remakeBadge = c.isRemake 
            ? `<span style="background:#dc2626;color:#fff;padding:1px 5px;border-radius:4px;font-size:10px;font-weight:700;margin-left:4px;cursor:pointer;">리메이크</span>` 
            : '';
        
        const toothCount = (c.tooth || '').split(',').length;
        const discount = getClinicDiscount(c.clinicId, c.type);
        const finalPrice = getFinalPrice(c.clinicId, c.type, toothCount);
        const priceDisplay = (discount !== null && discount !== 0) 
            ? `<span style="color:#dc2626;font-weight:bold;">↓${formatPrice(finalPrice)}원</span> <span style="font-size:10px;color:#dc2626;">(${Math.abs(discount)}% 할인)</span>`
            : formatPrice(c.price) + '원';
        
        return `
            <tr>
                <td><input type="checkbox" class="case-checkbox" value="${c.id}" onchange="updateSelectAll()"></td>
                <td>${escapeHtml(c.date)}</td>
                <td><span class="clinic-name">${getClinicName(c.clinicId)}</span>${promiseIcon}</td>
                <td><span class="patient-name">${escapeHtml(c.patient)}</span>${remakeBadge}</td>
                <td><span class="tooth-num">${escapeHtml(c.tooth)}</span></td>
                <td>${escapeHtml(c.type)}</td>
                <td>${escapeHtml(c.unitType)}</td>
                <td class="price-col">${priceDisplay}</td>
                <td>
                    <select class="status-select" onchange="changeStatus(${c.id}, this.value)" style="${getStatusSelectStyle(c.status)}">
                        <option value="working" ${c.status === 'working' ? 'selected' : ''}>🟡 접수중</option>
                        <option value="design" ${c.status === 'design' ? 'selected' : ''}>🟣 디자인중</option>
                        <option value="manufacturing" ${c.status === 'manufacturing' ? 'selected' : ''}>🟠 제작중</option>
                        <option value="ship" ${c.status === 'ship' ? 'selected' : ''}>🔵 배송중</option>
                        <option value="done" ${c.status === 'done' ? 'selected' : ''}>🟢 완료됨</option>
                    </select>
                </td>
                <td>
                    <div style="display:flex;flex-direction:column;gap:4px;align-items:center;">
                        <span style="font-size:11px;color:var(--text3);">${escapeHtml(c.shipDate || '-')}</span>
                        ${getShipCountdown(c.shipDate, c.status)}
                    </div>
                </td>
                <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(c.memo || '')}">${escapeHtml(c.memo || '-')}</td>
                <td>
                    <div class="row-actions">
                        <button class="btn btn-ghost btn-sm" onclick="openPhotoModal(${c.id})" title="사진">📷</button>
                        <button class="btn btn-ghost btn-sm" onclick="openPrintModal(${c.id})" title="인쇄">🖨️</button>
                        <button class="btn btn-ghost btn-sm" onclick="viewCase(${c.id})" title="수정">✏️</button>
                        <button class="btn btn-ghost btn-sm" onclick="deleteCase(${c.id})" title="삭제">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    updateSelectAll();
    
    filtered.forEach(c => {
        loadPhotoForCase(c.id);
    });
    
    updateClinicAlertBadge();
    updateMessageBadge();
    
    const countEl = document.getElementById('filterResultCount');
    if (countEl) {
        countEl.textContent = `총 ${cases.length}건 중 ${filtered.length}건 표시`;
    }
}

function getStatusSelectStyle(status) {
    const styles = {
        'working': 'border-color:#fbbf24;background:#fffbeb;color:#92400e;',
        'design': 'border-color:#a78bfa;background:#f5f3ff;color:#5b21b6;',
        'manufacturing': 'border-color:#fdba74;background:#fff7ed;color:#c2410c;',
        'ship': 'border-color:#60a5fa;background:#eff4ff;color:#1e40af;',
        'done': 'border-color:#86efac;background:#f0fdf4;color:#166534;'
    };
    return styles[status] || '';
}

function changeStatus(id, newStatus) {
    const c = cases.find(x => x.id === id);
    if (!c) return;
    
    if (!isAdmin()) {
        const myClinicId = getUserClinicId();
        if (c.clinicId !== myClinicId) {
            alert('자신의 케이스만 상태를 변경할 수 있습니다.');
            renderTable();
            return;
        }
    }
    
    c.status = newStatus;
    saveData();
    renderStats();
    renderTable();
}

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.case-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
}

function updateSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('.case-checkbox');
    const checkedBoxes = document.querySelectorAll('.case-checkbox:checked');
    
    if (checkboxes.length === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
    } else if (checkedBoxes.length === 0) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
    } else if (checkedBoxes.length === checkboxes.length) {
        selectAll.checked = true;
        selectAll.indeterminate = false;
    } else {
        selectAll.checked = false;
        selectAll.indeterminate = true;
    }
}

function deleteCase(id) {
    if (!isAdmin()) {
        alert('삭제는 관리자만 가능합니다.');
        return;
    }
    if (confirm('삭제하시겠습니까?')) {
        cases = cases.filter(c => c.id !== id);
        saveData();
        renderStats();
        renderTable();
    }
}

function deleteSelected() {
    if (!isAdmin()) {
        alert('삭제는 관리자만 가능합니다.');
        return;
    }
    
    const checkedBoxes = document.querySelectorAll('.case-checkbox:checked');
    if (checkedBoxes.length === 0) {
        alert('삭제할 항목을 선택해주세요.');
        return;
    }
    
    if (confirm(checkedBoxes.length + '개 항목을 삭제하시겠습니까?')) {
        const idsToDelete = Array.from(checkedBoxes).map(cb => parseInt(cb.value));
        cases = cases.filter(c => !idsToDelete.includes(c.id));
        saveData();
        renderStats();
        renderTable();
    }
}

function viewCase(id) {
    openEditModal(id);
}

function showClinicPromise(promises) {
    alert('🏥 약속 & 주의사항:\n\n' + promises.replace(/\n/g, '\n• '));
}

function populateClinicFilter() {
    const select = document.getElementById('clinicFilter');
    if (!select) return;
    
    if (isAdmin()) {
        select.innerHTML = '<option value="all">🏢 전체 치과</option>';
        clinics.forEach(c => {
            select.innerHTML += '<option value="' + c.id + '">' + escapeHtml(c.name) + '</option>';
        });
    } else {
        const myClinicId = getUserClinicId();
        const myClinic = clinics.find(c => c.id === myClinicId);
        select.innerHTML = '<option value="' + myClinicId + '">' + escapeHtml(myClinic?.name || '') + '</option>';
        select.value = myClinicId;
    }
}

function populateTypeFilter() {
    const select = document.getElementById('typeFilter');
    if (!select) return;
    
    const types = [...new Set(cases.map(c => c.type).filter(t => t))];
    select.innerHTML = '<option value="all">🦷 전체 보철</option>';
    types.forEach(t => {
        select.innerHTML += '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + '</option>';
    });
}

function populateRegisterOptions() {
    const clinicSelect = document.getElementById('reg-clinic');
    const typeSelect = document.getElementById('reg-type');
    
    if (!clinicSelect || !typeSelect) return;
    
    clinicSelect.innerHTML = '<option value="">치과를 선택하세요</option>';
    
    if (isAdmin()) {
        clinics.forEach(c => {
            clinicSelect.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
        });
    } else {
        const myClinicId = getUserClinicId();
        const myClinic = clinics.find(c => c.id === myClinicId);
        if (myClinic) {
            clinicSelect.innerHTML += `<option value="${myClinic.id}">${escapeHtml(myClinic.name)}</option>`;
            clinicSelect.value = myClinic.id;
        }
    }
    
    typeSelect.innerHTML = '<option value="">보철 종류 선택</option>';
    prosthetics.forEach(p => {
        typeSelect.innerHTML += `<option value="${p.name}" data-price="${p.price}">${escapeHtml(p.name)}</option>`;
    });
}

function calculateAndSetPrice() {
    if (!isAdmin()) return;
    
    const clinicId = parseInt(document.getElementById('reg-clinic')?.value) || 0;
    const prostheticName = document.getElementById('reg-type')?.value || '';
    const toothCount = selectedTeeth.length > 0 ? selectedTeeth.length : 1;
    
    if (clinicId && prostheticName) {
        const unitPrice = getCalculatedPrice(clinicId, prostheticName);
        const totalPrice = unitPrice * toothCount;
        document.getElementById('reg-price').value = totalPrice;
    }
}

function updateRegisterPrice() {
    calculateAndSetPrice();
}

function resetRegisterForm() {
    document.getElementById('registerForm').reset();
    document.getElementById('reg-clinic').selectedIndex = 0;
    selectedTeeth = [];
    document.getElementById('reg-tooth-display').style.display = 'none';
}

function initToothSelector() {
    for (let quad = 1; quad <= 4; quad++) {
        const container = document.getElementById('quad' + quad);
        if (!container) continue;
        container.innerHTML = '';
        
        const fdiNumbers = ToothQuadrants[quad];
        for (let i = 0; i < fdiNumbers.length; i++) {
            const fdiNum = fdiNumbers[i];
            const toothIdx = parseInt(fdiNum.toString()[1]);
            
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tooth-btn';
            btn.textContent = '#' + fdiNum;
            btn.title = ToothNames[toothIdx];
            btn.dataset.tooth = fdiNum.toString();
            btn.onclick = function() { toggleTooth(this); };
            container.appendChild(btn);
        }
    }
}

function openToothSelector() {
    window.toothSelectorTarget = 'register';
    document.getElementById('toothSelector').classList.add('open');
    initToothSelector();
    renderSelectedTeeth();
    selectedTeeth.forEach(t => {
        const btn = document.querySelector('.tooth-btn[data-tooth="' + t + '"]');
        if (btn) btn.classList.add('selected');
    });
}

function openToothSelectorForEdit() {
    const toothInput = document.getElementById('edit-tooth');
    window.toothSelectorTarget = 'edit';
    selectedTeeth = toothInput.value ? toothInput.value.split(',').map(t => t.trim().replace('#', '')) : [];
    
    initToothSelector();
    renderSelectedTeeth();
    selectedTeeth.forEach(t => {
        const btn = document.querySelector('.tooth-btn[data-tooth="' + t + '"]');
        if (btn) btn.classList.add('selected');
    });
    
    document.getElementById('toothSelector').classList.add('open');
}

function closeToothSelector() {
    document.getElementById('toothSelector').classList.remove('open');
}

function toggleTooth(btn) {
    const tooth = btn.dataset.tooth;
    if (selectedTeeth.includes(tooth)) {
        selectedTeeth = selectedTeeth.filter(t => t !== tooth);
        btn.classList.remove('selected');
    } else {
        selectedTeeth.push(tooth);
        btn.classList.add('selected');
    }
    renderSelectedTeeth();
}

function renderSelectedTeeth() {
    const list = document.getElementById('toothSelectedList');
    if (selectedTeeth.length === 0) {
        list.innerHTML = '<span style="color:var(--text3);">선택된 치식이 없습니다</span>';
    } else {
        list.innerHTML = selectedTeeth.map(t => '<span>#' + t + '</span>').join('');
    }
}

function confirmToothSelection() {
    if (selectedTeeth.length === 0) {
        alert('치식을 선택해주세요.');
        return;
    }
    
    selectedTeeth.sort();
    const toothStr = selectedTeeth.map(t => '#' + t).join(', ');
    
    if (window.toothSelectorTarget === 'edit') {
        document.getElementById('edit-tooth').value = toothStr;
        const display = document.getElementById('edit-tooth-display');
        display.style.display = 'block';
        display.innerHTML = selectedTeeth.map(t => '<span>#' + t + '</span>').join('');
    } else {
        document.getElementById('reg-tooth').value = toothStr;
        const display = document.getElementById('reg-tooth-display');
        display.style.display = 'block';
        display.innerHTML = selectedTeeth.map(t => '<span>#' + t + '</span>').join('');
    }
    
    closeToothSelector();
}

function logout() {
    if (confirm('로그아웃하시겠습니까?')) {
        destroySession();
        document.getElementById('mainApp').classList.remove('logged-in');
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('userId').value = '';
        document.getElementById('password').value = '';
    }
}
