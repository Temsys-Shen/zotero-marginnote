JSB.newAddon = function(mainPath){
  JSB.require('WebViewController');
  var newAddonClass = JSB.defineClass('SZSampleWAddon : JSExtension', /*Instance members*/{
    //Window initialize
    sceneWillConnect: function() {
        self.layoutViewController = function(){
          var savedConfig = NSUserDefaults.standardUserDefaults().objectForKey('mn_zotero_frame_config');
          if (savedConfig) {
             var x = savedConfig.x;
             var y = savedConfig.y;
             var w = savedConfig.width;
             var h = savedConfig.height;
             if (x !== undefined && y !== undefined && w !== undefined && h !== undefined) {
                 self.webController.view.frame = {x: x, y: y, width: w, height: h};
                 return;
             }
          }

          var frame = Application.sharedInstance().studyController(self.window).view.bounds;
          var width = frame.width > 300?(300 + (frame.width - 300)/2):300;
          self.webController.view.frame = {x:(frame.width-width)/2,y:frame.height - 500,width:width,height:480};
        };
        self.webController = SZWebViewController.new();
        self.webController.mainPath = mainPath;
    },
    //Window disconnect
    sceneDidDisconnect: function() {
    },
    //Window resign active
    sceneWillResignActive: function() {
    },
    //Window become active
    sceneDidBecomeActive: function() {
    },
    notebookWillOpen: function(notebookid) {
      NSTimer.scheduledTimerWithTimeInterval(0.2,false,function(){
        var sample_on = NSUserDefaults.standardUserDefaults().objectForKey('marginnote_sample_w_on');
        if(sample_on == true){// Not support in card deck mode
          Application.sharedInstance().studyController(self.window).view.addSubview(self.webController.view);
          self.layoutViewController();
          Application.sharedInstance().studyController(self.window).refreshAddonCommands();
        }
      });
    },
    notebookWillClose: function(notebookid) {
    },
    documentDidOpen: function(docmd5) {
    },
    documentWillClose: function(docmd5) {
    },
    controllerWillLayoutSubviews: function(controller) {
      // 只有当 webController 还没有 frame 时才初始化布局
      // 避免每次旋转或触发布局更新时强制重置位置，干扰用户的拖拽操作
      if(controller == Application.sharedInstance().studyController(self.window)){
          if (!self.webController || !self.webController.view || self.webController.view.frame.width === 0) {
              self.layoutViewController();
          }
      }
    },
    queryAddonCommandStatus: function() {
      return {image:'logo.png',object:self,selector:'toggleSample:',checked:(self.webController.view.window?true:false)};
    },
    toggleSample: function(sender) {
      if(self.webController.view.window){
        self.webController.view.removeFromSuperview();
        NSUserDefaults.standardUserDefaults().setObjectForKey(false,'marginnote_sample_w_on');
      }
      else{
        Application.sharedInstance().studyController(self.window).view.addSubview(self.webController.view);
        self.layoutViewController();
        NSUserDefaults.standardUserDefaults().setObjectForKey(true,'marginnote_sample_w_on');
        NSTimer.scheduledTimerWithTimeInterval(0.2,false,function(){
          Application.sharedInstance().studyController(self.window).becomeFirstResponder(); //For dismiss keyboard on iOS
        });
      }
      Application.sharedInstance().studyController(self.window).refreshAddonCommands();
    },
  }, /*Class members*/{
    addonDidConnect: function() {
    },
    addonWillDisconnect: function() {
    },
    applicationWillEnterForeground: function() {
    },
    applicationDidEnterBackground: function() {
    },
    applicationDidReceiveLocalNotification: function(notify) {
    },
  });
  return newAddonClass;
};
