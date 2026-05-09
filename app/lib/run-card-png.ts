export type RunCardParams = {
  distanceKm: number;
  paceFormatted: string;
  kadEarned: number;
  runStartedAt: Date;
};

const W = 1080;
const H = 1920;
const LIME = "#E0F479";
const FONT = "'DM Sans', sans-serif";

export async function generateRunCardPNG(params: RunCardParams): Promise<Blob> {
  await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const dateStr = params.runStartedAt
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
  const timeStr = params.runStartedAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // ── Top-left: date ──
  ctx.font = `700 28px ${FONT}`;
  ctx.fillStyle = LIME;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = "3px";
  ctx.fillText(dateStr, 60, 100);

  // ── Top-right: clock time ──
  ctx.textAlign = "right";
  ctx.fillText(timeStr, W - 60, 100);

  // ── Center watermark: KADENCE ──
  ctx.font = `700 180px ${FONT}`;
  ctx.fillStyle = "rgba(160,160,160,0.18)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "20px";
  ctx.fillText("KADENCE", W / 2, H * 0.5);

  // ── Run details row: distance / pace / +KAD ──
  const detailsY = H * 0.87;
  ctx.font = `700 56px ${FONT}`;
  ctx.fillStyle = LIME;
  ctx.textBaseline = "alphabetic";
  ctx.letterSpacing = "0px";

  ctx.textAlign = "left";
  ctx.fillText(`${params.distanceKm.toFixed(2)} KM`, 60, detailsY);

  ctx.textAlign = "center";
  ctx.fillText(`${params.paceFormatted} /KM`, W / 2, detailsY);

  ctx.textAlign = "right";
  ctx.fillText(`+${params.kadEarned.toFixed(0)} KAD`, W - 60, detailsY);

  // ── Bottom watermark: kadencerun ──
  ctx.font = `600 36px ${FONT}`;
  ctx.fillStyle = "rgba(160,160,160,0.45)";
  ctx.textAlign = "center";
  ctx.letterSpacing = "4px";
  ctx.fillText("kadencerun", W / 2, H * 0.95);

  // Defensive cleanup
  ctx.letterSpacing = "0px";
  ctx.textAlign = "left";

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to generate PNG"));
    }, "image/png");
  });
}
