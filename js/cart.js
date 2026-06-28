// 購物車與裝備管理 (報價單具名顯示版)
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

        // 如果是基底裝備 (ID >= 200)，直接替換掉該 slot 現有的基底
        if (enchant.id >= 200) {
            activeItem.enchants = activeItem.enchants.filter(e => e.id < 200);
            activeItem.enchants.push(enchant);
            activeItem.name = enchant.fullName; 
        } else {
            // 一般附魔
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

    isSelected(enchantId) {
        this._ensureArray();
        const activeItem = this.getActiveItem();
        if (!activeItem) return false;
        return activeItem.enchants.some(e => e.id === enchantId);
    },

    checkIncompatible(enchant) {
        this._ensureArray();
        const activeItem = this.getActiveItem();
        if (!activeItem || enchant.id >= 200) return false;

        const isLocalIncompatible = activeItem.enchants.some(selected => 
            (selected.incompatible && selected.incompatible.includes(enchant.name)) ||
            (enchant.incompatible && enchant.incompatible.includes(selected.name))
        );
        if (isLocalIncompatible) return true;

        if (enchant.rarity === '特殊') {
            const isAlreadyInOtherItem = this.items.some(item => 
                item.id !== activeItem.id && item.enchants.some(e => e.id === enchant.id)
            );
            if (isAlreadyInOtherItem) return true;
        }
        return false;
    },

    clear() {
        this.items = [];
        this.activeItemId = null;
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
        const totalPriceEl = document.getElementById('total-price-value');
        if (totalPriceEl) totalPriceEl.innerText = (typeof Calculator !== 'undefined' ? Calculator.formatPrice(total) : total);

        if (this.items.length === 0) {
            container.innerHTML = `<div style="text-align:center; color:#888; padding:20px;">報價單為空</div>`;
            return;
        }

        const currentItem = this.getActiveItem() || this.items[0];
        const qty = currentItem.quantity || 1;

        // 面板渲染邏輯... (UI 部分維持原有架構，增加基底項目顯示)
        const contentBox = document.createElement('div');
        contentBox.style.cssText = 'background:#18181d; padding:15px; border-radius:10px; border:1px solid #444;';
        
        // 渲染列表
        currentItem.enchants.forEach(e => {
            contentBox.innerHTML += `<div style="display:flex; justify-content:space-between; margin:5px 0;"><span>${e.fullName}</span><span>${e.price > 0 ? '$'+e.price : '自備'}</span></div>`;
        });

        contentBox.innerHTML += `<div style="border-top:1px solid #333; margin-top:10px; text-align:right;">小計(x${qty}): $${this.items.filter(i=>i.id===currentItem.id).reduce((sum,i)=>sum + i.enchants.reduce((s,e)=>s+e.price,0),0)*qty}</div>`;
        container.appendChild(contentBox);
    },

    generateQuoteText() {
        let text = '【Minecraft 附魔報價單】\n\n';
        this.items.forEach((item, index) => {
            text += `=== ${item.name} (#${index + 1}) ===\n`;
            item.enchants.forEach(e => {
                text += `${e.fullName}: ${e.price > 0 ? e.price : '自備'}\n`;
            });
            const subtotal = item.enchants.reduce((s, e) => s + e.price, 0) * (item.quantity || 1);
            text += `小計 (x${item.quantity || 1}): ${subtotal}\n\n`;
        });
        text += `總金額: ${this.getTotal()}`;
        return text;
    }
};
