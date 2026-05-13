let plantConfig = null;

window.onerror = function(message, source, lineno, colno, error) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-md text-sm';
    errorDiv.innerHTML = `<div class="font-semibold mb-1">❌ 页面错误</div><div>${message}</div>`;
    document.body.appendChild(errorDiv);
    setTimeout(() => {
        errorDiv.remove();
    }, 10000);
    return true;
};

const PLANT_DATA = [
    {"id":1020002,"name":"白萝卜"},{"id":1020003,"name":"胡萝卜"},{"id":1020059,"name":"大白菜"},{"id":1020065,"name":"大蒜"},{"id":1020064,"name":"大葱"},{"id":1020060,"name":"水稻"},{"id":1020061,"name":"小麦"},{"id":1020004,"name":"玉米"},{"id":1020005,"name":"土豆"},{"id":1020007,"name":"番茄"},{"id":1020006,"name":"茄子"},{"id":1020009,"name":"辣椒"},{"id":1020097,"name":"黄瓜"},{"id":1020010,"name":"南瓜"},{"id":1020014,"name":"西瓜"},{"id":1020001,"name":"草莓"},{"id":1020011,"name":"苹果"},{"id":1020062,"name":"四叶草"},{"id":1020145,"name":"向日葵"},{"id":1020041,"name":"红玫瑰"},{"id":1020013,"name":"葡萄"},{"id":1020015,"name":"香蕉"},{"id":1020018,"name":"桃子"},{"id":1020019,"name":"橙子"},{"id":1020128,"name":"茉莉花"},{"id":1020023,"name":"石榴"},{"id":1020103,"name":"天香百合"},{"id":1020108,"name":"郁金香"},{"id":1020138,"name":"风信子"},{"id":1020147,"name":"牵牛花"},{"id":1020110,"name":"满天星"},{"id":1020149,"name":"银杏树苗"},{"id":1020150,"name":"蝴蝶兰"},{"id":1020151,"name":"蔷薇"},{"id":1020152,"name":"钻石玫瑰"},{"id":1020153,"name":"爱心果"},{"id":1025501,"name":"水晶白萝卜"},{"id":1025502,"name":"水晶胡萝卜"},{"id":1025503,"name":"水晶大白菜"},{"id":1025507,"name":"水晶小麦"},{"id":1025508,"name":"水晶玉米"},{"id":1025510,"name":"水晶番茄"},{"id":1025511,"name":"水晶茄子"},{"id":1025513,"name":"水晶黄瓜"},{"id":1025514,"name":"水晶南瓜"},{"id":1025515,"name":"水晶西瓜"},{"id":1025516,"name":"水晶草莓"},{"id":1025517,"name":"水晶苹果"},{"id":1025518,"name":"水晶香蕉"},{"id":1025520,"name":"水晶桃子"},{"id":1025521,"name":"水晶橙子"},{"id":1025522,"name":"水结石榴"},{"id":1025524,"name":"水晶柚子"},{"id":1025525,"name":"水晶甘蔗"},{"id":1025529,"name":"水晶核桃"},{"id":1025530,"name":"水晶榛子"},{"id":1025532,"name":"水晶山楂"},{"id":1025533,"name":"水晶红枣"},{"id":1025536,"name":"水晶菠菜"},{"id":1025549,"name":"水晶红玫瑰"},{"id":1025555,"name":"水晶向日葵"},{"id":1025556,"name":"水晶天香百合"},{"id":1025557,"name":"水晶薰衣草"},{"id":1025558,"name":"水晶康乃馨"},{"id":1025559,"name":"水晶郁金香"},{"id":1025568,"name":"水晶樱花"},{"id":1025569,"name":"水晶梅花"},{"id":1025570,"name":"水晶兰花"},{"id":1025575,"name":"水晶月季"},{"id":1025576,"name":"水晶风信子"},{"id":1025577,"name":"水晶牵牛花"},{"id":1025578,"name":"水晶满天星"},{"id":1025579,"name":"水晶蔷薇"},{"id":1025580,"name":"水晶蝴蝶兰"},{"id":1025581,"name":"水晶茉莉"},{"id":1025582,"name":"水晶银杏树苗"},{"id":1025583,"name":"水晶钻石玫瑰"},{"id":1025584,"name":"水晶爱心果"}
];

const MUTATION_TYPE_MAP = {
    1: { name: '冰冻', icon: '❄️', type: 1, class: 'mutant-ice', color: '#3b82f6' },
    2: { name: '爱心', icon: '❤️', type: 2, class: 'mutant-love', color: '#ec4899' },
    3: { name: '暗化', icon: '🌑', type: 3, class: 'mutant-dark', color: '#1f2937' },
    4: { name: '湿润', icon: '💧', type: 4, class: 'mutant-wet', color: '#06b6d4' },
    5: { name: '黄金', icon: '✨', type: 5, class: 'mutant-gold', color: '#eab308' },
    6: { name: '哈哈', icon: '🎃', type: 6, class: 'mutant-pumpkin', color: '#ea580c' },
    7: { name: '塔塔', icon: '🏰', type: 7, class: 'mutant-tower', color: '#7c3aed' },
    55: { name: '水晶', icon: '💎', type: 55, class: 'mutant-crystal', color: '#a855f7' },
    105: { name: '闪耀', icon: '⭐', type: 105, class: 'mutant-shine', color: '#fbbf24' },
    337: { name: '幸运', icon: '🍀', type: 337, class: 'mutant-lucky', color: '#22c55e' },
    393: { name: '冰晶', icon: '🔹', type: 393, class: 'mutant-ice-crystal', color: '#0ea5e9' },
    402: { name: '沙漠', icon: '🏜️', type: 402, class: 'mutant-desert', color: '#d97706' },
    611: { name: '奢华', icon: '👑', type: 611, class: 'mutant-luxury', color: '#f59e0b' },
    671: { name: '落雪', icon: '🌨️', type: 671, class: 'mutant-snow', color: '#e0f2fe' },
};

const PHASE_MAP = {
    0: { name: '未知', icon: '❓' },
    1: { name: '种子', icon: '🌰' },
    2: { name: '发芽', icon: '🌱' },
    3: { name: '小叶', icon: '🍃' },
    4: { name: '大叶', icon: '🌿' },
    5: { name: '开花', icon: '🌸' },
    6: { name: '成熟', icon: '🍎' },
    7: { name: '枯死', icon: '💀' }
};

const WEATHER_MAP = {
    0: { name: '晴朗', icon: '☀️' },
    1: { name: '多云', icon: '☁️' },
    2: { name: '下雨', icon: '🌧️' },
    3: { name: '刮风', icon: '🌬️' },
    4: { name: '雷电', icon: '⚡' },
    5: { name: '下雪', icon: '❄️' }
};

function getPhaseInfo(phase) {
    return PHASE_MAP[phase] || { name: `阶段${phase}`, icon: '🌱' };
}

function getPlantIcon(plantName) {
    const iconMap = {
        '白萝卜': '🥕', '胡萝卜': '🥕', '大白菜': '🥬', '大蒜': '🧄', '大葱': '🌿',
        '水稻': '🌾', '小麦': '🌾', '玉米': '🌽', '土豆': '🥔', '番茄': '🍅',
        '茄子': '🍆', '辣椒': '🌶️', '黄瓜': '🥒', '南瓜': '🎃', '西瓜': '🍉',
        '草莓': '🍓', '苹果': '🍎', '香蕉': '🍌', '红枣': '🔴', '核桃': '🥜',
        '向日葵': '🌻', '玫瑰': '🌹', '百合': '🌸', '菊花': '🌼', '蒲公英': '🌨️',
        '满天星': '✨', '牵牛花': '🌀', '四叶草': '🍀', '荷花': '🪷', '牡丹': '🌺',
        '茉莉': '🫣', '桂花': '🌸', '薰衣草': '💜', '仙人掌': '🌵', '竹子': '🎋',
        '蘑菇': '🍄', '灵芝': '🍄', '人参': '🪴', '薄荷': '🌿', '艾草': '🌿',
        '樱花': '🌸', '梅花': '🌸', '兰花': '🌸', '茶花': '🌸', '杜鹃': '🌸',
        '海棠': '🌸', '栀子': '🌸', '月季': '🌹', '郁金香': '🌷', '康乃馨': '💐',
        '勿忘我': '💙', '风信子': '💜', '紫罗兰': '💜', '三色堇': '🌸', '马蹄莲': '⚪'
    };
    for (const [name, icon] of Object.entries(iconMap)) {
        if (plantName.includes(name)) return icon;
    }
    return '🌱';
}

function getPlantName(plantId) {
    const plant = PLANT_DATA.find(p => p.id === plantId);
    return plant ? plant.name : `植物${plantId}`;
}

function getPlantById(plantId) {
    return PLANT_DATA.find(p => p.id === Number(plantId));
}

function getPhaseName(phase) {
    return getPhaseInfo(phase).name;
}

function getPhaseIcon(phase) {
    return getPhaseInfo(phase).icon;
}

function getWeatherInfo(weatherId) {
    return WEATHER_MAP[weatherId] || { name: `weather${weatherId}`, icon: '*' };
}

function formatTime(timestamp) {
    if (!timestamp) return '';
    const d = new Date(Number(timestamp) * 1000);
    const pad = value => String(value).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getMutantTypeById(mutantConfigId) {
    if (MUTATION_TYPE_MAP[mutantConfigId]) {
        return MUTATION_TYPE_MAP[mutantConfigId];
    }
    const baseId = Math.floor(Number(mutantConfigId) / 100) * 100;
    if (MUTATION_TYPE_MAP[baseId]) {
        return MUTATION_TYPE_MAP[baseId];
    }
    return { name: 'mutant', icon: '*', type: 0, class: 'mutant-gold', color: '#eab308' };
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[ch]);
}

function hexToBytes(hex) {
    hex = hex.replace(/\s+/g, '');
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
}

class ProtoReader {
    constructor(bytes) {
        this.buf = bytes;
        this.pos = 0;
    }

    readByte() {
        return this.buf[this.pos++];
    }

    readVarint() {
        let result = 0;
        let shift = 0;
        let byte;
        let iterations = 0;
        const maxIterations = 100;
        do {
            if (iterations++ >= maxIterations || this.pos >= this.buf.length) {
                break;
            }
            byte = this.readByte();
            result |= (byte & 0x7F) << shift;
            shift += 7;
        } while ((byte & 0x80) !== 0 && shift < 70);
        return result;
    }

    readFixed32() {
        let result = 0;
        for (let i = 0; i < 4; i++) {
            result |= this.readByte() << (i * 8);
        }
        return result >>> 0;
    }

    readFixed64() {
        let result = 0;
        for (let i = 0; i < 8; i++) {
            result += this.readByte() * Math.pow(2, i * 8);
        }
        return result;
    }

    readString() {
        const length = this.readVarint();
        let result = '';
        const end = this.pos + length;
        while (this.pos < end) {
            const byte = this.readByte();
            if (byte < 128) {
                result += String.fromCharCode(byte);
            } else if (byte >= 192 && byte < 224) {
                const byte2 = this.readByte();
                result += String.fromCharCode(((byte & 31) << 6) | (byte2 & 63));
            } else if (byte >= 224 && byte < 240) {
                const byte2 = this.readByte();
                const byte3 = this.readByte();
                result += String.fromCharCode(((byte & 15) << 12) | ((byte2 & 63) << 6) | (byte3 & 63));
            } else {
                const byte2 = this.readByte();
                const byte3 = this.readByte();
                const byte4 = this.readByte();
                const codePoint = ((byte & 7) << 18) | ((byte2 & 63) << 12) | ((byte3 & 63) << 6) | (byte4 & 63);
                const surrogate = codePoint - 0x10000;
                result += String.fromCharCode(0xD800 + (surrogate >> 10), 0xDC00 + (surrogate & 0x3FF));
            }
        }
        return result;
    }

    readBytes() {
        const length = this.readVarint();
        const result = this.buf.slice(this.pos, this.pos + length);
        this.pos += length;
        return result;
    }

    readPackedVarints() {
        const length = this.readVarint();
        const end = this.pos + length;
        const values = [];
        while (this.pos < end) {
            values.push(this.readVarint());
        }
        return values;
    }

    readMessage(decodeFn) {
        const length = this.readVarint();
        const start = this.pos;
        const result = decodeFn(this);
        this.pos = start + length;
        return result;
    }

    skipField(wireType) {
        switch (wireType) {
            case 0: this.readVarint(); break;
            case 1: this.pos += 8; break;
            case 2: {
                const len = this.readVarint();
                this.pos += len;
                break;
            }
            case 3: {
                let iterations = 0;
                const maxIterations = 1000;
                while (iterations++ < maxIterations && this.pos < this.buf.length) {
                    const tag = this.readVarint();
                    if (tag === 0) break;
                    this.skipField(tag & 7);
                }
                break;
            }
            case 4: break;
            case 5: this.pos += 4; break;
        }
        if (this.pos > this.buf.length) {
            this.pos = this.buf.length;
        }
    }

    remaining() {
        return this.buf.length - this.pos;
    }
}

function decodeMeta(reader) {
    const meta = {};
    while (reader.remaining() > 0) {
        const tag = reader.readVarint();
        const fieldId = tag >>> 3;
        const wireType = tag & 7;
        switch (fieldId) {
            case 1: meta.service_name = reader.readString(); break;
            case 2: meta.method_name = reader.readString(); break;
            case 3: meta.message_type = reader.readVarint(); break;
            case 4: meta.client_seq = reader.readVarint(); break;
            case 5: meta.server_seq = reader.readVarint(); break;
            case 6: meta.error_code = reader.readVarint(); break;
            case 7: meta.error_message = reader.readString(); break;
            default: reader.skipField(wireType);
        }
    }
    return meta;
}

function decodeGateMessage(reader) {
    const message = { meta: {}, body: null };
    while (reader.remaining() > 0) {
        const tag = reader.readVarint();
        const fieldId = tag >>> 3;
        const wireType = tag & 7;
        switch (fieldId) {
            case 1: {
                const len = reader.readVarint();
                const subBuf = reader.buf.slice(reader.pos, reader.pos + len);
                reader.pos += len;
                message.meta = decodeMeta(new ProtoReader(subBuf));
                break;
            }
            case 2:
                message.body = reader.readBytes();
                break;
            default:
                reader.skipField(wireType);
        }
    }
    return message;
}

function decodeLandInfo(reader) {
    const land = { id: 0, unlocked: false, level: 0 };
    while (reader.remaining() > 0) {
        const tag = reader.readVarint();
        const fieldId = tag >>> 3;
        const wireType = tag & 7;
        switch (fieldId) {
            case 1: land.id = reader.readVarint(); break;
            case 2: land.unlocked = reader.readVarint() !== 0; break;
            case 3: land.level = reader.readVarint(); break;
            case 10: {
                const len = reader.readVarint();
                const subBuf = reader.buf.slice(reader.pos, reader.pos + len);
                reader.pos += len;
                land.plant = decodePlantInfo(new ProtoReader(subBuf));
                break;
            }
            default: reader.skipField(wireType);
        }
    }
    return land;
}

function decodePlantInfo(reader) {
    const plant = { id: 0, phases: [], mutant_config_ids: [] };
    while (reader.remaining() > 0) {
        const tag = reader.readVarint();
        const fieldId = tag >>> 3;
        const wireType = tag & 7;
        switch (fieldId) {
            case 1: plant.id = reader.readVarint(); break;
            case 2: plant.name = reader.readString(); break;
            case 4: {
                const len = reader.readVarint();
                const subBuf = reader.buf.slice(reader.pos, reader.pos + len);
                reader.pos += len;
                plant.phases = plant.phases || [];
                plant.phases.push(decodePlantPhaseInfo(new ProtoReader(subBuf)));
                break;
            }
            case 6: plant.dry_num = reader.readVarint(); break;
            case 11: plant.fruit_num = reader.readVarint(); break;
            case 12:
                plant.weed_owners = plant.weed_owners || [];
                if (wireType === 2) {
                    plant.weed_owners.push(...reader.readPackedVarints());
                } else {
                    plant.weed_owners.push(reader.readVarint());
                }
                break;
            case 13:
                plant.insect_owners = plant.insect_owners || [];
                if (wireType === 2) {
                    plant.insect_owners.push(...reader.readPackedVarints());
                } else {
                    plant.insect_owners.push(reader.readVarint());
                }
                break;
            case 15: plant.grow_sec = reader.readVarint(); break;
            case 16: plant.stealable = reader.readVarint() !== 0; break;
            case 18: plant.left_fruit_num = reader.readVarint(); break;
            case 20:
                plant.mutant_config_ids = plant.mutant_config_ids || [];
                if (wireType === 2) {
                    plant.mutant_config_ids.push(...reader.readPackedVarints());
                } else {
                    plant.mutant_config_ids.push(reader.readVarint());
                }
                break;
            default: reader.skipField(wireType);
        }
    }
    return plant;
}

function decodePlantPhaseInfo(reader) {
    const phase = { phase: 0, mutants: [] };
    while (reader.remaining() > 0) {
        const tag = reader.readVarint();
        const fieldId = tag >>> 3;
        const wireType = tag & 7;
        switch (fieldId) {
            case 1: phase.phase = reader.readVarint(); break;
            case 10: {
                const len = reader.readVarint();
                const subBuf = reader.buf.slice(reader.pos, reader.pos + len);
                reader.pos += len;
                phase.mutants = phase.mutants || [];
                phase.mutants.push(decodeMutantInfo(new ProtoReader(subBuf)));
                break;
            }
            default: reader.skipField(wireType);
        }
    }
    return phase;
}

function decodeMutantInfo(reader) {
    const mutant = {};
    while (reader.remaining() > 0) {
        const tag = reader.readVarint();
        const fieldId = tag >>> 3;
        const wireType = tag & 7;
        switch (fieldId) {
            case 1: mutant.mutant_time = reader.readVarint(); break;
            case 2: mutant.mutant_config_id = reader.readVarint(); break;
            case 3: mutant.weather_id = reader.readVarint(); break;
            default: reader.skipField(wireType);
        }
    }
    return mutant;
}

function decodeFarmLandList(reader) {
    const data = { lands: [], weather: 0, gold: 0, level: 0 };
    while (reader.remaining() > 0) {
        const tag = reader.readVarint();
        const fieldId = tag >>> 3;
        const wireType = tag & 7;
        switch (fieldId) {
            case 1: {
                const len = reader.readVarint();
                const subBuf = reader.buf.slice(reader.pos, reader.pos + len);
                reader.pos += len;
                data.lands = data.lands || [];
                data.lands.push(decodeLandInfo(new ProtoReader(subBuf)));
                break;
            }
            case 2: data.weather = reader.readVarint(); break;
            case 3: data.gold = reader.readVarint(); break;
            case 4: data.level = reader.readVarint(); break;
            default: reader.skipField(wireType);
        }
    }
    return data;
}

function decodeEnterReply(reader) {
    const data = { lands: [] };
    while (reader.remaining() > 0) {
        const tag = reader.readVarint();
        const fieldId = tag >>> 3;
        const wireType = tag & 7;
        switch (fieldId) {
            case 2: {
                const len = reader.readVarint();
                const subBuf = reader.buf.slice(reader.pos, reader.pos + len);
                reader.pos += len;
                data.lands.push(decodeLandInfo(new ProtoReader(subBuf)));
                break;
            }
            default:
                reader.skipField(wireType);
        }
    }
    return data;
}

function countPlants(lands) {
    return lands.filter(land => land && land.plant).length;
}

function decodeLandsFromBody(meta, bodyData) {
    const serviceName = meta?.service_name || '';
    const methodName = meta?.method_name || '';

    if (serviceName.includes('VisitService') || methodName.includes('Enter')) {
        return decodeEnterReply(new ProtoReader(bodyData));
    }

    const allLandsData = decodeFarmLandList(new ProtoReader(bodyData));
    if (countPlants(allLandsData.lands) > 0) {
        return allLandsData;
    }

    const enterData = decodeEnterReply(new ProtoReader(bodyData));
    if (countPlants(enterData.lands) > 0) {
        return enterData;
    }

    return allLandsData;
}

function extractMutants(lands) {
    const mutants = [];
    for (const land of lands) {
        if (!land.plant) continue;
        const plantInfo = land.plant;
        
        const allMutantIds = new Set();
        
        if (plantInfo.mutant_config_ids && plantInfo.mutant_config_ids.length > 0) {
            for (const mutantId of plantInfo.mutant_config_ids) {
                allMutantIds.add(mutantId);
            }
        }
        
        if (plantInfo.phases && plantInfo.phases.length > 0) {
            for (const phaseItem of plantInfo.phases) {
                if (phaseItem.mutants && phaseItem.mutants.length > 0) {
                    for (const mutantItem of phaseItem.mutants) {
                        if (mutantItem.mutant_config_id) {
                            allMutantIds.add(mutantItem.mutant_config_id);
                        }
                    }
                }
            }
        }
        
        if (allMutantIds.size > 0) {
            mutants.push({
                landId: land.id,
                plantId: plantInfo.id,
                plantName: plantInfo.name || getPlantName(plantInfo.id),
                mutantIds: Array.from(allMutantIds)
            });
        }
    }
    return mutants;
}

function renderResults(data) {
    const container = document.getElementById('resultContainer');
    const content = document.getElementById('resultContent');
    const status = document.getElementById('resultStatus');
    
    container.style.display = 'block';
    
    const mutants = extractMutants(data.lands);
    
    if (mutants.length === 0) {
        status.className = 'bg-gray-100 text-gray-600';
        status.textContent = '无变异植物';
        content.innerHTML = '<div class="p-8 text-center text-gray-500">暂无变异植物数据</div>';
        return;
    }
    
    status.className = 'bg-green-100 text-green-700';
    status.textContent = `发现 ${mutants.length} 株变异植物`;
    
    let html = '<div class="p-4 sm:p-6">';
    
    for (const mutant of mutants) {
        html += `
            <div class="border-b border-gray-100 last:border-b-0 py-4">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-lg">${getPlantIcon(mutant.plantName)}</span>
                        <span class="font-semibold text-gray-800">${mutant.plantName}</span>
                        <span class="text-xs text-gray-400">土地${mutant.landId}</span>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-500">原始变异ID:</span>
                    <div class="flex flex-wrap gap-2">
        `;
        
        for (const mutantId of mutant.mutantIds) {
            html += `<span class="px-2 py-1 bg-amber-100 text-amber-700 rounded text-sm font-mono">${mutantId}</span>`;
        }
        
        html += `
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    content.innerHTML = html;
}

function extractMutants(lands) {
    const mutants = [];
    for (const land of lands || []) {
        if (!land.plant) continue;
        const plantInfo = land.plant;
        const plantId = plantInfo.id;
        const basePlant = getPlantById(plantId);
        const plantName = plantInfo.name || basePlant?.name || getPlantName(plantId);
        const plantIcon = getPlantIcon(plantName);
        const lastPhase = plantInfo.phases?.[plantInfo.phases.length - 1];
        const phase = lastPhase?.phase || 0;
        const phaseInfo = getPhaseInfo(phase);
        const mutantDetails = [];
        let primaryMutantType = 1;

        for (const mutantId of plantInfo.mutant_config_ids || []) {
            const mutantPlant = getPlantById(mutantId);
            const mutantName = mutantPlant?.name || getPlantName(mutantId);
            const mutantTypeInfo = getMutantTypeById(mutantId);
            if (mutantDetails.length === 0) {
                primaryMutantType = mutantTypeInfo.type;
            }
            mutantDetails.push({
                configId: mutantId,
                name: mutantName,
                icon: getPlantIcon(mutantName),
                plant: mutantPlant,
                mutantType: mutantTypeInfo.name,
                mutantTypeId: mutantTypeInfo.type,
                mutantTypeIcon: mutantTypeInfo.icon
            });
        }

        for (const phaseItem of plantInfo.phases || []) {
            for (const mutantItem of phaseItem.mutants || []) {
                const mutantId = mutantItem.mutant_config_id;
                if (!mutantId || mutantDetails.find(m => m.configId === mutantId)) continue;
                const mutantPlant = getPlantById(mutantId);
                const mutantName = mutantPlant?.name || getPlantName(mutantId);
                const weatherInfo = getWeatherInfo(mutantItem.weather_id);
                const mutantTypeInfo = getMutantTypeById(mutantId);
                if (mutantDetails.length === 0) {
                    primaryMutantType = mutantTypeInfo.type;
                }
                mutantDetails.push({
                    configId: mutantId,
                    name: mutantName,
                    icon: getPlantIcon(mutantName),
                    plant: mutantPlant,
                    mutantTime: formatTime(mutantItem.mutant_time),
                    weatherId: mutantItem.weather_id,
                    weatherName: weatherInfo.name,
                    weatherIcon: weatherInfo.icon,
                    phase: phaseItem.phase,
                    phaseName: getPhaseName(phaseItem.phase),
                    phaseIcon: getPhaseIcon(phaseItem.phase),
                    mutantType: mutantTypeInfo.name,
                    mutantTypeId: mutantTypeInfo.type,
                    mutantTypeIcon: mutantTypeInfo.icon
                });
            }
        }

        if (mutantDetails.length > 0) {
            mutants.push({
                landId: land.id,
                plantId,
                plantName,
                plantIcon,
                plant: basePlant,
                phase,
                phaseName: phaseInfo.name,
                phaseIcon: phaseInfo.icon,
                mutantDetails,
                mutantIds: mutantDetails.map(m => m.configId),
                mutantType: primaryMutantType,
                mutantTypeInfo: getMutantTypeById(mutantDetails[0]?.configId || primaryMutantType),
                stealable: plantInfo.stealable,
                fruitNum: plantInfo.fruit_num,
                leftFruitNum: plantInfo.left_fruit_num,
                growSec: plantInfo.grow_sec,
                dryNum: plantInfo.dry_num,
                hasWeeds: (plantInfo.weed_owners && plantInfo.weed_owners.length > 0),
                hasInsects: (plantInfo.insect_owners && plantInfo.insect_owners.length > 0)
            });
        }
    }
    return mutants;
}

function renderResults(data) {
    const container = document.getElementById('resultContainer');
    const content = document.getElementById('resultContent');
    const status = document.getElementById('resultStatus');
    const lands = [...(data.lands || [])].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
    const mutants = extractMutants(lands);
    const meta = data.meta || {};
    const typeName = { 1: 'request', 2: 'response', 3: 'notify' }[meta.message_type] || 'unknown';

    container.style.display = 'block';
    status.className = mutants.length > 0
        ? 'px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700'
        : 'px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700';
    status.textContent = mutants.length > 0 ? `发现 ${mutants.length} 个变异` : '解析成功';

    let html = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 sm:p-6 border-b border-gray-100">
            <div class="bg-gray-50 rounded-lg p-3 text-center">
                <div class="text-xs text-gray-500 mb-1">服务</div>
                <div class="text-sm font-semibold text-gray-700">${escapeHtml(meta.service_name || 'unknown')}</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-3 text-center">
                <div class="text-xs text-gray-500 mb-1">方法</div>
                <div class="text-sm font-semibold text-gray-700">${escapeHtml(meta.method_name || 'unknown')}</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-3 text-center">
                <div class="text-xs text-gray-500 mb-1">类型</div>
                <div class="text-sm font-semibold text-gray-700">${escapeHtml(typeName)}</div>
            </div>
            <div class="bg-gray-50 rounded-lg p-3 text-center">
                <div class="text-xs text-gray-500 mb-1">土地数</div>
                <div class="text-sm font-semibold text-gray-700">${lands.length}</div>
            </div>
        </div>
        <div class="p-4 sm:p-6">
            <h3 class="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2">
                <span>🏙</span> 农场土地 (4x6)
            </h3>
            <div class="land-grid">
    `;

    for (let row = 0; row < 4; row++) {
        for (let col = 5; col >= 0; col--) {
            const landId = col * 4 + row + 1;
            const land = lands.find(l => Number(l.id) === landId);
            if (!land) {
                html += '<div class="land-cell locked"><span class="text-xs text-gray-400">--</span></div>';
                continue;
            }

            const hasPlant = !!(land.plant && land.plant.id);
            const mutantInfo = mutants.find(m => Number(m.landId) === landId);
            const isMutant = !!mutantInfo;
            let cellClass = 'land-cell ';
            let mutantTypeInfo = null;

            if (!land.unlocked) {
                cellClass += 'locked';
            } else if (!hasPlant) {
                cellClass += 'unlocked empty';
            } else if (isMutant && mutantInfo.mutantTypeInfo) {
                cellClass += `mutant ${mutantInfo.mutantTypeInfo.class || 'mutant-gold'}`;
                mutantTypeInfo = mutantInfo.mutantTypeInfo;
            } else {
                cellClass += 'unlocked';
            }

            const plant = land.plant || {};
            const lastPhase = plant.phases?.[plant.phases.length - 1];
            const phaseInfo = getPhaseInfo(lastPhase?.phase || 0);
            const plantName = hasPlant ? (plant.name || getPlantName(plant.id)) : '';
            const title = `土地${landId}: ${hasPlant ? plantName : '空土地'}${isMutant ? ' ' + mutantInfo.mutantDetails.map(m => m.mutantType).join(', ') : ''}`;

            html += `<div class="${cellClass}" title="${escapeHtml(title)}">
                <span class="text-xs text-gray-400 font-mono" style="position:absolute;top:4px;left:4px;font-size:8px;">#${landId}</span>`;

            if (!land.unlocked) {
                html += '<span class="text-xs text-gray-400">🔒</span>';
            } else if (!hasPlant) {
                html += '<span class="text-xs text-amber-700">空</span>';
            } else {
                html += `
                    <span class="plant-icon">${isMutant && mutantTypeInfo ? mutantTypeInfo.icon : getPlantIcon(plantName)}</span>
                    <span class="plant-name">${escapeHtml(plantName)}</span>
                    <span class="plant-phase">${escapeHtml(phaseInfo.name)}</span>
                `;
                if (isMutant && mutantInfo.mutantDetails.length > 0) {
                    const seenTypes = new Set();
                    html += '<div class="mutant-tags">';
                    for (const detail of mutantInfo.mutantDetails) {
                        if (seenTypes.has(detail.mutantType)) continue;
                        seenTypes.add(detail.mutantType);
                        html += `<span class="mutant-type-tag">${escapeHtml(detail.mutantTypeIcon || '*')} ${escapeHtml(detail.mutantType)}</span>`;
                    }
                    html += '</div>';
                }
            }

            if (isMutant) {
                html += '<div class="mutant-badge">*</div>';
            }
            html += '</div>';
        }
    }

    html += '</div></div>';

    if (mutants.length > 0) {
        html += '<div class="p-4 sm:p-6 border-t border-gray-100">';
        html += '<h3 class="text-sm font-semibold text-gray-600 mb-4">变异详情</h3>';
        for (const mutant of mutants) {
            const detailText = mutant.mutantDetails.map(item => `${item.name}(${item.configId})`).join(', ');
            html += `
                <div class="border-b border-gray-100 last:border-b-0 py-3">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <span class="text-lg">${mutant.plantIcon}</span>
                            <span class="font-semibold text-gray-800">${escapeHtml(mutant.plantName)}</span>
                            <span class="text-xs text-gray-500">土地${mutant.landId}</span>
                        </div>
                    </div>
                    <div class="text-xs text-gray-500">${escapeHtml(detailText)}</div>
                </div>
            `;
        }
        html += '</div>';
    }

    content.innerHTML = html;
}

function handleParse(event) {
    event.preventDefault();
    
    const hexInput = document.getElementById('hex');
    const hex = hexInput.value.trim();
    
    if (!hex) {
        showToast('请输入HEX数据');
        return;
    }
    
    try {
        const bytes = hexToBytes(hex);
        const gateMessage = decodeGateMessage(new ProtoReader(bytes));
        if (!gateMessage.body || gateMessage.body.length === 0) {
            throw new Error('消息体为空');
        }

        const farmData = decodeLandsFromBody(gateMessage.meta, gateMessage.body);
        farmData.meta = gateMessage.meta;
        renderResults(farmData);
        
    } catch (error) {
        console.error('解析错误:', error);
        showToast('解析失败: ' + error.message);
    }
}

function handlePaste() {
    navigator.clipboard.readText().then(text => {
        document.getElementById('hex').value = text;
        showToast('已粘贴剪贴板内容');
    }).catch(err => {
        showToast('粘贴失败');
    });
}

function handleClear() {
    document.getElementById('hex').value = '';
    document.getElementById('resultContainer').style.display = 'none';
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 2500);
}

let autoParseEnabled = false;

document.getElementById('toggleSwitch').addEventListener('click', function() {
    autoParseEnabled = !autoParseEnabled;
    this.classList.toggle('active', autoParseEnabled);
    showToast(autoParseEnabled ? '已开启自动解析' : '已关闭自动解析');
});

setInterval(() => {
    if (autoParseEnabled) {
        navigator.clipboard.readText().then(text => {
            const hexInput = document.getElementById('hex');
            if (text && text !== hexInput.value && /^[0-9a-fA-F\s]+$/.test(text.replace(/\s/g, ''))) {
                hexInput.value = text;
                const event = new Event('submit');
                document.getElementById('parseForm').dispatchEvent(event);
            }
        }).catch(() => {});
    }
}, 2000);
