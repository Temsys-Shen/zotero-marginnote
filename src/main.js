JSB.newAddon = function(mainPath) {
  // 1. 加载依赖
  JSB.require('network');
  JSB.require('zotero');

  // 2. 定义插件类
  const newAddonClass = JSB.defineClass('ZoteroAddon : JSExtension', /*Instance members*/{
    
    // 点击菜单栏图标触发
    queryAddonCommandStatus() {
      return {
        image: 'logo.png', 
        object: self, 
        selector: 'onZoteroAction:', 
        checked: false
      };
    },

    // 核心动作逻辑
    async onZoteroAction(sender) {
      // 获取 App 单例和当前窗口
      const app = Application.sharedInstance();
      const win = self.window;
      
      // 【修正点】参数顺序：先文字，后视图
      // 对应 OC: [app waitHUD:@"..." onView:win];
      app.waitHUDOnView('正在连接 Zotero...', win);

      try {
        // --- 实例化客户端 ---
        // 请确保这里是你真实的配置
        const client = new ZoteroClient({
          // 云端Zotero API
          // userId: '19515471', 
          // apiKey: '4rx9O8aejfWcyM72kvOHh23g',
          // baseUrl: 'https://api.zotero.org' // 官方 API
          // 本地Zotero API
          userId: '0', 
          apiKey: '1',
          baseUrl: 'http://localhost:23119' // 本地Zotero端口
        });

        // --- 发起请求 ---
        const items = await client.getItems({ limit: 3 });
        
        // 停止 Loading (注意这个只有一个参数)
        app.stopWaitHUDOnView(win);
        
        if (!items || items.length === 0) {
          app.alert('未找到相关条目');
          return;
        }

        // 处理数据
        let msg = `找到 ${items.length} 个条目:\n\n`;
        items.forEach((item, i) => {
          // 兼容处理：有的接口直接返回 item，有的是 item.data
          const title = (item.data && item.data.title) ? item.data.title : (item.title || '无标题');
          msg += `${i + 1}. ${title}\n`;
        });
        
        app.alert(msg);
      } catch (error) {
        // 发生错误也要停止 Loading
        app.stopWaitHUDOnView(win);
        
        app.alert(`请求失败:\n${error}`);
        JSB.log('Zotero Error: %@', String(error));
      }
    },

    // 生命周期方法
    sceneWillConnect() {},
    sceneDidDisconnect() {},
    notebookWillOpen(notebookid) {},
    notebookWillClose(notebookid) {},
    documentDidOpen(docmd5) {},
    documentWillClose(docmd5) {}

  }, /*Class members*/{
    addonDidConnect() {},
    addonWillDisconnect() {}
  });

  return newAddonClass;
};