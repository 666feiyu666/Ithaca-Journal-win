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
        
        // 房间内的“门”热区
        const door = document.getElementById('hotspot-door');
        if (door) {
            door.onclick = () => this.toggleMap(true);
        }

        // 地图上的“回房间” Pin
        const homePin = document.getElementById('hotspot-home-pin');
        if (homePin) {
            homePin.onclick = () => {
                this.toggleMap(false); 
                this.log("逛累了，回到了温馨的房间。");
            };
        }
    },

    returnHome() {
        // 1. 关闭所有弹窗
        ModalManager.closeAll();

        // 2. 处理场景切换
        const mapScene = document.getElementById('scene-map');
        const streetScene = document.getElementById('scene-intro'); 
        
        if (mapScene && mapScene.style.display !== 'none') {
            this.toggleMap(false); // 从地图回房间
        } else if (streetScene && streetScene.style.display !== 'none') {
            StoryManager.returnHome(); // 从剧情回房间
        } else {
            this.log("已经在房间里了。");
        }
    },

    toggleMap(show) {
        const room = document.getElementById('scene-room');
        const map = document.getElementById('scene-map');
        if (room) room.style.display = show ? 'none' : 'block';
        if (map) map.style.display = show ? 'flex' : 'none';
        
        // ✨ 新增逻辑：触发“城市漂流”成就
        if (show) {
             UserData.unlockAchievement('ach_city');
        }

        this.log(show ? "推开门，来到了街道上。" : "回到了房间。");
    }
};
