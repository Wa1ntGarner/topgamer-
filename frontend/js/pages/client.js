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

// Страница схемы залов
async function renderDashboard(container) {
    try {
        const halls = await api.getComputers();
        const isClient = auth.getRole() === 'client';
        const isAdmin = auth.getRole() === 'admin' || auth.getRole() === 'owner';
        
        let html = '<h1>Схема залов</h1>';
        
        halls.forEach(hall => {
            html += `
                <div class="hall-section">
                    <h2 class="hall-title">${escapeHtml(hall.name)}</h2>
                    <div class="computers-grid">
            `;
            
            hall.computers.forEach(computer => {
                let statusText = '';
                let statusClass = '';
                
                switch (computer.status) {
                    case 'free':
                        statusText = 'Свободен';
                        statusClass = 'status-free';
                        break;
                    case 'occupied':
                        statusText = 'Занят';
                        statusClass = 'status-occupied';
                        break;
                    case 'booked':
                        statusText = 'Забронирован';
                        statusClass = 'status-booked';
                        break;
                    case 'broken':
                        statusText = 'Неисправен';
                        statusClass = 'status-broken';
                        break;
                }
                
                html += `
                    <div class="computer-card ${statusClass}" 
                         data-computer-id="${computer.id}"
                         data-computer-name="${escapeHtml(computer.name)}"
                         data-computer-type="${computer.type}"
                         data-status="${computer.status}">
                        <div class="computer-name">${escapeHtml(computer.name)}</div>
                        <div class="computer-type">${computer.type === 'vip' ? 'VIP' : 'Стандарт'}</div>
                        <div class="computer-status">${statusText}</div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        document.querySelectorAll('.computer-card').forEach(card => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', async (e) => {
                const computerId = card.dataset.computerId;
                const computerName = card.dataset.computerName;
                const computerType = card.dataset.computerType;
                const status = card.dataset.status;
                
                if (isAdmin) {
                    showComputerActionsModal(computerId, computerName, status);
                }
                else if (isClient && status === 'free') {
                    showClientBookingModal(computerId, computerName, computerType);
                }
                else if (isClient && status !== 'free') {
                    let message = '';
                    if (status === 'occupied') message = 'Этот компьютер уже занят';
                    else if (status === 'booked') message = 'Этот компьютер уже забронирован';
                    else if (status === 'broken') message = 'Этот компьютер неисправен';
                    showNotification(message, 'error');
                }
            });
        });
        
    } catch (error) {
        console.error('Render dashboard error:', error);
        container.innerHTML = `<div class="card error">Ошибка загрузки: ${error.message}</div>`;
    }
}

// Модальное окно для действий администратора
function showComputerActionsModal(computerId, computerName, status) {
    let html = '';
    
    if (status === 'free') {
        html = `
            <div style="display: flex; gap: 1rem; flex-direction: column;">
                <button id="startSessionBtn" class="btn btn-primary">Начать сеанс</button>
                <button id="bookBtn" class="btn btn-primary">Забронировать</button>
                <button id="markBrokenBtn" class="btn btn-warning">Отметить неисправным</button>
            </div>
        `;
    } else if (status === 'occupied') {
        html = `
            <div style="display: flex; gap: 1rem; flex-direction: column;">
                <button id="endSessionBtn" class="btn btn-danger">Завершить сеанс</button>
                <button id="markBrokenBtn" class="btn btn-warning">Отметить неисправным</button>
            </div>
        `;
    } else if (status === 'booked') {
        html = `
            <div style="display: flex; gap: 1rem; flex-direction: column;">
                <button id="markFreeBtn" class="btn btn-success">Освободить</button>
                <button id="markBrokenBtn" class="btn btn-warning">Отметить неисправным</button>
            </div>
        `;
    } else if (status === 'broken') {
        html = `
            <div style="display: flex; gap: 1rem; flex-direction: column;">
                <button id="markFreeBtn" class="btn btn-success">Восстановить</button>
            </div>
        `;
    }
    
    const modal = showModal(`Компьютер ${computerName}`, `<div style="display: flex; gap: 1rem; flex-wrap: wrap;">${html}</div>`);
    
    if (status === 'free') {
        modal.querySelector('#startSessionBtn')?.addEventListener('click', async () => {
            try {
                const users = await api.getAllUsers();
                const clients = users.filter(u => u.role === 'client');
                
                if (clients.length === 0) {
                    showNotification('Нет зарегистрированных клиентов', 'error');
                    return;
                }
                
                const userHtml = `
                    <div>
                        <div class="form-group">
                            <label>Выберите клиента</label>
                            <select id="userId" required style="width: 100%; padding: 0.75rem; border-radius: 8px;">
                                ${clients.map(c => `<option value="${c.id}">${escapeHtml(c.full_name)} (${c.email || 'email не указан'}) - Баланс: ${Math.floor(c.balance)} ₽</option>`).join('')}
                            </select>
                        </div>
                        <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                            <button type="button" id="startSessionConfirm" class="btn btn-primary" style="flex: 1;">Начать сеанс</button>
                            <button type="button" id="startSessionCancel" class="btn btn-secondary" style="flex: 1;">Отмена</button>
                        </div>
                    </div>
                `;
                
                const userModal = showModal('Выбор клиента', userHtml);
                const userIdSelect = userModal.querySelector('#userId');
                const confirmBtn = userModal.querySelector('#startSessionConfirm');
                const cancelBtn = userModal.querySelector('#startSessionCancel');
                
                confirmBtn.onclick = async () => {
                    const userId = userIdSelect.value;
                    
                    try {
                        await api.startSession({ 
                            user_id: userId, 
                            computer_id: parseInt(computerId) 
                        });
                        showNotification(`✅ Сеанс начат на компьютере ${computerName}!`, 'success');
                        userModal.remove();
                        modal.remove();
                        router.handleRoute();
                    } catch (error) {
                        showNotification('❌ ' + error.message, 'error');
                    }
                };
                
                cancelBtn.onclick = () => userModal.remove();
            } catch (error) {
                showNotification('Ошибка загрузки клиентов', 'error');
            }
        });
        
        modal.querySelector('#bookBtn')?.addEventListener('click', () => {
            modal.remove();
            showAdminBookingModal(computerId, computerName);
        });
    }
    
    if (status === 'occupied') {
        modal.querySelector('#endSessionBtn')?.addEventListener('click', async () => {
            try {
                const activeSessions = await api.getActiveSessions();
                const session = activeSessions.find(s => s.computer_id === parseInt(computerId));
                
                if (!session) {
                    showNotification('Активный сеанс не найден', 'error');
                    return;
                }
                
                const paymentHtml = `
                    <div>
                        <div class="form-group">
                            <label>Способ оплаты</label>
                            <select id="paymentMethod" required style="width: 100%; padding: 0.75rem; border-radius: 8px;">
                                <option value="cash">Наличные</option>
                                <option value="card">Карта</option>
                                <option value="balance">С баланса</option>
                            </select>
                        </div>
                        <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                            <button type="button" id="endSessionConfirm" class="btn btn-primary" style="flex: 1;">Завершить и оплатить</button>
                            <button type="button" id="endSessionCancel" class="btn btn-secondary" style="flex: 1;">Отмена</button>
                        </div>
                    </div>
                `;
                
                const paymentModal = showModal('Завершение сеанса', paymentHtml);
                const paymentMethodSelect = paymentModal.querySelector('#paymentMethod');
                const confirmBtn = paymentModal.querySelector('#endSessionConfirm');
                const cancelBtn = paymentModal.querySelector('#endSessionCancel');
                
                confirmBtn.onclick = async () => {
                    const paymentMethod = paymentMethodSelect.value;
                    
                    try {
                        await api.endSession({ 
                            session_id: session.id, 
                            payment_method: paymentMethod 
                        });
                        showNotification('✅ Сеанс завершен!', 'success');
                        paymentModal.remove();
                        modal.remove();
                        router.handleRoute();
                    } catch (error) {
                        showNotification('❌ ' + error.message, 'error');
                    }
                };
                
                cancelBtn.onclick = () => paymentModal.remove();
            } catch (error) {
                showNotification('Ошибка получения активных сеансов', 'error');
            }
        });
    }
    
    if (status === 'booked' || status === 'broken') {
        modal.querySelector('#markFreeBtn')?.addEventListener('click', async () => {
            try {
                await api.updateComputerStatus(computerId, 'free');
                showNotification('✅ Статус ПК изменен', 'success');
                modal.remove();
                router.handleRoute();
            } catch (error) {
                showNotification('❌ ' + error.message, 'error');
            }
        });
    }
    
    if (status !== 'broken') {
        modal.querySelector('#markBrokenBtn')?.addEventListener('click', async () => {
            try {
                await api.updateComputerStatus(computerId, 'broken');
                showNotification('⚠️ Компьютер отмечен как неисправный', 'warning');
                modal.remove();
                router.handleRoute();
            } catch (error) {
                showNotification('❌ ' + error.message, 'error');
            }
        });
    }
}

// Модальное окно для бронирования администратором
function showAdminBookingModal(computerId, computerName) {
    const now = new Date();
    const minDateTime = new Date(now.getTime() + 30 * 60000);
    const maxDateTime = new Date(now.getTime() + 7 * 24 * 3600000);
    
    const formatDateForInput = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    const formatTimeForInput = (date) => {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };
    
    const defaultStartDate = formatDateForInput(minDateTime);
    const defaultStartTime = formatTimeForInput(minDateTime);
    
    const html = `
        <div>
            <div class="form-group">
                <label>Компьютер</label>
                <input type="text" value="${escapeHtml(computerName)}" disabled style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input);">
            </div>
            
            <div class="form-group">
                <label>Введите номер телефона клиента</label>
                <input type="tel" id="clientPhone" placeholder="+7 (999) 123-45-67" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                <small>Введите номер телефона для поиска клиента</small>
            </div>
            
            <div id="clientSearchResult" style="margin-top: 0.5rem;"></div>
            
            <div id="selectedClientInfo" style="display: none; padding: 0.75rem; background: var(--bg-input); border-radius: 12px; margin-top: 0.5rem;">
                <strong>Выбран клиент:</strong> <span id="selectedClientName"></span>
            </div>
            
            <div id="newClientFields" style="display: none; margin-top: 1rem;">
                <div class="form-group">
                    <label>ФИО клиента *</label>
                    <input type="text" id="newFullName" placeholder="Иванов Иван Иванович" style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                </div>
                <div class="form-group">
                    <label>Email (необязательно)</label>
                    <input type="email" id="newEmail" placeholder="client@example.com" style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                    <small>Email можно будет указать позже в личном кабинете</small>
                </div>
                <div class="form-group">
                    <label>Пароль по умолчанию: <strong>123456</strong></label>
                    <input type="text" value="123456" disabled style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                </div>
            </div>
            
            <div class="form-group">
                <label>Дата и время начала</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                    <input type="date" id="startDate" min="${defaultStartDate}" max="${formatDateForInput(maxDateTime)}" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                    <input type="time" id="startTime" step="1800" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                </div>
            </div>
            
            <div class="form-group">
                <label>Длительность</label>
                <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <button type="button" class="duration-quick-btn btn-secondary" data-hours="1">1 час</button>
                    <button type="button" class="duration-quick-btn btn-secondary" data-hours="2">2 часа</button>
                    <button type="button" class="duration-quick-btn btn-secondary" data-hours="3">3 часа</button>
                    <button type="button" class="duration-quick-btn btn-secondary" data-hours="4">4 часа</button>
                    <button type="button" class="duration-quick-btn btn-secondary" data-hours="5">5 часов</button>
                    <button type="button" class="duration-quick-btn btn-secondary" data-hours="6">6 часов</button>
                </div>
                <select id="duration" style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                    <option value="">-- Выберите длительность --</option>
                    <option value="1">1 час</option>
                    <option value="2">2 часа</option>
                    <option value="3">3 часа</option>
                    <option value="4">4 часа</option>
                    <option value="5">5 часов</option>
                    <option value="6">6 часов</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>Или укажите время окончания</label>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                    <input type="date" id="endDate" min="${defaultStartDate}" max="${formatDateForInput(maxDateTime)}" style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                    <input type="time" id="endTimeCustom" step="1800" style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                </div>
            </div>
            
            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button type="button" id="confirmBookingBtn" class="btn btn-primary" style="flex: 1;">Забронировать</button>
                <button type="button" id="cancelBookingBtn" class="btn btn-secondary" style="flex: 1;">Отмена</button>
            </div>
        </div>
    `;
    
    const modal = showModal(`Бронирование ${computerName}`, html);
    const phoneInput = modal.querySelector('#clientPhone');
    const searchResult = modal.querySelector('#clientSearchResult');
    const selectedClientInfo = modal.querySelector('#selectedClientInfo');
    const selectedClientNameSpan = modal.querySelector('#selectedClientName');
    const newClientFields = modal.querySelector('#newClientFields');
    const startDateInput = modal.querySelector('#startDate');
    const startTimeInput = modal.querySelector('#startTime');
    const endDateInput = modal.querySelector('#endDate');
    const endTimeInput = modal.querySelector('#endTimeCustom');
    const durationSelect = modal.querySelector('#duration');
    const durationQuickBtns = modal.querySelectorAll('.duration-quick-btn');
    const confirmBtn = modal.querySelector('#confirmBookingBtn');
    const cancelBtn = modal.querySelector('#cancelBookingBtn');
    
    startDateInput.value = defaultStartDate;
    startTimeInput.value = defaultStartTime;
    
    let selectedUserId = null;
    let isNewClient = false;
    
    phoneInput.addEventListener('input', async () => {
        const phone = phoneInput.value.trim();
        if (phone.length < 5) {
            searchResult.innerHTML = '';
            selectedClientInfo.style.display = 'none';
            newClientFields.style.display = 'none';
            selectedUserId = null;
            isNewClient = false;
            return;
        }
        
        try {
            const users = await api.getAllUsers();
            const clients = users.filter(u => u.role === 'client');
            const foundClients = clients.filter(c => c.phone && c.phone.includes(phone));
            
            if (foundClients.length === 0) {
                searchResult.innerHTML = `
                    <div style="padding: 0.75rem; background: rgba(245, 158, 11, 0.1); border-radius: 12px;">
                        <span>Клиент не найден</span>
                        <button type="button" id="createNewClientBtn" style="margin-left: 1rem; padding: 0.25rem 0.75rem; background: var(--bg-input); border-radius: 8px;">Создать нового</button>
                    </div>
                `;
                selectedClientInfo.style.display = 'none';
                newClientFields.style.display = 'none';
                selectedUserId = null;
                isNewClient = false;
                
                const createBtn = searchResult.querySelector('#createNewClientBtn');
                if (createBtn) {
                    createBtn.addEventListener('click', () => {
                        isNewClient = true;
                        selectedUserId = null;
                        selectedClientInfo.style.display = 'none';
                        newClientFields.style.display = 'block';
                        searchResult.innerHTML = '<span style="color: var(--success);">Будет создан новый клиент (пароль: 123456)</span>';
                    });
                }
            } else if (foundClients.length === 1) {
                const client = foundClients[0];
                searchResult.innerHTML = `<span style="color: var(--success);">Найден: ${escapeHtml(client.full_name)}</span>`;
                selectedClientNameSpan.textContent = `${client.full_name} (${client.phone})`;
                selectedClientInfo.style.display = 'block';
                newClientFields.style.display = 'none';
                selectedUserId = client.id;
                isNewClient = false;
            } else {
                let listHtml = '<div><small>Найдено несколько клиентов:</small><ul>';
                foundClients.forEach(c => {
                    listHtml += `<li style="cursor: pointer; padding: 0.5rem;" onclick="selectClientFromBooking('${c.id}', '${escapeHtml(c.full_name)}', '${c.phone}')">${escapeHtml(c.full_name)} (${c.phone})</li>`;
                });
                listHtml += '</ul></div>';
                searchResult.innerHTML = listHtml;
                selectedClientInfo.style.display = 'none';
                newClientFields.style.display = 'none';
                selectedUserId = null;
                isNewClient = false;
            }
        } catch (error) {
            console.error('Ошибка поиска клиента:', error);
            searchResult.innerHTML = '<span style="color: var(--danger);">Ошибка поиска</span>';
        }
    });
    
    window.selectClientFromBooking = (id, name, phone) => {
        selectedUserId = id;
        selectedClientNameSpan.textContent = `${name} (${phone})`;
        selectedClientInfo.style.display = 'block';
        newClientFields.style.display = 'none';
        searchResult.innerHTML = `<span style="color: var(--success);">Выбран: ${name}</span>`;
        isNewClient = false;
    };
    
    durationQuickBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const hours = parseInt(btn.dataset.hours);
            durationSelect.value = hours;
            endDateInput.value = '';
            endTimeInput.value = '';
            
            const startDateTime = new Date(`${startDateInput.value}T${startTimeInput.value}`);
            const endDateTime = new Date(startDateTime.getTime() + hours * 3600000);
            endDateInput.value = endDateTime.toISOString().split('T')[0];
            endTimeInput.value = endDateTime.toTimeString().substring(0, 5);
            
            durationQuickBtns.forEach(b => b.classList.remove('btn-primary'));
            btn.classList.add('btn-primary');
        });
    });
    
    durationSelect.addEventListener('change', () => {
        if (durationSelect.value) {
            endDateInput.value = '';
            endTimeInput.value = '';
            durationQuickBtns.forEach(b => b.classList.remove('btn-primary'));
        }
    });
    
    endDateInput.addEventListener('change', () => {
        if (endDateInput.value && endTimeInput.value) {
            durationSelect.value = '';
            durationQuickBtns.forEach(b => b.classList.remove('btn-primary'));
        }
    });
    
    endTimeInput.addEventListener('change', () => {
        if (endDateInput.value && endTimeInput.value) {
            durationSelect.value = '';
            durationQuickBtns.forEach(b => b.classList.remove('btn-primary'));
        }
    });
    
    confirmBtn.onclick = async () => {
        let userId = selectedUserId;
        
        if (isNewClient) {
            const fullName = modal.querySelector('#newFullName').value.trim();
            const email = modal.querySelector('#newEmail').value.trim();
            const phone = phoneInput.value.trim();
            
            if (!fullName) {
                showNotification('Введите ФИО клиента', 'error');
                return;
            }
            if (!phone) {
                showNotification('Введите номер телефона', 'error');
                return;
            }
            
            try {
                const registerResult = await api.register({
                    full_name: fullName,
                    phone: phone,
                    email: email || '',
                    password: '123456'
                });
                userId = registerResult.user.id;
                showNotification(`✅ Клиент "${fullName}" зарегистрирован! Пароль: 123456`, 'success');
            } catch (error) {
                showNotification('❌ ' + error.message, 'error');
                return;
            }
        } else if (!userId) {
            showNotification('Выберите клиента или создайте нового', 'error');
            return;
        }
        
        const startDateTime = new Date(`${startDateInput.value}T${startTimeInput.value}`);
        let endDateTime;
        
        if (durationSelect.value) {
            const hours = parseInt(durationSelect.value);
            endDateTime = new Date(startDateTime.getTime() + hours * 3600000);
        } else if (endDateInput.value && endTimeInput.value) {
            endDateTime = new Date(`${endDateInput.value}T${endTimeInput.value}`);
        } else {
            showNotification('Выберите длительность или время окончания', 'error');
            return;
        }
        
        if (endDateTime <= startDateTime) {
            showNotification('Время окончания должно быть позже времени начала', 'error');
            return;
        }
        
        if (startDateTime < new Date()) {
            showNotification('Нельзя забронировать время в прошлом', 'error');
            return;
        }
        
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Бронирование...';
        
        try {
            const result = await api.createBooking({
                computer_id: parseInt(computerId),
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                user_id: userId
            });
            showNotification(result.message || '✅ Бронирование создано!', 'success');
            modal.remove();
            router.handleRoute();
        } catch (error) {
            showNotification('❌ ' + error.message, 'error');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Забронировать';
        }
    };
    
    cancelBtn.onclick = () => modal.remove();
}

// Модальное окно для бронирования клиентом
async function showClientBookingModal(computerId, computerName, computerType) {
    try {
        const tariffs = await api.getTariffs();
        const availableTariffs = tariffs.filter(t => t.computer_type === computerType && !t.package_hours);
        
        const now = new Date();
        const minDateTime = new Date(now.getTime() + 30 * 60000);
        const maxDateTime = new Date(now.getTime() + 7 * 24 * 3600000);
        
        const formatDateForInput = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        const formatTimeForInput = (date) => {
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${hours}:${minutes}`;
        };
        
        const defaultStartDate = formatDateForInput(minDateTime);
        const defaultStartTime = formatTimeForInput(minDateTime);
        
        const modalHtml = `
            <div>
                <div class="form-group">
                    <label>Компьютер</label>
                    <input type="text" value="${computerName} (${computerType === 'vip' ? 'VIP' : 'Стандарт'})" disabled style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input);">
                </div>
                <div class="form-group">
                    <label>Выберите тариф</label>
                    <select id="tariffSelect" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                        <option value="">-- Выберите тариф --</option>
                        ${availableTariffs.map(t => {
                            let tariffLabel = `${t.name} - ${t.price_per_hour} ₽/час`;
                            if (t.day_type === 'weekday') tariffLabel += ' (будни)';
                            else tariffLabel += ' (выходные)';
                            if (t.time_type === 'day') tariffLabel += ' день';
                            else tariffLabel += ' ночь';
                            return `<option value="${t.id}" data-price="${t.price_per_hour}">${tariffLabel}</option>`;
                        }).join('')}
                    </select>
                    <small>Цена зависит от времени суток и дня недели</small>
                </div>
                <div class="form-group">
                    <label>Дата и время начала</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <input type="date" id="startDate" min="${defaultStartDate}" max="${formatDateForInput(maxDateTime)}" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                        <input type="time" id="startTime" step="1800" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                    </div>
                </div>
                <div class="form-group">
                    <label>Длительность</label>
                    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <button type="button" class="duration-quick-btn btn-secondary" data-hours="1">1 час</button>
                        <button type="button" class="duration-quick-btn btn-secondary" data-hours="2">2 часа</button>
                        <button type="button" class="duration-quick-btn btn-secondary" data-hours="3">3 часа</button>
                        <button type="button" class="duration-quick-btn btn-secondary" data-hours="4">4 часа</button>
                        <button type="button" class="duration-quick-btn btn-secondary" data-hours="5">5 часов</button>
                        <button type="button" class="duration-quick-btn btn-secondary" data-hours="6">6 часов</button>
                    </div>
                    <select id="duration" style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                        <option value="">-- Выберите длительность --</option>
                        <option value="1">1 час</option>
                        <option value="2">2 часа</option>
                        <option value="3">3 часа</option>
                        <option value="4">4 часа</option>
                        <option value="5">5 часов</option>
                        <option value="6">6 часов</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Или укажите время окончания</label>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                        <input type="date" id="endDate" min="${defaultStartDate}" max="${formatDateForInput(maxDateTime)}" style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                        <input type="time" id="endTimeCustom" step="1800" style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                    </div>
                </div>
                <div class="form-group" id="pricePreview" style="display: none;">
                    <label>Предварительная стоимость</label>
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--accent-light);" id="previewPrice">0 ₽</div>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                    <button type="button" id="confirmBookingBtn" class="btn btn-primary" style="flex: 1;">Забронировать</button>
                    <button type="button" id="cancelBookingBtn" class="btn btn-secondary" style="flex: 1;">Отмена</button>
                </div>
            </div>
        `;
        
        const modal = showModal(`Бронирование ${computerName}`, modalHtml);
        const tariffSelect = modal.querySelector('#tariffSelect');
        const startDateInput = modal.querySelector('#startDate');
        const startTimeInput = modal.querySelector('#startTime');
        const endDateInput = modal.querySelector('#endDate');
        const endTimeInput = modal.querySelector('#endTimeCustom');
        const durationSelect = modal.querySelector('#duration');
        const durationQuickBtns = modal.querySelectorAll('.duration-quick-btn');
        const pricePreview = modal.querySelector('#pricePreview');
        const previewPriceSpan = modal.querySelector('#previewPrice');
        const confirmBtn = modal.querySelector('#confirmBookingBtn');
        const cancelBtn = modal.querySelector('#cancelBookingBtn');
        
        startDateInput.value = defaultStartDate;
        startTimeInput.value = defaultStartTime;
        
        const updatePricePreview = () => {
            const tariffOption = tariffSelect.options[tariffSelect.selectedIndex];
            if (!tariffOption || !tariffOption.value) {
                pricePreview.style.display = 'none';
                return;
            }
            
            const pricePerHour = parseFloat(tariffOption.dataset.price);
            let hours = 0;
            
            if (durationSelect.value) {
                hours = parseInt(durationSelect.value);
            } else if (endDateInput.value && endTimeInput.value && startDateInput.value && startTimeInput.value) {
                const start = new Date(`${startDateInput.value}T${startTimeInput.value}`);
                const end = new Date(`${endDateInput.value}T${endTimeInput.value}`);
                if (end > start) {
                    hours = (end - start) / (1000 * 60 * 60);
                }
            }
            
            if (hours > 0 && pricePerHour > 0) {
                const total = Math.ceil(hours * pricePerHour);
                previewPriceSpan.textContent = `${total} ₽`;
                pricePreview.style.display = 'block';
            } else {
                pricePreview.style.display = 'none';
            }
        };
        
        tariffSelect.addEventListener('change', updatePricePreview);
        startDateInput.addEventListener('change', updatePricePreview);
        startTimeInput.addEventListener('change', updatePricePreview);
        
        durationQuickBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const hours = parseInt(btn.dataset.hours);
                durationSelect.value = hours;
                endDateInput.value = '';
                endTimeInput.value = '';
                
                const startDateTime = new Date(`${startDateInput.value}T${startTimeInput.value}`);
                const endDateTime = new Date(startDateTime.getTime() + hours * 3600000);
                endDateInput.value = endDateTime.toISOString().split('T')[0];
                endTimeInput.value = endDateTime.toTimeString().substring(0, 5);
                
                durationQuickBtns.forEach(b => b.classList.remove('btn-primary'));
                btn.classList.add('btn-primary');
                updatePricePreview();
            });
        });
        
        durationSelect.addEventListener('change', () => {
            if (durationSelect.value) {
                endDateInput.value = '';
                endTimeInput.value = '';
                durationQuickBtns.forEach(b => b.classList.remove('btn-primary'));
                updatePricePreview();
            }
        });
        
        endDateInput.addEventListener('change', () => {
            if (endDateInput.value && endTimeInput.value) {
                durationSelect.value = '';
                durationQuickBtns.forEach(b => b.classList.remove('btn-primary'));
                updatePricePreview();
            }
        });
        
        endTimeInput.addEventListener('change', () => {
            if (endDateInput.value && endTimeInput.value) {
                durationSelect.value = '';
                durationQuickBtns.forEach(b => b.classList.remove('btn-primary'));
                updatePricePreview();
            }
        });
        
        confirmBtn.onclick = async () => {
            const tariffId = tariffSelect.value;
            if (!tariffId) {
                showNotification('Выберите тариф', 'error');
                return;
            }
            
            const startDateTime = new Date(`${startDateInput.value}T${startTimeInput.value}`);
            let endDateTime;
            
            if (durationSelect.value) {
                const hours = parseInt(durationSelect.value);
                endDateTime = new Date(startDateTime.getTime() + hours * 3600000);
            } else if (endDateInput.value && endTimeInput.value) {
                endDateTime = new Date(`${endDateInput.value}T${endTimeInput.value}`);
            } else {
                showNotification('Выберите длительность или время окончания', 'error');
                return;
            }
            
            if (endDateTime <= startDateTime) {
                showNotification('Время окончания должно быть позже времени начала', 'error');
                return;
            }
            
            if (startDateTime < new Date()) {
                showNotification('Нельзя забронировать время в прошлом', 'error');
                return;
            }
            
            const maxDuration = 24 * 60 * 60 * 1000;
            if (endDateTime - startDateTime > maxDuration) {
                showNotification('Максимальное время бронирования - 24 часа', 'error');
                return;
            }
            
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Бронирование...';
            
            try {
                const result = await api.createBooking({
                    computer_id: parseInt(computerId),
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    tariff_id: parseInt(tariffId)
                });
                
                showNotification(result.message || `Компьютер ${computerName} успешно забронирован!`, 'success');
                modal.remove();
                router.handleRoute();
            } catch (error) {
                showNotification('❌ ' + error.message, 'error');
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Забронировать';
            }
        };
        
        cancelBtn.onclick = () => modal.remove();
        
    } catch (error) {
        console.error('Show booking modal error:', error);
        showNotification('Ошибка загрузки тарифов: ' + error.message, 'error');
    }
}

// Получение активного сеанса клиента
async function getClientActiveSession() {
    try {
        const sessions = await api.getActiveSessions();
        const userId = auth.getUserId();
        const userSession = sessions.find(s => s.user_id === userId);
        
        if (userSession) {
            const user = auth.currentUser;
            return {
                ...userSession,
                balance: user.balance
            };
        }
        return null;
    } catch (error) {
        console.error('Get active session error:', error);
        return null;
    }
}

// Страница покупки товаров для клиента
async function renderClientProducts(container) {
    try {
        const products = await api.getProducts();
        const activeSession = await getClientActiveSession();
        
        let html = `<h1>Магазин товаров</h1>`;
        
        if (!activeSession) {
            html += `
                <div class="card" style="text-align: center; padding: 3rem;">
                    <h3>Нет активного сеанса</h3>
                    <p>Чтобы покупать товары, сначала начните сеанс у администратора.</p>
                </div>
            `;
            container.innerHTML = html;
            return;
        }
        
        html += `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h3>Ваш активный сеанс</h3>
                    <span class="badge status-active">Активен</span>
                </div>
                <p><strong>Компьютер:</strong> ${escapeHtml(activeSession.computer_name)}</p>
                <p><strong>Начало:</strong> ${formatDateTime(activeSession.start_time)}</p>
                <p><strong>Баланс:</strong> <span style="color: var(--success);">${Math.floor(activeSession.balance)} ₽</span></p>
            </div>
            <div class="products-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
        `;
        
        products.forEach(product => {
            const isInStock = product.stock > 0;
            html += `
                <div class="product-card" data-product-id="${product.id}" data-product-name="${escapeHtml(product.name)}" data-product-price="${product.price}" data-product-stock="${product.stock}">
                    <div class="product-name">${escapeHtml(product.name)}</div>
                    <div class="product-price">${formatPrice(product.price)}</div>
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin: 0.5rem 0; padding: 0.5rem; background: ${isInStock ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)'}; border-radius: 12px;">
                        <span style="color: ${isInStock ? 'var(--success)' : 'var(--danger)'};">${isInStock ? '●' : '○'}</span>
                        <span>${isInStock ? 'В наличии' : 'Нет в наличии'}</span>
                        <span>Остаток: ${product.stock} шт.</span>
                    </div>
                    <button class="btn btn-primary buy-product-btn" data-product-id="${product.id}" ${!isInStock ? 'disabled' : ''}>Купить</button>
                </div>
            `;
        });
        
        html += `</div>`;
        container.innerHTML = html;
        
        document.querySelectorAll('.buy-product-btn').forEach(btn => {
            btn.onclick = async () => {
                const card = btn.closest('.product-card');
                const productId = parseInt(card.dataset.productId);
                const productName = card.dataset.productName;
                const price = parseFloat(card.dataset.productPrice);
                const stock = parseInt(card.dataset.productStock);
                
                if (stock <= 0) {
                    showNotification('Товар закончился на складе', 'error');
                    return;
                }
                
                const quantityHtml = `
                    <div>
                        <div class="form-group">
                            <label>Количество</label>
                            <input type="number" id="quantity" min="1" max="${stock}" value="1" required>
                            <small>Доступно: ${stock} шт.</small>
                        </div>
                        <div class="form-group">
                            <label>Итого</label>
                            <input type="text" id="totalPrice" value="${formatPrice(price)}" disabled>
                        </div>
                        <div style="display: flex; gap: 1rem;">
                            <button type="button" id="confirmBuyBtn" class="btn btn-primary">Подтвердить</button>
                            <button type="button" id="cancelBuyBtn" class="btn btn-secondary">Отмена</button>
                        </div>
                    </div>
                `;
                
                const modal = showModal('Покупка товара', quantityHtml);
                const quantityInput = modal.querySelector('#quantity');
                const totalPriceInput = modal.querySelector('#totalPrice');
                const confirmBtn = modal.querySelector('#confirmBuyBtn');
                const cancelBtn = modal.querySelector('#cancelBuyBtn');
                
                quantityInput.addEventListener('input', () => {
                    const total = price * (parseInt(quantityInput.value) || 0);
                    totalPriceInput.value = formatPrice(total);
                });
                
                confirmBtn.onclick = async () => {
                    const quantity = parseInt(quantityInput.value);
                    if (quantity < 1 || quantity > stock) {
                        showNotification(`Введите количество от 1 до ${stock}`, 'error');
                        return;
                    }
                    
                    confirmBtn.disabled = true;
                    confirmBtn.textContent = 'Покупка...';
                    
                    try {
                        await api.sellProduct({
                            session_id: activeSession.id,
                            product_id: productId,
                            quantity: quantity
                        });
                        showNotification(`✅ Куплено ${quantity} x ${productName}`, 'success');
                        modal.remove();
                        router.handleRoute();
                    } catch (error) {
                        showNotification('❌ ' + error.message, 'error');
                        confirmBtn.disabled = false;
                        confirmBtn.textContent = 'Подтвердить';
                    }
                };
                
                cancelBtn.onclick = () => modal.remove();
            };
        });
        
    } catch (error) {
        console.error('Render client products error:', error);
        container.innerHTML = `<div class="card error">Ошибка: ${error.message}</div>`;
    }
}

// Страница личного кабинета
async function renderProfile(container) {
    try {
        const user = auth.currentUser;
        if (!user) {
            container.innerHTML = '<div class="card error">Ошибка: пользователь не авторизован</div>';
            return;
        }
        
        const bookings = await api.getUserBookings();
        
        let bookingsHtml = '<h3>Мои бронирования</h3>';
        
        if (!bookings || bookings.length === 0) {
            bookingsHtml += '<p style="color: var(--text-muted);">Нет активных бронирований</p>';
        } else {
            bookingsHtml += `<div class="bookings-list" style="display: flex; flex-direction: column; gap: 0.75rem;">`;
            
            bookings.forEach(booking => {
                const statusText = booking.status === 'active' ? 'Активно' : 
                                  booking.status === 'cancelled' ? 'Отменено' : 'Истекло';
                const statusColor = booking.status === 'active' ? 'var(--success)' : 
                                   booking.status === 'cancelled' ? 'var(--danger)' : 'var(--text-muted)';
                
                // Правильное форматирование даты и времени в локальный формат
                const startDate = new Date(booking.start_time);
                const endDate = new Date(booking.end_time);
                
                const formatDateTime = (date) => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    return `${day}.${month}.${year} ${hours}:${minutes}`;
                };
                
                const startFormatted = formatDateTime(startDate);
                const endFormatted = formatDateTime(endDate);
                
                bookingsHtml += `
                    <div style="background: var(--bg-input); border-radius: 16px; padding: 1rem; border-left: 4px solid ${statusColor};">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 0.5rem;">
                            <div>
                                <strong style="font-size: 1rem;">${escapeHtml(booking.computer_name)}</strong>
                                <div style="font-size: 0.8rem; color: var(--text-muted);">Зал: ${escapeHtml(booking.hall_name)}</div>
                            </div>
                            <span class="badge" style="background: ${statusColor}20; color: ${statusColor}; padding: 0.25rem 0.75rem; border-radius: 20px;">
                                ${statusText}
                            </span>
                        </div>
                        <div style="margin-top: 0.75rem; display: flex; flex-wrap: wrap; gap: 1rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span>📅</span>
                                <span><strong>Начало:</strong> ${startFormatted}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span>⏰</span>
                                <span><strong>Окончание:</strong> ${endFormatted}</span>
                            </div>
                        </div>
                        ${booking.status === 'active' ? `
                        <div style="margin-top: 0.75rem;">
                            <button onclick="cancelBooking('${booking.id}')" class="btn-danger" style="padding: 0.4rem 1rem; border-radius: 8px; font-size: 0.8rem;">Отменить бронирование</button>
                        </div>
                        ` : ''}
                    </div>
                `;
            });
            
            bookingsHtml += `</div>`;
        }
        
        const roundedBalance = Math.floor(parseFloat(user.balance) || 0);
        const displayEmail = user.email && user.email !== '' && user.email !== null ? escapeHtml(user.email) : 'Не указан';
        
        container.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto;">
                <div class="card">
                    <h2>Личный кабинет</h2>
                    <div class="profile-info">
                        <div class="info-row"><span class="info-label">ФИО:</span><span>${escapeHtml(user.full_name)}</span></div>
                        <div class="info-row" style="display: flex; justify-content: space-between; align-items: center;">
                            <span class="info-label">Email:</span>
                            <span id="emailValue">${displayEmail}</span>
                            <button id="editEmailBtn" class="btn-secondary" style="padding: 0.25rem 0.75rem; border-radius: 8px;">Изменить</button>
                        </div>
                        <div class="info-row"><span class="info-label">Телефон:</span><span>${user.phone || 'Не указан'}</span></div>
                        <div class="info-row"><span class="info-label">Баланс:</span><span class="balance">${roundedBalance} ₽</span></div>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button id="depositBtn" class="btn btn-primary">Пополнить баланс</button>
                        <button id="changePasswordBtn" class="btn btn-secondary">Сменить пароль</button>
                    </div>
                </div>
                <div class="card">${bookingsHtml}</div>
            </div>
        `;
        
        // Редактирование email
        document.getElementById('editEmailBtn')?.addEventListener('click', () => {
            const currentEmail = user.email || '';
            const modal = showModal('Изменение Email', `
                <div>
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="newEmail" value="${escapeHtml(currentEmail)}" placeholder="example@mail.com" style="width: 100%; padding: 0.75rem; border-radius: 12px;">
                        <small>Если оставить пустым, email будет удален</small>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button id="saveEmailBtn" class="btn btn-primary">Сохранить</button>
                        <button id="cancelEmailBtn" class="btn btn-secondary">Отмена</button>
                    </div>
                </div>
            `);
            
            modal.querySelector('#saveEmailBtn').onclick = async () => {
                const newEmail = modal.querySelector('#newEmail').value.trim() || null;
                try {
                    await api.request(`/users/${user.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({ email: newEmail })
                    });
                    showNotification('✅ Email обновлен!', 'success');
                    modal.remove();
                    router.handleRoute();
                } catch (error) {
                    showNotification('❌ ' + error.message, 'error');
                }
            };
            modal.querySelector('#cancelEmailBtn').onclick = () => modal.remove();
        });
        
        // Смена пароля
        document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
            const modal = showModal('Смена пароля', `
                <div>
                    <div class="form-group">
                        <label>Текущий пароль</label>
                        <input type="password" id="currentPassword" placeholder="Введите текущий пароль" style="width: 100%; padding: 0.75rem; border-radius: 12px;">
                    </div>
                    <div class="form-group">
                        <label>Новый пароль (мин. 6 символов)</label>
                        <input type="password" id="newPassword" placeholder="Введите новый пароль" style="width: 100%; padding: 0.75rem; border-radius: 12px;">
                    </div>
                    <div class="form-group">
                        <label>Подтвердите пароль</label>
                        <input type="password" id="confirmPassword" placeholder="Подтвердите новый пароль" style="width: 100%; padding: 0.75rem; border-radius: 12px;">
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button id="savePasswordBtn" class="btn btn-primary">Сменить пароль</button>
                        <button id="cancelPasswordBtn" class="btn btn-secondary">Отмена</button>
                    </div>
                </div>
            `);
            
            modal.querySelector('#savePasswordBtn').onclick = async () => {
                const currentPassword = modal.querySelector('#currentPassword').value;
                const newPassword = modal.querySelector('#newPassword').value;
                const confirmPassword = modal.querySelector('#confirmPassword').value;
                
                if (!currentPassword || !newPassword || !confirmPassword) {
                    showNotification('Заполните все поля', 'error');
                    return;
                }
                if (newPassword.length < 6) {
                    showNotification('Пароль должен быть не менее 6 символов', 'error');
                    return;
                }
                if (newPassword !== confirmPassword) {
                    showNotification('Пароли не совпадают', 'error');
                    return;
                }
                
                try {
                    await api.request(`/users/${user.id}/password`, {
                        method: 'PUT',
                        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
                    });
                    showNotification('✅ Пароль изменен! Войдите заново.', 'success');
                    modal.remove();
                    setTimeout(() => auth.logout(), 1500);
                } catch (error) {
                    showNotification('❌ ' + error.message, 'error');
                }
            };
            modal.querySelector('#cancelPasswordBtn').onclick = () => modal.remove();
        });
        
        // Пополнение баланса через игру
        document.getElementById('depositBtn')?.addEventListener('click', () => {
            const modal = showModal('Пополнение баланса', `
                <div>
                    <div class="form-group">
                        <label>Сумма пополнения (₽)</label>
                        <input type="number" id="depositAmount" min="1" max="10000" value="100" style="width: 100%; padding: 0.75rem; border-radius: 12px;">
                        <small>Сумма от 1 до 10 000 ₽</small>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                        <button id="playGameBtn" class="btn btn-primary">Играть</button>
                        <button id="cancelGameBtn" class="btn btn-secondary">Отмена</button>
                    </div>
                </div>
            `);
            
            modal.querySelector('#playGameBtn').onclick = () => {
                const amount = parseInt(modal.querySelector('#depositAmount').value);
                if (isNaN(amount) || amount <= 0 || amount > 10000) {
                    showNotification('Введите сумму от 1 до 10000', 'error');
                    return;
                }
                modal.remove();
                
                const gameModal = showModal('Крестики-нолики', '<div id="ticTacToeGame" style="min-width: 300px;"></div>');
                renderTicTacToe(gameModal.querySelector('#ticTacToeGame'), amount, async (prize) => {
                    if (prize > 0) {
                        try {
                            await api.updateUserBalance(user.id, prize);
                            showNotification(`Вы выиграли ${prize} ₽!`, 'success');
                            gameModal.remove();
                            router.handleRoute();
                        } catch (error) {
                            showNotification('Ошибка: ' + error.message, 'error');
                        }
                    } else {
                        showNotification('Вы проиграли! Попробуйте еще раз', 'error');
                        setTimeout(() => gameModal.remove(), 1500);
                    }
                });
            };
            modal.querySelector('#cancelGameBtn').onclick = () => modal.remove();
        });
        
    } catch (error) {
        console.error('Render profile error:', error);
        container.innerHTML = `<div class="card error">Ошибка: ${error.message}</div>`;
    }
}

// Отмена бронирования
window.cancelBooking = async (id) => {
    try {
        await api.cancelBooking(id);
        showNotification('✅ Бронирование отменено', 'success');
        router.handleRoute();
    } catch (error) {
        showNotification('❌ ' + error.message, 'error');
    }
};