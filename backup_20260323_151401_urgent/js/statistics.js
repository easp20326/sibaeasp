function renderStatistics() {
    const period = document.getElementById('statsPeriod')?.value || 'thisMonth';
    const clinicFilter = document.getElementById('statsClinicFilter')?.value || 'all';
    
    const clinicSelect = document.getElementById('statsClinicFilter');
    if (!isAdmin()) {
        const myClinicId = getUserClinicId();
        clinicSelect.style.display = 'none';
        clinicSelect.innerHTML = `<option value="${myClinicId}">${escapeHtml(clinics.find(c => c.id === myClinicId)?.name || '')}</option>`;
        clinicSelect.value = myClinicId;
    } else if (clinicSelect.options.length <= 1) {
        clinicSelect.style.display = 'block';
        clinicSelect.innerHTML = '<option value="all">🏢 전체 거래처</option>';
        clinics.forEach(c => {
            clinicSelect.innerHTML += `<option value="${c.id}">${escapeHtml(c.name)}</option>`;
        });
    }
    
    const range = getPeriodRange(period);
    const myClinicId = getUserClinicId();
    const effectiveClinicFilter = isAdmin() ? clinicFilter : myClinicId;
    
    let filtered = cases.filter(c => {
        const d = new Date(c.date);
        const inPeriod = d >= range.start && d <= range.end;
        const inClinic = effectiveClinicFilter === 'all' || c.clinicId === parseInt(effectiveClinicFilter);
        return inPeriod && inClinic;
    });
    
    if (clinicFilter !== 'all') {
        const selectedClinic = clinics.find(c => c.id === parseInt(clinicFilter));
        renderClinicDetailStats(selectedClinic, filtered);
    } else {
        document.getElementById('clinicDetailStats').innerHTML = '';
    }
    
    const prevRange = period === 'thisMonth' ? getPeriodRange('lastMonth') : null;
    const prevFiltered = prevRange ? cases.filter(c => {
        const d = new Date(c.date);
        const inPeriod = d >= prevRange.start && d <= prevRange.end;
        const inClinic = effectiveClinicFilter === 'all' || c.clinicId === parseInt(effectiveClinicFilter);
        return inPeriod && inClinic;
    }) : [];
    
    const total = filtered.length;
    const done = filtered.filter(c => c.status === 'done').length;
    const working = filtered.filter(c => c.status !== 'done').length;
    const sales = filtered.reduce((sum, c) => sum + (c.price || 0), 0);
    const avg = total > 0 ? Math.round(sales / total) : 0;
    
    document.getElementById('statTotal').textContent = total;
    document.getElementById('statDone').textContent = done;
    document.getElementById('statWorking').textContent = working;
    document.getElementById('statAvg').textContent = avg.toLocaleString();
    document.getElementById('statSales').textContent = sales >= 10000000 ? (sales / 10000000).toFixed(1) + '천만' : sales.toLocaleString();
    
    const doneRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const workRate = total > 0 ? Math.round((working / total) * 100) : 0;
    document.getElementById('statDoneRate').textContent = doneRate + '% 완료';
    document.getElementById('statWorkingRate').textContent = workRate + '% 진행';
    
    if (prevFiltered.length > 0) {
        const diff = total - prevFiltered.length;
        const pct = Math.round((diff / prevFiltered.length) * 100);
        const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '─';
        const color = diff > 0 ? '#16a34a' : diff < 0 ? '#dc2626' : '#6b7280';
        document.getElementById('statTotalCompare').innerHTML = `<span style="color:${color}">${arrow} ${Math.abs(pct)}%</span>`;
        document.getElementById('statsCompare').textContent = '지난 기간 대비';
    }
    
    renderDailyChart(filtered);
    renderStatusChart(filtered);
    renderProstheticStats(filtered);
    renderClinicStats(filtered);
    renderRemakeStats(filtered);
}

function renderClinicDetailStats(clinic, data) {
    const container = document.getElementById('clinicDetailStats');
    if (!clinic || !data || data.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    const sales = data.reduce((sum, c) => sum + (c.price || 0), 0);
    const totalTeeth = data.reduce((sum, c) => sum + ((c.tooth || '').split(',').filter(t => t.trim()).length), 0);
    
    const byType = {};
    data.forEach(c => {
        const toothCount = (c.tooth || '').split(',').filter(t => t.trim()).length;
        if (!byType[c.type]) byType[c.type] = { count: 0, sales: 0, teeth: 0 };
        byType[c.type].count++;
        byType[c.type].sales += c.price || 0;
        byType[c.type].teeth += toothCount;
    });
    
    let typeHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px;margin-top:12px;">';
    Object.entries(byType).sort((a, b) => b[1].sales - a[1].sales).forEach(([type, stats]) => {
        typeHtml += `<div style="padding:10px;background:#f8fafc;border-radius:8px;text-align:center;">
            <div style="font-size:14px;font-weight:700;color:var(--blue);">${stats.count}건 <span style="font-size:11px;color:#16a34a;">(${stats.teeth}개)</span></div>
            <div style="font-size:11px;color:var(--text2);">${escapeHtml(type)}</div>
            <div style="font-size:11px;color:var(--text3);">${stats.sales.toLocaleString()}원</div>
        </div>`;
    });
    typeHtml += '</div>';
    
    container.innerHTML = `
        <div class="card" style="margin-bottom:20px;background:linear-gradient(135deg,#eff4ff,#dbeafe);border:2px solid var(--blue);">
            <div style="padding:16px;">
                <h3 style="margin:0 0 12px;font-size:16px;color:#1d4ed8;">🏥 ${escapeHtml(clinic.name)} 상세 통계</h3>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;text-align:center;">
                    <div>
                        <div style="font-size:20px;font-weight:800;color:#1d4ed8;">${data.length}</div>
                        <div style="font-size:11px;color:#1e40af;">총 접수</div>
                    </div>
                    <div>
                        <div style="font-size:20px;font-weight:800;color:#15803d;">${data.filter(c => c.status === 'done').length}</div>
                        <div style="font-size:11px;color:#166534;">완료</div>
                    </div>
                    <div>
                        <div style="font-size:20px;font-weight:800;color:#16a34a;">${totalTeeth}</div>
                        <div style="font-size:11px;color:#15803d;">총 치아</div>
                    </div>
                    <div>
                        <div style="font-size:20px;font-weight:800;color:#7c3aed;">${sales.toLocaleString()}원</div>
                        <div style="font-size:11px;color:#5b21b6;">총 매출</div>
                    </div>
                </div>
                <h4 style="margin:16px 0 8px;font-size:13px;color:#1e40af;">보철 종류별</h4>
                ${typeHtml}
            </div>
        </div>
    `;
}

function renderRemakeStats(data) {
    const container = document.getElementById('remakeStats');
    const remakeCases = data.filter(c => c.isRemake);
    const remakeCount = remakeCases.length;
    const remakeSales = remakeCases.reduce((sum, c) => sum + (c.price || 0), 0);
    const remakeTeeth = remakeCases.reduce((sum, c) => sum + ((c.tooth || '').split(',').filter(t => t.trim()).length), 0);
    const remakeRate = data.length > 0 ? Math.round((remakeCount / data.length) * 100) : 0;
    
    document.getElementById('remakeTotal').textContent = `총 ${remakeCount}건/${ remakeTeeth}개 (${remakeRate}%) · ${remakeSales.toLocaleString()}원`;
    
    const byType = {};
    remakeCases.forEach(c => {
        const toothCount = (c.tooth || '').split(',').filter(t => t.trim()).length;
        if (!byType[c.type]) byType[c.type] = { count: 0, teeth: 0 };
        byType[c.type].count++;
        byType[c.type].teeth += toothCount;
    });
    
    let html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;">';
    Object.entries(byType).sort((a, b) => b[1].count - a[1].count).forEach(([type, stats]) => {
        html += `<div style="padding:16px;background:linear-gradient(135deg,#fff1f1,#fee2e2);border-radius:12px;border:1px solid #fecaca;">
            <div style="font-size:24px;font-weight:800;color:#dc2626;">${stats.count}건/${stats.teeth}개</div>
            <div style="font-size:13px;color:#991b1b;margin-top:4px;">${escapeHtml(type)}</div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = remakeCount > 0 ? html : '<p style="color:var(--text3);text-align:center;">리메이크 건이 없습니다</p>';
}

function renderDailyChart(data) {
    const container = document.getElementById('dailyChart');
    const days = {};
    data.forEach(c => {
        const d = new Date(c.date);
        const key = (d.getMonth() + 1) + '/' + d.getDate();
        days[key] = (days[key] || 0) + 1;
    });
    
    const sortedKeys = Object.keys(days).sort((a, b) => {
        const [am, ad] = a.split('/').map(Number);
        const [bm, bd] = b.split('/').map(Number);
        return new Date(2026, am-1, ad) - new Date(2026, bm-1, bd);
    });
    
    const maxVal = Math.max(...Object.values(days), 1);
    let html = '<div style="display:flex;align-items:flex-end;gap:4px;height:120px;padding:10px 0;overflow-x:auto;">';
    sortedKeys.slice(-14).forEach(day => {
        const val = days[day];
        const height = Math.max((val / maxVal) * 100, 4);
        html += `<div style="flex:0 0 auto;text-align:center;min-width:30px;">
            <div style="font-size:11px;font-weight:700;color:var(--blue);">${val}</div>
            <div style="width:24px;height:${height}px;background:var(--blue);border-radius:3px 3px 0 0;margin:2px auto 0;"></div>
            <div style="font-size:9px;color:var(--text3);margin-top:2px;">${day}</div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html || '<p style="color:var(--text3);text-align:center;">데이터가 없습니다</p>';
}

function renderStatusChart(data) {
    const container = document.getElementById('statusChart');
    const counts = { working: 0, design: 0, manufacturing: 0, ship: 0, done: 0 };
    data.forEach(c => counts[c.status]++);
    
    const total = data.length;
    const colors = {
        'working': '#f59e0b',
        'design': '#8b5cf6',
        'manufacturing': '#f97316',
        'ship': '#3b82f6',
        'done': '#22c55e'
    };
    const labels = {
        'working': '접수중',
        'design': '디자인중',
        'manufacturing': '제작중',
        'ship': '배송중',
        'done': '완료'
    };
    
    let html = '<div style="display:flex;flex-direction:column;gap:8px;">';
    Object.entries(counts).forEach(([status, count]) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        html += `<div style="display:flex;align-items:center;gap:8px;">
            <div style="width:60px;font-size:11px;color:var(--text2);">${labels[status]}</div>
            <div style="flex:1;height:16px;background:var(--surface2);border-radius:4px;overflow:hidden;">
                <div style="width:${pct}%;height:100%;background:${colors[status]};border-radius:4px;"></div>
            </div>
            <div style="width:35px;font-size:11px;font-weight:600;text-align:right;">${count}</div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderProstheticStats(data) {
    const container = document.getElementById('prostheticStats');
    const types = {};
    data.forEach(c => {
        const toothCount = (c.tooth || '').split(',').filter(t => t.trim()).length;
        if (!types[c.type]) types[c.type] = { amount: 0, teeth: 0 };
        types[c.type].amount += c.price || 0;
        types[c.type].teeth += toothCount;
    });
    
    const total = Object.values(types).reduce((a, b) => a + b.amount, 0);
    const colors = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#8b5cf6', '#06b6d4'];
    let html = '';
    let i = 0;
    Object.entries(types).sort((a, b) => b[1].amount - a[1].amount).forEach(([type, stats]) => {
        const pct = total > 0 ? Math.round((stats.amount / total) * 100) : 0;
        html += `<div style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
                <span>${escapeHtml(type)} <span style="font-size:10px;color:var(--text3);">(${stats.teeth}개)</span></span>
                <span style="font-weight:600;">${stats.amount.toLocaleString()}원</span>
            </div>
            <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:${colors[i % colors.length]};border-radius:3px;"></div>
            </div>
        </div>`;
        i++;
    });
    container.innerHTML = html || '<p style="color:var(--text3);text-align:center;">데이터가 없습니다</p>';
}

function renderClinicStats(data) {
    const container = document.getElementById('clinicStats');
    const clinicsData = {};
    data.forEach(c => {
        const name = getClinicName(c.clinicId);
        const toothCount = (c.tooth || '').split(',').filter(t => t.trim()).length;
        if (!clinicsData[name]) clinicsData[name] = { count: 0, amount: 0, teeth: 0 };
        clinicsData[name].count++;
        clinicsData[name].amount += c.price || 0;
        clinicsData[name].teeth += toothCount;
    });
    
    const colors = ['#1d4ed8', '#15803d', '#b45309', '#7c3aed', '#0891b2'];
    let html = '<div style="display:flex;flex-direction:column;gap:10px;">';
    let i = 0;
    Object.entries(clinicsData).sort((a, b) => b[1].amount - a[1].amount).slice(0, 5).forEach(([name, d]) => {
        html += `<div style="display:flex;align-items:center;gap:8px;">
            <div style="width:20px;height:20px;background:${colors[i]};border-radius:4px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;font-weight:700;">${i + 1}</div>
            <div style="flex:1;">
                <div style="font-size:12px;font-weight:600;">${name}</div>
                <div style="font-size:11px;color:var(--text3);">${d.count}건/${d.teeth}개 · ${d.amount.toLocaleString()}원</div>
            </div>
        </div>`;
        i++;
    });
    html += '</div>';
    container.innerHTML = html || '<p style="color:var(--text3);text-align:center;">데이터가 없습니다</p>';
}

function renderSalesAnalysis() {
    const period = document.getElementById('salesPeriod')?.value || 'thisMonth';
    const today = new Date();
    
    const range = getPeriodRange(period);
    const myClinicId = getUserClinicId();
    const filtered = cases.filter(c => {
        const d = new Date(c.date);
        const inPeriod = d >= range.start && d <= range.end;
        const inClinic = isAdmin() || c.clinicId === myClinicId;
        return inPeriod && inClinic;
    });
    
    const totalSales = filtered.reduce((sum, c) => sum + (c.price || 0), 0);
    const totalCases = filtered.length;
    const totalTeeth = filtered.reduce((sum, c) => sum + ((c.tooth || '').split(',').filter(t => t.trim()).length), 0);
    const avgPrice = totalCases > 0 ? Math.round(totalSales / totalCases) : 0;
    
    document.getElementById('salesTotal').textContent = totalSales >= 10000000 ? (totalSales / 10000000).toFixed(1) + '천만' : totalSales.toLocaleString();
    document.getElementById('salesCases').textContent = totalCases;
    document.getElementById('salesAvg').textContent = avgPrice.toLocaleString();
    document.getElementById('salesTeeth').textContent = totalTeeth;
    
    renderSalesTrend();
    renderClinicSalesList(filtered, totalSales);
    renderClinicSalesChart(filtered, totalSales);
}

function renderSalesTrend() {
    const container = document.getElementById('salesTrendChart');
    const period = document.getElementById('salesPeriod')?.value || 'thisMonth';
    const trendType = document.getElementById('trendType')?.value || 'daily';
    
    const range = getPeriodRange(period);
    const myClinicId = getUserClinicId();
    const filtered = cases.filter(c => {
        const d = new Date(c.date);
        const inPeriod = d >= range.start && d <= range.end;
        const inClinic = isAdmin() || c.clinicId === myClinicId;
        return inPeriod && inClinic;
    });
    
    const trendData = {};
    
    filtered.forEach(c => {
        const d = new Date(c.date);
        let key;
        if (trendType === 'daily') {
            key = (d.getMonth() + 1) + '/' + d.getDate();
        } else if (trendType === 'weekly') {
            const weekNum = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
            key = (d.getMonth() + 1) + '월 ' + weekNum + '주';
        } else {
            key = d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월';
        }
        if (!trendData[key]) trendData[key] = { sales: 0, cases: 0 };
        trendData[key].sales += c.price || 0;
        trendData[key].cases++;
    });
    
    const sortedKeys = Object.keys(trendData).sort((a, b) => {
        if (trendType === 'monthly') {
            return a.localeCompare(b);
        }
        return a.localeCompare(b, undefined, { numeric: true });
    });
    
    if (sortedKeys.length === 0) {
        container.innerHTML = '<p style="color:var(--text3);text-align:center;padding:40px;">데이터가 없습니다</p>';
        return;
    }
    
    const maxSales = Math.max(...Object.values(trendData).map(d => d.sales), 1);
    const maxCases = Math.max(...Object.values(trendData).map(d => d.cases), 1);
    
    let html = `<div style="display:flex;align-items:flex-end;gap:8px;height:180px;padding:10px 0;overflow-x:auto;">`;
    
    sortedKeys.forEach(key => {
        const salesHeight = (trendData[key].sales / maxSales) * 140;
        const casesHeight = (trendData[key].cases / maxCases) * 140;
        const displaySales = trendData[key].sales >= 1000000 
            ? (trendData[key].sales / 1000000).toFixed(1) + 'M' 
            : (trendData[key].sales / 1000).toFixed(0) + 'K';
        
        html += `<div style="flex:0 0 auto;text-align:center;min-width:50px;">
            <div style="display:flex;gap:2px;align-items:flex-end;justify-content:center;height:140px;">
                <div style="width:18px;background:linear-gradient(to top,#2563eb,#60a5fa);border-radius:4px 4px 0 0;height:${salesHeight}px;"></div>
                <div style="width:18px;background:linear-gradient(to top,#16a34a,#4ade80);border-radius:4px 4px 0 0;height:${casesHeight}px;"></div>
            </div>
            <div style="font-size:10px;font-weight:700;color:#2563eb;margin-top:4px;">${displaySales}</div>
            <div style="font-size:9px;color:var(--text3);">${key}</div>
        </div>`;
    });
    
    html += `</div>`;
    html += `<div style="display:flex;gap:16px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);font-size:11px;color:var(--text2);">
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:#2563eb;border-radius:2px;"></span> 매출</span>
        <span style="display:flex;align-items:center;gap:4px;"><span style="width:12px;height:12px;background:#16a34a;border-radius:2px;"></span> 건수</span>
    </div>`;
    
    container.innerHTML = html;
}

function renderClinicSalesList(data, totalSales) {
    const container = document.getElementById('clinicSalesList');
    const clinicsData = {};
    
    data.forEach(c => {
        const name = getClinicName(c.clinicId);
        const toothCount = (c.tooth || '').split(',').filter(t => t.trim()).length;
        if (!clinicsData[c.clinicId]) {
            clinicsData[c.clinicId] = { name, count: 0, sales: 0, teeth: 0 };
        }
        clinicsData[c.clinicId].count++;
        clinicsData[c.clinicId].sales += c.price || 0;
        clinicsData[c.clinicId].teeth += toothCount;
    });
    
    const sorted = Object.values(clinicsData).sort((a, b) => b.sales - a.sales);
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="color:var(--text3);text-align:center;padding:20px;">데이터가 없습니다</p>';
        return;
    }
    
    let html = `<table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
            <tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                <th style="padding:10px 8px;text-align:left;">거래처</th>
                <th style="padding:10px 8px;text-align:center;">건수</th>
                <th style="padding:10px 8px;text-align:center;">치아</th>
                <th style="padding:10px 8px;text-align:right;">매출</th>
                <th style="padding:10px 8px;text-align:right;">비율</th>
            </tr>
        </thead>
        <tbody>`;
    
    sorted.forEach((d, i) => {
        const pct = totalSales > 0 ? Math.round((d.sales / totalSales) * 100) : 0;
        const rankColor = i === 0 ? '#fbbf24' : i === 1 ? '#94a3b8' : i === 2 ? '#cd7f32' : '#6b7280';
        html += `<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="padding:10px 8px;">
                <span style="display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background:${rankColor};color:#fff;border-radius:4px;font-size:11px;font-weight:700;margin-right:8px;">${i + 1}</span>
                ${escapeHtml(d.name)}
            </td>
            <td style="padding:10px 8px;text-align:center;">${d.count}건</td>
            <td style="padding:10px 8px;text-align:center;color:#6b7280;">${d.teeth}개</td>
            <td style="padding:10px 8px;text-align:right;font-weight:600;">${d.sales.toLocaleString()}원</td>
            <td style="padding:10px 8px;text-align:right;">
                <span style="background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;">${pct}%</span>
            </td>
        </tr>`;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
}

function renderClinicSalesChart(data, totalSales) {
    const container = document.getElementById('clinicSalesChart');
    const clinicsData = {};
    
    data.forEach(c => {
        const name = getClinicName(c.clinicId);
        if (!clinicsData[c.clinicId]) clinicsData[c.clinicId] = { name, sales: 0 };
        clinicsData[c.clinicId].sales += c.price || 0;
    });
    
    const sorted = Object.values(clinicsData).sort((a, b) => b.sales - a.sales).slice(0, 8);
    
    if (sorted.length === 0) {
        container.innerHTML = '<p style="color:var(--text3);text-align:center;padding:20px;">데이터가 없습니다</p>';
        return;
    }
    
    const colors = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
    const maxSales = sorted[0].sales;
    
    let html = '';
    sorted.forEach((d, i) => {
        const pct = totalSales > 0 ? Math.round((d.sales / totalSales) * 100) : 0;
        const barWidth = (d.sales / maxSales) * 100;
        html += `<div style="margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
                <span>${escapeHtml(d.name)}</span>
                <span style="font-weight:600;">${d.sales.toLocaleString()}원 (${pct}%)</span>
            </div>
            <div style="height:24px;background:#f1f5f9;border-radius:4px;overflow:hidden;">
                <div style="height:100%;width:${barWidth}%;background:${colors[i % colors.length]};border-radius:4px;display:flex;align-items:center;padding-left:8px;">
                    <span style="color:#fff;font-size:11px;font-weight:600;">${pct}%</span>
                </div>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
}

function exportSalesCSV() {
    const period = document.getElementById('salesPeriod')?.value || 'thisMonth';
    const range = getPeriodRange(period);
    const myClinicId = getUserClinicId();
    const filtered = cases.filter(c => {
        const d = new Date(c.date);
        const inPeriod = d >= range.start && d <= range.end;
        const inClinic = isAdmin() || c.clinicId === myClinicId;
        return inPeriod && inClinic;
    });
    
    let csv = '거래처,건수,치아수,매출\n';
    const clinicsData = {};
    filtered.forEach(c => {
        const name = getClinicName(c.clinicId);
        const toothCount = (c.tooth || '').split(',').filter(t => t.trim()).length;
        if (!clinicsData[c.clinicId]) clinicsData[c.clinicId] = { name, count: 0, teeth: 0, sales: 0 };
        clinicsData[c.clinicId].count++;
        clinicsData[c.clinicId].teeth += toothCount;
        clinicsData[c.clinicId].sales += c.price || 0;
    });
    
    Object.values(clinicsData).sort((a, b) => b.sales - a.sales).forEach(d => {
        csv += `"${d.name}",${d.count},${d.teeth},${d.sales}\n`;
    });
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '이룸덴탈Lab_거래처별매출_' + new Date().toISOString().slice(0,10) + '.csv';
    link.click();
}
