let currentPhotoCaseId = null;
let editCaseId = null;
let priceViewMode = 'edit';

async function loadEditPhotos(caseId) {
    const photos = await getPhotos(caseId);
    const container = document.getElementById('edit-photo-preview');
    const countEl = document.getElementById('edit-photo-count');
    countEl.textContent = photos.length;
    
    if (photos.length === 0) {
        container.innerHTML = '<span style="color:var(--text3);font-size:12px;">사진이 없습니다</span>';
        return;
    }
    
    container.innerHTML = photos.map((photo, idx) => `
        <div style="position:relative;width:80px;height:80px;">
            <img src="${photo.data}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid var(--border);cursor:pointer;" onclick="viewPhoto(${caseId}, ${idx})">
            <button onclick="deletePhotoFromEdit(${caseId}, '${photo.id}')" style="position:absolute;top:-8px;right:-8px;width:22px;height:22px;background:var(--red);color:#fff;border:none;border-radius:50%;font-size:12px;cursor:pointer;">✕</button>
        </div>
    `).join('');
}

async function deletePhotoFromEdit(caseId, photoId) {
    if (!confirm('이 사진을 삭제하시겠습니까?')) return;
    await deletePhoto(caseId, photoId);
    loadEditPhotos(caseId);
}

async function handlePhotoUploadEdit(input) {
    const caseId = editCaseId;
    if (!caseId || !input.files.length) return;
    await handlePhotoUpload(caseId, input);
    loadEditPhotos(caseId);
}

function viewPhotoFromEdit(caseId, idx) {
    viewPhoto(caseId, idx);
}

function openEditModal(id) {
    const c = cases.find(x => x.id === id);
    if (!c) return;
    
    if (!isAdmin()) {
        const myClinicId = getUserClinicId();
        if (c.clinicId !== myClinicId) {
            alert('자신의 케이스만 수정할 수 있습니다.');
            return;
        }
    }
    
    editCaseId = id;
    
    document.getElementById('edit-case-id').value = c.id;
    document.getElementById('edit-patient').value = c.patient;
    document.getElementById('edit-tooth').value = c.tooth;
    document.getElementById('edit-price').value = c.price || '';
    document.getElementById('edit-ship').value = c.shipDate || '';
    document.getElementById('edit-memo').value = c.memo || '';
    document.getElementById('edit-isRemake').checked = c.isRemake === true;
    
    const editClinic = document.getElementById('edit-clinic');
    editClinic.innerHTML = '<option value="">치과를 선택하세요</option>';
    clinics.forEach(cl => {
        editClinic.innerHTML += `<option value="${cl.id}">${escapeHtml(cl.name)}</option>`;
    });
    editClinic.value = c.clinicId;
    
    const editType = document.getElementById('edit-type');
    editType.innerHTML = '<option value="">보철 종류 선택</option>';
    prosthetics.forEach(p => {
        editType.innerHTML += `<option value="${escapeHtml(p.name)}" data-price="${p.price}">${escapeHtml(p.name)}</option>`;
    });
    editType.value = c.type;
    
    document.querySelector('input[name="edit-unitType"][value="' + c.unitType + '"]').checked = true;
    
    loadEditPhotos(id);
    
    document.getElementById('editCaseModal').classList.add('open');
}

function closeEditModal() {
    document.getElementById('editCaseModal').classList.remove('open');
    editCaseId = null;
}

function saveEditCase() {
    const id = parseInt(document.getElementById('edit-case-id').value);
    const clinicId = parseInt(document.getElementById('edit-clinic').value);
    const patient = validateInput(document.getElementById('edit-patient').value, 50);
    const tooth = validateInput(document.getElementById('edit-tooth').value, 20);
    const type = document.getElementById('edit-type').value;
    const unitType = document.querySelector('input[name="edit-unitType"]:checked').value;
    const isRemake = document.getElementById('edit-isRemake').checked;
    const shipDate = document.getElementById('edit-ship').value;
    const price = parseInt(document.getElementById('edit-price').value) || 0;
    const memo = validateInput(document.getElementById('edit-memo').value, 500);
    
    if (!clinicId || !patient || !tooth || !type) {
        alert('필수 항목을 입력해 주세요.');
        return;
    }
    
    const idx = cases.findIndex(x => x.id === id);
    if (idx !== -1) {
        cases[idx] = { ...cases[idx], clinicId, patient, tooth, type, unitType, isRemake, shipDate, price, memo };
        saveData();
        renderTable();
        renderStats();
        closeEditModal();
        alert('수정되었습니다.');
    }
}

async function viewPhoto(caseId, startIndex = 0) {
    const photos = await getPhotos(caseId);
    if (!photos || photos.length === 0) {
        alert('사진이 없습니다.');
        return;
    }
    
    const c = cases.find(x => x.id === caseId);
    const patientName = c ? c.patient : 'Unknown';
    const currentPhoto = photos[startIndex];
    
    const oldModal = document.getElementById('photoViewModal');
    if (oldModal) oldModal.remove();
    
    const html = `
    <div id="photoViewModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:9999;display:flex;flex-direction:column;">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:15px 20px;background:#000;">
            <span style="color:#fff;font-size:18px;font-weight:bold;">${escapeHtml(patientName)} (${startIndex + 1}/${photos.length})</span>
            <button onclick="document.getElementById('photoViewModal').remove()" style="background:none;border:none;color:#fff;font-size:24px;cursor:pointer;">✕</button>
        </div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;position:relative;">
            ${startIndex > 0 ? '<button onclick="viewPhoto(' + caseId + ',' + (startIndex-1) + ')" style="position:absolute;left:20px;font-size:30px;background:rgba(255,255,255,0.2);border:none;color:#fff;width:50px;height:50px;border-radius:50%;cursor:pointer;">◀</button>' : ''}
            ${startIndex < photos.length - 1 ? '<button onclick="viewPhoto(' + caseId + ',' + (startIndex+1) + ')" style="position:absolute;right:20px;font-size:30px;background:rgba(255,255,255,0.2);border:none;color:#fff;width:50px;height:50px;border-radius:50%;cursor:pointer;">▶</button>' : ''}
            <img src="${currentPhoto.data}" style="max-width:95%;max-height:85vh;object-fit:contain;">
        </div>
        <div style="display:flex;gap:10px;padding:15px;background:#000;justify-content:center;">
            <a href="${currentPhoto.data}" download="환자_${patientName}_${startIndex + 1}.png" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">⬇️ 다운로드</a>
            <button onclick="deleteSinglePhoto(${caseId}, '${currentPhoto.id}', ${startIndex})" style="background:#dc2626;color:#fff;padding:10px 20px;border-radius:8px;border:none;cursor:pointer;font-weight:bold;">🗑️ 삭제</button>
            <button onclick="document.getElementById('photoViewModal').remove()" style="background:#666;color:#fff;padding:10px 20px;border-radius:8px;border:none;cursor:pointer;font-weight:bold;">닫기</button>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', html);
}

async function deleteSinglePhoto(caseId, photoId, currentIndex) {
    if (confirm('이 사진을 삭제하시겠습니까?')) {
        await deletePhoto(caseId, photoId);
        const photos = await getPhotos(caseId);
        if (photos.length > 0) {
            const newIndex = Math.min(currentIndex, photos.length - 1);
            await viewPhoto(caseId, newIndex);
        } else {
            document.getElementById('photoViewModal').style.display = 'none';
        }
        renderTable();
    }
}

function openPhotoModal(caseId) {
    currentPhotoCaseId = caseId;
    const c = cases.find(x => x.id === caseId);
    const patientName = c ? c.patient : '환자';
    
    getPhotosFromLocalStorage(caseId).then(photos => {
        const modal = document.createElement('div');
        modal.id = 'photoModal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
        modal.innerHTML = `
            <div style="background:#fff;border-radius:16px;width:100%;max-width:600px;max-height:90vh;overflow:auto;">
                <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
                    <h3 style="margin:0;font-size:16px;">📷 ${escapeHtml(patientName)} 사진</h3>
                    <button onclick="closePhotoModal()" style="background:none;border:none;font-size:24px;cursor:pointer;">✕</button>
                </div>
                <div style="padding:20px;">
                    <div style="margin-bottom:16px;">
                        <label style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:var(--blue);color:#fff;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">
                            📷 사진 추가
                            <input type="file" accept="image/*" multiple style="display:none" onchange="handlePhotoUploadNew(this)">
                        </label>
                        <span style="margin-left:12px;font-size:12px;color:var(--text3);">${photos.length}장</span>
                    </div>
                    <div id="photoGrid" style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
                        ${photos.length === 0 ? '<p style="grid-column:1/-1;text-align:center;color:var(--text3);padding:40px;">사진이 없습니다</p>' : 
                        photos.map((p, i) => `
                            <div style="position:relative;aspect-ratio:1;background:#f0f0f0;border-radius:8px;overflow:hidden;">
                                <img src="${p.data}" style="width:100%;height:100%;object-fit:cover;cursor:pointer;" onclick="viewPhotoFull('${p.data}')">
                                <button onclick="deletePhotoNew('${p.id}')" style="position:absolute;top:4px;right:4px;width:24px;height:24px;background:rgba(220,38,38,0.9);color:#fff;border:none;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;">×</button>
                            </div>
                        `).join('')}
                    </div>
                    <div style="margin-top:16px;text-align:center;">
                        <button onclick="closePhotoModal()" class="btn btn-secondary">닫기</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    });
}

async function getPhotosFromLocalStorage(caseId) {
    return await getPhotos(caseId);
}

function closePhotoModal() {
    const modal = document.getElementById('photoModal');
    if (modal) modal.remove();
    currentPhotoCaseId = null;
}

async function handlePhotoUploadNew(input) {
    if (!currentPhotoCaseId || !input.files.length) return;
    
    for (const file of input.files) {
        if (file.size > AppConfig.maxPhotoSize) {
            alert('사진 크기는 5MB 이하여야 합니다.');
            continue;
        }
        const base64 = await fileToBase64(file);
        await savePhoto(currentPhotoCaseId, base64);
    }
    
    openPhotoModal(currentPhotoCaseId);
    showToast('📷 사진 저장 완료!');
}

async function deletePhotoNew(photoId) {
    if (!currentPhotoCaseId) return;
    if (!confirm('이 사진을 삭제하시겠습니까?')) return;
    
    await deletePhoto(currentPhotoCaseId, photoId);
    openPhotoModal(currentPhotoCaseId);
    showToast('🗑️ 사진 삭제 완료');
}

function viewPhotoFull(data) {
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;';
    modal.innerHTML = `
        <img src="${data}" style="max-width:95%;max-height:85vh;object-fit:contain;">
        <div style="margin-top:20px;display:flex;gap:12px;">
            <a href="${data}" download="photo.png" style="padding:10px 20px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">⬇️ 다운로드</a>
            <button onclick="this.closest('div').previousElementSibling.remove();this.closest('div').previousElementSibling.remove();this.closest('div').remove()" style="padding:10px 20px;background:#666;color:#fff;border:none;border-radius:8px;cursor:pointer;">닫기</button>
        </div>
    `;
    document.body.appendChild(modal);
    modal.onclick = () => modal.remove();
}

async function showPhotoGallery() {
    const allPhotos = await getAllPhotos();
    
    if (allPhotos.length === 0) {
        alert('저장된 사진이 없습니다.');
        return;
    }
    
    let modalHtml = `
        <div class="modal-bg" id="photoGalleryModal">
            <div class="modal" style="max-width:900px;max-height:90vh;">
                <div class="modal-header">
                    <div class="modal-title">🖼️ 저장된 사진 목록 (${allPhotos.length}장)</div>
                    <button class="btn btn-ghost" onclick="closePhotoView()">✕</button>
                </div>
                <div class="modal-body" style="max-height:70vh;overflow-y:auto;">
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;">
    `;
    
    for (const photo of allPhotos) {
        const c = cases.find(x => x.id === photo.caseId);
        const patientName = c ? c.patient : 'Unknown';
        const clinicName = c ? getClinicName(c.clinicId) : '-';
        
        modalHtml += `
            <div style="text-align:center;cursor:pointer;position:relative;" onclick="viewPhotoFromGallery(${photo.caseId}, '${photo.photoId}')">
                <img src="${photo.data}" style="width:100%;height:110px;object-fit:cover;border-radius:8px;border:2px solid var(--border);">
                <div style="font-size:11px;margin-top:4px;font-weight:600;">${escapeHtml(patientName)}</div>
                <div style="font-size:10px;color:var(--text3);">${escapeHtml(clinicName)}</div>
            </div>
        `;
    }
    
    modalHtml += `
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closePhotoView()">닫기</button>
                </div>
            </div>
        </div>
    `;
    
    const existing = document.getElementById('photoGalleryModal');
    if (existing) existing.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function viewPhotoFromGallery(caseId, photoId) {
    const photos = await getPhotos(caseId);
    if (photos.length === 0) return;
    
    const idx = photos.findIndex(p => p.id === photoId);
    if (idx >= 0) {
        await viewPhoto(caseId, idx);
    }
}

function closePhotoView() {
    const modal1 = document.getElementById('photoViewModal');
    const modal2 = document.getElementById('photoGalleryModal');
    if (modal1) modal1.remove();
    if (modal2) modal2.remove();
}

function openPrintModal(id) {
    const c = cases.find(x => x.id === id);
    if (!c) return;
    
    const clinic = clinics.find(cl => cl.id === c.clinicId);
    const factory = getFactorySettings();
    const today = new Date().toISOString().slice(0, 10);
    
    async function loadAndRender() {
        const photos = await getPhotos(id);
        
        let photoHtml = '';
        if (photos && photos.length > 0) {
            photoHtml = `
                <div style="margin:12px 0;padding:10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                    <div style="font-size:12px;color:#666;margin-bottom:8px;">📷 사진 (${photos.length}장)</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        ${photos.map(p => `<img src="${p.data}" style="width:100px;height:100px;object-fit:cover;border-radius:6px;border:1px solid #ddd;">`).join('')}
                    </div>
                </div>
            `;
        }
        
        const toothCount = (c.tooth || '').split(',').length;
        const discount = getClinicDiscount(c.clinicId, c.type);
        const finalPrice = getFinalPrice(c.clinicId, c.type, toothCount);
        const baseUnit = getBaseProstheticPrice(c.type);
        const priceDisplay = (discount !== null && discount !== 0) 
            ? `<span style="color:#dc2626;font-weight:bold;">↓${formatPrice(finalPrice)}원</span> <span style="font-size:11px;color:#dc2626;">(${Math.abs(discount)}% 할인)</span>`
            : formatPrice(c.price) + '원';
        
        const html = `
            <div style="font-family:'Noto Sans KR',sans-serif;padding:20px;background:#fff;border:2px solid #333;max-width:600px;">
                <div style="text-align:center;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:20px;">
                    <h1 style="font-size:24px;margin:0;">🦷 ${escapeHtml(factory.name) || '이룸덴탈랩'}</h1>
                    ${factory.business ? `<p style="margin:3px 0 0;font-size:11px;color:#666;">사업자번호: ${escapeHtml(factory.business)}</p>` : ''}
                </div>
                
                ${photoHtml}
                
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #ddd;" colspan="2">
                            <strong>접수번호:</strong> ${c.id} &nbsp;&nbsp;
                            <strong>접수일:</strong> ${c.date}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #ddd;width:50%;">
                            <strong>거래처:</strong> ${clinic ? clinic.name : '-'}
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #ddd;">
                            <strong>원장:</strong> ${clinic ? clinic.owner : '-'}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #ddd;" colspan="2">
                            <strong>환자명:</strong> ${escapeHtml(c.patient)}
                            ${c.isRemake ? '<span style="background:#dc2626;color:#fff;padding:2px 8px;border-radius:4px;font-size:12px;margin-left:10px;">리메이크</span>' : ''}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #ddd;" colspan="2">
                            <strong>치식:</strong> ${escapeHtml(c.tooth)}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #ddd;">
                            <strong>보철종류:</strong> ${escapeHtml(c.type)}
                        </td>
                        <td style="padding:8px 0;border-bottom:1px solid #ddd;">
                            <strong>구분:</strong> ${escapeHtml(c.unitType)}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #ddd;" colspan="2">
                            <strong>단가:</strong> ${priceDisplay}
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #ddd;" colspan="2">
                            <strong>출고예정일:</strong> ${c.shipDate || '-'}
                        </td>
                    </tr>
                    ${c.memo ? `
                    <tr>
                        <td style="padding:8px 0;" colspan="2">
                            <strong>메모:</strong> ${escapeHtml(c.memo)}
                        </td>
                    </tr>
                    ` : ''}
                </table>
                
                <div style="margin-top:30px;padding-top:15px;border-top:2px solid #333;">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;">
                        <div style="flex:1;">
                            <div style="font-size:12px;color:#666;">
                                ${factory.address ? `<div>${escapeHtml(factory.address)}</div>` : ''}
                                ${factory.tel ? `TEL: ${escapeHtml(factory.tel)}` : ''}
                                ${factory.fax ? ` | FAX: ${escapeHtml(factory.fax)}` : ''}
                                ${factory.extra ? `<div style="margin-top:4px;">${escapeHtml(factory.extra)}</div>` : ''}
                            </div>
                        </div>
                        <div style="text-align:center;margin-left:40px;">
                            <div style="width:100px;height:100px;border:2px solid #333;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:11px;color:#666;background:#fafafa;">
                                <div style="width:80px;height:80px;border:1px dashed #ccc;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:4px;">
                                    <span style="font-size:10px;color:#999;">직인</span>
                                </div>
                                <div style="font-size:10px;">${escapeHtml(factory.name) || '이룸덴탈랩'}</div>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top:15px;padding-top:10px;border-top:1px dashed #ddd;display:flex;justify-content:space-between;font-size:11px;color:#999;">
                        <div>인쇄일: ${today}</div>
                        <div>${escapeHtml(factory.name) || '이룸덴탈랩'}</div>
                    </div>
                </div>
            </div>
        `;
        
        document.getElementById('printContent').innerHTML = html;
        document.getElementById('printModal').classList.add('open');
    }
    
    loadAndRender();
}

function closePrintModal() {
    document.getElementById('printModal').classList.remove('open');
}

function doPrint() {
    const content = document.getElementById('printContent').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>이룸덴탈랩 - 명세서</title>
            <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                * { box-sizing:border-box;margin:0;padding:0 }
                body { font-family:'Noto Sans KR',sans-serif;background:#fff;color:#1a1d2e;font-size:14px;line-height:1.6 }
                @media print {
                    body { print-color-adjust:exact;-webkit-print-color-adjust:exact }
                }
            </style>
        </head>
        <body>${content}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function loadFactorySettings() {
    const info = getFactorySettings();
    document.getElementById('setting-name').value = info.name;
    document.getElementById('setting-business').value = info.business;
    document.getElementById('setting-address').value = info.address;
    document.getElementById('setting-tel').value = info.tel;
    document.getElementById('setting-fax').value = info.fax;
    document.getElementById('setting-extra').value = info.extra;
}

function saveFactoryInfo() {
    const info = {
        name: document.getElementById('setting-name').value,
        business: document.getElementById('setting-business').value,
        address: document.getElementById('setting-address').value,
        tel: document.getElementById('setting-tel').value,
        fax: document.getElementById('setting-fax').value,
        extra: document.getElementById('setting-extra').value
    };
    saveFactoryInfoData(info);
}

function saveFactoryInfoData(info) {
    localStorage.setItem(AppConfig.storageKeys.factory, JSON.stringify(info));
}
