const API_BASE_URL = 'http://localhost:5000/api';

class API {
    constructor() {
        this.token = localStorage.getItem('token');
    }
    
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }
    
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        return headers;
    }
    
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const response = await fetch(url, {
            ...options,
            headers: this.getHeaders()
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Ошибка запроса');
        }
        
        return data;
    }
    
    // Auth
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }
    
    async login(credentials) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }
    
    async getMe() {
        return this.request('/auth/me');
    }
    
    // Computers
    async getComputers() {
        return this.request('/computers');
    }
    
    async updateComputerStatus(id, status) {
        return this.request(`/computers/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
    }
    
    // Sessions
    async getActiveSessions() {
        return this.request('/sessions/active');
    }
    
    async startSession(data) {
        return this.request('/sessions/start', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async endSession(data) {
        return this.request('/sessions/end', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    // Bookings
    async createBooking(data) {
        return this.request('/bookings', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async getUserBookings() {
        return this.request('/bookings/my');
    }
    
    async getAllActiveBookings() {
        return this.request('/bookings/active');
    }
    
    async cancelBooking(id) {
        return this.request(`/bookings/${id}/cancel`, {
            method: 'PUT'
        });
    }
    
    // Products
    async getProducts() {
        return this.request('/products');
    }
    
    async getAllProducts() {
        return this.getProducts();
    }
    
    async sellProduct(data) {
        return this.request('/products/sell', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    // Tariffs
    async getTariffs() {
        return this.request('/tariffs');
    }
    
    async updateTariff(id, price_per_hour) {
        return this.request(`/tariffs/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ price_per_hour })
        });
    }
    
    async createTariff(data) {
        return this.request('/tariffs', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    // Reports
    async getRevenueReport(start_date, end_date) {
        let url = '/reports/revenue';
        if (start_date && end_date) {
            url += `?start_date=${start_date}&end_date=${end_date}`;
        }
        return this.request(url);
    }
    
    async getOccupancyReport() {
        return this.request('/reports/occupancy');
    }
    
    async getPopularTariffs() {
        return this.request('/reports/tariffs');
    }
    
    // Users
    async getAllUsers() {
        return this.request('/users');
    }
    
    async getUserById(id) {
        return this.request(`/users/${id}`);
    }
    
    async updateUserBalance(userId, amount) {
        console.log('API updateUserBalance:', { userId, amount });
        return this.request(`/users/${userId}/balance`, {
            method: 'POST',
            body: JSON.stringify({ amount })
        });
    }
}

const api = new API();