# 农场变异解析工具

用于解析农场游戏土地信息，自动拦截 WebSocket 流量并展示变异植物数据。支持解析好友农场和自己的农场。

## 快速开始

### 开发模式运行

```powershell
npm install
npm start
```

打开浏览器访问：`http://127.0.0.1:8787/proxy.html`

### 好友成熟时间页面

先保持原解析服务运行，再启动成熟时间服务：

```powershell
npm run maturity
```

打开浏览器访问：`http://127.0.0.1:8790/maturity.html`

成熟时间服务会消费原解析服务的 `/api/stream` 事件，把好友土地、作物、成熟时间和自动化任务写入本地 SQLite。好友以 `gid` 为主键，名称仅用于展示。详见：`README.maturity.md`。

### 打包成可执行文件

```powershell
npm install
npm run build:win
```

打包完成后，在 `dist` 目录找到 `farm-parse.exe`。

## 文件结构

```
farm-parse/
├── proxy-server.js       # 代理服务器主文件
├── proxy.html            # 主展示页面
├── maturity-server.js    # 好友成熟时间入库与调度服务
├── maturity.html         # 好友成熟时间页面
├── auth.html             # 授权验证页面
├── js/main.js            # 前端解析逻辑
├── lib/farm-db.js        # SQLite 持久化
├── lib/maturity.js       # 成熟时间计算
├── data/Plant.json       # 植物配置数据
└── proto/                # Proto 协议定义
```
