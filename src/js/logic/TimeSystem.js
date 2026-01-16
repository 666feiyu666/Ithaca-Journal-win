/* src/js/logic/TimeSystem.js */
import { UserData } from '../data/UserData.js';
import { HUDRenderer } from '../ui/HUDRenderer.js';

export const TimeSystem = {
    init() {
        this.checkDayProgression();
    },

    /**
     * 核心逻辑：检查日期推进
     * 规则：
     * 1. 每天只推进一次 (Day + 1)。
     * 2. 如果玩家弃坑了3天再回来，游戏内只过1天 (Day + 1)，而不是跳过3天。
     * 3. 保证剧情是连续的。
     */
    checkDayProgression() {
        const now = new Date();
        // 获取今天的日期字符串，例如 "2025-12-12"
        const todayStr = now.toLocaleDateString(); 
        
        // 获取上次登录的日期和当前天数
        const lastLoginDate = UserData.state.lastLoginDate;
        let currentDay = UserData.state.day;

        // 情况 A: 第一次玩 (lastLoginDate 为空)
        if (!lastLoginDate) {
            console.log("[TimeSystem] 🌟 首次登录，初始化为 Day 1");
            UserData.state.day = 1;
            UserData.state.lastLoginDate = todayStr;
            UserData.save();
            return;
        }

        // 情况 B: 之前登录过，判断是不是“新的一天”
        if (todayStr !== lastLoginDate) {
            // 是新的一天！推进游戏天数
            currentDay += 1;
            console.log(`[TimeSystem] 🌅 新的一天！Day ${UserData.state.day} -> Day ${currentDay}`);

            UserData.state.day = currentDay;
            UserData.state.lastLoginDate = todayStr; // 更新最后登录时间为今天
            
            // 重置一些每日状态 (如果有的话，比如每日抽奖标志)
            // UserData.state.hasDailyLottery = false; 

            UserData.save();
            
            // 可以弹个提示
            setTimeout(() => {
                HUDRenderer.log(`📅 进入第 ${currentDay} 天`);
            }, 1000);
        } else {
            console.log(`[TimeSystem] ☕ 还是同一天 (Day ${currentDay})，无需推进。`);
        }
    }
};