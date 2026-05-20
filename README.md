# 农场变异解析工具

用于解析农场游戏土地信息，自动拦截 WebSocket 流量并展示变异植物数据。支持解析好友农场和自己的农场。

## 快速开始

### 开发模式运行

```powershell
npm install
npm start
```

打开浏览器访问：`http://127.0.0.1:8787/proxy.html`

### 打包成可执行文件

```powershell
npm install
npm run build:win
npm run vercel:dev
npx vercel dev
```

打包完成后，在 `dist` 目录找到 `farm-parse.exe`。

## 文件结构

```
farm-parse/
├── proxy-server.js    # 代理服务器主文件
├── proxy.html         # 主展示页面
├── auth.html          # 授权验证页面
├── js/main.js         # 前端解析逻辑
├── data/Plant.json    # 植物配置数据
└── proto/             # Proto 协议定义
```

