<div align="center">

# 栖屿 · AuraNav

**极简·高颜值·多用户·云端跨设备个人导航工作台**

[![Version](https://img.shields.io/badge/version-1.2.1-blue.svg)](https://hub.docker.com/r/kuangru52/auranav)
[![Docker Image](https://img.shields.io/badge/docker-kuangru52%2Fauranav-brightgreen.svg)](https://hub.docker.com/r/kuangru52/auranav)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

</div>

---

## 🌟 项目简介

**AuraNav（栖屿）** 是一款极简、高颜值、轻量级且功能强大的个人导航与云端工作台系统。支持毛玻璃视觉自定义、一键高颜值色彩主题、多搜索引擎动态切换、实时时钟与公农历显示、全网多源壁纸轮播、移动端像素级自适应排版，以及基于 Docker 环境变量的多用户安全隔离架构。

---

## ✨ 核心特色功能

- 💎 **毛玻璃视觉与高度自定义**：支持卡片背景高斯模糊、不透明度、圆角弧度、高光边框以及边距距离自由调配。
- 🎨 **一键高颜值配色方案**：内置 **马卡龙色系**、**莫兰蒂色系**、**赛博霓虹**、**冰岛北欧**、**日落暖阳**、**翡翠森林** 等，点击一次即可为全屏卡片批量换一套主题色彩！
- 💧 **一键恢复极简透明**：支持点击“一键透明”随时还原为原版极简通透毛玻璃风格。
- 🕒 **顶栏实时时钟与公农历日期**：
  - **时钟**：秒级跳动高精时钟，可自定义字号与颜色；
  - **日期**：完整展示年月日、星期以及**精准农历（如 丙午年八月廿四）**，可自定义样式；
  - 手机屏下自动隐藏，保持移动端简约。
- 🌐 **居中搜索引擎与引擎切换**：
  - 支持 **百度、必应 (Bing)、Google、搜狗、GitHub** 等搜索引擎随时一键切换；
  - 采用悬浮居中绝对定位，搜索框开启时不挤压、不推移分类标签位置。
- 📱 **极致移动端适配**：
  - 手机端强制每行 2 列自适应，卡片比例与图标绝不变形；
  - 顶部 Logo、右侧菜单按钮与下方卡片网格 **100% 像素级对齐**；
  - 消除高斯模糊滚动时的文本重影问题；
  - 移动端下壁纸选择网格自动展开填充屏宽。
- 👥 **多用户安全隔离与管理员控制**：
  - 支持部署参数 `ADMIN_USER` 与 `ADMIN_PASSWORD` 动态设定管理员，管理员账号页面只读锁定，防误改；
  - 管理员可后台一键创建与删除普通账号；
  - **不同账号数据完全隔离**（每个账号拥有专属的云端与本地同步存储文件）。
- 🖼️ **全网多源壁纸与自动轮播**：
  - 整合 **Bing 每日壁纸、Unsplash 多分类高清图库、Lorem Picsum、LoremFlickr** 及本地壁纸管理；
  - 支持 `🔄` 一键转圈批量换一批壁纸；
  - 支持自定义秒数多选壁纸自动轮播。

---

## 🚀 Docker 快速部署

### 方法 1：Docker Run 命令行启动（推荐）

```bash
docker run -d \
  --name auranav \
  -p 5173:5173 \
  -e ADMIN_USER=admin \
  -e ADMIN_PASSWORD=admin123 \
  -v $(pwd)/data:/app/data \
  --restart unless-stopped \
  kuangru52/auranav:latest
```

### 方法 2：Docker Compose 部署

新建 `docker-compose.yml` 文件：

```yaml
version: '3.8'

services:
  auranav:
    image: kuangru52/auranav:latest
    container_name: auranav
    ports:
      - "5173:5173"
    environment:
      - ADMIN_USER=admin          # 管理员用户名
      - ADMIN_PASSWORD=admin123    # 管理员密码
    volumes:
      - ./data:/app/data          # 数据持久化目录
    restart: unless-stopped
```

运行命令启动：

```bash
docker-compose up -d
```

启动后在浏览器访问：`http://你的服务器IP:5173`

---

## 🔑 默认账号与登录

- **管理员用户名**：`admin`（可通过环境变量 `ADMIN_USER` 修改）
- **管理员密码**：`admin123`（可通过环境变量 `ADMIN_PASSWORD` 修改）

---

## 🛠️ 本地开发与构建

如需进行本地二次开发：

```bash
# 1. 克隆项目
git clone https://github.com/kuangru52/auranav.git
cd auranav

# 2. 安装依赖
npm install

# 3. 启动本地开发服务
npm run dev

# 4. 打包构建
npm run build
```

---

## 💬 交流社群与联系方式

- **作者**：`kuangru52`
- **Docker Hub 仓库**：[kuangru52/auranav](https://hub.docker.com/r/kuangru52/auranav)
- **QQ 交流群**：`1027610757`
- **Telegram 群组**：[https://t.me/+FFEviJJq9GkyOWFl](https://t.me/+FFEviJJq9GkyOWFl)

---

## 📄 开源协议

本项目基于 [MIT License](LICENSE) 协议开源。
