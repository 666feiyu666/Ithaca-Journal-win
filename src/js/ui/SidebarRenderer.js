/* src/js/ui/SidebarRenderer.js */
import { Journal } from '../data/Journal.js';
import { UserData } from '../data/UserData.js';
import { ModalManager } from './ModalManager.js';
import { HUDRenderer } from './HUDRenderer.js'; // 引入 HUD 以刷新墨水
import { marked } from '../libs/marked.esm.js';   // 引入 marked 以支持预览

export const SidebarRenderer = {
    currentNotebookId: null, // 当前选中的手记本ID (null 代表顶层目录)
    activeEntryId: null,     // 当前正在编辑/查看的日记ID

    init() {
        // 1. 绑定 + 号按钮事件
        const addBtn = document.getElementById('btn-new-entry');
        if (addBtn) {
            addBtn.onclick = () => this.handleNewEntry();
        }

        // 2. 绑定编辑器内部的所有交互事件 (关键修复：之前缺失的部分)
        this.bindEditorEvents();
        
        // 3. 初始化时如果有数据，默认选中第一条
        const all = Journal.getAll();
        if (all.length > 0 && !this.activeEntryId) {
            this.activeEntryId = all[0].id;
        }

        // 4. 初始渲染编辑器内容
        this.loadActiveEntry();
    },

    /**
     * 绑定编辑器区域的事件 (保存、确认、删除、预览)
     */
    bindEditorEvents() {
        // A. 输入框自动保存
        const editor = document.getElementById('editor-area');
        if (editor) {
            editor.oninput = () => {
                if (this.activeEntryId) {
                    // 1. 更新数据层 (Journal.js 会计算字数变化并更新 UserData)
                    Journal.updateEntry(this.activeEntryId, editor.value);
                    
                    // ✨ 修复：实时刷新 HUD 字数显示
                    // 因为 Journal.updateEntry 可能已经修改了 UserData.totalWords，
                    // 这里必须手动通知 HUD 重新渲染数字。
                    HUDRenderer.updateAll(); 

                    // 2. 更新保存状态提示
                    this.updateSaveStatus("正在保存...", "#666");
                    
                    // 防抖模拟保存完成提示
                    clearTimeout(this._saveTimer);
                    this._saveTimer = setTimeout(() => {
                        this.updateSaveStatus("已自动保存", "#999");
                    }, 800);
                }
            };
        }

        // B. 确认记录按钮
        const btnConfirm = document.getElementById('btn-confirm-entry');
        if (btnConfirm) {
            btnConfirm.onclick = () => this.handleConfirmEntry();
        }

        // C. 删除日记按钮
        const btnDelete = document.getElementById('btn-delete-entry');
        if (btnDelete) {
            btnDelete.onclick = () => this.handleDeleteEntry();
        }

        // D. 预览按钮
        const btnPreview = document.getElementById('btn-toggle-journal-preview');
        if (btnPreview) {
            btnPreview.onclick = () => this.togglePreview();
        }
    },

    updateSaveStatus(msg, color) {
        const el = document.getElementById('save-status');
        if(el) {
            el.innerText = msg;
            el.style.color = color;
        }
    },

    /**
     * 处理确认日记 (获得墨水)
     */
    handleConfirmEntry() {
        if (!this.activeEntryId) return;

        // 调用数据层进行确认
        const isSuccess = Journal.confirmEntry(this.activeEntryId);
        
        if (isSuccess) {
            // 1. 发放奖励
            UserData.addInk(10);
            
            // 🏆【新增埋点】成就：写日记 (First Diary)
            // 只要确认成功，就尝试解锁
            UserData.unlockAchievement('ach_diary');

            // 2. 刷新顶部 HUD (墨水/字数)
            HUDRenderer.updateAll();
            
            // 3. 刷新侧边栏 (更新图标状态)
            this.render(); 
            
            // 4. 刷新按钮状态 (变为不可点)
            const currentEntry = Journal.getAll().find(e => e.id === this.activeEntryId);
            this.updateConfirmButtonState(currentEntry);
            
            HUDRenderer.log("✅ 记忆已确认。墨水 +10ml。");
        } else {
            HUDRenderer.log("这条记忆已经确认过了。");
        }
    },
    /**
     * 处理删除日记
     */
    handleDeleteEntry() {
        if (!this.activeEntryId) return;

        if (confirm("确定要撕毁这一页日记吗？此操作无法撤销。")) {
            // 1. 执行删除
            Journal.deleteEntry(this.activeEntryId);
            HUDRenderer.log("🗑️ 撕毁了一页记忆。");

            // 2. 尝试选中下一条，或者置空
            const remaining = Journal.getAll();
            this.activeEntryId = remaining.length > 0 ? remaining[0].id : null;

            // 3. 刷新界面
            this.render();
            this.loadActiveEntry();
            HUDRenderer.updateAll(); // 字数可能变化
        }
    },

    /**
     * 切换 Markdown 预览模式
     */
    togglePreview() {
        const editor = document.getElementById('editor-area');
        const preview = document.getElementById('editor-preview');
        const btn = document.getElementById('btn-toggle-journal-preview');

        if (!editor || !preview || !btn) return;

        if (preview.style.display === 'none') {
            // 切换到预览
            const rawText = editor.value;
            preview.innerHTML = marked.parse(rawText, { breaks: true });
            preview.style.display = 'block';
            // 隐藏输入框或覆盖它，这里选择覆盖显示的样式
            // 但为了简单，我们通常让 preview 盖在 textarea 上，或者隐藏 textarea
            // css 中 markdown-preview 通常定位在 absolute
            
            btn.innerText = "✏️ 继续编辑";
            btn.style.background = "#333";
        } else {
            // 切换回编辑
            preview.style.display = 'none';
            btn.innerText = "👁️ 预览";
            btn.style.background = "#666";
            editor.focus();
        }
    },

    /**
     * 主渲染入口
     */
    render() {
        if (!this.currentNotebookId) {
            this.renderNotebookList();
        } else {
            this.renderEntryList(this.currentNotebookId);
        }
    },

    /**
     * Level 1: 渲染手记本目录
     */
    renderNotebookList() {
        const listEl = document.getElementById('journal-list');
        const headerEl = document.querySelector('.sidebar-header h4');
        const addBtn = document.getElementById('btn-new-entry');
        
        if (!listEl) return;
        listEl.innerHTML = "";
        
        if (headerEl) headerEl.innerText = "📂 归档系统";
        
        if (addBtn) {
            addBtn.title = "新建日记";
            addBtn.onclick = () => this.handleNewEntry();
        }

        const allEntries = Journal.getAll();

        // 1. 仓库
        const totalCount = allEntries.length;
        this._createFolderItem(listEl, {
            name: "仓库",
            icon: "💾",
            count: totalCount,
            color: "#4e342e",
            onClick: () => {
                this.currentNotebookId = 'REPO_ALL_ID';
                this.render();
            }
        });

        // 2. 日常碎片
        const dailyCount = allEntries.filter(e => {
            return (e.notebookIds && e.notebookIds.includes('nb_daily')) || e.notebookId === 'nb_daily';
        }).length;
        this._createFolderItem(listEl, {
            name: "日常碎片",
            icon: "🧩",
            count: dailyCount,
            color: "#ffa000",
            onClick: () => {
                this.currentNotebookId = 'nb_daily';
                this.render();
            }
        });

        // 3. 用户自定义手记本
        UserData.state.notebooks.forEach(nb => {
            if (nb.id === 'nb_inbox' || nb.id === 'nb_daily') return;
            const count = allEntries.filter(e => {
                return (e.notebookIds && e.notebookIds.includes(nb.id)) || e.notebookId === nb.id;
            }).length;
            this._createCustomNotebookItem(listEl, nb, count);
        });

        // 4. 底部新建按钮
        const createBtn = document.createElement('div');
        createBtn.className = 'list-item';
        createBtn.style.cssText = 'text-align:center; color:#888; margin-top:10px; border:1px dashed #ccc; cursor:pointer;';
        createBtn.innerText = "+ 新建手记本";
        createBtn.onclick = () => this.showNotebookInputModal('create');
        listEl.appendChild(createBtn);
    },

    /**
     * Level 2: 渲染日记列表
     */
    renderEntryList(notebookId) {
        const listEl = document.getElementById('journal-list');
        const headerEl = document.querySelector('.sidebar-header h4');
        const addBtn = document.getElementById('btn-new-entry');
        
        if (!listEl) return;
        listEl.innerHTML = "";

        let entries = [];
        let title = "";

        if (notebookId === 'REPO_ALL_ID') {
            title = "💾 所有记忆";
            entries = Journal.getAll();
        } else if (notebookId === 'INBOX_VIRTUAL_ID') {
            title = "📥 收件箱";
            entries = Journal.getAll().filter(e => !e.notebookIds || e.notebookIds.length === 0);
        } else {
            const nb = UserData.state.notebooks.find(n => n.id === notebookId);
            title = nb ? nb.name : "未知手记";
            entries = Journal.getAll().filter(e => {
                return (e.notebookIds && e.notebookIds.includes(notebookId)) || e.notebookId === notebookId;
            });
        }

        if (headerEl) {
            headerEl.innerHTML = `<span id="btn-back-level" class="nav-back-btn" style="cursor:pointer; margin-right:5px;">⬅️</span> ${title}`;
            const backBtn = document.getElementById('btn-back-level');
            if(backBtn) {
                backBtn.onclick = (e) => {
                    e.stopPropagation(); 
                    this.currentNotebookId = null;
                    this.render();
                };
            }
        }

        if (addBtn) {
            addBtn.title = "在此手记本中新建";
            addBtn.onclick = () => this.handleNewEntry();
        }

        if (entries.length === 0) {
            listEl.innerHTML = `<div style="text-align:center; color:#999; margin-top:20px; font-size:12px;">这里是空的<br>点击右上角 + 添加想法</div>`;
        } else {
            entries.forEach(entry => {
                const btn = document.createElement('div');
                btn.className = 'list-item';
                if (entry.id === this.activeEntryId) btn.classList.add('active');
                
                const statusIcon = entry.isConfirmed ? "✅" : "📝";
                const preview = (entry.content || "").slice(0, 15).replace(/\n/g, ' ') || '新篇章...';
                
                btn.innerHTML = `
                    <div style="display:flex; justify-content:space-between; font-weight:bold; color:#444;">
                        <span>${statusIcon} ${entry.date}</span>
                        <span style="font-size:11px; font-weight:normal; color:#888;">${entry.time || ""}</span>
                    </div>
                    <div style="font-size:12px; color:#666; margin-top:4px; line-height:1.4;">${preview}</div>
                `;
                
                btn.onclick = () => {
                    this.activeEntryId = entry.id;
                    listEl.querySelectorAll('.list-item').forEach(i => i.classList.remove('active'));
                    btn.classList.add('active');
                    this.loadActiveEntry();   
                };
                listEl.appendChild(btn);
            });
        }
    },

    handleNewEntry() {
        const newEntry = Journal.createNewEntry();
        this.activeEntryId = newEntry.id;

        if (this.currentNotebookId && !['REPO_ALL_ID', 'INBOX_VIRTUAL_ID'].includes(this.currentNotebookId)) {
            Journal.toggleNotebook(newEntry.id, this.currentNotebookId);
        } else {
            if (!this.currentNotebookId || this.currentNotebookId === 'REPO_ALL_ID') {
                 this.currentNotebookId = 'INBOX_VIRTUAL_ID';
            }
        }

        this.render();
        this.loadActiveEntry();
        const editor = document.getElementById('editor-area');
        if(editor) editor.focus();
    },

    loadActiveEntry() {
        const editor = document.getElementById('editor-area');
        const tagBar = document.getElementById('entry-tag-bar');
        const preview = document.getElementById('editor-preview');

        // 切换日记时，重置预览状态
        if (preview) preview.style.display = 'none';
        const btnPreview = document.getElementById('btn-toggle-journal-preview');
        if (btnPreview) {
             btnPreview.innerText = "👁️ 预览";
             btnPreview.style.background = "#666";
        }

        if (!this.activeEntryId) {
            if (editor) editor.value = "";
            if (tagBar) tagBar.innerHTML = "";
            return;
        }

        const entry = Journal.getAll().find(e => e.id === this.activeEntryId);
        if (entry) {
            if (editor) editor.value = entry.content;
            this.updateConfirmButtonState(entry);
            this.renderTagBar(entry);
        } else {
            if (editor) editor.value = "";
        }
    },

    renderTagBar(entry) {
        let tagContainer = document.getElementById('entry-tag-bar');
        
        if (!tagContainer) {
            tagContainer = document.createElement('div');
            tagContainer.id = 'entry-tag-bar';
            tagContainer.style.cssText = "padding:10px 15px; border-top:1px solid #eee; background:#f9f9f9; display:flex; flex-wrap:wrap; gap:8px; align-items:center;";
            
            const footer = document.querySelector('.editor-footer');
            if (footer && footer.parentNode) {
                footer.parentNode.insertBefore(tagContainer, footer);
            } else {
                const container = document.querySelector('.editor-container');
                if(container) container.appendChild(tagContainer);
            }
        }

        tagContainer.innerHTML = `<span style="font-size:12px; color:#999; margin-right:5px;">归档至：</span>`;

        UserData.state.notebooks.forEach(nb => {
            const isSelected = entry.notebookIds && entry.notebookIds.includes(nb.id);
            const tag = document.createElement('span');
            
            let iconHtml = nb.icon || '📔';
            if (nb.icon && nb.icon.includes('/')) {
                iconHtml = `<img src="${nb.icon}" style="width:16px; height:16px; object-fit:contain; margin-right:4px;">`;
            }

            tag.innerHTML = `${iconHtml}${nb.name}`;
            tag.style.cssText = "display:inline-flex; align-items:center; font-size:12px; padding:4px 10px; border-radius:15px; cursor:pointer; user-select:none; transition:all 0.2s;";
            
            if (isSelected) {
                tag.style.border = "1px solid #5d4037";
                tag.style.background = "#5d4037";
                tag.style.color = "#fff";
            } else {
                tag.style.border = "1px solid #ddd";
                tag.style.background = "#fff";
                tag.style.color = "#666";
            }
            
            tag.onclick = () => {
                Journal.toggleNotebook(entry.id, nb.id);
                this.renderTagBar(entry);
                if (this.currentNotebookId === nb.id || this.currentNotebookId === 'INBOX_VIRTUAL_ID') {
                     this.render(); 
                }
            };
            
            tagContainer.appendChild(tag);
        });
    },

    updateConfirmButtonState(entry) {
        const btn = document.getElementById('btn-confirm-entry');
        if (!btn) return;

        if (entry.isConfirmed) {
            btn.innerText = "已归档 (墨水已领)";
            btn.style.background = "#ccc";
            btn.style.cursor = "default";
            btn.disabled = true; 
        } else {
            btn.innerText = "✅ 确认记录 (+10 墨水)";
            btn.style.background = "#5d4037"; 
            btn.style.cursor = "pointer";
            btn.disabled = false;
        }
    },

    _createFolderItem(container, { name, icon, count, color, onClick }) {
        const div = document.createElement('div');
        div.className = 'list-item notebook-folder';
        div.style.borderLeft = `4px solid ${color}`;
        div.style.display = "flex"; 
        div.style.justifyContent = "space-between";
        div.style.alignItems = "center";

        div.innerHTML = `
            <div style="display:flex; align-items:center; overflow:hidden;">
                <span class="nb-icon-emoji">${icon}</span>
                <span class="nb-name">${name}</span>
            </div>
            <span class="nb-count">${count}</span>
        `;
        div.onclick = onClick;
        container.appendChild(div);
    },

    _createCustomNotebookItem(container, nb, count) {
        const div = document.createElement('div');
        div.className = 'list-item notebook-folder'; 
        div.style.cssText = 'position:relative; display:flex; justify-content:space-between; align-items:center;';
        
        let iconHtml = '';
        if (nb.icon && nb.icon.includes('/')) {
            iconHtml = `<img src="${nb.icon}" class="nb-icon-img">`;
        } else {
            iconHtml = `<span class="nb-icon-emoji">${nb.icon || '📔'}</span>`;
        }

        const leftContent = document.createElement('div');
        leftContent.style.cssText = "display:flex; align-items:center; flex:1; overflow:hidden; margin-right:10px;";
        leftContent.innerHTML = `${iconHtml}<span class="nb-name">${nb.name}</span>`;
        
        const countSpan = document.createElement('span');
        countSpan.className = 'nb-count';
        countSpan.innerText = count;

        const actionsDiv = document.createElement('div');
        actionsDiv.style.cssText = "display:none; gap:5px;";
        
        const btnRename = this._createActionBtn("✏️", "重命名", (e) => {
            this.showNotebookInputModal('rename', nb.id, nb.name);
        });
        const btnDelete = this._createActionBtn("🗑️", "删除手记本", (e) => {
            if (confirm(`确定要删除《${nb.name}》吗？\n\n注意：里面的日记不会被删除，它们仍会保留在“所有记忆”中。`)) {
                if (UserData.deleteNotebook(nb.id)) {
                    this.render(); 
                } else {
                    alert("无法删除此手记本。");
                }
            }
        });

        actionsDiv.appendChild(btnRename);
        actionsDiv.appendChild(btnDelete);

        div.appendChild(leftContent);
        div.appendChild(countSpan);
        div.appendChild(actionsDiv);
        
        div.onmouseenter = () => {
            countSpan.style.display = 'none';
            actionsDiv.style.display = 'flex';
            div.style.background = '#fff8e1';
        };
        div.onmouseleave = () => {
            countSpan.style.display = 'inline-block';
            actionsDiv.style.display = 'none';
            div.style.background = '';
        };

        div.onclick = () => {
            this.currentNotebookId = nb.id; 
            this.render();
        };
        
        container.appendChild(div);
    },

    _createActionBtn(icon, title, onClick) {
        const btn = document.createElement('span');
        btn.innerText = icon;
        btn.title = title;
        btn.style.cssText = "cursor:pointer; font-size:14px; opacity:0.7;";
        btn.onmouseover = () => btn.style.opacity = 1;
        btn.onmouseout = () => btn.style.opacity = 0.7;
        btn.onclick = (e) => {
            e.stopPropagation();
            onClick(e);
        };
        return btn;
    },

    showNotebookInputModal(mode = 'create', targetId = null, currentName = '') {
        const existing = document.getElementById('dynamic-modal-input');
        if (existing) existing.remove();

        const isRename = (mode === 'rename');
        const titleText = isRename ? "重命名手记本" : "新建手记本";
        const btnText = isRename ? "保存修改" : "创建";
        const inputValue = isRename ? currentName : "";
        
        const overlay = document.createElement('div');
        overlay.id = 'dynamic-modal-input';
        overlay.className = 'modal-overlay'; 
        overlay.style.cssText = 'display:flex; z-index:9999;';
        
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.cssText = 'width:320px; text-align:center; background:#fff; padding:20px; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.3); border:2px solid #5d4037;';

        content.innerHTML = `
            <h3 style="margin-top:0; color:#5d4037;">${titleText}</h3>
            <input type="text" id="notebook-input-field" value="${inputValue}" placeholder="请输入名称..." 
                   style="width:100%; padding:10px; margin-bottom:20px; border:1px solid #ddd; border-radius:4px; box-sizing:border-box; font-size:14px;">
            <div style="display:flex; justify-content:flex-end; gap:10px;">
                <button id="btn-cancel-input" style="padding:6px 12px; cursor:pointer; background:#fff; border:1px solid #ccc; border-radius:4px;">取消</button>
                <button id="btn-confirm-input" style="padding:6px 12px; cursor:pointer; background:#5d4037; color:white; border:none; border-radius:4px;">${btnText}</button>
            </div>
        `;

        overlay.appendChild(content);
        document.body.appendChild(overlay);

        const input = content.querySelector('#notebook-input-field');
        const btnCancel = content.querySelector('#btn-cancel-input');
        const btnConfirm = content.querySelector('#btn-confirm-input');

        const close = () => overlay.remove();
        
        const confirmAction = () => {
            const name = input.value.trim();
            if (!name) {
                alert("名称不能为空");
                return;
            }

            if (isRename) {
                UserData.renameNotebook(targetId, name);
            } else {
                UserData.createNotebook(name);
            }
            this.render();
            close();
        };

        btnCancel.onclick = close;
        btnConfirm.onclick = confirmAction;
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter') confirmAction();
            if (e.key === 'Escape') close();
        };

        setTimeout(() => {
            input.focus();
            if(isRename) input.select();
        }, 50);
    }
};