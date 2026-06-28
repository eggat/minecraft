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

        // 自動帶入基底裝備與價格
        if (typeof ENCHANTS !== 'undefined') {
            // 尋找對應的基底項目 (ID > 200)
            let baseItem = ENCHANTS.find(e => e.id > 200 && e.slots.includes(slot));
            if (baseItem) {
                newItem.name = baseItem.fullName; // 將顯示名稱改為具體裝備名
                newItem.enchants.push(baseItem);  // 加入清單以便計價與顯示
            }
        }

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

    getTotal() {
        let total = 0;
        this.items.forEach(item => {
            let itemSum = item.enchants.reduce((s, e) => s + e.price, 0);
            total += itemSum * (item.quantity || 1);
        });
        return total;
    },

    render() {
        const container = document.getElementById('selected-list');
        if (!container) return;
        container.innerHTML = '';
        
        if (document.getElementById('total-price-value')) {
            document.getElementById('total-price-value').innerText = this.getTotal();
        }

        this.items.forEach((item, index) => {
            const box = document.createElement('div');
            box.style.cssText = 'background:#18181d; padding:15px; margin:10px; border:1px solid #444; color:#fff;';
            
            box.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #333; padding-bottom:5px;">
                    <span style="font-weight:bold;">${item.name} (x${item.quantity})</span>
                    <div>
                        <button onclick="Cart.updateQuantity('${item.id}', -1)">❮</button>
                        <button onclick="Cart.updateQuantity('${item.id}', 1)">❯</button>
                        <button style="margin-left:10px; color:red;" onclick="Cart.removeEquipment('${item.id}')">🗑️</button>
                    </div>
                </div>`;
            
            item.enchants.forEach(e => {
                box.innerHTML += `
                    <div style="display:flex; justify-content:space-between; font-size:0.9rem; margin:3px 0;">
                        <span>${e.fullName}</span>
                        <span>${e.price > 0 ? e.price : '自備'}</span>
                    </div>`;
            });
            container.appendChild(box);
        });
    }
};
