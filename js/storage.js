const StorageManager = {
    // 購物車資料
    saveCart(items) {
        localStorage.setItem('minecraft_cart', JSON.stringify(items));
    },

    loadCart() {
        try {
            const data = localStorage.getItem('minecraft_cart');
            return data ? JSON.parse(data) : {};
        } catch (e) {
            console.error('購物車讀取失敗', e);
            return {};
        }
    },

    clearCart() {
        localStorage.removeItem('minecraft_cart');
    },

    // 收藏附魔
    saveFavorites(favorites) {
        localStorage.setItem('minecraft_favorites', JSON.stringify(favorites));
    },

    loadFavorites() {
        try {
            const data = localStorage.getItem('minecraft_favorites');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('收藏讀取失敗', e);
            return [];
        }
    },

    toggleFavorite(enchantId) {
        let favs = this.loadFavorites();
        const index = favs.indexOf(enchantId);
        if (index > -1) {
            favs.splice(index, 1); // 取消收藏
        } else {
            favs.push(enchantId);  // 加入收藏
        }
        this.saveFavorites(favs);
        return favs;
    },

    isFavorite(enchantId) {
        const favs = this.loadFavorites();
        return favs.includes(enchantId);
    },

    // 最近使用
    saveRecent(recent) {
        localStorage.setItem('minecraft_recent', JSON.stringify(recent));
    },

    loadRecent() {
        try {
            const data = localStorage.getItem('minecraft_recent');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('最近使用讀取失敗', e);
            return [];
        }
    },

    addRecent(enchantId) {
        let recent = this.loadRecent();
        const index = recent.indexOf(enchantId);

        if (index > -1) {
            recent.splice(index, 1); // 如果已存在，先移除
        }

        recent.unshift(enchantId); // 加到最前面

        if (recent.length > 20) {
            recent.pop(); // 最多保留 20 筆歷史紀錄
        }

        this.saveRecent(recent);
        return recent;
    }
};