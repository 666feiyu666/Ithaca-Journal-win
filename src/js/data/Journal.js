/* src/js/data/Journal.js */
import { UserData } from './UserData.js';
import { StoryManager } from '../logic/StoryManager.js';

export const Journal = {
    entries: [], 

    // 初始化：从本地文件加载数据
    async init() {
        const saved = await window.ithacaSystem.loadData('journal_data.json');
        if (saved) {
            this.entries = JSON.parse(saved);
        }
        
        // 兼容性处理：把旧的单字段 notebookId 迁移到 notebookIds 数组
        this.entries.forEach(entry => {
            if (!entry.notebookIds) {
                entry.notebookIds = [];
                // 如果有旧的归属，迁移过来；否则保持为空（归入默认收件箱）
                if (entry.notebookId) {
                    entry.notebookIds.push(entry.notebookId);
                }
            }
        });

        // 如果完全没有日记（第一次运行），默认建一篇
        if (this.entries.length === 0) {
            this.createNewEntry();
        }
    },

    // ✨ 修改：新建日记逻辑
    // 既然是“先记录，后归类”，新建时默认为空数组，即属于 Inbox
    createNewEntry() {
        const now = new Date();
        const dateStr = now.toLocaleDateString(); 
        const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        const newEntry = {
            id: Date.now(),
            // 🛡️ 核心修复：必须记录这篇日记是属于哪一天的！
            // 如果 UserData 还没加载完，默认就是第 1 天
            day: UserData.state.day || 1, 
            
            date: dateStr,
            time: timeStr,
            content: "", 
            isConfirmed: false,
            savedWordCount: 0,
            notebookIds: [] 
        };
        
        this.entries.unshift(newEntry); 
        this.save();
        return newEntry;
    },
    // ✨ 核心新增：切换归属状态 (Toggle)
    // 供 UI 层的“标签栏”调用：点一下加进去，再点一下移出来
    toggleNotebook(entryId, notebookId) {
        const entry = this.entries.find(e => e.id === entryId);
        if (!entry) return;

        // 确保数组存在
        if (!entry.notebookIds) entry.notebookIds = [];

        const index = entry.notebookIds.indexOf(notebookId);
        if (index > -1) {
            // 已存在 -> 移除 (取消勾选)
            entry.notebookIds.splice(index, 1);
        } else {
            // 不存在 -> 添加 (勾选)
            entry.notebookIds.push(notebookId);
        }
        this.save();
    },

    // 更新日记内容 (支持增量字数统计)
    updateEntry(id, content) {
        const entry = this.entries.find(e => e.id === id);
        if (entry) {
            entry.content = content;

            // 如果是"已确认"的日记，需要实时同步字数变化
            if (entry.isConfirmed) {
                const newCount = this._countWords(content);
                const oldCount = entry.savedWordCount || 0; 
                const diff = newCount - oldCount;

                // 只有字数发生实际变化时才更新 UserData
                if (diff !== 0) {
                    UserData.updateWordCount(diff);
                    entry.savedWordCount = newCount;
                    
                    if (diff > 0) {
                        StoryManager.checkWordCountMilestones();
                    }
                }
            }

            this.save();
        }
    },

    // 确认日记
    confirmEntry(id) {
        // 🛡️ 核心修复：使用 == 而不是 === 
        // 防止 UI 传过来的是字符串 ID ("12345") 而数据里是数字 (12345)
        const entry = this.entries.find(e => e.id == id);
        
        if (entry && !entry.isConfirmed) {
            entry.isConfirmed = true;

            const currentCount = this._countWords(entry.content);
            entry.savedWordCount = currentCount;
            
            if (currentCount > 0) {
                UserData.updateWordCount(currentCount);
                StoryManager.checkWordCountMilestones();
            }

            this.save();
            return true;
        }
        return false;
    },
    // 删除日记
    deleteEntry(id) {
        const index = this.entries.findIndex(e => e.id === id);
        if (index !== -1) {
            const entry = this.entries[index];

            // 防刷分逻辑：扣除它贡献的字数
            if (entry.isConfirmed) {
                const countToRemove = entry.savedWordCount || this._countWords(entry.content);
                if (countToRemove > 0) {
                    UserData.updateWordCount(-countToRemove); 
                }
            }

            this.entries.splice(index, 1); 
            this.save();
            return true;
        }
        return false;
    },    

    getAll() {
        return this.entries;
    },

    // ✨ 新增：重置日记本
    reset() {
        this.entries = [];
        
        // 保存更改 (假设 Journal 内部有 save 方法，或者通过 UserData 保存)
        // 如果 Journal.js 是独立保存的：
        if (typeof this.save === 'function') {
            this.save();
        } else {
            // 如果是挂在 UserData 下的：
            // UserData.state.journal = [];
            // UserData.save();
            // 根据您的架构，通常这里应该类似 Library 有个 save
             window.ithacaSystem.saveData('journal_data.json', JSON.stringify(this.entries));
        }
        
        console.log("📝 日记已清空");
    },

    // 保存：写入到本地硬盘
    save() {
        window.ithacaSystem.saveData('journal_data.json', JSON.stringify(this.entries));
    },

    // --- 内部工具 ---
    
    _countWords(text) {
        if (!text) return 0;
        return text.replace(/\s/g, '').length;
    }
};