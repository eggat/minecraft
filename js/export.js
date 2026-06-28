// 匯出報價單管理模組
const ExportManager = {
    // 取得當前時間字串，用於檔案命名
    getDateString() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${year}${month}${day}_${hours}${mins}`;
    },

    // 觸發瀏覽器下載的核心方法
    downloadFile(filename, content, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // 匯出 TXT 純文字報價單
    exportTXT() {
        if (typeof Cart === 'undefined' || !Cart.items || Cart.items.length === 0) {
            if (typeof showToast === 'function') showToast('⚠️ 報價單是空的，無法匯出');
            return;
        }

        // 直接利用 cart.js 已經寫好的文字產生器
        const text = Cart.generateQuoteText();
        const filename = `Minecraft_附魔報價單_${this.getDateString()}.txt`;

        this.downloadFile(filename, text, 'text/plain;charset=utf-8');
        if (typeof showToast === 'function') showToast('📥 已下載 TXT 報價單！');
    },

    // 匯出 JSON 格式化資料 (適合供其他系統串接或機器人讀取)
    exportJSON() {
        if (typeof Cart === 'undefined' || !Cart.items || Cart.items.length === 0) {
            if (typeof showToast === 'function') showToast('⚠️ 報價單是空的，無法匯出');
            return;
        }

        // 進行「資料淨化」，讓匯出的 JSON 結構乾淨專業，不包含系統內部暫存變數
        const exportData = Cart.items.map((item, index) => {
            // 處理裝備名稱 (還原為如: 獄髓劍)
            let displayName = item.name;
            const baseEnchant = item.enchants.find(e => e.id >= 200);
            if (baseEnchant) {
                displayName = baseEnchant.fullName.replace('【裝備】', '');
            }

            // 只過濾出真正的附魔 (排除基底)
            const enchants = item.enchants.filter(e => e.id < 200).map(e => ({
                name: e.fullName,
                price: e.price
            }));

            // 計算此裝備小計
            let itemTotal = 0;
            item.enchants.forEach(e => itemTotal += e.price);

            return {
                order: index + 1,
                equipment: displayName,
                enchants: enchants,
                subtotal: itemTotal
            };
        });

        // 組合最終匯出的 JSON 結構
        const finalExport = {
            title: "Minecraft 附魔報價單",
            generatedAt: new Date().toLocaleString('zh-TW', { hour12: false }),
            grandTotal: Cart.getTotal(),
            items: exportData
        };

        const jsonStr = JSON.stringify(finalExport, null, 4);
        const filename = `Minecraft_附魔報價單_${this.getDateString()}.json`;

        this.downloadFile(filename, jsonStr, 'application/json;charset=utf-8');
        if (typeof showToast === 'function') showToast('📥 已下載 JSON 報價單！');
    }
};