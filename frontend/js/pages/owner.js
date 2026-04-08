// Функция для экранирования HTML
function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
// Страница отчетов - ИСПРАВЛЕННАЯ ВЕРСИЯ (правильные теги таблиц)
async function renderReports(container) {
    try {
        const [revenue, occupancy, tariffs] = await Promise.all([
            api.getRevenueReport(),
            api.getOccupancyReport(),
            api.getPopularTariffs()
        ]);
        
        // Вычисляем общую выручку
        const totalRevenue = revenue.reduce((sum, day) => sum + (parseFloat(day.total_revenue) || 0), 0);
        const totalSessions = occupancy.reduce((sum, day) => sum + (day.total_sessions || 0), 0);
        const avgDuration = occupancy.length > 0 
            ? occupancy.reduce((sum, day) => sum + (day.avg_duration_hours || 0), 0) / occupancy.length 
            : 0;
        
        let html = `
            <h1>Аналитика</h1>
            <div class="stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                <div class="card" style="text-align: center; background: linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%);">
                    <div style="font-size: 2rem; font-weight: 800; color: var(--accent-light);">${formatPrice(totalRevenue)}</div>
                    <p style="color: var(--text-muted);">Общая выручка</p>
                </div>
                <div class="card" style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: 800; color: var(--accent-light);">${totalSessions}</div>
                    <p style="color: var(--text-muted);">Всего сеансов</p>
                </div>
                <div class="card" style="text-align: center;">
                    <div style="font-size: 2rem; font-weight: 800; color: var(--accent-light);">${Math.round(avgDuration * 10) / 10}</div>
                    <p style="color: var(--text-muted);">Средняя длительность (ч)</p>
                </div>
            </div>
            
            <div class="card">
                <h2>Выручка по дням</h2>
                ${revenue.length === 0 ? '<p style="text-align: center; padding: 2rem;">Нет данных о выручке</p>' : `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Дата</th>
                                <th>Сеансы</th>
                                <th>Товары</th>
                                <th>Пополнения</th>
                                <th>Итого</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${revenue.map(day => `
                                <tr>
                                    <td><strong>${new Date(day.date).toLocaleDateString('ru-RU')}</strong></td>
                                    <td>${formatPrice(day.sessions_revenue || 0)}</td>
                                    <td>${formatPrice(day.products_revenue || 0)}</td>
                                    <td>${formatPrice(day.deposits || 0)}</td>
                                    <td style="color: var(--success); font-weight: 700;">${formatPrice(day.total_revenue || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                `}
            </div>
            
            <div class="card">
                <h2>Загрузка компьютеров</h2>
                ${occupancy.length === 0 ? '<p style="text-align: center; padding: 2rem;">Нет данных о загрузке</p>' : `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Дата</th>
                                <th>Количество сеансов</th>
                                <th>Средняя длительность (ч)</th>
                                <th>Выручка</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${occupancy.map(day => `
                                <tr>
                                    <td><strong>${new Date(day.date).toLocaleDateString('ru-RU')}</strong></td>
                                    <td>${day.total_sessions}</td>
                                    <td>${day.avg_duration_hours}</td>
                                    <td>${formatPrice(day.total_revenue)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                `}
            </div>
            
            <div class="card">
                <h2>Популярность тарифов</h2>
                ${tariffs.length === 0 ? '<p style="text-align: center; padding: 2rem;">Нет данных о тарифах</p>' : `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Тариф</th>
                                <th>Количество сеансов</th>
                                <th>Выручка</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tariffs.map(tariff => `
                                <tr>
                                    <td><strong>${escapeHtml(tariff.tariff_name)}</strong></td>
                                    <td>${tariff.sessions_count}</td>
                                    <td>${formatPrice(tariff.total_revenue)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                `}
            </div>
        `;
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Render reports error:', error);
        container.innerHTML = `<div class="card error">Ошибка: ${error.message}</div>`;
    }
}

// Страница управления тарифами
async function renderTariffs(container) {
    try {
        const tariffs = await api.getTariffs();
        
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h1 style="margin: 0;">Управление тарифами</h1>
                <button id="addTariffBtn" class="btn btn-primary" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem;">
                    <span style="font-size: 1.2rem;">+</span> Добавить тариф
                </button>
            </div>
            <div class="tariffs-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1.5rem;">
        `;
        
        tariffs.forEach(tariff => {
            const computerType = tariff.computer_type === 'standard' ? 'Стандарт' : 'VIP';
            const dayType = tariff.day_type === 'weekday' ? 'Будни' : 'Выходные';
            const timeType = tariff.time_type === 'day' ? 'День (8:00-23:59)' : 'Ночь (0:00-7:59)';
            const isPackage = tariff.package_hours && tariff.package_hours > 0;
            const priceDisplay = isPackage 
                ? `${formatPrice(tariff.package_price)} за ${tariff.package_hours} ч`
                : `${formatPrice(tariff.price_per_hour)}/час`;
            
            html += `
                <div class="card tariff-card" data-tariff-id="${tariff.id}" style="position: relative; overflow: hidden; transition: all 0.3s;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--accent), var(--accent-light));"></div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                        <div>
                            <div style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">${escapeHtml(tariff.name)}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${computerType} • ${dayType} • ${timeType}</div>
                        </div>
                        <div style="background: var(--bg-input); padding: 0.25rem 0.75rem; border-radius: 20px;">
                            <span style="color: var(--accent-light); font-weight: 600;">${priceDisplay}</span>
                        </div>
                    </div>
                    <div style="margin: 1rem 0; padding: 0.75rem; background: var(--bg-input); border-radius: 12px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="color: var(--text-muted);">Цена за час:</span>
                            <span style="font-weight: 600;">${formatPrice(tariff.price_per_hour)}</span>
                        </div>
                        ${isPackage ? `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                            <span style="color: var(--text-muted);">Пакет:</span>
                            <span style="font-weight: 600;">${tariff.package_hours} ч - ${formatPrice(tariff.package_price)}</span>
                        </div>
                        ` : ''}
                    </div>
                    <div style="display: flex; gap: 0.75rem; margin-top: 0.5rem;">
                        <button class="edit-tariff-btn btn btn-secondary" 
                                data-id="${tariff.id}" 
                                data-name="${escapeHtml(tariff.name)}" 
                                data-computer-type="${tariff.computer_type}"
                                data-day-type="${tariff.day_type}"
                                data-time-type="${tariff.time_type}"
                                data-price="${tariff.price_per_hour}" 
                                data-package-hours="${tariff.package_hours || 0}" 
                                data-package-price="${tariff.package_price || 0}" 
                                style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                            Редактировать
                        </button>
                        <button class="delete-tariff-btn btn btn-danger" 
                                data-id="${tariff.id}" 
                                data-name="${escapeHtml(tariff.name)}" 
                                style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                            Удалить
                        </button>
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
        `;
        
        container.innerHTML = html;
        
        // Функция для открытия модального окна редактирования
        window.openEditTariffModal = (tariffId, name, computerType, dayType, timeType, price, packageHours, packagePrice) => {
            const isPackage = packageHours > 0;
            
            const editHtml = `
                <div>
                    <div class="form-group">
                        <label>Название тарифа</label>
                        <input type="text" id="editName" value="${escapeHtml(name)}" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                    </div>
                    <div class="form-group">
                        <label>Тип ПК</label>
                        <select id="editComputerType" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                            <option value="standard" ${computerType === 'standard' ? 'selected' : ''}>Стандарт</option>
                            <option value="vip" ${computerType === 'vip' ? 'selected' : ''}>VIP</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Тип дня</label>
                        <select id="editDayType" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                            <option value="weekday" ${dayType === 'weekday' ? 'selected' : ''}>Будни</option>
                            <option value="weekend" ${dayType === 'weekend' ? 'selected' : ''}>Выходные</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Время суток</label>
                        <select id="editTimeType" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                            <option value="day" ${timeType === 'day' ? 'selected' : ''}>День (8:00-23:59)</option>
                            <option value="night" ${timeType === 'night' ? 'selected' : ''}>Ночь (0:00-7:59)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Тип тарифа</label>
                        <select id="editTariffType" style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                            <option value="hourly" ${!isPackage ? 'selected' : ''}>Почасовой</option>
                            <option value="package" ${isPackage ? 'selected' : ''}>Пакетный</option>
                        </select>
                    </div>
                    <div id="editHourlyFields" style="${isPackage ? 'display: none;' : ''}">
                        <div class="form-group">
                            <label>Цена за час (₽)</label>
                            <input type="number" id="editPricePerHour" value="${price}" min="0" step="10" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                        </div>
                    </div>
                    <div id="editPackageFields" style="${isPackage ? '' : 'display: none;'}">
                        <div class="form-group">
                            <label>Часов в пакете</label>
                            <input type="number" id="editPackageHours" value="${packageHours}" min="1" step="1" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                        </div>
                        <div class="form-group">
                            <label>Цена за пакет (₽)</label>
                            <input type="number" id="editPackagePrice" value="${packagePrice}" min="0" step="10" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button type="button" id="saveTariffBtn" class="btn btn-primary" style="flex: 1;">Сохранить изменения</button>
                        <button type="button" id="cancelTariffBtn" class="btn btn-secondary" style="flex: 1;">Отмена</button>
                    </div>
                </div>
            `;
            
            const modal = showModal('Редактирование тарифа', editHtml);
            const tariffTypeSelect = modal.querySelector('#editTariffType');
            const hourlyFields = modal.querySelector('#editHourlyFields');
            const packageFields = modal.querySelector('#editPackageFields');
            const saveBtn = modal.querySelector('#saveTariffBtn');
            const cancelBtn = modal.querySelector('#cancelTariffBtn');
            
            tariffTypeSelect.addEventListener('change', () => {
                if (tariffTypeSelect.value === 'hourly') {
                    hourlyFields.style.display = 'block';
                    packageFields.style.display = 'none';
                } else {
                    hourlyFields.style.display = 'none';
                    packageFields.style.display = 'block';
                }
            });
            
            saveBtn.onclick = async () => {
                const newName = modal.querySelector('#editName').value;
                const newComputerType = modal.querySelector('#editComputerType').value;
                const newDayType = modal.querySelector('#editDayType').value;
                const newTimeType = modal.querySelector('#editTimeType').value;
                const newTariffType = tariffTypeSelect.value;
                
                let updateData = { 
                    name: newName, 
                    computer_type: newComputerType, 
                    day_type: newDayType, 
                    time_type: newTimeType 
                };
                
                if (newTariffType === 'hourly') {
                    const pricePerHour = parseFloat(modal.querySelector('#editPricePerHour').value);
                    updateData.price_per_hour = pricePerHour;
                    updateData.package_hours = null;
                    updateData.package_price = null;
                } else {
                    const packageHours = parseInt(modal.querySelector('#editPackageHours').value);
                    const packagePrice = parseFloat(modal.querySelector('#editPackagePrice').value);
                    updateData.price_per_hour = Math.round(packagePrice / packageHours);
                    updateData.package_hours = packageHours;
                    updateData.package_price = packagePrice;
                }
                
                saveBtn.disabled = true;
                saveBtn.textContent = 'Сохранение...';
                
                try {
                    await api.request(`/tariffs/${tariffId}`, {
                        method: 'PUT',
                        body: JSON.stringify(updateData)
                    });
                    showNotification('✅ Тариф обновлен!', 'success');
                    modal.remove();
                    router.handleRoute();
                } catch (error) {
                    console.error('Ошибка редактирования:', error);
                    showNotification('❌ ' + error.message, 'error');
                    saveBtn.disabled = false;
                    saveBtn.textContent = 'Сохранить cambios';
                }
            };
            
            cancelBtn.onclick = () => modal.remove();
        };
        
        // Привязываем обработчики к кнопкам редактирования
        document.querySelectorAll('.edit-tariff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tariffId = btn.dataset.id;
                const name = btn.dataset.name;
                const computerType = btn.dataset.computerType;
                const dayType = btn.dataset.dayType;
                const timeType = btn.dataset.timeType;
                const price = btn.dataset.price;
                const packageHours = btn.dataset.packageHours;
                const packagePrice = btn.dataset.packagePrice;
                
                window.openEditTariffModal(tariffId, name, computerType, dayType, timeType, price, packageHours, packagePrice);
            });
        });
        
        // Привязываем обработчики к кнопкам удаления
        document.querySelectorAll('.delete-tariff-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const tariffId = btn.dataset.id;
                const tariffName = btn.dataset.name;
                
                if (confirm(`Вы уверены, что хотите удалить тариф "${tariffName}"? Это действие нельзя отменить.`)) {
                    const deleteBtn = btn;
                    deleteBtn.disabled = true;
                    deleteBtn.textContent = 'Удаление...';
                    
                    try {
                        await api.request(`/tariffs/${tariffId}`, {
                            method: 'DELETE'
                        });
                        showNotification(`✅ Тариф "${tariffName}" удален`, 'success');
                        router.handleRoute();
                    } catch (error) {
                        console.error('Ошибка удаления:', error);
                        showNotification('❌ ' + error.message, 'error');
                        deleteBtn.disabled = false;
                        deleteBtn.textContent = 'Удалить';
                    }
                }
            });
        });
        
        // Добавление тарифа
        const addBtn = document.getElementById('addTariffBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                const addHtml = `
                    <div>
                        <div class="form-group">
                            <label>Название тарифа</label>
                            <input type="text" id="addName" required placeholder="Например: Стандартный дневной" style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                        </div>
                        <div class="form-group">
                            <label>Тип ПК</label>
                            <select id="addComputerType" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                                <option value="standard">Стандарт</option>
                                <option value="vip">VIP</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Тип дня</label>
                            <select id="addDayType" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                                <option value="weekday">Будни</option>
                                <option value="weekend">Выходные</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Время суток</label>
                            <select id="addTimeType" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                                <option value="day">День (8:00-23:59)</option>
                                <option value="night">Ночь (0:00-7:59)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Тип тарифа</label>
                            <select id="addTariffType" style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                                <option value="hourly">Почасовой</option>
                                <option value="package">Пакетный</option>
                            </select>
                        </div>
                        <div id="addHourlyFields">
                            <div class="form-group">
                                <label>Цена за час (₽)</label>
                                <input type="number" id="addPricePerHour" min="0" step="10" value="100" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                            </div>
                        </div>
                        <div id="addPackageFields" style="display: none;">
                            <div class="form-group">
                                <label>Часов в пакете</label>
                                <input type="number" id="addPackageHours" min="1" step="1" value="3" style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                            </div>
                            <div class="form-group">
                                <label>Цена за пакет (₽)</label>
                                <input type="number" id="addPackagePrice" min="0" step="10" value="250" style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                            </div>
                        </div>
                        <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                            <button type="button" id="createTariffBtn" class="btn btn-primary" style="flex: 1;">➕ Создать тариф</button>
                            <button type="button" id="cancelCreateBtn" class="btn btn-secondary" style="flex: 1;">Отмена</button>
                        </div>
                    </div>
                `;
                
                const modal = showModal('Добавление тарифа', addHtml);
                const tariffTypeSelect = modal.querySelector('#addTariffType');
                const hourlyFields = modal.querySelector('#addHourlyFields');
                const packageFields = modal.querySelector('#addPackageFields');
                const createBtn = modal.querySelector('#createTariffBtn');
                const cancelBtn = modal.querySelector('#cancelCreateBtn');
                
                tariffTypeSelect.addEventListener('change', () => {
                    if (tariffTypeSelect.value === 'hourly') {
                        hourlyFields.style.display = 'block';
                        packageFields.style.display = 'none';
                    } else {
                        hourlyFields.style.display = 'none';
                        packageFields.style.display = 'block';
                    }
                });
                
                createBtn.onclick = async () => {
                    const name = modal.querySelector('#addName').value;
                    const computerType = modal.querySelector('#addComputerType').value;
                    const dayType = modal.querySelector('#addDayType').value;
                    const timeType = modal.querySelector('#addTimeType').value;
                    const tariffType = tariffTypeSelect.value;
                    
                    if (!name) {
                        showNotification('Введите название тарифа', 'error');
                        return;
                    }
                    
                    let tariffData = {
                        name,
                        computer_type: computerType,
                        day_type: dayType,
                        time_type: timeType
                    };
                    
                    if (tariffType === 'hourly') {
                        const pricePerHour = parseFloat(modal.querySelector('#addPricePerHour').value);
                        if (isNaN(pricePerHour) || pricePerHour <= 0) {
                            showNotification('Введите корректную цену', 'error');
                            return;
                        }
                        tariffData.price_per_hour = pricePerHour;
                        tariffData.package_hours = null;
                        tariffData.package_price = null;
                    } else {
                        const packageHours = parseInt(modal.querySelector('#addPackageHours').value);
                        const packagePrice = parseFloat(modal.querySelector('#addPackagePrice').value);
                        if (isNaN(packageHours) || packageHours <= 0 || isNaN(packagePrice) || packagePrice <= 0) {
                            showNotification('Введите корректные данные пакета', 'error');
                            return;
                        }
                        tariffData.price_per_hour = Math.round(packagePrice / packageHours);
                        tariffData.package_hours = packageHours;
                        tariffData.package_price = packagePrice;
                    }
                    
                    createBtn.disabled = true;
                    createBtn.textContent = 'Создание...';
                    
                    try {
                        await api.request('/tariffs', {
                            method: 'POST',
                            body: JSON.stringify(tariffData)
                        });
                        showNotification('✅ Тариф создан!', 'success');
                        modal.remove();
                        router.handleRoute();
                    } catch (error) {
                        console.error('Ошибка создания тарифа:', error);
                        showNotification('❌ ' + error.message, 'error');
                        createBtn.disabled = false;
                        createBtn.textContent = '➕ Создать тариф';
                    }
                };
                
                cancelBtn.onclick = () => modal.remove();
            });
        }
        
    } catch (error) {
        console.error('Render tariffs error:', error);
        container.innerHTML = `<div class="card error">Ошибка: ${error.message}</div>`;
    }
}

// Страница продажи товаров с управлением - КРАСИВЫЕ КНОПКИ
async function renderProducts(container) {
    try {
        const products = await api.getProducts();
        const sessions = await api.getActiveSessions();
        const isOwner = auth.getRole() === 'owner';
        
        let html = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h1 style="margin: 0;">Продажа товаров</h1>
        `;
        
        if (isOwner) {
            html += `
                <button id="addProductBtn" class="btn btn-primary" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; border-radius: 12px; font-weight: 600;">
                    <span style="font-size: 1.2rem;">+</span> Добавить товар
                </button>
            `;
        }
        
        html += `
            </div>
        `;
        
        if (sessions.length === 0) {
            html += `
                <div class="card" style="text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;"></div>
                    <h3>Нет активных сеансов</h3>
                    <p>Сначала начните сеанс для клиента</p>
                </div>
            `;
            container.innerHTML = html;
            
            if (isOwner) {
                const addBtn = document.getElementById('addProductBtn');
                if (addBtn) {
                    addBtn.addEventListener('click', () => {
                        showAddProductModal();
                    });
                }
            }
            return;
        }
        
        html += `
            <div class="card">
                <h3>Выберите активный сеанс</h3>
                <div class="form-group">
                    <select id="sessionSelect" style="width: 100%; padding: 0.75rem 1rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border); font-size: 1rem; cursor: pointer;">
                        <option value="">-- Выберите сеанс --</option>
                        ${sessions.map(s => `<option value="${s.id}">${escapeHtml(s.user_name)} - ${escapeHtml(s.computer_name)} (${formatDateTime(s.start_time)})</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="products-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem;">
        `;
        
        products.forEach(product => {
            const isInStock = product.stock > 0;
            
            html += `
                <div class="product-card" 
                     data-product-id="${product.id}" 
                     data-product-name="${escapeHtml(product.name)}" 
                     data-product-price="${product.price}" 
                     data-product-stock="${product.stock}"
                     style="background: var(--bg-card); border-radius: 20px; padding: 1.5rem; transition: all 0.3s; border: 1px solid var(--border-light);">
                    <div style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">${escapeHtml(product.name)}</div>
                    <div style="font-size: 1.8rem; font-weight: 800; background: var(--gradient-primary); -webkit-background-clip: text; background-clip: text; color: transparent; margin: 0.5rem 0;">${formatPrice(product.price)}</div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin: 0.5rem 0; padding: 0.5rem 0.75rem; background: ${isInStock ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border-radius: 12px;">
                        <span style="color: ${isInStock ? 'var(--success)' : 'var(--danger)'};">${isInStock ? '●' : '○'}</span>
                        <span>${isInStock ? 'В наличии' : 'Нет в наличии'}</span>
                        <span style="margin-left: auto;">Остаток: ${product.stock} шт.</span>
                    </div>
                    <button class="btn btn-primary sell-btn" style="width: 100%; margin-top: 0.5rem; padding: 0.6rem; border-radius: 12px; font-weight: 600;">Продать</button>
            `;
            
            if (isOwner) {
                html += `
                    <div style="display: flex; gap: 0.75rem; margin-top: 0.75rem;">
                        <button class="edit-product-btn" data-id="${product.id}" style="flex: 1; padding: 0.5rem; border-radius: 10px; background: var(--bg-input); border: 1px solid var(--border); color: var(--text-primary); cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 0.25rem; font-weight: 500;">
                            Редактировать
                        </button>
                        <button class="delete-product-btn btn-danger" data-id="${product.id}" data-name="${escapeHtml(product.name)}" style="flex: 1; padding: 0.5rem; border-radius: 10px; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--danger); color: var(--danger); cursor: pointer; transition: all 0.3s; display: flex; align-items: center; justify-content: center; gap: 0.25rem; font-weight: 500;">
                            Удалить
                        </button>
                    </div>
                `;
            }
            
            html += `
                </div>
            `;
        });
        
        html += `
            </div>
        `;
        
        container.innerHTML = html;
        
        const sessionSelect = document.getElementById('sessionSelect');
        
        // Обработчики продажи
        document.querySelectorAll('.sell-btn').forEach(btn => {
            btn.onclick = async (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                const card = btn.closest('.product-card');
                const productId = parseInt(card.dataset.productId);
                const productName = card.dataset.productName;
                const price = parseFloat(card.dataset.productPrice);
                const stock = parseInt(card.dataset.productStock);
                const sessionId = sessionSelect ? sessionSelect.value : null;
                
                if (!sessionId) {
                    showNotification('Сначала выберите активный сеанс', 'error');
                    return;
                }
                
                if (stock <= 0) {
                    showNotification('Товар закончился на складе', 'error');
                    return;
                }
                
                const quantityHtml = `
                    <div>
                        <div class="form-group">
                            <label>Товар</label>
                            <input type="text" value="${productName}" disabled style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input);">
                        </div>
                        <div class="form-group">
                            <label>Цена за шт.</label>
                            <input type="text" value="${formatPrice(price)}" disabled style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input);">
                        </div>
                        <div class="form-group">
                            <label>Количество</label>
                            <input type="number" id="quantity" min="1" max="${stock}" value="1" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                            <small>Доступно: ${stock} шт.</small>
                        </div>
                        <div class="form-group">
                            <label>Итого</label>
                            <input type="text" id="totalPrice" value="${formatPrice(price)}" disabled style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input);">
                        </div>
                        <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                            <button type="button" id="confirmSellBtn" class="btn btn-primary" style="flex: 1; border-radius: 12px;">Продать</button>
                            <button type="button" id="cancelSellBtn" class="btn btn-secondary" style="flex: 1; border-radius: 12px;">Отмена</button>
                        </div>
                    </div>
                `;
                
                const modal = showModal('Продажа товара', quantityHtml);
                const quantityInput = modal.querySelector('#quantity');
                const totalPriceInput = modal.querySelector('#totalPrice');
                const confirmBtn = modal.querySelector('#confirmSellBtn');
                const cancelBtn = modal.querySelector('#cancelSellBtn');
                
                quantityInput.addEventListener('input', () => {
                    const qty = parseInt(quantityInput.value) || 0;
                    const total = price * qty;
                    totalPriceInput.value = formatPrice(total);
                });
                
                confirmBtn.onclick = async () => {
                    const quantity = parseInt(quantityInput.value);
                    
                    if (quantity < 1 || quantity > stock) {
                        showNotification(`Введите количество от 1 до ${stock}`, 'error');
                        return;
                    }
                    
                    confirmBtn.disabled = true;
                    confirmBtn.textContent = 'Продажа...';
                    
                    try {
                        await api.sellProduct({
                            session_id: sessionId,
                            product_id: productId,
                            quantity: quantity
                        });
                        showNotification(`✅ Продано ${quantity} x ${productName} на сумму ${formatPrice(price * quantity)}`, 'success');
                        modal.remove();
                        router.handleRoute();
                    } catch (error) {
                        console.error('Ошибка продажи:', error);
                        showNotification('❌ ' + error.message, 'error');
                        confirmBtn.disabled = false;
                        confirmBtn.textContent = 'Подтвердить продажу';
                    }
                };
                
                cancelBtn.onclick = () => modal.remove();
            };
        });
        
        // Если владелец - добавляем обработчики для редактирования и удаления
        if (isOwner) {
            // Редактирование товара
            document.querySelectorAll('.edit-product-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const productId = btn.dataset.id;
                    const card = btn.closest('.product-card');
                    const currentName = card.dataset.productName;
                    const currentPrice = card.dataset.productPrice;
                    const currentStock = card.dataset.productStock;
                    
                    const editHtml = `
                        <div>
                            <div class="form-group">
                                <label>Название товара</label>
                                <input type="text" id="editProductName" value="${escapeHtml(currentName)}" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                            </div>
                            <div class="form-group">
                                <label>Цена (₽)</label>
                                <input type="number" id="editProductPrice" value="${currentPrice}" min="1" step="1" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                            </div>
                            <div class="form-group">
                                <label>Остаток (шт.)</label>
                                <input type="number" id="editProductStock" value="${currentStock}" min="0" step="1" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                            </div>
                            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                                <button type="button" id="saveProductBtn" class="btn btn-primary" style="flex: 1; border-radius: 12px;">Сохранить изменения</button>
                                <button type="button" id="cancelProductBtn" class="btn btn-secondary" style="flex: 1; border-radius: 12px;">Отмена</button>
                            </div>
                        </div>
                    `;
                    
                    const modal = showModal('Редактирование товара', editHtml);
                    const saveBtn = modal.querySelector('#saveProductBtn');
                    const cancelBtn = modal.querySelector('#cancelProductBtn');
                    
                    saveBtn.onclick = async () => {
                        const name = modal.querySelector('#editProductName').value.trim();
                        const price = parseFloat(modal.querySelector('#editProductPrice').value);
                        const stock = parseInt(modal.querySelector('#editProductStock').value);
                        
                        if (!name) {
                            showNotification('Введите название товара', 'error');
                            return;
                        }
                        
                        if (isNaN(price) || price <= 0) {
                            showNotification('Цена должна быть положительным числом', 'error');
                            return;
                        }
                        
                        if (isNaN(stock) || stock < 0) {
                            showNotification('Остаток должен быть неотрицательным числом', 'error');
                            return;
                        }
                        
                        saveBtn.disabled = true;
                        saveBtn.textContent = 'Сохранение...';
                        
                        try {
                            await api.request(`/products/${productId}`, {
                                method: 'PUT',
                                body: JSON.stringify({ name, price, stock })
                            });
                            showNotification(`✅ Товар "${name}" обновлен!`, 'success');
                            modal.remove();
                            router.handleRoute();
                        } catch (error) {
                            showNotification('❌ ' + error.message, 'error');
                            saveBtn.disabled = false;
                            saveBtn.textContent = 'Сохранить изменения';
                        }
                    };
                    
                    cancelBtn.onclick = () => modal.remove();
                });
            });
            
            // Удаление товара
            document.querySelectorAll('.delete-product-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const productId = btn.dataset.id;
                    const productName = btn.dataset.name;
                    
                    if (confirm(`Вы уверены, что хотите удалить товар "${productName}"? Это действие нельзя отменить.`)) {
                        try {
                            await api.request(`/products/${productId}`, {
                                method: 'DELETE'
                            });
                            showNotification(`✅ Товар "${productName}" удален`, 'success');
                            router.handleRoute();
                        } catch (error) {
                            showNotification('❌ ' + error.message, 'error');
                        }
                    }
                });
            });
            
            // Добавление товара
            window.showAddProductModal = () => {
                const addHtml = `
                    <div>
                        <div class="form-group">
                            <label>Название товара</label>
                            <input type="text" id="addProductName" required placeholder="Например: Чипсы Lays" style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                        </div>
                        <div class="form-group">
                            <label>Цена (₽)</label>
                            <input type="number" id="addProductPrice" min="1" step="1" value="100" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                            <small>Цена должна быть положительным целым числом</small>
                        </div>
                        <div class="form-group">
                            <label>Начальный остаток (шт.)</label>
                            <input type="number" id="addProductStock" min="0" step="1" value="50" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                            <small>Количество на складе</small>
                        </div>
                        <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                            <button type="button" id="createProductBtn" class="btn btn-primary" style="flex: 1; border-radius: 12px;">➕ Добавить товар</button>
                            <button type="button" id="cancelProductBtn" class="btn btn-secondary" style="flex: 1; border-radius: 12px;">Отмена</button>
                        </div>
                    </div>
                `;
                
                const modal = showModal('Добавление товара', addHtml);
                const createBtn = modal.querySelector('#createProductBtn');
                const cancelBtn = modal.querySelector('#cancelProductBtn');
                
                createBtn.onclick = async () => {
                    const name = modal.querySelector('#addProductName').value.trim();
                    const price = parseFloat(modal.querySelector('#addProductPrice').value);
                    const stock = parseInt(modal.querySelector('#addProductStock').value);
                    
                    if (!name) {
                        showNotification('Введите название товара', 'error');
                        return;
                    }
                    
                    if (isNaN(price) || price <= 0) {
                        showNotification('Цена должна быть положительным числом', 'error');
                        return;
                    }
                    
                    if (isNaN(stock) || stock < 0) {
                        showNotification('Остаток должен быть неотрицательным числом', 'error');
                        return;
                    }
                    
                    createBtn.disabled = true;
                    createBtn.textContent = 'Добавление...';
                    
                    try {
                        await api.request('/products', {
                            method: 'POST',
                            body: JSON.stringify({ name, price, stock })
                        });
                        showNotification(`✅ Товар "${name}" добавлен!`, 'success');
                        modal.remove();
                        router.handleRoute();
                    } catch (error) {
                        console.error('Ошибка добавления товара:', error);
                        showNotification('❌ ' + error.message, 'error');
                        createBtn.disabled = false;
                        createBtn.textContent = '➕ Добавить товар';
                    }
                };
                
                cancelBtn.onclick = () => modal.remove();
            };
            
            const addProductBtn = document.getElementById('addProductBtn');
            if (addProductBtn) {
                addProductBtn.addEventListener('click', () => {
                    window.showAddProductModal();
                });
            }
        }
        
    } catch (error) {
        console.error('Render products error:', error);
        container.innerHTML = `<div class="card error">Ошибка загрузки: ${error.message}</div>`;
    }
}