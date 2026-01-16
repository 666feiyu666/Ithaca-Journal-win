/* src/js/logic/FragmentSystem.js */
import { UserData } from '../data/UserData.js';
import { Library } from '../data/Library.js';
import { UIRenderer } from '../ui/UIRenderer.js';
import { StoryManager } from './StoryManager.js'; // 引入 StoryManager 以复用 showDialogue

export const FragmentSystem = {
    // ============================================================
    // 1. 配置数据 (FragmentDB, Recipes, Milestones)
    // ============================================================
    fragmentDB: {
        "frag_pineapple_01": {
            title: "待开发日记1",
            content: "...",
            origin: "字数里程碑",
            icon: "assets/images/item/note1.png"
        },
        "frag_pineapple_02": {
            title: "待开发日记2",
            content: "...",
            origin: "字数里程碑",
            icon: "assets/images/item/note1.png"
        },
        "frag_pineapple_03": {
            title: "待开发日记3",
            content: "...",
            origin: "高阶里程碑或探索",
            icon: "assets/images/item/note1.png"
        }
    },

    synthesisRecipes: [
        {
            bookId: "book_pineapple_diary_complete",
            title: "糖水菠萝的日记",
            cover: "assets/images/booksheet/booksheet1.png",
            requiredFragments: ["frag_pineapple_01", "frag_pineapple_02", "frag_pineapple_03"],
            fullContent: `# 糖水菠萝的日记 (完整版)\n\n...`
        }
    ],

    milestones: [
        { threshold: 20,   fragmentId: "frag_pineapple_01" },
        { threshold: 200,  fragmentId: "frag_pineapple_02" },
        { threshold: 2000, fragmentId: "frag_pineapple_03" }
    ],

    // ============================================================
    // 2. 逻辑方法
    // ============================================================

    /**
     * 检查字数里程碑 (通常在 Binder/Editor 输入时调用)
     */
    checkWordCountMilestones() {
        const currentWords = UserData.state.totalWords || 0;
        this.milestones.forEach(ms => {
            if (currentWords >= ms.threshold) {
                this.unlockFragment(ms.fragmentId);
            }
        });
    },

    /**
     * 解锁碎片并弹窗
     */
    unlockFragment(fragmentId) {
        const isNew = UserData.addFragment(fragmentId);
        if (isNew) {
            const fragInfo = this.fragmentDB[fragmentId];
            if (!fragInfo) return;

            // 震动效果
            const room = document.getElementById('scene-room');
            if(room) {
                room.classList.add('shake-room');
                setTimeout(() => room.classList.remove('shake-room'), 500);
            }

            // 调用 StoryManager 显示通用对话框
            StoryManager.showDialogue("✨ 发现碎片", 
                `你捡到了一张泛黄的纸片：<br><strong style="font-size:1.1em;">《${fragInfo.title}》</strong><br><br>` + 
                `<span style="color:#666; font-size:0.9em; font-style:italic;">"${fragInfo.content.substring(0, 25)}..."</span>`
            );
            
            this.checkSynthesis();
        }
    },

    /**
     * 检查是否满足合成条件
     */
    checkSynthesis() {
        this.synthesisRecipes.forEach(recipe => {
            // 如果已经有这本书了，跳过
            const alreadyHasBook = Library.getAll().find(b => b.id === recipe.bookId);
            if (alreadyHasBook) return;

            // 检查是否集齐所有碎片
            const hasAllFragments = recipe.requiredFragments.every(fid => UserData.hasFragment(fid));

            if (hasAllFragments) {
                // 添加书籍
                Library.addBook({
                    id: recipe.bookId,
                    title: recipe.title,
                    content: recipe.fullContent,
                    cover: recipe.cover,
                    date: "重组的记忆",
                    isMystery: true,     
                    isReadOnly: true
                });

                // 延迟弹窗提示
                setTimeout(() => {
                    StoryManager.showDialogue("📚 记忆重组", 
                        `手中的碎片仿佛受到了感召，自动拼凑在了一起。<br><br>获得完整书籍：<br><strong style="font-size:1.3em; color:#d84315;">《${recipe.title}》</strong>`
                    );
                    
                    // 如果书架正打开着，刷新它
                    if(document.getElementById('modal-bookshelf-ui').style.display === 'flex') {
                        UIRenderer.renderBookshelf();
                    }
                }, 2500);
            }
        });
    }
};