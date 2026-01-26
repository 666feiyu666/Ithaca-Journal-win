/* src/js/logic/DragManager.js */
import { UserData } from '../data/UserData.js';
import { UIRenderer } from '../ui/UIRenderer.js';

// 网格大小 (影响吸附精度，2.5 代表将房间分为 40x40 的网格)
const GRID_SIZE = 2.5; 

export const DragManager = {
    isDecorating: false,
    draggedItem: null, // 当前正在拖的东西 { type, itemId/uid, ... }
    ghostEl: null,     // 跟随鼠标的幻影图片 (不吸附)
    markerEl: null,    // 地板上的落地光标 (吸附网格)
    currentDirection: 1, // ✨ 当前朝向 (1: 正向, -1: 翻转)

    init() {
        // 绑定装修开关按钮
        const btnOpen = document.getElementById('btn-icon-deco');
        const btnClose = document.getElementById('btn-close-deco');
        
        // 👇👇👇 修改开始：增加场景检查 👇👇👇
        if (btnOpen) btnOpen.onclick = () => {
            const room = document.getElementById('scene-room');
            
            // 检查房间是否可见
            // 如果房间的 display 是 'none'，说明你现在肯定在街景、地图或剧情里
            if (room && window.getComputedStyle(room).display === 'none') {
                // 🚫 阻止启动，并给出提示
                if (typeof UIRenderer !== 'undefined') {
                    UIRenderer.log("❌ 出门在外，无法装修房间。");
                } else {
                    alert("出门在外，无法装修房间！请先回家。");
                }
                return; 
            }

            // ✅ 如果在房间里，才允许启动
            this.toggleMode(true);
        };
        if (btnClose) btnClose.onclick = () => this.toggleMode(false);

        // 全局鼠标事件监听
        document.addEventListener('mousemove', (e) => this.onMouseMove(e));
        document.addEventListener('mouseup', (e) => this.onMouseUp(e));

        // ✨ 监听 R 键旋转
        document.addEventListener('keydown', (e) => {
            if (this.isDecorating && this.draggedItem && e.code === 'KeyR') {
                this.rotateGhost();
            }
        });

        // 初始化时创建光标元素 (默认隐藏)
        this.createMarker();
    },

    // 创建落地光标 DOM
    createMarker() {
        const room = document.querySelector('.iso-room');
        if (room && !this.markerEl) {
            this.markerEl = document.createElement('div');
            this.markerEl.className = 'landing-marker';
            room.appendChild(this.markerEl);
        }
    },

    // 切换装修模式
    toggleMode(active) {
        this.isDecorating = active;
        
        const hud = document.getElementById('decoration-hud');
        const room = document.querySelector('.iso-room');
        
        if (active) {
            hud.style.display = 'block';
            room.classList.add('decorating');
            UIRenderer.renderInventoryBar(); // 渲染背包条
            
            // 确保光标存在
            if (!this.markerEl) this.createMarker();
        } else {
            hud.style.display = 'none';
            room.classList.remove('decorating');
            this.showMarker(false); // 退出时隐藏光标
        }
    },

    // 显示/隐藏光标
    showMarker(show) {
        if (this.markerEl) {
            this.markerEl.style.display = show ? 'block' : 'none';
        }
    },

    // 旋转逻辑
    rotateGhost() {
        this.currentDirection *= -1; 
        if (this.ghostEl) {
            // 强制应用变换
            this.ghostEl.style.transform = `scaleX(${this.currentDirection})`;
            // 可选：添加日志调试
            console.log("旋转! 当前方向:", this.currentDirection);
        }
    },
    
    // --- 1. 开始拖拽 (从背包拿新家具) ---
    // targetWidth: 从 UIRenderer 传入的预期像素宽度
    startDragNew(e, itemId, imgSrc, targetWidth, isWallItem) {
        if (!this.isDecorating) return;
        e.preventDefault();

        // 👇 修改点：把 isWallItem 存进去
        this.draggedItem = { type: 'new', itemId: itemId, isWallItem: isWallItem };
        this.currentDirection = 1; 
        
        this.createGhost(e.clientX, e.clientY, imgSrc, targetWidth);
        this.showMarker(true);
    },
    // --- 2. 开始拖拽 (移动房间里已有的家具) ---
    // 🔧 修复：接收 initialDirection 参数，防止拿起时方向重置
    startDragExisting(e, uid, imgSrc, initialDirection = 1, isWallItem) {
        if (!this.isDecorating) return;
        e.preventDefault();
        e.stopPropagation(); 

        const el = document.getElementById(`furniture-${uid}`);
        const currentWidth = el ? el.offsetWidth : 100;
        
        if (el) el.style.opacity = '0.3'; 

        // 👇 修改点：把 isWallItem 存进去
        this.draggedItem = { type: 'existing', uid: uid, element: el, isWallItem: isWallItem };
        this.currentDirection = initialDirection; 
        
        this.createGhost(e.clientX, e.clientY, imgSrc, currentWidth);
        this.showMarker(true);
    },

    // 创建跟随鼠标的幻影 (Ghost)
    createGhost(x, y, src, width) {
        this.ghostEl = document.createElement('img');
        this.ghostEl.src = src;
        this.ghostEl.className = 'dragging-ghost';
        
        // 强制设置宽度，保持视觉一致
        if (width) this.ghostEl.style.width = width + 'px';
        
        // ✨ 初始化方向
        this.ghostEl.style.transform = `scaleX(${this.currentDirection})`;
        
        this.updateGhostPos(x, y);
        document.body.appendChild(this.ghostEl);
    },

    // 更新 Ghost 位置 (跟随鼠标，中心对齐脚底)
    updateGhostPos(x, y) {
        if (this.ghostEl) {
            this.ghostEl.style.left = (x - this.ghostEl.offsetWidth / 2) + 'px';
            this.ghostEl.style.top = (y - this.ghostEl.offsetHeight) + 'px';
        }
    },

    // --- 核心算法：计算网格吸附后的百分比坐标 ---
    calculateSnappedPos(clientX, clientY) {
        const roomEl = document.querySelector('.iso-room');
        if (!roomEl) return null;
        const roomRect = roomEl.getBoundingClientRect();

        // Ghost 的尺寸用于校准光标中心
        const ghostW = this.ghostEl ? this.ghostEl.offsetWidth : 0;
        const ghostH = this.ghostEl ? this.ghostEl.offsetHeight : 0;

        // 1. 计算原始百分比 (基于鼠标位置，修正到家具脚底中心)
        let rawX = ((clientX - roomRect.left - (ghostW / 2)) / roomRect.width) * 100;
        let rawY = ((clientY - roomRect.top - ghostH) / roomRect.height) * 100;

        // 2. 网格吸附
        let snappedX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
        let snappedY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;

        return { x: snappedX, y: snappedY, roomRect: roomRect };
    },

    // --- 核心判定：检查位置状态 (Valid/Recycle/Invalid) ---
    checkPositionStatus(e, pos) {
        // 1. 检查是否在底部黑色物品栏 (回收区)
        const hudEl = document.querySelector('.inventory-bar-container');
        if (hudEl) {
            const hudRect = hudEl.getBoundingClientRect();
            if (e.clientX >= hudRect.left && e.clientX <= hudRect.right &&
                e.clientY >= hudRect.top && e.clientY <= hudRect.bottom) {
                return 'recycle';
            }
        }

        // 2. 检查有效区域
        if (pos) {
            // ✨ 新增逻辑：如果是墙面物品，使用矩形判定
            if (this.draggedItem && this.draggedItem.isWallItem) {
                // === 墙面物品判定逻辑 ===
                
                // 1. 基础边界限制 (防止拖出屏幕左右)
                if (pos.x < 2 || pos.x > 98) return 'invalid';

                // 2. 地板边界限制 (防止拖到地板上)
                if (pos.y > 100) return 'invalid';

                // 3. ✨ 核心修改：计算动态天花板 (V字形判定) ✨
                // ----------------------------------------------------
                const centerX = 50; // 房间中线 X 坐标
                const roofTop = 0;  // 墙角最高点 (y) -> 你想挂的高处
                
                // 斜率因子：数值越大，两侧天花板下降得越厉害
                const slope = 0.45; 

                // 计算当前 x 坐标对应的“合法天花板高度”
                // 离中心越远，allowedTop 数值越大 (位置越低)
                const currentCeilingY = roofTop + (Math.abs(pos.x - centerX) * slope);

                // 如果当前鼠标 y 比天花板还高 (即数值更小)，则无效
                if (pos.y < currentCeilingY) {
                    return 'invalid';
                }

                // 4. (可选) 如果只想限制在左墙
                // if (pos.x > 50) return 'invalid'; 

                return 'valid';
            }
            else {
                // ✨ 原有逻辑：地面物品，保持菱形判定
                
                // 中心点(50, 65)，宽半径45，高半径35
                const centerX = 50;   
                const centerY = 65;   
                const rangeX = 45;    
                const rangeY = 35;    

                // 计算曼哈顿距离公式: |dx|/Rx + |dy|/Ry <= 1
                const dist = Math.abs(pos.x - centerX) / rangeX + Math.abs(pos.y - centerY) / rangeY;

                // 地板阈值 1.5
                if (dist <= 1.5) {
                    return 'valid';
                }
            }
        }

        // 3. 既不在回收区，也不在合法区域 -> 无效
        return 'invalid';
    },

    // --- 3. 拖拽中 (视觉反馈) ---
    onMouseMove(e) {
        if (!this.draggedItem || !this.ghostEl) return;

        // A. 移动 Ghost (丝滑跟随，不吸附)
        this.updateGhostPos(e.clientX, e.clientY);

        // B. 计算吸附位置
        const pos = this.calculateSnappedPos(e.clientX, e.clientY);
        if (!pos) return;

        // C. 判定状态
        const status = this.checkPositionStatus(e, pos);

        // D. 更新光标 (Marker) 位置和颜色
        if (this.markerEl) {
            // 设置光标位置 (使用吸附后的坐标)
            // 🔧 光标下沉逻辑：对齐脚底
            const ghostHeightPercent = (this.ghostEl.offsetHeight / pos.roomRect.height) * 100;
            const markerHeightPercent = (40 / pos.roomRect.height) * 100; // 40px 是 CSS 高度
            
            const markerTop = pos.y + ghostHeightPercent - markerHeightPercent + 2;
            
            this.markerEl.style.left = pos.x + '%';
            this.markerEl.style.top = markerTop + '%';
            
            // 动态调整光标大小 (可选，设为家具宽度的 80%)
            this.markerEl.style.width = (this.ghostEl.offsetWidth * 0.8) + 'px';

            // 根据状态切换样式
            if (status === 'valid') {
                this.markerEl.className = 'landing-marker'; // 🟢 绿色光标
                this.ghostEl.style.opacity = '1';
            } else {
                this.markerEl.className = 'landing-marker invalid'; // 🔴 红色光标
                this.ghostEl.style.opacity = '0.5'; // 虚化 ghost 表示不可放
            }
        }
    },

    // --- 4. 放置 (松开鼠标) ---
    onMouseUp(e) {
        if (!this.draggedItem) return;

        const pos = this.calculateSnappedPos(e.clientX, e.clientY);
        const status = this.checkPositionStatus(e, pos);

        console.log(`放置判定: ${status} (x:${pos.x}, y:${pos.y}, dir:${this.currentDirection})`);

        if (status === 'recycle') {
            // === 情况 A: 回收 ===
            if (this.draggedItem.type === 'existing') {
                UserData.removeFurniture(this.draggedItem.uid);
                UIRenderer.log("🗑️ 家具已收回背包。");
            } else {
                UIRenderer.log("取消放置。");
            }
        } 
        else if (status === 'valid') {
            // === 情况 B: 成功放置 ===
            if (this.draggedItem.type === 'new') {
                UserData.placeFurniture(this.draggedItem.itemId, pos.x, pos.y, this.currentDirection);
                
                // 🏆【新增埋点】成就：安家
                // 只有从背包拿出新家具摆放时才算“装修”
                UserData.unlockAchievement('ach_home'); 
            } else {
                UserData.updateFurniture(this.draggedItem.uid, pos.x, pos.y, this.currentDirection);
            }
        }
        else {
            // === 情况 C: 无效区域 ===
            // 既不合法也不在回收区，取消操作，弹回原位
            if (this.draggedItem.type === 'existing') {
                UIRenderer.log("🚫 位置无效，已归位。");
            }
        }

        // 清理现场
        if (this.ghostEl) this.ghostEl.remove();
        if (this.draggedItem.element) this.draggedItem.element.style.opacity = '1'; // 恢复原物体显示
        this.showMarker(false); // 隐藏光标
        
        this.draggedItem = null;
        this.ghostEl = null;

        // 刷新渲染，确保背包数量和房间显示同步
        UIRenderer.renderRoomFurniture();
        UIRenderer.renderInventoryBar();
    }
};