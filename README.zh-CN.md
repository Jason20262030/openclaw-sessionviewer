# OpenClaw Session Viewer

[English](./README.en.md) | [简体中文](./README.zh-CN.md)

一个轻量的本地 Web 工具，用于查看 `.openclaw` 下 agent 的 session 存储文件。

## 功能

- 左侧按 `agent -> sessions 文件` 自动树形展示
- 右侧展示 session 的结构化树视图（可折叠）
- 同时提供原始文本视图，便于精准核对
- 支持解析 `.jsonl/.txt/.log` 为 JSONL 结构并统计解析错误

## 启动

```bash
cd /home/jason/openclaw-test/sessionviewer
npm start
```

或直接使用脚本：

```bash
/home/jason/openclaw-test/sessionviewer/start.sh
```

`start.sh` 固定使用 `4588` 端口；若端口被占用，会先尝试结束占用该端口的进程，再启动服务。

默认地址：

- <http://localhost:4588>

## 可选环境变量

- `PORT`：自定义端口
- `OPENCLAW_DIR`：自定义 `.openclaw` 根目录路径（默认 `../.openclaw`）
