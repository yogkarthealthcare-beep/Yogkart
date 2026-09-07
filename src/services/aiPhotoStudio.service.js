const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { STORAGE_ROOT_DIR } = require('../config/storage');
const { resolveGeminiApiKey } = require('./gemini.service');

const BRAND_LOGO_PATH = path.resolve(__dirname, '../assets/brand_logo.png');

/**
 * Standard Amazon 7-Set Listing Image Configurations
 */
const AMAZON_7_TEMPLATES = [
  {
    id: 1,
    type: 'Main Product Image',
    title: 'Image 1 – Main Product Image',
    description: '1:1 square composition, 1600x1600, pure white background (#FFFFFF), centered product occupying 80–85% frame, professional studio lighting, subtle natural contact shadow, sharp details, zero props/people/badges.'
  },
  {
    id: 2,
    type: 'Comparison',
    title: 'Image 2 – Comparison',
    description: 'Dynamic side-by-side comparison: selected YogKart product (green checkmarks) vs generic/basic alternative (red crosses). Relevant product characteristics, clean ecommerce infographic, concise text.'
  },
  {
    id: 3,
    type: 'Use Cases',
    title: 'Image 3 – Use Cases',
    description: 'Professional Amazon infographic showing 3–5 realistic everyday use cases and applications based on product category. Product clearly visible in natural use contexts.'
  },
  {
    id: 4,
    type: 'Lifestyle / Model',
    title: 'Image 4 – Lifestyle / Model',
    description: 'Photorealistic adult model naturally using the product in category-matched environment (gym, vanity/bathroom, home) with authentic lighting, or premium lifestyle scene.'
  },
  {
    id: 5,
    type: 'Product Features',
    title: 'Image 5 – Product Features',
    description: 'Professional ecommerce infographic with product close-ups, callout lines, and feature labels based only on verified product characteristics.'
  },
  {
    id: 6,
    type: 'Benefits / Customer Experience',
    title: 'Image 6 – Benefits / Customer Experience',
    description: 'Practical customer benefits (comfort, convenience, portability, durability) presented in a premium ecommerce infographic without exaggerated claims.'
  },
  {
    id: 7,
    type: 'Premium Brand Image',
    title: 'Image 7 – Premium Brand Image',
    description: 'High-end commercial brand hero shot with YogKart branding, category-matched atmosphere, dramatic studio lighting, and pristine composition.'
  }
];

/**
 * Analyzes product context dynamically to determine domain characteristics
 */
function analyzeProductContext(name = '', desc = '', categoryName = '') {
  const combined = `${name} ${categoryName} ${desc}`.toLowerCase();

  const isFitness = /\b(gym|workout|glove|gloves|weightlifting|fitness|sport|sports|exercise|dumbbell|barbell|strap|belt|wrist|shaker|sipper|activewear)\b/i.test(combined);
  const isHairOrSkin = /\b(comb|hair|shampoo|conditioner|oil|scalp|neem comb|serum|cream|facewash|face wash|lotion|skin|face|cleanser|soap|scrub|beauty|cosmetic|aloe vera|sunscreen)\b/i.test(combined);
  const isHomeOrStorage = /\b(storage|box|organizer|kitchen|home|office|holder|rack|bag|container|bottle|towel|decor|closet|shelf)\b/i.test(combined);
  const isHerbalOrSupplement = /\b(chyawanprash|ayurvedic|herbal|tablet|capsule|syrup|juice|churna|ashwagandha|shilajit|amla|tulsi|supplement|nutrition|ghee|triphala|neem)\b/i.test(combined);

  return { isFitness, isHairOrSkin, isHomeOrStorage, isHerbalOrSupplement, rawText: combined };
}

/**
 * Builds the Dynamic Amazon Product Photography Prompt matching the official YogKart guidelines
 */
function buildAmazonPhotographyPrompt(productName, templateType = 'Main Product Image', customNotes = '', productData = null) {
  const cleanName = String(productName || '').trim();
  const extra = customNotes ? ` Additional instructions: ${customNotes}.` : '';

  const desc = productData?.description || '';
  const catName = productData?.category_name || productData?.category || '';
  const context = analyzeProductContext(cleanName, desc, catName);

  const basePrompt = `You are an expert Amazon ecommerce product photographer and product listing designer.

Create a professional Amazon India product listing image for the following product:

PRODUCT NAME:
${cleanName}

BRAND:
YogKart

BRAND LOGO:
Use the existing configured YogKart logo automatically.

Analyze the product name and available product information and determine the most appropriate visual concept for this image.

Do not ask the user to provide additional product information unless absolutely necessary.

The image must be photorealistic, hyper-realistic and professionally photographed.

Do not make the result look like a generic AI-generated image.

Maintain the exact product identity and create a commercially realistic ecommerce image.`;

  const normalized = String(templateType || '').toLowerCase();
  let typeSpecificSection = '';

  // 1️⃣ IMAGE TYPE 1 — MAIN PRODUCT IMAGE
  if (normalized.includes('main') || normalized.includes('white') || normalized.includes('hero') || normalized.startsWith('1')) {
    typeSpecificSection = `
IMAGE TYPE 1 — MAIN PRODUCT IMAGE:
Create the primary Amazon product image.
Requirements:
* 1:1 square composition
* Target resolution: 1600 × 1600 pixels
* Pure white background (#FFFFFF)
* Product clearly visible and centered
* Product should occupy an appropriate majority of the frame (80–85% frame height)
* Professional studio photography
* Realistic lighting with very subtle natural contact shadow directly underneath
* Sharp product details and accurate physical textures
* No unnecessary props
* No people unless essential to the product
* No promotional graphics, No unnecessary text, No badges, No price, No discount, No ratings, No fake claims
* The product must be the only primary visual focus. Follow Amazon-style primary product image requirements.`;
  }
  // 2️⃣ IMAGE TYPE 2 — COMPARISON
  else if (normalized.includes('comparison') || normalized.includes('vs') || normalized.startsWith('2')) {
    let compExample = '';
    if (context.isFitness) {
      compExample = 'Compare the selected YogKart gym/fitness product (ergonomic padding, breathable non-slip grip, reinforced stitching, durable quality with green checkmarks) vs Ordinary basic workout equipment (thin padding, slippery, easily worn out, basic unbranded with red crosses).';
    } else if (context.isHairOrSkin) {
      compExample = 'Compare the selected YogKart product (e.g. pure authentic craftsmanship, smooth anti-static teeth/pure natural extracts, gentle on hair/skin, eco-friendly with green checkmarks) vs Ordinary generic plastic/synthetic alternative (harsh static, rough finish, synthetic chemicals with red crosses).';
    } else if (context.isHomeOrStorage) {
      compExample = 'Compare the selected YogKart organized solution (durable high-grade material, space-saving design, neat organization with green checkmarks) vs Ordinary disorganized clutter/weak alternative (cluttered, easily deformed, fragile with red crosses).';
    } else if (context.isHerbalOrSupplement) {
      compExample = `Compare the selected YogKart product '${cleanName}' (100% pure authentic Ayurvedic ingredients, lab tested purity, no harmful chemicals with green checkmarks) vs Ordinary basic generic alternative (artificial fillers, low active potency, synthetic preservatives with red crosses).`;
    } else {
      compExample = `Compare the selected YogKart product '${cleanName}' (premium quality, authentic materials, superior durability and finish with green checkmarks) vs Ordinary generic basic alternative (substandard materials, basic packaging, weak durability with red crosses).`;
    }

    typeSpecificSection = `
IMAGE TYPE 2 — COMPARISON:
Automatically analyze the selected product and create the most meaningful comparison.
Do NOT use competitor brands.
Compare the selected YogKart product against a generic/basic alternative.
The comparison must be relevant to the actual product.
${compExample}
Do not force an irrelevant comparison.
Use only accurate product characteristics.
Create a professional ecommerce infographic with a clean side-by-side comparison matrix, concise text labels, and clear green checkmark vs red cross visual cues. Do not invent specifications.`;
  }
  // 3️⃣ IMAGE TYPE 3 — USE CASES
  else if (normalized.includes('use case') || normalized.includes('use_case') || normalized.startsWith('3')) {
    let useCasesList = '';
    if (context.isFitness) {
      useCasesList = '1. Gym & Heavy Lifting, 2. Home Workouts & Dumbbells, 3. Cross-Training & Pull-ups, 4. Daily Fitness Routine';
    } else if (context.isHairOrSkin) {
      useCasesList = '1. Daily Hair Grooming & Styling, 2. Scalp Care Routine & Detangling, 3. Relaxing Head Massage, 4. Travel & On-the-Go Care';
    } else if (context.isHomeOrStorage) {
      useCasesList = '1. Home Organization, 2. Office & Desk Setup, 3. Closet & Wardrobe Storage, 4. Everyday Household Utility';
    } else if (context.isHerbalOrSupplement) {
      useCasesList = '1. Daily Morning Vitality Routine, 2. Post-Workout Wellness, 3. Evening Relaxation, 4. Daily Family Nutrition';
    } else {
      useCasesList = '3 to 5 realistic everyday use scenarios and applications suited to this product category';
    }

    typeSpecificSection = `
IMAGE TYPE 3 — USE CASES:
Automatically determine the most relevant use cases from the selected product name and available product information.
Create a professional Amazon infographic/lifestyle composition showing 3–5 realistic use cases:
Relevant Use Cases: ${useCasesList}.
Do not show irrelevant use cases.
The product must remain clearly visible in each application vignette with minimal, elegant caption badges.`;
  }
  // 4️⃣ IMAGE TYPE 4 — LIFESTYLE / MODEL
  else if (normalized.includes('lifestyle') || normalized.includes('model') || normalized.startsWith('4')) {
    let envDesc = '';
    if (context.isFitness) {
      envDesc = 'Professional modern gym environment with authentic workout equipment in background, soft commercial gym lighting.';
    } else if (context.isHairOrSkin) {
      envDesc = 'Clean, modern, bright bathroom / vanity setting with soft morning natural light.';
    } else if (context.isHomeOrStorage) {
      envDesc = 'Realistic modern home or organized office interior environment showing the product conveniently in place.';
    } else {
      envDesc = 'Appropriate, premium lifestyle environment tailored to this product category.';
    }

    typeSpecificSection = `
IMAGE TYPE 4 — LIFESTYLE / MODEL:
Automatically determine whether the product is appropriate for human/model usage.
If yes:
* Create a photorealistic adult model using the selected YogKart product correctly.
* Environment: ${envDesc}
* The product must remain clearly visible and in sharp focus.
* Use realistic skin texture, natural hands and anatomically correct fingers, realistic body proportions, natural lighting and shadows.
If the product does not require a human model, create a premium lifestyle product scene in a pristine realistic setting.`;
  }
  // 5️⃣ IMAGE TYPE 5 — PRODUCT FEATURES
  else if (normalized.includes('feature') || normalized.startsWith('5')) {
    typeSpecificSection = `
IMAGE TYPE 5 — PRODUCT FEATURES:
Automatically analyze the selected product.
Highlight only the features that are visible in the product/reference information or explicitly available in the product data.
Create a professional infographic with:
* High-detail product close-ups / macro angles
* Clean callout lines
* Feature labels with minimal supporting text
Do NOT invent: Material, Dimensions, Technology, Certifications, Specifications, Performance claims.`;
  }
  // 6️⃣ IMAGE TYPE 6 — BENEFITS / CUSTOMER EXPERIENCE
  else if (normalized.includes('benefit') || normalized.includes('experience') || normalized.startsWith('6')) {
    typeSpecificSection = `
IMAGE TYPE 6 — BENEFITS / CUSTOMER EXPERIENCE:
Automatically determine the most relevant practical benefits of the selected product (such as convenience, comfortable usage, easy handling, durability, portability, everyday usability).
Benefits must be realistic and supported by the product.
Do not make: Medical claims, Guaranteed results, Unrealistic performance claims, Exaggerated claims.
Create a premium ecommerce infographic/lifestyle image with clean benefit icons and concise headlines.`;
  }
  // 7️⃣ IMAGE TYPE 7 — PREMIUM BRAND IMAGE
  else {
    typeSpecificSection = `
IMAGE TYPE 7 — PREMIUM YOGKART BRAND IMAGE:
Create a premium commercial product image.
Automatically:
* Use the selected product as the primary visual hero
* Use the existing YogKart logo
* Choose a suitable premium commercial environment based on the product category
* Create professional commercial advertising lighting and reflection
* Create premium composition keeping the product as the main focus
The YogKart logo must be used exactly as provided. Do not redesign, distort, replace, or generate a fake logo.`;
  }

  const qualitySection = `
HYPER-REALISTIC & QUALITY REQUIREMENTS:
* 1:1 Square Composition, Target 1600 × 1600 pixels.
* Real professional commercial product photoshoot created by an experienced Amazon ecommerce photographer and graphic designer.
* Photorealistic textures, realistic materials, natural lighting, natural shadows, correct perspective, realistic depth, accurate proportions, realistic hands and fingers.
* STRICT NEGATIVES: Avoid AI-looking skin, plastic-looking objects, unrealistic hands, extra fingers, deformed products, floating objects, impossible shadows, fake reflections, oversaturated colors, cartoon style, 3D-rendered anime appearance.${extra}`;

  return `${basePrompt}\n${typeSpecificSection}\n${qualitySection}`.trim();
}

/**
 * Overlays official YogKart Brand Logo on the bottom-right corner using Sharp at 1600x1600
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

  // Save as high-quality WebP at quality: 98 (yielding ~700KB to 1.8MB uncompressed sharp resolution)
  return await canvas
    .webp({ quality: 98, effort: 5 })
    .toBuffer();
}

/**
 * Fetches AI image buffer using Google Gemini / Imagen 3 API if key provided, with Flux-Realism fallback
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

  // 2. High-res Photorealistic Engine (Flux-Realism -> Flux -> Turbo fallback)
  // Notice: We strictly omit enhance=true to prevent cartoon/anime hallucination
  const encodedPrompt = encodeURIComponent(prompt.trim());
  const seed = Math.floor(Math.random() * 10000000);

  const models = ['flux-realism', 'flux', 'turbo'];

  for (const model of models) {
    try {
      console.log(`⚡ [AI Studio] Generating from scratch via Pollinations AI (${model})...`);
      const modelParam = `&model=${model}`;
      const aiUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1600&height=1600&seed=${seed}&nologo=true${modelParam}`;

      const res = await fetch(aiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/*'
        },
        signal: AbortSignal.timeout(35000)
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
async function generateProductAiPhoto({ productName, productData = null, templateType = 'Main Product Image', customPrompt = '', geminiApiKey = null }) {
  if (!productName || !productName.trim()) {
    throw new Error('Product Name is required');
  }

  console.log(`🎨 [AI Studio] Generating dynamic Amazon image for '${productName}' [${templateType}]...`);

  // Build dynamic prompt matching official Amazon specification
  const prompt = buildAmazonPhotographyPrompt(productName, templateType, customPrompt, productData);

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
    prompt,
    size: '1600x1600'
  };
}

/**
 * Bulk / Set AI Photo Generation (Generates all 7 Amazon images from scratch)
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
        filename: result.filename,
        prompt: result.prompt
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
  buildAmazonPhotographyPrompt,
  generateProductAiPhoto,
  generateAmazon7ImageSet
};


