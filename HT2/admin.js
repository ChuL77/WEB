document.addEventListener('DOMContentLoaded', function() {
    // 初始化设置
    initializeConfig();
    
    // 侧边栏导航切换
    initNavigation();
    
    // 初始化云服务设置表单
    initCloudSettings();
    
    // 初始化调试日志
    initDebugLog();
    
    // 加载初始数据
    loadDashboardData();
    
    // 加载完成后隐藏加载中状态
    document.getElementById('loading-overlay').classList.add('hidden');
});

// 初始化配置
function initializeConfig() {
    // 检查本地存储中是否有配置信息
    const storedConfig = localStorage.getItem('adminConfig');
    
    // 默认配置
    const defaultConfig = {
        cloud: {
            enabled: false,
            spaceId: '',
            clientSecret: '',
            apiEndpoint: 'https://api.bspapp.com'
        },
        debug: {
            enabled: true,
            logLevel: 'all'
        }
    };
    
    // 如果没有配置或配置不完整，初始化默认配置
    if (!storedConfig) {
        localStorage.setItem('adminConfig', JSON.stringify(defaultConfig));
        window.config = defaultConfig;
    } else {
        try {
            // 解析存储的配置
            const parsedConfig = JSON.parse(storedConfig);
            
            // 确保配置包含所有必要字段，缺少的使用默认值
            window.config = {
                cloud: {
                    enabled: parsedConfig.cloud?.enabled || defaultConfig.cloud.enabled,
                    spaceId: parsedConfig.cloud?.spaceId || defaultConfig.cloud.spaceId,
                    clientSecret: parsedConfig.cloud?.clientSecret || defaultConfig.cloud.clientSecret,
                    apiEndpoint: parsedConfig.cloud?.apiEndpoint || defaultConfig.cloud.apiEndpoint
                },
                debug: {
                    enabled: parsedConfig.debug?.enabled ?? defaultConfig.debug.enabled,
                    logLevel: parsedConfig.debug?.logLevel || defaultConfig.debug.logLevel
                }
            };
            
            // 更新存储的配置，确保格式一致
            localStorage.setItem('adminConfig', JSON.stringify(window.config));
        } catch (error) {
            // 如果解析出错，使用默认配置
            console.error('配置解析错误，使用默认配置', error);
            localStorage.setItem('adminConfig', JSON.stringify(defaultConfig));
            window.config = defaultConfig;
        }
    }
    
    // 记录日志
    logMessage('info', '系统配置初始化完成', window.config);
}

// 初始化导航
function initNavigation() {
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    const pages = document.querySelectorAll('.page');
    
    // 切换侧边栏
    document.getElementById('sidebar-toggle').addEventListener('click', function() {
        document.querySelector('.sidebar').classList.toggle('collapsed');
        document.querySelector('.main-content').classList.toggle('expanded');
    });
    
    // 处理菜单项点击
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            // 获取目标页面ID
            const targetId = this.getAttribute('data-target');
            if (!targetId) return;
            
            // 移除所有选中状态
            menuItems.forEach(mi => mi.classList.remove('active'));
            // 添加当前选中状态
            this.classList.add('active');
            
            // 隐藏所有页面
            pages.forEach(page => page.classList.add('hidden'));
            
            // 显示目标页面
            const targetPage = document.getElementById(targetId);
            if (targetPage) {
                targetPage.classList.remove('hidden');
            }
            
            // 记录页面切换
            logMessage('info', `页面切换到: ${targetId}`);
        });
    });
    
    // 默认选中仪表盘
    const dashboardItem = document.querySelector('[data-target="dashboard-page"]');
    if (dashboardItem) {
        dashboardItem.click();
    }
}

// 初始化云服务设置
function initCloudSettings() {
    const cloudForm = document.getElementById('cloud-settings-form');
    const enableCloudCheckbox = document.getElementById('enable-cloud');
    const cloudDetails = document.getElementById('cloud-details');
    const spaceIdInput = document.getElementById('space-id');
    const clientSecretInput = document.getElementById('client-secret');
    const apiEndpointInput = document.getElementById('api-endpoint');
    const testConnectionBtn = document.getElementById('test-cloud-connection');
    
    // 显示当前配置
    enableCloudCheckbox.checked = window.config.cloud.enabled;
    spaceIdInput.value = window.config.cloud.spaceId;
    clientSecretInput.value = window.config.cloud.clientSecret;
    apiEndpointInput.value = window.config.cloud.apiEndpoint;
    
    // 根据云服务是否启用显示或隐藏详细设置
    toggleCloudDetails();
    
    // 切换云服务启用状态
    enableCloudCheckbox.addEventListener('change', toggleCloudDetails);
    
    // 保存云服务设置
    cloudForm.addEventListener('submit', function(e) {
        e.preventDefault();
        saveCloudSettings();
    });
    
    // 测试云服务连接
    testConnectionBtn.addEventListener('click', testCloudConnection);
    
    // 重置所有设置
    document.getElementById('reset-all-settings').addEventListener('click', function() {
        if (confirm('确定要重置所有设置吗？这将清除所有配置信息。')) {
            localStorage.removeItem('adminConfig');
            localStorage.removeItem('debugLogs');
            logMessage('info', '所有设置已重置');
            window.location.reload();
        }
    });
    
    // 清除本地数据
    document.getElementById('clear-local-data').addEventListener('click', function() {
        if (confirm('确定要清除所有本地数据吗？这将删除所有订单、服务和技师数据。')) {
            localStorage.removeItem('orders');
            localStorage.removeItem('services');
            localStorage.removeItem('technicians');
            logMessage('info', '本地数据已清除');
            showMessage('本地数据已清除', 'success');
        }
    });
    
    // 切换云服务详细设置显示
    function toggleCloudDetails() {
        if (enableCloudCheckbox.checked) {
            cloudDetails.style.display = 'block';
        } else {
            cloudDetails.style.display = 'none';
        }
    }
}

// 保存云服务设置
function saveCloudSettings() {
    const enableCloud = document.getElementById('enable-cloud').checked;
    const spaceId = document.getElementById('space-id').value.trim();
    const clientSecret = document.getElementById('client-secret').value.trim();
    const apiEndpoint = document.getElementById('api-endpoint').value.trim();
    
    // 如果启用云服务，验证必填字段
    if (enableCloud && (!spaceId || !clientSecret)) {
        showMessage('启用云服务需要填写 Space ID 和 Client Secret', 'error');
        return;
    }
    
    // 更新配置
    window.config.cloud.enabled = enableCloud;
    window.config.cloud.spaceId = spaceId;
    window.config.cloud.clientSecret = clientSecret;
    window.config.cloud.apiEndpoint = apiEndpoint || 'https://api.bspapp.com';
    
    // 保存配置到本地存储
    localStorage.setItem('adminConfig', JSON.stringify(window.config));
    
    // 显示成功消息
    showMessage('云服务设置已保存', 'success');
    
    // 记录日志
    logMessage('info', '云服务设置已更新', {
        enabled: enableCloud,
        spaceId: spaceId ? '已设置' : '未设置',
        clientSecret: clientSecret ? '已设置' : '未设置',
        apiEndpoint
    });
}

// 测试云服务连接
function testCloudConnection() {
    const enableCloud = document.getElementById('enable-cloud').checked;
    const spaceId = document.getElementById('space-id').value.trim();
    const clientSecret = document.getElementById('client-secret').value.trim();
    const apiEndpoint = document.getElementById('api-endpoint').value.trim() || 'https://api.bspapp.com';
    
    // 如果未启用云服务或缺少必要参数，显示错误
    if (!enableCloud) {
        showMessage('请先启用云服务', 'error');
        return;
    }
    
    if (!spaceId || !clientSecret) {
        showMessage('请填写 Space ID 和 Client Secret', 'error');
        return;
    }
    
    // 显示加载状态
    showMessage('正在测试连接...', 'info');
    
    // 记录测试开始
    logMessage('info', '开始测试云服务连接', { apiEndpoint, spaceId });
    
    // 构建测试请求
    const testUrl = `${apiEndpoint}/client/ping`;
    const headers = {
        'Content-Type': 'application/json',
        'X-Space-Id': spaceId,
        'X-Client-Secret': clientSecret
    };
    
    // 发送测试请求
    fetch(testUrl, {
        method: 'GET',
        headers: headers,
        mode: 'cors',
        timeout: 10000
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`服务器响应错误: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showMessage('云服务连接成功', 'success');
            logMessage('info', '云服务连接测试成功', data);
        } else {
            showMessage(`云服务连接测试失败: ${data.message || '未知错误'}`, 'error');
            logMessage('error', '云服务连接测试失败', data);
        }
    })
    .catch(error => {
        showMessage(`云服务连接测试失败: ${error.message}`, 'error');
        logMessage('error', '云服务连接测试失败', { error: error.message });
    });
}

// 加载仪表盘数据
function loadDashboardData() {
    // 加载统计数据和最近订单
    fetchDashboardStats();
    fetchRecentOrders();
}

// 获取仪表盘统计数据
function fetchDashboardStats() {
    try {
        // 尝试从本地存储读取数据
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        
        // 计算统计数据
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.totalPrice || 0), 0);
        const pendingOrders = orders.filter(order => order.status === 'pending').length;
        const completedOrders = orders.filter(order => order.status === 'completed').length;
        
        // 随机计算同比变化（实际应用中应该有真实数据）
        const getRandomChange = () => (Math.random() * 20 - 10).toFixed(1);
        
        // 更新DOM
        document.getElementById('total-orders-value').textContent = totalOrders;
        document.getElementById('total-revenue-value').textContent = `¥${totalRevenue.toFixed(2)}`;
        document.getElementById('pending-orders-value').textContent = pendingOrders;
        document.getElementById('completed-orders-value').textContent = completedOrders;
        
        // 更新同比变化
        document.getElementById('total-orders-change').textContent = `${getRandomChange()}%`;
        document.getElementById('total-revenue-change').textContent = `${getRandomChange()}%`;
        document.getElementById('pending-orders-change').textContent = `${getRandomChange()}%`;
        document.getElementById('completed-orders-change').textContent = `${getRandomChange()}%`;
        
        // 记录日志
        logMessage('info', '仪表盘统计数据加载完成', {
            totalOrders,
            totalRevenue,
            pendingOrders,
            completedOrders
        });
    } catch (error) {
        console.error('加载统计数据失败', error);
        logMessage('error', '加载统计数据失败', { error: error.message });
    }
}

// 获取最近订单
function fetchRecentOrders() {
    try {
        // 尝试从本地存储读取数据
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        
        // 获取最近5个订单
        const recentOrders = orders.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        
        // 获取表格主体
        const tableBody = document.querySelector('#recent-orders-table tbody');
        if (!tableBody) {
            console.error('未找到最近订单表格');
            return;
        }
        
        // 清空表格
        tableBody.innerHTML = '';
        
        // 添加订单到表格
        if (recentOrders.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = '<td colspan="5" class="text-center">暂无订单数据</td>';
            tableBody.appendChild(emptyRow);
        } else {
            recentOrders.forEach(order => {
                const row = document.createElement('tr');
                
                // 构建订单日期显示
                const orderDate = new Date(order.date);
                const formattedDate = orderDate.toLocaleDateString('zh-CN');
                
                // 构建状态显示
                const statusClass = order.status === 'completed' ? 'text-success' : 'text-warning';
                const statusText = order.status === 'completed' ? '已完成' : '待处理';
                
                row.innerHTML = `
                    <td>${order.id}</td>
                    <td>${order.customerName}</td>
                    <td>${formattedDate}</td>
                    <td>¥${parseFloat(order.totalPrice).toFixed(2)}</td>
                    <td><span class="${statusClass}">${statusText}</span></td>
                `;
                
                tableBody.appendChild(row);
            });
        }
        
        // 记录日志
        logMessage('info', '最近订单数据加载完成', { orderCount: recentOrders.length });
    } catch (error) {
        console.error('加载最近订单失败', error);
        logMessage('error', '加载最近订单失败', { error: error.message });
    }
}

// 日志相关函数
function initDebugLog() {
    // 初始化日志容器
    const logContainer = document.getElementById('log-container');
    const logLevelSelect = document.getElementById('log-level');
    
    // 添加日志按钮事件监听
    document.getElementById('refresh-logs').addEventListener('click', refreshDebugLogs);
    document.getElementById('copy-logs').addEventListener('click', copyDebugLogs);
    document.getElementById('clear-logs').addEventListener('click', clearDebugLogs);
    
    // 日志级别切换
    logLevelSelect.addEventListener('change', refreshDebugLogs);
    
    // 初始加载日志
    refreshDebugLogs();
    
    // 记录日志初始化完成
    logMessage('info', '调试日志系统初始化完成');
}

// 记录日志消息
function logMessage(level, message, data = null) {
    // 获取当前日志
    const logs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
    
    // 创建新日志条目
    const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        data: data ? JSON.stringify(data) : null
    };
    
    // 添加到日志数组，保持最多1000条记录
    logs.push(logEntry);
    if (logs.length > 1000) {
        logs.shift(); // 移除最旧的日志
    }
    
    // 保存回本地存储
    localStorage.setItem('debugLogs', JSON.stringify(logs));
    
    // 如果当前在日志页面，自动刷新日志显示
    if (!document.getElementById('settings-page').classList.contains('hidden')) {
        refreshDebugLogs();
    }
}

// 刷新调试日志显示
function refreshDebugLogs() {
    const logContainer = document.getElementById('log-container');
    const logLevel = document.getElementById('log-level').value;
    
    // 获取日志
    const logs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
    
    // 清空日志容器
    logContainer.innerHTML = '';
    
    // 根据日志级别筛选
    const filteredLogs = logLevel === 'all' 
        ? logs 
        : logs.filter(log => log.level === logLevel);
    
    // 如果没有日志
    if (filteredLogs.length === 0) {
        logContainer.innerHTML = '<p class="empty-logs">暂无日志记录</p>';
        return;
    }
    
    // 添加日志条目
    filteredLogs.forEach(log => {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry log-${log.level}`;
        
        // 格式化时间
        const timestamp = new Date(log.timestamp);
        const formattedTime = `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`;
        
        // 构建日志HTML
        logEntry.innerHTML = `
            <div class="log-header">
                <span class="log-time">${formattedTime}</span>
                <span class="log-level-badge ${log.level}">${log.level.toUpperCase()}</span>
            </div>
            <div class="log-message">${log.message}</div>
            ${log.data ? `<div class="log-data">${log.data}</div>` : ''}
        `;
        
        logContainer.appendChild(logEntry);
    });
    
    // 滚动到底部
    logContainer.scrollTop = logContainer.scrollHeight;
}

// 复制调试日志
function copyDebugLogs() {
    const logLevel = document.getElementById('log-level').value;
    const logs = JSON.parse(localStorage.getItem('debugLogs') || '[]');
    
    // 根据日志级别筛选
    const filteredLogs = logLevel === 'all' 
        ? logs 
        : logs.filter(log => log.level === logLevel);
    
    if (filteredLogs.length === 0) {
        showMessage('暂无日志可复制', 'info');
        return;
    }
    
    // 格式化日志为文本
    let logText = '=== 调试日志 ===\n\n';
    
    filteredLogs.forEach(log => {
        const timestamp = new Date(log.timestamp);
        const formattedTime = `${timestamp.toLocaleDateString()} ${timestamp.toLocaleTimeString()}`;
        
        logText += `[${formattedTime}] [${log.level.toUpperCase()}] ${log.message}\n`;
        if (log.data) {
            logText += `数据: ${log.data}\n`;
        }
        logText += '\n';
    });
    
    // 复制到剪贴板
    navigator.clipboard.writeText(logText)
        .then(() => {
            showMessage('日志已复制到剪贴板', 'success');
        })
        .catch(err => {
            showMessage('复制日志失败: ' + err.message, 'error');
        });
}

// 清除调试日志
function clearDebugLogs() {
    if (confirm('确定要清除所有日志吗？')) {
        localStorage.removeItem('debugLogs');
        refreshDebugLogs();
        showMessage('所有日志已清除', 'success');
    }
}

// 显示提示消息
function showMessage(message, type = 'info') {
    const msgContainer = document.createElement('div');
    msgContainer.className = `message ${type}`;
    msgContainer.textContent = message;
    
    document.body.appendChild(msgContainer);
    
    // 2秒后自动消失
    setTimeout(() => {
        msgContainer.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(msgContainer);
        }, 500);
    }, 2000);
} 