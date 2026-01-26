/* src/js/ui/BookshelfRenderer.js */
import { Library } from '../data/Library.js';
import { UIRenderer } from './UIRenderer.js'; 
import { ModalManager } from './ModalManager.js';
import { marked } from '../libs/marked.esm.js';

export const BookshelfRenderer = {
    currentBookId: null,
    isTrashMode: false, // ✨ 状态标记：当前是否在查看回收站

    init() {
        this.bindEvents();
        
        // 绑定书架打开按钮
        const btnOpen = document.getElementById('btn-open-bookshelf');
        if (btnOpen) {
            btnOpen.onclick = () => {
                // 每次打开书架时，默认重置为正常视图
                this.isTrashMode = false;
                ModalManager.open('bookshelf-modal');
                this.render();
            };
        }

        // 绑定关闭按钮 (防止 HTML 中没有绑定)
        const closeBtn = document.querySelector('#bookshelf-modal .close');
        if(closeBtn) {
            closeBtn.onclick = () => ModalManager.close('bookshelf-modal');
        }
    },

    bindEvents() {
        this._bindClick('btn-delete-book', () => this.handleDeleteBook());
        this._bindClick('btn-edit-book', () => this.toggleEditMode(true));
        this._bindClick('btn-cancel-edit', () => this.toggleEditMode(false));
        this._bindClick('btn-save-book', () => this.handleSaveBook());
        this._bindClick('btn-export-book', () => this.handleExportBook());
    },

    /**
     * 主渲染函数
     */
    render() {
        // 兼容性查找：优先找 content 容器，找不到找老容器
        const container = document.getElementById('bookshelf-content') || document.getElementById('bookshelf');
        if (!container) return; 
        
        container.innerHTML = "";
        
        // 1. 渲染顶部工具栏 (显示标题 + 切换按钮)
        this.renderToolbar(container);

        // 2. 根据模式分发渲染逻辑
        if (this.isTrashMode) {
            this.renderTrashView(container);
        } else {
            this.renderNormalView(container);
        }
    },

    /**
     * 渲染顶部工具栏
     */
    renderToolbar(container) {
        const toolbar = document.createElement('div');
        toolbar.style.cssText = "width:100%; display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; padding:0 5px; box-sizing:border-box;";

        // 更新 Modal 标题
        const titleEl = document.querySelector('#bookshelf-modal h2');
        if (titleEl) {
            titleEl.innerText = this.isTrashMode ? "🗑️ 废纸篓" : "📚 我的书架";
        }

        // 左侧占位 (保持布局平衡)
        const leftSpan = document.createElement('span');
        leftSpan.innerText = this.isTrashMode ? "这里存放着被遗弃的文字..." : "";
        leftSpan.style.cssText = "font-size:12px; color:#999; font-style:italic;";

        // 右侧切换按钮
        const toggleBtn = document.createElement('button');
        toggleBtn.innerHTML = this.isTrashMode ? "⬅️ 返回书架" : "🗑️ 查看废纸篓";
        toggleBtn.style.cssText = `
            cursor: pointer; 
            font-size: 12px; 
            color: #555; 
            padding: 5px 12px; 
            border: 1px solid #ddd; 
            border-radius: 15px; 
            background: #f9f9f9;
            transition: all 0.2s;
        `;
        toggleBtn.onmouseover = () => toggleBtn.style.background = "#eee";
        toggleBtn.onmouseout = () => toggleBtn.style.background = "#f9f9f9";
        
        toggleBtn.onclick = () => {
            this.isTrashMode = !this.isTrashMode;
            this.render(); // 切换模式并重绘
        };
        
        toolbar.appendChild(leftSpan);
        toolbar.appendChild(toggleBtn);
        container.appendChild(toolbar);
    },

    /**
     * 渲染正常视图
     */
    renderNormalView(container) {
        const allBooks = Library.getAll(); // 获取所有未删除的书
        
        // 第一排：玩家创作
        const row1Books = allBooks.filter(b => !b.isReadOnly && !b.isMystery);
        // 第二排：系统/剧情书籍
        const row2Books = allBooks.filter(b => b.isReadOnly || b.isMystery);

        // 排序系统书
        row2Books.sort((a, b) => a.id.localeCompare(b.id));

        // 渲染第一排 (上层)
        this.renderRow(container, row1Books, {
            minHeight: '130px', 
            borderBottom: '12px solid #8d6e63', // 木板隔层
            marginBottom: '10px',
            alignItems: 'flex-end' 
        });

        // 渲染第二排 (下层)
        this.renderRow(container, row2Books, {
            minHeight: '130px',
            alignItems: 'flex-end'
        });
    },

    /**
     * 渲染回收站视图
     */
    renderTrashView(container) {
        const trashBooks = Library.getTrash(); // 获取已删除的书

        if (trashBooks.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = "width:100%; text-align:center; color:#ccc; margin-top:60px; font-size:14px;";
            empty.innerHTML = "废纸篓是空的。<br><span style='font-size:12px; margin-top:5px; display:block;'>就像从未写坏过任何故事一样。</span>";
            container.appendChild(empty);
            return;
        }

        // 垃圾桶可以只有一排，或者多排自动换行
        this.renderRow(container, trashBooks, {
            minHeight: '300px',
            alignItems: 'flex-start',
            alignContent: 'flex-start',
            justifyContent: 'flex-start',
            paddingTop: '10px'
        }, true); // isTrashRow = true
    },

    /**
     * 通用行渲染
     */
    renderRow(container, books, styleOptions = {}, isTrashRow = false) {
        const rowDiv = document.createElement('div');
        rowDiv.style.cssText = `
            display: flex;
            flex-wrap: wrap; 
            gap: 20px;
            padding: 0 10px;
            width: 100%;
            box-sizing: border-box;
        `;
        Object.assign(rowDiv.style, styleOptions);

        books.forEach(book => {
            const item = this.createBookElement(book, isTrashRow);
            rowDiv.appendChild(item);
        });

        container.appendChild(rowDiv);
    },

    /**
     * 创建书籍 DOM
     */
    createBookElement(book, isTrashItem = false) {
        const div = document.createElement('div');
        div.className = 'book-item-container'; 
        
        div.style.cssText = `
            width: 80px; 
            cursor: pointer; 
            transition: transform 0.2s;
            flex-shrink: 0;
            position: relative;
            margin-bottom: 5px;
        `;
        
        // 视觉处理
        if(book.isMystery) {
            div.style.filter = "drop-shadow(0 0 5px gold)";
        }
        if (isTrashItem) {
             div.style.filter = "grayscale(100%) opacity(0.7)"; // 灰色+半透明
        }

        // 交互效果
        div.onmouseover = () => {
            div.style.zIndex = "10";
            if (!isTrashItem) {
                // 只有正常书才有跳动效果，垃圾桶里的书显得“死气沉沉”一点
                div.style.transform = "translateY(-5px) scale(1.05)";
            } else {
                div.style.opacity = "1"; // 垃圾桶里的书悬停变亮
            }
        };
        div.onmouseout = () => {
            div.style.zIndex = "1";
            div.style.transform = "translateY(0) scale(1)";
            if (isTrashItem) div.style.filter = "grayscale(100%) opacity(0.7)";
        };
        
        div.innerHTML = `
            <img src="${book.cover || 'assets/images/booksheet/booksheet1.png'}" style="width:100%; display:block; border-radius: 2px; box-shadow: 2px 2px 5px rgba(0,0,0,0.2);">
            <div style="
                text-align: center; font-size: 12px; margin-top: 6px; color: #5d4037; 
                line-height: 1.2; overflow: hidden; text-overflow: ellipsis; 
                display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
                font-family: serif;
            ">${book.title}</div>
        `;
        
        // 点击逻辑
        if (isTrashItem) {
            div.onclick = () => this.handleTrashItemClick(book);
        } else {
            div.onclick = () => this.openBook(book);
        }
        
        return div;
    },

    /**
     * 处理垃圾桶物品点击
     */
    handleTrashItemClick(book) {
        // 自定义样式的确认框可以用 Modal 实现，这里先用 confirm 简单处理
        const choice = confirm(`【${book.title}】\n\n要还原这本书吗？\n[确定] 还原到书架\n[取消] 彻底焚毁 (无法找回)`);
        
        if (choice) {
            Library.restoreBook(book.id);
            UIRenderer.log(`♻️ 已还原：《${book.title}》`);
            this.render(); 
        } else {
            // 这里为了防止误触，可以再加一层确认，或者直接作为焚毁操作
            // 根据 confirm 的逻辑，取消是 false。
            // 如果你想把[取消]作为“什么都不做”，那就不操作。
            // 但根据你的需求“取消可以彻底焚毁”，我们这里做一个二次确认比较安全
            
            if (confirm(`🔥 确定要【彻底焚毁】《${book.title}》吗？此操作不可逆！`)) {
                Library.hardDeleteBook(book.id);
                UIRenderer.log(`🔥 已焚毁：《${book.title}》`);
                this.render();
            }
        }
    },

    /**
     * 打开阅读器
     */
    openBook(book) {
        this.currentBookId = book.id;
        this.toggleEditMode(false);

        ModalManager.open('reader-modal');
        
        const titleEl = document.getElementById('reader-title');
        const contentEl = document.getElementById('reader-text');
        if(titleEl) titleEl.innerText = book.title;
        if(contentEl) contentEl.innerHTML = marked.parse(book.content || "");

        // 按钮状态更新
        const btnDelete = document.getElementById('btn-delete-book');
        const btnEdit = document.getElementById('btn-edit-book');
        const btnExport = document.getElementById('btn-export-book');

        if (book.isReadOnly === true) {
            if(btnDelete) btnDelete.style.display = 'none';
            if(btnEdit)   btnEdit.style.display = 'none';
        } else {
            if(btnDelete) btnDelete.style.display = 'inline-block';
            if(btnEdit)   btnEdit.style.display = 'inline-block';
            
            // 填充编辑框
            const titleInput = document.getElementById('reader-title-input');
            const contentInput = document.getElementById('reader-content-input');
            if(titleInput) titleInput.value = book.title;
            if(contentInput) contentInput.value = book.content;
        }

        if (btnExport) btnExport.style.display = 'inline-block';
    },

    toggleEditMode(isEdit) {
        if (isEdit) {
            const currentBook = Library.getAll().find(b => b.id === this.currentBookId);
            if (currentBook && currentBook.isReadOnly) return; 
        }

        const viewMode = document.getElementById('reader-view-mode');
        const editMode = document.getElementById('reader-edit-mode');
        const btnEdit = document.getElementById('btn-edit-book');
        const btnExport = document.getElementById('btn-export-book');
        
        if(viewMode) viewMode.style.display = isEdit ? 'none' : 'block';
        if(editMode) editMode.style.display = isEdit ? 'flex' : 'none';
        
        if(btnEdit) btnEdit.style.display = isEdit ? 'none' : 'inline-block';
        if(btnExport) btnExport.style.display = isEdit ? 'none' : 'inline-block';
    },

    handleSaveBook() {
        const id = this.currentBookId;
        const newTitle = document.getElementById('reader-title-input').value;
        const newContent = document.getElementById('reader-content-input').value;

        if (!newTitle || !newContent) return alert("内容不能为空");

        const success = Library.updateBook(id, newTitle, newContent);
        
        if (success) {
            document.getElementById('reader-title').innerText = newTitle;
            document.getElementById('reader-text').innerHTML = marked.parse(newContent, {breaks:true});
            this.render(); 
            this.toggleEditMode(false);
            UIRenderer.log(`已修订书籍：《${newTitle}》`);
        } else {
            alert("保存失败：该书籍不可编辑。");
        }
    },

    handleDeleteBook() {
        if (!this.currentBookId) return;
        
        if (confirm("确定要丢弃这本书吗？\n它将被移入废纸篓，稍后可找回。")) {
            const success = Library.removeBook(this.currentBookId); // 软删除
            
            if (success) {
                UIRenderer.log("书籍已移入废纸篓。");
                ModalManager.close('reader-modal');
                this.render(); 
            } else {
                alert("无法丢弃：可能是系统书籍。");
            }
        }
    },

    async handleExportBook() {
        if (!this.currentBookId) return;
        const book = Library.getAll().find(b => b.id === this.currentBookId);
        if (!book) return;

        const exportContent = `# ${book.title}\n\n${book.content}`;
        const safeTitle = book.title.replace(/[\\/:*?"<>|]/g, "_");
        const defaultFilename = `${safeTitle}.md`;

        if (window.ithacaSystem && window.ithacaSystem.exportFile) {
            const result = await window.ithacaSystem.exportFile(defaultFilename, exportContent);
            if (result.success) {
                UIRenderer.log(`✨ 书籍已导出至：${result.path}`);
            } else if (result.message !== '用户取消') {
                alert(`导出失败：${result.message}`);
            }
        } else {
            alert("当前环境不支持导出文件。");
        }
    },

    _bindClick(id, handler) {
        const el = document.getElementById(id);
        if (el) el.onclick = handler;
    }
};