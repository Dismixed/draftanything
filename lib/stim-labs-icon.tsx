import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

let cachedDataUri: string | undefined;

async function getLogoDataUri() {
  if (!cachedDataUri) {
    const logo = await readFile(join(process.cwd(), "public/stimlabs_badge_v5.svg"));
    cachedDataUri = `data:image/svg+xml;base64,${logo.toString("base64")}`;
  }
  return cachedDataUri;
}

export async function createStimLabsIcon(size: number) {
  const src = await getLogoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={src}
          width={size}
          height={size}
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
