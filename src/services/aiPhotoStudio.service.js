const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { STORAGE_ROOT_DIR } = require('../config/storage');
const { resolveGeminiApiKey } = require('./gemini.service');

const BRAND_LOGO_PATH = path.resolve(__dirname, '../assets/brand_logo.png');

/**
 * Amazon 7-Set Standard Template Configurations
 */
const AMAZON_7_TEMPLATES = [
  {
    id: 1,
    type: 'Main Product (Hero Shot)',
    title: '1. Clean White Hero Shot',
    description: 'Pure white background (#FFFFFF), subtle soft grounding shadow, authentic product packaging, Amazon catalog hero shot standard (1600x1600).'
  },
  {
    id: 2,
    type: 'Benefits & Features Infographic',
    title: '2. Skin Care Journey & Key Benefits',
    description: 'Targeted care infographic with before/after journey boxes, benefit callout badges, and authentic product centered.'
  },
  {
    id: 3,
    type: 'Ayurvedic Ingredients Deep Dive',
    title: '3. Ingredients & Botanical Extracts',
    description: 'Authentic product centered with clean leader lines pointing to active botanicals (Algae, Cocoa Butter, Gotu Kola, Herbal Extracts).'
  },
  {
    id: 4,
    type: 'How to Use / Step-by-Step with Model',
    title: '4. Step-by-Step How to Use Guide',
    description: 'Simple 4-step daily application ritual guide (Cleanse, Dispense, Massage, Daily Care) with authentic product.'
  },
  {
    id: 5,
    type: 'YogKart vs Other Brands (Comparison)',
    title: '5. YogKart vs Other Brands',
    description: 'Side-by-side comparison matrix showing YogKart (100% Pure & Organic) vs Other Market Brands (Chemicals, Fillers).'
  },
  {
    id: 6,
    type: 'Lifestyle & In-Use with Model',
    title: '6. Lifestyle Shot with Model',
    description: 'Luxury lifestyle presentation on natural stone/wood vanity with soft morning ambient lighting and authentic product.'
  },
  {
    id: 7,
    type: 'Packaging & Trust Guarantee',
    title: '7. Trust, Certifications & Eco-Packaging',
    description: 'GMP Certified, 100% Ayurvedic, Cruelty-Free, Satisfaction Guaranteed trust badges with authentic product.'
  }
];

/**
 * Resolves local file buffer for the product image (thumbnail / images)
 */
async function getProductImageBuffer(productData) {
  if (!productData) return null;

  const candidateUrls = [
    productData.thumbnail,
    ...(Array.isArray(productData.images) ? productData.images : [])
  ].filter(u => typeof u === 'string' && u.trim());

  for (const rawUrl of candidateUrls) {
    const filename = path.basename(rawUrl.split('?')[0]);
    const possiblePaths = [
      path.join(STORAGE_ROOT_DIR, 'products', filename),
      path.resolve(__dirname, '../../uploads/products', filename),
      path.resolve(__dirname, '../assets', filename)
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        try {
          return fs.readFileSync(p);
        } catch {}
      }
    }

    // Try fetching if HTTP URL
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      try {
        const res = await fetch(rawUrl, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
          const arr = await res.arrayBuffer();
          return Buffer.from(arr);
        }
      } catch {}
    }
  }

  return null;
}

/**
 * Escapes XML/SVG special characters
 */
function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Overlays official YogKart Brand Logo on the bottom-right corner using Sharp
 */
async function compositeBrandLogo(baseImageBuffer, targetSize = 1600) {
  let canvas = sharp(baseImageBuffer).resize(targetSize, targetSize, { fit: 'cover' });

  if (fs.existsSync(BRAND_LOGO_PATH)) {
    try {
      const logoWidth = Math.round(targetSize * 0.09); // ~144px
      const resizedLogo = await sharp(BRAND_LOGO_PATH)
        .resize(logoWidth, null, { fit: 'contain' })
        .toBuffer();

      const logoMeta = await sharp(resizedLogo).metadata();
      const margin = 45;
      const left = targetSize - logoMeta.width - margin;
      const top = targetSize - logoMeta.height - margin;

      canvas = canvas.composite([
        {
          input: resizedLogo,
          top: Math.max(0, top),
          left: Math.max(0, left),
          blend: 'over'
        }
      ]);
    } catch (logoErr) {
      console.warn('⚠️ Could not overlay brand logo:', logoErr.message);
    }
  }

  return await canvas
    .webp({ quality: 94, effort: 4 })
    .toBuffer();
}

/**
 * Creates high-resolution Amazon 1600x1600 template graphics using Sharp & SVG compositing
 */
async function generateAmazonStudioGraphic({ productBuffer, productName, templateType, productData }) {
  const canvasSize = 1600;
  const safeName = escapeXml(productName || 'YogKart Product');

  // Load and clean product buffer
  let prodMeta = await sharp(productBuffer).metadata();
  const maxProdH = 1050;
  const maxProdW = 750;

  const resizedProdBuffer = await sharp(productBuffer)
    .resize(maxProdW, maxProdH, { fit: 'inside', withoutEnlargement: false })
    .toBuffer();

  const rMeta = await sharp(resizedProdBuffer).metadata();
  const prodLeft = Math.round((canvasSize - rMeta.width) / 2);
  const prodTop = Math.round((canvasSize - rMeta.height) / 2) + 20;

  let composites = [];
  let bgSvg = '';

  switch (templateType) {
    // ─────────────────────────────────────────────────────────────
    // 1. MAIN PRODUCT HERO SHOT (Pure White #FFFFFF, 1600x1600)
    // ─────────────────────────────────────────────────────────────
    case 'Main Product (Hero Shot)':
    case 'Main Product':
    case '1. Clean White Hero Shot': {
      const shadowCx = 800;
      const shadowCy = prodTop + rMeta.height + 15;
      const shadowRx = Math.round(rMeta.width * 0.45);
      const shadowRy = 28;

      bgSvg = `
        <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="shadowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#000000" stop-opacity="0.22" />
              <stop offset="60%" stop-color="#000000" stop-opacity="0.08" />
              <stop offset="100%" stop-color="#000000" stop-opacity="0" />
            </radialGradient>
          </defs>
          <rect width="100%" height="100%" fill="#FFFFFF" />
          <ellipse cx="${shadowCx}" cy="${shadowCy}" rx="${shadowRx}" ry="${shadowRy}" fill="url(#shadowGrad)" />
        </svg>
      `;

      composites.push({
        input: resizedProdBuffer,
        top: Math.max(0, prodTop),
        left: Math.max(0, prodLeft),
        blend: 'over'
      });
      break;
    }

    // ─────────────────────────────────────────────────────────────
    // 2. SKIN CARE JOURNEY & KEY BENEFITS INFOGRAPHIC
    // ─────────────────────────────────────────────────────────────
    case 'Benefits & Features Infographic':
    case '2. Key Benefits Infographic': {
      bgSvg = `
        <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FDFBF7" />
              <stop offset="100%" stop-color="#F5EFEB" />
            </linearGradient>
            <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.06" />
            </filter>
          </defs>

          <!-- Background -->
          <rect width="100%" height="100%" fill="url(#bgGrad)" />

          <!-- Header -->
          <text x="800" y="110" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="600" letter-spacing="4" fill="#78716C" text-anchor="middle">TARGETED STRETCH MARK &amp; SKIN CARE</text>
          <text x="800" y="170" font-family="system-ui, -apple-system, sans-serif" font-size="52" font-weight="800" fill="#292524" text-anchor="middle">Skin Care Journey &amp; Results</text>

          <!-- Left Journey Box (Before / Initial) -->
          <g transform="translate(100, 360)">
            <rect width="320" height="420" rx="24" fill="#E7D8C9" filter="url(#cardShadow)" />
            <text x="160" y="380" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#44403C" text-anchor="middle">Initial Skin Texture</text>
            <text x="160" y="402" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#78716C" text-anchor="middle">&amp; Visible Stretch Marks</text>
            <!-- Arrow to center -->
            <path d="M 335 210 L 370 210 M 360 200 L 370 210 L 360 220" stroke="#78716C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </g>

          <!-- Right Journey Box (After Consistent Use) -->
          <g transform="translate(1180, 360)">
            <rect width="320" height="420" rx="24" fill="#F0E3D5" filter="url(#cardShadow)" />
            <text x="160" y="375" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#44403C" text-anchor="middle">After Consistent Use:</text>
            <text x="160" y="398" font-family="system-ui, sans-serif" font-size="15" font-weight="600" fill="#15803D" text-anchor="middle">Nourished &amp; Smoother-Looking</text>
            <!-- Arrow from center -->
            <path d="M -50 210 L -15 210 M -25 200 L -15 210 L -25 220" stroke="#78716C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />
          </g>

          <!-- Bottom Benefit Badges -->
          <g transform="translate(0, 1340)">
            <!-- Pill 1 -->
            <rect x="120" y="0" width="400" height="90" rx="20" fill="#FFFFFF" filter="url(#cardShadow)" />
            <text x="320" y="42" font-family="system-ui, sans-serif" font-size="17" font-weight="700" fill="#1C1917" text-anchor="middle">Supports Skin Elasticity</text>
            <text x="320" y="68" font-family="system-ui, sans-serif" font-size="13" font-weight="500" fill="#78716C" text-anchor="middle">Enhances firm &amp; supple texture</text>

            <!-- Pill 2 -->
            <rect x="580" y="0" width="440" height="90" rx="20" fill="#FFFFFF" filter="url(#cardShadow)" />
            <text x="800" y="42" font-family="system-ui, sans-serif" font-size="17" font-weight="700" fill="#1C1917" text-anchor="middle">95% Naturally Derived</text>
            <text x="800" y="68" font-family="system-ui, sans-serif" font-size="13" font-weight="500" fill="#78716C" text-anchor="middle">Ayurvedic botanical extracts</text>

            <!-- Pill 3 -->
            <rect x="1080" y="0" width="400" height="90" rx="20" fill="#FFFFFF" filter="url(#cardShadow)" />
            <text x="1280" y="42" font-family="system-ui, sans-serif" font-size="17" font-weight="700" fill="#1C1917" text-anchor="middle">Deep Hydration &amp; Comfort</text>
            <text x="1280" y="68" font-family="system-ui, sans-serif" font-size="13" font-weight="500" fill="#78716C" text-anchor="middle">Long-lasting moisture lock</text>
          </g>

          <!-- Footer Brand -->
          <text x="160" y="1520" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#15803D">YogKart®</text>
          <text x="1440" y="1520" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#15803D" text-anchor="end">YogKart®</text>
        </svg>
      `;

      composites.push({
        input: resizedProdBuffer,
        top: Math.max(0, prodTop + 10),
        left: Math.max(0, prodLeft),
        blend: 'over'
      });
      break;
    }

    // ─────────────────────────────────────────────────────────────
    // 3. INGREDIENTS & WHAT'S INSIDE INFOGRAPHIC
    // ─────────────────────────────────────────────────────────────
    case 'Ayurvedic Ingredients Deep Dive':
    case 'Ingredients':
    case '3. Ingredients & Botanical Extracts': {
      bgSvg = `
        <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="ingBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FAF8F5" />
              <stop offset="100%" stop-color="#F2ECE4" />
            </linearGradient>
            <filter id="badgeShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="#000000" flood-opacity="0.05" />
            </filter>
          </defs>

          <!-- Background -->
          <rect width="100%" height="100%" fill="url(#ingBg)" />

          <!-- Header -->
          <text x="800" y="110" font-family="system-ui, sans-serif" font-size="22" font-weight="600" letter-spacing="4" fill="#78716C" text-anchor="middle">PURE &amp; POTENT BOTANICALS</text>
          <text x="800" y="170" font-family="system-ui, sans-serif" font-size="52" font-weight="800" fill="#1C1917" text-anchor="middle">Active Ingredient Breakdown</text>

          <!-- Leader Lines from Callouts to Product Center -->
          <!-- Top Left Line -->
          <path d="M 380 430 L 480 430 L 580 540" stroke="#78716C" stroke-width="2.5" stroke-linecap="round" fill="none" />
          <circle cx="580" cy="540" r="5" fill="#15803D" />

          <!-- Top Right Line -->
          <path d="M 1220 430 L 1120 430 L 1020 540" stroke="#78716C" stroke-width="2.5" stroke-linecap="round" fill="none" />
          <circle cx="1020" cy="540" r="5" fill="#15803D" />

          <!-- Bottom Left Line -->
          <path d="M 380 1100 L 480 1100 L 580 980" stroke="#78716C" stroke-width="2.5" stroke-linecap="round" fill="none" />
          <circle cx="580" cy="980" r="5" fill="#15803D" />

          <!-- Bottom Right Line -->
          <path d="M 1220 1100 L 1120 1100 L 1020 980" stroke="#78716C" stroke-width="2.5" stroke-linecap="round" fill="none" />
          <circle cx="1020" cy="980" r="5" fill="#15803D" />

          <!-- Callout 1: Top-Left -->
          <g transform="translate(90, 320)">
            <rect width="350" height="150" rx="20" fill="#FFFFFF" filter="url(#badgeShadow)" />
            <text x="175" y="60" font-family="system-ui, sans-serif" font-size="22" font-weight="800" fill="#15803D" text-anchor="middle">ALGAE EXTRACT</text>
            <text x="175" y="95" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#44403C" text-anchor="middle">Firming &amp; Elasticity</text>
            <text x="175" y="120" font-family="system-ui, sans-serif" font-size="13" font-weight="500" fill="#78716C" text-anchor="middle">Natural marine skin tightener</text>
          </g>

          <!-- Callout 2: Top-Right -->
          <g transform="translate(1160, 320)">
            <rect width="350" height="150" rx="20" fill="#FFFFFF" filter="url(#badgeShadow)" />
            <text x="175" y="60" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#15803D" text-anchor="middle">FUCUS VESICULOSUS</text>
            <text x="175" y="95" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#44403C" text-anchor="middle">Skin Conditioning</text>
            <text x="175" y="120" font-family="system-ui, sans-serif" font-size="13" font-weight="500" fill="#78716C" text-anchor="middle">Rich in vitamins &amp; minerals</text>
          </g>

          <!-- Callout 3: Bottom-Left -->
          <g transform="translate(90, 1020)">
            <rect width="350" height="150" rx="20" fill="#FFFFFF" filter="url(#badgeShadow)" />
            <text x="175" y="60" font-family="system-ui, sans-serif" font-size="22" font-weight="800" fill="#15803D" text-anchor="middle">COCOA BUTTER</text>
            <text x="175" y="95" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#44403C" text-anchor="middle">Rich Moisturization</text>
            <text x="175" y="120" font-family="system-ui, sans-serif" font-size="13" font-weight="500" fill="#78716C" text-anchor="middle">Deep lipid barrier nourishment</text>
          </g>

          <!-- Callout 4: Bottom-Right -->
          <g transform="translate(1160, 1020)">
            <rect width="350" height="150" rx="20" fill="#FFFFFF" filter="url(#badgeShadow)" />
            <text x="175" y="60" font-family="system-ui, sans-serif" font-size="22" font-weight="800" fill="#15803D" text-anchor="middle">GOTU KOLA</text>
            <text x="175" y="95" font-family="system-ui, sans-serif" font-size="16" font-weight="600" fill="#44403C" text-anchor="middle">Supports Collagen</text>
            <text x="175" y="120" font-family="system-ui, sans-serif" font-size="13" font-weight="500" fill="#78716C" text-anchor="middle">Ancient Ayurvedic skin healer</text>
          </g>

          <!-- Bottom Footer Guarantee -->
          <text x="800" y="1520" font-family="system-ui, sans-serif" font-size="18" font-weight="700" letter-spacing="2" fill="#78716C" text-anchor="middle">100% VEGAN · CRUELTY FREE · PARABEN FREE · AYURVEDIC FORMULA</text>
        </svg>
      `;

      composites.push({
        input: resizedProdBuffer,
        top: Math.max(0, prodTop),
        left: Math.max(0, prodLeft),
        blend: 'over'
      });
      break;
    }

    // ─────────────────────────────────────────────────────────────
    // 4. STEP-BY-STEP HOW TO USE GUIDE
    // ─────────────────────────────────────────────────────────────
    case 'How to Use / Step-by-Step with Model':
    case 'How to Use':
    case '4. Step-by-Step Guide with Model': {
      bgSvg = `
        <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="stepBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FDFBF7" />
              <stop offset="100%" stop-color="#F2ECE4" />
            </linearGradient>
            <filter id="stepShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="#000000" flood-opacity="0.06" />
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="url(#stepBg)" />

          <!-- Header -->
          <text x="800" y="110" font-family="system-ui, sans-serif" font-size="22" font-weight="600" letter-spacing="4" fill="#78716C" text-anchor="middle">APPLICATION RITUAL</text>
          <text x="800" y="170" font-family="system-ui, sans-serif" font-size="52" font-weight="800" fill="#1C1917" text-anchor="middle">How to Use for Best Results</text>

          <!-- Step 1 -->
          <g transform="translate(120, 290)">
            <rect width="360" height="220" rx="20" fill="#FFFFFF" filter="url(#stepShadow)" />
            <circle cx="50" cy="50" r="24" fill="#15803D" />
            <text x="50" y="58" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#FFFFFF" text-anchor="middle">1</text>
            <text x="90" y="56" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#1C1917">CLEANSE &amp; PREP</text>
            <text x="30" y="110" font-family="system-ui, sans-serif" font-size="15" font-weight="500" fill="#57534E">Wash targeted area with warm</text>
            <text x="30" y="135" font-family="system-ui, sans-serif" font-size="15" font-weight="500" fill="#57534E">water and gently pat dry.</text>
          </g>

          <!-- Step 2 -->
          <g transform="translate(120, 560)">
            <rect width="360" height="220" rx="20" fill="#FFFFFF" filter="url(#stepShadow)" />
            <circle cx="50" cy="50" r="24" fill="#15803D" />
            <text x="50" y="58" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#FFFFFF" text-anchor="middle">2</text>
            <text x="90" y="56" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#1C1917">TAKE AMOUNT</text>
            <text x="30" y="110" font-family="system-ui, sans-serif" font-size="15" font-weight="500" fill="#57534E">Dispense a coin-sized portion</text>
            <text x="30" y="135" font-family="system-ui, sans-serif" font-size="15" font-weight="500" fill="#57534E">onto clean fingertips.</text>
          </g>

          <!-- Step 3 -->
          <g transform="translate(1120, 290)">
            <rect width="360" height="220" rx="20" fill="#FFFFFF" filter="url(#stepShadow)" />
            <circle cx="50" cy="50" r="24" fill="#15803D" />
            <text x="50" y="58" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#FFFFFF" text-anchor="middle">3</text>
            <text x="90" y="56" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#1C1917">MASSAGE GENTLY</text>
            <text x="30" y="110" font-family="system-ui, sans-serif" font-size="15" font-weight="500" fill="#57534E">Apply in circular upward motions</text>
            <text x="30" y="135" font-family="system-ui, sans-serif" font-size="15" font-weight="500" fill="#57534E">for 2–3 minutes until absorbed.</text>
          </g>

          <!-- Step 4 -->
          <g transform="translate(1120, 560)">
            <rect width="360" height="220" rx="20" fill="#FFFFFF" filter="url(#stepShadow)" />
            <circle cx="50" cy="50" r="24" fill="#15803D" />
            <text x="50" y="58" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#FFFFFF" text-anchor="middle">4</text>
            <text x="90" y="56" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#1C1917">DAILY CARE</text>
            <text x="30" y="110" font-family="system-ui, sans-serif" font-size="15" font-weight="500" fill="#57534E">Use twice daily (Morning &amp; Night)</text>
            <text x="30" y="135" font-family="system-ui, sans-serif" font-size="15" font-weight="500" fill="#57534E">for 6–8 weeks for best results.</text>
          </g>

          <!-- Bottom Banner -->
          <g transform="translate(200, 1360)">
            <rect width="1200" height="90" rx="20" fill="#15803D" filter="url(#stepShadow)" />
            <text x="600" y="55" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#FFFFFF" text-anchor="middle">✨ Fast Absorbing · Non-Greasy · Dermatologically Tested</text>
          </g>
        </svg>
      `;

      composites.push({
        input: resizedProdBuffer,
        top: Math.max(0, prodTop + 20),
        left: Math.max(0, prodLeft),
        blend: 'over'
      });
      break;
    }

    // ─────────────────────────────────────────────────────────────
    // 5. YOGKART VS OTHER BRANDS (COMPARISON)
    // ─────────────────────────────────────────────────────────────
    case 'YogKart vs Other Brands (Comparison)':
    case 'Comparison':
    case '5. YogKart vs Other Brands':
    case '5. YogKart vs Other Brands (Pros & Cons)': {
      bgSvg = `
        <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="compShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="12" flood-color="#000000" flood-opacity="0.08" />
            </filter>
          </defs>
          <rect width="100%" height="100%" fill="#FBF9F6" />

          <!-- Header -->
          <text x="800" y="100" font-family="system-ui, sans-serif" font-size="22" font-weight="600" letter-spacing="4" fill="#78716C" text-anchor="middle">WHY CHOOSE US</text>
          <text x="800" y="160" font-family="system-ui, sans-serif" font-size="52" font-weight="800" fill="#1C1917" text-anchor="middle">The YogKart Advantage</text>

          <!-- LEFT CARD: OUR PRODUCT (YOGKART) -->
          <g transform="translate(140, 220)">
            <rect width="600" height="1240" rx="28" fill="#FFFFFF" stroke="#22C55E" stroke-width="4" filter="url(#compShadow)" />
            <rect width="600" height="90" rx="28" fill="#15803D" />
            <rect y="60" width="600" height="30" fill="#15803D" />
            <text x="300" y="55" font-family="system-ui, sans-serif" font-size="26" font-weight="800" fill="#FFFFFF" text-anchor="middle">OUR PRODUCT (YogKart®)</text>

            <!-- Comparison Points -->
            <g transform="translate(60, 720)">
              <text x="45" y="40" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#15803D">✔ 100% Pure Ayurvedic Formula</text>
              <text x="45" y="68" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#78716C">Crafted with authentic raw herbal extracts</text>

              <text x="45" y="140" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#15803D">✔ Zero Parabens or Harsh Toxins</text>
              <text x="45" y="168" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#78716C">Safe for daily long-term wellness usage</text>

              <text x="45" y="240" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#15803D">✔ Lab Certified Purity &amp; Quality</text>
              <text x="45" y="268" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#78716C">Rigorous quality testing and GMP certified</text>

              <text x="45" y="340" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#15803D">✔ Premium Eco-Friendly Packaging</text>
              <text x="45" y="368" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#78716C">Sustainable, protective &amp; recyclable</text>
            </g>
          </g>

          <!-- RIGHT CARD: OTHER / TYPICAL ALTERNATIVES -->
          <g transform="translate(860, 220)">
            <rect width="600" height="1240" rx="28" fill="#F5F5F4" stroke="#E7E5E4" stroke-width="2" filter="url(#compShadow)" />
            <rect width="600" height="90" rx="28" fill="#78716C" />
            <rect y="60" width="600" height="30" fill="#78716C" />
            <text x="300" y="55" font-family="system-ui, sans-serif" font-size="24" font-weight="700" fill="#FFFFFF" text-anchor="middle">OTHER ALTERNATIVES</text>

            <!-- Generic Outline Icon -->
            <g transform="translate(230, 200)" opacity="0.4">
              <rect x="30" y="20" width="80" height="140" rx="10" fill="none" stroke="#78716C" stroke-width="4" stroke-dasharray="6,6" />
              <rect x="45" y="5" width="50" height="20" rx="4" fill="#78716C" />
              <text x="70" y="100" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="#78716C" text-anchor="middle">Generic</text>
            </g>

            <!-- Negative Points -->
            <g transform="translate(60, 720)">
              <text x="45" y="40" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#DC2626">✘ Synthetic Fillers &amp; Chemicals</text>
              <text x="45" y="68" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#A8A29E">Cheap artificial substitutes</text>

              <text x="45" y="140" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#DC2626">✘ Harsh Preservatives</text>
              <text x="45" y="168" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#A8A29E">Can cause irritation and dryness</text>

              <text x="45" y="240" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#DC2626">✘ Diluted Herbal Extracts</text>
              <text x="45" y="268" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#A8A29E">Low potency and weak results</text>

              <text x="45" y="340" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#DC2626">✘ Cheap Non-Recyclable Plastic</text>
              <text x="45" y="368" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#A8A29E">Prone to leakage and oxidation</text>
            </g>
          </g>
        </svg>
      `;

      // Scale product down slightly to fit inside the Left comparison card
      const leftCardProd = await sharp(productBuffer)
        .resize(360, 480, { fit: 'inside' })
        .toBuffer();
      const lcMeta = await sharp(leftCardProd).metadata();

      composites.push({
        input: leftCardProd,
        top: 360,
        left: 140 + Math.round((600 - lcMeta.width) / 2),
        blend: 'over'
      });
      break;
    }

    // ─────────────────────────────────────────────────────────────
    // 6. LIFESTYLE & SERENE WELLNESS SETTING
    // ─────────────────────────────────────────────────────────────
    case 'Lifestyle & In-Use with Model':
    case 'Lifestyle':
    case '3. Lifestyle Shot with Model':
    case '6. Lifestyle Shot with Model': {
      bgSvg = `
        <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lifeBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#FAF5EE" />
              <stop offset="60%" stop-color="#F2E8DC" />
              <stop offset="100%" stop-color="#E2D4C3" />
            </linearGradient>
            <radialGradient id="sunlight" cx="20%" cy="10%" r="70%">
              <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.8" />
              <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0" />
            </radialGradient>
            <radialGradient id="pedestalShadow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#000000" stop-opacity="0.25" />
              <stop offset="100%" stop-color="#000000" stop-opacity="0" />
            </radialGradient>
          </defs>

          <!-- Background -->
          <rect width="100%" height="100%" fill="url(#lifeBg)" />
          <rect width="100%" height="100%" fill="url(#sunlight)" />

          <!-- Header -->
          <text x="800" y="110" font-family="system-ui, sans-serif" font-size="22" font-weight="600" letter-spacing="4" fill="#78716C" text-anchor="middle">EVERYDAY WELLNESS RITUAL</text>
          <text x="800" y="170" font-family="system-ui, sans-serif" font-size="52" font-weight="800" fill="#1C1917" text-anchor="middle">Nourish Your Natural Beauty</text>

          <!-- Solid Marble / Wood Pedestal Base -->
          <ellipse cx="800" cy="1330" rx="420" ry="70" fill="url(#pedestalShadow)" />
          <ellipse cx="800" cy="1300" rx="400" ry="45" fill="#E7D8C9" stroke="#D7C4B2" stroke-width="3" />

          <!-- Feature Badges on Sides -->
          <g transform="translate(100, 520)">
            <rect width="280" height="110" rx="20" fill="#FFFFFF" opacity="0.95" />
            <text x="140" y="48" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#15803D" text-anchor="middle">MORNING &amp; NIGHT</text>
            <text x="140" y="78" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#78716C" text-anchor="middle">Seamless daily routine</text>
          </g>

          <g transform="translate(1220, 520)">
            <rect width="280" height="110" rx="20" fill="#FFFFFF" opacity="0.95" />
            <text x="140" y="48" font-family="system-ui, sans-serif" font-size="18" font-weight="800" fill="#15803D" text-anchor="middle">FAST ABSORBING</text>
            <text x="140" y="78" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#78716C" text-anchor="middle">Non-greasy, silky finish</text>
          </g>

          <!-- Bottom Footer -->
          <text x="800" y="1520" font-family="system-ui, sans-serif" font-size="18" font-weight="700" letter-spacing="2" fill="#78716C" text-anchor="middle">AUTHENTIC AYURVEDIC LUXURY · CRAFTED WITH CARE</text>
        </svg>
      `;

      composites.push({
        input: resizedProdBuffer,
        top: Math.max(0, prodTop - 20),
        left: Math.max(0, prodLeft),
        blend: 'over'
      });
      break;
    }

    // ─────────────────────────────────────────────────────────────
    // 7. TRUST, CERTIFICATIONS & QUALITY GUARANTEE
    // ─────────────────────────────────────────────────────────────
    default:
    case 'Packaging & Trust Guarantee':
    case 'Trust & Certifications':
    case '7. Trust, Certifications & Eco-Packaging': {
      bgSvg = `
        <svg width="${canvasSize}" height="${canvasSize}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="trustBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FAF9F6" />
              <stop offset="100%" stop-color="#EFE8DD" />
            </linearGradient>
            <filter id="trustShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000000" flood-opacity="0.07" />
            </filter>
          </defs>

          <!-- Background -->
          <rect width="100%" height="100%" fill="url(#trustBg)" />

          <!-- Header -->
          <text x="800" y="110" font-family="system-ui, sans-serif" font-size="22" font-weight="600" letter-spacing="4" fill="#78716C" text-anchor="middle">PURITY &amp; TRUST ASSURANCE</text>
          <text x="800" y="170" font-family="system-ui, sans-serif" font-size="52" font-weight="800" fill="#1C1917" text-anchor="middle">Certified Quality Standards</text>

          <!-- 4 Trust Badges Around Product -->
          <!-- Badge 1: Top-Left -->
          <g transform="translate(100, 360)">
            <rect width="320" height="150" rx="20" fill="#FFFFFF" filter="url(#trustShadow)" />
            <circle cx="65" cy="75" r="34" fill="#EBF8F0" />
            <text x="65" y="84" font-family="system-ui, sans-serif" font-size="26" fill="#15803D" text-anchor="middle">🌿</text>
            <text x="120" y="65" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#15803D">100% ORGANIC</text>
            <text x="120" y="95" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#78716C">Certified Ayurvedic herbs</text>
          </g>

          <!-- Badge 2: Top-Right -->
          <g transform="translate(1180, 360)">
            <rect width="320" height="150" rx="20" fill="#FFFFFF" filter="url(#trustShadow)" />
            <circle cx="65" cy="75" r="34" fill="#EBF8F0" />
            <text x="65" y="84" font-family="system-ui, sans-serif" font-size="26" fill="#15803D" text-anchor="middle">🏆</text>
            <text x="120" y="65" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#15803D">GMP CERTIFIED</text>
            <text x="120" y="95" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#78716C">Highest safety facility</text>
          </g>

          <!-- Badge 3: Bottom-Left -->
          <g transform="translate(100, 960)">
            <rect width="320" height="150" rx="20" fill="#FFFFFF" filter="url(#trustShadow)" />
            <circle cx="65" cy="75" r="34" fill="#EBF8F0" />
            <text x="65" y="84" font-family="system-ui, sans-serif" font-size="26" fill="#15803D" text-anchor="middle">🐰</text>
            <text x="120" y="65" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#15803D">CRUELTY FREE</text>
            <text x="120" y="95" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#78716C">Never tested on animals</text>
          </g>

          <!-- Badge 4: Bottom-Right -->
          <g transform="translate(1180, 960)">
            <rect width="320" height="150" rx="20" fill="#FFFFFF" filter="url(#trustShadow)" />
            <circle cx="65" cy="75" r="34" fill="#EBF8F0" />
            <text x="65" y="84" font-family="system-ui, sans-serif" font-size="26" fill="#15803D" text-anchor="middle">🛡️</text>
            <text x="120" y="65" font-family="system-ui, sans-serif" font-size="20" font-weight="800" fill="#15803D">SATISFACTION</text>
            <text x="120" y="95" font-family="system-ui, sans-serif" font-size="14" font-weight="500" fill="#78716C">100% Quality Guaranteed</text>
          </g>

          <!-- Bottom Footer -->
          <text x="800" y="1520" font-family="system-ui, sans-serif" font-size="18" font-weight="700" letter-spacing="2" fill="#78716C" text-anchor="middle">TRUSTED BY 50,000+ HAPPY FAMILIES ACROSS INDIA</text>
        </svg>
      `;

      composites.push({
        input: resizedProdBuffer,
        top: Math.max(0, prodTop),
        left: Math.max(0, prodLeft),
        blend: 'over'
      });
      break;
    }
  }

  // Create composite image
  const svgBuffer = Buffer.from(bgSvg);
  const baseCanvas = sharp(svgBuffer);

  const finalImage = await baseCanvas
    .composite(composites)
    .webp({ quality: 95, effort: 4 })
    .toBuffer();

  return await compositeBrandLogo(finalImage, canvasSize);
}

/**
 * Fetches AI image buffer using Google Gemini / Imagen 3 API if key provided, with Flux/SDXL fallback
 */
async function fetchAiImageBuffer(prompt, geminiApiKey = null) {
  const apiKey = await resolveGeminiApiKey(geminiApiKey);

  // 1. Try Google Imagen 3 API if key is available
  if (apiKey) {
    try {
      console.log('🤖 [AI Studio] Generating with Google Gemini / Imagen 3 API...');
      const imagenUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${encodeURIComponent(apiKey.trim())}`;

      const response = await fetch(imagenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '1:1',
            outputOptions: { mimeType: 'image/jpeg' }
          }
        }),
        signal: AbortSignal.timeout(20000)
      });

      if (response.ok) {
        const data = await response.json();
        const b64 = data.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
          console.log('✅ [AI Studio] Image generated via Gemini Imagen 3 API successfully');
          return Buffer.from(b64, 'base64');
        }
      } else {
        const errText = await response.text();
        console.warn('⚠️ Gemini Imagen API response not OK, status:', response.status, errText.slice(0, 100));
      }
    } catch (geminiErr) {
      console.warn('⚠️ Gemini Imagen API call error:', geminiErr.message);
    }
  }

  // 2. High-res Photorealistic Engine (Model: Flux -> Turbo fallback)
  const encodedPrompt = encodeURIComponent(prompt.slice(0, 800));
  const seed = Math.floor(Math.random() * 1000000);

  const models = ['flux', 'turbo', 'default'];

  for (const model of models) {
    try {
      console.log(`⚡ [AI Studio] Fetching via Pollinations AI (${model})...`);
      const modelParam = model !== 'default' ? `&model=${model}` : '';
      const aiUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true${modelParam}`;

      const res = await fetch(aiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/*'
        },
        signal: AbortSignal.timeout(25000)
      });

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        if (arrayBuffer.byteLength > 1000) {
          console.log(`✅ [AI Studio] Image generated successfully (${model}, ${arrayBuffer.byteLength} bytes)`);
          return Buffer.from(arrayBuffer);
        }
      }
    } catch (err) {
      console.warn(`⚠️ [AI Studio] Model ${model} failed:`, err.message);
    }
  }

  throw new Error('AI image generation services are currently busy. Please retry in a few moments.');
}

/**
 * Saves generated image to storage directories (VPS storage & local uploads)
 */
function saveGeneratedProductImage(imageBuffer, filename) {
  const secondaryDir = path.resolve(__dirname, '../../uploads/products');
  const primaryCategoryDir = path.join(STORAGE_ROOT_DIR, 'products');

  if (!fs.existsSync(primaryCategoryDir)) fs.mkdirSync(primaryCategoryDir, { recursive: true });
  if (!fs.existsSync(secondaryDir)) fs.mkdirSync(secondaryDir, { recursive: true });

  const primaryPath = path.join(primaryCategoryDir, filename);
  const secondaryPath = path.join(secondaryDir, filename);

  fs.writeFileSync(primaryPath, imageBuffer);
  if (primaryPath !== secondaryPath) {
    fs.writeFileSync(secondaryPath, imageBuffer);
  }

  return `/uploads/products/${filename}`;
}

/**
 * Single AI Photo Generation
 */
async function generateProductAiPhoto({ productName, productData = null, templateType = 'Main Product (Hero Shot)', customPrompt = '', geminiApiKey = null }) {
  if (!productName || !productName.trim()) {
    throw new Error('Product Name is required');
  }

  console.log(`🎨 [AI Studio] Generating studio image for '${productName}' [${templateType}]...`);

  // 1. Check if we have an authentic product image available in DB/storage
  const productImgBuffer = await getProductImageBuffer(productData);

  let finalBuffer;
  if (productImgBuffer) {
    console.log(`✨ [AI Studio] Using authentic product packaging photo for perfect Amazon 7 accuracy...`);
    finalBuffer = await generateAmazonStudioGraphic({
      productBuffer: productImgBuffer,
      productName,
      templateType,
      productData
    });
  } else {
    // If no physical product photo uploaded yet, generate photorealistic canvas
    console.log(`⚡ [AI Studio] Generating from text prompt...`);
    const finalPrompt = `Create a commercial Amazon ${templateType} for '${productName}'. 1600x1600 square 1:1, photorealistic, ultra-sharp 8k. ${customPrompt}`;
    const rawBuffer = await fetchAiImageBuffer(finalPrompt, geminiApiKey);
    finalBuffer = await compositeBrandLogo(rawBuffer, 1600);
  }

  const timestamp = Date.now();
  const safeSlug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 25);
  const safeType = templateType.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 15);
  const filename = `ai_${safeSlug}_${safeType}_${timestamp}.webp`;

  const relativeUrl = saveGeneratedProductImage(finalBuffer, filename);

  return {
    success: true,
    imageUrl: relativeUrl,
    filename,
    templateType,
    productName,
    size: '1600x1600'
  };
}

/**
 * Bulk / Set AI Photo Generation (Generates all 7 Amazon images)
 */
async function generateAmazon7ImageSet({ productName, productId = null, productData = null, geminiApiKey = null, customPrompt = '' }) {
  const generatedImages = [];

  for (const template of AMAZON_7_TEMPLATES) {
    try {
      const result = await generateProductAiPhoto({
        productName,
        productData,
        templateType: template.type,
        customPrompt,
        geminiApiKey
      });

      generatedImages.push({
        templateId: template.id,
        templateType: template.type,
        title: template.title,
        description: template.description,
        imageUrl: result.imageUrl,
        filename: result.filename
      });
    } catch (err) {
      console.error(`❌ Failed to generate template ${template.title}:`, err.message);
      generatedImages.push({
        templateId: template.id,
        templateType: template.type,
        title: template.title,
        description: template.description,
        error: err.message
      });
    }
  }

  return {
    productId,
    productName,
    images: generatedImages,
    totalGenerated: generatedImages.filter(img => !img.error).length
  };
}

module.exports = {
  AMAZON_7_TEMPLATES,
  generateProductAiPhoto,
  generateAmazon7ImageSet
};
