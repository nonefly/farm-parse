async function pushplusApi(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { message: text }; }
  if (!res.ok) throw new Error(data.message || text || res.statusText);
  return data;
}

function ppLines(value) {
  return String(value || '').split(/[\n,，;；]+/).map(v => v.trim()).filter(Boolean);
}

function ppSetStatus(text, ok = true) {
  const el = document.getElementById('pushplusStatus');
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? '#166534' : '#dc2626';
}

function ppSetValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

function ppSetChecked(id, value) {
  const el = document.getElementById(id);
  if (el) el.checked = !!value;
}

async function loadPushplusSettings() {
  try {
    const cfg = await pushplusApi('/api/maturity/pushplus/config');
    ppSetChecked('pushplusEnabled', cfg.enabled);
    ppSetValue('pushplusChannel', cfg.channel || 'wechat');
    ppSetValue('pushplusIntervalMinutes', cfg.intervalMinutes || 30);
    ppSetValue('pushplusWindowMinutes', cfg.windowMinutes || 30);
    ppSetValue('pushplusFriendFilters', (cfg.friendFilters || []).join('\n'));
    ppSetValue('pushplusCropFilters', (cfg.cropFilters || []).join('\n'));
    ppSetValue('pushplusTokenStatus', cfg.tokenSet ? `已保存：${cfg.tokenMasked}` : '未保存');
    ppSetStatus(cfg.enabled && cfg.tokenSet ? `已启用：每 ${cfg.intervalMinutes || 30} 分钟推送后续 ${cfg.windowMinutes || 30} 分钟` : '未启用或未保存 token');
  } catch (error) {
    ppSetStatus(`加载失败：${error.message}`, false);
  }
}

async function savePushplusSettings() {
  try {
    const body = {
      enabled: !!document.getElementById('pushplusEnabled')?.checked,
      token: document.getElementById('pushplusToken')?.value || '',
      channel: document.getElementById('pushplusChannel')?.value || 'wechat',
      intervalMinutes: Number(document.getElementById('pushplusIntervalMinutes')?.value || 30),
      windowMinutes: Number(document.getElementById('pushplusWindowMinutes')?.value || 30),
      friendFilters: ppLines(document.getElementById('pushplusFriendFilters')?.value || ''),
      cropFilters: ppLines(document.getElementById('pushplusCropFilters')?.value || ''),
    };
    await pushplusApi('/api/maturity/pushplus/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const tokenInput = document.getElementById('pushplusToken');
    if (tokenInput) tokenInput.value = '';
    await loadPushplusSettings();
    ppSetStatus('配置已保存');
  } catch (error) {
    ppSetStatus(`保存失败：${error.message}`, false);
  }
}

async function previewPushplusSettings() {
  const box = document.getElementById('pushplusPreview');
  try {
    ppSetStatus('正在预览...');
    const data = await pushplusApi('/api/maturity/pushplus/preview');
    const items = data.items || [];
    ppSetStatus(`预览 ${items.length} 条即将成熟记录`);
    if (!box) return;
    if (!items.length) {
      box.innerHTML = '<p class="dim">当前配置下，推送窗口内没有即将成熟的作物。</p>';
      return;
    }
    box.innerHTML = `<table><thead><tr><th>好友</th><th>作物</th><th>地块</th><th>成熟时间</th><th>倒计时</th></tr></thead><tbody>${items.slice(0, 30).map(item => `<tr><td>${maturityEsc(item.friendName || item.friendGid)}</td><td>${maturityEsc(item.plantName || item.plantId)}</td><td>#${maturityEsc(item.landId)}</td><td>${maturityEsc(item.matureAtText)}</td><td>${maturityEsc(item.countdown)}</td></tr>`).join('')}</tbody></table>`;
  } catch (error) {
    ppSetStatus(`预览失败：${error.message}`, false);
    if (box) box.innerHTML = '';
  }
}

async function testPushplusSettings() {
  try {
    ppSetStatus('正在发送测试消息...');
    await pushplusApi('/api/maturity/pushplus/test', { method: 'POST' });
    ppSetStatus('测试消息已发送');
  } catch (error) {
    ppSetStatus(`测试失败：${error.message}`, false);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  loadPushplusSettings();
});
