# 好友成熟时间与视觉调度

本模块只消费 `farm-parse` 已经解析出来的 WebSocket 事件，并写入本地 SQLite。它不会直接向游戏服务器发送请求，也不会伪造游戏协议。

## 启动方式

先启动原来的抓包解析服务：

```powershell
npm install
npm start
```

再启动成熟时间服务：

```powershell
npm run maturity
```

打开页面：

```text
http://127.0.0.1:8790/maturity.html
```

## 数据来源

成熟时间服务连接原解析服务的 SSE：

```text
http://127.0.0.1:8787/api/stream
```

当你通过游戏画面访问好友农场时，原解析服务会解析 `VisitService.Enter`，成熟时间服务会把好友与土地写入 `.farm-parse/farm-maturity.db`。

好友以 `gid` 作为主键，名称只做展示。若好友改名，不影响历史数据归属。

## 成熟时间计算

优先读取土地作物 phases 中 `phase = 6` 的 `begin_time` 作为成熟时间。

如果数据包缺少成熟阶段，则回退为：

```text
首阶段 begin_time + grow_sec
```

## 自动调度策略

调度器维护本地命令队列，供外部视觉自动化程序轮询执行：

1. 距成熟 5 分钟时，排队 `visit_friend` 命令，要求视觉程序打开好友农场并停留，触发抓包刷新成熟时间。
2. 如果刷新后成熟时间变化，旧任务会标记为 `outdated`，不会提前摘取。
3. 距成熟 1 分钟时，排队 `harvest_loop` 命令，要求视觉程序在当前好友农场连续点击收取坐标。
4. 视觉程序完成后，任务标记为 `harvested`，稍后调度器会回访这个好友，触发抓包刷新新的成熟时间。

## 本地 API

```text
GET  /api/maturity/status
GET  /api/maturity/friends
GET  /api/maturity/friends/:gid
GET  /api/maturity/tasks?status=active
POST /api/maturity/tasks/:id/mark
GET  /api/maturity/commands/next?worker=visual-helper-1
POST /api/maturity/commands/:id/complete
GET  /api/maturity/profiles/:gid
POST /api/maturity/profiles/:gid
GET  /api/maturity/logs
POST /api/maturity/logs
```

## 视觉自动化接入约定

视觉程序只需要轮询：

```text
GET /api/maturity/commands/next?worker=visual-helper-1
```

如果返回：

```json
{"idle": true}
```

说明暂无任务。

如果返回 `visit_friend`，视觉程序应通过真实屏幕操作打开好友列表、点击目标好友，等待 farm-parse 抓包确认进入了目标 `gid` 的农场，然后回调：

```text
POST /api/maturity/commands/:id/complete
```

如果返回 `harvest_loop`，视觉程序应保持在好友农场，在成熟前最后一分钟开始连续点击收取坐标，完成后回调同一接口。

## 风险提醒

该功能依赖屏幕坐标、游戏窗口尺寸、好友列表排序和网络延迟。建议先关闭自动调度，只观察成熟时间是否准确；确认稳定后再接入视觉程序。
