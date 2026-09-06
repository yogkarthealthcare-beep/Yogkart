const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { STORAGE_ROOT_DIR } = require('../config/storage');

const BRAND_LOGO_PATH = path.resolve(__dirname, '../assets/brand_logo.png');

/**
 * Builds high-converting e-commerce photography prompts based on template type
 */
function buildPhotographyPrompt(productName, templateType = 'Main Product', customNotes = '') {
  const cleanName = String(productName || '').trim();

  let styleDesc = '';
  switch (templateType) {
    case 'Lifestyle':
      styleDesc = 'in a warm, realistic luxury bathroom vanity or modern wellness home setting, soft natural morning sunlight streaming through window with delicate botanical shadows, fresh organic herbal ingredients blurred softly in background, warm inviting aesthetic, high-end lifestyle product photography';
      break;
    case 'Premium Brand':
      styleDesc = 'on an ultra-luxurious dark slate stone or polished marble pedestal, dramatic cinematic soft rim lighting, subtle misty warm atmospheric glow, high-end ayurvedic luxury cosmetics aesthetics, elegant reflections, ultra-premium editorial photography';
      break;
    case 'Ingredients Infographic':
      styleDesc = 'on a pristine light marble counter, artfully surrounded by fresh raw botanical ingredients, whole raw herbs, wooden bowls with natural extracts, soft bright studio illumination, crisp macro details, fresh organic wellness aesthetic';
      break;
    case 'How to Use / Guide':
      styleDesc = 'displayed alongside a clean aesthetic skincare ritual setup, gentle morning bathroom ambience, soft water droplets, clean cotton towel, serene ayurvedic self-care application mood, photorealistic';
      break;
    case 'Main Product':
    default:
      styleDesc = 'centered on a minimalist clean off-white stone pedestal, solid seamless neutral studio backdrop, soft even commercial studio lighting from top-left, gentle natural contact shadows, pristine Amazon catalog hero shot aesthetic, hyper-realistic, 8k crisp details';
      break;
  }

  const notes = customNotes ? ` Additional scene details: ${customNotes}.` : '';

  return `Professional e-commerce product studio photography of '${cleanName}'. Real packaging with crisp 'YogKart' branding clearly visible, ${styleDesc}.${notes} Commercial product photography, sharp focus, 8k resolution, photorealistic, pristine quality, no watermark, no gibberish text.`;
}

/**
 * Fetches AI generated image buffer from AI engine
 */
async function fetchAiGeneratedImageBuffer(prompt) {
  const encodedPrompt = encodeURIComponent(prompt);
  // High quality Flux / SDXL photorealistic engine
  const seed = Math.floor(Math.random() * 1000000);
  const aiUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${seed}&nologo=true&model=flux&enhance=true`;

  const response = await fetch(aiUrl, {
    headers: {
      'User-Agent': 'YogKart-AI-Studio/1.0',
      'Accept': 'image/*'
    },
    signal: AbortSignal.timeout(60000) // 60s timeout
  });

  if (!response.ok) {
    throw new Error(`AI Image generator returned HTTP ${response.status}: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Overlays official YogKart Brand Logo on the bottom-right corner using Sharp
 */
async function compositeBrandLogo(baseImageBuffer, targetSize = 1600) {
  // 1. Standardize base image to target square resolution
  let canvas = sharp(baseImageBuffer).resize(targetSize, targetSize, { fit: 'cover' });

  // 2. Check if brand logo exists
  if (fs.existsSync(BRAND_LOGO_PATH)) {
    try {
      // Calculate logo size: ~10% of canvas width (160px for 1600px canvas)
      const logoWidth = Math.round(targetSize * 0.10);
      const resizedLogo = await sharp(BRAND_LOGO_PATH)
        .resize(logoWidth, null, { fit: 'contain' })
        .toBuffer();

      const logoMeta = await sharp(resizedLogo).metadata();
      const margin = 45; // 45px margin from edges
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
    .webp({ quality: 92, effort: 4 })
    .toBuffer();
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
 * Main AI Photography Studio Generator
 */
async function generateProductAiPhoto({ productName, templateType = 'Main Product', customPrompt = '' }) {
  if (!productName || !productName.trim()) {
    throw new Error('Product Name is required to generate product photography');
  }

  const finalPrompt = buildPhotographyPrompt(productName, templateType, customPrompt);
  console.log(`🎨 [AI Photo Studio] Generating image for '${productName}' [${templateType}]...`);

  // 1. Generate Image from AI
  const rawImageBuffer = await fetchAiGeneratedImageBuffer(finalPrompt);

  // 2. Composite official YogKart Brand Logo
  const finalImageBuffer = await compositeBrandLogo(rawImageBuffer, 1600);

  // 3. Save to disk with unique filename
  const timestamp = Date.now();
  const safeSlug = productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  const filename = `ai_${safeSlug}_${timestamp}.webp`;
  const relativeUrl = saveGeneratedProductImage(finalImageBuffer, filename);

  console.log(`✅ [AI Photo Studio] Successfully created & branded: ${relativeUrl}`);

  return {
    success: true,
    imageUrl: relativeUrl,
    filename,
    templateType,
    prompt: finalPrompt
  };
}

module.exports = {
  generateProductAiPhoto,
  buildPhotographyPrompt,
  compositeBrandLogo
};
