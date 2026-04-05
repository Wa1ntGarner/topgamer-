function showModal(title, contentHtml, onClose) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                ${contentHtml}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('active'), 10);
    
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.onclick = () => {
        modal.remove();
        if (onClose) onClose();
    };
    
    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
            if (onClose) onClose();
        }
    };
    
    return modal;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;
    
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        info: '#3498db',
        warning: '#f39c12'
    };
    
    notification.style.backgroundColor = colors[type] || colors.info;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
}

function formatPrice(price) {
    const roundedPrice = Math.floor(parseFloat(price));
    return `${roundedPrice} ₽`;
}

const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(notificationStyles);