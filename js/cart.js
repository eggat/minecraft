// 購物車與裝備管理 (精準名稱與價格顯示版)
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
            id: 'eq_' + Date.now(),
            slot: slot,
            name: this.slotNames[slot] || slot,
            quantity: 1,
            enchants: []
        };
        this.items.push(newItem);
        this.activeItemId = newItem.id;
        this.render();
    },

    removeEquipment(id) {
        this.items = this.items.filter(i => i.id !== id);
        this.activeItemId = this.items.length > 0 ? this.items[0].id : null;
        this.render();
    },

    updateQuantity(id, change) {
        const item = this.items.find(i => i.id === id);
        if (item) {
            item.quantity = Math.max(1, Math.min(3, (item.quantity || 1) + change));
            this.render();
        }
    },

    setActiveItem(id) {
        this.activeItemId = id;
        this.render();
    },

    getActiveItem() {
        this._ensureArray();
        return this.items.find(item => item.id === this.activeItemId);
    },

    toggleEnchant(enchant) {
        let activeItem = this.getActiveItem();
        if (!activeItem) return;

        if (enchant.id >= 200) {
            activeItem.enchants = activeItem.enchants.filter(e => e.id < 200);
            activeItem.enchants.push(enchant);
            activeItem.name = enchant.fullName.replace('【裝備】', '');
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
        let total = 0;
        this.items.forEach(item => {
            let basePrice = item.enchants.find(e => e.id >= 200)?.price || 0;
            let enchantSum = item.enchants.filter(e => e.id < 200).reduce((sum, e) => sum + e.price, 0);
            total += (basePrice + enchantSum) * (item.quantity || 1);
        });
        return total;
    },

    render() {
        const container = document.getElementById('selected-list');
        container.innerHTML = '';
        if (document.getElementById('total-price-value')) document.getElementById('total-price-value').innerText = this.getTotal();

        this.items.forEach((item, index) => {
            const box = document.createElement('div');
            box.style.cssText = 'background:#18181d; padding:15px; margin:10px; border:1px solid #444;';
            
            // 頂部導航與控制
            box.innerHTML = `
                <div style="margin-bottom:10px;">
                    <button onclick="Cart.setActiveItem('${this.items[Math.max(0, index-1)].id}')">◀</button>
                    <strong>${item.name} (x${item.quantity})</strong>
                    <button onclick="Cart.setActiveItem('${this.items[Math.min(this.items.length-1, index+1)].id}')">▶</button>
                    <button onclick="Cart.updateQuantity('${item.id}', -1)">❮</button>
                    <button onclick="Cart.updateQuantity('${item.id}', 1)">❯</button>
                    <button onclick="Cart.removeEquipment('${item.id}')">🗑️</button>
                </div>`;
            
            // 顯示基底名稱與價格
            const base = item.enchants.find(e => e.id >= 200);
            const baseName = base ? base.fullName : '未選裝備';
            const basePrice = base ? (base.price > 0 ? base.price : '自備') : 0;
            box.innerHTML += `<div>${baseName}: ${basePrice}</div>`;

            // 附魔清單
            item.enchants.filter(e => e.id < 200).forEach(e => {
                box.innerHTML += `<div>${e.fullName}: ${e.price}</div>`;
            });
            container.appendChild(box);
        });
    },

    generateQuoteText() {
        let text = '【Minecraft 附魔報價單】\n\n';
        this.items.forEach((item, index) => {
            text += `=== ${item.name} (#${index + 1}) ===\n`;
            const base = item.enchants.find(e => e.id >= 200);
            const basePrice = base ? (base.price > 0 ? base.price : '自備') : 0;
            text += `${base ? base.fullName : '未選裝備'}: ${basePrice}\n`;
            
            let itemTotal = 0;
            item.enchants.filter(e => e.id < 200).forEach(e => {
                text += `${e.fullName}: ${e.price}\n`;
                itemTotal += e.price;
            });
            const baseVal = base ? base.price : 0;
            text += `小計 (x${item.quantity || 1}): ${(baseVal + itemTotal) * (item.quantity || 1)}\n\n`;
        });
        text += `總金額: ${this.getTotal()}`;
        return text;
    }
};
