JSB.require('webpage');

var WebViewController = JSB.defineClass('WebViewController : UIViewController <UIWebViewDelegate>', {
  viewDidLoad: function() {
    self.navigationItem.title = 'Web';
    self.view.backgroundColor = UIColor.whiteColor();
    self.view.layer.shadowOffset = {width:0,height:0};
    self.view.layer.shadowRadius = 10;
    self.view.layer.shadowOpacity = 0.5;
    self.view.layer.shadowColor = UIColor.colorWithWhiteAlpha(0.5,1);

    self.webView = new UIWebView(self.view.bounds);
    self.webView.backgroundColor = UIColor.whiteColor();
    self.webView.scalesPageToFit = true;
    self.webView.autoresizingMask = (1 << 1 | 1 << 4 | 1 << 5);
    self.webView.delegate = self;
    self.view.addSubview(self.webView);

    var htmlPath = self.mainPath ? (self.mainPath + '/webpage.html') : null;
    if (htmlPath) {
      var fileURL = NSURL.fileURLWithPath(htmlPath);
      self.webView.loadRequest(NSURLRequest.requestWithURL(fileURL));
    } else {
      self.webView.loadHTMLStringBaseURL('<html><body style="margin:20px;">未找到 mainPath，无法加载 webpage.html</body></html>', null);
    }
  },
  viewWillAppear: function(animated) {
    self.webView.delegate = self;
  },
  viewWillDisappear: function(animated) {
    self.webView.stopLoading();
    self.webView.delegate = null;

    UIApplication.sharedApplication().networkActivityIndicatorVisible = false;
  },
  webViewDidStartLoad: function(webView) {
    UIApplication.sharedApplication().networkActivityIndicatorVisible = true;
  },
  webViewDidFinishLoad: function(webView) {
    UIApplication.sharedApplication().networkActivityIndicatorVisible = false;
  },
  webViewDidFailLoadWithError: function(webView, error) {
    UIApplication.sharedApplication().networkActivityIndicatorVisible = false;

    var errorString = WebPageConfig.errorHTMLTemplate.replace("%@", error.localizedDescription);
    self.webView.loadHTMLStringBaseURL(errorString, null);
  },
  webViewShouldStartLoadWithRequestNavigationType: function(webView,request,type){
    JSB.log('MNLOG %@',request);
    return true;
  },

});
