// 購物車與裝備管理 (最終整合版：名稱:價格、左右切換、數量調整、自備邏輯)
const Cart = {
    items: [],
    activeItemId: null,

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

    setActiveItem(id) {
        this._ensureArray();
        this.activeItemId = id;
        this.render();
    },

    getActiveItem() {
        this._ensureArray();
        return this.items.find(item => item.id === this.activeItemId);
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

        if (this.items.length === 0) {
            container.innerHTML = `<div style="text-align:center; color:#888; padding:20px;">報價單為空</div>`;
            return;
        }

        let currentIndex = this.items.findIndex(item => item.id === this.activeItemId);
        if (currentIndex === -1) {
            currentIndex = this.items.length - 1;
            this.activeItemId = this.items[currentIndex].id;
        }

        const item = this.items[currentIndex];
        const qty = item.quantity || 1;

        const nav = document.createElement('div');
        nav.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:#222; padding:10px; border-radius:8px; margin-bottom:10px;';
        nav.innerHTML = `<button onclick="Cart.setActiveItem('${currentIndex > 0 ? this.items[currentIndex-1].id : item.id}')">◀</button>
                         <span style="color:#fff; font-weight:bold;">${item.name} (#${currentIndex + 1})</span>
                         <button onclick="Cart.setActiveItem('${currentIndex < this.items.length-1 ? this.items[currentIndex+1].id : item.id}')">▶</button>`;
        container.appendChild(nav);

        const box = document.createElement('div');
        box.style.cssText = 'background:#18181d; padding:15px; border-radius:10px; border:1px solid #444;';
        
        box.innerHTML += `<div style="display:flex; justify-content:space-between; margin-bottom:10px;">
            <div>數量: <button onclick="Cart.updateQuantity('${item.id}', -1)">❮</button> ${qty} <button onclick="Cart.updateQuantity('${item.id}', 1)">❯</button></div>
            <button onclick="Cart.removeEquipment('${item.id}')">🗑️</button>
        </div>`;

        let itemTotal = 0;
        item.enchants.forEach(e => {
            itemTotal += e.price;
            box.innerHTML += `<div style="display:flex; justify-content:space-between; margin:3px 0;"><span>${e.fullName}</span><span>${e.price > 0 ? e.price : '自備'}</span></div>`;
        });
        
        box.innerHTML += `<div style="border-top:1px solid #333; margin-top:5px; text-align:right; font-weight:bold;">小計 (x${qty}): ${itemTotal * qty}</div>`;
        container.appendChild(box);
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
