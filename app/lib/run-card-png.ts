import type { LatLon } from "./hooks/use-run-tracker";

export type RunCardParams = {
  distanceKm: number;
  durationFormatted: string;
  paceFormatted: string;
  kadEarned: number;
  routeCoords: LatLon[];
  txSignature: string | null;
  runnerName: string;
  rarity: { stars: number; label: string };
  flashRunEventName?: string;
  flashRunPosition?: number;
  flashRunTotalRunners?: number;
};

const W = 1080;
const H = 1350;
const BG = "#0D0D0D";
const LIME = "#E0F479";
const MUTED = "rgba(255,255,255,0.45)";
const FONT = "'DM Sans', sans-serif";

function drawRoute(
  ctx: CanvasRenderingContext2D,
  coords: LatLon[],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (coords.length < 2) return;

  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const c of coords) {
    if (c.lat < minLat) minLat = c.lat;
    if (c.lat > maxLat) maxLat = c.lat;
    if (c.lon < minLon) minLon = c.lon;
    if (c.lon > maxLon) maxLon = c.lon;
  }

  const latRange = maxLat - minLat || 0.001;
  const lonRange = maxLon - minLon || 0.001;
  const pad = 60;
  const drawW = w - pad * 2;
  const drawH = h - pad * 2;

  const scale = Math.min(drawW / lonRange, drawH / latRange);
  const offsetX = x + pad + (drawW - lonRange * scale) / 2;
  const offsetY = y + pad + (drawH - latRange * scale) / 2;

  const toX = (lon: number) => offsetX + (lon - minLon) * scale;
  const toY = (lat: number) => offsetY + drawH - (lat - minLat) * scale + pad * 2 - (drawH - latRange * scale) / 2 - pad;

  // Recalculate Y properly
  const toYFixed = (lat: number) => offsetY + (maxLat - lat) * scale;

  // Glow pass
  ctx.save();
  ctx.strokeStyle = "rgba(224,244,121,0.4)";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = "rgba(224,244,121,0.4)";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(toX(coords[0].lon), toYFixed(coords[0].lat));
  for (let i = 1; i < coords.length; i++) {
    ctx.lineTo(toX(coords[i].lon), toYFixed(coords[i].lat));
  }
  ctx.stroke();
  ctx.restore();

  // Main line
  ctx.save();
  ctx.strokeStyle = LIME;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(toX(coords[0].lon), toYFixed(coords[0].lat));
  for (let i = 1; i < coords.length; i++) {
    ctx.lineTo(toX(coords[i].lon), toYFixed(coords[i].lat));
  }
  ctx.stroke();
  ctx.restore();

  // Start dot
  ctx.beginPath();
  ctx.arc(toX(coords[0].lon), toYFixed(coords[0].lat), 6, 0, Math.PI * 2);
  ctx.fillStyle = "#3FB977";
  ctx.fill();

  // End dot
  const last = coords[coords.length - 1];
  ctx.beginPath();
  ctx.arc(toX(last.lon), toYFixed(last.lat), 6, 0, Math.PI * 2);
  ctx.fillStyle = LIME;
  ctx.fill();
}

function drawStars(ctx: CanvasRenderingContext2D, x: number, y: number, count: number, total: number) {
  const size = 20;
  const gap = 6;
  const totalWidth = total * size + (total - 1) * gap;
  let cx = x - totalWidth / 2 + size / 2;

  for (let i = 0; i < total; i++) {
    const filled = i < count;
    ctx.save();
    ctx.translate(cx, y);

    // 5-point star path
    ctx.beginPath();
    for (let j = 0; j < 5; j++) {
      const angle = (j * 4 * Math.PI) / 5 - Math.PI / 2;
      const r = size / 2;
      const method = j === 0 ? "moveTo" : "lineTo";
      ctx[method](Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();

    if (filled) {
      ctx.fillStyle = LIME;
      ctx.fill();
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
    cx += size + gap;
  }
}

const MEDAL_COLORS: Record<number, string> = { 1: "#FFD700", 2: "#C0C0C0", 3: "#CD7F32" };

export async function generateRunCardPNG(params: RunCardParams): Promise<Blob> {
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial gradient overlay
  const grad = ctx.createRadialGradient(W / 2, 500, 0, W / 2, 500, 600);
  grad.addColorStop(0, "rgba(224,244,121,0.06)");
  grad.addColorStop(1, "transparent");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // ── Top bar ──
  ctx.fillStyle = "#3FB977";
  ctx.beginPath();
  ctx.arc(50, 54, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `700 14px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.letterSpacing = "3px";
  ctx.fillText("KADENCE", 66, 59);
  ctx.letterSpacing = "0px";

  const isFlash = !!params.flashRunEventName;
  let routeAreaTop = 100;

  // ── Flash run event name ──
  if (isFlash && params.flashRunEventName) {
    ctx.font = `700 24px ${FONT}`;
    ctx.fillStyle = LIME;
    ctx.textAlign = "center";
    ctx.letterSpacing = "4px";
    ctx.fillText(params.flashRunEventName.toUpperCase(), W / 2, 120);
    ctx.letterSpacing = "0px";
    ctx.textAlign = "left";
    routeAreaTop = 150;
  }

  // ── Route polyline ──
  if (params.routeCoords.length >= 2) {
    drawRoute(ctx, params.routeCoords, 100, routeAreaTop, W - 200, 480);
  }

  // ── Flash run position badge ──
  let statsTop = 680;
  if (isFlash && params.flashRunPosition != null && params.flashRunTotalRunners != null) {
    const pos = params.flashRunPosition;
    const medalColor = MEDAL_COLORS[pos] || "rgba(255,255,255,0.5)";

    // Circle background
    ctx.beginPath();
    ctx.arc(W / 2, 650, 50, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fill();
    ctx.strokeStyle = medalColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Position number
    ctx.font = `700 48px ${FONT}`;
    ctx.fillStyle = medalColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`#${pos}`, W / 2, 650);

    // "/ total"
    ctx.font = `400 18px ${FONT}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(`/ ${params.flashRunTotalRunners}`, W / 2, 714);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    statsTop = 760;
  }

  // ── Distance (large) ──
  ctx.textAlign = "center";
  ctx.font = `700 72px ${FONT}`;
  ctx.fillStyle = "#fff";
  ctx.fillText(`${params.distanceKm.toFixed(2)} km`, W / 2, statsTop);

  // ── Pace ──
  ctx.font = `400 36px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(`${params.paceFormatted} /km`, W / 2, statsTop + 52);

  // ── Duration ──
  ctx.font = `400 24px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText(params.durationFormatted, W / 2, statsTop + 90);

  // ── KAD earned ──
  ctx.font = `700 56px ${FONT}`;
  ctx.fillStyle = LIME;
  ctx.fillText(`${params.kadEarned.toFixed(2)} KAD`, W / 2, statsTop + 170);

  // ── Runner name + stars ──
  const bottomY = statsTop + 240;

  ctx.font = `600 18px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.textAlign = "left";
  ctx.fillText(params.runnerName, 60, bottomY);

  ctx.textAlign = "right";
  drawStars(ctx, W - 60, bottomY - 6, params.rarity.stars, 5);

  // ── Rarity label ──
  ctx.textAlign = "right";
  ctx.font = `700 12px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.letterSpacing = "2px";
  ctx.fillText(params.rarity.label.toUpperCase(), W - 60, bottomY + 24);
  ctx.letterSpacing = "0px";

  // ── Solana explorer link ──
  ctx.textAlign = "center";
  ctx.font = `400 14px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  if (params.txSignature) {
    const short = `solscan.io/tx/${params.txSignature.slice(0, 8)}...`;
    ctx.fillText(short, W / 2, H - 50);
  }

  // ── Bottom branding line ──
  ctx.font = `700 11px ${FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.letterSpacing = "3px";
  ctx.fillText("BUILT ON SOLANA", W / 2, H - 24);
  ctx.letterSpacing = "0px";

  ctx.textAlign = "left";

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to generate PNG"));
      },
      "image/png",
    );
  });
}
