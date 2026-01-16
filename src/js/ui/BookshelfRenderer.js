/* src/js/ui/BookshelfRenderer.js */
import { Library } from '../data/Library.js';
import { UIRenderer } from './UIRenderer.js'; // 用于显示 Log
import { ModalManager } from './ModalManager.js';
import { marked } from '../libs/marked.esm.js';

export const BookshelfRenderer = {
    currentBookId: null,

    init() {
        this.bindEvents();
    },

    bindEvents() {
        // 绑定阅读器内部的交互按钮
        this._bindClick('btn-delete-book', () => this.handleDeleteBook());
        this._bindClick('btn-edit-book', () => this.toggleEditMode(true));
        this._bindClick('btn-cancel-edit', () => this.toggleEditMode(false));
        this._bindClick('btn-save-book', () => this.handleSaveBook());
    },

    /**
     * 主渲染函数：强制渲染为两排
     */
    render() {
        const container = document.getElementById('bookshelf');
        if (!container) return;
        
        container.innerHTML = "";
        
        // 1. 获取并分类书籍
        const allBooks = Library.getAll();
        
        // 第一排：玩家创作 (非只读，非神秘)
        const row1Books = allBooks.filter(b => !b.isReadOnly && !b.isMystery);
        
        // 第二排：系统/剧情书籍 (只读 或 神秘)
        const row2Books = allBooks.filter(b => b.isReadOnly || b.isMystery);

        // 2. 排序逻辑：确保第二排的系统书按顺序排列 (I, II, III, IV)
        row2Books.sort((a, b) => {
            if (a.id < b.id) return -1;
            if (a.id > b.id) return 1;
            return 0;
        });

        // 3. 渲染第一排 (上层)
        this.renderRow(container, row1Books, {
            minHeight: '130px', // 保证即使没书也有高度
            borderBottom: '12px solid #8d6e63', // 木板隔层效果
            paddingBottom: '0px',
            alignItems: 'flex-end' // 书籍底部对齐
        });

        // 4. 渲染第二排 (下层)
        this.renderRow(container, row2Books, {
            minHeight: '130px',
            paddingTop: '15px',
            alignItems: 'flex-end'
        });

        // 渲染右下角的丢弃按钮
        this.renderTrashButton();
    },

    /**
     * 辅助函数：渲染单行书架
     */
    renderRow(container, books, styleOptions = {}) {
        const rowDiv = document.createElement('div');
        
        // 基础样式
        rowDiv.style.cssText = `
            display: flex;
            flex-wrap: wrap; /* 如果一行放不下，自动换行 */
            gap: 15px;
            padding-left: 10px;
            padding-right: 10px;
            width: 100%;
            box-sizing: border-box;
        `;

        // 应用传入的自定义样式
        Object.assign(rowDiv.style, styleOptions);

        if (books.length === 0) {
            // 如果这一排没书，可以留白，或者显示淡淡的提示
            // rowDiv.innerHTML = `<div style="color:rgba(0,0,0,0.1); font-size:12px; margin:auto;">此处空置</div>`;
        } else {
            books.forEach(book => {
                const item = this.createBookElement(book);
                rowDiv.appendChild(item);
            });
        }

        container.appendChild(rowDiv);
    },

    /**
     * 创建单本书的 DOM
     */
    createBookElement(book) {
        const div = document.createElement('div');
        div.className = 'book-item-container'; 
        
        div.style.cssText = `
            width: 80px; 
            cursor: pointer; 
            transition: all 0.2s;
            flex-shrink: 0;
            position: relative;
            margin-bottom: 5px; /* 书籍底部留一点空隙 */
        `;
        
        // 特效处理
        if(book.isMystery) {
            div.style.filter = "drop-shadow(0 0 3px gold)";
        }

        div.onmouseover = () => {
            div.style.transform = "translateY(-5px) scale(1.05)";
            div.style.zIndex = "10";
        };
        div.onmouseout = () => {
            div.style.transform = "translateY(0) scale(1)";
            div.style.zIndex = "1";
        };
        
        // 书籍封面与标题
        div.innerHTML = `
            <img src="${book.cover || 'assets/images/booksheet/booksheet1.png'}" class="book-cover-img" style="width:100%; height:auto; display:block; border-radius: 2px; box-shadow: 3px 3px 6px rgba(0,0,0,0.3);">
            <div class="book-title-text" style="
                text-align: center; 
                font-size: 12px; 
                margin-top: 6px; 
                color: #5d4037; 
                line-height: 1.2;
                overflow: hidden; 
                text-overflow: ellipsis; 
                display: -webkit-box; 
                -webkit-line-clamp: 2; 
                -webkit-box-orient: vertical;
                font-family: serif;
            ">${book.title}</div>
        `;
        
        div.onclick = () => this.openBook(book);
        return div;
    },

    /**
     * 渲染右下角的“丢弃书籍”按钮
     */
    renderTrashButton() {
        const layout = document.querySelector('.bookshelf-layout');
        if (!layout) return;

        // 确保容器定位上下文
        layout.style.position = 'relative'; 

        // 防止重复添加
        if (document.getElementById('btn-bookshelf-trash')) return;

        const btn = document.createElement('button');
        btn.id = 'btn-bookshelf-trash';
        btn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle; margin-right:4px;">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            <span style="vertical-align:middle;">丢弃书籍</span>
        `;
        
        // 样式：绝对定位到右下角
        btn.style.cssText = `
            position: absolute; 
            bottom: 20px; 
            right: 20px; 
            background: rgba(211, 47, 47, 0.1); 
            color: #d32f2f; 
            border: 1px solid #d32f2f; 
            padding: 6px 12px; 
            border-radius: 20px; 
            cursor: pointer; 
            font-size: 12px;
            transition: all 0.2s;
            z-index: 10;
        `;

        btn.onmouseover = () => btn.style.background = 'rgba(211, 47, 47, 0.2)';
        btn.onmouseout = () => btn.style.background = 'rgba(211, 47, 47, 0.1)';

        btn.onclick = () => {
            // 虽然没有实现，xs
            if (confirm("🗑️ 确定要丢弃所有书籍吗？\n（系统指南和重要道具会保留，其他书籍将无法找回。）")) {
                Library.reset();
                this.render(); // 立即刷新界面
                UIRenderer.log("🗑️ 书架已清空。");
            }
        };

        layout.appendChild(btn);
    },

    /**
     * 打开阅读器
     */
    openBook(book) {
        console.log("正在打开书籍:", book.title, "ID:", book.id, "只读:", book.isReadOnly);

        // 1. 更新当前 ID
        this.currentBookId = book.id;
        
        // 2. 强制重置为“阅读模式”
        this.toggleEditMode(false);

        ModalManager.open('reader-modal');
        
        // 3. 填充阅读内容 (支持 Markdown)
        const titleEl = document.getElementById('reader-title');
        const contentEl = document.getElementById('reader-text');
        if(titleEl) titleEl.innerText = book.title;
        if(contentEl) contentEl.innerHTML = marked.parse(book.content);

        // 4. 获取控制按钮
        const btnDelete = document.getElementById('btn-delete-book');
        const btnEdit = document.getElementById('btn-edit-book');

        // 5. 🔒 只读逻辑判断 (Strict Check)
        if (book.isReadOnly === true) {
            // 只读模式：强力隐藏编辑与删除
            if(btnDelete) btnDelete.style.setProperty('display', 'none', 'important');
            if(btnEdit)   btnEdit.style.setProperty('display', 'none', 'important');
        } else {
            // 编辑模式：恢复显示
            if(btnDelete) btnDelete.style.display = 'inline-block';
            if(btnEdit)   btnEdit.style.display = 'inline-block';
            
            // 预填充编辑框数据
            const titleInput = document.getElementById('reader-title-input');
            const contentInput = document.getElementById('reader-content-input');
            if(titleInput) titleInput.value = book.title;
            if(contentInput) contentInput.value = book.content;
        }
    },

    /**
     * 切换 编辑/阅读 模式
     */
    toggleEditMode(isEdit) {
        // 安全检查：防止通过控制台强制开启编辑
        if (isEdit) {
            const currentBook = Library.getAll().find(b => b.id === this.currentBookId);
            if (currentBook && currentBook.isReadOnly) {
                console.warn("阻止进入编辑模式：书籍是只读的");
                return; 
            }
        }

        const viewMode = document.getElementById('reader-view-mode');
        const editMode = document.getElementById('reader-edit-mode');
        const btnEdit = document.getElementById('btn-edit-book');
        
        if(viewMode) viewMode.style.display = isEdit ? 'none' : 'block';
        if(editMode) editMode.style.display = isEdit ? 'flex' : 'none';
        
        // 按钮显隐逻辑
        if(btnEdit) {
            if (!isEdit) {
                 // 如果退出了编辑模式，且书不是只读的，把编辑按钮显示回来
                 const currentBook = Library.getAll().find(b => b.id === this.currentBookId);
                 if (currentBook && !currentBook.isReadOnly) {
                     btnEdit.style.display = 'inline-block';
                 }
            } else {
                // 进入编辑模式后，隐藏“进入编辑”按钮（因为已经在了）
                btnEdit.style.display = 'none';
            }
        }
    },

    /**
     * 保存书籍更改
     */
    handleSaveBook() {
        const id = this.currentBookId;
        const newTitle = document.getElementById('reader-title-input').value;
        const newContent = document.getElementById('reader-content-input').value;

        if (!newTitle || !newContent) return alert("内容不能为空");

        // 调用数据层更新
        const success = Library.updateBook(id, newTitle, newContent);
        
        if (success) {
            // 刷新阅读器显示
            document.getElementById('reader-title').innerText = newTitle;
            document.getElementById('reader-text').innerHTML = marked.parse(newContent, {breaks:true});
            
            this.render(); // 刷新书架上的封面标题
            this.toggleEditMode(false);
            UIRenderer.log(`已修订书籍：《${newTitle}》`);
        } else {
            alert("保存失败：该书籍不可编辑。");
        }
    },

    /**
     * 删除单本书籍
     */
    handleDeleteBook() {
        if (!this.currentBookId) return;
        
        if (confirm("确定要销毁这本书吗？")) {
            // 调用 removeBook 并检查返回值
            const success = Library.removeBook(this.currentBookId);
            
            if (success) {
                UIRenderer.log("销毁了一本书籍。");
                ModalManager.close('reader-modal');
                this.render(); // 刷新书架列表
            } else {
                alert("无法销毁：可能是系统书籍或数据出错。");
            }
        }
    },

    _bindClick(id, handler) {
        const el = document.getElementById(id);
        if (el) el.onclick = handler;
    }
};