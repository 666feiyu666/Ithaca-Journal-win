/* src/js/ui/ModalManager.js */

export const ModalManager = {
    // 注册所有的弹窗 ID (这是我们的单一数据源)
    modals: [
        'modal-mailbox', 'modal-letter', 'modal-desk', 
        'modal-bookshelf-ui', 'modal-shop', 'modal-backpack',
        'workbench-modal', 'reader-modal', 'modal-map-selection',
        'modal-create-notebook', 'modal-achievements'
    ],

    init() {
        // 1. 绑定现有的关闭按钮点击事件
        document.querySelectorAll('.btn-close-modal, .close-text-btn, .close-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = btn.closest('.modal-overlay');
                if (modal) this.close(modal.id);
            });
        });
        
        // ✨ 2. 新增：全局 ESC 键监听 (UX优化)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // 阻止默认行为（防止在 Electron 全屏模式下意外退出全屏等）
                e.preventDefault();
                this.closeAll();
            }
        });
    },

    open(modalId) {
        this.closeAll(); // 打开新弹窗前，先关闭其他的
        
        const el = document.getElementById(modalId);
        if (el) {
            el.style.display = 'flex';
            el.classList.remove('hidden'); 
        } else {
            console.warn(`[ModalManager] 找不到弹窗 ID: ${modalId}`);
        }
    },

    close(modalId) {
        const el = document.getElementById(modalId);
        if (el) el.style.display = 'none';
    },

    // 🔧 修复：重构 closeAll 方法
    // 不再依赖脆弱的 class 或 ID 前缀选择器，而是直接遍历注册表
    closeAll() {
        // 1. 遍历上方定义的 modals 数组，精准关闭
        this.modals.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
                el.classList.add('hidden');
            }
        });

        // 2. 额外处理：如果还有未注册的遗留 UI (如装修界面)，也可以在这里补刀
        const decoHud = document.getElementById('decoration-hud');
        if (decoHud && decoHud.style.display !== 'none') {
            const closeBtn = document.getElementById('btn-close-deco');
            if (closeBtn) closeBtn.click(); // 👈 模拟点击，安全退出
        }
        // 注意：装修模式通常需要通过 DragManager.toggleMode(false) 退出，
        // 这里直接隐藏可能会导致状态不一致，建议暂不强制关闭装修 HUD，
        // 或者调用 DragManager (如果为了解耦，暂且只处理弹窗)。
        
        // 3. 额外处理：地图界面 (因为它通常不算 modal，但也需要被 ESC 关闭)
        const mapScene = document.getElementById('scene-map');
        if (mapScene && mapScene.style.display !== 'none') {
            // 这里我们模拟点击“关闭/回房间”的逻辑
            // 更好的做法是调用 UIRenderer.toggleMap(false)，但为了避免循环引用，我们手动操作 DOM
            mapScene.style.display = 'none';
            const room = document.getElementById('scene-room');
            if (room) room.style.display = 'block';
        }
    }
};