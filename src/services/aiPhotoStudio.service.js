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
 * Builds Amazon-optimized prompts for each of the 7 image types matching strict 1600x1600 1:1 guidelines
 */
function buildAmazonPhotographyPrompt(productName, templateType = 'Main Product (Hero Shot)', customNotes = '') {
  const cleanName = String(productName || '').trim();
  const extra = customNotes ? ` Special client instructions: ${customNotes}.` : '';

  switch (templateType) {
    case 'Main Product (Hero Shot)':
    case 'Main Product':
    case '1. Clean White Hero Shot':
      return `Create a premium Amazon MAIN PRODUCT IMAGE for '${cleanName}'.
IMAGE SIZE: Exact 1600 × 1600 pixels resolution with a 1:1 square aspect ratio.
PRODUCT ACCURACY: The product '${cleanName}' must remain 100% authentic with exact packaging, shape, bottle, jar, box, cap, brand logo, label, typography, colors and proportions. Do not alter packaging or add extra products.
COMPOSITION: Place the complete product naturally in the center of the square canvas, occupying 75–85% of image height with balanced white margins. Do not crop any part. Product faces camera naturally and is clearly readable.
BACKGROUND: Pure clean seamless white background (#FFFFFF). No colored background, no props, no lifestyle items, no decorative objects.
LIGHTING & STYLE: Professional studio lighting, bright clean illumination, soft subtle grounding contact shadow beneath product. Photorealistic, ultra-sharp, high resolution, realistic textures and reflections, clean commercial catalog photography. No people, no hands, no watermarks, no claims.${extra}`;

    case 'Benefits & Features Infographic':
    case '2. Key Benefits Infographic':
      return `Create a premium AMAZON PRODUCT BENEFITS INFOGRAPHIC for '${cleanName}'.
IMAGE SIZE: Exact 1600 × 1600 pixels, 1:1 square aspect ratio. All text and elements completely inside square canvas.
PRODUCT ACCURACY: Keep '${cleanName}' completely unchanged, authentic logo, label, shape, typography and colors.
LAYOUT: Clean premium infographic with '${cleanName}' prominently positioned in center or slightly right. Around the product, present 4–6 key wellness benefits relevant to '${cleanName}', each with a clean minimal icon, short headline, and one-line supporting description (e.g., 'Deep Nourishment', 'Supports Vitality', 'Pure Ayurvedic Extract', '100% Natural Formula', 'Gentle Care').
DESIGN & BACKGROUND: Premium modern wellness/beauty e-commerce infographic, clean typography, strong visual hierarchy, mobile-friendly readability, subtle premium background complementing product.${extra}`;

    case 'Lifestyle & In-Use with Model':
    case 'Lifestyle':
    case '3. Lifestyle Shot with Model':
      return `Create a premium lifestyle product photograph featuring '${cleanName}'.
IMAGE SIZE: Exact 1600 × 1600 pixels with a 1:1 square aspect ratio.
PRODUCT ACCURACY: Exact '${cleanName}' product packaging unchanged, authentic logo, label, packaging colors and proportions.
MODEL: Realistic attractive adult model appropriate for wellness/personal care category, natural skin texture, realistic facial proportions, relatable and confident expression, naturally holding and displaying '${cleanName}'.
SCENE & COMPOSITION: Premium serene lifestyle environment (morning wellness routine / aesthetic self-care setting). Balanced square framing, soft lifestyle lighting, natural highlights, realistic shadows, subtle depth of field.
STYLE: Luxury e-commerce lifestyle photography, photorealistic, high-end commercial advertising.${extra}`;

    case 'How to Use / Step-by-Step with Model':
    case 'How to Use':
    case '4. Step-by-Step Guide with Model':
      return `Create a premium HOW-TO-USE / USE CASE infographic for '${cleanName}'.
IMAGE SIZE: Exact 1600 × 1600 pixels with a 1:1 square aspect ratio. All steps and text fit inside square canvas.
PRODUCT ACCURACY: Strict product accuracy for '${cleanName}', authentic packaging, logo and proportions.
LAYOUT: 3–4 simple numbered usage steps (Step 1 Prepare, Step 2 Apply / Use, Step 3 Follow Technique, Step 4 Finish). Each step contains number indicator, visual demonstration by model, and short explanatory text.
DESIGN: Premium Amazon infographic, clean, compact, mobile-friendly typography, strong visual hierarchy, clean premium background, clearly separated steps.${extra}`;

    case 'YogKart vs Other Brands (Comparison)':
    case 'Comparison':
    case '5. YogKart vs Other Brands':
    case '5. YogKart vs Other Brands (Pros & Cons)':
      return `Create a premium PRODUCT COMPARISON INFOGRAPHIC featuring '${cleanName}'.
IMAGE SIZE: Exact 1600 × 1600 pixels, 1:1 square aspect ratio.
LAYOUT: Balanced split-screen composition.
LEFT SIDE: Headline 'OUR PRODUCT' featuring '${cleanName}' prominently with green checkmarks (100% Pure Ayurvedic Organic, Zero Harmful Chemicals, Premium Quality, Lab Tested).
RIGHT SIDE: Headline 'OTHER / TYPICAL ALTERNATIVE' showing generic unbranded product with red cross marks (Synthetic Fillers, Harsh Chemicals, Cheap Plastic Packaging).
DESIGN: 4–6 meaningful comparison points, clean checkmarks, professional modern Amazon infographic aesthetic, informative, premium and credible.${extra}`;

    case 'Ayurvedic Ingredients Deep Dive':
    case 'Ingredients':
    case '6. Raw Ingredients & Health Benefits':
    case "Ingredients / What's Inside Infographic":
      return `Create a premium INGREDIENTS / WHAT'S INSIDE infographic for '${cleanName}'.
IMAGE SIZE: Exact 1600 × 1600 pixels with a 1:1 square aspect ratio.
PRODUCT ACCURACY: Exact '${cleanName}' product in center with unchanged packaging, logo and colors.
COMPOSITION: '${cleanName}' placed prominently in center, surrounded by realistic whole raw botanicals, fresh Ayurvedic herbs, roots, pure extracts in a balanced structured layout. Each ingredient with realistic visual representation, ingredient name, and short factual benefit statement.
DESIGN: Premium clean beauty/wellness infographic, realistic ingredient photography, minimal clutter, clear typography, professional e-commerce presentation.${extra}`;

    case 'Packaging & Trust Guarantee':
    case 'Trust & Certifications':
    case '7. Trust, Certifications & Eco-Packaging':
    case 'Real-Life Product Usage':
    case '7. Real-Life Product Usage':
      return `Create a premium REAL-LIFE PRODUCT USAGE photograph using '${cleanName}'.
IMAGE SIZE: Exact 1600 × 1600 pixels with a 1:1 square aspect ratio.
PRODUCT ACCURACY: '${cleanName}' packaging 100% authentic and clearly recognizable in model's hand or in scene.
MODEL & USAGE: Realistic adult model actively USING the product with natural hand movements and correct anatomy. Demonstrates natural daily application technique communicating 'THIS IS HOW I USE THIS PRODUCT'.
SCENE & LIGHTING: Premium clean lifestyle environment, soft commercial lighting, realistic skin texture and natural highlights.
STYLE: Luxury e-commerce lifestyle photography, photorealistic, high-end commercial product advertising.${extra}`;

    default:
      return `Create a premium commercial Amazon product photography of '${cleanName}'.
IMAGE SIZE: Exact 1600 × 1600 pixels, 1:1 square format.
PRODUCT ACCURACY: '${cleanName}' with exact authentic packaging, logo and colors.
BACKGROUND: Pure seamless studio background, high-end commercial studio lighting, ultra-sharp 8k resolution, photorealistic.${extra}`;
  }
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
