class Router {
    constructor() {
        this.routes = {};
        window.addEventListener('hashchange', () => this.handleRoute());
        this.handleRoute();
    }
    
    register(path, handler) {
        this.routes[path] = handler;
    }
    
    async handleRoute() {
        let hash = window.location.hash.slice(1) || '/';
        
        // Убираем query параметры
        hash = hash.split('?')[0];
        
        const handler = this.routes[hash];
        const mainContent = document.getElementById('mainContent');
        
        if (handler) {
            await handler(mainContent);
        } else {
            // 404
            mainContent.innerHTML = '<div class="card"><h2>Страница не найдена</h2><a href="#/">Вернуться на главную</a></div>';
        }
    }
    
    navigate(path) {
        window.location.hash = path;
    }
}

const router = new Router();