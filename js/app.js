// 全域狀態
let currentCategory = '普通';
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    try {
        const response = await fetch('data/enchants.json?v=' + new Date().getTime());
        const data = await response.json();
        window.ENCHANTS_DATA = data;
    } catch (e) { console.error('資料庫載入失敗', e); }

    bindEvents();
    renderEnchantments();
}

function bindEvents() {
    // 裝備點選 (修正：確保綁定正確，並對應你的 index.html)
    document.querySelectorAll('.eq-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const slot = e.target.dataset.slot;
            
            // 視覺切換
            document.querySelectorAll('.eq-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');

            // 分支邏輯：盔甲需要選材質，其他直接建立
            if (['helmet', 'chestplate', 'leggings', 'boots'].includes(slot)) {
                showMaterialPanel(slot);
            } else {
                createEquipment(slot);
            }
        });
    });

    // 分類 Tab 切換
    document.querySelectorAll('.tab-btn').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.category;
            renderEnchantments();
        });
    });
}

function showMaterialPanel(slot) {
    document.getElementById('state-empty').style.display = 'none';
    document.getElementById('state-enchant').style.display = 'none';
    document.getElementById('state-material').style.display = 'flex';
    
    const btnGroup = document.getElementById('material-btn-group');
    btnGroup.innerHTML = '';
    ['鑽石', '獄髓'].forEach(mat => {
        const btn = document.createElement('button');
        btn.className = 'eq-btn';
        btn.innerText = mat;
        btn.onclick = () => createEquipment(slot, mat);
        btnGroup.appendChild(btn);
    });
}

function createEquipment(slot, material = null) {
    const itemName = material ? `${material}${Cart.slotNames[slot]}` : Cart.slotNames[slot];
    Cart.addEquipment(slot, itemName);
    
    document.getElementById('state-material').style.display = 'none';
    document.getElementById('state-enchant').style.display = 'block';
    renderEnchantments();
}

window.renderEnchantments = function() {
    const container = document.getElementById('enchant-list');
    if (!container) return;
    container.innerHTML = '';
    
    const activeItem = Cart.getActiveItem();
    if (!activeItem) return;

    const keyword = (document.getElementById('search-input')?.value || '').toLowerCase();
    const data = window.ENCHANTS_DATA || [];
    
    const list = data.filter(e => {
        if (e.id >= 200) return false;
        if (!e.slots.includes(activeItem.slot)) return false;
        if (currentCategory !== '全部' && e.rarity !== currentCategory) return false;
        return e.fullName.toLowerCase().includes(keyword);
    });

    list.forEach(enchant => {
        const isSelected = Cart.isSelected(enchant.id);
        const card = document.createElement('div');
        card.className = `enchant-item ${isSelected ? 'selected' : ''}`;
        
        // 恢復美化後的 Hover 特效與內容
        card.innerHTML = `
            <div class="name">${enchant.fullName}</div>
            <div class="rarity-label rarity-${enchant.rarity}">${enchant.rarity}</div>
            <div class="price">$${enchant.price}</div>
            <div class="hover-overlay">
                <strong>效果說明</strong>
                <span>${enchant.description || '無說明'}</span>
            </div>
        `;
        card.onclick = () => Cart.toggleEnchant(enchant);
        container.appendChild(card);
    });
};
