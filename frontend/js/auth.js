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

class AuthManager {
    constructor() {
        this.currentUser = null;
    }
    
    async init() {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                this.currentUser = await api.getMe();
                console.log('Auth init - user loaded:', this.currentUser);
                return true;
            } catch (error) {
                console.error('Auth init error:', error);
                this.logout();
                return false;
            }
        }
        return false;
    }
    
    async login(login, password) {
        try {
            const { user, token } = await api.login({ login, password });
            api.setToken(token);
            this.currentUser = user;
            console.log('Login success:', user);
            return { success: true, user };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    }
    
    async register(userData) {
        try {
            const { user, token } = await api.register(userData);
            api.setToken(token);
            this.currentUser = user;
            console.log('Register success:', user);
            return { success: true, user };
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, error: error.message };
        }
    }
    
    logout() {
        api.setToken(null);
        this.currentUser = null;
        window.location.hash = '#/login';
        this.updateUI();
    }
    
    isAuthenticated() {
        return !!this.currentUser;
    }
    
    getRole() {
        return this.currentUser?.role;
    }
    
    getUserId() {
        return this.currentUser?.id;
    }
    
    updateUI() {
        const navLinks = document.getElementById('navLinks');
        const userMenu = document.getElementById('userMenu');
        const logo = document.querySelector('.logo');
        
        if (!navLinks || !userMenu) {
            console.error('Navigation elements not found');
            return;
        }
        
        if (logo) {
            logo.style.cursor = 'pointer';
            logo.onclick = () => {
                window.location.hash = '#/dashboard';
            };
        }
        
        if (this.currentUser) {
            userMenu.innerHTML = `
                <span class="user-name">${escapeHtml(this.currentUser.full_name)}</span>
                <button class="logout-btn" onclick="auth.logout()">Выйти</button>
            `;
            
            let links = '';
            switch (this.currentUser.role) {
                case 'client':
                    links = `
                        <a href="#/dashboard">Схема залов</a>
                        <a href="#/client-products">Магазин</a>
                        <a href="#/profile">Личный кабинет</a>
                    `;
                    break;
                case 'admin':
                    links = `
                        <a href="#/dashboard">Схема залов</a>
                        <a href="#/active-sessions">Активные сеансы</a>
                        <a href="#/bookings">Бронирования</a>
                        <a href="#/products">Продажа товаров</a>
                        <a href="#/clients">Клиенты</a>
                    `;
                    break;
                case 'owner':
                    links = `
                        <a href="#/dashboard">Схема залов</a>
                        <a href="#/active-sessions">Активные сеансы</a>
                        <a href="#/bookings">Бронирования</a>
                        <a href="#/products">Продажа товаров</a>
                        <a href="#/clients">Клиенты</a>
                        <a href="#/reports">Отчеты</a>
                        <a href="#/tariffs">Тарифы</a>
                    `;
                    break;
                default:
                    links = `
                        <a href="#/dashboard">Схема залов</a>
                    `;
            }
            navLinks.innerHTML = links;
        } else {
            userMenu.innerHTML = `
                <a href="#/login" class="btn btn-secondary">Вход</a>
                <a href="#/register" class="btn btn-primary">Регистрация</a>
            `;
            navLinks.innerHTML = '';
        }
    }
}

const auth = new AuthManager();