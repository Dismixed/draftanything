type OgFontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

type OgFont = {
  name: string;
  data: ArrayBuffer;
  weight: OgFontWeight;
  style: "normal" | "italic";
};

let cachedFonts: OgFont[] | undefined;

async function fetchFont(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load font: ${url}`);
  }
  return response.arrayBuffer();
}

export async function loadResultCardFonts(): Promise<OgFont[]> {
  if (cachedFonts) {
    return cachedFonts;
  }

  const [playfairRegular, playfairItalic, outfitRegular, outfitSemiBold] =
    await Promise.all([
      fetchFont(
        "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgEMXxXeM.ttf",
      ),
      fetchFont(
        "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFRD-vYSZviVYUb_rj3ij__anPXDTzYgEMUyXNtYc.ttf",
      ),
      fetchFont(
        "https://fonts.gstatic.com/s/outfit/v11/QGYvz_MVcBeNP4NJtEtqUYLknw.ttf",
      ),
      fetchFont(
        "https://fonts.gstatic.com/s/outfit/v11/QGYvz_MVcBeNP4NJtEtqUYLknw.ttf",
      ),
    ]);

  cachedFonts = [
    {
      name: "Playfair Display",
      data: playfairRegular,
      weight: 700,
      style: "normal",
    },
    {
      name: "Playfair Display",
      data: playfairItalic,
      weight: 700,
      style: "italic",
    },
    {
      name: "Playfair Display",
      data: playfairRegular,
      weight: 900,
      style: "normal",
    },
    {
      name: "Playfair Display",
      data: playfairItalic,
      weight: 900,
      style: "italic",
    },
    {
      name: "Outfit",
      data: outfitRegular,
      weight: 400,
      style: "normal",
    },
    {
      name: "Outfit",
      data: outfitSemiBold,
      weight: 600,
      style: "normal",
    },
    {
      name: "Outfit",
      data: outfitSemiBold,
      weight: 700,
      style: "normal",
    },
  ];

  return cachedFonts;
}
