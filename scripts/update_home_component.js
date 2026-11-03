const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../../yogkart_frontend/src/app/features/home/home.component.ts');
let code = fs.readFileSync(filePath, 'utf8');

// 1. Update imports
if (!code.includes('BUSINESS_INFO')) {
  code = code.replace(
    "import { CommonModule, DOCUMENT } from '@angular/common';",
    "import { CommonModule, DOCUMENT } from '@angular/common';\nimport { HttpClient } from '@angular/common/http';\nimport { BUSINESS_INFO } from '../../core/config/business-info';\nimport { SettingsService } from '../../core/services/settings.service';\nimport { Category } from '../../core/models/models';"
  );
}

// 1.5. Hero slider dots repositioning (Task 2.10)
const oldDots = `          <!-- Slide Indicators / Dots -->
          <div class="absolute bottom-2.5 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full border border-white/10">
            @for (slide of displayBanners(); track slide.id; let idx = $index) {
              <button (click)="setSlide(idx)"
                      type="button"
                      class="h-4 flex items-center justify-center focus:outline-none transition-all"
                      [attr.aria-label]="'Go to slide ' + (idx + 1)">
                <span [class]="activeSlide() === idx ? 'w-5 sm:w-6 h-1.5 bg-white shadow-sm' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'"
                      class="block rounded-full transition-all duration-300 pointer-events-none"></span>
              </button>
            }
          </div>
        }

      </div>
    </section>`;

const newDots = `        }

      </div>

      <!-- Slide Indicators / Dots (Moved below banner image so they never overlap CTAs - Task 2.10) -->
      @if (displayBanners().length > 1) {
        <div class="flex items-center justify-center gap-1.5 py-2 bg-gray-900 border-t border-gray-800">
          @for (slide of displayBanners(); track slide.id; let idx = $index) {
            <button (click)="setSlide(idx)"
                    type="button"
                    class="h-4 flex items-center justify-center focus:outline-none transition-all px-1"
                    [attr.aria-label]="'Go to slide ' + (idx + 1)">
              <span [class]="activeSlide() === idx ? 'w-6 h-1.5 bg-emerald-500 shadow-sm' : 'w-2 h-1.5 bg-white/30 hover:bg-white/60'"
                    class="block rounded-full transition-all duration-300 pointer-events-none"></span>
            </button>
          }
        </div>
      }
    </section>`;

code = code.replace(oldDots, newDots);

// 2. Trust strip edge gradient mask
code = code.replace(
  '<section class="py-2.5 sm:py-3 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 overflow-hidden relative">',
  '<section class="py-2.5 sm:py-3 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 overflow-hidden relative" style="mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent);">'
);

// 3. Category cards loop with live counts
code = code.replace(
  '@for (cat of categoryCards; track cat.id) {',
  '@for (cat of displayCategories(); track cat.id) {'
);
code = code.replace(
  '<p class="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">{{ cat.count }} Products</p>',
  '<p class="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">{{ cat.count || 0 }} Products</p>'
);

// 4. Trending Products -> Our Picks
code = code.replace(
  '<h2 class="font-display font-black text-xl sm:text-2xl lg:text-3xl text-gray-900 dark:text-white mt-0.5 tracking-tight">Trending Products</h2>',
  '<h2 class="font-display font-black text-xl sm:text-2xl lg:text-3xl text-gray-900 dark:text-white mt-0.5 tracking-tight">Our Picks</h2>'
);

// 5. Limited Time Deals countdown
const oldCountdownBlock = `          <!-- Countdown Timer Badge -->
          <div class="self-start sm:self-auto flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-sm font-mono text-xs sm:text-sm font-bold">
            <span class="text-[10px] sm:text-xs uppercase tracking-wider font-sans font-extrabold mr-1">DEALS END IN:</span>
            <span class="bg-black/25 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-mono">04h</span> :
            <span class="bg-black/25 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-mono">38m</span> :
            <span class="bg-black/25 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-mono">12s</span>
          </div>`;

const newCountdownBlock = `          <!-- Countdown Timer Badge (Rendered ONLY if active future deal in settings - Task 1.6) -->
          @if (dealRemainingFormatted()) {
            <div class="self-start sm:self-auto flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-sm font-mono text-xs sm:text-sm font-bold">
              <span class="text-[10px] sm:text-xs uppercase tracking-wider font-sans font-extrabold mr-1">DEALS END IN:</span>
              <span class="bg-black/25 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-mono">{{ dealRemainingFormatted() }}</span>
            </div>
          }`;

code = code.replace(oldCountdownBlock, newCountdownBlock);

// Replace section title for deals
code = code.replace(
  '<h2 class="font-display font-black text-xl sm:text-2xl lg:text-3xl text-gray-900 dark:text-white mt-0.5 tracking-tight">Limited Time Deals</h2>',
  '<h2 class="font-display font-black text-xl sm:text-2xl lg:text-3xl text-gray-900 dark:text-white mt-0.5 tracking-tight">{{ dealRemainingFormatted() ? \'Limited Time Deals\' : \'Special Prices\' }}</h2>'
);

// 6. Recently Viewed: show only if >= 2 items
code = code.replace(
  '@if (recentlyViewedService.items().length > 0) {',
  '@if (recentlyViewedService.items().length >= 2) {'
);

// 7. Combo offers: hide unless real bundles exist
code = code.replace(
  '<!-- 7. COMBO OFFERS\n    ========================================== -->\n    <section class="py-10 sm:py-12 md:py-14 bg-gray-50/60 dark:bg-gray-950">',
  '<!-- 7. COMBO OFFERS (Task 1.9: Hidden unless real bundles exist) -->\n    @if (hasRealCombos()) {\n    <section class="py-10 sm:py-12 md:py-14 bg-gray-50/60 dark:bg-gray-950">'
);
code = code.replace(
  '</section>\n\n    <!-- ==========================================\n         8. SHOP BY CONCERN',
  '</section>\n    }\n\n    <!-- ==========================================\n         8. SHOP BY CONCERN'
);

// 8. Customer reviews: hide fake Google block and hide section if < 3 real reviews
const oldReviewSectionStart = `    <!-- ==========================================
         9. CUSTOMER REVIEWS & GOOGLE REVIEWS
    ========================================== -->
    <section class="py-10 sm:py-12 md:py-14 bg-amber-50/30 dark:bg-gray-950 border-y border-amber-100/50 dark:border-gray-800">
      <div class="container-fluid mx-auto px-4">
        
        <!-- Google Review Summary Header Card -->
        <div class="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-amber-200/80 dark:border-gray-800 shadow-sm text-center mb-8 sm:mb-10 space-y-1.5">
          <div class="flex items-center justify-center gap-1 text-amber-400 text-xl sm:text-2xl">
            ★★★★★
          </div>
          <h3 class="font-display font-black text-xl sm:text-2xl text-gray-900 dark:text-white">Rated 4.8 / 5 on Google</h3>
          <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">Based on 4,850+ Verified Organic Buyer Reviews</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
          @for (review of customerReviews; track review.name) {
            <div class="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4">
              <div class="space-y-2.5">
                <div class="flex items-center gap-1 text-amber-400 text-sm">
                  ★★★★★
                </div>
                <p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                  "{{ review.text }}"
                </p>
                <div class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-gray-800 px-2.5 py-1 rounded-full inline-block">
                  Purchased: {{ review.product }}
                </div>
              </div>

              <div class="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div class="w-9 h-9 rounded-full bg-[#0b4d2c] text-white font-bold flex items-center justify-center text-xs shadow-sm">
                  {{ review.name.charAt(0) }}
                </div>
                <div>
                  <h4 class="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">{{ review.name }}</h4>
                  <div class="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                    <span>{{ review.location }}</span>
                    <span>•</span>
                    <span class="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                      <span class="material-icons-round text-xs">verified</span> Verified Buyer
                    </span>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </section>`;

const newReviewSection = `    <!-- ==========================================
         9. VERIFIED CUSTOMER REVIEWS (Task 1.1 & 1.2: Only real reviews, no fake ratings)
    ========================================== -->
    @if (realTestimonials().length >= 3) {
      <section class="py-10 sm:py-12 md:py-14 bg-amber-50/30 dark:bg-gray-950 border-y border-amber-100/50 dark:border-gray-800">
        <div class="container-fluid mx-auto px-4">
          
          <!-- Rating Summary Card (Only shown if at least 10 real reviews - Task 1.1) -->
          @if (reviewSummary() && reviewSummary()!.totalReviews >= 10) {
            <div class="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-amber-200/80 dark:border-gray-800 shadow-sm text-center mb-8 sm:mb-10 space-y-1.5">
              <div class="flex items-center justify-center gap-1 text-amber-400 text-xl sm:text-2xl">
                ★★★★★
              </div>
              <h3 class="font-display font-black text-xl sm:text-2xl text-gray-900 dark:text-white">Rated {{ reviewSummary()!.averageRating }} / 5</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">Based on {{ reviewSummary()!.totalReviews }} Verified Buyer Reviews</p>
            </div>
          }

          <div class="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
            @for (review of realTestimonials(); track review.id) {
              <div class="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-2xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4">
                <div class="space-y-2.5">
                  <div class="flex items-center gap-1 text-amber-400 text-sm">
                    @for (s of [1,2,3,4,5]; track s) {
                      <span>{{ s <= review.rating ? '★' : '☆' }}</span>
                    }
                  </div>
                  <p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">
                    "{{ review.text }}"
                  </p>
                  @if (review.product) {
                    <div class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-gray-800 px-2.5 py-1 rounded-full inline-block">
                      Purchased: {{ review.product }}
                    </div>
                  }
                </div>

                <div class="flex items-center gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div class="w-9 h-9 rounded-full bg-[#0b4d2c] text-white font-bold flex items-center justify-center text-xs shadow-sm">
                    {{ (review.name || 'C').charAt(0) }}
                  </div>
                  <div>
                    <h4 class="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">{{ review.name }}</h4>
                    <div class="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
                      <span class="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                        <span class="material-icons-round text-xs">verified</span> Verified Buyer
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </section>
    }`;

code = code.replace(oldReviewSectionStart, newReviewSection);

// 9. Blog title clamp-3
code = code.replace(
  '<h3 class="font-bold text-xs sm:text-sm text-gray-900 dark:text-white group-hover:text-[#0b4d2c] dark:group-hover:text-emerald-400 transition-colors leading-snug line-clamp-2">\n                      <a [routerLink]="[\'/blog\', blog.slug || blog.id]">{{ blog.title }}</a>\n                    </h3>',
  '<h3 class="font-bold text-xs sm:text-sm text-gray-900 dark:text-white group-hover:text-[#0b4d2c] dark:group-hover:text-emerald-400 transition-colors leading-snug line-clamp-3" [title]="blog.title" [attr.aria-label]="blog.title">\n                      <a [routerLink]="[\'/blog\', blog.slug || blog.id]">{{ blog.title }}</a>\n                    </h3>'
);

// 10. Floating buttons: check config before rendering
const oldFloatingButtons = `    <!-- FLOATING QUICK CONTACT STICKY BUTTONS -->
    <div class="fixed bottom-5 sm:bottom-6 right-4 sm:right-6 z-40 flex flex-col gap-2.5">
      <!-- WhatsApp Floating Button -->
      <a href="https://wa.me/918423847319" target="_blank" rel="noopener"
         class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white group"
         title="Chat on WhatsApp"
         aria-label="Chat on WhatsApp">
        <span class="material-icons-round text-xl sm:text-2xl">chat</span>
      </a>

      <!-- Call Floating Button -->
      <a href="tel:+918423847319"
         class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0b4d2c] hover:bg-[#083b21] text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white group"
         title="Call Support"
         aria-label="Call Support">
        <span class="material-icons-round text-xl sm:text-2xl">call</span>
      </a>
    </div>`;

const newFloatingButtons = `    <!-- FLOATING QUICK CONTACT STICKY BUTTONS (Render ONLY if configured in BUSINESS_INFO - Task 2.10) -->
    @if (businessInfo.whatsappNumber || businessInfo.supportPhone) {
      <div class="fixed bottom-6 right-4 sm:right-6 z-40 flex flex-col gap-2.5" style="margin-bottom: env(safe-area-inset-bottom);">
        @if (businessInfo.whatsappNumber) {
          <a [href]="'https://wa.me/' + businessInfo.whatsappNumber" target="_blank" rel="noopener"
             class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white group"
             title="Chat on WhatsApp"
             aria-label="Chat on WhatsApp">
            <span class="material-icons-round text-xl sm:text-2xl">chat</span>
          </a>
        }
        @if (businessInfo.supportPhone) {
          <a [href]="'tel:' + businessInfo.supportPhone"
             class="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0b4d2c] hover:bg-[#083b21] text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 border-2 border-white group"
             title="Call Support"
             aria-label="Call Support">
            <span class="material-icons-round text-xl sm:text-2xl">call</span>
          </a>
        }
      </div>
    }`;

code = code.replace(oldFloatingButtons, newFloatingButtons);

// 11. Class additions (Signals & methods)
const classStart = 'export class HomeComponent implements OnInit, OnDestroy {';
const newClassMembers = `export class HomeComponent implements OnInit, OnDestroy {
  private http                  = inject(HttpClient);
  private settingsService       = inject(SettingsService);
  readonly businessInfo         = BUSINESS_INFO;

  readonly categories           = signal<Category[]>([]);
  readonly reviewSummary        = signal<{ totalReviews: number; averageRating: number } | null>(null);
  readonly realTestimonials     = signal<any[]>([]);
  readonly dealRemainingFormatted = signal<string>('');
  private dealTimer: any = null;

  readonly displayCategories    = computed(() => this.categories().filter(c => (c.count ?? 0) > 0));
  readonly hasRealCombos        = computed(() => false); // 0 real bundles in DB today (Task 1.9)
`;

code = code.replace(classStart, newClassMembers);

// Replace whyChooseBadges with verified facts only (Task 1.7)
const oldWhyChooseBadges = `  readonly whyChooseBadges = [
    { icon: 'verified', title: '100% Organic', desc: 'Certified Natural' },
    { icon: 'science', title: 'Lab Tested', desc: 'Third-party Verified' },
    { icon: 'workspace_premium', title: 'GMP Certified', desc: 'Highest Quality' },
    { icon: 'flag', title: 'Made in India', desc: 'Authentic Herbs' },
    { icon: 'pets', title: 'Cruelty Free', desc: 'Not Tested on Animals' },
    { icon: 'lock', title: 'Secure Payment', desc: '100% Encrypted' },
    { icon: 'local_shipping', title: 'Fast Delivery', desc: 'Express Shipping' },
    { icon: 'sync', title: 'Easy Returns', desc: 'Hassle-free Support' }
  ];`;

const newWhyChooseBadges = `  // Honest facts only (Task 1.7)
  readonly whyChooseBadges = BUSINESS_INFO.trustBadges
    .filter(b => b.enabled && (!b.requiresProof || (b.proofUrl && b.proofUrl.trim().length > 0)))
    .map(b => ({ icon: b.icon, title: b.title, desc: b.description }));`;

code = code.replace(oldWhyChooseBadges, newWhyChooseBadges);

// Concern & Goal lists aligned with actual active inventory (Task 1.9)
const oldConcerns = `  readonly concernList = [
    { id: 'acne-glow', title: 'Acne & Clear Glow', sub: 'Herbal Purifying', image: 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1786126829/ChatGPT_Image_Aug_7_2026_11_22_01_PM_r14oj9.png' },
    { id: 'hair-fall', title: 'Hair Fall & Regrowth', sub: 'Root Nourishment', image: 'assets/images/hair-care.jpg' },
    { id: 'anti-aging', title: 'Anti-Aging & Firming', sub: 'Youth Revitalizing', image: 'assets/images/anti-aging.png' },
    { id: 'immunity', title: 'Immunity & Stamina', sub: 'Daily Vitality', image: 'assets/images/wellness.jpg' },
    { id: 'stress', title: 'Stress & Sleep Care', sub: 'Calming Elixirs', image: 'assets/images/essential-oils.jpg' },
    { id: 'pain-relief', title: 'Joint & Muscle Pain', sub: 'Ayurvedic Relief', image: 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1786195650/ChatGPT_Image_Aug_8_2026_06_57_11_PM_qpupfe.png' }
  ];

  readonly wellnessGoals = [
    {
      id: 'glowing-skin',
      title: 'Flawless Glow',
      subtitle: 'Pure herbal extracts for radiant skin',
      image: 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1786126829/ChatGPT_Image_Aug_7_2026_11_22_01_PM_r14oj9.png',
      queryParams: { concern: 'acne-glow' }
    },
    {
      id: 'hair-growth',
      title: 'Stronger Hair',
      subtitle: 'Root-strengthening botanical oils',
      image: 'assets/images/hair-care.jpg',
      queryParams: { concern: 'hair-fall' }
    },
    {
      id: 'gut-health',
      title: 'Digestive Wellness',
      subtitle: 'Ayurvedic balance & gut comfort',
      image: 'assets/images/detox-digestion.png',
      queryParams: { concern: 'detox' }
    },
    {
      id: 'sleep-calm',
      title: 'Calm & Rest',
      subtitle: 'Herbal soothers for deep sleep',
      image: 'assets/images/essential-oils.jpg',
      queryParams: { concern: 'stress' }
    },
    {
      id: 'energy-vitality',
      title: 'Energy & Vitality',
      subtitle: 'Feel active and refreshed',
      image: 'https://res.cloudinary.com/dnl8ik1o7/image/upload/v1786195929/ChatGPT_Image_Aug_8_2026_07_01_50_PM_axzxb7.png',
      queryParams: { concern: 'immunity' }
    },
    {
      id: 'personal-care',
      title: 'Personal Care',
      subtitle: 'Natural care for everyday routines',
      image: 'assets/images/body-care.jpg',
      queryParams: { category: 'body-care' }
    }
  ];`;

const newConcerns = `  // Active product concerns & goals (Task 1.9)
  readonly concernList = [
    { id: 'hair-care', title: 'Hair & Scalp Care', sub: 'Neem Wood Combs & Herbal Oils', image: 'assets/images/hair-care.jpg' },
    { id: 'body-care', title: 'Handmade Soap Bars', sub: 'Gentle Herbal Bathing', image: 'assets/images/body-care.jpg' },
    { id: 'oral-teeth-care', title: 'Oral & Dental Care', sub: 'Bamboo Toothbrushes', image: 'assets/images/placeholder.svg' },
    { id: 'eye-care', title: 'Ayurvedic Eye Care', sub: 'Natural Eye Wash Cups', image: 'assets/images/placeholder.svg' },
    { id: 'home-healthcare-essentials', title: 'Traditional Essentials', sub: 'Pure Copper Water Bottles', image: 'assets/images/placeholder.svg' }
  ];

  readonly wellnessGoals = [
    {
      id: 'natural-hair-care',
      title: 'Hair & Scalp Routine',
      subtitle: 'Gentle grooming with neem wood combs',
      image: 'assets/images/hair-care.jpg',
      queryParams: { category: 'hair-care' }
    },
    {
      id: 'gentle-skin-cleansing',
      title: 'Herbal Bath Routine',
      subtitle: 'Handmade natural bathing soaps',
      image: 'assets/images/body-care.jpg',
      queryParams: { category: 'body-care' }
    },
    {
      id: 'eco-living',
      title: 'Eco-Friendly Living',
      subtitle: 'Biodegradable bamboo toothbrushes',
      image: 'assets/images/placeholder.svg',
      queryParams: { category: 'oral-teeth-care' }
    },
    {
      id: 'traditional-hydration',
      title: 'Hydration & Health',
      subtitle: 'Pure copper drinking water bottles',
      image: 'assets/images/placeholder.svg',
      queryParams: { category: 'home-healthcare-essentials' }
    }
  ];`;

code = code.replace(oldConcerns, newConcerns);

// Update initDeferredServices to fetch categories, reviews, deal timer
const initDeferredTarget = 'private initDeferredServices(): void {';
const newInitDeferred = `private initDeferredServices(): void {
    // 1. Fetch live active categories (Task 1.8)
    this.productService.getCategories().subscribe({
      next: (cats) => this.categories.set(cats || [])
    });

    // 2. Fetch real review summary (Task 1.1)
    this.http.get<{success: boolean, data: any}>('/api/products/reviews/summary').subscribe({
      next: (res) => {
        if (res?.data) this.reviewSummary.set(res.data);
      },
      error: () => {}
    });

    // 3. Fetch real testimonials (Task 1.2)
    this.http.get<{success: boolean, data: any}>('/api/products/reviews/testimonials').subscribe({
      next: (res) => {
        if (res?.data?.reviews) this.realTestimonials.set(res.data.reviews);
      },
      error: () => {}
    });

    // 4. Read site settings for deals countdown timer (Task 1.6)
    this.settingsService.getPublicSettings(true).subscribe({
      next: (res) => {
        const dealSettings = (res?.data as any)?.deal_settings;
        if (dealSettings?.is_active && dealSettings?.deal_end_at) {
          this.startDealTimer(dealSettings.deal_end_at);
        }
      },
      error: () => {}
    });
`;

code = code.replace(initDeferredTarget, newInitDeferred);

// Add startDealTimer and clean up dealTimer in ngOnDestroy
code = code.replace(
  'ngOnDestroy(): void {',
  `private startDealTimer(dealEndAt: string): void {
    const end = new Date(dealEndAt).getTime();
    if (isNaN(end) || end <= Date.now()) return;

    const update = () => {
      const diff = Math.max(0, end - Date.now());
      if (diff <= 0) {
        this.dealRemainingFormatted.set('');
        if (this.dealTimer) clearInterval(this.dealTimer);
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      this.dealRemainingFormatted.set(\`\${String(h).padStart(2, '0')}h : \${String(m).padStart(2, '0')}m : \${String(s).padStart(2, '0')}s\`);
    };
    update();
    this.dealTimer = setInterval(update, 1000);
  }

  ngOnDestroy(): void {
    if (this.dealTimer) clearInterval(this.dealTimer);`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Successfully updated home.component.ts');
