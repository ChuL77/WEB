/**
 * 后台管理系统配置文件
 * 包含API端点、存储键和系统常量
 */

const CONFIG = {
    // 系统信息
    SYSTEM: {
        NAME: '计算机服务管理系统',
        VERSION: '1.0.0',
        COMPANY: '维修服务公司',
        SUPPORT_EMAIL: 'support@example.com'
    },
    
    // API配置
    API: {
        // 微信小程序云开发API
        CLOUD: {
            // 基础配置
            BASE_URL: 'https://api.next.bspapp.com',
            SPACE_ID: 'mp-54490346-0725-4448-927b-4a5350d5841f', // 替换为您的云空间ID
            CLIENT_SECRET: 's49xhspfgqSliUl3GTQC0Q==', // 替换为您的客户端密钥
            
            // 端点
            ENDPOINTS: {
                ORDERS: '/api/orders',
                SERVICES: '/api/services',
                TECHNICIANS: '/api/technicians',
                CUSTOMERS: '/api/customers',
                COMMUNITY: '/api/community',
                STATS: '/api/statistics',
                AUTH: '/api/auth'
            }
        },
        
        // 本地API（用于测试或本地模式）
        LOCAL: {
            BASE_URL: '',
            MOCK_DATA: true,
            ENDPOINTS: {
                ORDERS: '/local/orders',
                SERVICES: '/local/services',
                TECHNICIANS: '/local/technicians',
                CUSTOMERS: '/local/customers',
                COMMUNITY: '/local/community',
                STATS: '/local/statistics',
                AUTH: '/local/auth'
            }
        }
    },
    
    // 存储配置
    STORAGE: {
        // 本地存储键
        KEYS: {
            AUTH_TOKEN: 'admin_auth_token',
            USER_INFO: 'admin_user_info',
            SETTINGS: 'admin_settings',
            LAST_SYNC: 'last_sync_time',
            STORAGE_MODE: 'storage_mode' // 'cloud' 或 'local'
        },
        
        // 默认到期时间（毫秒）
        TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7天
    },
    
    // 同步配置
    SYNC: {
        // 自动同步间隔（毫秒）
        INTERVAL: 5 * 60 * 1000, // 5分钟
        
        // 同步失败后的重试次数
        MAX_RETRIES: 3,
        
        // 重试延迟（毫秒）
        RETRY_DELAY: 30 * 1000 // 30秒
    },
    
    // 订单状态
    ORDER_STATUS: {
        PENDING: 'pending',
        ASSIGNED: 'assigned',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        
        // 获取状态显示文本
        getText: function(status) {
            const statusMap = {
                'pending': '待处理',
                'assigned': '已分配',
                'in_progress': '处理中',
                'completed': '已完成',
                'cancelled': '已取消'
            };
            return statusMap[status] || '未知状态';
        },
        
        // 获取状态显示样式
        getStyle: function(status) {
            const styleMap = {
                'pending': 'warning',
                'assigned': 'primary',
                'in_progress': 'info',
                'completed': 'success',
                'cancelled': 'danger'
            };
            return styleMap[status] || 'default';
        }
    },
    
    // 用户角色
    USER_ROLES: {
        ADMIN: 'admin',
        MANAGER: 'manager',
        STAFF: 'staff',
        
        // 获取角色显示文本
        getText: function(role) {
            const roleMap = {
                'admin': '管理员',
                'manager': '经理',
                'staff': '普通员工'
            };
            return roleMap[role] || '未知角色';
        }
    },
    
    // 分页设置
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 10,
        PAGE_SIZE_OPTIONS: [10, 20, 50, 100]
    },
    
    // 调试模式
    DEBUG: true
}; 