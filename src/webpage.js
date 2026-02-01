// 仅保留错误页模板（%@ 会被替换为错误描述）。主页面为同目录下的 webpage.html，直接编辑该文件即可，无需转义。
var WebPageConfig = {
  errorHTMLTemplate: "<!DOCTYPE HTML PUBLIC \"-//W3C//DTD HTML 4.01//EN\" \"http://www.w3.org/TR/html4/strict.dtd\"><html><head><meta http-equiv='Content-Type' content='text/html;charset=utf-8'><title></title></head><body><div style='width: 100%%; text-align: center; font-size: 36pt; color: red;'>An error occurred:<br>%@</div></body></html>"
};
