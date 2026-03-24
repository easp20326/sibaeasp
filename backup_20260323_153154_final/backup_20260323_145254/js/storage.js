let db = null;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(AppConfig.dbName, AppConfig.dbVersion);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains('photos')) {
                database.createObjectStore('photos', { keyPath: 'caseId' });
            }
        };
    });
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function savePhoto(caseId, photoData) {
    return new Promise(async (resolve, reject) => {
        if (!db) await initDB();
        
        const transaction = db.transaction(['photos'], 'readwrite');
        const store = transaction.objectStore('photos');
        
        const getRequest = store.get(caseId);
        
        getRequest.onsuccess = () => {
            const existing = getRequest.result || { caseId: caseId, photos: [] };
            if (!Array.isArray(existing.photos)) {
                existing.photos = [];
            }
            const photoObj = {
                id: Date.now() + Math.random().toString(36).substr(2, 9),
                data: photoData,
                date: new Date().toISOString()
            };
            existing.photos.push(photoObj);
            
            const putRequest = store.put(existing);
            putRequest.onsuccess = async () => {
                await checkStorageUsage();
                resolve();
            };
            putRequest.onerror = () => reject(putRequest.error);
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}

async function getPhotos(caseId) {
    return new Promise(async (resolve) => {
        if (!db) await initDB();
        
        const transaction = db.transaction(['photos'], 'readonly');
        const store = transaction.objectStore('photos');
        const request = store.get(caseId);
        
        request.onsuccess = () => {
            const result = request.result;
            resolve(result && Array.isArray(result.photos) ? result.photos : []);
        };
        request.onerror = () => resolve([]);
    });
}

async function deletePhoto(caseId, photoId = null) {
    return new Promise(async (resolve) => {
        if (!db) await initDB();
        
        const transaction = db.transaction(['photos'], 'readwrite');
        const store = transaction.objectStore('photos');
        
        const getRequest = store.get(caseId);
        getRequest.onsuccess = () => {
            const existing = getRequest.result;
            if (!existing) {
                resolve();
                return;
            }
            
            if (photoId) {
                existing.photos = existing.photos.filter(p => p.id !== photoId);
                if (existing.photos.length === 0) {
                    store.delete(caseId);
                } else {
                    store.put(existing);
                }
            } else {
                store.delete(caseId);
            }
            
            transaction.oncomplete = async () => {
                await checkStorageUsage();
                resolve();
            };
        };
    });
}

async function checkStorageUsage() {
    if (!db) return;
    
    try {
        const transaction = db.transaction(['photos'], 'readonly');
        const store = transaction.objectStore('photos');
        const request = store.getAll();
        
        request.onsuccess = async () => {
            const photos = request.result;
            let totalSize = 0;
            photos.forEach(p => {
                if (p.photos) {
                    p.photos.forEach(photo => {
                        if (photo.data) totalSize += photo.data.length;
                    });
                }
            });
            
            const warning = document.getElementById('storageWarning');
            if (warning) {
                if (totalSize > AppConfig.maxStorage * 0.8) {
                    warning.textContent = '⚠️ 저장 용량 부족: ' + formatBytes(totalSize) + ' / ' + formatBytes(AppConfig.maxStorage) + '. 백업을 권장합니다.';
                    warning.classList.add('show');
                } else {
                    warning.classList.remove('show');
                }
            }
        };
    } catch (e) {
        console.log('용량 체크 오류:', e);
    }
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function handlePhotoUpload(caseId, input) {
    const files = Array.from(input.files);
    if (files.length === 0) return;
    
    for (const file of files) {
        if (file.size > AppConfig.maxPhotoSize) {
            alert('사진 크기는 5MB 이하여야 합니다.');
            return;
        }
    }
    
    try {
        let savedCount = 0;
        for (const file of files) {
            const base64 = await fileToBase64(file);
            await savePhoto(caseId, base64);
            savedCount++;
        }
        
        await loadPhotoForCase(caseId);
        showToast('📷 ' + savedCount + '장 사진 저장 완료!');
        input.value = '';
    } catch (e) {
        console.error('사진 저장 오류:', e);
        showToast('❌ 사진 저장 실패: ' + e.message, 'error');
    }
}

async function loadPhotoForCase(caseId) {
    const photos = await getPhotos(caseId);
    const container = document.getElementById('photoContainer-' + caseId);
    
    if (!container) return;
    
    const uploadBtn = `<label class="photo-add-btn" title="사진 업로드">
        <span>📷</span>
        <input type="file" accept="image/*" multiple style="display:none" onchange="handlePhotoUpload(${caseId}, this)">
    </label>`;
    
    if (photos.length > 0) {
        let photosHtml = photos.map((photo, idx) => 
            `<img src="${photo.data}" class="photo-thumb" style="cursor:pointer;" onclick="viewPhoto(${caseId}, ${idx})">`
        ).join('');
        container.innerHTML = photosHtml + uploadBtn;
    } else {
        container.innerHTML = uploadBtn;
    }
}

async function getAllPhotos() {
    return new Promise(async (resolve) => {
        if (!db) await initDB();
        
        const transaction = db.transaction(['photos'], 'readonly');
        const store = transaction.objectStore('photos');
        const request = store.getAll();
        
        request.onsuccess = () => {
            const photoRecords = request.result;
            let allPhotos = [];
            for (const record of photoRecords) {
                if (record.photos) {
                    for (const photo of record.photos) {
                        allPhotos.push({
                            caseId: record.caseId,
                            photoId: photo.id,
                            data: photo.data,
                            date: photo.date
                        });
                    }
                }
            }
            resolve(allPhotos);
        };
        request.onerror = () => resolve([]);
    });
}
