// ═══════════════════════════════════════════════════════════════
// 农场图鉴 - Service Worker
// 图片资源缓存策略：Cache First（优先从缓存读取）
// 版本: 1.0.0
// ═══════════════════════════════════════════════════════════════

var CACHE_NAME = 'farm-plant-images-v1';

// 需要缓存的图片资源路径前缀
var CACHE_PREFIXES = [
  '/img/plant/',
  '/img/land/',
  '/img/Mutation/'
];

// 所有图片文件列表（由构建脚本自动生成，或手动维护）
var CACHE_URLS = [
  // ── 普通作物种子 ──
  '/img/plant/plant_Crop_1_Seed.png',
  '/img/plant/plant_Crop_2_Seed.png',
  '/img/plant/plant_Crop_3_Seed.png',
  '/img/plant/plant_Crop_4_Seed.png',
  '/img/plant/plant_Crop_5_Seed.png',
  '/img/plant/plant_Crop_6_Seed.png',
  '/img/plant/plant_Crop_7_Seed.png',
  '/img/plant/plant_Crop_8_Seed.png',
  '/img/plant/plant_Crop_9_Seed.png',
  '/img/plant/plant_Crop_10_Seed.png',
  '/img/plant/plant_Crop_11_Seed.png',
  '/img/plant/plant_Crop_13_Seed.png',
  '/img/plant/plant_Crop_14_Seed.png',
  '/img/plant/plant_Crop_15_Seed.png',
  '/img/plant/plant_Crop_16_Seed.png',
  '/img/plant/plant_Crop_18_Seed.png',
  '/img/plant/plant_Crop_19_Seed.png',
  '/img/plant/plant_Crop_22_Seed.png',
  '/img/plant/plant_Crop_23_Seed.png',
  '/img/plant/plant_Crop_25_Seed.png',
  '/img/plant/plant_Crop_26_Seed.png',
  '/img/plant/plant_Crop_27_Seed.png',
  '/img/plant/plant_Crop_29_Seed.png',
  '/img/plant/plant_Crop_31_Seed.png',
  '/img/plant/plant_Crop_33_Seed.png',
  '/img/plant/plant_Crop_34_Seed.png',
  '/img/plant/plant_Crop_35_Seed.png',
  '/img/plant/plant_Crop_36_Seed.png',
  '/img/plant/plant_Crop_37_Seed.png',
  '/img/plant/plant_Crop_38_Seed.png',
  '/img/plant/plant_Crop_39_Seed.png',
  '/img/plant/plant_Crop_41_Seed.png',
  '/img/plant/plant_Crop_42_Seed.png',
  '/img/plant/plant_Crop_43_Seed.png',
  '/img/plant/plant_Crop_44_Seed.png',
  '/img/plant/plant_Crop_45_Seed.png',
  '/img/plant/plant_Crop_46_Seed.png',
  '/img/plant/plant_Crop_47_Seed.png',
  '/img/plant/plant_Crop_48_Seed.png',
  '/img/plant/plant_Crop_49_Seed.png',
  '/img/plant/plant_Crop_50_Seed.png',
  '/img/plant/plant_Crop_51_Seed.png',
  '/img/plant/plant_Crop_52_Seed.png',
  '/img/plant/plant_Crop_53_Seed.png',
  '/img/plant/plant_Crop_54_Seed.png',
  '/img/plant/plant_Crop_55_Seed.png',
  '/img/plant/plant_Crop_56_Seed.png',
  '/img/plant/plant_Crop_57_Seed.png',
  '/img/plant/plant_Crop_58_Seed.png',
  '/img/plant/plant_Crop_59_Seed.png',
  '/img/plant/plant_Crop_60_Seed.png',
  '/img/plant/plant_Crop_61_Seed.png',
  '/img/plant/plant_Crop_62_Seed.png',
  '/img/plant/plant_Crop_63_Seed.png',
  '/img/plant/plant_Crop_64_Seed.png',
  '/img/plant/plant_Crop_65_Seed.png',
  '/img/plant/plant_Crop_66_Seed.png',
  '/img/plant/plant_Crop_67_Seed.png',
  '/img/plant/plant_Crop_68_Seed.png',
  '/img/plant/plant_Crop_69_Seed.png',
  '/img/plant/plant_Crop_70_Seed.png',
  '/img/plant/plant_Crop_71_Seed.png',
  '/img/plant/plant_Crop_72_Seed.png',
  '/img/plant/plant_Crop_73_Seed.png',
  '/img/plant/plant_Crop_74_Seed.png',
  '/img/plant/plant_Crop_75_Seed.png',
  '/img/plant/plant_Crop_76_Seed.png',
  '/img/plant/plant_Crop_77_Seed.png',
  '/img/plant/plant_Crop_78_Seed.png',
  '/img/plant/plant_Crop_79_Seed.png',
  '/img/plant/plant_Crop_80_Seed.png',
  '/img/plant/plant_Crop_83_Seed.png',
  '/img/plant/plant_Crop_84_Seed.png',
  '/img/plant/plant_Crop_85_Seed.png',
  '/img/plant/plant_Crop_86_Seed.png',
  '/img/plant/plant_Crop_87_Seed.png',
  '/img/plant/plant_Crop_88_Seed.png',
  '/img/plant/plant_Crop_89_Seed.png',
  '/img/plant/plant_Crop_90_Seed.png',
  '/img/plant/plant_Crop_91_Seed.png',
  '/img/plant/plant_Crop_95_Seed.png',
  '/img/plant/plant_Crop_96_Seed.png',
  '/img/plant/plant_Crop_97_Seed.png',
  '/img/plant/plant_Crop_98_Seed.png',
  '/img/plant/plant_Crop_99_Seed.png',
  '/img/plant/plant_Crop_100_Seed.png',
  '/img/plant/plant_Crop_101_Seed.png',
  '/img/plant/plant_Crop_102_Seed.png',
  '/img/plant/plant_Crop_103_Seed.png',
  '/img/plant/plant_Crop_104_Seed.png',
  '/img/plant/plant_Crop_105_Seed.png',
  '/img/plant/plant_Crop_106_Seed.png',
  '/img/plant/plant_Crop_107_Seed.png',
  '/img/plant/plant_Crop_108_Seed.png',
  '/img/plant/plant_Crop_109_Seed.png',
  '/img/plant/plant_Crop_110_Seed.png',
  '/img/plant/plant_Crop_111_Seed.png',
  '/img/plant/plant_Crop_112_Seed.png',
  '/img/plant/plant_Crop_113_Seed.png',
  '/img/plant/plant_Crop_114_Seed.png',
  '/img/plant/plant_Crop_115_Seed.png',
  '/img/plant/plant_Crop_116_Seed.png',
  '/img/plant/plant_Crop_117_Seed.png',
  '/img/plant/plant_Crop_118_Seed.png',
  '/img/plant/plant_Crop_119_Seed.png',
  '/img/plant/plant_Crop_120_Seed.png',
  '/img/plant/plant_Crop_121_Seed.png',
  '/img/plant/plant_Crop_122_Seed.png',
  '/img/plant/plant_Crop_123_Seed.png',
  '/img/plant/plant_Crop_124_Seed.png',
  '/img/plant/plant_Crop_125_Seed.png',
  '/img/plant/plant_Crop_126_Seed.png',
  '/img/plant/plant_Crop_128_Seed.png',
  '/img/plant/plant_Crop_129_Seed.png',
  '/img/plant/plant_Crop_130_Seed.png',
  '/img/plant/plant_Crop_131_Seed.png',
  '/img/plant/plant_Crop_132_Seed.png',
  '/img/plant/plant_Crop_134_Seed.png',
  '/img/plant/plant_Crop_135_Seed.png',
  '/img/plant/plant_Crop_136_Seed.png',
  '/img/plant/plant_Crop_139_Seed.png',
  '/img/plant/plant_Crop_140_Seed.png',
  '/img/plant/plant_Crop_141_Seed.png',
  '/img/plant/plant_Crop_142_Seed.png',
  '/img/plant/plant_Crop_143_Seed.png',
  '/img/plant/plant_Crop_144_Seed.png',
  '/img/plant/plant_Crop_145_Seed.png',
  '/img/plant/plant_Crop_147_Seed.png',
  '/img/plant/plant_Crop_154_Seed.png',
  '/img/plant/plant_Crop_161_Seed.png',
  '/img/plant/plant_Crop_162_Seed.png',
  '/img/plant/plant_Crop_165_Seed.png',
  '/img/plant/plant_Crop_172_Seed.png',
  '/img/plant/plant_Crop_173_Seed.png',
  '/img/plant/plant_Crop_174_Seed.png',
  '/img/plant/plant_Crop_182_Seed.png',
  '/img/plant/plant_Crop_184_Seed.png',
  '/img/plant/plant_Crop_185_Seed.png',
  '/img/plant/plant_Crop_186_Seed.png',
  '/img/plant/plant_Crop_187_Seed.png',
  '/img/plant/plant_Crop_188_Seed.png',
  '/img/plant/plant_Crop_189_Seed.png',
  '/img/plant/plant_Crop_193_Seed.png',
  '/img/plant/plant_Crop_199_Seed.png',
  '/img/plant/plant_Crop_201_Seed.png',
  '/img/plant/plant_Crop_202_Seed.png',
  '/img/plant/plant_Crop_204_Seed.png',
  '/img/plant/plant_Crop_218_Seed.png',
  '/img/plant/plant_Crop_219_Seed.png',
  '/img/plant/plant_Crop_220_Seed.png',
  '/img/plant/plant_Crop_221_Seed.png',
  '/img/plant/plant_Crop_222_Seed.png',
  '/img/plant/plant_Crop_223_Seed.png',
  '/img/plant/plant_Crop_224_Seed.png',
  '/img/plant/plant_Crop_225_Seed.png',
  '/img/plant/plant_Crop_226_Seed.png',
  '/img/plant/plant_Crop_227_Seed.png',
  '/img/plant/plant_Crop_228_Seed.png',
  '/img/plant/plant_Crop_229_Seed.png',
  '/img/plant/plant_Crop_235_Seed.png',
  '/img/plant/plant_Crop_242_Seed.png',
  '/img/plant/plant_Crop_249_Seed.png',
  '/img/plant/plant_Crop_256_Seed.png',
  '/img/plant/plant_Crop_257_Seed.png',
  '/img/plant/plant_Crop_258_Seed.png',
  '/img/plant/plant_Crop_259_Seed.png',
  '/img/plant/plant_Crop_261_Seed.png',
  '/img/plant/plant_Crop_262_Seed.png',
  '/img/plant/plant_Crop_263_Seed.png',
  '/img/plant/plant_Crop_264_Seed.png',
  '/img/plant/plant_Crop_265_Seed.png',
  '/img/plant/plant_Crop_266_Seed.png',
  '/img/plant/plant_Crop_269_Seed.png',
  '/img/plant/plant_Crop_304_Seed.png',
  '/img/plant/plant_Crop_305_Seed.png',
  '/img/plant/plant_Crop_306_Seed.png',
  '/img/plant/plant_Crop_308_Seed.png',
  '/img/plant/plant_Crop_396_Seed.png',
  '/img/plant/plant_Crop_413_Seed.png',
  '/img/plant/plant_Crop_416_Seed.png',
  '/img/plant/plant_Crop_442_Seed.png',
  '/img/plant/plant_Crop_461_Seed.png',
  '/img/plant/plant_Crop_468_Seed.png',
  '/img/plant/plant_Crop_469_Seed.png',
  '/img/plant/plant_Crop_471_Seed.png',
  '/img/plant/plant_Crop_1135_Seed.png',
  '/img/plant/plant_Crop_1542_Seed.png',
  '/img/plant/plant_Crop_8001_Seed.png',
  '/img/plant/plant_Crop_9001_Seed.png',
  '/img/plant/Happy_Candy_Seed.png',
  '/img/plant/Cotton_Candy_Seed.png',

  // ── 黄金系列种子 ──
  '/img/plant/Gold_Happy_Candy_Seed.png',
  '/img/plant/Gold_Crop_25_Seed.png',
  '/img/plant/Gold_Crop_46_Seed.png',
  '/img/plant/Gold_Crop_109_Seed.png',
  '/img/plant/Gold_Crop_112_Seed.png',
  '/img/plant/Gold_Crop_121_Seed.png',
  '/img/plant/Gold_Crop_184_Seed.png',
  '/img/plant/Gold_Crop_193_Seed.png',
  '/img/plant/Gold_Crop_224_Seed.png',
  '/img/plant/Gold_Crop_249_Seed.png',
  '/img/plant/Gold_Crop_256_Seed.png',
  '/img/plant/Gold_Crop_257_Seed.png',
  '/img/plant/Gold_Crop_258_Seed.png',
  '/img/plant/Gold_Crop_261_Seed.png',
  '/img/plant/Gold_Crop_304_Seed.png',
  '/img/plant/Gold_Crop_416_Seed.png',
  '/img/plant/Gold_Crop_1135_Seed.png',
  '/img/plant/Gold_Crop_8001_Seed.png',
  '/img/plant/Gold_Crop_9001_Seed.png',

  // ── 土地图片 ──
  '/img/land/land_1.png',

  // ── 变异图标 ──
  '/img/Mutation/dark.png',
  '/img/Mutation/frozen.png',
  '/img/Mutation/golden.png',
  '/img/Mutation/haha.png',
  '/img/Mutation/love.png',
  '/img/Mutation/mianmian.png',
  '/img/Mutation/moist.png',
  '/img/Mutation/tata.png'
];

// ── 安装阶段：预缓存所有图片 ──
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_URLS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── 激活阶段：清理旧缓存 ──
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── 请求拦截：Cache First 策略（仅缓存图片资源） ──
self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);
  var pathname = url.pathname;

  // 只处理图片资源请求
  var isImage = false;
  for (var i = 0; i < CACHE_PREFIXES.length; i++) {
    if (pathname.indexOf(CACHE_PREFIXES[i]) === 0) {
      isImage = true;
      break;
    }
  }
  if (!isImage) return;

  event.respondWith(
    caches.match(event.request).then(function(cachedResponse) {
      // 缓存命中 → 直接返回
      if (cachedResponse) {
        return cachedResponse;
      }
      // 缓存未命中 → 请求网络并存入缓存
      return fetch(event.request).then(function(networkResponse) {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        // 只缓存图片
        var contentType = networkResponse.headers.get('Content-Type') || '';
        if (contentType.indexOf('image') === -1) {
          return networkResponse;
        }
        var clonedResponse = networkResponse.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clonedResponse);
        });
        return networkResponse;
      }).catch(function() {
        // 网络失败时返回一个占位
        return new Response(null, { status: 404, statusText: 'Not Found' });
      });
    })
  );
});