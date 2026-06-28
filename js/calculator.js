// 負責價格計算、排序與報價文字生成的獨立模組
const Calculator = {
    // 格式化價格（未來若需要加上千分位或特殊符號可在此修改）
    formatPrice(price) {
        return `$${price}`;
    },

    // 排序附魔：特殊在前、普通在後，再依價格由高到低排序
    sortEnchants(enchantsList) {
        return [...enchantsList].sort((a, b) => {
            if (a.rarity !== b.rarity) {
                return a.rarity === '特殊' ? -1 : 1;
            }
            return b.price - a.price;
        });
    },

    // 統一由這裡產生複製用的純文字報價 (解決 copyQuote / copyResult 命名衝突)
    generateQuote(cartItems, slotNamesMap) {
        if (!cartItems || Object.keys(cartItems).length === 0) return '';
        
        let text = '【Minecraft 附魔報價單】\n\n';
        let grandTotal = 0;
        
        for (let slot in cartItems) {
            const itemEnchants = cartItems[slot];
            if (!itemEnchants || itemEnchants.length === 0) continue;
            
            const slotChineseName = slotNamesMap[slot] || slot;
            text += `=== ${slotChineseName} ===\n`;
            
            // 使用排序優化輸出順序
            const sorted = this.sortEnchants(itemEnchants);
            let slotTotal = 0;
            
            sorted.forEach(e => {
                text += `- ${e.fullName}: ${this.formatPrice(e.price)}\n`;
                slotTotal += e.price;
            });
            
            text += `小計: ${this.formatPrice(slotTotal)}\n\n`;
            grandTotal += slotTotal;
        }
        
        text += `====================\n`;
        text += `總計金額: ${this.formatPrice(grandTotal)}`;
        return text;
    }
};