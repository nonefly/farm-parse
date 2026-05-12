let plantConfig = null;

window.onerror = function(message, source, lineno, colno, error) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-md text-sm';
    errorDiv.innerHTML = `<div class="font-semibold mb-1">❌ 页面错误</div><div>${message}</div>`;
    document.body.appendChild(errorDiv);
    setTimeout(() => {
        errorDiv.remove();
    }, 10000);
    // console.error('页面错误:', message, source, lineno, colno, error);
    return true;
};

const PLANT_DATA = [
    {"id":1020002,"name":"白萝卜"},{"id":1020003,"name":"胡萝卜"},{"id":1020059,"name":"大白菜"},{"id":1020065,"name":"大蒜"},{"id":1020064,"name":"大葱"},{"id":1020060,"name":"水稻"},{"id":1020061,"name":"小麦"},{"id":1020004,"name":"玉米"},{"id":1020005,"name":"土豆"},{"id":1020007,"name":"番茄"},{"id":1020006,"name":"茄子"},{"id":1020009,"name":"辣椒"},{"id":1020097,"name":"黄瓜"},{"id":1020010,"name":"南瓜"},{"id":1020014,"name":"西瓜"},{"id":1020001,"name":"草莓"},{"id":1020011,"name":"苹果"},{"id":1020062,"name":"四叶草"},{"id":1020145,"name":"向日葵"},{"id":1020041,"name":"红玫瑰"},{"id":1020013,"name":"葡萄"},{"id":1020015,"name":"香蕉"},{"id":1020018,"name":"桃子"},{"id":1020019,"name":"橙子"},{"id":1020128,"name":"茉莉花"},{"id":1020023,"name":"石榴"},{"id":1020103,"name":"天香百合"},{"id":1020108,"name":"郁金香"},{"id":1020138,"name":"风信子"},{"id":1020147,"name":"牵牛花"},{"id":1020110,"name":"满天星"},{"id":1020149,"name":"银杏树苗"},{"id":1020150,"name":"蝴蝶兰"},{"id":1020151,"name":"蔷薇"},{"id":1020152,"name":"钻石玫瑰"},{"id":1020153,"name":"爱心果"},{"id":1025501,"name":"水晶白萝卜"},{"id":1025502,"name":"水晶胡萝卜"},{"id":1025503,"name":"水晶大白菜"},{"id":1025507,"name":"水晶小麦"},{"id":1025508,"name":"水晶玉米"},{"id":1025510,"name":"水晶番茄"},{"id":1025511,"name":"水晶茄子"},{"id":1025513,"name":"水晶黄瓜"},{"id":1025514,"name":"水晶南瓜"},{"id":1025515,"name":"水晶西瓜"},{"id":1025516,"name":"水晶草莓"},{"id":1025517,"name":"水晶苹果"},{"id":1025518,"name":"水晶香蕉"},{"id":1025520,"name":"水晶桃子"},{"id":1025521,"name":"水晶橙子"},{"id":1025522,"name":"水结石榴"},{"id":1025524,"name":"水晶柚子"},{"id":1025525,"name":"水晶甘蔗"},{"id":1025529,"name":"水晶核桃"},{"id":1025530,"name":"水晶榛子"},{"id":1025532,"name":"水晶山楂"},{"id":1025533,"name":"水晶红枣"},{"id":1025536,"name":"水晶菠菜"},{"id":1025549,"name":"水晶红玫瑰"},{"id":1025555,"name":"水晶向日葵"},{"id":1025556,"name":"水晶天香百合"},{"id":1025557,"name":"水晶薰衣草"},{"id":1025558,"name":"水晶康乃馨"},{"id":1025559,"name":"水晶郁金香"},{"id":1025568,"name":"水晶樱花"},{"id":1025569,"name":"水晶梅花"},{"id":1025570,"name":"水晶兰花"},{"id":1025575,"name":"水晶月季"},{"id":1025576,"name":"水晶风信子"},{"id":1025580,"name":"水晶牡丹"},{"id":1025581,"name":"水晶荷花"},{"id":1025582,"name":"水晶茉莉花"},{"id":1030501,"name":"闪耀白萝卜"},{"id":1030502,"name":"闪耀胡萝卜"},{"id":1030503,"name":"闪耀大白菜"},{"id":1030507,"name":"闪耀小麦"},{"id":1030508,"name":"闪耀玉米"},{"id":1030510,"name":"闪耀番茄"},{"id":1030511,"name":"闪耀茄子"},{"id":1030513,"name":"闪耀黄瓜"},{"id":1030514,"name":"闪耀南瓜"},{"id":1030515,"name":"闪耀西瓜"},{"id":1030516,"name":"闪耀草莓"},{"id":1030517,"name":"闪耀苹果"},{"id":1030518,"name":"闪耀香蕉"},{"id":1030520,"name":"闪耀桃子"},{"id":1030521,"name":"闪耀橙子"},{"id":1030522,"name":"闪耀石榴"},{"id":1030524,"name":"闪耀柚子"},{"id":1030525,"name":"闪耀甘蔗"},{"id":1030529,"name":"闪耀核桃"},{"id":1030530,"name":"闪耀榛子"},{"id":1030532,"name":"闪耀山楂"},{"id":1030533,"name":"闪耀红枣"},{"id":1030536,"name":"闪耀菠菜"},{"id":1030549,"name":"闪耀红玫瑰"},{"id":1030555,"name":"闪耀向日葵"},{"id":1030556,"name":"闪耀天香百合"},{"id":1030557,"name":"闪耀薰衣草"},{"id":1030558,"name":"闪耀康乃馨"},{"id":1030559,"name":"闪耀郁金香"},{"id":1030568,"name":"闪耀樱花"},{"id":1030569,"name":"闪耀梅花"},{"id":1030570,"name":"闪耀兰花"},{"id":1030575,"name":"闪耀月季"},{"id":1030576,"name":"闪耀风信子"},{"id":1030580,"name":"闪耀牡丹"},{"id":1030581,"name":"闪耀荷花"},{"id":1030582,"name":"闪耀茉莉花"},{"id":1033701,"name":"幸运白萝卜"},{"id":1033702,"name":"幸运胡萝卜"},{"id":1033703,"name":"幸运大白菜"},{"id":1033707,"name":"幸运小麦"},{"id":1033708,"name":"幸运玉米"},{"id":1033710,"name":"幸运番茄"},{"id":1033711,"name":"幸运茄子"},{"id":1033713,"name":"幸运黄瓜"},{"id":1033714,"name":"幸运南瓜"},{"id":1033715,"name":"幸运西瓜"},{"id":1033716,"name":"幸运草莓"},{"id":1033717,"name":"幸运苹果"},{"id":1033718,"name":"幸运香蕉"},{"id":1033720,"name":"幸运桃子"},{"id":1033721,"name":"幸运橙子"},{"id":1033722,"name":"幸运石榴"},{"id":1033724,"name":"幸运柚子"},{"id":1033725,"name":"幸运甘蔗"},{"id":1033729,"name":"幸运核桃"},{"id":1033730,"name":"幸运榛子"},{"id":1033732,"name":"幸运山楂"},{"id":1033733,"name":"幸运红枣"},{"id":1033736,"name":"幸运菠菜"},{"id":1033749,"name":"幸运红玫瑰"},{"id":1033755,"name":"幸运向日葵"},{"id":1033756,"name":"幸运天香百合"},{"id":1033757,"name":"幸运薰衣草"},{"id":1033758,"name":"幸运康乃馨"},{"id":1033759,"name":"幸运郁金香"},{"id":1033768,"name":"幸运樱花"},{"id":1033769,"name":"幸运梅花"},{"id":1033770,"name":"幸运兰花"},{"id":1033775,"name":"幸运月季"},{"id":1033776,"name":"幸运风信子"},{"id":1033780,"name":"幸运牡丹"},{"id":1033781,"name":"幸运荷花"},{"id":1033782,"name":"幸运茉莉花"},{"id":1039301,"name":"冰晶白萝卜"},{"id":1039302,"name":"冰晶胡萝卜"},{"id":1039303,"name":"冰晶大白菜"},{"id":1039307,"name":"冰晶小麦"},{"id":1039308,"name":"冰晶玉米"},{"id":1039310,"name":"冰晶番茄"},{"id":1039311,"name":"冰晶茄子"},{"id":1039313,"name":"冰晶黄瓜"},{"id":1039314,"name":"冰晶南瓜"},{"id":1039315,"name":"冰晶西瓜"},{"id":1039316,"name":"冰晶草莓"},{"id":1039317,"name":"冰晶苹果"},{"id":1039318,"name":"冰晶香蕉"},{"id":1039320,"name":"冰晶桃子"},{"id":1039321,"name":"冰晶橙子"},{"id":1039322,"name":"冰晶石榴"},{"id":1039324,"name":"冰晶柚子"},{"id":1039325,"name":"冰晶甘蔗"},{"id":1039329,"name":"冰晶核桃"},{"id":1039330,"name":"冰晶榛子"},{"id":1039332,"name":"冰晶山楂"},{"id":1039333,"name":"冰晶红枣"},{"id":1039336,"name":"冰晶菠菜"},{"id":1039349,"name":"冰晶红玫瑰"},{"id":1039355,"name":"冰晶向日葵"},{"id":1039356,"name":"冰晶天香百合"},{"id":1039357,"name":"冰晶薰衣草"},{"id":1039358,"name":"冰晶康乃馨"},{"id":1039359,"name":"冰晶郁金香"},{"id":1039368,"name":"冰晶樱花"},{"id":1039369,"name":"冰晶梅花"},{"id":1039370,"name":"冰晶兰花"},{"id":1039375,"name":"冰晶月季"},{"id":1039376,"name":"冰晶风信子"},{"id":1039380,"name":"冰晶牡丹"},{"id":1039381,"name":"冰晶荷花"},{"id":1039382,"name":"冰晶茉莉花"},{"id":1040201,"name":"沙漠白萝卜"},{"id":1040202,"name":"沙漠胡萝卜"},{"id":1040203,"name":"沙漠大白菜"},{"id":1040207,"name":"沙漠小麦"},{"id":1040208,"name":"沙漠玉米"},{"id":1040210,"name":"沙漠番茄"},{"id":1040211,"name":"沙漠茄子"},{"id":1040213,"name":"沙漠黄瓜"},{"id":1040214,"name":"沙漠南瓜"},{"id":1040215,"name":"沙漠西瓜"},{"id":1040216,"name":"沙漠草莓"},{"id":1040217,"name":"沙漠苹果"},{"id":1040218,"name":"沙漠香蕉"},{"id":1040220,"name":"沙漠桃子"},{"id":1040221,"name":"沙漠橙子"},{"id":1040222,"name":"沙漠石榴"},{"id":1040224,"name":"沙漠柚子"},{"id":1040225,"name":"沙漠甘蔗"},{"id":1040229,"name":"沙漠核桃"},{"id":1040230,"name":"沙漠榛子"},{"id":1040232,"name":"沙漠山楂"},{"id":1040233,"name":"沙漠红枣"},{"id":1040236,"name":"沙漠菠菜"},{"id":1040249,"name":"沙漠红玫瑰"},{"id":1040255,"name":"沙漠向日葵"},{"id":1040256,"name":"沙漠天香百合"},{"id":1040257,"name":"沙漠薰衣草"},{"id":1040258,"name":"沙漠康乃馨"},{"id":1040259,"name":"沙漠郁金香"},{"id":1040268,"name":"沙漠樱花"},{"id":1040269,"name":"沙漠梅花"},{"id":1040270,"name":"沙漠兰花"},{"id":1040275,"name":"沙漠月季"},{"id":1040276,"name":"沙漠风信子"},{"id":1040280,"name":"沙漠牡丹"},{"id":1040281,"name":"沙漠荷花"},{"id":1040282,"name":"沙漠茉莉花"},{"id":1061101,"name":"奢华白萝卜"},{"id":1061102,"name":"奢华胡萝卜"},{"id":1061103,"name":"奢华大白菜"},{"id":1061107,"name":"奢华小麦"},{"id":1061108,"name":"奢华玉米"},{"id":1061110,"name":"奢华番茄"},{"id":1061111,"name":"奢华茄子"},{"id":1061113,"name":"奢华黄瓜"},{"id":1061114,"name":"奢华南瓜"},{"id":1061115,"name":"奢华西瓜"},{"id":1061116,"name":"奢华草莓"},{"id":1061117,"name":"奢华苹果"},{"id":1061118,"name":"奢华香蕉"},{"id":1061120,"name":"奢华桃子"},{"id":1061121,"name":"奢华橙子"},{"id":1061122,"name":"奢华石榴"},{"id":1061124,"name":"奢华柚子"},{"id":1061125,"name":"奢华甘蔗"},{"id":1061129,"name":"奢华核桃"},{"id":1061130,"name":"奢华榛子"},{"id":1061132,"name":"奢华山楂"},{"id":1061133,"name":"奢华红枣"},{"id":1061136,"name":"奢华菠菜"},{"id":1061149,"name":"奢华红玫瑰"},{"id":1061155,"name":"奢华向日葵"},{"id":1061156,"name":"奢华天香百合"},{"id":1061157,"name":"奢华薰衣草"},{"id":1061158,"name":"奢华康乃馨"},{"id":1061159,"name":"奢华郁金香"},{"id":1061168,"name":"奢华樱花"},{"id":1061169,"name":"奢华梅花"},{"id":1061170,"name":"奢华兰花"},{"id":1061175,"name":"奢华月季"},{"id":1061176,"name":"奢华风信子"},{"id":1061180,"name":"奢华牡丹"},{"id":1061181,"name":"奢华荷花"},{"id":1061182,"name":"奢华茉莉花"},{"id":1067101,"name":"落雪白萝卜"},{"id":1067102,"name":"落雪胡萝卜"},{"id":1067103,"name":"落雪大白菜"},{"id":1067107,"name":"落雪小麦"},{"id":1067108,"name":"落雪玉米"},{"id":1067110,"name":"落雪番茄"},{"id":1067111,"name":"落雪茄子"},{"id":1067113,"name":"落雪黄瓜"},{"id":1067114,"name":"落雪南瓜"},{"id":1067115,"name":"落雪西瓜"},{"id":1067116,"name":"落雪草莓"},{"id":1067117,"name":"落雪苹果"},{"id":1067118,"name":"落雪香蕉"},{"id":1067120,"name":"落雪桃子"},{"id":1067121,"name":"落雪橙子"},{"id":1067122,"name":"落雪石榴"},{"id":1067124,"name":"落雪柚子"},{"id":1067125,"name":"落雪甘蔗"},{"id":1067129,"name":"落雪核桃"},{"id":1067130,"name":"落雪榛子"},{"id":1067132,"name":"落雪山楂"},{"id":1067133,"name":"落雪红枣"},{"id":1067136,"name":"落雪菠菜"},{"id":1067149,"name":"落雪红玫瑰"},{"id":1067155,"name":"落雪向日葵"},{"id":1067156,"name":"落雪天香百合"},{"id":1067157,"name":"落雪薰衣草"},{"id":1067158,"name":"落雪康乃馨"},{"id":1067159,"name":"落雪郁金香"},{"id":1067168,"name":"落雪樱花"},{"id":1067169,"name":"落雪梅花"},{"id":1067170,"name":"落雪兰花"},{"id":1067175,"name":"落雪月季"},{"id":1067176,"name":"落雪风信子"},{"id":1067180,"name":"落雪牡丹"},{"id":1067181,"name":"落雪荷花"},{"id":1067182,"name":"落雪茉莉花"}
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

function getMutantTypeById(mutantConfigId) {
    if (MUTATION_TYPE_MAP[mutantConfigId]) {
        return MUTATION_TYPE_MAP[mutantConfigId];
    }
    const baseId = Math.floor(mutantConfigId / 100) * 100;
    if (MUTATION_TYPE_MAP[baseId]) {
        return MUTATION_TYPE_MAP[baseId];
    }
    return { name: '变异', icon: '✨', type: 0, class: 'mutant-gold', color: '#eab308' };
}

function getPlantById(plantId) {
    if (!plantConfig) return null;
    return plantConfig.find(p => p.id === plantId);
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
            case 11: plant.fruit_num = reader.readVarint(); break;
            case 12: plant.weed_owners = plant.weed_owners || []; plant.weed_owners.push(reader.readVarint()); break;
            case 13: plant.insect_owners = plant.insect_owners || []; plant.insect_owners.push(reader.readVarint()); break;
            case 15: plant.grow_sec = reader.readVarint(); break;
            case 16: plant.stealable = reader.readVarint() !== 0; break;
            case 18: plant.left_fruit_num = reader.readVarint(); break;
            case 20: plant.mutant_config_ids = plant.mutant_config_ids || []; plant.mutant_config_ids.push(reader.readVarint()); break;
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

function decodeEnterReply(reader) {
    const reply = { lands: [] };
    while (reader.remaining() > 0) {
        const tag = reader.readVarint();
        const fieldId = tag >>> 3;
        const wireType = tag & 7;
        switch (fieldId) {
            case 1: {
                const len = reader.readVarint();
                const subBuf = reader.buf.slice(reader.pos, reader.pos + len);
                reader.pos += len;
                reply.basic = decodeBasicInfo(new ProtoReader(subBuf));
                break;
            }
            case 2: {
                const len = reader.readVarint();
                const subBuf = reader.buf.slice(reader.pos, reader.pos + len);
                reader.pos += len;
                reply.lands.push(decodeLandInfo(new ProtoReader(subBuf)));
                break;
            }
            default: reader.skipField(wireType);
        }
    }
    return reply;
}

function decodeBasicInfo(reader) {
    const basic = {};
    while (reader.remaining() > 0) {
        const tag = reader.readVarint();
        const fieldId = tag >>> 3;
        const wireType = tag & 7;
        switch (fieldId) {
            case 1: basic.gid = reader.readVarint(); break;
            case 2: basic.name = reader.readString(); break;
            case 3: basic.avatar = reader.readVarint(); break;
            default: reader.skipField(wireType);
        }
    }
    return basic;
}

function decodeAllLandsReply(reader) {
    const reply = { lands: [] };
    while (reader.remaining() > 0) {
        const tag = reader.readVarint();
        const fieldId = tag >>> 3;
        const wireType = tag & 7;
        switch (fieldId) {
            case 1: {
                const len = reader.readVarint();
                const subBuf = reader.buf.slice(reader.pos, reader.pos + len);
                reader.pos += len;
                reply.lands.push(decodeLandInfo(new ProtoReader(subBuf)));
                break;
            }
            default: reader.skipField(wireType);
        }
    }
    return reply;
}

async function loadPlantConfig() {
    if (plantConfig) return plantConfig;
    plantConfig = PLANT_DATA;
    return plantConfig;
}

function extractMutants(lands) {
    const mutants = [];
    for (const land of lands) {
        if (!land.plant) continue;
        
        const plantInfo = land.plant;
        const plantId = plantInfo.id;
        const basePlant = getPlantById(plantId);
        const plantName = basePlant?.name || `未知作物(${plantId})`;
        const plantIcon = getPlantIcon(plantName);
        
        const lastPhase = plantInfo.phases?.[plantInfo.phases.length - 1];
        const phase = lastPhase?.phase || 0;
        const phaseInfo = getPhaseInfo(phase);
        
        let hasMutant = false;
        let mutantDetails = [];
        
        if (plantInfo.mutant_config_ids && plantInfo.mutant_config_ids.length > 0) {
            hasMutant = true;
            for (const mutantId of plantInfo.mutant_config_ids) {
                const mutantPlant = getPlantById(mutantId);
                const mutantName = mutantPlant?.name || `未知(${mutantId})`;
                const mutantTypeInfo = getMutantTypeById(mutantId);
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
        }
        
        if (plantInfo.phases) {
            for (const phaseItem of plantInfo.phases) {
                if (phaseItem.mutants && phaseItem.mutants.length > 0) {
                    hasMutant = true;
                    for (const mutant of phaseItem.mutants) {
                        const mutantPlant = getPlantById(mutant.mutant_config_id);
                        const mutantName = mutantPlant?.name || `未知(${mutant.mutant_config_id})`;
                        if (!mutantDetails.find(m => m.configId === mutant.mutant_config_id)) {
                            const weatherInfo = WEATHER_MAP[mutant.weather_id] || { name: `天气${mutant.weather_id}`, icon: '❓' };
                            const mutantTypeInfo = getMutantTypeById(mutant.mutant_config_id);
                            mutantDetails.push({
                                configId: mutant.mutant_config_id,
                                name: mutantName,
                                icon: getPlantIcon(mutantName),
                                plant: mutantPlant,
                                mutantTime: formatTime(mutant.mutant_time),
                                weatherId: mutant.weather_id,
                                weatherName: weatherInfo.name,
                                weatherIcon: weatherInfo.icon,
                                phase: phaseItem.phase,
                                phaseName: getPhaseInfo(phaseItem.phase).name,
                                phaseIcon: getPhaseInfo(phaseItem.phase).icon,
                                mutantType: mutantTypeInfo.name,
                                mutantTypeId: mutantTypeInfo.type,
                                mutantTypeIcon: mutantTypeInfo.icon
                            });
                        }
                    }
                }
            }
        }
        
        if (hasMutant) {
            const primaryMutantTypeInfo = getMutantTypeById(mutantDetails[0]?.configId || 1);
            mutants.push({
                landId: land.id,
                plantId: plantId,
                plantName: plantName,
                plantIcon: plantIcon,
                plant: basePlant,
                phase: phase,
                phaseName: phaseInfo.name,
                phaseIcon: phaseInfo.icon,
                mutantDetails,
                mutantType: primaryMutantTypeInfo.type,
                mutantTypeInfo: primaryMutantTypeInfo,
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

async function parseHexMessage(hexData) {
    try {
        // console.log('🔍 开始解析HEX数据...');
        
        if (!hexData || hexData.trim() === '') {
            return { success: false, error: '请输入HEX数据' };
        }
        
        const bytes = hexToBytes(hexData);
        // console.log(`📦 转换后数据长度: ${bytes.length} 字节`);
        
        const reader = new ProtoReader(bytes);
        
        let meta = null;
        let bodyBytes = null;
        
        while (reader.remaining() > 0) {
            const tag = reader.readVarint();
            const fieldId = tag >>> 3;
            const wireType = tag & 7;
            
            if (fieldId === 1 && wireType === 2) {
                const metaBytes = reader.readBytes();
                meta = decodeMeta(new ProtoReader(metaBytes));
                // console.log(`✅ 解析Meta成功: service=${meta?.service_name}, method=${meta?.method_name}`);
            } else if (fieldId === 2 && wireType === 2) {
                bodyBytes = reader.readBytes();
                // console.log(`✅ 解析Body成功，长度: ${bodyBytes.length} 字节`);
            } else {
                reader.skipField(wireType);
            }
        }
        
        const result = {
            success: true,
            meta,
            basic: {
                service: meta?.service_name || '未知',
                method: meta?.method_name || '未知',
                type: meta?.message_type,
                typeName: { 1: '请求', 2: '响应', 3: '推送' }[meta?.message_type] || '未知',
                clientSeq: meta?.client_seq?.toString() || 0,
                serverSeq: meta?.server_seq?.toString() || 0,
                errorCode: meta?.error_code?.toString() || null
            },
            bodyLength: bodyBytes?.length || 0,
            landInfo: null,
            mutants: []
        };
        
        if (!bodyBytes || bodyBytes.length === 0) {
            result.error = '消息体为空';
            // console.log('⚠️ 消息体为空');
            return result;
        }
        
        if (meta?.message_type === 2) {
            const serviceName = meta?.service_name || '';
            const methodName = meta?.method_name || '';
            
            // console.log(`🔧 服务: "${serviceName}", 方法: "${methodName}", 消息类型: ${meta?.message_type}`);
            
            if (serviceName.includes('VisitService') || methodName.includes('Enter')) {
                try {
                    const reply = decodeEnterReply(new ProtoReader(bodyBytes));
                    result.landInfo = reply.lands || [];
                    result.mutants = extractMutants(result.landInfo);
                    result.mutantCount = result.mutants.length;
                    // console.log(`✅ 解析EnterReply成功，找到 ${result.landInfo.length} 块土地`);
                    // console.log(`📋 土地详情:`, JSON.stringify(result.landInfo.slice(0, 3), null, 2));
                    if (reply.basic) {
                        result.friendInfo = {
                            gid: reply.basic.gid?.toString(),
                            name: reply.basic.name || '未知',
                            avatar: reply.basic.avatar?.toString() || ''
                        };
                    }
                    return result;
                } catch (e) {
                    // console.log('⚠️ 解析EnterReply失败:', e.message);
                    // console.log('尝试解析为AllLandsReply...');
                }
            }
            
            try {
                const reply = decodeAllLandsReply(new ProtoReader(bodyBytes));
                result.landInfo = reply.lands || [];
                result.mutants = extractMutants(result.landInfo);
                result.mutantCount = result.mutants.length;
                // console.log(`✅ 解析AllLandsReply成功，找到 ${result.landInfo.length} 块土地`);
                // console.log(`📋 土地详情:`, JSON.stringify(result.landInfo.slice(0, 3), null, 2));
            } catch (e) {
                // console.log('⚠️ 解析AllLandsReply失败:', e.message);
                // console.log('尝试解析为LandInfo...');
            }
            
            if (!result.landInfo || result.landInfo.length === 0) {
                try {
                    const land = decodeLandInfo(new ProtoReader(bodyBytes));
                    result.landInfo = [land];
                    result.mutants = extractMutants(result.landInfo);
                    result.mutantCount = result.mutants.length;
                    // console.log(`✅ 解析LandInfo成功`);
                    // console.log(`📋 土地详情:`, JSON.stringify(result.landInfo, null, 2));
                } catch (e) {
                    // console.log('⚠️ 解析LandInfo失败:', e.message);
                }
            }
        } else {
            // console.log(`⚠️ 消息类型不是响应(2)，而是: ${meta?.message_type}`);
        }
        
        if (!result.landInfo || result.landInfo.length === 0) {
            // console.log('⚠️ 未找到土地信息');
            // console.log(`📊 body字节长度: ${bodyBytes?.length || 0}`);
            // console.log(`📊 Meta信息:`, JSON.stringify(meta, null, 2));
        }
        
        return result;
    } catch (e) {
        // console.error('❌ 解析过程发生异常:', e.message);
        // console.error('异常堆栈:', e.stack);
        return { success: false, error: `解析失败: ${e.message}` };
    }
}

function formatTime(timestamp) {
    if (!timestamp) return '未知';
    const d = new Date(timestamp * 1000);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

function renderResult(result) {
    const container = document.getElementById('resultContainer');
    const content = document.getElementById('resultContent');
    const status = document.getElementById('resultStatus');
    
    if (!result.success) {
        status.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700';
        status.textContent = '解析失败';
        content.innerHTML = `<div class="p-6 text-center text-red-600"><div class="text-4xl mb-3">❌</div><div>${result.error}</div></div>`;
        container.style.display = 'block';
        return;
    }
    
    if (result.mutantCount > 0) {
        status.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700';
        status.textContent = `发现 ${result.mutantCount} 个变异`;
    } else {
        status.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700';
        status.textContent = '解析成功';
    }
    
    let html = `<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 sm:p-6 border-b border-gray-100">
        <div class="bg-gray-50 rounded-lg p-3 text-center"><div class="text-xs text-gray-500 mb-1">服务</div><div class="text-sm font-semibold text-gray-700">${result.basic?.service || '未知'}</div></div>
        <div class="bg-gray-50 rounded-lg p-3 text-center"><div class="text-xs text-gray-500 mb-1">方法</div><div class="text-sm font-semibold text-gray-700">${result.basic?.method || '未知'}</div></div>
        <div class="bg-gray-50 rounded-lg p-3 text-center"><div class="text-xs text-gray-500 mb-1">类型</div><div class="text-sm font-semibold text-gray-700">${result.basic?.typeName || '未知'}</div></div>
        <div class="bg-gray-50 rounded-lg p-3 text-center"><div class="text-xs text-gray-500 mb-1">土地数</div><div class="text-sm font-semibold text-gray-700">${result.landInfo?.length || 0}</div></div>
    </div><div class="p-4 sm:p-6"><h3 class="text-sm font-semibold text-gray-600 mb-4 flex items-center gap-2"><span>🏡</span> 农场土地 (4×6)</h3><div class="land-grid">`;
    
    if (result.landInfo && result.landInfo.length > 0) {
        const lands = [...result.landInfo].sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
        
        for (let row = 0; row < 4; row++) {
            for (let col = 5; col >= 0; col--) {
                const landId = col * 4 + row + 1;
                const land = lands.find(l => parseInt(l.id) === landId);
                
                if (!land) {
                    html += '<div class="land-cell locked"><span class="text-xs text-gray-400">--</span></div>';
                } else {
                    const hasPlant = land.plant && land.plant.id;
                    const landIdNum = parseInt(land.id);
                    const mutantInfo = result.mutants && result.mutants.find(m => parseInt(m.landId) === landIdNum);
                    const isMutant = !!mutantInfo;
                    let cellClass = 'land-cell ';
                    let mutantTypeInfo = null;
                    
                    if (!land.unlocked) {
                        cellClass += 'locked';
                    } else if (!hasPlant) {
                        cellClass += 'unlocked empty';
                    } else if (isMutant && mutantInfo.mutantTypeInfo) {
                        cellClass += 'mutant ' + (mutantInfo.mutantTypeInfo.class || 'mutant-gold');
                        mutantTypeInfo = mutantInfo.mutantTypeInfo;
                    } else {
                        cellClass += 'unlocked';
                    }
                    
                    let plantContent = '';
                    if (!land.unlocked) {
                        plantContent = '<span class="text-xs text-gray-400">🔒</span>';
                    } else if (!hasPlant) {
                        plantContent = '<span class="text-xs text-amber-500">空</span>';
                    } else {
                        const plantIcon = isMutant && mutantTypeInfo ? mutantTypeInfo.icon : '🌱';
                        const plantName = land.plant.name || land.plant.id || '未知';
                        const phaseNum = land.plant.phase || (land.plant.phases?.[land.plant.phases.length - 1]?.phase || 0);
                        let phaseText = '';
                        if (phaseNum === 1) phaseText = '种子';
                        else if (phaseNum === 2) phaseText = '发芽';
                        else if (phaseNum === 3) phaseText = '小叶';
                        else if (phaseNum === 4) phaseText = '大叶';
                        else if (phaseNum === 5) phaseText = '开花';
                        else if (phaseNum === 6) phaseText = '成熟';
                        else if (phaseNum === 7) phaseText = '枯死';
                        else if (phaseNum) phaseText = phaseNum + '阶段';
                        
                        plantContent = `<span class="plant-icon">${plantIcon}</span><span class="plant-name">${plantName}</span><span class="plant-phase">${phaseText}</span>`;
                        
                        if (isMutant && mutantInfo.mutantDetails && mutantInfo.mutantDetails.length > 0) {
                            const seenTypes = new Set();
                            let mutantTags = '<div class="mutant-tags">';
                            for (const m of mutantInfo.mutantDetails) {
                                const key = m.mutantType;
                                if (!seenTypes.has(key)) {
                                    seenTypes.add(key);
                                    mutantTags += `<span class="mutant-type-tag">${m.mutantTypeIcon || '✨'} ${m.mutantType}</span>`;
                                }
                            }
                            mutantTags += '</div>';
                            plantContent += mutantTags;
                        }
                    }
                    
                    const mutantBadge = isMutant ? '<div class="mutant-badge">✦</div>' : '';
                    const title = `土地${landId}: ${hasPlant ? (land.plant.name || '未知') : '空土地'}${isMutant ? (mutantInfo.mutantDetails || []).map(m => m.mutantType).join(', ') : ''}`;
                    
                    html += `<div class="${cellClass}" title="${title}"><span class="text-[8px] text-gray-400 absolute top-1 left-1 font-mono">#${landId}</span>${plantContent}${mutantBadge}</div>`;
                }
            }
        }
    }
    
    html += '</div></div>';
    content.innerHTML = html;
    container.style.display = 'block';
}

function showToast(message, duration = 2000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, duration);
}

let autoParseEnabled = false;
let clipboardCheckInterval = null;

function initAutoParse() {
    autoParseEnabled = localStorage.getItem('autoParse') === 'true';
    const toggleSwitch = document.getElementById('toggleSwitch');
    
    if (autoParseEnabled) {
        toggleSwitch.classList.add('active');
        startClipboardCheck();
    }
    
    toggleSwitch.addEventListener('click', () => {
        autoParseEnabled = !autoParseEnabled;
        localStorage.setItem('autoParse', autoParseEnabled);
        toggleSwitch.classList.toggle('active');
        showToast(autoParseEnabled ? '自动解析已开启' : '自动解析已关闭');
        
        if (autoParseEnabled) {
            startClipboardCheck();
        } else {
            stopClipboardCheck();
        }
    });
}

function startClipboardCheck() {
    if (clipboardCheckInterval) return;
    clipboardCheckInterval = setInterval(checkClipboard, 2000);
}

function stopClipboardCheck() {
    if (clipboardCheckInterval) {
        clearInterval(clipboardCheckInterval);
        clipboardCheckInterval = null;
    }
}

async function checkClipboard() {
    if (!autoParseEnabled) return;
    try {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
            const trimmed = text.trim();
            if (/^[0-9a-fA-F\s]+$/.test(trimmed)) {
                const currentHex = document.getElementById('hex').value.trim();
                if (currentHex !== trimmed) {
                    document.getElementById('hex').value = trimmed;
                    showToast('已自动读取剪贴板');
                    if (autoParseEnabled) {
                        setTimeout(() => handleParse({ preventDefault: () => {} }), 500);
                    }
                }
            }
        }
    } catch (err) {
        // console.log('无法读取剪贴板:', err);
    }
}

async function handleParse(event) {
    if (event) event.preventDefault();
    
    const hex = document.getElementById('hex').value.trim();
    const parseBtn = document.getElementById('parseBtn');
    
    if (!hex) {
        showToast('请输入Hex数据');
        return;
    }
    
    parseBtn.innerHTML = '<span class="loading"></span> 解析中...';
    parseBtn.disabled = true;
    
    try {
        await loadPlantConfig();
        const result = await parseHexMessage(hex);
        
        renderResult(result);
    } catch (e) {
        renderResult({ success: false, error: e.message });
    } finally {
        parseBtn.innerHTML = '🔍 解析数据';
        parseBtn.disabled = false;
    }
}

async function handlePaste() {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            document.getElementById('hex').value = text.trim();
            showToast('已粘贴剪贴板内容');
            if (autoParseEnabled) {
                handleParse({ preventDefault: () => {} });
            }
        } else {
            showToast('剪贴板为空');
        }
    } catch (err) {
        showToast('无法读取剪贴板');
    }
}

function handleClear() {
    document.getElementById('hex').value = '';
    document.getElementById('resultContainer').style.display = 'none';
    showToast('已清空');
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && autoParseEnabled) {
        checkClipboard();
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    await loadPlantConfig();
    initAutoParse();
    if (autoParseEnabled) {
        setTimeout(checkClipboard, 1000);
    }
});