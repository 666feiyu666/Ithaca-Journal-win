/* src/js/logic/TimeSystem.js */
import { UserData } from '../data/UserData.js';

export const TimeSystem = {
    init() {
        const now = new Date();

        // 1. 如果是新存档 (没有记录过起始时间)
        if (!UserData.state.startDate) {
            console.log("Welcome to Ithaca! 记录初始时间...");
            UserData.state.startDate = now.getTime();
            UserData.state.day = 1;
            UserData.save();
        } 
        // 2. 如果是老存档，计算时间差
        else {
            const start = new Date(UserData.state.startDate);
            const current = new Date();
            // const current = new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 1); // 【测试用】时间加速：每次启动游戏，时间快进一天
            
            // 核心算法：消除"时分秒"的影响，按自然日计算
            // 比如：昨天 23:00 建号，今天 08:00 登录 -> 应该算 Day 2
            start.setHours(0,0,0,0);
            current.setHours(0,0,0,0);
            
            const diffTime = current - start;
            // 毫秒转天数，向下取整
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
            
            // Day 1 是基础，所以要 +1 (差值0天 = Day 1)
            const calculatedDay = diffDays + 1;
            
            // 只有当天数发生变化时才保存，避免频繁写入
            if (UserData.state.day !== calculatedDay) {
                console.log(`时间流逝... 从 Day ${UserData.state.day} -> Day ${calculatedDay}`);
                UserData.state.day = calculatedDay;
                UserData.save();
            }
        }
        
        console.log(`[TimeSystem] 当前时间：${now.toLocaleString()} | 游戏天数：Day ${UserData.state.day}`);
    },
    
    // 获取当前是一天中的哪个时段 (用于将来做白天黑夜切换)
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 18) return 'day';
        return 'night';
    }
};