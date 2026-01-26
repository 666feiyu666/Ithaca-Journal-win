/* src/js/ui/UIRenderer.js - The Facade (指挥官) */
import { StoryManager } from '../logic/StoryManager.js';
import { SidebarRenderer } from './SidebarRenderer.js';
import { RoomRenderer } from './RoomRenderer.js';
import { HUDRenderer } from './HUDRenderer.js';
import { BookshelfRenderer } from './BookshelfRenderer.js';
import { WorkbenchRenderer } from './WorkbenchRenderer.js';
import { ModalManager } from './ModalManager.js';
import { AchievementRenderer } from './AchievementRenderer.js';

export const UIRenderer = {
    // ================= 初始化 =================
    init() {
        console.log("正在初始化 UI 子系统...");

        // 1. 初始化各个子模块
        ModalManager.init();
        HUDRenderer.init();
        SidebarRenderer.init();
        RoomRenderer.init();
        BookshelfRenderer.init();
        WorkbenchRenderer.init();
        AchievementRenderer.init();

        // 2. 绑定全局场景切换事件 (如：回家)
        this.bindGlobalEvents();

        // 3. 初始渲染
        this.updateStatus(); // 刷新 HUD
        SidebarRenderer.render();
        RoomRenderer.render();
    },

    // ================= 全局 API =================
    
    // 供各个模块调用，统一刷新状态 (墨水、日期、信箱红点)
    updateStatus() {
        HUDRenderer.updateAll();
    },

    // 简单的日志工具 (委托给 HUD 或直接操作 DOM)
    log(msg) {
        HUDRenderer.log(msg);
    },

    // 代理 DragManager 的渲染请求
    renderRoomFurniture() {
        // 让 RoomRenderer 重新根据数据画家具
        RoomRenderer.render();
    },

    renderInventoryBar() {
        // 让 RoomRenderer 刷新底部物品栏（更新数量/库存）
        RoomRenderer.renderInventoryBar();
    },

    // ================= 场景控制 =================
    
    bindGlobalEvents() {
        // 全局回家按钮
        const btnHome = document.getElementById('btn-icon-home');
        if (btnHome) {
            btnHome.onclick = () => this.returnHome();
        }
    },

    returnHome() {
        // 1. 关闭所有弹窗
        ModalManager.closeAll();

        // 2. 处理场景切换
        const cityScene = document.getElementById('scene-city');
        
        if (cityScene !== 'none') {
            StoryManager.returnHome(); // 从地图回房间
        } else {
            this.log("已经在房间里了。");
        }
    }
};
