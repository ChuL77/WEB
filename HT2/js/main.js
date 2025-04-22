/**
 * 管理后台主脚本
 * 负责初始化UI和处理页面交互
 */

// 全局状态
const AppState = {
    // 当前页面ID
    currentPage: 'dashboard',
    
    // 当前用户信息
    currentUser: null,
    
    // 分页状态
    pagination: {
        currentPage: 1,
        pageSize: CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
        totalItems: 0,
        totalPages: 1
    },
    
    // 筛选条件
    filters: {
        orders: {
            status: null,
            search: '',
            dateRange: null
        }
    },
    
    // 同步状态
    syncStatus: {
        lastSync: null,
        isSyncing: false,
        error: null
    },
    
    // 缓存的数据
    cache: {
        orders: [],
        technicians: [],
        services: [],
        customers: []
    }
};

/**
 * 初始化应用
 */
async function initializeApp() {
    try {
        console.log('正在初始化应用...');
        Utils.showLoading('正在初始化...');
        
        // 初始化API模块
        await API.init();
        
        // 设置UI事件监听器
        setupEventListeners();
        
        // 检查认证状态
        if (!API.checkAuth()) {
            // 未认证，显示登录界面
            showLoginForm();
        } else {
            // 已认证，加载用户信息
            loadUserInfo();
            
            // 加载初始数据
            await loadDashboardData();
        }
        
        // 初始同步状态指示器
        updateSyncStatusIndicator();
        
        Utils.hideLoading();
        console.log('应用初始化完成');
    } catch (error) {
        console.error('初始化应用时出错:', error);
        Utils.hideLoading();
        Utils.showNotification('初始化应用失败: ' + error.message, 'error');
    }
}

/**
 * 加载用户信息
 */
function loadUserInfo() {
    try {
        const userInfoJson = localStorage.getItem(CONFIG.STORAGE.KEYS.USER_INFO);
        if (userInfoJson) {
            AppState.currentUser = JSON.parse(userInfoJson);
            
            // 更新UI中的用户信息
            const currentUserElement = document.getElementById('current-user');
            if (currentUserElement && AppState.currentUser) {
                currentUserElement.innerHTML = `<i class="fas fa-user"></i> ${AppState.currentUser.displayName || AppState.currentUser.username}`;
            }
        }
    } catch (error) {
        console.error('加载用户信息时出错:', error);
    }
}

/**
 * 设置UI事件监听器
 */
function setupEventListeners() {
    // 侧边栏导航项点击事件
    document.querySelectorAll('.side-menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const pageId = this.dataset.page;
            navigateToPage(pageId);
        });
    });
    
    // 退出按钮
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            Utils.showConfirm({
                title: '退出确认',
                message: '您确定要退出系统吗？',
                type: 'warning'
            }).then(confirmed => {
                if (confirmed) {
                    API.logout();
                }
            });
        });
    }
    
    // 切换侧边栏
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', function() {
            document.querySelector('.app-container').classList.toggle('sidebar-collapsed');
        });
    }
    
    // 刷新最近订单按钮
    const refreshRecentOrdersBtn = document.getElementById('refresh-recent-orders');
    if (refreshRecentOrdersBtn) {
        refreshRecentOrdersBtn.addEventListener('click', async function() {
            await loadRecentOrders();
            Utils.showNotification('订单数据已刷新', 'success');
        });
    }
}

/**
 * 导航到指定页面
 * @param {string} pageId - 页面ID
 */
async function navigateToPage(pageId) {
    // 已经在当前页面，无需处理
    if (pageId === AppState.currentPage) return;
    
    try {
        // 更新导航项的活动状态
        document.querySelectorAll('.side-menu-item').forEach(item => {
            if (item.dataset.page === pageId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
        
        // 查找目标页面元素
        let pageElement = document.getElementById(`${pageId}-page`);
        
        // 如果页面元素不存在，则动态加载
        if (!pageElement) {
            Utils.showLoading(`加载${getPageTitle(pageId)}...`);
            
            // 创建页面元素
            pageElement = document.createElement('div');
            pageElement.id = `${pageId}-page`;
            pageElement.className = 'page';
            
            // 添加到主内容区
            document.querySelector('.main-content').appendChild(pageElement);
            
            // 加载页面内容
            await loadPageContent(pageId, pageElement);
            
            Utils.hideLoading();
        }
        
        // 隐藏所有页面
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        // 显示目标页面
        pageElement.classList.add('active');
        
        // 更新当前页面状态
        AppState.currentPage = pageId;
        
        console.log(`导航到页面: ${pageId}`);
    } catch (error) {
        console.error(`导航到页面 ${pageId} 时出错:`, error);
        Utils.hideLoading();
        Utils.showNotification(`加载页面失败: ${error.message}`, 'error');
    }
}

/**
 * 获取页面标题
 * @param {string} pageId - 页面ID
 * @returns {string} 页面标题
 */
function getPageTitle(pageId) {
    const titleMap = {
        dashboard: '控制面板',
        orders: '订单管理',
        services: '服务管理',
        technicians: '技术人员管理',
        customers: '客户管理',
        community: '社区互动',
        wechat: '微信小程序',
        settings: '系统设置'
    };
    
    return titleMap[pageId] || pageId;
}

/**
 * 加载页面内容
 * @param {string} pageId - 页面ID
 * @param {HTMLElement} container - 容器元素
 */
async function loadPageContent(pageId, container) {
    // 设置页面标题
    const pageTitle = getPageTitle(pageId);
    container.innerHTML = `<h1 class="page-title">${pageTitle}</h1>`;
    
    // 根据页面ID加载对应内容
    switch (pageId) {
        case 'dashboard':
            await loadDashboardContent(container);
            break;
        case 'orders':
            await loadOrdersContent(container);
            break;
        case 'services':
            await loadServicesContent(container);
            break;
        case 'technicians':
            await loadTechniciansContent(container);
            break;
        case 'customers':
            await loadCustomersContent(container);
            break;
        case 'community':
            await loadCommunityContent(container);
            break;
        case 'wechat':
            await loadWechatContent(container);
            break;
        case 'settings':
            await loadSettingsContent(container);
            break;
        default:
            container.innerHTML += '<div class="card"><p>页面不存在</p></div>';
    }
}

/**
 * 加载控制面板数据
 */
async function loadDashboardData() {
    try {
        Utils.showLoading('加载控制面板数据...');
        
        // 并行加载多个数据源
        const [orders, technicians, services] = await Promise.all([
            API.getOrders(),
            API.getTechnicians(),
            API.getServices()
        ]);
        
        // 更新缓存
        AppState.cache.orders = orders;
        AppState.cache.technicians = technicians;
        AppState.cache.services = services;
        
        // 更新控制面板统计
        updateDashboardStats(orders, technicians);
        
        // 加载图表
        renderOrdersChart(orders);
        renderServicesChart(orders);
        
        // 更新最近订单表格
        updateRecentOrdersTable(orders.slice(0, 5));
        
        Utils.hideLoading();
    } catch (error) {
        console.error('加载控制面板数据时出错:', error);
        Utils.hideLoading();
        Utils.showNotification('加载控制面板数据失败: ' + error.message, 'error');
    }
}

/**
 * 更新控制面板统计数据
 * @param {Array} orders - 订单数据
 * @param {Array} technicians - 技术人员数据
 */
function updateDashboardStats(orders, technicians) {
    // 总订单数
    const totalOrdersElement = document.getElementById('total-orders');
    if (totalOrdersElement) {
        totalOrdersElement.textContent = orders.length;
    }
    
    // 待处理订单
    const pendingOrders = orders.filter(order => order.status === CONFIG.ORDER_STATUS.PENDING);
    const pendingOrdersElement = document.getElementById('pending-orders');
    if (pendingOrdersElement) {
        pendingOrdersElement.textContent = pendingOrders.length;
    }
    
    // 总收入
    const totalRevenue = orders.reduce((sum, order) => sum + (order.price || 0), 0);
    const totalRevenueElement = document.getElementById('total-revenue');
    if (totalRevenueElement) {
        totalRevenueElement.textContent = Utils.formatAmount(totalRevenue);
    }
    
    // 技术人员数量
    const totalTechniciansElement = document.getElementById('total-technicians');
    if (totalTechniciansElement) {
        totalTechniciansElement.textContent = technicians.length;
    }
}

/**
 * 加载最近订单
 */
async function loadRecentOrders() {
    try {
        Utils.showLoading('加载最近订单...');
        
        const orders = await API.getOrders();
        AppState.cache.orders = orders;
        
        // 更新最近订单表格
        updateRecentOrdersTable(orders.slice(0, 5));
        
        Utils.hideLoading();
    } catch (error) {
        console.error('加载最近订单时出错:', error);
        Utils.hideLoading();
        Utils.showNotification('加载最近订单失败: ' + error.message, 'error');
    }
}

/**
 * 更新最近订单表格
 * @param {Array} orders - 订单数据
 */
function updateRecentOrdersTable(orders) {
    const tableBody = document.querySelector('#recent-orders-table tbody');
    if (!tableBody) return;
    
    if (!orders || orders.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">没有订单数据</td></tr>';
        return;
    }
    
    // 清空表格
    tableBody.innerHTML = '';
    
    // 添加订单行
    orders.forEach(order => {
        const row = document.createElement('tr');
        
        // 获取状态样式
        const statusClass = CONFIG.ORDER_STATUS.getStyle(order.status);
        const statusText = CONFIG.ORDER_STATUS.getText(order.status);
        
        row.innerHTML = `
            <td>${order.orderNumber}</td>
            <td>${order.customerName}</td>
            <td>${order.serviceType}</td>
            <td>${Utils.formatAmount(order.price)}</td>
            <td><span class="text-${statusClass}">${statusText}</span></td>
            <td>${Utils.formatDateTime(order.createdAt)}</td>
            <td>
                <button class="btn btn-text view-order" data-id="${order.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-text edit-order" data-id="${order.id}">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        `;
        
        // 添加事件监听器
        row.querySelector('.view-order').addEventListener('click', () => {
            viewOrderDetails(order.id);
        });
        
        row.querySelector('.edit-order').addEventListener('click', () => {
            editOrderDetails(order.id);
        });
        
        tableBody.appendChild(row);
    });
}

/**
 * 查看订单详情
 * @param {string} orderId - 订单ID
 */
function viewOrderDetails(orderId) {
    const order = AppState.cache.orders.find(o => o.id === orderId);
    if (!order) {
        Utils.showNotification('找不到订单信息', 'error');
        return;
    }
    
    // 创建模态框
    const modalContent = `
        <div class="modal-header">
            <h3>订单详情 - ${order.orderNumber}</h3>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label class="form-label">客户姓名</label>
                <div>${order.customerName}</div>
            </div>
            <div class="form-group">
                <label class="form-label">联系电话</label>
                <div>${order.customerPhone}</div>
            </div>
            <div class="form-group">
                <label class="form-label">服务地址</label>
                <div>${order.address}</div>
            </div>
            <div class="form-group">
                <label class="form-label">服务类型</label>
                <div>${order.serviceType}</div>
            </div>
            <div class="form-group">
                <label class="form-label">详细描述</label>
                <div>${order.description}</div>
            </div>
            <div class="form-group">
                <label class="form-label">服务费用</label>
                <div>${Utils.formatAmount(order.price)}</div>
            </div>
            <div class="form-group">
                <label class="form-label">状态</label>
                <div><span class="text-${CONFIG.ORDER_STATUS.getStyle(order.status)}">${CONFIG.ORDER_STATUS.getText(order.status)}</span></div>
            </div>
            <div class="form-group">
                <label class="form-label">指派技术员</label>
                <div>${order.assignedTechnician || '未指派'}</div>
            </div>
            <div class="form-group">
                <label class="form-label">创建时间</label>
                <div>${Utils.formatDateTime(order.createdAt)}</div>
            </div>
            ${order.completedAt ? `
                <div class="form-group">
                    <label class="form-label">完成时间</label>
                    <div>${Utils.formatDateTime(order.completedAt)}</div>
                </div>
            ` : ''}
        </div>
        <div class="modal-footer">
            <button type="button" class="btn" id="close-modal-btn">关闭</button>
            <button type="button" class="btn btn-primary" id="edit-modal-btn">编辑</button>
        </div>
    `;
    
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop';
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = modalContent;
    
    modalBackdrop.appendChild(modal);
    document.body.appendChild(modalBackdrop);
    
    // 设置按钮事件
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.body.removeChild(modalBackdrop);
    });
    
    document.getElementById('edit-modal-btn').addEventListener('click', () => {
        document.body.removeChild(modalBackdrop);
        editOrderDetails(orderId);
    });
    
    // 点击背景关闭
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
            document.body.removeChild(modalBackdrop);
        }
    });
}

/**
 * 编辑订单详情
 * @param {string} orderId - 订单ID
 */
function editOrderDetails(orderId) {
    const order = AppState.cache.orders.find(o => o.id === orderId);
    if (!order) {
        Utils.showNotification('找不到订单信息', 'error');
        return;
    }
    
    // 创建模态框
    const modalContent = `
        <div class="modal-header">
            <h3>编辑订单 - ${order.orderNumber}</h3>
        </div>
        <div class="modal-body">
            <form id="edit-order-form">
                <div class="form-group">
                    <label class="form-label" for="customerName">客户姓名</label>
                    <input type="text" class="form-control" id="customerName" value="${order.customerName}" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="customerPhone">联系电话</label>
                    <input type="text" class="form-control" id="customerPhone" value="${order.customerPhone}" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="address">服务地址</label>
                    <input type="text" class="form-control" id="address" value="${order.address}" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="serviceType">服务类型</label>
                    <select class="form-control" id="serviceType" required>
                        <option value="" disabled>选择服务类型</option>
                        ${AppState.cache.services.map(service => `
                            <option value="${service.name}" ${order.serviceType === service.name ? 'selected' : ''}>${service.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="description">详细描述</label>
                    <textarea class="form-control" id="description" rows="3">${order.description}</textarea>
                </div>
                <div class="form-group">
                    <label class="form-label" for="price">服务费用</label>
                    <input type="number" class="form-control" id="price" value="${order.price}" min="0" step="0.01" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="status">状态</label>
                    <select class="form-control" id="status" required>
                        ${Object.keys(CONFIG.ORDER_STATUS)
                            .filter(key => typeof CONFIG.ORDER_STATUS[key] === 'string')
                            .map(key => `
                                <option value="${CONFIG.ORDER_STATUS[key]}" ${order.status === CONFIG.ORDER_STATUS[key] ? 'selected' : ''}>
                                    ${CONFIG.ORDER_STATUS.getText(CONFIG.ORDER_STATUS[key])}
                                </option>
                            `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label" for="assignedTechnician">指派技术员</label>
                    <select class="form-control" id="assignedTechnician">
                        <option value="">未指派</option>
                        ${AppState.cache.technicians.map(tech => `
                            <option value="${tech.name}" ${order.assignedTechnician === tech.name ? 'selected' : ''}>${tech.name}</option>
                        `).join('')}
                    </select>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn" id="cancel-edit-btn">取消</button>
            <button type="button" class="btn btn-primary" id="save-edit-btn">保存</button>
        </div>
    `;
    
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop';
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = modalContent;
    
    modalBackdrop.appendChild(modal);
    document.body.appendChild(modalBackdrop);
    
    // 设置按钮事件
    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        document.body.removeChild(modalBackdrop);
    });
    
    document.getElementById('save-edit-btn').addEventListener('click', async () => {
        try {
            const form = document.getElementById('edit-order-form');
            
            // 表单验证
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            // 获取表单数据
            const updatedOrder = {
                ...order,
                customerName: document.getElementById('customerName').value,
                customerPhone: document.getElementById('customerPhone').value,
                address: document.getElementById('address').value,
                serviceType: document.getElementById('serviceType').value,
                description: document.getElementById('description').value,
                price: parseFloat(document.getElementById('price').value),
                status: document.getElementById('status').value,
                assignedTechnician: document.getElementById('assignedTechnician').value || null,
                updatedAt: new Date().toISOString()
            };
            
            // 更新完成时间（如果状态变为已完成）
            if (updatedOrder.status === CONFIG.ORDER_STATUS.COMPLETED && order.status !== CONFIG.ORDER_STATUS.COMPLETED) {
                updatedOrder.completedAt = new Date().toISOString();
            } else if (updatedOrder.status !== CONFIG.ORDER_STATUS.COMPLETED) {
                updatedOrder.completedAt = null;
            }
            
            Utils.showLoading('保存订单...');
            
            // 保存到API
            if (API.currentMode === 'cloud') {
                await API.callCloudAPI(CONFIG.API.CLOUD.ENDPOINTS.ORDERS, 'PUT', updatedOrder);
            } else {
                // 本地模式更新
                const orderIndex = AppState.cache.orders.findIndex(o => o.id === orderId);
                if (orderIndex !== -1) {
                    AppState.cache.orders[orderIndex] = updatedOrder;
                    API.saveLocalData('local_orders', AppState.cache.orders);
                }
            }
            
            Utils.hideLoading();
            
            // 更新UI
            if (AppState.currentPage === 'dashboard') {
                updateRecentOrdersTable(AppState.cache.orders.slice(0, 5));
            }
            
            Utils.showNotification('订单已更新', 'success');
            
            // 关闭模态框
            document.body.removeChild(modalBackdrop);
        } catch (error) {
            console.error('保存订单时出错:', error);
            Utils.hideLoading();
            Utils.showNotification('保存订单失败: ' + error.message, 'error');
        }
    });
    
    // 点击背景关闭
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) {
            document.body.removeChild(modalBackdrop);
        }
    });
}

/**
 * 渲染订单趋势图表
 * @param {Array} orders - 订单数据
 */
function renderOrdersChart(orders) {
    const chartContainer = document.getElementById('orders-chart');
    if (!chartContainer) return;
    
    // 按日期分组
    const today = new Date();
    const last30Days = new Date(today);
    last30Days.setDate(today.getDate() - 30);
    
    // 初始化日期数据
    const dateLabels = [];
    const data = {
        created: [],
        completed: []
    };
    
    // 生成过去30天的日期标签
    for (let i = 0; i < 30; i++) {
        const date = new Date(last30Days);
        date.setDate(date.getDate() + i);
        const dateString = Utils.formatDateTime(date, 'MM-DD');
        dateLabels.push(dateString);
        
        // 初始化为0
        data.created.push(0);
        data.completed.push(0);
    }
    
    // 统计订单数据
    orders.forEach(order => {
        const createdDate = new Date(order.createdAt);
        if (createdDate >= last30Days) {
            const dayIndex = Math.floor((createdDate - last30Days) / (24 * 60 * 60 * 1000));
            if (dayIndex >= 0 && dayIndex < 30) {
                data.created[dayIndex]++;
            }
        }
        
        if (order.completedAt) {
            const completedDate = new Date(order.completedAt);
            if (completedDate >= last30Days) {
                const dayIndex = Math.floor((completedDate - last30Days) / (24 * 60 * 60 * 1000));
                if (dayIndex >= 0 && dayIndex < 30) {
                    data.completed[dayIndex]++;
                }
            }
        }
    });
    
    // 创建ECharts实例
    const chart = echarts.init(chartContainer);
    
    // 设置图表选项
    const options = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        legend: {
            data: ['新订单', '已完成'],
            top: 'bottom'
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            top: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: dateLabels,
            axisLabel: {
                interval: 3
            }
        },
        yAxis: {
            type: 'value'
        },
        series: [
            {
                name: '新订单',
                type: 'line',
                data: data.created,
                smooth: true,
                itemStyle: {
                    color: '#1890ff'
                }
            },
            {
                name: '已完成',
                type: 'line',
                data: data.completed,
                smooth: true,
                itemStyle: {
                    color: '#52c41a'
                }
            }
        ]
    };
    
    // 渲染图表
    chart.setOption(options);
    
    // 处理窗口大小调整
    window.addEventListener('resize', () => {
        chart.resize();
    });
}

/**
 * 渲染服务类型分布图表
 * @param {Array} orders - 订单数据
 */
function renderServicesChart(orders) {
    const chartContainer = document.getElementById('services-chart');
    if (!chartContainer) return;
    
    // 按服务类型分组
    const serviceCount = {};
    
    orders.forEach(order => {
        if (!serviceCount[order.serviceType]) {
            serviceCount[order.serviceType] = 0;
        }
        serviceCount[order.serviceType]++;
    });
    
    // 转换为图表数据
    const chartData = Object.keys(serviceCount).map(key => ({
        name: key,
        value: serviceCount[key]
    }));
    
    // 创建ECharts实例
    const chart = echarts.init(chartContainer);
    
    // 设置图表选项
    const options = {
        tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            type: 'scroll',
            textStyle: {
                fontSize: 12
            }
        },
        series: [
            {
                name: '服务类型',
                type: 'pie',
                radius: '70%',
                center: ['60%', '50%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 4,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: '12',
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: false
                },
                data: chartData
            }
        ]
    };
    
    // 渲染图表
    chart.setOption(options);
    
    // 处理窗口大小调整
    window.addEventListener('resize', () => {
        chart.resize();
    });
}

/**
 * 更新同步状态指示器
 */
function updateSyncStatusIndicator() {
    const syncStatusElement = document.getElementById('sync-status');
    if (!syncStatusElement) return;
    
    const lastSync = localStorage.getItem(CONFIG.STORAGE.KEYS.LAST_SYNC);
    
    if (API.currentMode === 'cloud') {
        if (AppState.syncStatus.isSyncing) {
            syncStatusElement.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> 同步中...';
            syncStatusElement.className = 'text-primary';
        } else if (AppState.syncStatus.error) {
            syncStatusElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> 同步失败';
            syncStatusElement.className = 'text-danger';
            syncStatusElement.title = AppState.syncStatus.error;
        } else if (lastSync) {
            const syncTime = new Date(lastSync);
            syncStatusElement.innerHTML = `<i class="fas fa-cloud"></i> 已同步 (${Utils.formatDateTime(syncTime, 'HH:mm')})`;
            syncStatusElement.className = 'text-success';
        } else {
            syncStatusElement.innerHTML = '<i class="fas fa-cloud"></i> 云端模式';
            syncStatusElement.className = 'text-primary';
        }
    } else {
        syncStatusElement.innerHTML = '<i class="fas fa-server"></i> 本地模式';
        syncStatusElement.className = 'text-warning';
    }
}

/**
 * 显示登录表单
 */
function showLoginForm() {
    // 创建模态框
    const modalContent = `
        <div class="modal-header">
            <h3>系统登录</h3>
        </div>
        <div class="modal-body">
            <form id="login-form">
                <div class="form-group">
                    <label class="form-label" for="username">用户名</label>
                    <input type="text" class="form-control" id="username" placeholder="请输入用户名" required>
                </div>
                <div class="form-group">
                    <label class="form-label" for="password">密码</label>
                    <input type="password" class="form-control" id="password" placeholder="请输入密码" required>
                </div>
                <div id="login-error" class="text-danger mb-2" style="display: none;"></div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-primary" id="login-btn">登录</button>
        </div>
    `;
    
    const modalBackdrop = document.createElement('div');
    modalBackdrop.className = 'modal-backdrop';
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = modalContent;
    
    modalBackdrop.appendChild(modal);
    document.body.appendChild(modalBackdrop);
    
    // 设置登录按钮事件
    document.getElementById('login-btn').addEventListener('click', async () => {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            const errorElement = document.getElementById('login-error');
            errorElement.textContent = '请输入用户名和密码';
            errorElement.style.display = 'block';
            return;
        }
        
        try {
            Utils.showLoading('登录中...');
            
            // 调用登录API
            const userInfo = await API.login(username, password);
            
            // 加载用户信息
            loadUserInfo();
            
            // 加载初始数据
            await loadDashboardData();
            
            // 关闭模态框
            document.body.removeChild(modalBackdrop);
            
            Utils.hideLoading();
            Utils.showNotification('登录成功', 'success');
        } catch (error) {
            console.error('登录失败:', error);
            Utils.hideLoading();
            
            const errorElement = document.getElementById('login-error');
            errorElement.textContent = error.message || '登录失败，请检查用户名和密码';
            errorElement.style.display = 'block';
        }
    });
    
    // 表单提交事件
    document.getElementById('login-form').addEventListener('submit', (e) => {
        e.preventDefault();
        document.getElementById('login-btn').click();
    });
}

/**
 * 加载控制面板内容
 * @param {HTMLElement} container - 容器元素
 */
async function loadDashboardContent(container) {
    // 在这里生成控制面板内容
    // 由于我们已经在index.html中创建了控制面板的内容
    // 这里只需要加载数据
    await loadDashboardData();
}

// 页面加载完成时初始化应用
document.addEventListener('DOMContentLoaded', initializeApp); 