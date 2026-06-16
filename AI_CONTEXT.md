# AI 项目上下文说明

这份文档给后续在本地 Codex / AI 编程工具继续开发时使用，目标是让 AI 快速理解项目边界、架构和开发约束。

## 项目目标

`farm-parse` 是一个农场游戏抓包解析与视觉辅助调度工具。

核心目标：

1. 拦截并解析游戏 WebSocket 数据。
2. 展示自己和好友农场的土地、作物、变异信息。
3. 将好友作物成熟时间写入本地 SQLite。
4. 后续通过真实屏幕操作触发游戏行为，不直接伪造游戏协议请求。

重要边界：成熟时间服务和调度队列只做本地数据记录与命令排队；真正进入好友农场、点击摘取等动作必须由视觉自动化程序通过屏幕和鼠标完成。

## 启动方式

日常启动：

```bash
npm install
npm start
```

`npm start` 会运行 `start-all.js`，同时启动：

- `proxy-server.js`：抓包解析服务，默认端口 `8787`
- `maturity-server.js`：好友成熟时间服务，默认端口 `8790`

统一主页：

```text
http://127.0.0.1:8787/
```

单独调试：

```bash
npm run proxy
npm run maturity
```

## 主要文件

```text
start-all.js          一体启动入口
proxy-server.js       抓包代理、证书、WebSocket 解析、SSE 事件流
proxy.html            原抓包解析和变异查看页面
js/main.js            proxy.html 的前端逻辑
maturity-server.js    成熟时间入库、调度队列、本地 API
maturity.html         好友成熟时间和摘取任务页面
lib/maturity.js       成熟时间计算、土地标准化
lib/farm-db.js        sql.js SQLite 持久化层
proto/                Protobuf 协议文件
data/Plant.json       作物配置
```

## 数据流

1. 游戏客户端通过本地代理连接目标 WebSocket。
2. `proxy-server.js` 使用 protobuf 解码消息。
3. 解析到 `VisitService.Enter` / `PlantService.AllLands` 等土地数据后，发布到 `/api/stream` SSE。
4. `maturity-server.js` 连接 `http://127.0.0.1:8787/api/stream`。
5. 好友农场事件写入 `.farm-parse/farm-maturity.db`。
6. `maturity.html` 通过 `/api/maturity/*` 查询好友、土地、成熟时间、任务和日志。

## 数据库设计

数据库由 `lib/farm-db.js` 使用 `sql.js` 创建，文件默认在：

```text
.farm-parse/farm-maturity.db
```

主要表：

- `friends`：好友信息，`gid` 是主键，名称只用于展示。
- `friend_lands`：好友土地和作物快照，主键是 `(friend_gid, land_id)`。
- `harvest_tasks`：根据成熟时间生成的摘取任务。
- `automation_commands`：给视觉自动化程序轮询的本地命令队列。
- `automation_profiles`：后续保存好友列表点击位置等视觉配置。
- `automation_logs`：本地调度和辅助程序日志。

## 成熟时间计算

代码在 `lib/maturity.js`。

优先使用作物 phases 里 `phase = 6` 的 `begin_time` 作为成熟时间。

如果数据包缺少成熟阶段，则回退为：

```text
首阶段 begin_time + grow_sec
```

不要用前端时间推断替代服务端时间字段，只能在缺失字段时 fallback。

## 视觉调度规则

当前策略在 `maturity-server.js`：

1. 距成熟 5 分钟时，排队 `visit_friend` 命令，要求视觉程序访问好友并停留，触发抓包刷新成熟时间。
2. 如果刷新后成熟时间变化，旧任务会被标记为 `outdated`。
3. 距成熟 1 分钟时，排队 `harvest_loop` 命令，要求视觉程序在好友农场连续点击收取坐标。
4. 视觉程序完成后任务标记为 `harvested`，稍后回访该好友刷新新的成熟时间。

## 本地 API

成熟时间服务提供：

```text
GET  /api/maturity/status
POST /api/maturity/scheduler/toggle
GET  /api/maturity/friends
GET  /api/maturity/friends/:gid
GET  /api/maturity/friends/:gid/lands
GET  /api/maturity/tasks
POST /api/maturity/tasks/:id/mark
GET  /api/maturity/commands/next
POST /api/maturity/commands/:id/complete
GET  /api/maturity/profiles/:gid
POST /api/maturity/profiles/:gid
GET  /api/maturity/logs
POST /api/maturity/logs
```

## 开发约束

1. 不要在新功能中直接向游戏服务器发送游戏请求。
2. 好友唯一标识必须使用 `gid`，不要用名称作为主键。
3. 名称搜索可以模糊匹配，但数据保存和关联必须仍然基于 `gid`。
4. 页面展示可以聚合，但数据库应保留每块土地的独立成熟时间。
5. 同一好友同一作物多块地成熟时间不同，搜索结果展示最早成熟时间，同时保留地块列表。
6. 打包时注意 `pkg.assets` 和 `pkg.scripts`，新增前端文件或 lib 文件需要加入 package.json。
7. `sql.js` 是纯 JS/wasm，适合 pkg；不要轻易换成 native sqlite 包。

## 推荐后续任务

1. 完善 `maturity.html` 的好友名称模糊搜索和作物名称搜索。
2. 增加视觉 helper 的本地配置页面。
3. 增加好友列表坐标校准流程。
4. 增加任务失败重试和人工确认。
5. 增加数据库导出/备份功能。
