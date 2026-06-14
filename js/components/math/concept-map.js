/**
 * 知识概念图渲染器
 * 拓扑排序分层布局，SVG 绘制节点与依赖边
 */
import { renderLatexHTML } from '../../utils/latex.js';

/** 分类 → CSS 变量色 */
const CATEGORY_COLORS = {
  '微积分': 'var(--color-accent)',
  '线性代数': 'var(--color-success)',
  '概率统计': 'var(--color-warning)',
  '基础': 'var(--color-text-secondary)',
};
const DEFAULT_COLOR = 'var(--color-primary)';

function getCategoryColor(category) {
  return CATEGORY_COLORS[category] || DEFAULT_COLOR;
}

/**
 * 拓扑排序，返回每个节点的 level（前置知识 level 更低）
 * 若存在环则返回 null
 */
function topologySort(concepts) {
  const idMap = new Map();
  concepts.forEach((c, i) => idMap.set(c.id, i));

  const inDegree = new Array(concepts.length).fill(0);
  const adj = new Array(concepts.length).fill(null).map(() => []);

  concepts.forEach((c, i) => {
    (c.dependsOn || []).forEach((depId) => {
      const depIdx = idMap.get(depId);
      if (depIdx !== undefined) {
        adj[depIdx].push(i);
        inDegree[i]++;
      }
    });
  });

  const levels = new Array(concepts.length).fill(0);
  const queue = [];
  inDegree.forEach((d, i) => { if (d === 0) queue.push(i); });
  let visited = 0;

  while (queue.length > 0) {
    const node = queue.shift();
    visited++;
    adj[node].forEach((next) => {
      levels[next] = Math.max(levels[next], levels[node] + 1);
      inDegree[next]--;
      if (inDegree[next] === 0) queue.push(next);
    });
  }

  return visited === concepts.length ? levels : null;
}

/**
 * 渲染概念图组件
 */
export function renderConceptMap(props) {
  const { title, concepts } = props;

  const container = document.createElement('div');
  container.className = 'concept-map';

  // 标题
  if (title) {
    const header = document.createElement('div');
    header.className = 'math-component-header';
    header.innerHTML = `<span class="concept-map-icon">🗺️</span> ${title}`;
    container.appendChild(header);
  }

  const body = document.createElement('div');
  body.className = 'math-component-body';
  container.appendChild(body);

  // 使用用户提供 level 或拓扑排序计算
  let levels = concepts.map((c) => c.level ?? null);
  const hasAllLevels = levels.every((l) => l !== null);

  if (!hasAllLevels) {
    const computed = topologySort(concepts);
    if (computed) {
      levels = computed;
    } else {
      // 存在循环依赖，退化为列表视图
      body.appendChild(renderListView(concepts));
      return container;
    }
  }

  // 构建位置映射
  const idMap = new Map();
  concepts.forEach((c, i) => idMap.set(c.id, i));

  // 按层分组
  const maxLevel = Math.max(...levels);
  const levelGroups = new Array(maxLevel + 1).fill(null).map(() => []);
  concepts.forEach((c, i) => levelGroups[levels[i]].push({ ...c, _idx: i }));

  // 布局参数
  const nodeW = 160;
  const nodeH = 52;
  const hGap = 200;
  const vGap = 80;
  const padding = 40;

  const maxPerLevel = Math.max(...levelGroups.map((g) => g.length));
  const svgW = (maxLevel + 1) * hGap + padding * 2;
  const svgH = maxPerLevel * vGap + padding * 2;

  // 计算节点位置
  const positions = new Map(); // id → { x, y }
  levelGroups.forEach((group, lv) => {
    const totalH = group.length * vGap;
    const startY = (svgH - totalH) / 2 + vGap / 2;
    group.forEach((c, j) => {
      positions.set(c.id, {
        x: padding + lv * hGap + hGap / 2,
        y: startY + j * vGap,
      });
    });
  });

  // 创建 SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'concept-map-svg');
  svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // 箭头 marker 定义
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', 'concept-arrow');
  marker.setAttribute('viewBox', '0 0 10 10');
  marker.setAttribute('refX', '10');
  marker.setAttribute('refY', '5');
  marker.setAttribute('markerWidth', '8');
  marker.setAttribute('markerHeight', '8');
  marker.setAttribute('orient', 'auto-start-reverse');
  const markerPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  markerPath.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
  markerPath.setAttribute('fill', 'var(--color-text-secondary)');
  marker.appendChild(markerPath);
  defs.appendChild(marker);
  svg.appendChild(defs);

  // 绘制边
  concepts.forEach((c) => {
    const targetPos = positions.get(c.id);
    (c.dependsOn || []).forEach((depId) => {
      const sourcePos = positions.get(depId);
      if (!sourcePos || !targetPos) return;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('class', 'concept-edge');
      line.setAttribute('x1', sourcePos.x + nodeW / 2);
      line.setAttribute('y1', sourcePos.y);
      line.setAttribute('x2', targetPos.x - nodeW / 2);
      line.setAttribute('y2', targetPos.y);
      line.setAttribute('stroke', 'var(--color-text-secondary)');
      line.setAttribute('stroke-width', '1.5');
      line.setAttribute('marker-end', 'url(#concept-arrow)');
      svg.appendChild(line);
    });
  });

  // 绘制节点
  concepts.forEach((c) => {
    const pos = positions.get(c.id);
    if (!pos) return;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'concept-node');
    g.style.cursor = 'pointer';

    const color = getCategoryColor(c.category);

    // 背景矩形
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', pos.x - nodeW / 2);
    rect.setAttribute('y', pos.y - nodeH / 2);
    rect.setAttribute('width', nodeW);
    rect.setAttribute('height', nodeH);
    rect.setAttribute('rx', '8');
    rect.setAttribute('ry', '8');
    rect.setAttribute('fill', 'var(--color-bg-card)');
    rect.setAttribute('stroke', color);
    rect.setAttribute('stroke-width', '2');
    g.appendChild(rect);

    // 分类小标签
    if (c.category) {
      const badge = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      badge.setAttribute('x', pos.x - nodeW / 2 + 6);
      badge.setAttribute('y', pos.y - nodeH / 2 + 4);
      badge.setAttribute('width', Math.min(c.category.length * 12 + 8, nodeW - 12));
      badge.setAttribute('height', '14');
      badge.setAttribute('rx', '3');
      badge.setAttribute('fill', color);
      badge.setAttribute('opacity', '0.15');
      g.appendChild(badge);

      const badgeText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      badgeText.setAttribute('x', pos.x - nodeW / 2 + 10);
      badgeText.setAttribute('y', pos.y - nodeH / 2 + 14);
      badgeText.setAttribute('font-size', '9');
      badgeText.setAttribute('fill', color);
      badgeText.textContent = c.category;
      g.appendChild(badgeText);
    }

    // 名称文本
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('class', 'concept-node-text');
    text.setAttribute('x', pos.x);
    text.setAttribute('y', pos.y + (c.category ? 6 : 0));
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('font-size', '13');
    text.setAttribute('font-weight', '600');
    text.setAttribute('fill', 'var(--color-text-primary)');
    text.textContent = c.name || c.id;
    g.appendChild(text);

    // 点击事件
    g.addEventListener('click', () => showDetail(body, c, concepts, idMap));

    svg.appendChild(g);
  });

  body.appendChild(svg);

  // 详情面板占位
  const detail = document.createElement('div');
  detail.className = 'concept-detail';
  detail.style.display = 'none';
  body.appendChild(detail);

  return container;
}

/** 点击节点后显示详情面板 */
function showDetail(body, concept, concepts, idMap) {
  const detail = body.querySelector('.concept-detail');
  if (!detail) return;

  const color = getCategoryColor(concept.category);
  const deps = (concept.dependsOn || [])
    .map((depId) => concepts.find((c) => c.id === depId))
    .filter(Boolean);

  detail.style.display = 'block';
  detail.innerHTML = `
    <div class="concept-detail-name" style="color:${color}">${concept.name || concept.id}</div>
    ${concept.category ? `<span class="concept-detail-category" style="background:${color};opacity:0.15;color:${color}">${concept.category}</span>` : ''}
    ${concept.description ? `<div class="concept-detail-desc">${renderLatexHTML(concept.description)}</div>` : ''}
    ${deps.length > 0 ? `
      <div class="concept-detail-deps">
        <span class="concept-detail-deps-label">前置知识：</span>
        ${deps.map((d) => `<span class="concept-detail-dep-link" data-id="${d.id}">${d.name || d.id}</span>`).join(' ')}
      </div>
    ` : ''}
  `;

  // 前置知识可点击
  detail.querySelectorAll('.concept-detail-dep-link').forEach((el) => {
    el.addEventListener('click', () => {
      const depConcept = concepts.find((c) => c.id === el.dataset.id);
      if (depConcept) showDetail(body, depConcept, concepts, idMap);
    });
  });
}

/** 循环依赖时的列表降级视图 */
function renderListView(concepts) {
  const wrapper = document.createElement('div');
  wrapper.className = 'concept-map-list';
  wrapper.innerHTML = `<p style="color:var(--color-text-secondary);font-size:var(--font-size-sm);margin-bottom:var(--spacing-sm);">检测到循环依赖，以列表方式展示：</p>`;

  const list = document.createElement('ul');
  list.style.listStyle = 'none';
  list.style.padding = '0';

  concepts.forEach((c) => {
    const li = document.createElement('li');
    li.style.cssText = 'padding:var(--spacing-sm) 0;border-bottom:1px solid var(--color-divider);';
    const color = getCategoryColor(c.category);
    li.innerHTML = `
      <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:var(--spacing-sm);"></span>
      <strong>${c.name || c.id}</strong>
      ${c.category ? `<span style="font-size:var(--font-size-xs);color:${color};margin-left:var(--spacing-sm);">${c.category}</span>` : ''}
      ${c.description ? `<div style="font-size:var(--font-size-sm);color:var(--color-text-secondary);margin-top:4px;">${renderLatexHTML(c.description)}</div>` : ''}
    `;
    list.appendChild(li);
  });

  wrapper.appendChild(list);
  return wrapper;
}
