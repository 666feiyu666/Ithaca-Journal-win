# 🍍 The Ithaca Journal | 伊萨卡手记
![Version](https://img.shields.io/badge/version-1.0.0-blueviolet) ![Status](https://img.shields.io/badge/status-In%20Development-orange) ![Electron](https://img.shields.io/badge/Electron-28.0-9cf) ![License](https://img.shields.io/badge/license-MIT-green)

---

## 📖 关于本项目 (About)
![Ithaca Room](assets/images/room/room_goal.png)

**《伊萨卡手记》** 是一款融合了**叙事理论**与**游戏化机制**的桌面端日记应用。

在这个被碎片化信息裹挟的数字时代，我们试图为你构建一个虚拟的“精神避难所”。这不仅仅是一个支持 Markdown 的文本编辑器，更是一场为期 21天 的奥德赛——通过书写，重构自我叙事，找到生活的节奏。

在这里，你既是记录生活的 **书写者**，也是探索故事的 **玩家**。

### ✨ 核心特性 

* **✍️ 沉浸式写作体验**：
    * **心流模式**：无干扰的写作界面，支持 Markdown 语法。
    * **墨水经济**：字数积累转化为“墨水能量”。每一滴墨水都算数，用来解锁家具、领养宠物，以及发现一些散落在角落的神秘碎片。
* **🏠 你的伊萨卡（房间系统）**：
    * **动态空间**：随时间变化的虚拟房间，从最初的空荡荡到充满生活气息。
    * **写作闭环**：写作台不仅是书写的地方，更实现了从“碎片日记”到“整理笔记”再到“出版书籍”的完整闭环逻辑。
    * **书架+信箱**：这里收藏着你的所有作品，也是你接收神秘“系统来信”的窗口。
* **📅 21天习惯养成**：
    * **习惯周期** 基于心理学的 21 天周期设计，每天解锁不同的信件与指引。
    * **深度探索**：从“叙事与自我”到“叙事与社会”，各种主题，层出不穷。
    * **终极奖励**：坚持完成 21 天的游戏剧情，将会收获一份独一无二的 “神秘礼物”！
* **🏙️ 城市漫游 (计划在2.0完成)**：
    * **街头散步**：去虚拟的城市街道散散步，给繁忙的现实生活放放松。
    * **意外发现**：在便利店、公园、地铁站收集神秘碎片，也有可能获得独特纪念品。
* **🧩 叙事合成 (计划在2.0完成)**：
    * **碎片收集**：留心收集散落在城市各处的神秘碎片。
    * **重组与解谜**：将碎片重组，可能还原出前任房客的故事，你可能会还原出前任房客尘封的故事，并触发一些意想不到的小彩蛋！
---

## 🛠️ 技术栈 (Tech Stack)

本项目基于 **Electron** 框架构建。

* **Core**: Electron (Main/Renderer Process)
* **Frontend**: HTML5, CSS3 (Grid/Flexbox), Vanilla JavaScript (ES6+)
* **Data Persistence**: Node.js File System (fs) & LocalStorage
* **Markdown Engine**: `marked.js`

---

## 🚀 快速开始 (Getting Started)

如果你想在本地运行这个房间，请按照以下步骤操作：

### 1. 环境准备
确保你的电脑上安装了 [Node.js](https://nodejs.org/) (建议 v16+)。

### 2. 获取代码
```bash
git clone [https://github.com/your-username/ithaca-journal.git](https://github.com/your-username/ithaca-journal.git)
cd ithaca-journal
```

### 3. 安装依赖
```bash
npm install
```

### 4. 启动伊萨卡
```bash
npm start
```

目前项目仍在开发中，主要正在完善以下模块：

[ ] 故事主线的打磨

[ ] 故事支线的撰写

[ ] 城市探索

[ ] 美术设计（房间、书籍封面、各个功能界面）

[ ] 导出故事为 PDF 功能

[ ] 回收站

如果你对叙事理论或独立游戏开发感兴趣，欢迎提交 Issue 或 PR！