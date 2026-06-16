# Farm Parse 桌面端

桌面端基于 Electron，用于把现有本地服务包成一个可双击打开的桌面应用，并提供系统通知。

## 功能

- 双击打开桌面应用后，自动启动本地后端服务。
- 自动打开成熟时间页面：`http://127.0.0.1:8787/maturity.html`。
- 关闭窗口时不会退出，窗口会隐藏到托盘。
- 托盘菜单支持：
  - 打开成熟时间页
  - 发送桌面测试通知
  - 退出
- 桌面通知会复用成熟提醒配置里的：
  - 推送间隔
  - 推送窗口
  - 指定好友
  - 指定作物
- 不做开机自启，全部手动启动和退出。

## 本地开发运行

```bash
npm install
npm run desktop
```

## 打包

Windows：

```bash
npm run desktop:win
```

macOS：

```bash
npm run desktop:mac
```

也可以只生成未安装目录包用于检查完整性：

```bash
npm run desktop:pack
```

打包产物输出到：

```text
dist-desktop/
```

## 说明

- 桌面端没有开机自启。
- 若窗口被关闭，应用会继续在托盘运行并继续提醒。
- 真正退出需要从托盘菜单点击“退出”。
- 手机提醒仍然使用 PushPlus；电脑本地提醒使用 Electron 系统通知。
