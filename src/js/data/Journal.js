/* src/js/data/Journal.js */
import { UserData } from './UserData.js';
import { StoryManager } from '../logic/StoryManager.js';

export const Journal = {
    entries: [],

    async init() {
        await this.load();
        
        // 数据迁移与修复
        let hasChanges = false;
        this.entries.forEach(e => {
            if (e.isDeleted === undefined) {
                e.isDeleted = false;
                hasChanges = true;
            }
            if (!e.notebookIds) {
                e.notebookIds = [];
                hasChanges = true;
            }
        });
        if(hasChanges) this.save();
    },

    async load() {
        // ✨ 优先尝试系统读取，保持与 UserData 一致
        if (window.ithacaSystem && window.ithacaSystem.loadData) {
            const data = await window.ithacaSystem.loadData('journal_data.json');
            if (data) this.entries = JSON.parse(data);
        } else {
            // 降级兼容 localStorage
            const data = localStorage.getItem('ithaca_journal_entries');
            if (data) this.entries = JSON.parse(data);
        }
    },

    save() {
        const json = JSON.stringify(this.entries);
        if (window.ithacaSystem && window.ithacaSystem.saveData) {
            window.ithacaSystem.saveData('journal_data.json', json);
        } else {
            localStorage.setItem('ithaca_journal_entries', json);
        }
    },

    getAll() {
        return this.entries.filter(e => !e.isDeleted).sort((a, b) => {
            // 按创建时间倒序（最新在最前）
            return (b.createdAt || b.timestamp || 0) - (a.createdAt || a.timestamp || 0);
        });
    },

    getTrash() {
        return this.entries.filter(e => e.isDeleted).sort((a, b) => {
            return (b.deletedAt || 0) - (a.deletedAt || 0);
        });
    },

    createNewEntry() {
        // 移除对 UserData.state.day 的依赖
        const now = new Date();
        // 获取本地格式化的系统日期，例如 "2026/1/17"
        const dateString = now.toLocaleDateString(); 
        
        const entry = {
            id: 'entry_' + Date.now(),
            date: dateString, // ✨ 修改此处：由 "Day X" 改为系统日期
            time: now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            timestamp: Date.now(),
            createdAt: Date.now(),
            content: "",
            notebookIds: [], 
            tags: [],
            isConfirmed: false,
            isDeleted: false,
            savedWordCount: 0 
        };
        
        this.entries.unshift(entry);
        this.save();
        return entry;
    },

    updateEntry(id, content) {
        const entry = this.entries.find(e => e.id === id);
        if (entry) {
            entry.content = content;
            
            // ✨ 修复：只有在日记【已确认/归档】后，输入才会计入生涯总字数
            // 如果你希望实时计入，请保留下方逻辑，但要注意 UserData 方法名
            if (entry.isConfirmed) {
                const currentCount = (content || "").replace(/\s/g, '').length;
                const lastCount = entry.savedWordCount || 0;
                const diff = currentCount - lastCount;
                
                if (diff !== 0) {
                    // ✅ 修复：调用 updateWordCount 而不是 addWords
                    UserData.updateWordCount(diff);
                    entry.savedWordCount = currentCount;
                }
            }
            
            this.save();
        }
    },

    confirmEntry(id) {
        const entry = this.entries.find(e => e.id === id);
        if (entry && !entry.isConfirmed) {
            entry.isConfirmed = true;
            
            // 确认时，结算字数
            const wordCount = (entry.content || "").replace(/\s/g, '').length;
            entry.savedWordCount = wordCount;
            // ✅ 修复：调用 updateWordCount
            UserData.updateWordCount(wordCount);
            UserData.unlockAchievement('ach_diary'); // 尝试解锁成就

            this.save();
            return true;
        }
        return false;
    },

    toggleNotebook(entryId, notebookId) {
        const entry = this.entries.find(e => e.id === entryId);
        if (!entry) return;

        if (!entry.notebookIds) entry.notebookIds = [];

        const idx = entry.notebookIds.indexOf(notebookId);
        if (idx > -1) {
            entry.notebookIds.splice(idx, 1);
        } else {
            entry.notebookIds.push(notebookId);
        }
        this.save();
    },

    deleteEntry(id) {
        const entry = this.entries.find(e => e.id === id);
        if (entry) {
            entry.isDeleted = true;
            entry.deletedAt = Date.now();
            this.save();
            return true;
        }
        return false;
    },

    restoreEntry(id) {
        const entry = this.entries.find(e => e.id === id);
        if (entry) {
            entry.isDeleted = false;
            delete entry.deletedAt;
            this.save();
            return true;
        }
        return false;
    },

    hardDeleteEntry(id) {
        const index = this.entries.findIndex(e => e.id === id);
        if (index !== -1) {
            const entry = this.entries[index];
            // 如果已确认，扣除字数
            if (entry.isConfirmed && entry.savedWordCount > 0) {
                UserData.updateWordCount(-entry.savedWordCount);
            }
            this.entries.splice(index, 1);
            this.save();
            return true;
        }
        return false;
    }
};