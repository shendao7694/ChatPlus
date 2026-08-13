# Box3 Chat ++

一个基于 WebSocket 的 Box3 聊天工具，支持多会话管理、实时消息收发和在线用户查看。

## 功能特性

- 多会话管理 - 同时连接多个地图/频道
- 实时消息收发 - 支持 play/edit/world 三种模式
- 在线用户查看 - 实时显示地图内在线用户
- 自动重连 - 断线后自动尝试重连
- Web 界面 - 提供友好的 Web 管理界面
- 命令行交互 - 支持命令行快捷操作
- SSE 事件流 - 实时推送消息和状态更新

## 技术栈

- Node.js
- WebSocket (ws)
- Express.js
- Axios
- Node-RSA

## 快速开始

### 安装依赖

npm install

### 启动项目

npm start

### 首次启动配置

启动后按提示输入：

1. Token - 从 Box3 获取的认证令牌（输入时隐藏）
2. MapID - 地图 ID
3. Mode - 连接模式（play/edit/world）

## 命令行操作

启动后支持以下命令：

| 命令 | 说明 |
|------|------|
| /help | 显示帮助信息 |
| /sessions | 列出所有会话 |
| /active | 显示当前激活的会话 |
| /connect <id> | 切换到指定会话 |
| /create <mapId> <mode> | 创建新会话 |
| /delete <id> | 删除会话 |
| exit | 退出程序 |

示例：

/create 123456 play
/connect 2
/sessions
Hello World!

## Web 界面

启动后访问 http://localhost:25315 即可使用 Web 界面。

### API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /auth/callback | OAuth 认证回调 |
| GET | /api/config | 获取配置 |
| PUT | /api/config | 更新配置 |
| GET | /api/sessions | 获取会话列表 |
| POST | /api/session | 创建会话 |
| PUT | /api/session/:id | 更新会话 |
| DELETE | /api/session/:id | 删除会话 |
| POST | /api/session/switch/:id | 切换会话 |
| GET | /api/session/:id | 获取会话详情 |
| POST | /send | 发送消息 |
| GET | /api/maps | 获取地图列表 |
| GET | /events | SSE 事件流 |

## 连接模式说明

| 模式 | 说明 | 频道 |
|------|------|------|
| play | 游戏模式 | CHAT_MAP_PLAY |
| edit | 编辑模式 | CHAT_MAP_EDIT |
| world | 世界频道 | CHAT_WORLD |

## 配置文件

config.json 结构：

{
  "token": "your_token_here",
  "list": [
    {
      "mapId": "your_mapId",
      "mode": "play | edit | world"
    }
  ]
}

## 注意事项

- Token 需要从 Box3 平台获取
- 不同地图需要不同的 MapID
- 确保网络可以访问 WebSocket 服务器
- 配置文件 config.json 会自动创建

## License

MIT