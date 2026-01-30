class ZoteroClient {
  constructor(config) {
    this.userId = config.userId || "0";
    this.apiKey = config.apiKey || "";
    let rawBase = config.baseUrl || "https://api.zotero.org";
    if (rawBase.endsWith("/")) {
      rawBase = rawBase.substring(0, rawBase.length - 1);
    }
    this.baseUrl = rawBase;
  }
  
  // 构建通用 Headers
  _getHeaders() {
    const h = { 'Zotero-API-Version': '3' };
    if (this.apiKey) {
      h['Zotero-API-Key'] = this.apiKey;
    }
    return h;
  }
  
  // 基础请求
  async request(endpoint, options = {}) {
    const url = this.baseUrl + endpoint;

    // 合并 Zotero 专用 Headers
    const zh = this._getHeaders();
    if (options.headers) {
      Object.assign(zh, options.headers);
    }
    options.headers = zh;

    // 调用 ZoteroNetwork
    const res = await MNNetwork.fetch(url, options);
    return res.json();
  }
  
  // --- 业务 API ---
  // 搜索条目
  async getItems(params) {
    // 假设是 Web API 风格: /users/{id}/items
    return this.request(`/users/${this.userId}/items`, {
      method: 'GET',
      search: params // {q: 'keyword', limit: 5}
    });
  }
  
  // 获取单个条目
  async getItem(itemKey) {
    return this.request(`/users/${this.userId}/items/${itemKey}`);
  }
  
  // 创建条目 (示例 POST)
  async createItems(itemsData) {
    return this.request(`/users/${this.userId}/items`, {
      method: 'POST',
      body: itemsData // 传入数组对象，network.js 会自动转 JSON
    });
  }
}
