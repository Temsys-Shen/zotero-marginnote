# MarginNote插件开发规则(AI必读)

## 总则

- 本目录是MarginNote插件开发项目,运行环境与前端/Node不同,不要按浏览器假设做实现。
- 保持谨慎:把每次输出当作“尝试”,先验证再扩展;优先小步改动、可回滚。

## 文档优先(强制)

- 若环境提供mn-docs-mcp(MCP),一动要用 `mndocs` 的mcp检索并以文档为准;不要凭记忆猜API/副作用。如果发现没有该mcp，可以提示用户安装MCP（根据不同的环境按照该启动命令来引导用户 `npx mn-docs-mcp`）
- MCP不可用,一定要阅读在线文档(优先https://mn-docs.museday.top站点),仍不清楚就停止实现并向用户索取:官方文档片段/可运行示例/最小复现与期望行为。
- 开始编码前必须先查两篇:
  - JavaScript原生环境(理解JSCore限制,如无 `fetch`/无DOM等)(https://mn-docs.museday.top/reference/js-runtime/)
  - 全局与入口对象(Global Variables)(理解 `JSB`/`self`/`Application`/`Database`/`Note`等全局注入对象)(https://mn-docs.museday.top/reference/global/global-variables/)

## 运行时与能力差异(不要按前端思维)

- 插件运行在JavaScriptCore环境:没有浏览器的 `window`/`document`/`fetch`/`localStorage`/`setTimeout`/`setInterval`等。
- 网络请求不要用 `fetch`: 按文档使用系统导出的网络API(如NSURLConnection相关)与回调,响应体常见为 `NSData `。
- 环境无Base64解码等常用工具;涉及 `NSData`转文本/JSON时严格按文档做,不要自行臆断可用API。

## 结构与加载规则(强制)

- `span`只做入口与导入:只允许在 `main.js`调用 `JSB.require(...)`，且只允许使用 `JSB.require(...)`，不得使用 `require`、`import`。`JSB.require(...)`的引入进入全局作用域，作用于所有脚本
- 不要在 `main.js `里定义业务函数/方法;所有实现放到独立文件,再由 `main.js `通过 `JSB.require(...)`导入。
- 除 `main.js `外任何文件禁止调用 `JSB.require(...)`(避免重复/污染全局导入行为)。
- 优先用ES6语法(除非与运行时不兼容);保持文件职责单一,不要把UI/数据/命令处理混在一起。

## 全局与入口对象要点(先查Global Variables页)

- 入口通常是 `JSB.newAddon=function(mainPath){...}`并返回插件实例。
- `self`仅在实例方法内可用,代表当前插件实例;不要在模块顶层假设 `self`存在。
- 常用全局注入对象(以文档为准):`JSB`/`Application`/`Database`/`Note`/`UndoManager`等;不确定就先查文档再用。

## 需求澄清

- 当需求不清晰时先问清: 触发入口(菜单/按钮/手势/命令)、作用场景(阅读器/学习界面/笔记)、数据来源(当前选区/当前卡片/数据库查询)与期望输出(UI/笔记/剪贴板/文件)等。
- 何为需求不清晰：
  1. 多解歧义:同一句话至少有2种合理实现方式,且会导致不同产物或不同用户体验(例如“导出笔记”为导出文本/Markdown/图片/文件都合理)。
  2. 用户的要求实现起来很有可能有问题
  3. 输入不完整:没给触发入口/作用场景/数据来源/期望输出/目标对象
  4. 查完文档仍然不能理清实现思路时

## 调试与验证

- 日志统一用 `console.log`,不要用 `JSB.log`。
- 构建无语法校验功能;改动后至少做一次人工检查(重新阅读代码)。
