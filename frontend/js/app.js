async function initApp() {
    const isAuth = await auth.init();
    console.log('App init - isAuth:', isAuth, 'user:', auth.currentUser);
    
    auth.updateUI();
    
    router.register('/', async (container) => {
        if (!auth.isAuthenticated()) {
            router.navigate('/login');
            return;
        }
        await renderDashboard(container);
    });
    
    router.register('/dashboard', async (container) => {
        if (!auth.isAuthenticated()) {
            router.navigate('/login');
            return;
        }
        await renderDashboard(container);
    });
    
    router.register('/profile', async (container) => {
        if (!auth.isAuthenticated()) {
            router.navigate('/login');
            return;
        }
        await renderProfile(container);
    });
    
    router.register('/client-products', async (container) => {
        if (!auth.isAuthenticated()) {
            router.navigate('/login');
            return;
        }
        if (auth.getRole() !== 'client') {
            router.navigate('/');
            return;
        }
        await renderClientProducts(container);
    });
    
    router.register('/active-sessions', async (container) => {
        if (!auth.isAuthenticated()) {
            router.navigate('/login');
            return;
        }
        if (auth.getRole() === 'client') {
            router.navigate('/');
            return;
        }
        await renderActiveSessions(container);
    });
    
    router.register('/products', async (container) => {
        if (!auth.isAuthenticated()) {
            router.navigate('/login');
            return;
        }
        if (auth.getRole() === 'client') {
            router.navigate('/');
            return;
        }
        await renderProducts(container);
    });
    
    router.register('/clients', async (container) => {
        if (!auth.isAuthenticated()) {
            router.navigate('/login');
            return;
        }
        if (auth.getRole() === 'client') {
            router.navigate('/');
            return;
        }
        await renderClients(container);
    });
    
    router.register('/bookings', async (container) => {
        if (!auth.isAuthenticated()) {
            router.navigate('/login');
            return;
        }
        if (auth.getRole() !== 'admin' && auth.getRole() !== 'owner') {
            router.navigate('/');
            return;
        }
        await renderAllBookings(container);
    });
    
    router.register('/reports', async (container) => {
        if (!auth.isAuthenticated()) {
            router.navigate('/login');
            return;
        }
        if (auth.getRole() !== 'owner') {
            router.navigate('/');
            return;
        }
        await renderReports(container);
    });
    
    router.register('/tariffs', async (container) => {
        if (!auth.isAuthenticated()) {
            router.navigate('/login');
            return;
        }
        if (auth.getRole() !== 'owner') {
            router.navigate('/');
            return;
        }
        await renderTariffs(container);
    });
    
    router.register('/login', async (container) => {
        if (auth.isAuthenticated()) {
            router.navigate('/');
            return;
        }
        
        container.innerHTML = `
            <div class="card" style="max-width: 400px; margin: 2rem auto;">
                <h2>Вход в систему</h2>
                <form id="loginForm">
                    <div class="form-group">
                        <label>Телефон или Email</label>
                        <input type="text" id="login" placeholder="+7 (999) 123-45-67 или email@example.com" required>
                    </div>
                    <div class="form-group">
                        <label>Пароль</label>
                        <input type="password" id="password" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Войти</button>
                </form>
                <p style="margin-top: 1rem;">Нет аккаунта? <a href="#/register">Зарегистрироваться</a></p>
            </div>
        `;
        
        const form = document.getElementById('loginForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const login = document.getElementById('login').value;
            const password = document.getElementById('password').value;
            
            const result = await auth.login(login, password);
            if (result.success) {
                auth.updateUI();
                router.navigate('/');
            } else {
                showNotification(result.error, 'error');
            }
        };
    });
    
    router.register('/register', async (container) => {
        if (auth.isAuthenticated()) {
            router.navigate('/');
            return;
        }
        
        container.innerHTML = `
            <div class="card" style="max-width: 400px; margin: 2rem auto;">
                <h2>Регистрация</h2>
                <form id="registerForm">
                    <div class="form-group">
                        <label>ФИО</label>
                        <input type="text" id="fullName" required>
                    </div>
                    <div class="form-group">
                        <label>Номер телефона</label>
                        <input type="tel" id="phone" placeholder="+7 (999) 123-45-67" required>
                        <small>Введите номер телефона. Он будет использоваться для входа.</small>
                    </div>
                    <div class="form-group">
                        <label>Email (необязательно)</label>
                        <input type="email" id="email" placeholder="email@example.com">
                    </div>
                    <div class="form-group">
                        <label>Пароль</label>
                        <input type="password" id="password" required>
                    </div>
                    <button type="submit" class="btn btn-primary">Зарегистрироваться</button>
                </form>
                <p style="margin-top: 1rem;">Уже есть аккаунт? <a href="#/login">Войти</a></p>
            </div>
        `;
        
        const form = document.getElementById('registerForm');
        form.onsubmit = async (e) => {
            e.preventDefault();
            const userData = {
                full_name: document.getElementById('fullName').value,
                phone: document.getElementById('phone').value,
                email: document.getElementById('email').value || '',
                password: document.getElementById('password').value
            };
            
            const result = await auth.register(userData);
            if (result.success) {
                auth.updateUI();
                router.navigate('/');
            } else {
                showNotification(result.error, 'error');
            }
        };
    });
    
    router.handleRoute();
}

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    
    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
});