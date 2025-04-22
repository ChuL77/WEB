/**
 * 页面加载器 - 负责动态加载不同的页面内容
 */
const PageLoader = {
  // 页面缓存
  pageCache: {},
  
  // 当前活动页面
  activePage: null,
  
  // 页面配置
  pages: {
    dashboard: {
      container: '#dashboard-content',
      template: './templates/dashboard.html',
      init: function() {
        // 初始化仪表盘
        Dashboard.initialize();
      }
    },
    orders: {
      container: '#orders-content',
      template: './templates/orders.html',
      init: function() {
        // 初始化订单页面
        Orders.initialize();
      }
    },
    services: {
      container: '#services-content',
      template: './templates/services.html',
      init: function() {
        // 初始化服务页面
        Services.initialize();
      }
    },
    technicians: {
      container: '#technicians-content',
      template: './templates/technicians.html',
      init: function() {
        // 初始化技术人员页面
        Technicians.initialize();
      }
    },
    settings: {
      container: '#settings-content',
      template: './templates/settings.html',
      init: function() {
        // 初始化设置页面
        Settings.initialize();
      }
    },
    sync: {
      container: '#sync-content',
      template: './templates/sync.html',
      init: function() {
        // 初始化同步页面
        Sync.initialize();
      }
    }
  },
  
  /**
   * 加载指定页面
   * @param {string} pageName - 页面名称
   * @returns {Promise} - 加载完成的Promise
   */
  loadPage: function(pageName) {
    return new Promise((resolve, reject) => {
      if (!this.pages[pageName]) {
        console.error(`页面 "${pageName}" 不存在`);
        reject(new Error(`页面 "${pageName}" 不存在`));
        return;
      }
      
      const pageConfig = this.pages[pageName];
      const container = document.querySelector(pageConfig.container);
      
      if (!container) {
        console.error(`找不到页面容器: ${pageConfig.container}`);
        reject(new Error(`找不到页面容器: ${pageConfig.container}`));
        return;
      }
      
      // 如果页面已缓存，则直接使用缓存
      if (this.pageCache[pageName]) {
        container.innerHTML = this.pageCache[pageName];
        this.activePage = pageName;
        if (pageConfig.init) pageConfig.init();
        resolve();
        return;
      }
      
      // 否则，加载模板
      fetch(pageConfig.template)
        .then(response => {
          if (!response.ok) {
            throw new Error(`无法加载模板: ${pageConfig.template}`);
          }
          return response.text();
        })
        .then(html => {
          this.pageCache[pageName] = html;
          container.innerHTML = html;
          this.activePage = pageName;
          if (pageConfig.init) pageConfig.init();
          resolve();
        })
        .catch(error => {
          console.error('加载页面失败:', error);
          container.innerHTML = `<div class="error-container">
            <h3>加载页面失败</h3>
            <p>${error.message}</p>
          </div>`;
          reject(error);
        });
    });
  },
  
  /**
   * 隐藏所有页面内容
   */
  hideAllPages: function() {
    Object.keys(this.pages).forEach(pageName => {
      const container = document.querySelector(this.pages[pageName].container);
      if (container) {
        container.style.display = 'none';
      }
    });
  },
  
  /**
   * 显示当前活动页面
   */
  showActivePage: function() {
    if (this.activePage) {
      const container = document.querySelector(this.pages[this.activePage].container);
      if (container) {
        container.style.display = 'block';
      }
    }
  }
};

// 导出页面加载器模块
window.PageLoader = PageLoader; 