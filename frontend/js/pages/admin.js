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

// Страница активных сеансов - КРАСИВЫЙ ДИЗАЙН
async function renderActiveSessions(container) {
    try {
        const sessions = await api.getActiveSessions();
        
        if (sessions.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">💻</div>
                    <h3>Нет активных сеансов</h3>
                    <p>Активные сеансы будут отображаться здесь</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <h1>Активные сеансы</h1>
            <div class="sessions-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1.5rem;">
        `;
        
        for (const session of sessions) {
            const startTime = new Date(session.start_time);
            const duration = Math.floor((Date.now() - startTime) / 60000);
            const hours = Math.floor(duration / 60);
            const minutes = duration % 60;
            
            html += `
                <div class="card session-card" style="position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--accent), var(--accent-light));"></div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                        <div>
                            <div style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">${escapeHtml(session.user_name)}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">Клиент</div>
                        </div>
                        <div style="background: var(--bg-input); padding: 0.25rem 0.75rem; border-radius: 20px;">
                            <span style="color: var(--danger);">●</span> Активен
                        </div>
                    </div>
                    <div style="margin: 1rem 0;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <span style="font-size: 1.2rem;">🖥️</span>
                            <span style="font-weight: 600;">${escapeHtml(session.computer_name)}</span>
                            <span class="badge" style="background: var(--bg-input);">${session.computer_type === 'vip' ? 'VIP' : 'Стандарт'}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <span style="font-size: 1.2rem;">⏰</span>
                            <span>Начало: ${formatDateTime(session.start_time)}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 1.2rem;">⌛</span>
                            <span>Длительность: ${hours}ч ${minutes}м</span>
                        </div>
                    </div>
                    <button onclick="endSessionById('${session.id}', ${session.computer_id})" class="btn btn-danger" style="width: 100%; margin-top: 0.5rem;">
                        Завершить сеанс
                    </button>
                </div>
            `;
        }
        
        html += `
            </div>
        `;
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Render active sessions error:', error);
        container.innerHTML = `<div class="card error">Ошибка: ${error.message}</div>`;
    }
}

// Завершение сеанса по ID
window.endSessionById = async (sessionId, computerId) => {
    const paymentHtml = `
        <form id="paymentForm">
            <div class="form-group">
                <label>Способ оплаты</label>
                <select id="paymentMethod" required style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border);">
                    <option value="cash">💵 Наличные</option>
                    <option value="card">💳 Карта</option>
                    <option value="balance">💰 С баланса</option>
                </select>
            </div>
            <button type="submit" class="btn btn-primary" style="width: 100%;">Завершить и оплатить</button>
        </form>
    `;
    
    const modal = showModal('Завершение сеанса', paymentHtml);
    const form = modal.querySelector('#paymentForm');
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        const paymentMethod = form.querySelector('#paymentMethod').value;
        
        try {
            await api.endSession({
                session_id: sessionId,
                payment_method: paymentMethod
            });
            showNotification('✅ Сеанс завершен!', 'success');
            modal.remove();
            router.handleRoute();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    };
};

// Страница товаров
async function renderProducts(container) {
    try {
        const products = await api.getProducts();
        const sessions = await api.getActiveSessions();
        
        if (sessions.length === 0) {
            container.innerHTML = `
                <h1>Продажа товаров</h1>
                <div class="card" style="text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🛒</div>
                    <h3>Нет активных сеансов</h3>
                    <p>Сначала начните сеанс для клиента</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <h1>Продажа товаров</h1>
            <div class="card">
                <h3>Выберите активный сеанс</h3>
                <div class="form-group">
                    <select id="sessionSelect" style="width: 100%; padding: 0.75rem 1rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border); font-size: 1rem;">
                        <option value="">-- Выберите сеанс --</option>
                        ${sessions.map(s => `<option value="${s.id}">${escapeHtml(s.user_name)} - ${escapeHtml(s.computer_name)} (${formatDateTime(s.start_time)})</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="products-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.5rem;">
        `;
        
        products.forEach(product => {
            const isInStock = product.stock > 0;
            const stockClass = isInStock ? 'in-stock' : 'out-of-stock';
            const stockText = isInStock ? 'В наличии' : 'Нет в наличии';
            
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
                        <span class="stock-badge ${stockClass}" style="color: ${isInStock ? 'var(--success)' : 'var(--danger)'};">${isInStock ? '●' : '○'}</span>
                        <span>${stockText}</span>
                        <span style="margin-left: auto;">Остаток: ${product.stock} шт.</span>
                    </div>
                    <button class="btn btn-primary sell-btn" style="width: 100%; margin-top: 0.5rem;">💳 Продать</button>
                </div>
            `;
        });
        
        html += `
            </div>
        `;
        
        container.innerHTML = html;
        
        const sessionSelect = document.getElementById('sessionSelect');
        
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
                    <form id="quantityForm">
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
                        <button type="submit" class="btn btn-primary" style="width: 100%;">Подтвердить продажу</button>
                    </form>
                `;
                
                const modal = showModal('Продажа товара', quantityHtml);
                const form = modal.querySelector('#quantityForm');
                const quantityInput = form.querySelector('#quantity');
                const totalPriceInput = form.querySelector('#totalPrice');
                
                quantityInput.addEventListener('input', () => {
                    const qty = parseInt(quantityInput.value) || 0;
                    const total = price * qty;
                    totalPriceInput.value = formatPrice(total);
                });
                
                form.onsubmit = async (e) => {
                    e.preventDefault();
                    const quantity = parseInt(quantityInput.value);
                    
                    if (quantity < 1 || quantity > stock) {
                        showNotification(`Введите количество от 1 до ${stock}`, 'error');
                        return;
                    }
                    
                    const submitBtn = form.querySelector('button[type="submit"]');
                    const originalText = submitBtn.textContent;
                    submitBtn.textContent = 'Продажа...';
                    submitBtn.disabled = true;
                    
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
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                    }
                };
            };
        });
        
    } catch (error) {
        console.error('Render products error:', error);
        container.innerHTML = `<div class="card error">Ошибка загрузки: ${error.message}</div>`;
    }
}

// Страница клиентов - КРАСИВЫЙ ДИЗАЙН
async function renderClients(container) {
    try {
        console.log('Загрузка списка клиентов...');
        
        let html = `
            <h1>Клиенты</h1>
            <div class="card">
                <div class="form-group">
                    <label>🔍 Поиск по номеру телефона (последние 4 цифры) или имени</label>
                    <input type="text" id="searchInput" placeholder="Введите номер телефона или имя..." style="width: 100%; padding: 0.75rem 1rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border); font-size: 1rem;">
                    <small style="color: var(--text-muted);">Введите последние 4 цифры номера телефона или часть имени</small>
                </div>
            </div>
            <div id="clientsTableContainer">
                <div class="loading" style="text-align: center; padding: 3rem;">Загрузка...</div>
            </div>
        `;
        
        container.innerHTML = html;
        
        const searchInput = document.getElementById('searchInput');
        const clientsContainer = document.getElementById('clientsTableContainer');
        
        const loadClients = async (searchTerm = '') => {
            try {
                let url = '/users';
                if (searchTerm && searchTerm.trim()) {
                    url += `?search=${encodeURIComponent(searchTerm.trim())}`;
                }
                const users = await api.request(url);
                const clients = users.filter(u => u.role === 'client');
                
                if (clients.length === 0) {
                    clientsContainer.innerHTML = `
                        <div class="card" style="text-align: center; padding: 3rem;">
                            <div style="font-size: 4rem; margin-bottom: 1rem;">👥</div>
                            <h3>Клиенты не найдены</h3>
                            <p>Попробуйте изменить поисковый запрос</p>
                        </div>
                    `;
                    return;
                }
                
                let tableHtml = `
                    <div class="clients-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1.5rem;">
                `;
                
                clients.forEach(client => {
                    const balanceFormatted = Math.floor(parseFloat(client.balance));
                    const phone = client.phone || '-';
                    const displayPhone = phone !== '-' ? phone.replace(/(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})/, '+$1 ($2) $3-$4-$5') : '-';
                    const registerDate = new Date(client.created_at).toLocaleDateString('ru-RU');
                    
                    tableHtml += `
                        <div class="card client-card" style="position: relative; overflow: hidden;">
                            <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, var(--accent), var(--accent-light));"></div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                                <div>
                                    <div style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">${escapeHtml(client.full_name)}</div>
                                    <div style="font-size: 0.8rem; color: var(--text-muted);">Клиент</div>
                                </div>
                                <div class="client-balance" data-client-id="${client.id}" style="background: var(--bg-input); padding: 0.25rem 0.75rem; border-radius: 20px; font-weight: 600;">
                                    ${balanceFormatted} ₽
                                </div>
                            </div>
                            <div style="margin: 1rem 0;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <span style="font-size: 1.2rem;">📞</span>
                                    <span><strong>${escapeHtml(displayPhone)}</strong></span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                                    <span style="font-size: 1.2rem;">✉️</span>
                                    <span>${escapeHtml(client.email)}</span>
                                </div>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <span style="font-size: 1.2rem;">📅</span>
                                    <span>Регистрация: ${registerDate}</span>
                                </div>
                            </div>
                            <button onclick="showTopUpModal('${client.id}', '${escapeHtml(client.full_name)}')" class="btn btn-primary" style="width: 100%;">
                                💰 Пополнить баланс
                            </button>
                        </div>
                    `;
                });
                
                tableHtml += `
                    </div>
                `;
                
                clientsContainer.innerHTML = tableHtml;
                console.log('Страница клиентов отображена');
                
            } catch (error) {
                console.error('Load clients error:', error);
                clientsContainer.innerHTML = `<div class="card error">Ошибка загрузки: ${error.message}</div>`;
            }
        };
        
        await loadClients();
        
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadClients(searchInput.value);
            }, 300);
        });
        
    } catch (error) {
        console.error('Render clients error:', error);
        container.innerHTML = `<div class="card error">Ошибка загрузки клиентов: ${error.message}</div>`;
    }
}

// Пополнение баланса клиента
window.showTopUpModal = (userId, userName) => {
    const modalHtml = `
        <div style="padding: 1rem;">
            <h3 style="margin-bottom: 1rem; color: var(--accent-light);">💰 Пополнение баланса</h3>
            <p>Клиент: <strong>${userName}</strong></p>
            <div style="margin: 1rem 0;">
                <label style="display: block; margin-bottom: 0.5rem;">Сумма (₽):</label>
                <input type="number" id="topup-amount" min="1" max="10000" value="100" 
                       style="width: 100%; padding: 0.75rem; border-radius: 12px; background: var(--bg-input); border: 1px solid var(--border); font-size: 1rem;">
                <small style="color: var(--text-muted);">Минимальная сумма: 1 ₽, максимальная: 10 000 ₽</small>
            </div>
            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
                <button id="topup-confirm" class="btn btn-primary" style="flex: 1;">💳 Пополнить</button>
                <button id="topup-cancel" class="btn btn-secondary" style="flex: 1;">Отмена</button>
            </div>
        </div>
    `;
    
    const modal = showModal('Пополнение баланса', modalHtml);
    
    const confirmBtn = modal.querySelector('#topup-confirm');
    const cancelBtn = modal.querySelector('#topup-cancel');
    const amountInput = modal.querySelector('#topup-amount');
    
    confirmBtn.onclick = async () => {
        const amount = parseInt(amountInput.value);
        
        if (isNaN(amount) || amount <= 0) {
            showNotification('Введите корректную сумму (от 1 ₽)', 'error');
            return;
        }
        
        if (amount > 10000) {
            showNotification('Максимальная сумма - 10 000 ₽', 'error');
            return;
        }
        
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Пополнение...';
        
        try {
            const result = await api.updateUserBalance(userId, amount);
            showNotification(`✅ Баланс клиента ${userName} пополнен на ${amount} ₽`, 'success');
            modal.remove();
            
            const balanceElement = document.querySelector(`.client-balance[data-client-id="${userId}"]`);
            if (balanceElement) {
                const newBalance = Math.floor(parseFloat(result.balance));
                balanceElement.textContent = `${newBalance} ₽`;
            } else {
                setTimeout(() => router.handleRoute(), 500);
            }
        } catch (error) {
            console.error('Ошибка пополнения:', error);
            showNotification('❌ ' + error.message, 'error');
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Пополнить';
        }
    };
    
    cancelBtn.onclick = () => modal.remove();
};

// Страница всех активных бронирований - КРАСИВЫЙ ДИЗАЙН
async function renderAllBookings(container) {
    try {
        const bookings = await api.getAllActiveBookings();
        
        if (bookings.length === 0) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 3rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">📅</div>
                    <h3>Нет активных бронирований</h3>
                    <p>Активные бронирования будут отображаться здесь</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <h1>Активные бронирования</h1>
            <div class="bookings-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 1.5rem;">
        `;
        
        for (const booking of bookings) {
            const startTime = new Date(booking.start_time);
            const endTime = new Date(booking.end_time);
            const now = new Date();
            
            let statusBadge = '';
            let statusColor = '';
            let actions = '';
            
            if (booking.status === 'active') {
                if (startTime > now) {
                    statusBadge = 'Активно';
                    statusColor = 'var(--success)';
                    actions = `<button onclick="cancelBookingByAdmin('${booking.id}', ${booking.computer_id})" class="btn btn-danger" style="width: 100%; margin-top: 0.5rem;">❌ Отменить бронирование</button>`;
                } else if (startTime <= now && endTime > now) {
                    statusBadge = 'В процессе';
                    statusColor = 'var(--warning)';
                    actions = `<button onclick="startSessionFromBooking(${booking.computer_id}, '${booking.user_id}')" class="btn btn-success" style="width: 100%; margin-top: 0.5rem;">▶ Начать сеанс</button>`;
                } else {
                    statusBadge = 'Истекло';
                    statusColor = 'var(--text-muted)';
                }
            } else if (booking.status === 'cancelled') {
                statusBadge = 'Отменено';
                statusColor = 'var(--danger)';
            } else {
                statusBadge = 'Истекло';
                statusColor = 'var(--text-muted)';
            }
            
            const phone = booking.user_phone || '-';
            const displayPhone = phone !== '-' ? phone.replace(/(\d{1})(\d{3})(\d{3})(\d{2})(\d{2})/, '+$1 ($2) $3-$4-$5') : '-';
            
            html += `
                <div class="card booking-card" style="position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, ${statusColor}, ${statusColor}80);"></div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                        <div>
                            <div style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">${escapeHtml(booking.user_name)}</div>
                            <div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(displayPhone)}</div>
                        </div>
                        <div style="background: ${statusColor}20; padding: 0.25rem 0.75rem; border-radius: 20px;">
                            <span style="color: ${statusColor};">●</span> ${statusBadge}
                        </div>
                    </div>
                    <div style="margin: 1rem 0;">
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <span style="font-size: 1.2rem;">🖥️</span>
                            <span><strong>${escapeHtml(booking.computer_name)}</strong></span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                            <span style="font-size: 1.2rem;">📅</span>
                            <span>${formatDateTime(booking.start_time)} - ${formatDateTime(booking.end_time)}</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <span style="font-size: 1.2rem;">⏱️</span>
                            <span>Длительность: ${Math.round((endTime - startTime) / (1000 * 60))} минут</span>
                        </div>
                    </div>
                    ${actions}
                </div>
            `;
        }
        
        html += `
            </div>
        `;
        
        container.innerHTML = html;
    } catch (error) {
        console.error('Render all bookings error:', error);
        container.innerHTML = `<div class="card error">Ошибка: ${error.message}</div>`;
    }
}

// Отмена бронирования администратором
window.cancelBookingByAdmin = async (bookingId, computerId) => {
    if (!confirm('Вы уверены, что хотите отменить это бронирование?')) {
        return;
    }
    
    try {
        await api.cancelBooking(bookingId);
        showNotification('✅ Бронирование успешно отменено', 'success');
        router.handleRoute();
    } catch (error) {
        showNotification('❌ ' + error.message, 'error');
    }
};

// Начало сеанса из бронирования
window.startSessionFromBooking = async (computerId, userId) => {
    try {
        await api.startSession({
            user_id: userId,
            computer_id: computerId
        });
        showNotification('✅ Сеанс успешно начат!', 'success');
        router.handleRoute();
    } catch (error) {
        showNotification('❌ ' + error.message, 'error');
    }
};