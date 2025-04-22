/**
 * API 处理模块
 * 负责与微信小程序云开发后端通信
 */

const API = {
    /**
     * 当前存储模式 ('cloud' 或 'local')
     */
    currentMode: localStorage.getItem(CONFIG.STORAGE.KEYS.STORAGE_MODE) || 'local',
    
    /**
     * 初始化API
     */
    init: function() {
        console.log('初始化 API 模块...');
        
        // 检查并尝试恢复认证状态
        this.checkAuth();
        
        // 设置存储模式
        this.setMode(this.currentMode);
        
        return Promise.resolve();
    },
    
    /**
     * 设置API模式 (云端/本地)
     * @param {string} mode - 'cloud' 或 'local'
     */
    setMode: function(mode) {
        if (mode !== 'cloud' && mode !== 'local') {
            console.error('无效的 API 模式:', mode);
            return;
        }
        
        this.currentMode = mode;
        localStorage.setItem(CONFIG.STORAGE.KEYS.STORAGE_MODE, mode);
        console.log('API 模式已设置为:', mode);
        
        // 更新UI中的模式指示器
        const modeIndicator = document.getElementById('sync-status');
        if (modeIndicator) {
            if (mode === 'cloud') {
                modeIndicator.innerHTML = '<i class="fas fa-cloud"></i> 云端模式';
                modeIndicator.className = 'text-primary';
            } else {
                modeIndicator.innerHTML = '<i class="fas fa-server"></i> 本地模式';
                modeIndicator.className = 'text-warning';
            }
        }
    },
    
    /**
     * 检查认证状态
     * @returns {boolean} 认证是否有效
     */
    checkAuth: function() {
        const token = localStorage.getItem(CONFIG.STORAGE.KEYS.AUTH_TOKEN);
        if (!token) {
            return false;
        }
        
        // 检查令牌有效性
        try {
            const userInfo = JSON.parse(localStorage.getItem(CONFIG.STORAGE.KEYS.USER_INFO) || '{}');
            const tokenExpiry = userInfo.tokenExpiry;
            
            if (!tokenExpiry || new Date(tokenExpiry) < new Date()) {
                // 令牌已过期
                this.clearAuth();
                return false;
            }
            
            return true;
        } catch (err) {
            console.error('检查认证状态时出错:', err);
            this.clearAuth();
            return false;
        }
    },
    
    /**
     * 清除认证
     */
    clearAuth: function() {
        localStorage.removeItem(CONFIG.STORAGE.KEYS.AUTH_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE.KEYS.USER_INFO);
        console.log('认证信息已清除');
    },
    
    /**
     * 执行登录
     * @param {string} username - 用户名
     * @param {string} password - 密码
     * @returns {Promise} 包含用户信息的Promise
     */
    login: async function(username, password) {
        try {
            // 在实际应用中，这里会调用后端API进行认证
            // 这里使用模拟数据进行演示
            
            if (this.currentMode === 'cloud') {
                // 云端认证
                return this.callCloudAPI(CONFIG.API.CLOUD.ENDPOINTS.AUTH, 'POST', {
                    username,
                    password,
                    action: 'login'
                });
            } else {
                // 本地认证 (模拟)
                return new Promise((resolve, reject) => {
                    // 模拟网络延迟
                    setTimeout(() => {
                        // 仅供演示: 固定的管理员凭据
                        if (username === 'admin' && password === 'admin123') {
                            const tokenExpiry = new Date();
                            tokenExpiry.setTime(tokenExpiry.getTime() + CONFIG.STORAGE.TOKEN_EXPIRY);
                            
                            const userInfo = {
                                id: '1',
                                username: 'admin',
                                displayName: '系统管理员',
                                role: CONFIG.USER_ROLES.ADMIN,
                                tokenExpiry: tokenExpiry.toISOString()
                            };
                            
                            // 存储认证信息
                            localStorage.setItem(CONFIG.STORAGE.KEYS.AUTH_TOKEN, 'mock-token-' + Date.now());
                            localStorage.setItem(CONFIG.STORAGE.KEYS.USER_INFO, JSON.stringify(userInfo));
                            
                            resolve(userInfo);
                        } else {
                            reject(new Error('用户名或密码错误'));
                        }
                    }, 800);
                });
            }
        } catch (err) {
            console.error('登录时出错:', err);
            throw err;
        }
    },
    
    /**
     * 登出
     */
    logout: function() {
        this.clearAuth();
        window.location.reload();
    },
    
    /**
     * 调用云函数API
     * @param {string} path - API路径
     * @param {string} method - HTTP方法
     * @param {object} data - 请求数据
     * @returns {Promise} 包含响应的Promise
     */
    callCloudAPI: async function(path, method = 'GET', data = null) {
        try {
            // 检查云配置
            if (!CONFIG.API.CLOUD.BASE_URL || !CONFIG.API.CLOUD.SPACE_ID || !CONFIG.API.CLOUD.CLIENT_SECRET) {
                throw new Error('云API配置不完整');
            }
            
            // 获取认证令牌
            const token = localStorage.getItem(CONFIG.STORAGE.KEYS.AUTH_TOKEN);
            
            // 构建请求URL和请求头
            const url = `${CONFIG.API.CLOUD.BASE_URL}/client`;
            const headers = {
                'Content-Type': 'application/json',
                'x-basement-token': CONFIG.API.CLOUD.CLIENT_SECRET
            };
            
            // 添加认证令牌（如果有）
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            // 确定集合名称和操作
            const collection = path.replace(/^\/api\//, '').split('/')[0];
            let action;
            
            switch (method) {
                case 'GET': action = 'read'; break;
                case 'POST': action = 'add'; break;
                case 'PUT': action = 'update'; break;
                case 'DELETE': action = 'remove'; break;
                default: action = 'read';
            }
            
            // 构建请求体
            const body = {
                method: 'serverless.db.collection.operation',
                params: {
                    spaceId: CONFIG.API.CLOUD.SPACE_ID,
                    collection_name: collection,
                    action: action,
                    data: data || {}
                }
            };
            
            // 发送请求
            const response = await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify(body)
            });
            
            // 检查HTTP状态
            if (!response.ok) {
                throw new Error(`HTTP错误: ${response.status}`);
            }
            
            // 解析响应
            const result = await response.json();
            
            // 检查API响应状态
            if (result.code !== 0) {
                throw new Error(`API错误: ${result.message || '未知错误'}`);
            }
            
            return result.data;
        } catch (err) {
            console.error(`调用API ${path} 时出错:`, err);
            // 如果是网络错误或API不可用，切换到本地模式
            if (err.message.includes('Failed to fetch') || err.message.includes('云API配置不完整')) {
                this.setMode('local');
            }
            throw err;
        }
    },
    
    /**
     * 从本地存储获取数据
     * @param {string} key - 存储键
     * @returns {Array|Object} 存储的数据或默认值
     */
    getLocalData: function(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (err) {
            console.error(`获取本地数据 ${key} 时出错:`, err);
            return null;
        }
    },
    
    /**
     * 将数据保存到本地存储
     * @param {string} key - 存储键
     * @param {Array|Object} data - 要存储的数据
     */
    saveLocalData: function(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (err) {
            console.error(`保存本地数据 ${key} 时出错:`, err);
        }
    },
    
    /**
     * 生成随机ID
     * @returns {string} 生成的ID
     */
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    },
    
    /**
     * 获取订单列表
     * @param {Object} filters - 筛选条件
     * @returns {Promise} 包含订单数据的Promise
     */
    getOrders: async function(filters = {}) {
        try {
            if (this.currentMode === 'cloud') {
                // 从云端获取订单
                return this.callCloudAPI(CONFIG.API.CLOUD.ENDPOINTS.ORDERS, 'GET', filters);
            } else {
                // 从本地获取订单 (模拟)
                return new Promise((resolve) => {
                    setTimeout(() => {
                        // 从本地存储中获取模拟数据
                        let orders = this.getLocalData('local_orders');
                        
                        // 如果没有数据，则生成模拟数据
                        if (!orders) {
                            orders = this.generateMockOrders();
                            this.saveLocalData('local_orders', orders);
                        }
                        
                        // 应用筛选器
                        if (filters) {
                            if (filters.status) {
                                orders = orders.filter(order => order.status === filters.status);
                            }
                            if (filters.search) {
                                const searchTerm = filters.search.toLowerCase();
                                orders = orders.filter(order => 
                                    order.customerName.toLowerCase().includes(searchTerm) ||
                                    order.orderNumber.includes(searchTerm) ||
                                    order.serviceType.toLowerCase().includes(searchTerm)
                                );
                            }
                        }
                        
                        resolve(orders);
                    }, 300);
                });
            }
        } catch (err) {
            console.error('获取订单列表时出错:', err);
            throw err;
        }
    },
    
    /**
     * 生成模拟订单数据
     * @param {number} count - 生成的订单数量
     * @returns {Array} 模拟订单数组
     */
    generateMockOrders: function(count = 30) {
        const serviceTypes = ['电脑维修', '系统优化', '软件安装', '网络配置', '硬件升级', '数据恢复', '病毒清除'];
        const statuses = Object.keys(CONFIG.ORDER_STATUS).map(key => CONFIG.ORDER_STATUS[key]);
        const technicians = ['张工', '李工', '王工', '赵工', '刘工'];
        const areas = ['朝阳区', '海淀区', '丰台区', '石景山区', '西城区', '东城区', '通州区', '顺义区'];
        
        return Array.from({ length: count }, (_, index) => {
            const orderNumber = `ORD${Date.now().toString().substring(7)}${(index + 1).toString().padStart(3, '0')}`;
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 30)); // 随机过去30天内的日期
            
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            
            // 分配技术员（如果状态不是待处理）
            let assignedTechnician = null;
            if (status !== CONFIG.ORDER_STATUS.PENDING && status !== CONFIG.ORDER_STATUS.CANCELLED) {
                assignedTechnician = technicians[Math.floor(Math.random() * technicians.length)];
            }
            
            // 完成时间（如果状态是已完成）
            let completedAt = null;
            if (status === CONFIG.ORDER_STATUS.COMPLETED) {
                completedAt = new Date(createdAt);
                completedAt.setHours(completedAt.getHours() + Math.floor(Math.random() * 72)); // 1-72小时内完成
            }
            
            return {
                id: this.generateId(),
                orderNumber,
                customerName: `客户${index + 1}`,
                customerPhone: `1${Math.floor(Math.random() * 9) + 3}${Math.random().toString().substring(2, 11)}`,
                serviceType: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
                description: `客户${index + 1}的${serviceTypes[Math.floor(Math.random() * serviceTypes.length)]}服务请求`,
                address: `北京市${areas[Math.floor(Math.random() * areas.length)]}XX路XX号`,
                price: Math.floor(Math.random() * 900) + 100, // 100-1000元
                status,
                assignedTechnician,
                createdAt: createdAt.toISOString(),
                updatedAt: new Date().toISOString(),
                completedAt: completedAt ? completedAt.toISOString() : null
            };
        });
    },
    
    /**
     * 获取技术人员列表
     */
    getTechnicians: async function() {
        try {
            if (this.currentMode === 'cloud') {
                return this.callCloudAPI(CONFIG.API.CLOUD.ENDPOINTS.TECHNICIANS, 'GET');
            } else {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        let technicians = this.getLocalData('local_technicians');
                        if (!technicians) {
                            technicians = this.generateMockTechnicians();
                            this.saveLocalData('local_technicians', technicians);
                        }
                        resolve(technicians);
                    }, 300);
                });
            }
        } catch (err) {
            console.error('获取技术人员列表时出错:', err);
            throw err;
        }
    },
    
    /**
     * 生成模拟技术人员数据
     */
    generateMockTechnicians: function(count = 5) {
        const names = ['张工', '李工', '王工', '赵工', '刘工'];
        const specialties = ['电脑维修', '系统优化', '软件安装', '网络配置', '硬件升级', '数据恢复', '病毒清除'];
        
        return Array.from({ length: count }, (_, index) => {
            // 随机选择1-3个专长
            const techSpecialties = [];
            const specialtiesCount = Math.floor(Math.random() * 3) + 1;
            
            for (let i = 0; i < specialtiesCount; i++) {
                const specialty = specialties[Math.floor(Math.random() * specialties.length)];
                if (!techSpecialties.includes(specialty)) {
                    techSpecialties.push(specialty);
                }
            }
            
            return {
                id: this.generateId(),
                name: names[index],
                phone: `1${Math.floor(Math.random() * 9) + 3}${Math.random().toString().substring(2, 11)}`,
                specialties: techSpecialties,
                rating: (Math.random() * 2 + 3).toFixed(1), // 3.0-5.0的评分
                jobCount: Math.floor(Math.random() * 100) + 10, // 10-110的工作次数
                status: Math.random() > 0.2 ? 'active' : 'inactive',
                createdAt: new Date().toISOString()
            };
        });
    },

    /**
     * 获取服务类型列表
     */
    getServices: async function() {
        try {
            if (this.currentMode === 'cloud') {
                return this.callCloudAPI(CONFIG.API.CLOUD.ENDPOINTS.SERVICES, 'GET');
            } else {
                return new Promise((resolve) => {
                    setTimeout(() => {
                        let services = this.getLocalData('local_services');
                        if (!services) {
                            services = this.generateMockServices();
                            this.saveLocalData('local_services', services);
                        }
                        resolve(services);
                    }, 300);
                });
            }
        } catch (err) {
            console.error('获取服务类型列表时出错:', err);
            throw err;
        }
    },
    
    /**
     * 生成模拟服务类型数据
     */
    generateMockServices: function() {
        return [
            {
                id: this.generateId(),
                name: '电脑维修',
                description: '修复电脑硬件故障，包括主板、内存、硬盘等组件的诊断和更换。',
                price: 200,
                duration: 60, // 分钟
                createdAt: new Date().toISOString()
            },
            {
                id: this.generateId(),
                name: '系统优化',
                description: '清理系统垃圾文件，优化启动项，提高系统运行速度。',
                price: 100,
                duration: 45,
                createdAt: new Date().toISOString()
            },
            {
                id: this.generateId(),
                name: '软件安装',
                description: '安装和配置操作系统、办公软件、专业软件等。',
                price: 150,
                duration: 50,
                createdAt: new Date().toISOString()
            },
            {
                id: this.generateId(),
                name: '网络配置',
                description: '设置和优化家庭或办公网络，解决网络连接问题。',
                price: 180,
                duration: 55,
                createdAt: new Date().toISOString()
            },
            {
                id: this.generateId(),
                name: '硬件升级',
                description: '升级电脑硬件，如增加内存、更换固态硬盘、升级显卡等。',
                price: 250,
                duration: 70,
                createdAt: new Date().toISOString()
            },
            {
                id: this.generateId(),
                name: '数据恢复',
                description: '恢复删除或丢失的文件，修复损坏的存储设备。',
                price: 300,
                duration: 90,
                createdAt: new Date().toISOString()
            },
            {
                id: this.generateId(),
                name: '病毒清除',
                description: '清除电脑病毒、木马、间谍软件等恶意程序。',
                price: 200,
                duration: 60,
                createdAt: new Date().toISOString()
            }
        ];
    }
}; 