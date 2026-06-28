let currentCategory = '普通';

document.addEventListener('DOMContentLoaded', () => {
    // 1. 綁定左側「裝備清單」點擊事件
    document.querySelectorAll('.eq-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // 切換按鈕高亮
            document.querySelectorAll('#equipment-list .eq-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const slot = e.target.dataset.slot;
            const armors = ['helmet', 'chestplate', 'leggings', 'boots'];
            
            if (armors.includes(slot)) {
                // 盔甲類：進入「選擇材質」分支
                document.getElementById('state-empty').style.display = 'none';
                document.getElementById('state-enchant').style.display = 'none';
                document.getElementById('state-material').style.display = 'flex';
                
                const btnGroup = document.getElementById('material-btn-group');
                btnGroup.innerHTML = '';
                ['鑽石', '獄髓'].forEach(mat => {
                    const matBtn = document.createElement('button');
                    matBtn.className = 'eq-btn'; 
                    matBtn.style.cssText = 'padding: 10px 30px; font-size: 1.2rem; cursor: pointer; border-radius: 8px; margin: 0 10px; background: #25252d; border: 1px solid #444; color: #fff;';
                    matBtn.innerText = `💎 ${mat}`;
                    matBtn.onclick = () => {
                        Cart.addEquipment(slot);
                        // 強制替換成所選材質的基底
                        const baseItem = typeof ENCHANTS !== 'undefined' ? ENCHANTS.find(en => en.id >= 200 && en.slots.includes(slot) && en.name.includes(mat)) : null;
                        if (baseItem) Cart.toggleEnchant(baseItem);
                        
                        document.getElementById('state-material').style.display = 'none';
                        document.getElementById('state-enchant').style.display = 'block';
                    };
                    btnGroup.appendChild(matBtn);
                });
            } else {
                // 工具與武器類：直接進入附魔庫
                Cart.addEquipment(slot);
                document.getElementById('state-empty').style.display = 'none';
                document.getElementById('state-material').style.display = 'none';
                document.getElementById('state-enchant').style.display = 'block';
            }
        });
    });

    // 2. 綁定「普通/特殊附魔」標籤切換
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.category;
            window.renderEnchantments(); // 重新渲染附魔
        });
    });

    // 3. 綁定「搜尋框」
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            window.renderEnchantments();
        });
    }

    // 4. 綁定右側面板功能按鈕 (清空、匯出)
    document.getElementById('btn-clear')?.addEventListener('click', () => {
        if (Cart && typeof Cart.clear === 'function') Cart.clear();
    });
    document.getElementById('btn-export-txt')?.addEventListener('click', () => {
        if (typeof exportTXT === 'function') exportTXT();
    });
    document.getElementById('btn-export-json')?.addEventListener('click', () => {
        if (typeof exportJSON === 'function') exportJSON();
    });
});

// 負責在中間面板繪製附魔卡片
window.renderEnchantments = function() {
    const container = document.getElementById('enchant-list');
    if (!container) return;
    container.innerHTML = '';

    const activeItem = Cart.getActiveItem();
    if (!activeItem) {
        document.getElementById('state-empty').style.display = 'flex';
        document.getElementById('state-material').style.display = 'none';
        document.getElementById('state-enchant').style.display = 'none';
        return;
    }

    // 顯示正在編輯的裝備名稱
    const titleEl = document.getElementById('enchant-target-title');
    if (titleEl) titleEl.innerText = `✨ 正在配置：${activeItem.name}`;

    const keyword = (document.getElementById('search-input')?.value || '').toLowerCase();

    // 依照條件過濾出可以顯示的附魔
    const availableEnchants = (typeof ENCHANTS !== 'undefined' ? ENCHANTS : []).filter(e => {
        if (e.id >= 200) return false; // 隱藏基底裝備，不當作附魔顯示
        if (!e.slots.includes(activeItem.slot)) return false; // 必須符合當前裝備部位
        
        // 依照上方 Tab 分類過濾 (普通/特殊)
        if (currentCategory === '普通' || currentCategory === '特殊') {
            if (e.rarity !== currentCategory) return false;
        }

        // 搜尋過濾
        if (keyword && !e.name.toLowerCase().includes(keyword) && !e.fullName.toLowerCase().includes(keyword)) {
            return false;
        }
        return true;
    });

    if (availableEnchants.length === 0) {
        container.innerHTML = '<div style="color: #888; text-align: center; padding: 30px;">此分類目前無符合的附魔</div>';
        return;
    }

    // 產生附魔卡片
    availableEnchants.forEach(enchant => {
        const isSelected = Cart.isSelected(enchant.id);
        const isInc = Cart.checkIncompatible(enchant);

        const card = document.createElement('div');
        // 配合你原本的深色完美樣式
        card.style.cssText = `
            background: ${isSelected ? 'rgba(74, 144, 226, 0.15)' : '#25252d'};
            border: 1px solid ${isSelected ? '#4a90e2' : '#333'};
            padding: 12px 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            cursor: ${isInc && !isSelected ? 'not-allowed' : 'pointer'};
            opacity: ${isInc && !isSelected ? '0.3' : '1'};
            transition: 0.2s;
        `;

        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-weight: bold; color: ${isSelected ? '#fff' : '#ccc'}; font-size: 1.05rem;">${enchant.fullName}</span>
                <span style="color: ${isSelected ? '#4a90e2' : '#4caf50'}; font-weight: bold;">
                    $${typeof Calculator !== 'undefined' && Calculator.formatPrice ? Calculator.formatPrice(enchant.price) : enchant.price}
                </span>
            </div>
            <div style="color: #888; font-size: 0.85rem; line-height: 1.4;">${enchant.description || '無詳細說明'}</div>
        `;

        // 點擊事件
        if (!isInc || isSelected) {
            card.onclick = () => Cart.toggleEnchant(enchant);
        }

        container.appendChild(card);
    });
};
