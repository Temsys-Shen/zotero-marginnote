var ZoteroClient = function(config) {
  this.userId = config.userId || "0";
  this.apiKey = config.apiKey || "";
  // 移除末尾斜杠
  var rawBase = config.baseUrl || "https://api.zotero.org";
  if (rawBase.endsWith("/")) {
    rawBase = rawBase.substring(0, rawBase.length - 1);
  }
  this.baseUrl = rawBase;
};

ZoteroClient.prototype = {
  // 构建通用 Headers
  _getHeaders: function() {
    var h = { 'Zotero-API-Version': '3' };
    if (this.apiKey) {
      h['Zotero-API-Key'] = this.apiKey;
    }
    return h;
  },

  // 基础请求
  request: function(endpoint, options) {
    options = options || {};
    var url = this.baseUrl + endpoint;
    
    // 合并 Zotero 专用 Headers
    var zh = this._getHeaders();
    if (options.headers) {
      for (var k in options.headers) zh[k] = options.headers[k];
    }
    options.headers = zh;

    // 调用 ZoteroNetwork
    return ZoteroNetwork.fetch(url, options).then(function(res) {
      return res.json();
    });
  },

  // --- 业务 API ---

  // 搜索条目
  getItems: function(params) {
    // 假设是 Web API 风格: /users/{id}/items
    return this.request('/users/' + this.userId + '/items', {
      method: 'GET',
      search: params // {q: 'keyword', limit: 5}
    });
  },

  // 获取单个条目
  getItem: function(itemKey) {
    return this.request('/users/' + this.userId + '/items/' + itemKey);
  },
  
  // 创建条目 (示例 POST)
  createItems: function(itemsData) {
    return this.request('/users/' + this.userId + '/items', {
      method: 'POST',
      body: itemsData // 传入数组对象，network.js 会自动转 JSON
    });
  }
};