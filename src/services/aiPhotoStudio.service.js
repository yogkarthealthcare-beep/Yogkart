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
    description: 'Pure white background (#FFFFFF), subtle soft grounding shadow, retail box + tube packaging with YogKart branding, Amazon catalog hero shot standard (1600x1600).'
  },
  {
    id: 2,
    type: 'Benefits & Features Infographic',
    title: '2. Skin Care Journey & Key Benefits',
    description: 'Targeted care infographic with before/after journey, benefit callout badges, and centered product packaging.'
  },
  {
    id: 3,
    type: 'Ayurvedic Ingredients Deep Dive',
    title: '3. Ingredients & Botanical Extracts',
    description: 'Surrounded by fresh raw botanicals (Algae, Cocoa Butter, Gotu Kola, Herbal Extracts) with clean ingredient callouts.'
  },
  {
    id: 4,
    type: 'How to Use / Step-by-Step with Model',
    title: '4. Step-by-Step How to Use Guide',
    description: 'Simple 4-step daily application ritual guide (Cleanse, Dispense, Massage, Daily Care).'
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
    description: 'Luxury lifestyle presentation in aesthetic morning wellness setting with model holding the product.'
  },
  {
    id: 7,
    type: 'Packaging & Trust Guarantee',
    title: '7. Trust, Certifications & Eco-Packaging',
    description: 'GMP Certified, 100% Ayurvedic, Cruelty-Free, Satisfaction Guaranteed trust badges.'
  }
];

/**
 * Builds Amazon-optimized prompts for generating brand-new 3D photorealistic product packaging from scratch
 */
function buildAmazonPhotographyPrompt(productName, templateType = 'Main Product (Hero Shot)', customNotes = '') {
  const cleanName = String(productName || '').trim();
  const extra = customNotes ? ` ${customNotes}.` : '';

  switch (templateType) {
    // ─────────────────────────────────────────────────────────────
    // 1. MAIN PRODUCT HERO SHOT (Pure White #FFFFFF, 1600x1600)
    // ─────────────────────────────────────────────────────────────
    case 'Main Product (Hero Shot)':
    case 'Main Product':
    case '1. Clean White Hero Shot':
      return `Commercial 3D product render and studio catalog photography of '${cleanName}' by YogKart. Realistic modern luxury packaging with retail carton packaging box and matching cosmetic tube or bottle standing side-by-side, elegant eco-friendly kraft paper texture and cream colors, clean authentic 'YogKart' logo printed clearly on the label, solid pure white seamless background (#FFFFFF), soft delicate grounding contact shadow beneath, bright commercial studio lighting, ultra-sharp focus, 8k resolution, photorealistic, pristine Amazon marketplace hero listing image.${extra}`;

    // ─────────────────────────────────────────────────────────────
    // 2. SKIN CARE JOURNEY & KEY BENEFITS INFOGRAPHIC
    // ─────────────────────────────────────────────────────────────
    case 'Benefits & Features Infographic':
    case '2. Key Benefits Infographic':
    case '2. Skin Care Journey & Key Benefits':
      return `Commercial Amazon product listing infographic for YogKart '${cleanName}'. Beautiful centered luxury cosmetic tube and packaging box on soft beige marble pedestal. High-end e-commerce infographic layout with clean modern minimalist typography callout badges and icons highlighting natural skin elasticity, 95% plant-derived herbs, and deep hydration. Clean aesthetic, soft diffuse studio lighting, 8k resolution, photorealistic.${extra}`;

    // ─────────────────────────────────────────────────────────────
    // 3. INGREDIENTS & WHAT'S INSIDE INFOGRAPHIC
    // ─────────────────────────────────────────────────────────────
    case 'Ayurvedic Ingredients Deep Dive':
    case 'Ingredients':
    case '3. Ingredients & Botanical Extracts':
      return `Luxury Amazon ingredients breakdown infographic for YogKart '${cleanName}'. Premium herbal cream bottle and tube placed in center, surrounded by fresh real whole botanical ingredients (green algae seaweed, brown fucus extract, raw cocoa butter chunks, fresh green gotu kola leaves, olive leaves) with clean modern leader lines and ingredient callouts. High-end beauty advertising photography, soft studio illumination, crisp macro details, 8k resolution, photorealistic.${extra}`;

    // ─────────────────────────────────────────────────────────────
    // 4. STEP-BY-STEP HOW TO USE GUIDE
    // ─────────────────────────────────────────────────────────────
    case 'How to Use / Step-by-Step with Model':
    case 'How to Use':
    case '4. Step-by-Step How to Use Guide':
    case '4. Step-by-Step Guide with Model':
      return `Amazon how-to-use step-by-step visual application guide for YogKart '${cleanName}'. Beautiful serene bathroom setting, 4 clean numbered steps showing natural skincare ritual, elegant cream application on smooth skin, soft morning sunlight, luxury wellness aesthetic, 8k resolution, photorealistic commercial guide.${extra}`;

    // ─────────────────────────────────────────────────────────────
    // 5. YOGKART VS OTHER BRANDS (COMPARISON)
    // ─────────────────────────────────────────────────────────────
    case 'YogKart vs Other Brands (Comparison)':
    case 'Comparison':
    case '5. YogKart vs Other Brands':
    case '5. YogKart vs Other Brands (Pros & Cons)':
      return `Side-by-side Amazon comparison infographic. Left side features premium YogKart '${cleanName}' in luxury eco-friendly packaging with green verified checkmarks (100% Pure, Organic, No Harmful Chemicals). Right side shows generic unbranded dull gray container with red cross marks. Clean modern e-commerce comparison chart layout, high resolution, photorealistic.${extra}`;

    // ─────────────────────────────────────────────────────────────
    // 6. LIFESTYLE SHOT WITH MODEL
    // ─────────────────────────────────────────────────────────────
    case 'Lifestyle & In-Use with Model':
    case 'Lifestyle':
    case '3. Lifestyle Shot with Model':
    case '6. Lifestyle Shot with Model':
      return `Luxury commercial lifestyle advertising photography for YogKart '${cleanName}'. An attractive Indian woman with radiant glowing skin gently applying the cream in a sunlit modern aesthetic bathroom. Soft natural morning sunlight, linen towel, fresh green plants in background, natural skin texture, commercial advertising standard, 8k resolution, photorealistic.${extra}`;

    // ─────────────────────────────────────────────────────────────
    // 7. TRUST, CERTIFICATIONS & QUALITY GUARANTEE
    // ─────────────────────────────────────────────────────────────
    case 'Packaging & Trust Guarantee':
    case 'Trust & Certifications':
    case '7. Trust, Certifications & Eco-Packaging':
    default:
      return `Premium trust and certification showcase for YogKart '${cleanName}'. Elegant pedestal display with gold and emerald certification badges: 'GMP Certified', '100% Ayurvedic & Organic', 'Cruelty Free', 'Satisfaction Guarantee', luxury packaging presentation, soft studio lighting, 8k resolution, photorealistic commercial advertising.${extra}`;
  }
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
        signal: AbortSignal.timeout(25000)
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
        console.warn('⚠️ Gemini Imagen API response not OK, status:', response.status, errText.slice(0, 120));
      }
    } catch (geminiErr) {
      console.warn('⚠️ Gemini Imagen API call error:', geminiErr.message);
    }
  }

  // 2. High-res Photorealistic Engine (Model: Flux -> Flux-Realism -> Turbo fallback)
  const encodedPrompt = encodeURIComponent(prompt.trim());
  const seed = Math.floor(Math.random() * 10000000);

  const models = ['flux', 'flux-realism', 'turbo'];

  for (const model of models) {
    try {
      console.log(`⚡ [AI Studio] Generating from scratch via Pollinations AI (${model})...`);
      const modelParam = model !== 'default' ? `&model=${model}` : '';
      const aiUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true${modelParam}&enhance=true`;

      const res = await fetch(aiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/*'
        },
        signal: AbortSignal.timeout(30000)
      });

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        if (arrayBuffer.byteLength > 2000) {
          console.log(`✅ [AI Studio] Image generated from scratch successfully (${model}, ${arrayBuffer.byteLength} bytes)`);
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
 * Single AI Photo Generation from scratch
 */
async function generateProductAiPhoto({ productName, templateType = 'Main Product (Hero Shot)', customPrompt = '', geminiApiKey = null }) {
  if (!productName || !productName.trim()) {
    throw new Error('Product Name is required');
  }

  console.log(`🎨 [AI Studio] Generating scratch AI image for '${productName}' [${templateType}]...`);

  // Build high-yield prompt for scratch 3D commercial photography
  const prompt = buildAmazonPhotographyPrompt(productName, templateType, customPrompt);

  const rawBuffer = await fetchAiImageBuffer(prompt, geminiApiKey);
  const finalBuffer = await compositeBrandLogo(rawBuffer, 1600);

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
 * Bulk / Set AI Photo Generation (Generates all 7 Amazon images from scratch)
 */
async function generateAmazon7ImageSet({ productName, productId = null, geminiApiKey = null, customPrompt = '' }) {
  const generatedImages = [];

  for (const template of AMAZON_7_TEMPLATES) {
    try {
      const result = await generateProductAiPhoto({
        productName,
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
