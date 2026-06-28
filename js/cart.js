// 購物車與多件裝備狀態管理 (全新左右切換卡片系統 + 全域特殊附魔防重複)
const Cart = {
    items: [],
    activeItemId: null,

    get slotNames() {
        return {
            helmet: '頭盔', chestplate: '胸甲', leggings: '護腿', boots: '靴子',
            elytra: '鞘翅', sword: '劍', axe: '斧', pickaxe: '鎬', shovel: '鏟',
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

    toggleEnchant(enchant) {
        this._ensureArray();
        let activeItem = this.getActiveItem();
        if (!activeItem) return;

        if (!enchant.slots.includes(activeItem.slot)) {
            if (typeof showToast === 'function') showToast(`【${enchant.name}】不能附魔在 ${activeItem.name} 上！`);
            return;
        }

        const index = activeItem.enchants.findIndex(e => e.id === enchant.id);
        if (index > -1) {
            activeItem.enchants.splice(index, 1);
        } else {
            activeItem.enchants.push(enchant);
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
        if (!activeItem) return false;

        // 1. 同一件裝備上的互斥判斷 (依據 JSON 中的 incompatible 陣列)
        const isLocalIncompatible = activeItem.enchants.some(selected =>
            (selected.incompatible && selected.incompatible.includes(enchant.name)) ||
            (enchant.incompatible && enchant.incompatible.includes(selected.name))
        );

        if (isLocalIncompatible) return true;

        // 2. 全域「特殊」附魔防呆：特殊附魔全套裝備只能存在一個
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
            item.enchants.forEach(e => total += e.price);
        });
        return total;
    },

    render() {
        this._ensureArray();
        const container = document.getElementById('selected-list');
        if (!container) return;

        // 移除舊版的邊框與背景，讓內部元素自行排版
        container.style.border = 'none';
        container.style.background = 'transparent';
        container.style.padding = '0';
        container.innerHTML = '';

        // 更新底部總價
        const totalPriceEl = document.getElementById('total-price-value');
        if (totalPriceEl && typeof Calculator !== 'undefined') {
            totalPriceEl.innerText = Calculator.formatPrice(this.getTotal());
        }

        // 報價單為空的狀態
        if (this.items.length === 0) {
            container.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #888; padding: 40px 10px; background: #18181d; border-radius: 10px; border: 1px dashed var(--border-color);">
                    <div style="font-size: 3.5rem; margin-bottom: 15px; opacity: 0.5;">🛒</div>
                    <h3 style="margin-bottom: 8px; color: #aaa; font-size: 1.2rem;">報價單為空</h3>
                    <p style="font-size: 0.95rem; text-align: center; line-height: 1.5;">請先從左側選擇裝備分類<br>並建立報價單</p>
                </div>
            `;
            return;
        }

        // 確保焦點正確
        let currentIndex = this.items.findIndex(item => item.id === this.activeItemId);
        if (currentIndex === -1) {
            currentIndex = this.items.length - 1;
            this.activeItemId = this.items[currentIndex].id;
        }

        const currentItem = this.items[currentIndex];

        // 1. 頂部裝備切換面板 (獨立分離出來)
        const navHeader = document.createElement('div');
        navHeader.style.display = 'flex';
        navHeader.style.alignItems = 'center';
        navHeader.style.justifyContent = 'space-between';
        navHeader.style.background = 'linear-gradient(145deg, #2a2a35, #22222b)';
        navHeader.style.padding = '15px';
        navHeader.style.borderRadius = '10px';
        navHeader.style.marginBottom = '15px';
        navHeader.style.border = '1px solid var(--border-color)';
        navHeader.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';

        const createNavBtn = (text, isEnabled, onClick) => {
            const btn = document.createElement('button');
            btn.innerHTML = text;
            btn.style.background = isEnabled ? 'rgba(74, 144, 226, 0.15)' : 'transparent';
            btn.style.border = 'none';
            btn.style.color = isEnabled ? 'var(--tab-active)' : '#444';
            btn.style.fontSize = '1.2rem';
            btn.style.width = '36px';
            btn.style.height = '36px';
            btn.style.borderRadius = '50%';
            btn.style.cursor = isEnabled ? 'pointer' : 'default';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            btn.style.transition = 'all 0.2s';
            if (isEnabled) {
                btn.onmouseover = () => { btn.style.background = 'var(--tab-active)'; btn.style.color = '#fff'; };
                btn.onmouseout = () => { btn.style.background = 'rgba(74, 144, 226, 0.15)'; btn.style.color = 'var(--tab-active)'; };
                btn.onclick = onClick;
            }
            return btn;
        };

        const prevBtn = createNavBtn('◀', currentIndex > 0, () => {
            this.setActiveItem(this.items[currentIndex - 1].id);
            if (typeof renderEnchantments === 'function') renderEnchantments();
        });

        const nextBtn = createNavBtn('▶', currentIndex < this.items.length - 1, () => {
            this.setActiveItem(this.items[currentIndex + 1].id);
            if (typeof renderEnchantments === 'function') renderEnchantments();
        });

        // 智慧過濾名稱：如果有基底裝備(ID>=200)，直接顯示基底名稱
        let displayName = currentItem.name;
        const baseEnchant = currentItem.enchants.find(e => e.id >= 200);
        if (baseEnchant) {
            displayName = baseEnchant.fullName.replace('【裝備】', '');
        } else {
            displayName = `未選擇材質的${displayName}`;
        }

        const titleDiv = document.createElement('div');
        titleDiv.style.textAlign = 'center';
        titleDiv.style.flex = '1';
        titleDiv.innerHTML = `
            <div style="font-weight: bold; font-size: 1.2rem; color: #fff; letter-spacing: 1px;">${displayName}</div>
            <div style="font-size: 0.85rem; color: #aaa; margin-top: 4px;">裝備項目 ${currentIndex + 1} / ${this.items.length}</div>
        `;

        navHeader.appendChild(prevBtn);
        navHeader.appendChild(titleDiv);
        navHeader.appendChild(nextBtn);
        container.appendChild(navHeader);

        // 2. 獨立的附魔清單容器
        const contentBox = document.createElement('div');
        contentBox.style.background = '#18181d';
        contentBox.style.borderRadius = '10px';
        contentBox.style.border = '1px solid var(--border-color)';
        contentBox.style.padding = '15px';
        contentBox.style.display = 'flex';
        contentBox.style.flexDirection = 'column';

        // 捨棄此裝備的按鈕
        const actionDiv = document.createElement('div');
        actionDiv.style.textAlign = 'right';
        actionDiv.style.marginBottom = '12px';
        actionDiv.style.borderBottom = '1px dashed var(--border-color)';
        actionDiv.style.paddingBottom = '12px';
        actionDiv.innerHTML = `<button style="background: transparent; border: 1px solid var(--danger-color); color: var(--danger-color); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 0.85rem; transition: all 0.2s;">🗑️ 捨棄此裝備</button>`;
        const removeBtn = actionDiv.querySelector('button');
        removeBtn.onmouseover = () => { removeBtn.style.background = 'var(--danger-color)'; removeBtn.style.color = 'white'; };
        removeBtn.onmouseout = () => { removeBtn.style.background = 'transparent'; removeBtn.style.color = 'var(--danger-color)'; };
        removeBtn.onclick = () => {
            this.removeEquipment(currentItem.id);
            if (typeof renderEnchantments === 'function') renderEnchantments();
        };
        contentBox.appendChild(actionDiv);

        // 附魔列表 (不顯示基底裝備，只算價錢)
        const enchantListDiv = document.createElement('div');
        enchantListDiv.style.flex = '1';
        enchantListDiv.style.minHeight = '150px';

        const filteredEnchants = currentItem.enchants.filter(e => e.id < 200);

        if (filteredEnchants.length === 0) {
            enchantListDiv.innerHTML = '<div style="color: #666; text-align: center; padding: 30px 0; font-size: 0.95rem;">此裝備尚未添加任何附魔<br>請由中間面板挑選</div>';
        } else {
            const sortedEnchants = (typeof Calculator !== 'undefined') ? Calculator.sortEnchants(filteredEnchants) : filteredEnchants;
            sortedEnchants.forEach(enchant => {
                const enDiv = document.createElement('div');
                enDiv.className = 'selected-item';
                enDiv.style.background = '#25252d';
                enDiv.style.borderLeft = '4px solid var(--primary-color)';
                enDiv.style.padding = '10px 12px';
                enDiv.innerHTML = `
                    <div style="flex: 1;">
                        <span style="display: block; font-weight: bold; color: #f5f5f5; font-size: 1.05rem;">${enchant.fullName}</span>
                        <span style="font-size: 0.9em; color: var(--price-normal);">${typeof Calculator !== 'undefined' ? Calculator.formatPrice(enchant.price) : enchant.price}</span>
                    </div>
                    <button class="remove-en-btn" style="background: transparent; border: none; color: var(--danger-color); font-size: 1.6rem; cursor: pointer; padding: 0 5px;" title="移除">&times;</button>
                `;
                enDiv.querySelector('.remove-en-btn').onclick = (e) => {
                    e.stopPropagation();
                    this.toggleEnchant(enchant);
                    if (typeof StorageManager !== 'undefined') StorageManager.saveCart(this.items);
                    if (typeof renderEnchantments === 'function') renderEnchantments();
                };
                enchantListDiv.appendChild(enDiv);
            });
        }
        contentBox.appendChild(enchantListDiv);

        // 3. 單件小計
        let itemTotal = 0;
        currentItem.enchants.forEach(e => itemTotal += e.price);
        const subtotalDiv = document.createElement('div');
        subtotalDiv.style.marginTop = '15px';
        subtotalDiv.style.paddingTop = '15px';
        subtotalDiv.style.borderTop = '1px solid var(--border-color)';
        subtotalDiv.style.display = 'flex';
        subtotalDiv.style.justifyContent = 'space-between';
        subtotalDiv.style.alignItems = 'center';

        subtotalDiv.innerHTML = `
            <span style="color: #aaa; font-size: 0.9rem;">單件小計</span>
            <span style="color: var(--price-normal); font-weight: bold; font-size: 1.3rem;">${typeof Calculator !== 'undefined' ? Calculator.formatPrice(itemTotal) : itemTotal}</span>
        `;
        contentBox.appendChild(subtotalDiv);

        container.appendChild(contentBox);
    },

    generateQuoteText() {
        this._ensureArray();
        if (this.items.length === 0) return '';

        let text = '【Minecraft 附魔報價單】\n\n';
        let grandTotal = 0;

        this.items.forEach((item, index) => {
            let displayName = item.name;
            const baseEnchant = item.enchants.find(e => e.id >= 200);
            if (baseEnchant) displayName = baseEnchant.fullName.replace('【裝備】', '');

            text += `=== 【${displayName}】 #${index + 1} ===\n`;

            const enchantsOnly = item.enchants.filter(e => e.id < 200);

            if (enchantsOnly.length === 0) {
                text += `- 無附魔\n`;
            } else {
                const sortedEnchants = (typeof Calculator !== 'undefined') ? Calculator.sortEnchants(enchantsOnly) : enchantsOnly;
                sortedEnchants.forEach(e => {
                    const priceStr = typeof Calculator !== 'undefined' ? Calculator.formatPrice(e.price) : e.price;
                    text += `- ${e.fullName}: ${priceStr}\n`;
                });
            }

            let itemTotal = 0;
            item.enchants.forEach(e => itemTotal += e.price);
            const itemTotalStr = typeof Calculator !== 'undefined' ? Calculator.formatPrice(itemTotal) : itemTotal;
            text += `小計: ${itemTotalStr}\n\n`;
            grandTotal += itemTotal;
        });

        text += `====================\n`;
        const grandTotalStr = typeof Calculator !== 'undefined' ? Calculator.formatPrice(grandTotal) : grandTotal;
        text += `總計金額: ${grandTotalStr}`;
        return text;
    }
};