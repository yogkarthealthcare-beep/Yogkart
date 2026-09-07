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
    description: 'Pure white background (#FFFFFF), subtle soft shadow, crystal-clear product + box packaging, Amazon catalog hero shot standard.'
  },
  {
    id: 2,
    type: 'Benefits & Features Infographic',
    title: '2. Key Benefits Infographic',
    description: 'Visual badges, top herbal benefits, scientific callouts & ingredient highlights with clean aesthetic layout.'
  },
  {
    id: 3,
    type: 'Lifestyle & In-Use with Model',
    title: '3. Lifestyle Shot with Model',
    description: 'Indian wellness model holding and using the product in a serene morning bathroom / wellness setting with natural warm lighting.'
  },
  {
    id: 4,
    type: 'How to Use / Step-by-Step with Model',
    title: '4. Step-by-Step Guide with Model',
    description: 'Visual numbered application steps (Step 1, 2, 3) with human model demonstrating correct dosage and application ritual.'
  },
  {
    id: 5,
    type: 'YogKart vs Other Brands (Comparison)',
    title: '5. YogKart vs Other Brands',
    description: 'Side-by-side comparison matrix showing YogKart (100% Pure, Organic, Ayurvedic, Eco-Friendly) vs Other Market Brands (Chemicals, Cheap Plastic, Fillers).'
  },
  {
    id: 6,
    type: 'Ayurvedic Ingredients Deep Dive',
    title: '6. Raw Ingredients & Health Benefits',
    description: 'Artfully surrounded by whole raw herbs, fresh botanical extracts, wooden bowls with pure herbal essence.'
  },
  {
    id: 7,
    type: 'Packaging & Trust Guarantee',
    title: '7. Trust, Certifications & Eco-Packaging',
    description: 'Certified Organic, GMP Certified, Cruelty-Free, 100% Satisfaction Guarantee badge with secure premium eco-friendly packaging.'
  }
];

/**
 * Builds Amazon-optimized prompts for each of the 7 image types
 */
function buildAmazonPhotographyPrompt(productName, templateType = 'Main Product (Hero Shot)', customNotes = '') {
  const cleanName = String(productName || '').trim();

  let sceneDesc = '';
  switch (templateType) {
    case 'Main Product (Hero Shot)':
    case 'Main Product':
      sceneDesc = `on a pure solid seamless white background (#FFFFFF), soft subtle natural contact shadow beneath the product, crisp real packaging with clear 'YogKart' branding and label, centered in frame filling 85% area, pristine Amazon marketplace hero main image standard, studio lighting, razor sharp focus, 8k resolution`;
      break;

    case 'Benefits & Features Infographic':
      sceneDesc = `professional Amazon e-commerce infographic layout for '${cleanName}'. Centered product packaging with clean graphic badge callouts around it highlighting '100% Natural Ayurvedic Formula', 'Clinically Tested Quality', 'Pure Herbal Extraction', 'No Harmful Toxins', clean minimalist pastel green badges, soft studio illumination, crisp macro detail`;
      break;

    case 'Lifestyle & In-Use with Model':
    case 'Lifestyle':
      sceneDesc = `lifestyle commercial photograph of an attractive Indian person smiling gently and holding '${cleanName}' in a bright modern aesthetic bathroom with soft morning natural sunlight streaming through window, wooden vanity shelf, fresh green herbal plants in background, warm authentic wellness mood, high-end commercial advertising photography`;
      break;

    case 'How to Use / Step-by-Step with Model':
    case 'How to Use':
      sceneDesc = `commercial step-by-step application guide for '${cleanName}'. An Indian model gently applying and demonstrating the product ritual, clean visual numbered cue steps (Step 1, Step 2, Step 3), serene self-care atmosphere, clear water droplets, aesthetic cotton towel, pristine instructive advertising shot`;
      break;

    case 'YogKart vs Other Brands (Comparison)':
    case 'Comparison':
      sceneDesc = `side-by-side e-commerce comparison graphic. Left side features premium YogKart '${cleanName}' highlighted with green checkmarks (100% Organic, Ayurvedic Purity, Eco-Friendly, Chemical-Free). Right side shows generic competitor container with red cross marks (Added Preservatives, Harsh Chemicals, Cheap Plastic), clean professional comparison chart aesthetic`;
      break;

    case 'Ayurvedic Ingredients Deep Dive':
    case 'Ingredients':
      sceneDesc = `deep-dive herbal ingredient breakdown for '${cleanName}'. Product bottle placed on clean light stone, surrounded by raw organic botanicals, whole fresh herbs, roots, wooden spoon with natural pure extract, fresh green leaves, soft bright studio lighting, pure authentic Ayurvedic wellness aesthetics`;
      break;

    case 'Packaging & Trust Guarantee':
    case 'Trust & Certifications':
      sceneDesc = `trust and certification showcase for YogKart '${cleanName}'. Premium eco-friendly packaging with elegant gold and green certification badges: 'GMP Certified', '100% Organic & Ayurvedic', 'Cruelty Free', 'Satisfaction Guarantee', solid premium studio pedestal, luxury soft lighting`;
      break;

    default:
      sceneDesc = `commercial e-commerce product shot of '${cleanName}' on pure clean studio background, studio lighting, hyper-realistic, 8k crisp details`;
      break;
  }

  const extra = customNotes ? ` Additional instructions: ${customNotes}.` : '';

  return `Commercial Amazon product photography of '${cleanName}', ${sceneDesc}.${extra} Sharp focus, authentic packaging, 8k resolution, photorealistic, no watermarks, no gibberish text.`;
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
        console.warn('⚠️ Gemini Imagen API response not OK, status:', response.status);
      }
    } catch (geminiErr) {
      console.warn('⚠️ Gemini Imagen API call error:', geminiErr.message);
    }
  }

  // 2. High-res Photorealistic Engine (Model: Flux -> Turbo fallback)
  const encodedPrompt = encodeURIComponent(prompt.slice(0, 400));
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
 * Overlays official YogKart Brand Logo on the bottom-right corner using Sharp
 */
async function compositeBrandLogo(baseImageBuffer, targetSize = 1600) {
  let canvas = sharp(baseImageBuffer).resize(targetSize, targetSize, { fit: 'cover' });

  if (fs.existsSync(BRAND_LOGO_PATH)) {
    try {
      const logoWidth = Math.round(targetSize * 0.10); // ~160px for 1600px canvas
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
 * Single AI Photo Generation
 */
async function generateProductAiPhoto({ productName, templateType = 'Main Product (Hero Shot)', customPrompt = '', geminiApiKey = null }) {
  if (!productName || !productName.trim()) {
    throw new Error('Product Name is required');
  }

  const finalPrompt = buildAmazonPhotographyPrompt(productName, templateType, customPrompt);
  console.log(`🎨 [AI Studio] Generating image for '${productName}' [${templateType}]...`);

  const rawBuffer = await fetchAiImageBuffer(finalPrompt, geminiApiKey);
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
    prompt: finalPrompt
  };
}

/**
 * Bulk Generate Complete 7-Image Amazon Suite for a Product
 */
async function generateAmazon7ImageSet({ productName, productId, geminiApiKey = null, customPrompt = '' }) {
  if (!productName || !productName.trim()) {
    throw new Error('Product Name is required for Amazon 7-Set generation');
  }

  console.log(`📦 [AI Studio] Starting 7-Image Amazon Suite for: ${productName}...`);
  
  // Run templates in 2 small batches (4 + 3) to prevent server / rate limit congestion
  const batch1 = AMAZON_7_TEMPLATES.slice(0, 4);
  const batch2 = AMAZON_7_TEMPLATES.slice(4);

  const processTemplate = async (template) => {
    try {
      console.log(`   👉 [${template.id}/7] Generating ${template.type}...`);
      const res = await generateProductAiPhoto({
        productName,
        templateType: template.type,
        customPrompt,
        geminiApiKey
      });

      return {
        templateId: template.id,
        templateType: template.type,
        title: template.title,
        description: template.description,
        imageUrl: res.imageUrl,
        filename: res.filename,
        prompt: res.prompt
      };
    } catch (err) {
      console.error(`❌ Error generating template ${template.type}:`, err.message);
      return {
        templateId: template.id,
        templateType: template.type,
        title: template.title,
        error: err.message
      };
    }
  };

  const results1 = await Promise.all(batch1.map(t => processTemplate(t)));
  // Small 500ms pause between batches
  await new Promise(r => setTimeout(r, 500));
  const results2 = await Promise.all(batch2.map(t => processTemplate(t)));

  const allResults = [...results1, ...results2];

  return {
    productName,
    productId,
    totalGenerated: allResults.filter(r => r.imageUrl).length,
    images: allResults
  };
}

module.exports = {
  AMAZON_7_TEMPLATES,
  buildAmazonPhotographyPrompt,
  fetchAiImageBuffer,
  generateProductAiPhoto,
  generateAmazon7ImageSet,
  compositeBrandLogo
};
