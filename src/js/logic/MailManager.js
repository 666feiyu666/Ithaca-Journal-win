/* src/js/logic/MailManager.js */
import { UserData } from '../data/UserData.js';
import { StoryManager } from './StoryManager.js';
import { HUDRenderer } from '../ui/HUDRenderer.js';
import { Library } from '../data/Library.js';

// ✨ 核心改变：从数据文件导入配置
import { LETTERS, REFLECTION_PROMPTS, TOTAL_LETTER_DAYS } from '../data/MailData.js';

export const MailManager = {
    // 检查今天是否有新信 (用于红点提示)
    checkNewMail() {
        const day = UserData.state.day;
        const letter = LETTERS[day]; // 直接使用导入的数据
        
        // 如果有信，且还没读过
        if (letter && !UserData.hasReadMail(day)) {
            return { day: day, ...letter };
        }
        return null;
    },

    // 获取今天的信内容 (用于点击打开)
    getTodayMail() {
        const day = UserData.state.day;
        const letter = LETTERS[day];

        if (letter) {
            return { day: day, ...letter };
        }
        return null;
    },

    /**
     * ✨ 核心逻辑：处理“完成阅读”
     */
    onCloseMail(day) {
        // 1. 标记已读
        UserData.markMailAsRead(day);

        // ✨ 新增逻辑：触发“i菠萝”成就 (累计读信 10 封)
        // 获取已读列表的长度
        const readCount = UserData.state.readMails ? UserData.state.readMails.length : 0;
        if (readCount >= 10) {
            UserData.unlockAchievement('ach_pineapple');
        }

        // 2. 检查是否已经写过回复 (防止重复触发流程)
        const replies = UserData.getAllReplies();
        if (replies[day]) {
            StoryManager.checkDailyEvents();
            return; 
        }

        // 3. 定义“下一步要做什么”
        const nextStep = () => {
             const currentReplies = UserData.getAllReplies();
             // 只有确实没写过回复时，才弹窗
             if (!currentReplies[day]) {
                 this.startReflectionFlow(day);
             }
        };

        // 4. 尝试触发“自言自语”对话
        const hasReactionStory = StoryManager.tryTriggerMailReaction(day, nextStep);

        // 5. 如果没有触发剧情，立即执行下一步
        if (!hasReactionStory) {
            nextStep();
        }
    },

    // 获取信件归档列表
    getMailArchive() {
        const currentDay = UserData.state.day;
        const list = [];
        const readMails = UserData.state.readMails || [];
        for (let d = currentDay; d >= 1; d--) {
            const letter = LETTERS[d];
            const isRead = readMails.includes(d);
            if (letter) {
                list.push({
                    day: d,
                    title: letter.title,
                    sender: letter.sender,
                    content: letter.content,
                    type: 'letter',
                    isRead: isRead
                });
            } else {
                list.push({ day: d, title: "...", type: 'empty' });
            }
        }
        return list;
    },

    // 开启读后感弹窗
    startReflectionFlow(day) {
        const modal = document.getElementById('modal-mail-reflection');
        const promptEl = document.getElementById('reflection-prompt');
        const inputEl = document.getElementById('reflection-input');
        const btnSubmit = document.getElementById('btn-submit-reflection');
        const btnSkip = document.getElementById('btn-skip-reflection');

        if (!modal) return;

        // 使用导入的数据，并做安全处理
        const promptText = (REFLECTION_PROMPTS && REFLECTION_PROMPTS[day]) || "此刻，你的脑海中浮现了什么...";
        
        promptEl.innerText = promptText;
        inputEl.value = "";

        // 绑定事件
        btnSubmit.onclick = null;
        btnSkip.onclick = null;

        btnSubmit.onclick = () => {
            const content = inputEl.value.trim();
            this.finishReflection(day, content || "（以此沉默回应）"); 
        };

        btnSkip.onclick = () => {
            this.finishReflection(day, "（未记录感想）");
        };

        modal.style.display = 'flex';
    },

    // 完成记录并保存
    finishReflection(day, content) {
        UserData.saveMailReply(day, content);
        
        document.getElementById('modal-mail-reflection').style.display = 'none';
        
        HUDRenderer.log("💭 思绪已记录。");

        this.checkEasterEgg();
        StoryManager.checkDailyEvents();
    },

    // 检查彩蛋逻辑
    checkEasterEgg() {
        if (UserData.state.hasReceivedEasterEggBook) return;

        const replies = UserData.getAllReplies();
        if (Object.keys(replies).length >= TOTAL_LETTER_DAYS) {
            this.generateTheBook();
        }
    },

    // 生成那本“玩家与糖水菠萝的共同回忆录”
    generateTheBook() {
        console.log("🎉 触发 21 天彩蛋！正在编纂书籍...");

        let bookContent = "# 伊萨卡回信集\n\n致 亲爱的房客：\n\n当你读到这句话时，你已经陪伴我走过了漫长的旅途。这些是你留下的足迹。\n\n---\n\n";

        const replies = UserData.getAllReplies();

        for (let i = 1; i <= TOTAL_LETTER_DAYS; i++) {
            const reply = replies[i] || "（无记录）";
            const prompt = REFLECTION_PROMPTS[i] || `Day ${i} 的随想`;
            
            bookContent += `### Day ${i}\n> *${prompt}*\n\n${reply}\n\n***\n\n`;
        }

        bookContent += "\n感谢你在伊萨卡的停留。\n—— 你的朋友 糖水菠萝";

        const specialBook = {
            id: 'book_easter_egg_21',
            title: '21',
            author: '你 & 糖水菠萝',
            content: bookContent,
            cover: 'assets/images/booksheet/booksheet3.png', 
            isRare: true, 
            price: 9999
        };

        Library.addBook(specialBook);
        
        UserData.state.hasReceivedEasterEggBook = true;
        UserData.save();

        setTimeout(() => {
            alert("✨ 叮！书架上突然多了一本厚厚的书...\n\n恭喜获得隐藏书籍：《21》");
            HUDRenderer.log("🏆 获得珍藏书籍：《21》");
        }, 1500);
    },
};