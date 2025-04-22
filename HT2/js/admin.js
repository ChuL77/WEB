// Admin Dashboard JavaScript

// 仅保留日志记录功能，删除重置按钮
window.addEventListener('load', function() {
  // 记录页面加载/刷新事件的调试日志
  if (typeof logDebugMessage === 'function') {
    const now = new Date();
    const formattedTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    logDebugMessage('info', `页面已在 ${formattedTime} 重新加载/刷新`, {
      url: window.location.href,
      referrer: document.referrer,
      timestamp: now.toISOString(),
      userAgent: navigator.userAgent,
      windowSize: `${window.innerWidth}x${window.innerHeight}`
    });
    console.log(`页面刷新时间: ${formattedTime} - 已记录到调试日志`);
  }
});

// Global variables
let orders = [];
let services = [];
let technicians = [];
let users = [];
let currentPage = 1;
let itemsPerPage = 10;

// Config object
const config = {
  storage: {
    orders: 'ht_orders',
    services: 'ht_services',
    technicians: 'ht_technicians',
    users: 'ht_users',
    debug: 'ht_debug_logs',
    settings: 'ht_settings',
    loginToken: 'ht_login_token',
    loginUser: 'ht_login_user',
    isLoggedIn: 'ht_is_logged_in'
  },
  cloud: {
    enabled: false,
    spaceId: '',
    clientSecret: '',
    serviceUrl: 'https://api.bspapp.com'
  },
  admin: {
    username: 'admin',
    password: 'admin123'
  }
};

// Event listener for DOM content loaded
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // 生成新的会话ID
    const sessionId = 'session_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('ht_debug_session', sessionId);
    
    // 初始化调试日志
    if (typeof logDebugMessage === 'function') {
      logDebugMessage('info', '========== 新会话开始 ==========', {
        sessionId: sessionId,
        timestamp: new Date().toISOString()
      });
    }
    
    // 检查并创建必要的容器元素
    ensurePageStructure();
    
    // 显示加载指示器
    updateLoadingStatus('正在加载系统设置...');
    
    // 加载设置 - 整合了loadCloudSettings的功能
    await initializeSettings();
    
    // 显示加载指示器
    updateLoadingStatus('正在加载数据...');
    
    // 先检查登录状态
    checkAndFixLoginState();
    
    // 加载所有数据 - 修复：不直接调用renderDashboard，而是先加载数据
    loadData();
    
    // 初始化侧边栏切换
    initializeSidebar();
    
    // 初始化用户菜单
    initializeUserMenu();
    
    // 设置事件监听器 - 添加这行来修复点击问题
    setupEventListeners();
    
    // 注意：loadData内部会处理加载指示器，所以这里不再隐藏
    
    // 显示成功通知
    showNotification('系统已成功加载', 'success');
    
  } catch (error) {
    console.error('系统初始化失败:', error);
    updateLoadingStatus('加载失败，请刷新页面重试');
    showNotification('系统初始化失败: ' + error.message, 'error');
  }
});

// 确保页面元素结构存在
function ensurePageStructure() {
  console.log('检查页面结构并确保关键元素存在...');
  
  // 检查页面容器存在
  let pageContainer = document.getElementById('page-container');
  if (!pageContainer) {
    console.warn('页面容器不存在，正在创建...');
    pageContainer = document.createElement('div');
    pageContainer.id = 'page-container';
    pageContainer.style.display = 'none';
    
    // 查找main-content并添加页面容器
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      mainContent.appendChild(pageContainer);
    } else {
      document.body.appendChild(pageContainer);
    }
  }
  
  // 确保菜单项设置了正确的属性
  const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
  menuItems.forEach(item => {
    const text = item.textContent.trim().toLowerCase();
    let pageName = '';
    
    if (text.includes('控制') || text.includes('仪表')) {
      pageName = 'dashboard';
    } else if (text.includes('订单')) {
      pageName = 'orders';
    } else if (text.includes('服务')) {
      pageName = 'services';
    } else if (text.includes('技师')) {
      pageName = 'technicians';
    } else if (text.includes('用户')) {
      pageName = 'users';
    } else if (text.includes('设置')) {
      pageName = 'settings';
    }
    
    if (pageName && !item.hasAttribute('data-page')) {
      console.log(`为菜单项 "${text}" 设置data-page="${pageName}"`);
      item.setAttribute('data-page', pageName);
    }
  });
}

// 辅助函数：检查并修复登录状态问题
function checkAndFixLoginState() {
  console.log('检查登录状态...');
  const isLoggedIn = localStorage.getItem(config.storage.isLoggedIn) === 'true';
  const hasToken = !!localStorage.getItem(config.storage.loginToken);
  const hasUser = !!localStorage.getItem(config.storage.loginUser);
  
  console.log(`当前登录状态: isLoggedIn=${isLoggedIn}, hasToken=${hasToken}, hasUser=${hasUser}`);
  
  // 状态不一致情况处理
  if ((isLoggedIn && (!hasToken || !hasUser)) || 
      (!isLoggedIn && hasToken && hasUser)) {
    console.warn('登录状态不一致，尝试修复...');
    
    // 有token和用户但未设置登录状态
    if (!isLoggedIn && hasToken && hasUser) {
      console.log('设置登录状态为true');
      localStorage.setItem(config.storage.isLoggedIn, 'true');
    } 
    // 标记为已登录但缺少必要信息
    else if (isLoggedIn && (!hasToken || !hasUser)) {
      console.log('缺少必要的登录信息，清除登录状态');
      logout();
    }
  }
}

// Initialize dashboard
function initializeDashboard() {
  console.log('Initializing dashboard... 开始初始化仪表盘');
  
  // 记录日志
  if (typeof logDebugMessage === 'function') {
    logDebugMessage('info', '开始初始化仪表盘');
  }
  
  // 注释掉清除登录状态的代码，避免每次加载都清除登录信息
  /*
  console.log('正在清除之前的登录状态以修复循环重定向问题...');
  localStorage.removeItem(config.storage.isLoggedIn);
  localStorage.removeItem(config.storage.loginToken);
  localStorage.removeItem(config.storage.loginUser);
  
  // 清除cookie
  document.cookie = `${config.storage.isLoggedIn}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  document.cookie = `${config.storage.loginToken}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  document.cookie = `${config.storage.loginUser}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  */
  
  updateLoadingStatus('正在加载数据...', 1);
  
  try {
    // 修改检查登录逻辑，避免直接重定向，而是先完成加载
    console.log('正在开始加载数据...');
    // Load data from storage
    loadData()
      .then((data) => {
        console.log('数据加载成功:', data);
        if (typeof logDebugMessage === 'function') {
          logDebugMessage('info', '数据加载成功', {
            ordersCount: data.orders.length,
            servicesCount: data.services.length,
            techniciansCount: data.technicians.length,
            usersCount: data.users.length
          });
        }
        
        updateDashboardStats();
        renderRecentOrders();
        hideLoading();
        
        // 在加载完成后再检查登录状态
        const isLoggedIn = localStorage.getItem(config.storage.isLoggedIn) === 'true';
        const token = localStorage.getItem(config.storage.loginToken);
        if (!isLoggedIn || !token) {
          console.log('用户未登录，准备跳转到登录页...');
          if (typeof logDebugMessage === 'function') {
            logDebugMessage('warn', '用户未登录，跳转到登录页');
          }
          setTimeout(() => {
            window.location.href = 'login.html';
          }, 500);
        } else {
          if (typeof logDebugMessage === 'function') {
            logDebugMessage('info', '用户已登录，显示仪表盘');
          }
        }
      })
      .catch(error => {
        console.error('数据加载失败详情:', error);
        if (typeof logDebugMessage === 'function') {
          logDebugMessage('error', '数据加载失败', {errorMessage: error.message});
        }
        showError('加载数据失败: ' + error.message);
        hideLoading();
      });
  } catch (error) {
    console.error('初始化过程中发生异常:', error);
    if (typeof logDebugMessage === 'function') {
      logDebugMessage('error', '初始化过程中发生异常', {errorMessage: error.message});
    }
    showError('初始化过程中发生异常: ' + error.message);
    hideLoading();
  }
}

// 显示CORS提示通知
function showCorsNotification() {
  // 创建专门的CORS提示容器
  const corsNotice = document.createElement('div');
  corsNotice.className = 'cors-notice';
  corsNotice.style.cssText = `
    position: fixed;
    top: 72px;
    left: 0;
    right: 0;
    background-color: #fff3cd;
    color: #856404;
    padding: 12px 20px;
    text-align: center;
    z-index: 9999;
    border-bottom: 1px solid #ffeeba;
    font-size: 14px;
  `;
  
  corsNotice.innerHTML = `
    <strong>注意:</strong> 云服务需要通过HTTP服务器访问。直接打开HTML文件会因CORS限制而无法连接。
    <br>
    <span style="font-size:12px;">
      解决方法: 使用本地Web服务器运行此应用，例如:
      <code>python -m http.server 8080</code> 或
      <code>npx http-server .</code>
    </span>
    <button id="dismiss-cors-notice" style="margin-left:15px;padding:3px 8px;background:#f8f9fa;border:1px solid #ddd;border-radius:4px;cursor:pointer;">
      知道了
    </button>
  `;
  
  document.body.appendChild(corsNotice);
  
  // 添加关闭按钮事件
  document.getElementById('dismiss-cors-notice').addEventListener('click', function() {
    corsNotice.style.display = 'none';
  });
  
  // 记录到调试日志
  if (typeof logDebugMessage === 'function') {
    logDebugMessage('warn', 'CORS提示已显示: 建议使用本地Web服务器');
  }
}

// Load data from storage or cloud
async function loadData() {
  // 记录当前云服务状态
  if (typeof logDebugMessage === 'function') {
    logDebugMessage('info', '开始加载数据，云服务状态:', { enabled: config.cloud.enabled });
  }
  
  // 显示加载中的UI指示 - 修复元素ID
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'flex';
  } else {
    console.warn('找不到loading-overlay元素');
  }
  
  // 检查是否在file:协议下运行且启用了云服务
  if (window.location.protocol === 'file:' && config.cloud.enabled) {
    console.warn('检测到在file:协议下启用云服务，这可能引起CORS问题');
    // 显示CORS提示，但仍然尝试连接
    setTimeout(showCorsNotification, 1000);
  }
  
  // 根据配置决定从哪里加载数据
  if (config.cloud.enabled && config.cloud.spaceId && config.cloud.clientSecret) {
    // 用户配置了云服务且启用，尝试从云加载
    fetchData()
      .then(data => {
        // 成功从云加载数据
        renderDashboard(data);
        const modeIndicator = document.getElementById('mode-indicator');
        if (modeIndicator) {
          modeIndicator.textContent = '云模式';
          modeIndicator.classList.remove('local-mode');
          modeIndicator.classList.add('cloud-mode');
        }
      })
      .catch(error => {
        console.error('从云加载数据失败:', error);
        // 记录错误
        if (typeof logDebugMessage === 'function') {
          logDebugMessage('error', '从云加载数据失败，临时使用本地数据', { message: error.message });
        }
        
        // 从本地加载数据，但不改变用户的云设置偏好
        loadLocalData();
        const modeIndicator = document.getElementById('mode-indicator');
        if (modeIndicator) {
          modeIndicator.textContent = '本地模式(临时)';
          modeIndicator.classList.remove('cloud-mode');
          modeIndicator.classList.add('local-mode');
        }
        
        // 显示临时使用本地数据的通知
        showNotification('云服务连接失败，临时使用本地数据。请检查网络和云设置。', 'warning');
      })
      .finally(() => {
        // 隐藏加载指示器
        if (loadingOverlay) {
          loadingOverlay.style.display = 'none';
        }
      });
  } else {
    // 用户未配置或未启用云服务，使用本地数据
    loadLocalData();
    const modeIndicator = document.getElementById('mode-indicator');
    if (modeIndicator) {
      modeIndicator.textContent = '本地模式';
      modeIndicator.classList.remove('cloud-mode');
      modeIndicator.classList.add('local-mode');
    }
    
    // 隐藏加载指示器
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  }
}

// Setup event listeners
function setupEventListeners() {
  console.log('设置事件监听器...');
  
  // 菜单项点击事件 - 修复选择器匹配HTML结构
  const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      // 移除其他菜单项的active类
      menuItems.forEach(i => i.classList.remove('active'));
      // 给当前点击的菜单项添加active类
      item.classList.add('active');
      
      // 获取页面标识
      const page = item.getAttribute('data-page');
      console.log(`菜单项点击: ${page}`);
      
      // 更新页面标题
      const pageHeader = document.querySelector('.page-header h1');
      if (pageHeader) {
        if (page === 'dashboard') pageHeader.textContent = '控制面板';
        if (page === 'orders') pageHeader.textContent = '订单管理';
        if (page === 'services') pageHeader.textContent = '服务管理';
        if (page === 'technicians') pageHeader.textContent = '技师管理';
        if (page === 'users') pageHeader.textContent = '用户管理';
        if (page === 'settings') pageHeader.textContent = '系统设置';
      }
      
      // 实现页面切换逻辑
      switchPage(page);
    });
  });

  // 查看全部链接点击事件
  const viewAllLinks = document.querySelectorAll('.view-all');
  viewAllLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = link.getAttribute('data-page');
      console.log(`查看全部点击: ${page}`);
      
      // 找到对应的菜单项并触发点击
      const menuItem = document.querySelector(`.menu-item[data-page="${page}"]`);
      if (menuItem) {
        menuItem.click();
      }
    });
  });

  // Logout button
  const logoutBtn = document.querySelector('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('退出按钮点击');
      logout();
    });
  } else {
    console.error('无法找到退出按钮');
  }
  
  console.log('事件监听器设置完成');
}

// Logout function
function logout() {
  localStorage.removeItem(config.storage.isLoggedIn);
  localStorage.removeItem(config.storage.loginToken);
  localStorage.removeItem(config.storage.loginUser);
  
  // Clear cookies if any
  document.cookie = `${config.storage.isLoggedIn}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  document.cookie = `${config.storage.loginToken}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  document.cookie = `${config.storage.loginUser}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  
  window.location.href = 'login.html';
}

// Update dashboard statistics
function updateDashboardStats() {
  try {
    // 计算统计数据
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.price) || 0), 0);
    const pendingOrders = orders.filter(order => order.status === '待处理').length;
    const completedOrders = orders.filter(order => order.status === '已完成').length;
    
    // 更新DOM元素
    const totalOrdersEl = document.getElementById('total-orders');
    const totalRevenueEl = document.getElementById('total-revenue');
    const pendingOrdersEl = document.getElementById('pending-orders');
    const completedOrdersEl = document.getElementById('completed-orders');
    
    if (totalOrdersEl) totalOrdersEl.textContent = totalOrders;
    if (totalRevenueEl) totalRevenueEl.textContent = '¥' + totalRevenue.toFixed(2);
    if (pendingOrdersEl) pendingOrdersEl.textContent = pendingOrders;
    if (completedOrdersEl) completedOrdersEl.textContent = completedOrders;
    
    // 记录日志
    if (typeof logDebugMessage === 'function') {
      logDebugMessage('info', '仪表盘统计数据已更新', {
        totalOrders,
        totalRevenue,
        pendingOrders,
        completedOrders
      });
    }
  } catch (error) {
    console.error('更新仪表盘统计数据时出错:', error);
    if (typeof logDebugMessage === 'function') {
      logDebugMessage('error', '更新仪表盘统计数据失败', { message: error.message });
    }
  }
}

// Render recent orders
function renderRecentOrders() {
  try {
    const recentOrdersTable = document.getElementById('recent-orders-table');
    if (!recentOrdersTable) {
      console.warn('未找到最近订单表格元素');
      return;
    }
    
    // 清空表格内容（保留表头）
    const tbody = recentOrdersTable.querySelector('tbody');
    if (!tbody) {
      console.warn('未找到最近订单表格体');
      return;
    }
    tbody.innerHTML = '';
    
    // 获取最近的5个订单
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate))
      .slice(0, 5);
    
    if (recentOrders.length === 0) {
      // 如果没有订单，显示一个空行
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = '<td colspan="5" class="text-center">暂无订单数据</td>';
      tbody.appendChild(emptyRow);
    } else {
      // 渲染每个订单
      recentOrders.forEach(order => {
        const row = document.createElement('tr');
        
        // 查找相关数据
        const service = services.find(s => s.id === order.serviceId) || { name: '未知服务' };
        const technician = technicians.find(t => t.id === order.technicianId) || { name: '未分配' };
        const user = users.find(u => u.id === order.userId) || { name: '未知用户' };
        
        // 创建行内容
        row.innerHTML = `
          <td>${order.id}</td>
          <td>${user.name}</td>
          <td>${service.name}</td>
          <td>${technician.name}</td>
          <td><span class="status-badge ${order.status === '已完成' ? 'completed' : 'pending'}">${order.status}</span></td>
        `;
        
        tbody.appendChild(row);
      });
    }
    
    // 记录成功
    if (typeof logDebugMessage === 'function') {
      logDebugMessage('info', '最近订单列表已更新', { count: recentOrders.length });
    }
  } catch (error) {
    console.error('渲染最近订单时出错:', error);
    if (typeof logDebugMessage === 'function') {
      logDebugMessage('error', '渲染最近订单失败', { message: error.message });
    }
  }
}

// Fetch orders from cloud or local storage
async function fetchOrders() {
  try {
    if (config.cloud.enabled) {
      try {
        // Call cloud API
        updateLoadingStatus('正在从云端获取订单数据...', 2);
        return await callCloudAPI('/api/orders', 'GET');
      } catch (error) {
        console.error('从云端获取订单失败，切换到本地模式:', error);
        // 自动切换到本地模式并继续
        updateLoadingStatus('云端连接失败，正在从本地获取数据...', 2);
        return getMockOrders();
      }
    } else {
      // Get from local storage
      updateLoadingStatus('正在从本地获取订单数据...', 2);
      return getMockOrders();
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
    // Fallback to local mock data
    return getMockOrders();
  }
}

// Get mock orders from local storage
function getMockOrders() {
  const storedOrders = localStorage.getItem(config.storage.orders);
  if (storedOrders) {
    return JSON.parse(storedOrders);
  }
  
  // Return default mock data if no stored data
  const mockOrders = generateMockOrders();
  localStorage.setItem(config.storage.orders, JSON.stringify(mockOrders));
  return mockOrders;
}

// Generate mock orders
function generateMockOrders() {
  const statuses = ['pending', 'processing', 'completed', 'cancelled'];
  const serviceTypes = ['foot massage', 'full body massage', 'facial treatment', 'aromatherapy'];
  const mockOrders = [];
  
  for (let i = 1; i <= 20; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const serviceType = serviceTypes[Math.floor(Math.random() * serviceTypes.length)];
    const price = Math.floor(Math.random() * 500) + 100;
    
    mockOrders.push({
      orderId: 'ORD' + String(i).padStart(4, '0'),
      customerName: '客户' + i,
      serviceName: serviceType,
      technicianName: '技师' + Math.floor(Math.random() * 5 + 1),
      totalAmount: price,
      status: status,
      createTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      appointmentTime: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
    });
  }
  
  return mockOrders;
}

// Get services data
function getServicesData() {
  const storedServices = localStorage.getItem(config.storage.services);
  if (storedServices) {
    return JSON.parse(storedServices);
  }
  
  // Return default mock data
  const mockServices = generateMockServices();
  localStorage.setItem(config.storage.services, JSON.stringify(mockServices));
  return mockServices;
}

// Generate mock services
function generateMockServices() {
  return [
    { id: 1, name: '足底按摩', duration: 60, price: 198, description: '缓解足部疲劳' },
    { id: 2, name: '全身按摩', duration: 90, price: 328, description: '全身放松' },
    { id: 3, name: '面部护理', duration: 45, price: 258, description: '面部护理和按摩' },
    { id: 4, name: '精油疗法', duration: 75, price: 398, description: '使用精油进行全身按摩' }
  ];
}

// Get technicians data
function getTechniciansData() {
  const storedTechnicians = localStorage.getItem(config.storage.technicians);
  if (storedTechnicians) {
    return JSON.parse(storedTechnicians);
  }
  
  // Return default mock data
  const mockTechnicians = generateMockTechnicians();
  localStorage.setItem(config.storage.technicians, JSON.stringify(mockTechnicians));
  return mockTechnicians;
}

// Generate mock technicians
function generateMockTechnicians() {
  return [
    { id: 1, name: '张技师', specialization: '足底按摩', experience: 5, rating: 4.8 },
    { id: 2, name: '李技师', specialization: '全身按摩', experience: 7, rating: 4.9 },
    { id: 3, name: '王技师', specialization: '面部护理', experience: 4, rating: 4.7 },
    { id: 4, name: '赵技师', specialization: '精油疗法', experience: 6, rating: 4.8 },
    { id: 5, name: '刘技师', specialization: '全身按摩', experience: 8, rating: 4.9 }
  ];
}

// Get users data
function getUsersData() {
  const storedUsers = localStorage.getItem(config.storage.users);
  if (storedUsers) {
    return JSON.parse(storedUsers);
  }
  
  // Return default mock data
  const mockUsers = generateMockUsers();
  localStorage.setItem(config.storage.users, JSON.stringify(mockUsers));
  return mockUsers;
}

// Generate mock users
function generateMockUsers() {
  return [
    { id: 1, name: '用户1', phone: '13800000001', visits: 5, lastVisit: '2023-05-15' },
    { id: 2, name: '用户2', phone: '13800000002', visits: 3, lastVisit: '2023-06-20' },
    { id: 3, name: '用户3', phone: '13800000003', visits: 8, lastVisit: '2023-06-25' },
    { id: 4, name: '用户4', phone: '13800000004', visits: 2, lastVisit: '2023-06-28' },
    { id: 5, name: '用户5', phone: '13800000005', visits: 4, lastVisit: '2023-07-01' },
    { id: 6, name: '用户6', phone: '13800000006', visits: 1, lastVisit: '2023-07-05' },
    { id: 7, name: '用户7', phone: '13800000007', visits: 6, lastVisit: '2023-07-10' }
  ];
}

// Get status text
function getStatusText(status) {
  const statusMap = {
    'pending': '待处理',
    'processing': '处理中',
    'completed': '已完成',
    'cancelled': '已取消'
  };
  return statusMap[status] || status;
}

// Call cloud API
async function callCloudAPI(path, method, data = null) {
  if (!config.cloud.enabled || !config.cloud.spaceId || !config.cloud.clientSecret) {
    throw new Error('Cloud service not properly configured');
  }
  
  const url = `${config.cloud.serviceUrl}/client/v2/${config.cloud.spaceId}${path}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'x-basement-token': config.cloud.clientSecret
  };
  
  let options = {
    method: method,
    headers: headers,
    mode: 'cors',
    credentials: 'omit' // 不发送cookies等凭据
  };
  
  if (data && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }
  
  try {
    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 增加到10秒
    options.signal = controller.signal;
    
    console.log(`正在调用API: ${url}`);
    
    // 记录调试信息
    if (typeof logDebugMessage === 'function') {
      logDebugMessage('info', `尝试调用云API: ${path}`, {
        method: method,
        url: url,
        hasToken: !!config.cloud.clientSecret,
        hasData: !!data
      });
    }
    
    // 使用cors模式尝试请求
    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.code !== 0) {
        throw new Error(result.message || 'API call failed');
      }
      
      return result.data;
    } catch (initialError) {
      // 如果是CORS错误，尝试使用no-cors模式（注意：这将返回opaque响应，无法读取内容）
      if (initialError.message.includes('CORS') || 
          initialError.name === 'TypeError' && initialError.message.includes('Failed to fetch')) {
        
        console.warn('CORS错误，尝试使用代理或本地模式...', initialError);
        
        // 记录CORS错误
        if (typeof logDebugMessage === 'function') {
          logDebugMessage('warn', '检测到CORS错误，云API可能需要在HTTP服务器上运行', {
            error: initialError.message, 
            suggestion: '请使用本地Web服务器而不是直接打开HTML文件'
          });
        }
        
        // 由于CORS限制，无法通过no-cors模式获取有意义的响应，所以我们切换到本地模式
        config.cloud.enabled = false;
        
        // 保存设置到本地，但保留用户凭据以便稍后重试
        const settings = JSON.parse(localStorage.getItem(config.storage.settings)) || {};
        settings.cloudEnabled = false;
        localStorage.setItem(config.storage.settings, JSON.stringify(settings));
        
        showError('CORS错误: 需要使用HTTP服务器访问云API。已临时切换到本地模式。');
        
        throw new Error('CORS错误: 请使用HTTP服务器访问该应用以使用云功能。');
      }
      
      // 如果不是CORS错误，则继续抛出
      throw initialError;
    }
  } catch (error) {
    console.error('API call error:', error);
    
    // 处理网络错误，自动切换到本地模式
    if (error.name === 'AbortError' || 
        error.message.includes('Failed to fetch') || 
        error.message.includes('NetworkError') ||
        error.message.includes('ERR_NAME_NOT_RESOLVED')) {
      
      config.cloud.enabled = false;
      // 保存设置到本地
      const settings = JSON.parse(localStorage.getItem(config.storage.settings)) || {};
      settings.cloudEnabled = false;
      localStorage.setItem(config.storage.settings, JSON.stringify(settings));
      
      console.log('由于网络错误，已自动切换到本地模式');
      showError('网络连接失败，已自动切换到本地模式');
    }
    
    throw error;
  }
}

// Update loading status
function updateLoadingStatus(message, progress = -1) {
  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingMessage = document.getElementById('loading-message');
  const progressBar = document.getElementById('loading-progress');
  
  if (loadingOverlay) {
    if (message) {
      loadingOverlay.style.display = 'flex';
      if (loadingMessage) {
        loadingMessage.textContent = message;
      } else {
        console.warn('未找到loading-message元素，无法更新消息');
      }
      
      if (progressBar && progress >= 0) {
        progressBar.style.width = `${Math.min(100, progress * 100)}%`;
      } else if (progress >= 0) {
        console.warn('未找到loading-progress元素，无法更新进度条');
      }
    } else {
      loadingOverlay.style.display = 'none';
    }
  } else {
    console.warn('未找到loading-overlay元素');
    if (message) {
      console.log('加载状态更新:', message, progress >= 0 ? `进度: ${progress * 100}%` : '');
    }
  }
}

// Hide loading overlay
function hideLoading() {
  console.log('隐藏加载指示器');
  const loadingOverlay = document.getElementById('loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  } else {
    console.error('无法找到loading-overlay元素');
  }
}

// Show error
function showError(message) {
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  
  if (errorContainer && errorMessage) {
    errorMessage.textContent = message;
    errorContainer.classList.remove('hidden');
    
    // Hide after 5 seconds
    setTimeout(() => {
      errorContainer.classList.add('hidden');
    }, 5000);
  } else {
    // 如果错误容器不存在，则创建一个临时错误提示
    const tempError = document.createElement('div');
    tempError.className = 'temp-error-message';
    tempError.textContent = message;
    tempError.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #ffebee;
      color: #d32f2f;
      padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      z-index: 9999;
    `;
    document.body.appendChild(tempError);
    
    // 5秒后移除
    setTimeout(() => {
      document.body.removeChild(tempError);
    }, 5000);
  }
}

// Initialize cloud sync
function initializeCloudSync() {
  const syncButton = document.getElementById('sync-button');
  if (syncButton) {
    syncButton.addEventListener('click', async () => {
      try {
        updateLoadingStatus('正在同步数据...', 1);
        await syncData();
        hideLoading();
        showError('数据同步成功');
      } catch (error) {
        hideLoading();
        showError('数据同步失败: ' + error.message);
      }
    });
  }
}

// Sync data with cloud
async function syncData() {
  if (!config.cloud.enabled) {
    throw new Error('Cloud service not enabled');
  }
  
  try {
    // Sync orders
    const cloudOrders = await callCloudAPI('/api/orders', 'GET');
    if (cloudOrders) {
      orders = cloudOrders;
      localStorage.setItem(config.storage.orders, JSON.stringify(orders));
    }
    
    // Sync other data...
    
    // Update UI
    updateDashboardStats();
    renderRecentOrders();
    
    return true;
  } catch (error) {
    console.error('Sync error:', error);
    throw error;
  }
}

// 添加页面切换和渲染函数
function switchPage(page) {
  console.log('切换到页面:', page);
  
  try {
    // 记录切换页面的操作
    if (typeof logDebugMessage === 'function') {
      logDebugMessage('info', `正在切换到页面: ${page}`);
    }
    
    // 隐藏所有内容区域
    const dashboardContent = document.querySelector('.stats-container');
    const recentOrdersSection = document.querySelector('.section-title');
    const recentOrdersTable = document.querySelector('.recent-orders');
    const pageContainer = document.getElementById('page-container');
    
    // 记录元素状态
    console.log('页面元素状态:', {
      dashboardContent: !!dashboardContent,
      recentOrdersSection: !!recentOrdersSection,
      recentOrdersTable: !!recentOrdersTable,
      pageContainer: !!pageContainer
    });
    
    // 隐藏仪表盘元素
    if (dashboardContent) dashboardContent.style.display = 'none';
    if (recentOrdersSection) recentOrdersSection.style.display = 'none';
    if (recentOrdersTable) recentOrdersTable.style.display = 'none';
    
    // 如果页面容器不存在，创建一个
    if (!pageContainer) {
      console.warn('页面容器不存在，正在创建...');
      const newPageContainer = document.createElement('div');
      newPageContainer.id = 'page-container';
      
      // 添加到main-content
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.appendChild(newPageContainer);
      } else {
        document.body.appendChild(newPageContainer);
      }
      
      // 如果不是dashboard页面，则显示
      if (page !== 'dashboard') {
        newPageContainer.style.display = 'block';
      } else {
        newPageContainer.style.display = 'none';
      }
    } else {
      // 如果不是dashboard页面，则显示页面容器
      if (page !== 'dashboard') {
        pageContainer.style.display = 'block';
      } else {
        pageContainer.style.display = 'none';
      }
    }
    
    // 根据页面显示相应内容
    if (page === 'dashboard') {
      if (dashboardContent) dashboardContent.style.display = 'grid';
      if (recentOrdersSection) recentOrdersSection.style.display = 'flex';
      if (recentOrdersTable) recentOrdersTable.style.display = 'block';
      updateDashboardStats();
      renderRecentOrders();
    } else {
      // 使用现有的或新创建的页面容器
      const container = pageContainer || document.getElementById('page-container');
      if (container) {
        renderPageContent(page, container);
      } else {
        console.error('无法找到或创建页面容器');
        showError('页面切换失败: 无法找到或创建页面容器');
      }
    }
    
    // 更新菜单项的活动状态
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    menuItems.forEach(item => {
      if (item.getAttribute('data-page') === page) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
    
    // 记录成功消息
    if (typeof logDebugMessage === 'function') {
      logDebugMessage('info', `已成功切换到页面: ${page}`);
    }
  } catch (error) {
    console.error('切换页面时出错:', error);
    if (typeof logDebugMessage === 'function') {
      logDebugMessage('error', '切换页面失败', { page, error: error.message });
    }
    showError('切换页面失败: ' + error.message);
  }
}

// 渲染各个页面内容
function renderPageContent(page, container) {
  container.innerHTML = ''; // 清空容器
  
  if (page === 'orders') {
    renderOrdersPage(container);
  } else if (page === 'services') {
    renderServicesPage(container);
  } else if (page === 'technicians') {
    renderTechniciansPage(container);
  } else if (page === 'users') {
    renderUsersPage(container);
  } else if (page === 'settings') {
    renderSettingsPage(container);
  }
}

// 渲染订单管理页面
function renderOrdersPage(container) {
  container.innerHTML = `
    <div class="page-content">
      <div class="table-controls">
        <button class="btn btn-primary">添加订单</button>
        <div class="search-box">
          <input type="text" placeholder="搜索订单...">
          <button>搜索</button>
        </div>
      </div>
      
      <div class="table-wrapper">
        <table class="orders-table" id="orders-table-full">
          <thead>
            <tr>
              <th>订单号</th>
              <th>客户</th>
              <th>服务</th>
              <th>技师</th>
              <th>日期</th>
              <th>金额</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody id="orders-table-body">
            <!-- 订单数据将动态加载 -->
          </tbody>
        </table>
      </div>
      
      <div class="pagination">
        <button class="prev-page">上一页</button>
        <span class="page-info">第 <span id="current-page">1</span> 页，共 <span id="total-pages">1</span> 页</span>
        <button class="next-page">下一页</button>
      </div>
    </div>
  `;
  
  // 加载订单数据
  renderOrdersTable();
  
  // 添加事件监听器
  const prevPageBtn = container.querySelector('.prev-page');
  const nextPageBtn = container.querySelector('.next-page');
  
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderOrdersTable();
      }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(orders.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderOrdersTable();
      }
    });
  }
}

// 渲染订单表格
function renderOrdersTable() {
  const tbody = document.getElementById('orders-table-body');
  if (!tbody) return;
  
  // 清空表格
  tbody.innerHTML = '';
  
  // 计算分页
  const totalPages = Math.ceil(orders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, orders.length);
  
  // 更新分页信息
  const currentPageElement = document.getElementById('current-page');
  const totalPagesElement = document.getElementById('total-pages');
  
  if (currentPageElement) currentPageElement.textContent = currentPage;
  if (totalPagesElement) totalPagesElement.textContent = totalPages;
  
  // 填充表格
  for (let i = startIndex; i < endIndex; i++) {
    const order = orders[i];
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${order.orderId}</td>
      <td>${order.customerName || '未知客户'}</td>
      <td>${order.serviceName || '未知服务'}</td>
      <td>${order.technicianName || '未分配'}</td>
      <td>${new Date(order.createTime).toLocaleDateString()}</td>
      <td>¥${order.totalAmount?.toFixed(2) || '0.00'}</td>
      <td><span class="status-pill status-${order.status}">${getStatusText(order.status)}</span></td>
      <td>
        <button class="edit-btn" data-id="${order.orderId}">编辑</button>
        <button class="delete-btn" data-id="${order.orderId}">删除</button>
      </td>
    `;
    
    tbody.appendChild(row);
  }
  
  // 给操作按钮添加事件监听器
  const editButtons = tbody.querySelectorAll('.edit-btn');
  const deleteButtons = tbody.querySelectorAll('.delete-btn');
  
  editButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.getAttribute('data-id');
      alert(`编辑订单: ${orderId}`);
      // 在这里实现编辑功能
    });
  });
  
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const orderId = btn.getAttribute('data-id');
      if (confirm(`确定要删除订单 ${orderId} 吗？`)) {
        alert(`删除订单: ${orderId}`);
        // 在这里实现删除功能
      }
    });
  });
}

// 为其他页面创建简单的占位符内容
function renderServicesPage(container) {
  container.innerHTML = `
    <div class="page-content">
      <div class="table-controls">
        <button class="btn btn-primary">添加服务</button>
      </div>
      
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>服务名称</th>
              <th>时长 (分钟)</th>
              <th>价格 (元)</th>
              <th>描述</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${services.map(service => `
              <tr>
                <td>${service.id}</td>
                <td>${service.name}</td>
                <td>${service.duration}</td>
                <td>¥${service.price.toFixed(2)}</td>
                <td>${service.description}</td>
                <td>
                  <button class="edit-btn" data-id="${service.id}">编辑</button>
                  <button class="delete-btn" data-id="${service.id}">删除</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderTechniciansPage(container) {
  container.innerHTML = `
    <div class="page-content">
      <div class="table-controls">
        <button class="btn btn-primary">添加技师</button>
      </div>
      
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>姓名</th>
              <th>专长</th>
              <th>工作经验 (年)</th>
              <th>评分</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${technicians.map(tech => `
              <tr>
                <td>${tech.id}</td>
                <td>${tech.name}</td>
                <td>${tech.specialization}</td>
                <td>${tech.experience}</td>
                <td>${tech.rating}</td>
                <td>
                  <button class="edit-btn" data-id="${tech.id}">编辑</button>
                  <button class="delete-btn" data-id="${tech.id}">删除</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderUsersPage(container) {
  container.innerHTML = `
    <div class="page-content">
      <div class="table-controls">
        <button class="btn btn-primary">添加用户</button>
      </div>
      
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>姓名</th>
              <th>电话</th>
              <th>访问次数</th>
              <th>最近访问</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(user => `
              <tr>
                <td>${user.id}</td>
                <td>${user.name}</td>
                <td>${user.phone}</td>
                <td>${user.visits}</td>
                <td>${user.lastVisit}</td>
                <td>
                  <button class="edit-btn" data-id="${user.id}">编辑</button>
                  <button class="delete-btn" data-id="${user.id}">删除</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSettingsPage(container) {
  // 从localStorage获取现有设置
  const settings = JSON.parse(localStorage.getItem(config.storage.settings)) || {};
  
  container.innerHTML = `
    <div class="page-content">
      <div class="settings-section">
        <h2>系统设置</h2>
        
        <div class="form-group">
          <label for="cloud-enabled">启用云服务</label>
          <input type="checkbox" id="cloud-enabled" ${settings.cloudEnabled ? 'checked' : ''}>
        </div>
        
        <div class="cloud-settings ${settings.cloudEnabled ? '' : 'hidden'}">
          <div class="form-group">
            <label for="space-id">Space ID</label>
            <input type="text" id="space-id" value="${settings.spaceId || ''}">
          </div>
          
          <div class="form-group">
            <label for="client-secret">Client Secret</label>
            <input type="password" id="client-secret" value="${settings.clientSecret || ''}">
          </div>
          
          <!-- 添加CORS问题解决方案说明 -->
          <div class="form-group" style="margin-top: 15px; padding: 12px; background-color: #f8f9fa; border-radius: 4px; border-left: 4px solid #17a2b8;">
            <p style="font-size: 14px; margin: 0 0 8px 0; color: #333;"><strong>提示：</strong>如果云服务连接失败，可能是因为浏览器的CORS限制。</p>
            <p style="font-size: 13px; margin: 0; color: #555;">解决方法：</p>
            <ol style="font-size: 13px; margin: 5px 0; padding-left: 25px; color: #555;">
              <li>使用本地Web服务器运行此应用，而不是直接打开HTML文件</li>
              <li>如果有Python: <code>python -m http.server 8080</code></li>
              <li>如果有Node.js: <code>npx http-server .</code></li>
              <li>或使用VS Code的Live Server插件</li>
            </ol>
            <p style="font-size: 13px; margin: 5px 0 0 0; color: #555;">启动服务后，通过 <code>http://localhost:端口号/</code> 访问应用</p>
          </div>
        </div>
        
        <button id="save-settings" class="btn btn-primary">保存设置</button>
      </div>
      
      <!-- 调试日志部分 -->
      <div class="settings-section" style="margin-top: 20px;">
        <h2>调试日志</h2>
        
        <div class="debug-controls">
          <div>
            <button id="clear-logs" class="btn">清除日志</button>
            <button id="refresh-logs" class="btn">刷新</button>
            <button id="copy-logs" class="btn">复制日志</button>
          </div>
          <div class="log-filter">
            <label for="log-level">日志级别:</label>
            <select id="log-level">
              <option value="all">全部</option>
              <option value="info">信息</option>
              <option value="warn">警告</option>
              <option value="error">错误</option>
            </select>
          </div>
        </div>
        
        <div class="log-container">
          <pre id="log-content">正在加载日志...</pre>
        </div>
      </div>
    </div>
  `;
  
  // 添加设置页面的事件监听器
  const cloudEnabledCheckbox = container.querySelector('#cloud-enabled');
  const cloudSettings = container.querySelector('.cloud-settings');
  const saveSettingsBtn = container.querySelector('#save-settings');
  
  if (cloudEnabledCheckbox && cloudSettings) {
    cloudEnabledCheckbox.addEventListener('change', () => {
      if (cloudEnabledCheckbox.checked) {
        cloudSettings.classList.remove('hidden');
      } else {
        cloudSettings.classList.add('hidden');
      }
    });
  }
  
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
      const newSettings = {
        cloudEnabled: cloudEnabledCheckbox.checked,
        spaceId: container.querySelector('#space-id').value,
        clientSecret: container.querySelector('#client-secret').value
      };
      
      // 保存设置
      localStorage.setItem(config.storage.settings, JSON.stringify(newSettings));
      
      // 更新配置
      config.cloud.enabled = newSettings.cloudEnabled;
      config.cloud.spaceId = newSettings.spaceId;
      config.cloud.clientSecret = newSettings.clientSecret;
      
      showError('设置已保存');
      
      // 记录设置更改日志
      logDebugMessage('info', '系统设置已更新', newSettings);
    });
  }
  
  // 初始化调试日志功能
  initDebugLog(container);
}

// 初始化调试日志功能
function initDebugLog(container) {
  console.log('初始化调试日志系统');
  
  // 获取DOM元素
  const clearLogsBtn = container.querySelector('#clear-logs');
  const refreshLogsBtn = container.querySelector('#refresh-logs');
  const copyLogsBtn = container.querySelector('#copy-logs');
  const logLevelSelect = container.querySelector('#log-level');
  
  // 绑定事件
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener('click', clearDebugLogs);
  }
  
  if (refreshLogsBtn) {
    refreshLogsBtn.addEventListener('click', () => refreshDebugLogs(logLevelSelect.value));
  }
  
  if (copyLogsBtn) {
    copyLogsBtn.addEventListener('click', copyDebugLogs);
  }
  
  if (logLevelSelect) {
    logLevelSelect.addEventListener('change', () => refreshDebugLogs(logLevelSelect.value));
  }
  
  // 初始显示日志
  refreshDebugLogs('all');
  
  // 记录调试系统启动日志
  logDebugMessage('info', '调试日志系统已初始化', {timestamp: new Date().toISOString()});
}

// 记录调试日志消息
function logDebugMessage(level, message, data = null) {
  // 确保level有效
  if (!['info', 'warn', 'error', 'debug'].includes(level)) {
    level = 'info';
  }
  
  // 获取现有日志
  let logs = [];
  try {
    const storedLogs = localStorage.getItem(config.storage.debug);
    logs = storedLogs ? JSON.parse(storedLogs) : [];
    
    // 确保logs是数组
    if (!Array.isArray(logs)) {
      logs = [];
    }
  } catch (error) {
    console.error('读取日志记录失败:', error);
    logs = [];
  }
  
  // 限制日志数量，保持最新的500条记录
  if (logs.length > 500) {
    logs = logs.slice(-500);
  }
  
  // 添加新日志
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level,
    message: message,
    data: data ? JSON.stringify(data) : null
  };
  
  logs.push(logEntry);
  
  // 保存回本地存储
  try {
    localStorage.setItem(config.storage.debug, JSON.stringify(logs));
  } catch (error) {
    console.error('保存日志记录失败:', error);
  }
  
  // 如果当前在设置页面，更新日志显示
  const logContent = document.getElementById('log-content');
  if (logContent) {
    try {
      refreshDebugLogs();
    } catch (error) {
      console.error('刷新日志显示失败:', error);
    }
  }
  
  // 同时输出到控制台
  try {
    if (data) {
      console[level](message, data);
    } else {
      console[level](message);
    }
  } catch (error) {
    console.error('控制台输出日志失败:', error);
  }
  
  return logEntry;
}

// 刷新日志显示
function refreshDebugLogs(level = 'all') {
  console.log('刷新日志显示，级别：', level);
  const logContent = document.getElementById('log-content');
  if (!logContent) return;
  
  // 获取日志数据
  const logs = JSON.parse(localStorage.getItem(config.storage.debug) || '[]');
  
  if (logs.length === 0) {
    logContent.textContent = '没有日志记录';
    return;
  }
  
  // 根据选择的级别过滤日志
  const filteredLogs = level === 'all' 
    ? logs 
    : logs.filter(log => log.level === level);
  
  if (filteredLogs.length === 0) {
    logContent.textContent = `没有${level}级别的日志记录`;
    return;
  }
  
  // 格式化日志显示
  const formattedLogs = filteredLogs.map(log => {
    const date = new Date(log.timestamp);
    const time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    
    let logClass = '';
    if (log.level === 'error') logClass = 'log-error';
    if (log.level === 'warn') logClass = 'log-warn';
    
    let logText = `[${time}] [${log.level.toUpperCase()}] ${log.message}`;
    if (log.data) {
      try {
        // 尝试美化数据显示
        const dataObj = JSON.parse(log.data);
        logText += `\n${JSON.stringify(dataObj, null, 2)}`;
      } catch (e) {
        logText += `\n${log.data}`;
      }
    }
    
    return `<div class="log-entry ${logClass}">${logText}</div>`;
  }).join('\n');
  
  logContent.innerHTML = formattedLogs;
}

// 清除调试日志
function clearDebugLogs() {
  if (confirm('确定要清除所有日志记录吗？')) {
    localStorage.removeItem(config.storage.debug);
    refreshDebugLogs();
    console.log('调试日志已清除');
    
    // 记录清除操作
    logDebugMessage('info', '日志已被用户清除');
  }
}

// 复制日志内容
function copyDebugLogs() {
  const logContent = document.getElementById('log-content');
  if (!logContent) return;
  
  // 获取纯文本内容
  const logs = JSON.parse(localStorage.getItem(config.storage.debug) || '[]');
  
  if (logs.length === 0) {
    alert('没有日志可复制');
    return;
  }
  
  const textContent = logs.map(log => {
    const date = new Date(log.timestamp);
    const time = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    
    let logText = `[${time}] [${log.level.toUpperCase()}] ${log.message}`;
    if (log.data) {
      logText += `\n${log.data}`;
    }
    
    return logText;
  }).join('\n');
  
  // 复制到剪贴板
  navigator.clipboard.writeText(textContent)
    .then(() => {
      alert('日志已复制到剪贴板');
      logDebugMessage('info', '用户复制了日志内容');
    })
    .catch(err => {
      alert('复制失败：' + err);
      logDebugMessage('error', '复制日志失败', err);
    });
}

// 初始化应用
async function initializeSettings() {
  try {
    // 初始化本地存储，如果不存在
    if (!localStorage.getItem(config.storage.settings)) {
      localStorage.setItem(config.storage.settings, JSON.stringify({
        cloudEnabled: false,
        spaceId: '',
        clientSecret: '',
        endpoint: 'https://api.next.bspapp.com'
      }));
    }
    
    // 加载云设置（整合了loadCloudSettings的功能）
    const settings = JSON.parse(localStorage.getItem(config.storage.settings));
    console.log('加载云设置:', settings);
    
    // 更新当前运行时配置
    if (settings) {
      config.cloud.enabled = settings.cloudEnabled !== undefined ? settings.cloudEnabled : false;
      config.cloud.spaceId = settings.spaceId || '';
      config.cloud.clientSecret = settings.clientSecret || '';
      
      // 更新UI中的值
      const spaceIdElement = document.getElementById('space-id');
      if (spaceIdElement) spaceIdElement.value = settings.spaceId || '';
      
      const clientSecretElement = document.getElementById('client-secret');
      if (clientSecretElement) clientSecretElement.value = settings.clientSecret || '';
      
      const cloudEnabledCheckbox = document.getElementById('cloud-enabled');
      if (cloudEnabledCheckbox) cloudEnabledCheckbox.checked = !!settings.cloudEnabled;
    }
    
    // 记录日志
    if (typeof logDebugMessage === 'function') {
      logDebugMessage('info', '系统设置初始化完成', {
        cloudEnabled: config.cloud.enabled,
        hasSpaceId: !!config.cloud.spaceId,
        hasClientSecret: !!config.cloud.clientSecret
      });
    }
    
    return settings;
  } catch (error) {
    console.error('初始化设置失败:', error);
    if (typeof logDebugMessage === 'function') {
      logDebugMessage('error', '无法加载系统设置', { error: error.message });
    }
    throw new Error('无法加载系统设置');
  }
}

// 初始化侧边栏
function initializeSidebar() {
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function() {
      sidebar.classList.toggle('collapsed');
      document.querySelector('.main-content').classList.toggle('expanded');
    });
  }
  
  // 侧边栏菜单项点击 - 修复选择器匹配HTML结构
  const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
  menuItems.forEach(item => {
    item.addEventListener('click', function(e) {
      const target = this.getAttribute('data-page');
      if (target) {
        // 隐藏所有页面
        document.querySelectorAll('.content-page').forEach(page => {
          page.classList.add('hidden');
        });
        
        // 显示目标页面
        const targetPage = document.getElementById(target);
        if (targetPage) {
          targetPage.classList.remove('hidden');
        }
        
        // 更新活动菜单项
        menuItems.forEach(mi => mi.classList.remove('active'));
        this.classList.add('active');
      }
    });
  });
}

// 初始化用户菜单
function initializeUserMenu() {
  const userMenuToggle = document.getElementById('user-menu-toggle');
  const userMenu = document.getElementById('user-menu');
  
  if (userMenuToggle && userMenu) {
    userMenuToggle.addEventListener('click', function() {
      userMenu.classList.toggle('hidden');
    });
    
    // 点击外部时关闭菜单
    document.addEventListener('click', function(e) {
      if (!userMenuToggle.contains(e.target) && !userMenu.contains(e.target)) {
        userMenu.classList.add('hidden');
      }
    });
  }
}

// 从本地加载数据而不改变云设置
function loadLocalData() {
  // 获取本地存储的各种数据
  const localOrders = JSON.parse(localStorage.getItem(config.storage.orders)) || [];
  const localServices = JSON.parse(localStorage.getItem(config.storage.services)) || [];
  const localTechnicians = JSON.parse(localStorage.getItem(config.storage.technicians)) || [];
  const localUsers = JSON.parse(localStorage.getItem(config.storage.users)) || [];
  
  // 如果没有数据，尝试生成模拟数据
  if (localOrders.length === 0) {
    const mockOrders = generateMockOrders();
    localStorage.setItem(config.storage.orders, JSON.stringify(mockOrders));
    orders = mockOrders;
  } else {
    orders = localOrders;
  }
  
  if (localServices.length === 0) {
    const mockServices = generateMockServices();
    localStorage.setItem(config.storage.services, JSON.stringify(mockServices));
    services = mockServices;
  } else {
    services = localServices;
  }
  
  if (localTechnicians.length === 0) {
    const mockTechnicians = generateMockTechnicians();
    localStorage.setItem(config.storage.technicians, JSON.stringify(mockTechnicians));
    technicians = mockTechnicians;
  } else {
    technicians = localTechnicians;
  }
  
  if (localUsers.length === 0) {
    const mockUsers = generateMockUsers();
    localStorage.setItem(config.storage.users, JSON.stringify(mockUsers));
    users = mockUsers;
  } else {
    users = localUsers;
  }
  
  // 渲染数据
  renderDashboard({ 
    orders: orders,
    services: services,
    technicians: technicians,
    users: users
  });
  
  // 记录日志
  if (typeof logDebugMessage === 'function') {
    logDebugMessage('info', '已加载本地数据', { 
      ordersCount: orders.length,
      servicesCount: services.length,
      techniciansCount: technicians.length,
      usersCount: users.length
    });
  }
}

// 渲染仪表盘数据
function renderDashboard(data) {
  try {
    // 确保我们有有效的数据
    if (!data || !data.orders) {
      console.error('渲染仪表盘时缺少有效数据');
      if (typeof logDebugMessage === 'function') {
        logDebugMessage('error', '渲染仪表盘失败', { reason: '缺少有效数据' });
      }
      return;
    }
    
    // 更新全局数据
    orders = data.orders || [];
    
    // 如果有其他数据，也更新它们
    if (data.services) services = data.services;
    if (data.technicians) technicians = data.technicians;
    if (data.users) users = data.users;
    
    // 更新仪表盘统计数据
    updateDashboardStats();
    
    // 渲染最近订单
    renderRecentOrders();
    
    // 更新模式指示器
    const modeIndicator = document.getElementById('mode-indicator');
    if (modeIndicator) {
      if (config.cloud.enabled && config.cloud.spaceId && config.cloud.clientSecret) {
        modeIndicator.textContent = '云模式';
        modeIndicator.classList.remove('local-mode');
        modeIndicator.classList.add('cloud-mode');
      } else {
        modeIndicator.textContent = '本地模式';
        modeIndicator.classList.remove('cloud-mode');
        modeIndicator.classList.add('local-mode');
      }
    }
    
    // 记录成功信息
    if (typeof logDebugMessage === 'function') {
      logDebugMessage('info', '仪表盘数据渲染成功', {
        ordersCount: orders.length,
        servicesCount: services ? services.length : 'N/A',
        techniciansCount: technicians ? technicians.length : 'N/A',
        mode: config.cloud.enabled ? '云模式' : '本地模式'
      });
    }
  } catch (error) {
    console.error('渲染仪表盘时出错:', error);
    if (typeof logDebugMessage === 'function') {
      logDebugMessage('error', '渲染仪表盘失败', { message: error.message });
    }
    showError('渲染仪表盘失败: ' + error.message);
  }
}

// 从云服务获取数据
async function fetchData() {
  try {
    // 显示加载状态
    updateLoadingStatus('正在从云服务获取数据...', 1);
    
    // 并行获取各种数据
    const [ordersData, servicesData, techniciansData, usersData] = await Promise.all([
      callCloudAPI('/api/orders', 'GET'),
      callCloudAPI('/api/services', 'GET'),
      callCloudAPI('/api/technicians', 'GET'),
      callCloudAPI('/api/users', 'GET')
    ]);
    
    // 记录日志
    if (typeof logDebugMessage === 'function') {
      logDebugMessage('info', '云数据获取成功', {
        orders: ordersData ? ordersData.length : 0,
        services: servicesData ? servicesData.length : 0,
        technicians: techniciansData ? techniciansData.length : 0,
        users: usersData ? usersData.length : 0
      });
    }
    
    // 更新本地存储以便离线使用
    localStorage.setItem(config.storage.orders, JSON.stringify(ordersData || []));
    localStorage.setItem(config.storage.services, JSON.stringify(servicesData || []));
    localStorage.setItem(config.storage.technicians, JSON.stringify(techniciansData || []));
    localStorage.setItem(config.storage.users, JSON.stringify(usersData || []));
    
    // 返回获取的数据
    return {
      orders: ordersData || [],
      services: servicesData || [],
      technicians: techniciansData || [],
      users: usersData || []
    };
  } catch (error) {
    console.error('从云服务获取数据失败:', error);
    // 记录错误
    if (typeof logDebugMessage === 'function') {
      logDebugMessage('error', '从云服务获取数据失败', { message: error.message });
    }
    // 抛出错误以便上层捕获
    throw error;
  }
}

// 显示通知消息
function showNotification(message, type = 'info') {
  // 创建通知元素
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // 添加到页面
  const notificationContainer = document.querySelector('.notification-container');
  if (!notificationContainer) {
    // 如果容器不存在，创建一个
    const container = document.createElement('div');
    container.className = 'notification-container';
    document.body.appendChild(container);
    container.appendChild(notification);
  } else {
    notificationContainer.appendChild(notification);
  }
  
  // 自动关闭
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => {
      notification.remove();
    }, 500);
  }, 5000);
} 