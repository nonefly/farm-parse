const fs = require('fs');
const path = require('path');

const PLANT_DATA = [];
const MUTATION_TYPE_MAP = {
    1: { name: '冰冻', icon: '❄️', class: 'mutant-ice' },
    2: { name: '爱心', icon: '❤️', class: 'mutant-love' },
    3: { name: '暗化', icon: '🌑', class: 'mutant-dark' },
    4: { name: '湿润', icon: '💧', class: 'mutant-wet' },
    5: { name: '黄金', icon: '✨', class: 'mutant-gold' },
    6: { name: '哈哈', icon: '🎃', class: 'mutant-pumpkin' },
    7: { name: '塔塔', icon: '🏰', class: 'mutant-tower' },
    55: { name: '水晶', icon: '💎', class: 'mutant-crystal' },
    105: { name: '闪耀', icon: '⭐', class: 'mutant-shine' },
    337: { name: '幸运', icon: '🍀', class: 'mutant-lucky' },
    393: { name: '冰晶', icon: '🔹', class: 'mutant-ice-crystal' },
    402: { name: '沙漠', icon: '🏜️', class: 'mutant-desert' },
    611: { name: '奢华', icon: '👑', class: 'mutant-luxury' },
    671: { name: '落雪', icon: '🌨️', class: 'mutant-snow' }
};

function loadPlantData() {
    if (PLANT_DATA.length > 0) return;
    try {
        const plantFile = path.join(__dirname, '../data/Plant.json');
        if (fs.existsSync(plantFile)) {
            const data = JSON.parse(fs.readFileSync(plantFile, 'utf8'));
            PLANT_DATA.push(...data);
        }
    } catch (e) {
        console.error('Failed to load plant data:', e.message);
    }
}

module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    const { action } = req.query;
    
    switch (action) {
        case 'plants':
            loadPlantData();
            res.json({ success: true, data: PLANT_DATA });
            break;
            
        case 'mutations':
            res.json({ success: true, data: MUTATION_TYPE_MAP });
            break;
            
        case 'health':
            res.json({ success: true, message: 'Farm Parse API is running' });
            break;
            
        default:
            res.json({ 
                success: false, 
                message: 'Unknown action',
                availableActions: ['plants', 'mutations', 'health']
            });
    }
};