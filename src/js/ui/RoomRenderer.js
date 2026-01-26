/* src/js/ui/RoomRenderer.js */
import { UserData } from '../data/UserData.js';
import { DragManager } from '../logic/DragManager.js';
import { StoryManager } from '../logic/StoryManager.js';
import { CityEvent } from '../logic/CityEvent.js';
import { ModalManager } from './ModalManager.js';
import { SidebarRenderer } from './SidebarRenderer.js';
import { BookshelfRenderer } from './BookshelfRenderer.js';
import { HUDRenderer } from './HUDRenderer.js';

// 物品配置数据库
const ITEM_DB = {
    'item_desk_default':      { src: 'assets/images/room/desktop.png',   type: 'desk' },
    'item_bookshelf_default': { src: 'assets/images/room/bookshelf.png', type: 'bookshelf' },
    'item_rug_default':       { src: 'assets/images/room/rug1.png',      type: 'rug' },
    'item_chair_default':     { src: 'assets/images/room/chair.png',     type: 'chair' }, 
    'item_bed_default':       { src: 'assets/images/room/bed.png',       type: 'bed' },
    'item_shelf_default':     { src: 'assets/images/room/shelf.png',     type: 'shelf'},
    'item_trash_bin':         { src: 'assets/images/room/trashbin.png',  type: 'bin' },
    'item_plant_01':          { src: 'assets/images/room/plant.png',      type: 'plant' },
    'item_cat_orange':        { src: 'assets/images/room/cat.png',       type: 'cat' },
    'item_cat_house':         { src: 'assets/images/room/cathouse.png', type: 'cathouse' },
    'item_bulletin_board':    { src: 'assets/images/room/bulletinboard.png', type: 'board' },
    'item_bed_shelf':         { src: 'assets/images/room/bedshelf.png', type: 'bedshelf' },
    'item_sofa':              { src: 'assets/images/room/sofa.png',      type: 'sofa' },
    'item_clothing':          { src: 'assets/images/room/clothing.png', type: 'clothing' },
    'item_box':               { src: 'assets/images/room/box.png',      type: 'box' },
};

// 定义哪些 type 属于墙面装饰
const WALL_TYPES = ['shelf','board','bedshelf']; 

// 辅助函数：判断是否为墙面物品
function isWallType(type) {
    return WALL_TYPES.includes(type);
}

export const RoomRenderer = {
    
    init() {
        // 初始化逻辑 (如需)
    },

    /**
     * 主渲染方法：渲染房间内家具 + 底部物品栏
     */
    render() {
        const container = document.querySelector('.iso-room');
        if (!container) return;

        // 1. 清理旧家具
        container.querySelectorAll('.pixel-furniture').forEach(el => el.remove());

        // 2. 获取布局数据并排序
        // 虽然 CSS z-index 会处理遮挡，但 DOM 顺序也很重要，保持 Y 轴排序是个好习惯
        const layout = UserData.state.layout || [];
        const sortedLayout = [...layout].sort((a, b) => a.y - b.y);

        // 3. 生成房间内 DOM
        sortedLayout.forEach(itemData => {
            this.createFurnitureElement(container, itemData);
        });

        // 4. 同时刷新底部物品栏 (Inventory Bar)
        this.renderInventoryBar();
    },

    /**
     * 创建单个家具的 DOM 元素并绑定事件
     */
    createFurnitureElement(container, itemData) {
        const config = ITEM_DB[itemData.itemId];
        if (!config) return;

        const img = document.createElement('img');
        img.src = config.src;
        img.className = 'pixel-furniture';
        img.id = `furniture-${itemData.uid}`;

        img.style.left = itemData.x + '%';
        img.style.top = itemData.y + '%';

        // ============================================================
        // ✨ 核心修复：Z-Index 基于“脚底”位置计算
        // ============================================================
        
        // 1. 获取高度修正值 (将 Z 轴锚点下移到物品底部)
        const heightOffset = this.getZHeightOffset(config.type);
        
        // 2. 基础 Z 值 = Y 坐标 + 高度修正
        // 这样“高个子”椅子(HeightOffset大) 的 Z 值会比“矮个子”垃圾桶(HeightOffset小) 更大
        let baseZ = Math.floor(itemData.y + heightOffset);

        // 3. 特殊覆盖逻辑
        if (config.type === 'rug') {
            baseZ = 10; 
        }
        else if (isWallType(config.type)) {
             baseZ -= 10; 
        }
        else if (config.type === 'cat') {
            baseZ += 200; // 保持猫的高优先级
        }

        img.style.zIndex = baseZ;
        // ============================================================

        const dir = itemData.direction || 1;
        img.style.setProperty('--dir', dir);
        img.style.width = this.getFurnitureWidth(config.type);

        img.onmousedown = (e) => {
            if (DragManager.isDecorating) {
                e.stopPropagation();
                const isWallItem = isWallType(config.type);
                DragManager.startDragExisting(e, itemData.uid, config.src, itemData.direction || 1, isWallItem);
            }
        };

        img.onclick = (e) => {
            e.stopPropagation();
            if (DragManager.isDecorating) return;
            ModalManager.closeAll();
            this.handleFurnitureInteraction(config.type);
        };

        container.appendChild(img);
    },

    // ✨ 新增辅助方法：定义不同物品的“视觉高度”修正值
    getZHeightOffset(type) {
        switch (type) {
            case 'bookshelf': return 25; // 高柜子，修正值最大
            case 'bed':       return 20; 
            case 'desk':      return 18; // 书桌较高
            case 'chair':     return 15; // 椅子中等
            case 'sofa':      return 15;
            case 'cathouse':  return 12;
            case 'plant':     return 8;  
            case 'box':       return 5;
            case 'bin':       return 2;  // 垃圾桶很矮，修正值很小 -> Z值较小 -> 容易被遮挡 (符合预期)
            case 'clothing':  return 20;
            default:          return 5;
        }
    },
    /**
     * 渲染底部物品栏 (Inventory Bar)
     */
    renderInventoryBar() {
        const listEl = document.getElementById('inventory-bar');
        if (!listEl) return;
        
        listEl.innerHTML = "";

        // 统计拥有的物品
        const ownedCounts = {};
        (UserData.state.inventory || []).forEach(itemId => {
            ownedCounts[itemId] = (ownedCounts[itemId] || 0) + 1;
        });

        // 统计已摆放的物品
        const placedCounts = {};
        (UserData.state.layout || []).forEach(item => {
            placedCounts[item.itemId] = (placedCounts[item.itemId] || 0) + 1;
        });

        // 渲染每一个种类的物品槽
        Object.keys(ownedCounts).forEach(itemId => {
            const totalOwned = ownedCounts[itemId];
            const alreadyPlaced = placedCounts[itemId] || 0;
            const availableCount = totalOwned - alreadyPlaced;

            const config = ITEM_DB[itemId];
            if (!config) return;

            const slot = document.createElement('div');
            slot.className = 'inventory-slot';
            
            const img = document.createElement('img');
            img.src = config.src;
            slot.appendChild(img);
            
            if (availableCount > 0) {
                slot.title = `按住拖拽到房间 (剩余: ${availableCount})`;
                // 显示数量角标
                if (availableCount > 1) {
                    const countBadge = document.createElement('span');
                    countBadge.innerText = availableCount;
                    countBadge.style.cssText = "position:absolute; bottom:2px; right:5px; color:white; font-size:12px; font-weight:bold; text-shadow:1px 1px 1px black;";
                    slot.appendChild(countBadge);
                }

                // 绑定拖拽生成新家具事件
                slot.onmousedown = (e) => {
                    const roomEl = document.querySelector('.iso-room');
                    const roomWidth = roomEl ? roomEl.offsetWidth : 1000;
                        
                    let widthPercent = 0.15;
                    const widthStr = this.getFurnitureWidth(config.type);
                    if(widthStr.includes('%')) widthPercent = parseFloat(widthStr) / 100;
                        
                    const targetWidth = roomWidth * widthPercent;
                        
                    const isWallItem = isWallType(config.type);

                    DragManager.startDragNew(
                        e, 
                        itemId, 
                        config.src, 
                        targetWidth, 
                        isWallItem 
                     );
                };
            } else {
                // 如果用光了，变灰
                slot.style.opacity = '0.4';
                slot.style.cursor = 'default';
                slot.title = "已全部摆放";
            }
            listEl.appendChild(slot);
        });
    },

    /**
     * 处理家具点击交互
     */
    handleFurnitureInteraction(type) {
        switch (type) {
            case 'desk':
            case 'chair':
            case 'board':
            case 'bin': 
                ModalManager.open('modal-desk');
                SidebarRenderer.render(); 
                break;

            case 'bookshelf':
                const isStoryTriggered = StoryManager.tryTriggerBookshelfStory();
                if (!isStoryTriggered) {
                    ModalManager.open('modal-bookshelf-ui');
                    BookshelfRenderer.render();
                }
                break;

            case 'rug':
                ModalManager.open('modal-map-selection');
                CityEvent.renderSelectionMenu();
                break;

            case 'bed':
            case 'bedshelf':
                if (confirm("是否要退出伊萨卡手记？\n(退出前会自动保存进度)")) {
                    UserData.save(); 
                    window.close(); 
                }
                break;

            case 'cat': 
                HUDRenderer.log("你摸了摸你的橘猫。它舒服地呼噜了两声。");
                const catEl = document.querySelector('.pixel-furniture[src*="cat.png"]');
                if(catEl) {
                    catEl.style.transform = "scaleX(var(--dir)) translateY(-10px)";
                    setTimeout(() => {
                        catEl.style.transform = "scaleX(var(--dir)) translateY(0)";
                    }, 200);
                }
                break;
            
            case 'shelf':
                ModalManager.open('modal-backpack');
                if (HUDRenderer && HUDRenderer.renderBackpack) {
                    HUDRenderer.renderBackpack();
                } else {
                    console.warn("未找到 HUDRenderer.renderBackpack 方法，背包可能为空");
                }
                break;

            case 'cathouse':  
                HUDRenderer.log("你发呆地看着猫窝，为什么它不喜欢待在猫窝里呢？");
                break;

            case 'box': 
                HUDRenderer.log("你整理了一下房间，心情也变好了一点。");
                break;

            case 'plant': 
                HUDRenderer.log("你给你的绿植浇了一些水。它看起来更精神了。");
                break;

            case 'sofa': 
                HUDRenderer.log("你坐在沙发上，感到一阵放松。");
                break;

            case 'clothing': 
                HUDRenderer.log("你整理了一下衣物，感觉整洁多了。");
                break;

            default:
                break;
        }
    },

    getFurnitureWidth(type) {
        switch (type) {
            case 'desk':      return '20%';
            case 'bookshelf': return '14%';
            case 'shelf':     return '12%';
            case 'rug':       return '25%';
            case 'chair':     return '12%';
            case 'cat':       return '8%';
            case 'cathouse':  return '12%';
            case 'bed':       return '32%';
            case 'board':     return '15%';
            case 'bin':       return '6%';
            case 'bedshelf':  return '15%';
            case 'sofa':      return '15%';
            case 'clothing':  return '6%';
            case 'plant':     return '8%';
            default:          return '8%';
        }
    }
};