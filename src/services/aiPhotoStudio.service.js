const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { STORAGE_ROOT_DIR } = require('../config/storage');
const { resolveGeminiApiKey } = require('./gemini.service');

const BRAND_LOGO_PATH = path.resolve(__dirname, '../assets/brand_logo.png');

/**
 * Amazon 7-Set Standard Template Configurations
 */
/**
 * Amazon 7-Set Standard Template Configurations
 */
const AMAZON_7_TEMPLATES = [
  {
    id: 1,
    type: 'Main Product Image — White Background',
    title: '1. Main Product Image — White Background',
    description: 'Pure clean white background (#FFFFFF), centered product occupying 75–85% frame height, soft grounding shadow, 1600x1600 1:1 square ratio Amazon hero standard.'
  },
  {
    id: 2,
    type: 'Product Benefits / Key Benefits',
    title: '2. Product Benefits / Key Benefits',
    description: 'Sophisticated infographic layout with centered/right product, 4–6 key product benefits with clean icons, clear visual hierarchy, Amazon-compliant claims.'
  },
  {
    id: 3,
    type: 'Model / Lifestyle Image',
    title: '3. Model / Lifestyle Image',
    description: 'Natural, relatable adult model in a premium everyday lifestyle environment holding or displaying the product with soft commercial lighting.'
  },
  {
    id: 4,
    type: 'How to Use / Use Cases',
    title: '4. How to Use / Use Cases',
    description: 'Structured 3–4 step visual application guide (Step 1 Prepare, Step 2 Apply/Use, Step 3 Massage/Technique, Step 4 Finish) with numbered steps and mobile readability.'
  },
  {
    id: 5,
    type: 'Our Product vs Other Product / Comparison',
    title: '5. Our Product vs Other Product / Comparison',
    description: 'Side-by-side comparison matrix: Our Product (prominent packaging with green checkmarks) vs Other Alternative (generic unbranded package with red crosses).'
  },
  {
    id: 6,
    type: 'Ingredients / What’s Inside',
    title: '6. Ingredients / What’s Inside',
    description: 'Centered product surrounded by realistic fresh raw botanical ingredient visuals, clear ingredient names, and short functional benefit statements.'
  },
  {
    id: 7,
    type: 'Model Actually Using the Product — Demonstration',
    title: '7. Model Actually Using the Product — Demonstration',
    description: 'Real-life product usage demonstration photograph showing a realistic adult model actively and correctly applying/using the product with natural anatomy.'
  }
];

/**
 * Helper to detect category characteristics and color for prompt tailoring
 */
function detectProductCategory(name = '', desc = '') {
  const combined = `${name} ${desc}`.toLowerCase();
  
  const isApparel = /\b(t-?shirt|shirt|pant|pants|trousers|jeans|hoodie|jacket|sweatshirt|jersey|tracksuit|shorts|activewear|sportswear|gym wear|cloth|clothing|garment|fabric|vest|kurta|saree|dress|shoes|sneakers|cap|hat|socks)\b/i.test(combined);
  
  const isSupplementOrHerbal = /\b(powder|tablet|tablets|capsule|capsules|syrup|oil|juice|churna|ras|extract|drops|ghee|herbal|ayurvedic|supplement|calcium|ashwagandha|shilajit|amla|triphala|neem|tulsi)\b/i.test(combined);
  
  const isCosmeticOrBeauty = /\b(cream|lotion|serum|facewash|face wash|scrub|shampoo|conditioner|soap|gel|cleanser|sunscreen|moisturizer|lip balm)\b/i.test(combined);

  // Extract primary color if mentioned
  let color = '';
  const colorMatch = combined.match(/\b(royal blue|navy blue|sky blue|blue|black|white|red|crimson|maroon|green|emerald|olive|yellow|gold|grey|gray|charcoal|orange|purple|pink|brown|beige|cream)\b/i);
  if (colorMatch) {
    color = colorMatch[1];
  } else if (isApparel) {
    color = 'royal blue'; // default sports color if unspecified
  }

  return { isApparel, isSupplementOrHerbal, isCosmeticOrBeauty, color };
}

/**
 * Builds Amazon-optimized prompts matching the exact 7-image listing specification
 */
function buildAmazonPhotographyPrompt(productName, templateType = 'Main Product Image — White Background', customNotes = '', productData = null) {
  const cleanName = String(productName || '').trim();
  const extra = customNotes ? ` Additional instructions: ${customNotes}.` : '';

  // Extract description, ingredients, benefits from productData if available
  const desc = productData?.description || '';
  const category = detectProductCategory(cleanName, desc);

  let ingredientsText = '';
  if (productData?.ingredients_list) {
    ingredientsText = Array.isArray(productData.ingredients_list)
      ? productData.ingredients_list.join(', ')
      : String(productData.ingredients_list);
  }

  let benefitsText = '';
  if (productData?.key_benefits) {
    benefitsText = Array.isArray(productData.key_benefits)
      ? productData.key_benefits.join(', ')
      : String(productData.key_benefits);
  }

  const normalized = String(templateType || '').toLowerCase();

  // ─────────────────────────────────────────────────────────────
  // 1️⃣ MAIN PRODUCT IMAGE — WHITE BACKGROUND
  // ─────────────────────────────────────────────────────────────
  if (normalized.includes('white') || normalized.includes('hero') || normalized.startsWith('1')) {
    if (category.isApparel) {
      const colorText = category.color ? `${category.color}` : 'royal blue';
      return `Amazon Hero catalog product photography of '${cleanName}' by YogKart.
PRODUCT PRESENTATION — GHOST MANNEQUIN DISPLAY:
* 3D invisible ghost mannequin display of the exact ${colorText} sports t-shirt / athletic garment standing upright and centered in the frame.
* The clothing item is displayed hollow at the collar and sleeves with natural 3D volume, perfect ghost mannequin effect.
* Crisp round crew neck collar, athletic short sleeves, modern tapered sportswear fit.
* Clean authentic white 'YogKart' logo and leaf emblem printed sharply on the left chest.
* Premium quick-dry breathable performance sports fabric texture with realistic micro-mesh perforations and detailed stitching.
COMPOSITION & BACKGROUND:
* Placed standing upright in the exact center of the frame occupying 78–85% image height.
* Pure clean seamless solid white background (#FFFFFF).
* Soft, realistic, delicate oval contact drop shadow directly on the white floor underneath the garment.
* Bright professional commercial studio lighting with crisp highlights and even illumination.
NEGATIVE PROMPT / STRICT EXCLUSIONS:
* STRICTLY NO human body, NO human skin, NO human model, NO headless human torso, NO human neck, NO arms, NO legs, NO mannequin stand.
* Only the standalone 3D garment itself on pure white background (#FFFFFF).
* 1600x1600 square ratio, 8k resolution, photorealistic commercial product catalog standard.${extra}`;
    }

    return `Create a premium Amazon-compliant MAIN PRODUCT IMAGE for '${cleanName}' by YogKart.
PRODUCT:
Use the EXACT product packaging, container/box, and proportions for '${cleanName}' by YogKart.
STRICT PRODUCT ACCURACY:
* Use the exact same product, packaging, bottle/jar/tube/box, cap and proportions.
* Do NOT redesign the packaging.
* Do NOT change the product shape, size, logo, brand name 'YogKart', label, typography, colors or graphics.
* All visible product text must remain accurate and undistorted.
* Do not add any extra products.
COMPOSITION:
* Place the product standing naturally in the center of the frame.
* Product should occupy approximately 75–85% of the image height while maintaining comfortable margins.
* Show the complete product clearly from the front.
* Maintain realistic premium commercial product photography.
BACKGROUND:
* Pure clean white background (#FFFFFF).
* No colored background. No lifestyle environment. No decorative elements.
LIGHTING:
* Bright professional studio lighting. Soft natural-looking illumination.
* Very subtle realistic grounding shadow directly underneath/behind the product.
* Shadow must be light and elegant, never dramatic.
STYLE:
* Premium Amazon e-commerce product photography.
* Ultra-clean, sharp, realistic, 8k high resolution.
* Accurate materials, reflections and textures. No excessive glow, no artificial effects.
IMPORTANT:
This is the PRIMARY Amazon product image. Keep the image simple and product-focused.
No people, no props, no badges, no promotional text, no icons, no claims, no additional objects.${extra}`;
  }

  // ─────────────────────────────────────────────────────────────
  // 2️⃣ PRODUCT BENEFITS / KEY BENEFITS INFOGRAPHIC
  // ─────────────────────────────────────────────────────────────
  if (normalized.includes('benefit') || normalized.startsWith('2')) {
    if (category.isApparel) {
      return `Amazon PRODUCT BENEFITS INFOGRAPHIC for YogKart '${cleanName}'.
LAYOUT:
* Centered/right 3D ghost mannequin ${category.color || 'royal blue'} sports t-shirt with YogKart logo on chest.
* 4–6 key technical fabric benefits arranged neatly with clean modern infographic icons:
  1. 'Quick-Dry Breathable Fabric' (Accelerated moisture evaporation)
  2. '4-Way Stretch Flexibility' (Unrestricted athletic motion)
  3. 'Anti-Odor & Anti-Bacterial' (Stay fresh through intense workouts)
  4. 'Sweat-Wicking Technology' (Draws moisture away from skin)
  5. 'Ultra-Lightweight & Durable' (Featherlight comfort with reinforced seams)
* Clean minimalist typography, professional sports e-commerce aesthetic, soft studio background.${extra}`;
    }

    const benefitBullets = benefitsText
      ? `Highlighted verified benefits: ${benefitsText}`
      : `Short, clear benefit statements such as 'Deep Hydration', 'Helps Nourish Skin', 'Supports Healthy-Looking Skin', 'Lightweight & Easy to Use', 'Suitable for Daily Use'`;

    return `Create a premium Amazon PRODUCT BENEFITS INFOGRAPHIC for '${cleanName}' by YogKart.
PRODUCT:
Use the EXACT product packaging for '${cleanName}' by YogKart.
The product packaging must remain completely unchanged.
STRICT PRODUCT ACCURACY:
Do not modify the product bottle/jar/tube/box, logo, label, typography, colors, proportions or packaging design.
LAYOUT:
Create a sophisticated premium infographic with:
* The exact product prominently positioned in the center/right.
* Clean visual hierarchy.
* 4–6 key product benefits arranged around the product.
* Each benefit should have a simple elegant supporting icon or visual element.
* Keep enough negative space so the image does not look crowded.
BENEFIT CONTENT:
* ${benefitBullets}.
* Use only benefits that are genuinely appropriate for the specific product.
* Do NOT invent medical claims.
* Do NOT make disease-treatment, cure, guaranteed-result or exaggerated claims.
TEXT STYLE:
Short, clear, Amazon-friendly benefit statements.
DESIGN:
* Premium modern e-commerce infographic, clean typography, professional wellness/beauty brand aesthetic.
* Balanced spacing, visually appealing but not overcrowded.
BACKGROUND:
Use a clean premium background that complements the product category while keeping the product highly visible.${extra}`;
  }

  // ─────────────────────────────────────────────────────────────
  // 3️⃣ MODEL / LIFESTYLE IMAGE
  // ─────────────────────────────────────────────────────────────
  if ((normalized.includes('lifestyle') && !normalized.includes('demonstration') && !normalized.includes('using')) || normalized.startsWith('3')) {
    if (category.isApparel) {
      return `Luxury lifestyle advertising photography for YogKart '${cleanName}'.
MODEL & SCENE:
* An attractive, fit, athletic adult model naturally wearing the exact ${category.color || 'royal blue'} YogKart sports t-shirt with YogKart logo on chest.
* Setting: Modern sunlit fitness studio / aesthetic gym or scenic outdoor morning track.
* Model in a relaxed, confident posture showing the natural fit, drape, and stylish athletic look of the t-shirt.
* Natural skin texture, realistic athletic body proportions, authentic lighting.
COMPOSITION & LIGHTING:
* Commercial advertising photography, soft morning sunlight, shallow depth-of-field.
* High-end Amazon brand presentation, 8k resolution, photorealistic.${extra}`;
    }

    return `Create a premium lifestyle product image featuring '${cleanName}' by YogKart.
PRODUCT ACCURACY — CRITICAL:
* Use the exact product packaging, bottle/jar/tube/box, cap, and label for '${cleanName}' by YogKart.
* Do not redesign, recolor, resize unnaturally, replace or modify the packaging.
* Keep the logo, label, product shape, cap and branding accurate and clearly visible.
MODEL:
* Show an attractive, natural-looking adult model appropriate for the product category.
* The model should look realistic, healthy and relatable.
* Use natural skin texture and realistic facial/body proportions.
* Avoid overly retouched or artificial-looking skin.
SCENE:
* Create a premium lifestyle environment relevant to the product communicating natural everyday wellness.
* The model should naturally hold, display or interact with the product depending on its category.
* The product must remain clearly visible and recognizable.
COMPOSITION & LIGHTING:
* Premium commercial advertising photography, natural pose, elegant composition.
* Soft professional studio/lifestyle lighting, natural highlights, realistic shadows, subtle depth-of-field.
* Clean, sophisticated environment, no unnecessary objects, no unrelated products, no exaggerated claims.${extra}`;
  }

  // ─────────────────────────────────────────────────────────────
  // 4️⃣ HOW TO USE / USE CASES INFOGRAPHIC
  // ─────────────────────────────────────────────────────────────
  if (normalized.includes('how to use') || normalized.includes('step') || normalized.startsWith('4')) {
    if (category.isApparel) {
      return `Amazon USE CASES & PERFORMANCE GUIDE infographic for YogKart '${cleanName}'.
LAYOUT:
* 4 clearly separated use-case activity panels with clean numbered badges:
  - Step 1 / Use 1 — 'Gym & Strength Training' (High-intensity lifting, zero restriction)
  - Step 2 / Use 2 — 'Running & Cardio' (Maximum airflow & sweat-wicking cooling)
  - Step 3 / Use 3 — 'Yoga & Sports' (4-way stretch flexibility for all movements)
  - Step 4 / Use 4 — 'Daily Active Casual Wear' (All-day breathable comfort & stylish fit)
* Each panel includes a sharp visual icon and short explanatory text.
* Clean modern Amazon infographic layout, high readability on mobile screens.${extra}`;
    }

    return `Create a premium HOW-TO-USE / USE CASE infographic for '${cleanName}' by YogKart.
PRODUCT:
Use the exact product packaging for '${cleanName}' by YogKart.
Packaging, logo, label, shape, colors and proportions must remain unchanged.
OBJECTIVE:
Visually explain how the customer should use the product in a simple step-by-step format:
* Step 1 — Prepare: Show the appropriate preparation before using the product.
* Step 2 — Apply / Use: Show the correct way to use or dispense the product.
* Step 3 — Massage / Action: Show the appropriate motion or usage technique depending on the product.
* Step 4 — Finish: Show the final recommended action after use, if applicable.
Each step includes clear visual demonstration, small numbered indicator, very short explanatory text, and clean supporting icons.
DESIGN:
* Premium Amazon infographic, clean, compact and easy to understand, professional wellness aesthetic, high readability on mobile screens.${extra}`;
  }

  // ─────────────────────────────────────────────────────────────
  // 5️⃣ OUR PRODUCT VS OTHER PRODUCT / COMPARISON
  // ─────────────────────────────────────────────────────────────
  if (normalized.includes('vs') || normalized.includes('comparison') || normalized.startsWith('5')) {
    if (category.isApparel) {
      return `Amazon PRODUCT COMPARISON infographic for YogKart '${cleanName}'.
LAYOUT:
* Side-by-side comparison split layout:
  - LEFT SIDE ("YOGKART SPORTS"): Show exact ${category.color || 'royal blue'} YogKart t-shirt with green checkmarks (Premium Quick-Dry Micro-Poly, 4-Way Stretch, Reinforced Anti-Chafe Stitching, Color-Fast Non-Fading, Breathable Mesh Cooling).
  - RIGHT SIDE ("GENERIC ACTIVEWEAR"): Show a generic dull gray unbranded t-shirt with red crosses (Traps Sweat & Odor, Stiff Non-Stretch Fabric, Weak Seams That Tear, Shrinks & Fades After Wash).
* Clear comparison chart matrix, professional typography, credible and Amazon-compliant, 8k resolution.${extra}`;
    }

    return `Create a premium PRODUCT COMPARISON infographic featuring '${cleanName}' by YogKart.
PRODUCT:
Use the exact product packaging for '${cleanName}' by YogKart on the "OUR PRODUCT" side.
Do not alter its packaging, logo, label, shape, colors or proportions.
LAYOUT:
Create a clean side-by-side comparison:
LEFT ("OUR PRODUCT"):
* Show the exact YogKart '${cleanName}' product prominently with green checkmarks (100% Pure & Natural, Authentic Ayurvedic Formulation, No Harmful Chemicals, Premium Quality Standard, Lab Tested & Safe, Transparent Ingredients).
RIGHT ("OTHER / TYPICAL ALTERNATIVE"):
* Represent a generic competing/alternative product using a completely GENERIC, unbranded package with red cross icons (Harsh Chemicals, Low Active Potency, Synthetic Fillers & Dyes, Artificial Fragrance).
COMPARISON:
Show 4–6 meaningful comparison points: Ingredient transparency, Convenient application, Packaging quality, Everyday usability, Product experience, Formulation approach.
DESIGN:
Premium modern Amazon comparison infographic, clean split layout, strong visual hierarchy, professional typography, photorealistic 8k resolution.${extra}`;
  }

  // ─────────────────────────────────────────────────────────────
  // 6️⃣ INGREDIENTS / MATERIALS / WHAT’S INSIDE
  // ─────────────────────────────────────────────────────────────
  if (normalized.includes('ingredient') || normalized.includes('inside') || normalized.startsWith('6')) {
    if (category.isApparel) {
      return `Amazon FABRIC & MATERIAL BREAKDOWN infographic for YogKart '${cleanName}'.
LAYOUT:
* Centered ${category.color || 'royal blue'} YogKart sports t-shirt with macro visual callouts of technical fabric materials:
  - '90% Performance Micro-Polyester' (Ultra-durable, quick-drying fibers)
  - '10% Spandex Elastane' (Dynamic 4-way elastic stretch)
  - 'Honeycomb Micro-Mesh Panels' (Targeted high-ventilation cooling zones)
  - 'Reinforced Flatlock Stitching' (Zero skin chafing, exceptional durability)
  - 'Eco-Friendly Safe Dyes' (Long-lasting vibrant color that never bleeds)
* Premium sportswear infographic layout, crisp macro fabric photography, clean modern typography.${extra}`;
    }

    const ingSection = ingredientsText
      ? `Specific product formulation ingredients: ${ingredientsText}`
      : `Botanical ingredients such as Aloe Vera ("Helps soothe and hydrate"), Vitamin E ("Antioxidant support"), Ayurvedic Extracts ("Deep nourishment & care"), Natural Botanicals ("Revitalizing properties")`;

    return `Create a premium INGREDIENTS / WHAT'S INSIDE infographic for '${cleanName}' by YogKart.
PRODUCT ACCURACY:
Use the exact product packaging for '${cleanName}' by YogKart.
Do not change the packaging, bottle/jar/tube, label, logo, colors, typography or proportions.
OBJECTIVE:
Clearly communicate the important ingredients contained in the product.
COMPOSITION:
* Place the exact product prominently in the center.
* Around the product, display visually appealing ingredient representations based on the actual ingredients:
  ${ingSection}.
FOR EVERY INGREDIENT:
* Show a realistic visual representation, add the ingredient name, and add one short, simple benefit statement.
DESIGN:
* Premium clean beauty/wellness infographic, realistic ingredient photography, elegant arrangement, minimal clutter, strong product visibility.${extra}`;
  }

  // ─────────────────────────────────────────────────────────────
  // 7️⃣ MODEL ACTUALLY USING THE PRODUCT — DEMONSTRATION
  // ─────────────────────────────────────────────────────────────
  if (normalized.includes('demonstration') || normalized.includes('using') || normalized.includes('trust') || normalized.startsWith('7')) {
    if (category.isApparel) {
      return `Commercial real-life sports action photography for YogKart '${cleanName}'.
MODEL & REAL-LIFE ACTION:
* A fit, athletic adult model actively engaged in real workout action (e.g. running on a track or performing dynamic athletic training) wearing the exact ${category.color || 'royal blue'} YogKart sports t-shirt.
* The white YogKart logo is clearly visible on the chest.
* The photograph highlights how the t-shirt performs in real-life: athletic fit, breathable comfort, and unrestricted mobility.
* Natural athletic motion, natural skin texture, realistic sweat-wicking performance look.
STYLE & LIGHTING:
* High-end sports brand commercial advertising photography (Nike/Adidas standard).
* Soft commercial lighting, shallow depth-of-field, 8k resolution, photorealistic.${extra}`;
    }

    return `Create a premium REAL-LIFE PRODUCT USAGE photograph using '${cleanName}' by YogKart.
PRODUCT:
Use the exact product packaging for '${cleanName}' by YogKart.
Packaging must remain completely unchanged.
Do not alter the product shape, logo, label, colors, cap, typography or proportions.
MODEL & USAGE:
* Show a realistic adult model actually USING the product correctly.
* The model should naturally demonstrate the application/use of the product.
* Practical action: Model gently applying or using the product with correct natural technique.
PRODUCT VISIBILITY:
* The product must be clearly visible in the model's hand or positioned naturally within the scene so the customer immediately understands: "THIS IS HOW I USE THIS PRODUCT."
POSE & SCENE:
* Natural hand movement, realistic application, no awkward fingers, no distorted anatomy.
* Premium clean lifestyle environment appropriate for the product, minimal background distractions, natural depth of field.
LIGHTING & STYLE:
* Soft professional commercial photography, realistic skin texture, natural shadows and highlights.
* Luxury e-commerce lifestyle photography, photorealistic, 8k resolution, high-end Amazon brand presentation.${extra}`;
  }

  // Fallback
  return `Commercial 3D product render and studio catalog photography of '${cleanName}' by YogKart. Solid pure white background (#FFFFFF), subtle grounding shadow, Amazon 1600x1600 1:1 square ratio, premium commercial advertising quality, ultra-sharp focus, 8k resolution, photorealistic.${extra}`;
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
async function generateProductAiPhoto({ productName, productData = null, templateType = 'Main Product Image — White Background', customPrompt = '', geminiApiKey = null }) {
  if (!productName || !productName.trim()) {
    throw new Error('Product Name is required');
  }

  console.log(`🎨 [AI Studio] Generating scratch AI image for '${productName}' [${templateType}]...`);

  // Build high-yield prompt matching Amazon 7-Set specification
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

