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
        
        // 自動帶入基底裝備
        if (typeof ENCHANTS !== 'undefined') {
            const baseList = ENCHANTS.filter(e => e.id >= 200 && e.slots.includes(slot));
            if (baseList.length > 0) {
                // 優先抓取獄髓或最後一個選項
                const baseItem = baseList.find(e => e.name.includes('獄髓')) || baseList[baseList.length - 1];
                newItem.enchants.push(baseItem);
                newItem.name = baseItem.fullName.replace('【裝備】', '');
            }
        }

        this.items.push(newItem);
        this.activeItemId = newItem.id;
        this.render();
        if (typeof window.renderEnchantments === 'function') window.renderEnchantments();
    },

    removeEquipment(id) {
        this._ensureArray();
        this.items = this.items.filter(i => i.id !== id);
        this.activeItemId = this.items.length > 0 ? this.items[this.items.length - 1].id : null;
        this.render();
        if (typeof window.renderEnchantments === 'function') window.renderEnchantments();
    },

    updateQuantity(id, change) {
        this._ensureArray();
        const item = this.items.find(i => i.id === id);
        if (item) {
            item.quantity = Math.max(1, Math.min(3, (item.quantity || 1) + change));
            this.render();
        }
    },

    setActiveItem(id) {
        this._ensureArray();
        this.activeItemId = id;
        this.render();
        if (typeof window.renderEnchantments === 'function') window.renderEnchantments();
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
            // 替換基底裝備
            activeItem.enchants = activeItem.enchants.filter(e => e.id < 200);
            activeItem.enchants.push(enchant);
            activeItem.name = enchant.fullName.replace('【裝備】', '');
        } else {
            // 一般與特殊附魔
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

    checkIncompatible(enchant) {
        this._ensureArray();
        const activeItem = this.getActiveItem();
        if (!activeItem || enchant.id >= 200) return false;

        // 1. 單一裝備內的互斥
        const isLocalIncompatible = activeItem.enchants.some(selected => 
            (selected.incompatible && selected.incompatible.includes(enchant.name)) ||
            (enchant.incompatible && enchant.incompatible.includes(selected.name))
        );
        if (isLocalIncompatible) return true;

        // 2. 全域特殊附魔排斥
        if (enchant.rarity === '特殊') {
            const isAlreadyInOtherItem = this.items.some(item => 
                item.id !== activeItem.id && item.enchants.some(e => e.id === enchant.id)
            );
            if (isAlreadyInOtherItem) return true;
        }
        return false;
    },

    getTotal() {
        this._ensureArray();
        let total = 0;
        this.items.forEach(item => {
            let itemSum = item.enchants.reduce((s, e) => s + e.price, 0);
            total += itemSum * (item.quantity || 1);
        });
        return total;
    },

    render() {
        this._ensureArray();
        const container = document.getElementById('selected-list');
        if (!container) return;
        container.innerHTML = '';
        
        const totalEl = document.getElementById('total-price-value');
        if (totalEl) {
            totalEl.innerText = typeof Calculator !== 'undefined' ? Calculator.formatPrice(this.getTotal()) : this.getTotal();
        }

        if (this.items.length === 0) {
            container.innerHTML = `<div style="text-align:center; color:#888; padding:30px; font-size:1.1rem;">報價單目前為空</div>`;
            return;
        }

        this.items.forEach((item) => {
            const isActive = item.id === this.activeItemId;
            const qty = item.quantity || 1;
            
            const box = document.createElement('div');
            // 動態邊框與發光效果，提示目前正在編輯的裝備
            box.style.cssText = `background:#18181d; padding:15px; margin-bottom:12px; border-radius:10px; border:2px solid ${isActive ? 'var(--primary-color, #4a90e2)' : '#333'}; cursor:pointer; transition:all 0.2s ease; box-shadow: ${isActive ? '0 0 10px rgba(74, 144, 226, 0.2)' : 'none'};`;
            
            box.onclick = (e) => {
                // 防止點選內部按鈕時觸發切換
                if (e.target.tagName !== 'BUTTON') {
                    this.setActiveItem(item.id);
                }
            };

            // 標題與控制列
            const headerRow = document.createElement('div');
            headerRow.style.cssText = 'display:flex; justify-content:space-between; align-items:center; border-bottom:1px dashed #444; padding-bottom:10px; margin-bottom:10px;';
            
            const titleSpan = document.createElement('div');
            titleSpan.style.cssText = `font-weight:bold; color:${isActive ? '#fff' : '#aaa'}; font-size:1.1rem; transition:0.2s;`;
            titleSpan.innerText = item.name;

            const ctrlGroup = document.createElement('div');
            ctrlGroup.style.cssText = 'display:flex; align-items:center; gap:8px;';

            // 美化版：一體成型的數量選擇器
            const qtyBox = document.createElement('div');
            qtyBox.style.cssText = 'display:flex; align-items:center; background:#1e1e24; border-radius:6px; border:1px solid #444; overflow:hidden;';
            
            const btnDec = document.createElement('button');
            btnDec.innerText = '－';
            btnDec.style.cssText = `background:transparent; color:${qty > 1 ? '#aaa' : '#555'}; border:none; padding:4px 10px; cursor:${qty > 1 ? 'pointer' : 'not-allowed'}; font-weight:bold; transition:0.2s;`;
            if (qty > 1) {
                btnDec.onmouseover = () => { btnDec.style.background = '#333'; btnDec.style.color = '#fff'; };
                btnDec.onmouseout = () => { btnDec.style.background = 'transparent'; btnDec.style.color = '#aaa'; };
                btnDec.onclick = (e) => { e.stopPropagation(); this.updateQuantity(item.id, -1); };
            }

            const qtyLabel = document.createElement('span');
            qtyLabel.innerText = qty;
            qtyLabel.style.cssText = 'color:#fff; font-weight:bold; padding:0 12px; font-size:0.95rem; border-left:1px solid #444; border-right:1px solid #444; background:#25252d;';

            const btnInc = document.createElement('button');
            btnInc.innerText = '＋';
            btnInc.style.cssText = `background:transparent; color:${qty < 3 ? '#aaa' : '#555'}; border:none; padding:4px 10px; cursor:${qty < 3 ? 'pointer' : 'not-allowed'}; font-weight:bold; transition:0.2s;`;
            if (qty < 3) {
                btnInc.onmouseover = () => { btnInc.style.background = '#333'; btnInc.style.color = '#fff'; };
                btnInc.onmouseout = () => { btnInc.style.background = 'transparent'; btnInc.style.color = '#aaa'; };
                btnInc.onclick = (e) => { e.stopPropagation(); this.updateQuantity(item.id, 1); };
            }

            qtyBox.appendChild(btnDec);
            qtyBox.appendChild(qtyLabel);
            qtyBox.appendChild(btnInc);

            // 美化版：移除按鈕
            const btnDel = document.createElement('button');
            btnDel.innerText = '🗑️';
            btnDel.style.cssText = 'background:transparent; color:#ff4d4d; border:1px solid #ff4d4d; padding:4px 8px; border-radius:6px; cursor:pointer; font-size:0.85rem; transition:0.2s; margin-left:4px;';
            btnDel.onmouseover = () => { btnDel.style.background = '#ff4d4d'; btnDel.style.color = '#fff'; };
            btnDel.onmouseout = () => { btnDel.style.background = 'transparent'; btnDel.style.color = '#ff4d4d'; };
            btnDel.onclick = (e) => { e.stopPropagation(); this.removeEquipment(item.id); };

            ctrlGroup.appendChild(qtyBox);
            ctrlGroup.appendChild(btnDel);
            headerRow.appendChild(titleSpan);
            headerRow.appendChild(ctrlGroup);
            box.appendChild(headerRow);

            // 附魔清單
            const enchantsList = document.createElement('div');
            let itemSubtotal = 0;
            
            if (item.enchants.length === 0) {
                enchantsList.innerHTML = `<div style="color:#666; font-size:0.85rem; padding:5px 0; text-align:center;">尚未選擇基底或附魔</div>`;
            } else {
                // 排序：基底排最前面，附魔排後面
                const sortedEnchants = [...item.enchants].sort((a, b) => (b.id >= 200 ? 1 : 0) - (a.id >= 200 ? 1 : 0));
                
                sortedEnchants.forEach(e => {
                    itemSubtotal += e.price;
                    const isBase = e.id >= 200;
                    const priceDisplay = (isBase && e.price === 0) ? '自備' : (typeof Calculator !== 'undefined' ? Calculator.formatPrice(e.price) : e.price);
                    
                    const enDiv = document.createElement('div');
                    enDiv.style.cssText = `display:flex; justify-content:space-between; align-items:center; padding:6px 10px; margin:5px 0; background:#25252d; border-radius:4px; border-left:3px solid ${isBase ? '#aaa' : 'var(--primary-color, #4a90e2)'};`;
                    
                    enDiv.innerHTML = `
                        <span style="color:${isBase ? '#bbb' : '#fff'}; font-size:0.9rem;">${e.fullName}</span>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="color:var(--price-normal, #4caf50); font-size:0.85rem;">${priceDisplay}</span>
                            <button style="background:none; border:none; color:#ff4d4d; cursor:pointer; font-size:1.2rem; line-height:1;" title="移除">&times;</button>
                        </div>
                    `;
                    
                    enDiv.querySelector('button').onclick = (ev) => {
                        ev.stopPropagation();
                        this.toggleEnchant(e);
                    };
                    
                    enchantsList.appendChild(enDiv);
                });
            }
            
            box.appendChild(enchantsList);
            
            // 小計結算
            const subtotalDiv = document.createElement('div');
            subtotalDiv.style.cssText = 'border-top:1px solid #333; margin-top:10px; padding-top:10px; text-align:right; font-weight:bold; font-size:1rem; color:#fff;';
            const finalSubtotal = typeof Calculator !== 'undefined' ? Calculator.formatPrice(itemSubtotal * qty) : itemSubtotal * qty;
            subtotalDiv.innerHTML = `小計 <span style="color:#aaa; font-size:0.85rem;">(x${qty})</span> : <span style="color:var(--price-expensive, #ff9800);">${finalSubtotal}</span>`;
            box.appendChild(subtotalDiv);

            container.appendChild(box);
        });
    },

    generateQuoteText() {
        this._ensureArray();
        let text = '【Minecraft 附魔報價單】\n\n';
        this.items.forEach((item, index) => {
            const qty = item.quantity || 1;
            text += `=== ${item.name} (#${index + 1}) ===\n`;
            let itemTotal = 0;
            item.enchants.forEach(e => {
                const priceText = (e.id >= 200 && e.price === 0) ? '自備' : (typeof Calculator !== 'undefined' ? Calculator.formatPrice(e.price) : e.price);
                text += `${e.fullName}: ${priceText}\n`;
                itemTotal += e.price;
            });
            const subtotalText = typeof Calculator !== 'undefined' ? Calculator.formatPrice(itemTotal * qty) : (itemTotal * qty);
            text += `小計 (x${qty}): ${subtotalText}\n\n`;
        });
        const totalText = typeof Calculator !== 'undefined' ? Calculator.formatPrice(this.getTotal()) : this.getTotal();
        text += `====================\n總金額: ${totalText}`;
        return text;
    }
};
