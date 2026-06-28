# THQ Switch

`THQ Switch` 是为 [sub.tohoqing.com](https://sub.tohoqing.com) 中转站配套开发的专用桌面客户端。

它的目标很简单：让用户不再手动复制 API Key、修改各种配置文件，而是在一个界面里完成登录、注册、查看额度、管理 Key，并把 `sub.tohoqing.com` 的中转配置一键写入本地 AI 工具。

适合已经在使用或准备使用 THQ 中转站的用户，尤其是 Claude Code、Claude Desktop、Codex、Gemini CLI、OpenCode、OpenClaw、Hermes 等工具的日常使用者。

## 你可以用它做什么

- 登录和注册 THQ 中转站账号。
- 发送邮箱验证码并完成账号注册。
- 查看账号余额、用量、订单和模型信息。
- 创建、选择、删除和管理 API Key。
- 将 THQ 中转站配置一键写入本地工具。
- 为 Codex、Claude Code、Claude Desktop、Gemini CLI 等工具配置可用模型。
- 从托盘菜单快速打开客户端、官方网站和常用操作。
- 管理本地工具配置，减少手动编辑 JSON、TOML、环境变量的出错概率。

## 专用服务地址

本客户端默认服务于：

- 官网和账号中心：[https://sub.tohoqing.com](https://sub.tohoqing.com)
- API Base URL：`https://sub.tohoqing.com/v1`

软件内置流程会围绕这个中转站进行登录、注册、验证码、API Key 和本地工具配置写入。

## 支持的平台

- Windows 10 及以上
- macOS 12 及以上
- Linux 主流发行版，例如 Ubuntu、Debian、Fedora

## 下载安装

请到 GitHub Releases 下载最新版：

[下载 THQ Switch 最新版本](../../releases/latest)

### Windows

推荐下载：

- `THQ-Switch-v版本号-Windows.msi`：安装版，适合大多数用户。
- `THQ-Switch-v版本号-Windows-Portable.zip`：便携版，解压后直接运行。

安装版下载后双击运行，根据提示完成安装即可。

### macOS

推荐下载：

- `THQ-Switch-v版本号-macOS.dmg`
- `THQ-Switch-v版本号-macOS.zip`

如果使用 DMG，打开后将应用拖入 `Applications`。如果系统提示来自互联网应用，请在系统设置中允许打开。

### Linux

根据发行版选择：

- `THQ-Switch-v版本号-Linux-x86_64.AppImage`
- `THQ-Switch-v版本号-Linux-x86_64.deb`
- `THQ-Switch-v版本号-Linux-x86_64.rpm`
- `THQ-Switch-v版本号-Linux-arm64.AppImage`
- `THQ-Switch-v版本号-Linux-arm64.deb`
- `THQ-Switch-v版本号-Linux-arm64.rpm`

AppImage 需要先赋予执行权限：

```bash
chmod +x THQ-Switch-*.AppImage
./THQ-Switch-*.AppImage
```

## 第一次使用

1. 打开 THQ Switch。
2. 在登录页输入 `sub.tohoqing.com` 账号邮箱和密码。
3. 如果没有账号，点击“注册账号”。
4. 注册时填写邮箱和密码，点击注册后进入邮箱验证。
5. 点击发送验证码，去邮箱查看验证码。
6. 输入验证码后完成注册。
7. 登录成功后进入 THQ AI Gateway 工作台。

## 常用操作

### 查看账号状态

登录后可以在工作台查看：

- 当前余额
- 使用量统计
- 可用模型
- 订单记录
- API Key 状态

### 创建 API Key

在 API Key 区域创建新的 Key。创建后客户端会选择一个可用 Key，用于写入本地工具配置。

建议给 Key 起一个容易识别的名字，例如：

- `Desktop Client`
- `Codex Local`
- `Claude Code Main`

### 写入本地工具配置

选择要使用的工具，例如 Codex、Claude Code 或 Gemini CLI，然后点击配置到对应工具。

客户端会把 THQ 中转站的 API 地址和 Key 写入本地配置。写入后通常需要重启对应终端或工具，让新配置生效。

### 配置模型映射

部分工具需要先配置模型映射，尤其是 Claude Code 这类对模型名称较敏感的工具。

如果软件提示“请先配置模型映射”，按提示进入编辑页，选择或填写可用模型后再写入工具配置。

### 退出登录

右上角的退出登录按钮会清除本地登录状态。退出后重新打开 THQ Switch 会回到登录页。

## 使用建议

- 注册和发送验证码前，确认邮箱没有多余空格。
- 如果收不到验证码，先检查垃圾邮件箱。
- 修改工具配置后，重启对应 CLI 或终端窗口。
- 如果 API Key 不可用，重新创建一个 Key 后再写入配置。
- 如果网络请求失败，先确认能正常访问 [sub.tohoqing.com](https://sub.tohoqing.com)。

## 截图

### 主界面

![THQ Switch 主界面](https://raw.githubusercontent.com/TouHouQing/sub-switch/main/assets/screenshots/main-zh.png)

### 添加配置

![THQ Switch 添加配置](https://raw.githubusercontent.com/TouHouQing/sub-switch/main/assets/screenshots/add-zh.png)

## 开发者说明

本项目基于 Tauri 2、React、TypeScript 和 Rust 开发。

本地开发：

```bash
pnpm install
pnpm dev
```

类型检查：

```bash
pnpm typecheck
```

运行测试：

```bash
pnpm test:unit
```

本地构建：

```bash
pnpm tauri build
```

## 数据存储

软件会在本机保存必要的配置和缓存数据，用于记录本地工具配置、Key 选择、界面设置等信息。

重要配置写入前会尽量使用安全写入方式，降低配置文件损坏风险。

## 许可证

THQ Switch 使用自定义 Source-Available 许可证。详情见 [LICENSE](LICENSE)。

本项目包含来自上游 CC Switch 的 MIT 许可代码，相关声明保留在 [NOTICE](NOTICE) 和 [LICENSES/CC-SWITCH-MIT.txt](LICENSES/CC-SWITCH-MIT.txt)。
