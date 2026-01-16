/* src/js/app.js */
// 1. 引入模块
import { Journal } from './data/Journal.js';
import { UserData } from './data/UserData.js';
import { Library } from './data/Library.js';
import { IntroScene } from './logic/IntroScene.js';
import { TimeSystem } from './logic/TimeSystem.js';
import { DragManager } from './logic/DragManager.js';   
import { UIRenderer } from './ui/UIRenderer.js';
import { StoryManager } from './logic/StoryManager.js';
import { ReviewRenderer } from './ui/ReviewRenderer.js'; // ✨ 新增：引入回顾渲染器


// 2. 程序入口
async function init() {
    console.log("正在启动伊萨卡手记 (Electron)...");
    
    // 等待数据加载
    await Promise.all([
        UserData.init(),
        Library.init(),
        Journal.init()
    ]);

    // 初始化系统逻辑
    TimeSystem.init();
    DragManager.init(); 
    
    // 初始化 UI (现在 UI 内部会自动绑定所有事件)
    UIRenderer.init();

    // ✨ 新增：初始化回顾功能 (绑定左下角按钮事件)
    // 必须在 UIRenderer.init() 之后，确保 DOM 已经就绪
    ReviewRenderer.init();

    // 播放剧情
    IntroScene.init(); 

    // ============================================================
    // ✨ 新增：检查每日剧情事件 (包裹)
    // ============================================================
    // 放在 TimeSystem.init 之后，确保 Day 已经是最新的
    // 放在 IntroScene 之后，防止冲突（通常 IntroScene 只在Day 1触发）
    setTimeout(() => {
        StoryManager.checkDailyEvents();
    }, 1000); // 延迟1秒执行，给界面一点淡入的时间，体验更好
    
    UIRenderer.log("欢迎回家。");
}

// 启动程序
init();
