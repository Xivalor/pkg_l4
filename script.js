const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const scale = 20;
const width = canvas.width;
const height = canvas.height;

let clickCount = 0;
let p1 = null;
let p2 = null;

function drawGrid() {
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 1;
  const cols = Math.floor(width / scale);
  const rows = Math.floor(height / scale);

  ctx.beginPath();
  for (let i = 0; i <= cols; i++) {
    const x = i * scale;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let j = 0; j <= rows; j++) {
    const y = j * scale;
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
}

function drawAxes() {
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, cy + 0.5);
  ctx.lineTo(width, cy + 0.5);
  ctx.moveTo(cx + 0.5, 0);
  ctx.lineTo(cx + 0.5, height);
  ctx.stroke();
}

function drawScene() {
  ctx.clearRect(0, 0, width, height);
  drawGrid();
  drawAxes();
  document.getElementById('log').textContent = '';
}

function toCanvas(x, y) {
  const cx = Math.floor(width / 2) + x * scale;
  const cy = Math.floor(height / 2) - y * scale;
  return [cx, cy];
}

function toGridCoord(cx, cy) {
  const x = Math.floor((cx - width / 2) / scale);
  const y = Math.floor((height / 2 - cy) / scale);
  return [x, y];
}

function drawPixel(x, y, color = '#000') {
  const [cx, cy] = toCanvas(x, y);
  ctx.fillStyle = color;
  ctx.fillRect(cx, cy - scale, scale, scale);
}

function stepByStep(x0, y0, x1, y1) {
  const pixels = [];
  const log = [];
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const xStep = dx / steps, yStep = dy / steps;
  let x = x0, y = y0;
  for (let i = 0; i <= steps; i++) {
    pixels.push([Math.round(x), Math.round(y)]);
    log.push(`i=${i}: x=${x.toFixed(2)}, y=${y.toFixed(2)} → (${Math.round(x)}, ${Math.round(y)})`);
    x += xStep;
    y += yStep;
  }
  return { pixels, log };
}

function dda(x0, y0, x1, y1) {
  const pixels = [];
  const log = [];
  const dx = x1 - x0;
  const dy = y1 - y0;

  if (Math.abs(dx) >= Math.abs(dy)) {
    const step = dx > 0 ? 1 : -1;
    const slope = dy / dx;
    let y = y0;
    for (let x = x0; step > 0 ? x <= x1 : x >= x1; x += step) {
      pixels.push([x, Math.round(y)]);
      log.push(`x=${x}, y=${y.toFixed(2)} → (${x}, ${Math.round(y)})`);
      y += slope * step;
    }
  } else {
    const step = dy > 0 ? 1 : -1;
    const slope = dx / dy;
    let x = x0;
    for (let y = y0; step > 0 ? y <= y1 : y >= y1; y += step) {
      pixels.push([Math.round(x), y]);
      log.push(`x=${x.toFixed(2)}, y=${y} → (${Math.round(x)}, ${y})`);
      x += slope * step;
    }
  }

  return { pixels, log };
}

function bresenham(x0, y0, x1, y1) {
  const pixels = [];
  const log = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let step = 0; 

  while (true) {
    pixels.push([x0, y0]);
    log.push(`step=${step++}: (${x0}, ${y0}), err=${err}`);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
  return { pixels, log };
}

function bresenhamCircle(xc, yc, r) {
  const pixels = [];
  const log = [];
  let x = 0, y = r, d = 3 - 2 * r;
  let step = 0;
  while (x <= y) {
    pixels.push([xc + x, yc + y], [xc - x, yc + y],
                [xc + x, yc - y], [xc - x, yc - y],
                [xc + y, yc + x], [xc - y, yc + x],
                [xc + y, yc - x], [xc - y, yc - x]);
    log.push(`step=${step++}: x=${x}, y=${y}, d=${d}`);
    if (d < 0) d = d + 4 * x + 6;
    else { d = d + 4 * (x - y) + 10; y--; }
    x++;
  }
  return { pixels, log };
}

function render(pixels, color = '#000') {
  for (const [x, y] of pixels) drawPixel(x, y, color);
}

function run() {
  const algo = document.getElementById('algo').value;
  const x0 = +document.getElementById('x0').value;
  const y0 = +document.getElementById('y0').value;
  const x1 = +document.getElementById('x1').value;
  const y1 = +document.getElementById('y1').value;
  let r = +document.getElementById('r').value;

  drawScene();
  const start = performance.now();

  let pixels = [], log = [];
  switch (algo) {
    case 'step':
      ({ pixels, log } = stepByStep(x0, y0, x1, y1));
      break;
    case 'dda':
      ({ pixels, log } = dda(x0, y0, x1, y1));
      break;
    case 'bresenham':
      ({ pixels, log } = bresenham(x0, y0, x1, y1));
      break;
    case 'circle':
      if (p1 && p2) {
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        r = Math.round(Math.sqrt(dx * dx + dy * dy));
        document.getElementById('r').value = r;
      }
      ({ pixels, log } = bresenhamCircle(x0, y0, r));
      break;
  }

  render(pixels, '#000');
  const end = performance.now();

  document.getElementById('info').innerText =
    `Пикселей: ${pixels.length}, Время: ${(end - start).toFixed(3)} мс`;

  document.getElementById('log').textContent = log.join('\n');
}

function clearAll() {
  drawScene();
  document.getElementById('info').innerText = 'Поле очищено';
  clickCount = 0;
  p1 = p2 = null;
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const [x, y] = toGridCoord(cx, cy);

  const algo = document.getElementById('algo').value;

  if (clickCount >= 2) {
    clickCount = 0;
    p1 = null;
    p2 = null;
    drawScene();
  }

  clickCount++;
  if (clickCount === 1) {
    p1 = [x, y];
    drawScene();
    drawPixel(x, y, 'red');
    document.getElementById('x0').value = x;
    document.getElementById('y0').value = y;
    document.getElementById('info').innerText =
      algo === 'circle'
        ? `Выбран центр окружности (${x}, ${y})`
        : `Выбрана первая точка (${x}, ${y})`;
  } else if (clickCount === 2) {
    p2 = [x, y];
    drawScene();
    drawPixel(p1[0], p1[1], 'red');
    drawPixel(x, y, 'blue');
    document.getElementById('x1').value = x;
    document.getElementById('y1').value = y;

    if (algo === 'circle') {
      const dx = x - p1[0];
      const dy = y - p1[1];
      const r = Math.round(Math.sqrt(dx * dx + dy * dy));
      document.getElementById('r').value = r;
      document.getElementById('info').innerText =
        `Выбрана точка на окружности (${x}, ${y}), радиус = ${r}`;
    } else {
      document.getElementById('info').innerText =
        `Выбрана вторая точка (${x}, ${y})`;
    }
  }
});

document.getElementById('drawBtn').addEventListener('click', run);
document.getElementById('clearBtn').addEventListener('click', clearAll);

drawScene();
