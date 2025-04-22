/**
 * 工具函数模块
 * 提供通用的辅助功能
 */

const Utils = {
    /**
     * 显示加载遮罩
     * @param {string} message - 显示的消息
     */
    showLoading: function(message = '加载中，请稍候...') {
        const loadingMask = document.getElementById('loading-mask');
        const loadingText = document.getElementById('loading-text');
        
        if (loadingText) {
            loadingText.textContent = message;
        }
        
        if (loadingMask) {
            loadingMask.style.display = 'flex';
        }
    },
    
    /**
     * 隐藏加载遮罩
     */
    hideLoading: function() {
        const loadingMask = document.getElementById('loading-mask');
        if (loadingMask) {
            loadingMask.style.display = 'none';
        }
    },
    
    /**
     * 显示通知消息
     * @param {string} message - 消息内容
     * @param {string} type - 消息类型 (success, error, warning, info)
     * @param {number} duration - 显示时长(毫秒)
     */
    showNotification: function(message, type = 'info', duration = 3000) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        // 设置图标
        let icon;
        switch (type) {
            case 'success': icon = 'fas fa-check-circle'; break;
            case 'error': icon = 'fas fa-times-circle'; break;
            case 'warning': icon = 'fas fa-exclamation-triangle'; break;
            default: icon = 'fas fa-info-circle';
        }
        
        // 设置通知内容
        notification.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
            <button class="notification-close"><i class="fas fa-times"></i></button>
        `;
        
        // 添加样式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background-color: white;
            border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            z-index: 9999;
            min-width: 280px;
            max-width: 400px;
            animation: slideIn 0.3s ease;
            border-left: 4px solid;
        `;
        
        // 根据类型设置颜色
        switch (type) {
            case 'success': notification.style.borderLeftColor = 'var(--success-color)'; break;
            case 'error': notification.style.borderLeftColor = 'var(--error-color)'; break;
            case 'warning': notification.style.borderLeftColor = 'var(--warning-color)'; break;
            default: notification.style.borderLeftColor = 'var(--primary-color)';
        }
        
        // 设置图标样式
        const iconElement = notification.querySelector('i:first-child');
        if (iconElement) {
            iconElement.style.cssText = `
                margin-right: 12px;
                font-size: 18px;
            `;
            
            switch (type) {
                case 'success': iconElement.style.color = 'var(--success-color)'; break;
                case 'error': iconElement.style.color = 'var(--error-color)'; break;
                case 'warning': iconElement.style.color = 'var(--warning-color)'; break;
                default: iconElement.style.color = 'var(--primary-color)';
            }
        }
        
        // 设置关闭按钮样式
        const closeButton = notification.querySelector('.notification-close');
        if (closeButton) {
            closeButton.style.cssText = `
                background: none;
                border: none;
                color: var(--text-color-secondary);
                cursor: pointer;
                margin-left: auto;
                padding: 0;
                font-size: 14px;
            `;
            
            // 点击关闭
            closeButton.addEventListener('click', function() {
                document.body.removeChild(notification);
            });
        }
        
        // 添加动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOut {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
        
        // 添加到文档
        document.body.appendChild(notification);
        
        // 设置自动关闭
        setTimeout(function() {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(function() {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, duration);
    },
    
    /**
     * 格式化日期时间
     * @param {string|Date} dateTime - 日期时间
     * @param {string} format - 格式字符串
     * @returns {string} 格式化后的日期时间
     */
    formatDateTime: function(dateTime, format = 'YYYY-MM-DD HH:mm') {
        if (!dateTime) return '';
        
        const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
        
        if (isNaN(date.getTime())) {
            return '';
        }
        
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const seconds = date.getSeconds();
        
        // 填充前导零
        const pad = (num) => String(num).padStart(2, '0');
        
        // 替换格式字符串
        return format
            .replace('YYYY', year)
            .replace('MM', pad(month))
            .replace('DD', pad(day))
            .replace('HH', pad(hours))
            .replace('mm', pad(minutes))
            .replace('ss', pad(seconds));
    },
    
    /**
     * 格式化金额
     * @param {number} amount - 金额
     * @param {string} currency - 货币符号
     * @param {number} decimals - 小数位数
     * @returns {string} 格式化后的金额
     */
    formatAmount: function(amount, currency = '¥', decimals = 2) {
        if (amount === null || amount === undefined) return '';
        
        return currency + Number(amount).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    },
    
    /**
     * 生成指定范围内的随机整数
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 随机整数
     */
    randomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    /**
     * 生成随机ID
     * @param {number} length - ID长度
     * @returns {string} 随机ID
     */
    randomId: function(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    },
    
    /**
     * 检查并创建分页控件
     * @param {Object} options - 配置选项
     * @returns {HTMLElement} 分页控件
     */
    createPagination: function(options) {
        const {
            currentPage = 1,
            totalPages = 1,
            onPageChange = null,
            containerSelector = null
        } = options;
        
        // 创建分页容器
        const paginationContainer = document.createElement('div');
        paginationContainer.className = 'pagination';
        paginationContainer.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            margin-top: 20px;
        `;
        
        // 如果只有一页，则不显示分页
        if (totalPages <= 1) {
            return paginationContainer;
        }
        
        // 上一页按钮
        const prevButton = document.createElement('button');
        prevButton.type = 'button';
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.className = 'pagination-btn';
        prevButton.disabled = currentPage <= 1;
        prevButton.style.cssText = `
            padding: 8px 12px;
            margin: 0 4px;
            background-color: ${currentPage <= 1 ? '#f5f5f5' : '#fff'};
            border: 1px solid var(--border-color-base);
            border-radius: var(--border-radius-base);
            color: ${currentPage <= 1 ? 'var(--disabled-color)' : 'var(--text-color)'};
            cursor: ${currentPage <= 1 ? 'not-allowed' : 'pointer'};
        `;
        
        // 下一页按钮
        const nextButton = document.createElement('button');
        nextButton.type = 'button';
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.className = 'pagination-btn';
        nextButton.disabled = currentPage >= totalPages;
        nextButton.style.cssText = `
            padding: 8px 12px;
            margin: 0 4px;
            background-color: ${currentPage >= totalPages ? '#f5f5f5' : '#fff'};
            border: 1px solid var(--border-color-base);
            border-radius: var(--border-radius-base);
            color: ${currentPage >= totalPages ? 'var(--disabled-color)' : 'var(--text-color)'};
            cursor: ${currentPage >= totalPages ? 'not-allowed' : 'pointer'};
        `;
        
        // 页码按钮
        const pageButtons = [];
        
        // 确定显示的页码范围
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }
        
        // 创建页码按钮
        for (let i = startPage; i <= endPage; i++) {
            const pageButton = document.createElement('button');
            pageButton.type = 'button';
            pageButton.textContent = i;
            pageButton.className = 'pagination-btn';
            pageButton.dataset.page = i;
            
            // 当前页高亮
            const isActive = i === currentPage;
            pageButton.style.cssText = `
                padding: 8px 12px;
                margin: 0 4px;
                background-color: ${isActive ? 'var(--primary-color)' : '#fff'};
                border: 1px solid ${isActive ? 'var(--primary-color)' : 'var(--border-color-base)'};
                border-radius: var(--border-radius-base);
                color: ${isActive ? '#fff' : 'var(--text-color)'};
                cursor: ${isActive ? 'default' : 'pointer'};
            `;
            
            // 添加点击事件
            if (!isActive && onPageChange) {
                pageButton.addEventListener('click', () => onPageChange(i));
            }
            
            pageButtons.push(pageButton);
        }
        
        // 添加"第一页"按钮（如果起始页不是第一页）
        if (startPage > 1) {
            const firstPageButton = document.createElement('button');
            firstPageButton.type = 'button';
            firstPageButton.textContent = 1;
            firstPageButton.className = 'pagination-btn';
            firstPageButton.dataset.page = 1;
            firstPageButton.style.cssText = `
                padding: 8px 12px;
                margin: 0 4px;
                background-color: #fff;
                border: 1px solid var(--border-color-base);
                border-radius: var(--border-radius-base);
                color: var(--text-color);
                cursor: pointer;
            `;
            
            if (onPageChange) {
                firstPageButton.addEventListener('click', () => onPageChange(1));
            }
            
            // 添加省略号（如果起始页大于2）
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.margin = '0 8px';
                
                paginationContainer.appendChild(firstPageButton);
                paginationContainer.appendChild(ellipsis);
            } else {
                paginationContainer.appendChild(firstPageButton);
            }
        }
        
        // 添加上一页按钮
        if (currentPage > 1 && onPageChange) {
            prevButton.addEventListener('click', () => onPageChange(currentPage - 1));
        }
        paginationContainer.appendChild(prevButton);
        
        // 添加页码按钮
        pageButtons.forEach(button => paginationContainer.appendChild(button));
        
        // 添加"最后一页"按钮（如果结束页不是最后一页）
        if (endPage < totalPages) {
            const lastPageButton = document.createElement('button');
            lastPageButton.type = 'button';
            lastPageButton.textContent = totalPages;
            lastPageButton.className = 'pagination-btn';
            lastPageButton.dataset.page = totalPages;
            lastPageButton.style.cssText = `
                padding: 8px 12px;
                margin: 0 4px;
                background-color: #fff;
                border: 1px solid var(--border-color-base);
                border-radius: var(--border-radius-base);
                color: var(--text-color);
                cursor: pointer;
            `;
            
            if (onPageChange) {
                lastPageButton.addEventListener('click', () => onPageChange(totalPages));
            }
            
            // 添加省略号（如果结束页小于totalPages-1）
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.textContent = '...';
                ellipsis.style.margin = '0 8px';
                
                paginationContainer.appendChild(ellipsis);
                paginationContainer.appendChild(lastPageButton);
            } else {
                paginationContainer.appendChild(lastPageButton);
            }
        }
        
        // 添加下一页按钮
        if (currentPage < totalPages && onPageChange) {
            nextButton.addEventListener('click', () => onPageChange(currentPage + 1));
        }
        paginationContainer.appendChild(nextButton);
        
        // 如果提供了容器选择器，则将分页添加到容器中
        if (containerSelector) {
            const container = document.querySelector(containerSelector);
            if (container) {
                container.innerHTML = '';
                container.appendChild(paginationContainer);
            }
        }
        
        return paginationContainer;
    },
    
    /**
     * 创建确认对话框
     * @param {Object} options - 配置选项
     * @returns {Promise} 包含用户选择的Promise
     */
    showConfirm: function(options) {
        const {
            title = '确认',
            message = '您确定要执行此操作吗？',
            confirmText = '确定',
            cancelText = '取消',
            type = 'info' // info, success, warning, error
        } = options;
        
        return new Promise((resolve) => {
            // 创建模态背景
            const modalBackdrop = document.createElement('div');
            modalBackdrop.className = 'modal-backdrop';
            modalBackdrop.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.45);
                z-index: 1000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            
            // 创建模态框
            const modal = document.createElement('div');
            modal.className = 'modal confirm-modal';
            modal.style.cssText = `
                background-color: #fff;
                border-radius: 4px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                width: 100%;
                max-width: 416px;
                padding: 0;
            `;
            
            // 设置图标
            let icon, iconColor;
            switch (type) {
                case 'success':
                    icon = 'fa-check-circle';
                    iconColor = 'var(--success-color)';
                    break;
                case 'warning':
                    icon = 'fa-exclamation-triangle';
                    iconColor = 'var(--warning-color)';
                    break;
                case 'error':
                    icon = 'fa-times-circle';
                    iconColor = 'var(--error-color)';
                    break;
                default:
                    icon = 'fa-info-circle';
                    iconColor = 'var(--primary-color)';
            }
            
            // 创建模态内容
            modal.innerHTML = `
                <div class="modal-header" style="border-bottom: none; padding: 16px 24px 0;">
                    <h3 style="margin: 0; font-size: 16px; font-weight: 500;">${title}</h3>
                </div>
                <div class="modal-body" style="padding: 16px 24px;">
                    <div style="display: flex; align-items: flex-start;">
                        <i class="fas ${icon}" style="color: ${iconColor}; font-size: 22px; margin-right: 16px;"></i>
                        <p style="margin: 0;">${message}</p>
                    </div>
                </div>
                <div class="modal-footer" style="border-top: none; padding: 0 24px 24px; display: flex; justify-content: flex-end;">
                    <button type="button" class="btn" id="cancel-btn" style="margin-right: 8px; border: 1px solid var(--border-color-base); background-color: #fff;">${cancelText}</button>
                    <button type="button" class="btn btn-primary" id="confirm-btn">${confirmText}</button>
                </div>
            `;
            
            // 添加到文档
            modalBackdrop.appendChild(modal);
            document.body.appendChild(modalBackdrop);
            
            // 处理按钮点击
            const confirmBtn = document.getElementById('confirm-btn');
            const cancelBtn = document.getElementById('cancel-btn');
            
            confirmBtn.addEventListener('click', () => {
                document.body.removeChild(modalBackdrop);
                resolve(true);
            });
            
            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(modalBackdrop);
                resolve(false);
            });
            
            // 点击背景关闭
            modalBackdrop.addEventListener('click', (e) => {
                if (e.target === modalBackdrop) {
                    document.body.removeChild(modalBackdrop);
                    resolve(false);
                }
            });
        });
    },
    
    /**
     * 深拷贝对象
     * @param {Object} obj - 要拷贝的对象
     * @returns {Object} 拷贝的对象
     */
    deepClone: function(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        if (obj instanceof Date) {
            return new Date(obj.getTime());
        }
        
        if (obj instanceof Array) {
            return obj.map(item => this.deepClone(item));
        }
        
        if (obj instanceof Object) {
            const copy = {};
            Object.keys(obj).forEach(key => {
                copy[key] = this.deepClone(obj[key]);
            });
            return copy;
        }
        
        return obj;
    }
}; 