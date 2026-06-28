// 購物車與裝備管理 (最終優化版：具名顯示、價格自動加總)
const Cart = {
    items: [],
    activeItemId: null,

    get slotNames() {
        return {
            helmet: '頭盔', chestplate: '胸甲', leggings: '護腿', boots: '靴子',
            elytra: '鞘翅', sword: '劍', axe: '斧', mace: '重錘', spear: '長矛', pickaxe: '鎬', shovel: '鏟',
            hoe: '鋤', bow: '弓', crossbow: '弩', trident: '三叉戟', fishing: '釣竿'
        };
    },

    _ensureArray() {
        if (!Array.isArray(this.items)) {
            this.items = [];
            this.activeItemId = null;
        }
    },

    addEquipment(slot) {
        this._ensureArray();
        const newItem = {
            id: 'eq_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            slot: slot,
            name: this.slotNames[slot] || slot,
            quantity: 1,
            enchants: [] 
        };
        this.items.push(newItem);
        this.activeItemId = newItem.id;
        this.render();
        if (typeof StorageManager !== 'undefined') StorageManager.saveCart(this.items);
        return newItem;
    },

    removeEquipment(id) {
        this._ensureArray();
        this.items = this.items.filter(item => item.id !== id);
        if (this.activeItemId === id) {
            this.activeItemId = this.items.length > 0 ? this.items[this.items.length - 1].id : null;
        }
        this.render();
        if (typeof StorageManager !== 'undefined') StorageManager.saveCart(this.items);
    },

    setActiveItem(id) {
        this._ensureArray();
        this.activeItemId = id;
        this.render();
    },

    getActiveItem() {
        this._ensureArray();
        return this.items.find(item => item.id === this.activeItemId);
    },

    updateQuantity(id, change) {
        this._ensureArray();
        const item = this.items.find(i => i.id === id);
        if (!item) return;
        let newQty = (item.quantity || 1) + change;
        if (newQty < 1) newQty = 1;
        if (newQty > 3) newQty = 3;
        item.quantity = newQty;
        this.render();
        if (typeof StorageManager !== 'undefined') StorageManager.saveCart(this.items);
    },

    toggleEnchant(enchant) {
        this._ensureArray();
        let activeItem = this.getActiveItem();
        if (!activeItem) return;

        if (enchant.id >= 200) {
            activeItem.enchants = activeItem.enchants.filter(e => e.id < 200);
            activeItem.enchants.push(enchant);
            activeItem.name = enchant.fullName; 
        } else {
            if (!enchant.slots.includes(activeItem.slot)) return;
            const index = activeItem.enchants.findIndex(e => e.id === enchant.id);
            if (index > -1) {
                activeItem.enchants.splice(index, 1);
            } else {
                activeItem.enchants.push(enchant);
            }
        }
        this.render();
    },

    getTotal() {
        this._ensureArray();
        let total = 0;
        this.items.forEach(item => {
            let itemSum = item.enchants.reduce((sum, e) => sum + e.price, 0);
            total += itemSum * (item.quantity || 1);
        });
        return total;
    },

    render() {
        this._ensureArray();
        const container = document.getElementById('selected-list');
        if (!container) return;
        container.innerHTML = '';
        
        const total = this.getTotal();
        if (document.getElementById('total-price-value')) document.getElementById('total-price-value').innerText = total;

        this.items.forEach((item, index) => {
            const qty = item.quantity || 1;
            const contentBox = document.createElement('div');
            contentBox.style.cssText = 'background:#18181d; padding:15px; margin-bottom:10px; border-radius:10px; border:1px solid #444;';
            
            contentBox.innerHTML = `<div style="font-weight:bold; color:#fff; border-bottom:1px solid #333; padding-bottom:5px;">${item.name} (x${qty})</div>`;
            
            let itemSubtotal = 0;
            item.enchants.forEach(e => {
                itemSubtotal += e.price;
                contentBox.innerHTML += `<div style="display:flex; justify-content:space-between; margin:3px 0; font-size:0.9rem;"><span>${e.fullName}</span><span>${e.price > 0 ? e.price : '自備'}</span></div>`;
            });
            
            contentBox.innerHTML += `<div style="border-top:1px solid #333; margin-top:5px; text-align:right;">小計: ${itemSubtotal * qty}</div>`;
            container.appendChild(contentBox);
        });
    },

    generateQuoteText() {
        let text = '【Minecraft 附魔報價單】\n\n';
        this.items.forEach((item, index) => {
            const qty = item.quantity || 1;
            text += `=== ${item.name} (#${index + 1}) ===\n`;
            let itemTotal = 0;
            item.enchants.forEach(e => {
                text += `${e.fullName}: ${e.price > 0 ? e.price : '自備'}\n`;
                itemTotal += e.price;
            });
            text += `小計 (x${qty}): ${itemTotal * qty}\n\n`;
        });
        text += `總金額: ${this.getTotal()}`;
        return text;
    }
};
