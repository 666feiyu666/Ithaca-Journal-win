/* src/js/ui/AchievementRenderer.js */
import { UserData, ACHIEVEMENTS } from '../data/UserData.js';

export const AchievementRenderer = {
    init() {
        // 绑定按钮点击事件 (稍后在 HTML 添加按钮)
        const btn = document.getElementById('btn-show-achievements');
        if (btn) {
            btn.onclick = () => this.openModal();
        }

        // 监听解锁事件，触发弹窗
        window.addEventListener('achievement-unlocked', (e) => {
            this.showToast(e.detail);
        });
        
        // 顺便绑定一下关闭按钮（如果有的话），防止弹窗无法关闭
        const closeBtn = document.querySelector('#modal-achievements .close');
        if (closeBtn) {
            closeBtn.onclick = () => {
                document.getElementById('modal-achievements').style.display = 'none';
            };
        }
    },

    // 打开成就面板
    openModal() {
        const modal = document.getElementById('modal-achievements');
        const list = document.getElementById('achievement-list');
        
        if (!modal || !list) return;

        // ============================================================
        // ✨ 修复：添加滚动样式
        // ============================================================
        // 1. 限制高度：设置为视口高度的 60%，留出头部和底部的空间
        list.style.maxHeight = '60vh'; 
        // 2. 开启滚动：内容超出时显示垂直滚动条
        list.style.overflowY = 'auto';
        // 3. 优化体验：增加一点右内边距，防止滚动条遮挡文字
        list.style.paddingRight = '10px';
        
        list.innerHTML = ''; // 清空旧内容

        // 遍历所有定义的成就
        Object.keys(ACHIEVEMENTS).forEach(key => {
            const config = ACHIEVEMENTS[key];
            const isUnlocked = UserData.hasAchievement(key);
            
            const item = document.createElement('div');
            item.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
            
            // 保持原有的 HTML 结构
            item.innerHTML = `
                <div class="ach-icon">${isUnlocked ? config.icon : '🔒'}</div>
                <div class="ach-info">
                    <div class="ach-title">${config.title}</div>
                    <div class="ach-desc">${config.desc}</div>
                </div>
                ${isUnlocked ? '<div class="ach-check">✓</div>' : ''}
            `;
            list.appendChild(item);
        });

        modal.style.display = 'block';
    },

    // 显示 Steam 风格的弹窗
    showToast(achId) {
        const config = ACHIEVEMENTS[achId];
        if (!config) return;

        // 创建 DOM 结构
        const toast = document.createElement('div');
        toast.className = 'achievement-toast';
        toast.innerHTML = `
            <div class="toast-icon">${config.icon}</div>
            <div class="toast-content">
                <div class="toast-head">成就解锁</div>
                <div class="toast-body">${config.title}</div>
            </div>
        `;

        // 添加到页面
        document.body.appendChild(toast);

        // 动画逻辑：进入 -> 停留 -> 消失
        // CSS 动画会自动处理进入，这里只需要负责定时移除
        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 4000); // 4秒后消失
    }
};