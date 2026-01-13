/* src/js/logic/StoryManager.js */
import { UserData } from '../data/UserData.js';
import { Library } from '../data/Library.js';
import { UIRenderer } from '../ui/UIRenderer.js';

export const StoryManager = {
    // ============================================================
    // 1. 碎片与合成配置 (Fragments & Synthesis)
    // ============================================================

    // 📜 碎片数据库
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

    // ⚗️ 合成配方
    synthesisRecipes: [
        {
            bookId: "book_pineapple_diary_complete",
            title: "糖水菠萝的日记",
            cover: "assets/images/booksheet/booksheet1.png",
            requiredFragments: ["frag_pineapple_01", "frag_pineapple_02", "frag_pineapple_03"],
            fullContent: `# 糖水菠萝的日记 (完整版)\n\n## 2024年1月15日\n今天下班路过楼下的便利店，那里的关东煮冒着热气...\n\n在这个城市里，只有便利店的灯光是永远为我亮着的。\n\n## 2024年2月20日\n雨下得很大，伞却忘在了地铁上。\n\n我不喜欢雨天，它让城市变得黏糊糊的，像甩不掉的焦虑。\n\n## 2024年5月1日\n房租又涨了。看着窗外的车流，我突然意识到，我可能永远无法真正融入这座城市。\n\n也许是时候去寻找属于我的伊萨卡了。\n\n—— 糖水菠萝`
        }
    ],

    // 🏆 字数里程碑配置
    milestones: [
        { threshold: 20,   fragmentId: "frag_pineapple_01" },
        { threshold: 200,  fragmentId: "frag_pineapple_02" },
        { threshold: 2000, fragmentId: "frag_pineapple_03" }
    ],

    // ============================================================
    // 2. 核心逻辑 (Core Logic)
    // ============================================================

    // --- A. 检查字数里程碑 ---
    checkWordCountMilestones() {
        const currentWords = UserData.state.totalWords || 0;

        this.milestones.forEach(ms => {
            if (currentWords >= ms.threshold) {
                this.unlockFragment(ms.fragmentId);
            }
        });
    },

    // --- B. 解锁碎片 ---
    unlockFragment(fragmentId) {
        const isNew = UserData.addFragment(fragmentId);
        
        if (isNew) {
            const fragInfo = this.fragmentDB[fragmentId];
            if (!fragInfo) return;

            const room = document.getElementById('scene-room');
            if(room) {
                room.classList.add('shake-room');
                setTimeout(() => room.classList.remove('shake-room'), 500);
            }

            this.showDialogue("✨ 发现碎片", 
                `你捡到了一张泛黄的纸片：<br><strong style="font-size:1.1em;">《${fragInfo.title}》</strong><br><br>` + 
                `<span style="color:#666; font-size:0.9em; font-style:italic;">"${fragInfo.content.substring(0, 25)}..."</span><br><br>` +
                `<span style="font-size:0.8em; color:#888;">(收集更多碎片或许能还原整本书)</span>`
            );

            this.checkSynthesis();
        }
    },

    // --- C. 检查合成 ---
    checkSynthesis() {
        this.synthesisRecipes.forEach(recipe => {
            const alreadyHasBook = Library.getAll().find(b => b.id === recipe.bookId);
            if (alreadyHasBook) return;

            const hasAllFragments = recipe.requiredFragments.every(fid => UserData.hasFragment(fid));

            if (hasAllFragments) {
                console.log(`[StoryManager] 碎片集齐，合成书籍: ${recipe.title}`);
                
                // ✅ 这里使用 Library.addBook，但要注意我们之前在 Library.js 修复了只读逻辑
                // 如果 Library.addBook 没有处理 isReadOnly，这里传入的属性可能无效
                // 但我们在之前的修正中，是在 checkSynthesis 这里直接构造对象的，
                // 并且我们在 Library.js 的 init 里加了补丁。
                // 最稳妥的方式是：Library.addBook 只是 push，所以我们要确保传入的对象带只读属性。
                
                Library.addBook({
                    id: recipe.bookId,
                    title: recipe.title,
                    content: recipe.fullContent,
                    cover: recipe.cover,
                    date: "重组的记忆",
                    isMystery: true,     
                    isReadOnly: true     // 🔒 确保合成书只读
                });

                setTimeout(() => {
                    this.showDialogue("📚 记忆重组", 
                        `手中的碎片仿佛受到了感召，自动拼凑在了一起。<br><br>` +
                        `获得完整书籍：<br><strong style="font-size:1.3em; color:#d84315;">《${recipe.title}》</strong><br><br>` +
                        `它已经出现在你的书架上了。`
                    );
                    
                    if(document.getElementById('modal-bookshelf-ui').style.display === 'flex') {
                        UIRenderer.renderBookshelf();
                    }
                }, 2500);
            }
        });
    },

    getFragmentDetails(id){
        return this.fragmentDB[id] || null;
    },

    // ============================================================
    // 3. UI 与场景控制 (UI & Scene Control)
    // ============================================================

    // --- D. 通用弹窗 ---
    showDialogue(title, htmlContent) {
        const scene = document.getElementById('scene-intro');
        const bgImg = scene.querySelector('.intro-bg');
        const skipBtn = document.getElementById('btn-skip-intro');
        const speakerEl = document.getElementById('dialogue-speaker');
        const textEl = document.getElementById('dialogue-text');
        const box = document.getElementById('intro-dialogue-box');
        
        const room = document.getElementById('scene-room'); 
        const isCityMode = (room && window.getComputedStyle(room).display === 'none');

        scene.style.display = 'flex';
        scene.style.opacity = 1;
        scene.style.background = 'rgba(0, 0, 0, 0.7)'; 
        
        if (bgImg) {
            if (isCityMode) {
                bgImg.style.display = 'block'; 
            } else {
                bgImg.style.display = 'none';
            }
        }
        
        if (skipBtn) skipBtn.style.display = 'none';

        speakerEl.innerText = title;
        speakerEl.style.color = "#d84315"; 
        textEl.innerHTML = htmlContent;
        
        box.style.display = 'flex';

        box.onclick = () => {
            const currentCityMode = (room && window.getComputedStyle(room).display === 'none');

            if (currentCityMode) {
                box.style.display = 'none';
                scene.style.background = 'rgba(0, 0, 0, 0.2)'; 
            } else {
                scene.style.display = 'none';
                scene.style.background = ''; 
                if (bgImg) bgImg.style.display = 'block';
            }

            speakerEl.style.color = ""; 
            box.onclick = null;
        };
    },

    // --- E. 场景对话 (城市探索) ---
    showSceneDialogue(title, htmlContent, bgSrc) {
        const scene = document.getElementById('scene-intro');
        const bgImg = scene.querySelector('.intro-bg');
        const room = document.getElementById('scene-room');
        const skipBtn = document.getElementById('btn-skip-intro');
        
        const speakerEl = document.getElementById('dialogue-speaker');
        const textEl = document.getElementById('dialogue-text');
        const box = document.getElementById('intro-dialogue-box');

        if (room) room.style.display = 'none';
        scene.style.display = 'flex';
        scene.style.opacity = 1;
        
        if (bgImg) {
            bgImg.style.display = 'block'; 
            bgImg.src = bgSrc; 
        }
        
        scene.style.background = 'rgba(0, 0, 0, 0.2)'; 

        if (skipBtn) skipBtn.style.display = 'none';
        box.style.display = 'flex';

        speakerEl.innerText = title;
        speakerEl.style.color = "#d84315"; 
        textEl.innerHTML = htmlContent;

        box.onclick = () => {
            box.style.display = 'none';
            box.onclick = null; 
        };
    },

    // --- F. 回家逻辑 ---
    returnHome() {
        const scene = document.getElementById('scene-intro');
        const bgImg = scene.querySelector('.intro-bg');
        const room = document.getElementById('scene-room');
        const box = document.getElementById('intro-dialogue-box');

        scene.style.display = 'none';
        if (room) room.style.display = 'block';
        
        if (box) box.style.display = 'flex';
        
        if (bgImg) {
            bgImg.style.display = 'block';
            bgImg.src = 'assets/images/city/street0.png';
        }
    },

    // ============================================================
    // 4. 剧情脚本 (Story Scripts) - ✨ 新增包裹剧情
    // ============================================================
    
    scripts: {
        find_first_note: [
            { speaker: "我", text: "既然已经住下了，整理一下这边的旧书架吧。" },
            { speaker: "我", text: "（指尖划过书脊的声音）" },
            { speaker: "我", text: "嗯？最上层深处好像卡着什么东西……" },
            { speaker: "我", text: "（用力拉拽的声音）" },
            { speaker: "我", text: "掉出来一本封面是绿色的书，上面印着：'伊萨卡手记 I：出发'。" },
            { speaker: "我", text: "是前任租客，还是……这个房间留给我的？既然在书架上，那就是我的了。" }
        ],
        // ✨ 新增：第7天剧情
        package_day_7: [
            { speaker: "系统", text: "（笃笃笃—— 门外传来了敲门声）" },
            { speaker: "我", text: "谁？" },
            { speaker: "系统", text: "（无人应答。你打开门，发现地毯上放着一个牛皮纸包裹）" },
            { speaker: "我", text: "寄件人是……'G.C. Library'？" },
            { speaker: "我", text: "拆开看看吧。" },
            { speaker: "系统", text: "你获得了：《伊萨卡手记 II》。已自动放入书架。" }
        ],
        // ✨ 新增：第14天剧情
        package_day_14: [
            { speaker: "我", text: "门口好像又有动静了。" },
            { speaker: "系统", text: "（还是那个熟悉的牛皮纸包裹，静静地躺在门口）" },
            { speaker: "我", text: "又是加里敦学院寄来的……看来这是一套课程。" },
            { speaker: "系统", text: "你获得了：《伊萨卡手记 III》。已自动放入书架。" }
        ],
        // ✨ 新增：第21天剧情
        package_day_21: [
            { speaker: "我", text: "看来今天也是收快递的日子。" },
            { speaker: "系统", text: "（包裹如约而至，上面还附着一片干枯的橄榄叶）" },
            { speaker: "我", text: "这是最后一本了吗？" },
            { speaker: "系统", text: "你获得了：《伊萨卡手记 IV》。已自动放入书架。" }
        ],

        // --- 📧 邮件读后感 (Mail Reactions) ---
        // 命名规则建议：mail_reaction_day{天数}
        mail_reaction_day1: [
            { speaker: "我", text: "什么鬼，是不是寄错了？" },
            { speaker: "我", text: "（合上信纸）" }
        ],
        mail_reaction_day3: [ 
            { speaker: "我", text: "……" },
            { speaker: "我", text: "……" }
        ],
        mail_reaction_day7: [ // 对应 Day 7 的包裹通知信
            { speaker: "我", text: "……" },
            { speaker: "我", text: "……" } // 这会自然引导玩家去触发之前写的“收包裹”剧情
        ],
        // 你可以继续添加 mail_reaction_day14, day21 等...
    },

    currentIndex: 0,
    activeScript: null,

    tryTriggerBookshelfStory() {
        if (UserData.state.hasFoundMysteryEntry || !UserData.state.hasWatchedIntro) {
            return false; 
        }
        this.startStory('find_first_note');
        return true;
    },

    startStory(scriptKey) {
        this.activeScript = this.scripts[scriptKey];
        this.currentIndex = 0;
        
        const scene = document.getElementById('scene-intro');
        scene.style.display = 'flex';
        scene.style.opacity = 1;
        
        scene.style.background = 'rgba(0, 0, 0, 0.4)'; 
        
        const bgImg = scene.querySelector('.intro-bg');
        if (bgImg) bgImg.style.display = 'none';

        document.getElementById('btn-skip-intro').style.display = 'none';
        this.renderLine();
    },

    renderLine() {
        const line = this.activeScript[this.currentIndex];
        document.getElementById('dialogue-speaker').innerText = line.speaker;
        document.getElementById('dialogue-text').innerText = line.text;
        
        if (line.text.includes("用力拉拽")) {
            const room = document.getElementById('scene-room');
            if(room) {
               room.classList.add('shake-room');
               setTimeout(() => room.classList.remove('shake-room'), 500);
            }
        }

        const box = document.getElementById('intro-dialogue-box');
        box.onclick = () => this.next();
    },

    next() {
        this.currentIndex++;
        if (this.currentIndex < this.activeScript.length) {
            this.renderLine();
        } else {
            this.endStory();
        }
    },

    // ============================================================
    // ✨ 新增：每日特殊事件检测
    // ============================================================
    checkDailyEvents() {
        const day = UserData.state.day;
        
        // 逻辑：如果是 Day 7 且还没有书 II -> 触发
        // 注意：这里使用 >= 7 是为了防止玩家在 Day 7 没上线，Day 8 上线时也能补发
        
        // --- Day 7 事件 ---
        if (day >= 7 && !Library.hasBook("guide_book_part2")) {
            this.startStory('package_day_7');
            // 设置剧情结束后的回调：解锁书籍 + 刷新UI
            this._onStoryComplete = () => {
                Library.unlockSystemBook(2);
                UIRenderer.log("📦 收到了新的手记。");
                if(document.getElementById('modal-bookshelf-ui').style.display === 'flex') {
                    UIRenderer.renderBookshelf();
                }
            };
            return; // 每次启动只触发一个事件，避免冲突
        }

        // --- Day 14 事件 ---
        if (day >= 14 && !Library.hasBook("guide_book_part3")) {
            this.startStory('package_day_14');
            this._onStoryComplete = () => {
                Library.unlockSystemBook(3);
                UIRenderer.log("📦 收到了新的手记。");
                if(document.getElementById('modal-bookshelf-ui').style.display === 'flex') {
                    UIRenderer.renderBookshelf();
                }
            };
            return;
        }

        // --- Day 21 事件 ---
        if (day >= 21 && !Library.hasBook("guide_book_part4")) {
            this.startStory('package_day_21');
            this._onStoryComplete = () => {
                Library.unlockSystemBook(4);
                UIRenderer.log("📦 收到了新的手记。");
                if(document.getElementById('modal-bookshelf-ui').style.display === 'flex') {
                    UIRenderer.renderBookshelf();
                }
            };
            return;
        }
    },

    endStory() {
        const scene = document.getElementById('scene-intro');
        scene.style.display = 'none';

        const bgImg = scene.querySelector('.intro-bg');
        if (bgImg) bgImg.style.display = 'block';

        const box = document.getElementById('intro-dialogue-box');
        box.onclick = null; 

        // 记录状态
        UserData.state.hasFoundMysteryEntry = true;
        UserData.save();

        // ✅ 核心修复：确保《伊萨卡手记 I》 (guide_book_part1) 存在
        // 即使 Library.init() 已经运行过，我们在这里做双重保险，防止UI没刷新的问题
        const targetId = GUIDE_BOOK_CONFIG.id;
        const exists = Library.getAll().find(b => b.id === targetId);

        if (!exists) {
            // 如果内存里没有，手动添加进去（使用开头定义的配置）
            Library.addBook(GUIDE_BOOK_CONFIG);
        } else {
            // 💡 优化：如果已经存在，我们可以强制更新一下封面或只读属性，防止数据陈旧
            exists.isReadOnly = true; 
            // 如果你的 Library.js 允许 update，也可以调用 Library.updateBook...
        }

        // 提示文案
        UIRenderer.log("📖 你发现了《伊萨卡手记 I》");

        // 打开书架界面，并渲染
        document.getElementById('modal-bookshelf-ui').style.display = 'flex';
        UIRenderer.renderBookshelf();

        // 结束 Promise
        if (this._onStoryComplete) {
            this._onStoryComplete();
            this._onStoryComplete = null;
        }
    },

    // ============================================================
    // ✨ 新增：尝试触发邮件读后感
    // ============================================================
    /**
     * 当用户关闭邮件时调用此函数
     * @param {number} day - 邮件对应的天数
     */
    tryTriggerMailReaction(day) {
        // 1. 构造剧本 ID (例如 mail_reaction_day1)
        const scriptKey = `mail_reaction_day${day}`;
        
        // 2. 检查是否有对应的剧本
        if (this.scripts[scriptKey]) {
            console.log(`[StoryManager] 触发邮件读后感: ${scriptKey}`);
            // 延迟一点点触发，让邮件界面完全关闭后的体验更流畅
            setTimeout(() => {
                this.startStory(scriptKey);
            }, 300); 
            return true;
        }
        return false;
    }
};