JSB.newAddon = function(mainPath) {
  // 1. 加载依赖
  JSB.require('network');
  JSB.require('zotero');

  // 2. 定义插件类
  var newAddonClass = JSB.defineClass('ZoteroAddon : JSExtension', /*Instance members*/{
    
    // 点击菜单栏图标触发
    queryAddonCommandStatus: function() {
      return {
        image: 'logo.png', 
        object: self, 
        selector: 'onZoteroAction:', 
        checked: false
      };
    },

    // 核心动作逻辑
    onZoteroAction: function(sender) {
      // 获取 App 单例和当前窗口
      var app = Application.sharedInstance();
      var win = self.window;
      
      // 【修正点】参数顺序：先文字，后视图
      // 对应 OC: [app waitHUD:@"..." onView:win];
      app.waitHUDOnView('正在连接 Zotero...', win);

      // --- 实例化客户端 ---
      // 请确保这里是你真实的配置
      var client = new ZoteroClient({
        userId: '0', 
        apiKey: 'any',
        baseUrl: 'http://127.0.0.1:23119/api' // 本地 API
        // baseUrl: 'https://api.zotero.org', userId: '你的ID', apiKey: '你的Key' // 云端 API
      });

      // --- 发起请求 ---
      client.getItems({ q: 'history', limit: 3 })
        .then(function(items) {
          // 停止 Loading (注意这个只有一个参数)
          app.stopWaitHUDOnView(win);
          
          if (!items || items.length === 0) {
            app.alert('未找到相关条目');
            return;
          }

          // 处理数据
          var msg = '找到 ' + items.length + ' 个条目:\n\n';
          for (var i = 0; i < items.length; i++) {
            var item = items[i];
            // 兼容处理：有的接口直接返回 item，有的是 item.data
            var title = (item.data && item.data.title) ? item.data.title : (item.title || '无标题');
            msg += (i+1) + '. ' + title + '\n';
          }
          
          app.alert(msg);
        })
        .catch(function(error) {
          // 发生错误也要停止 Loading
          app.stopWaitHUDOnView(win);
          
          app.alert('请求失败:\n' + error);
          JSB.log('Zotero Error: %@', error);
        });
    },

    // 生命周期方法
    sceneWillConnect: function() {},
    sceneDidDisconnect: function() {},
    notebookWillOpen: function(notebookid) {},
    notebookWillClose: function(notebookid) {},
    documentDidOpen: function(docmd5) {},
    documentWillClose: function(docmd5) {}

  }, /*Class members*/{
    addonDidConnect: function() {},
    addonWillDisconnect: function() {}
  });

  return newAddonClass;
};