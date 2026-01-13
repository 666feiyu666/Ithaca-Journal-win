/* src/js/ui/HUDRenderer.js */
import { UserData } from '../data/UserData.js';
import { MailManager } from '../logic/MailManager.js';
import { Shop } from '../logic/Shop.js';
import { CityEvent } from '../logic/CityEvent.js';
import { StoryManager } from '../logic/StoryManager.js';
import { ModalManager } from './ModalManager.js';
import { WorkbenchRenderer } from './WorkbenchRenderer.js'; 
import { SidebarRenderer } from './SidebarRenderer.js'; // 修复：引入 SidebarRenderer
import { Library } from '../data/Library.js';

export const HUDRenderer = {
    init() {
        this.bindToolbarEvents();
    },

    updateAll() {
        const { day, ink, totalWords } = UserData.state;
        this.setText('day-display-room', day);
        this.setText('ink-display-room', ink);
        this.setText('word-display-room', totalWords);

        this.updateMailboxStatus();
    },

    // 单独更新墨水（供商店购买后调用）
    updateInk() {
        const { ink } = UserData.state;
        this.setText('ink-display-room', ink);
        // 如果商店开着，也更新商店里的显示
        const shopInk = document.getElementById('shop-ink-display');
        if(shopInk) shopInk.innerText = ink;
    },

    setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.innerText = val;
    },

    // ✨ 核心修改：日志 + 弹窗反馈
    log(msg) {
        console.log(`[Log] ${msg}`); // 1. 控制台留档

        // 2. 尝试写入日志框（如果有的话，比如在写作台侧边栏）
        const box = document.getElementById('log-box');
        if (box) {
            const div = document.createElement('div');
            div.innerHTML = `<span style="color:#999; font-size:12px;">[${new Date().toLocaleTimeString()}]</span> ${msg}`;
            div.style.borderBottom = "1px dashed #eee";
            box.prepend(div);
        }

        // 3. ✨ 触发屏幕下方的 Toast 弹窗（给猫咪互动用）
        this.showToast(msg);
    },

    // ✨ 新增：显示 Toast 弹窗
    showToast(msg) {
        const toast = document.getElementById('global-toast');
        if (!toast) return;

        // 设置内容（允许 HTML，比如加粗）
        toast.innerHTML = msg;
        
        // 显示
        toast.classList.remove('hidden');
        
        // 清除旧定时器（防止连续点击闪烁）
        if (this._toastTimer) clearTimeout(this._toastTimer);

        // 3秒后自动淡出
        this._toastTimer = setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    },
    
    bindToolbarEvents() {
        // 1. 商店
        this._bindClick('btn-icon-shop', () => {
            ModalManager.open('modal-shop');
            const inkDisplay = document.getElementById('shop-ink-display');
            if(inkDisplay) inkDisplay.innerText = UserData.state.ink;
            Shop.render();
        });

        // 2. 地图
        this._bindClick('btn-icon-map', () => {
            ModalManager.open('modal-map-selection');
            CityEvent.renderSelectionMenu();
        });

        // 3. 日志 (修复核心逻辑)
        this._bindClick('btn-icon-journal', () => {
            // 旧逻辑：尝试点击不存在的 hotspot-desk
            // 新逻辑：直接打开界面并渲染侧边栏
            ModalManager.open('modal-desk');
            SidebarRenderer.render();
        });

        // 4. [修复] 工作台/书本图标 (打开写作出版界面)
        this._bindClick('btn-icon-workbench', () => {
            ModalManager.open('workbench-modal');
            WorkbenchRenderer.render();
        });

        // 5. 背包
        this._bindClick('btn-icon-backpack', () => this.renderBackpack(true));

        // 6. 主题切换
        this._bindClick('btn-icon-theme', (e) => this.toggleTheme(e.currentTarget));

        // 7. 重置
        this._bindClick('btn-icon-reset', () => this.handleReset());
    },

    // --- 信箱逻辑 ---
    updateMailboxStatus() {
        const newMail = MailManager.checkNewMail();
        const redDot = document.getElementById('mail-red-dot');
        const btn = document.getElementById('btn-mailbox');
        
        if (btn) btn.onclick = () => this.openMailbox();
        if (redDot) redDot.style.display = newMail ? 'flex' : 'none';
    },

    openMailbox() {
        ModalManager.open('modal-mailbox');
        const grid = document.getElementById('mailbox-grid');
        if(!grid) return;
        
        grid.innerHTML = "";
        MailManager.getMailArchive().forEach(item => {
            const el = document.createElement('div');
            el.className = `mail-grid-item ${item.type!=='letter'?'locked':''} ${!item.isRead?'unread':''}`;
            el.innerHTML = `<div class="mail-info-box"><div class="mail-title">${item.type==='letter'?item.title:'???'}</div><div class="mail-day">Day ${item.day}</div></div>`;
            if(item.type==='letter') {
                el.onclick = () => this.openLetter(item);
            }
            grid.appendChild(el);
        });
    },

    openLetter(data) {
        ModalManager.open('modal-letter');
        const body = document.getElementById('letter-view-body');
        const title = document.getElementById('letter-view-title');
        
        // 渲染信件内容
        if(body) body.innerHTML = data.content.replace(/\n/g, '<br>');
        if(title) title.innerText = data.title;

        // ✨ 确认这一段逻辑是生效的：
        const closeBtn = document.getElementById('btn-close-letter');
        
        if (closeBtn) {
            closeBtn.onclick = () => {
                // 1. 关闭弹窗
                ModalManager.close('modal-letter');
                
                // 2. 核心：通知 MailManager 信件已关闭，触发读后感逻辑
                MailManager.onCloseMail(data.day);
                
                // 3. 刷新红点
                this.updateMailboxStatus();
            };
        }
    },

    // --- 背包逻辑 ---
    renderBackpack(showModal = false) {
        if(showModal) {
            ModalManager.open('modal-backpack');
            const emptyEl = document.getElementById('bp-detail-empty');
            const contentEl = document.getElementById('bp-detail-content');
            if(emptyEl) emptyEl.style.display = 'block';
            if(contentEl) contentEl.style.display = 'none';
        }
        
        const grid = document.getElementById('backpack-grid');
        if(!grid) return;
        grid.innerHTML = "";
        
        const fragments = UserData.state.fragments || [];
        if (fragments.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#ccc; margin-top:40px;">背包空空如也</div>`;
            return;
        }

        fragments.forEach(fid => {
             const info = StoryManager.getFragmentDetails(fid);
             if(!info) return;
             const d = document.createElement('div'); 
             d.className='bp-slot';
             d.innerHTML = `<img src="${info.icon}">`;
             d.onclick = () => {
                 document.getElementById('bp-detail-content').style.display = 'block';
                 document.getElementById('bp-detail-empty').style.display = 'none';
                 
                 const descEl = document.getElementById('bp-detail-desc');
                 const titleEl = document.getElementById('bp-detail-title');
                 const imgEl = document.getElementById('bp-detail-img');
                 
                 if(descEl) descEl.innerText = info.content;
                 if(titleEl) titleEl.innerText = info.title;
                 if(imgEl) imgEl.src = info.icon;
             };
             grid.appendChild(d);
        });
    },

    // --- 杂项 ---
    toggleTheme(btn) {
        const roomBg = document.querySelector('.room-background');
        if (roomBg) {
            roomBg.classList.toggle('night-mode');
            const isNight = roomBg.classList.contains('night-mode');
            this.log(isNight ? "🌙 夜深了，世界安静了下来。" : "☀️ 天亮了，又是新的一天。");
            
            if (isNight) {
                btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
            } else {
                btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
            }
        }
    },

    // 🔄 修改：重置逻辑 (Game Reset)
    handleReset() {
        // 更新提示文案，让玩家放心书籍和日记是安全的
        if (confirm("⚠️ 确定要重置【房间布置】和【游戏进度】吗？\n\n（注意：您的【书籍收藏】和【日记内容】会保留，不会被删除。）")) {
             // 1. 重置内存中的状态
             UserData.state = { 
                 day: 1, 
                 ink: 0, 
                 totalWords: 0, // 进度重置
                 draft: "", 
                 inventory: [], 
                 layout: undefined, 
                 readMails: [], 
                 notebooks: [] 
             };
             
             // 2. 保存 UserData
             UserData.save(); 

             alert("♻️ 世界已重建。");
             window.location.reload();
        }
    },

    _bindClick(id, handler) {
        const el = document.getElementById(id);
        if (el) el.onclick = handler;
    }
};