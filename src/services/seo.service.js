const db = require('../config/database');

const SITE_URL = String(
  process.env.SEO_BASE_URL || process.env.FRONTEND_URL || 'https://yogkart.com'
).replace(/\/$/, '');

/**
 * BCP-47 Reciprocal Hreflang Tags Generator
 */
const generateHreflangs = (path = '/') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return [
    { rel: 'alternate', hreflang: 'x-default', href: `${SITE_URL}/en-in${cleanPath}` },
    { rel: 'alternate', hreflang: 'en-IN', href: `${SITE_URL}/en-in${cleanPath}` },
    { rel: 'alternate', hreflang: 'hi-IN', href: `${SITE_URL}/hi-in${cleanPath}` },
    { rel: 'alternate', hreflang: 'en-US', href: `${SITE_URL}/en-us${cleanPath}` },
    { rel: 'alternate', hreflang: 'en-GB', href: `${SITE_URL}/en-gb${cleanPath}` },
    { rel: 'alternate', hreflang: 'en-CA', href: `${SITE_URL}/en-ca${cleanPath}` },
    { rel: 'alternate', hreflang: 'fr-CA', href: `${SITE_URL}/fr-ca${cleanPath}` },
    { rel: 'alternate', hreflang: 'ar-AE', href: `${SITE_URL}/ar-ae${cleanPath}` },
    { rel: 'alternate', hreflang: 'en-AE', href: `${SITE_URL}/en-ae${cleanPath}` },
    { rel: 'alternate', hreflang: 'en-AU', href: `${SITE_URL}/en-au${cleanPath}` }
  ];
};

/**
 * Expanded Schema.org JSON-LD Generator (12+ Schema Types)
 */
const generateSchemaOrgData = (type, data = {}) => {
  const baseContext = 'https://schema.org';

  switch (type) {
    case 'WebSite':
      return {
        '@context': baseContext,
        '@type': 'WebSite',
        name: 'Yogkart International',
        url: SITE_URL,
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/search?q={search_term_string}`
          },
          'query-input': 'required name=search_term_string'
        }
      };

    case 'Organization':
      return {
        '@context': baseContext,
        '@type': 'Organization',
        name: 'Yogkart International',
        url: SITE_URL,
        logo: `${SITE_URL}/assets/images/logo.png`,
        sameAs: [
          'https://facebook.com/yogkart',
          'https://instagram.com/yogkart',
          'https://twitter.com/yogkart',
          'https://linkedin.com/company/yogkart'
        ],
        contactPoint: {
          '@type': 'ContactPoint',
          telephone: '+91-9876543210',
          contactType: 'customer service',
          availableLanguage: ['English', 'Hindi', 'Arabic', 'French']
        }
      };

    case 'HowTo':
      return {
        '@context': baseContext,
        '@type': 'HowTo',
        name: data.title || 'How to Perform Surya Namaskar (Sun Salutation)',
        description: data.description || 'Step-by-step guide to practicing Surya Namaskar for vitality and flexibility.',
        step: (data.steps || [
          { name: 'Pranamasana', text: 'Stand at the edge of your mat, feet together, palms folded at chest.' },
          { name: 'Hastauttanasana', text: 'Inhale, raise arms overhead, bending slightly backward.' },
          { name: 'Padahastanasana', text: 'Exhale, bend forward touching palms to the mat.' }
        ]).map((step, idx) => ({
          '@type': 'HowToStep',
          position: idx + 1,
          name: step.name,
          text: step.text
        }))
      };

    case 'EducationalOccupationalCredential':
      return {
        '@context': baseContext,
        '@type': 'EducationalOccupationalCredential',
        name: data.name || 'Certified Yoga Teacher (RYT 200 / RYT 500)',
        credentialCategory: 'Certification',
        recognizedBy: {
          '@type': 'Organization',
          name: 'Yogkart International Yoga Alliance'
        },
        competencyRequired: '200 Hours Yoga Anatomy, Asana Practice, & Teaching Methodology'
      };

    case 'ItemList':
      return {
        '@context': baseContext,
        '@type': 'ItemList',
        name: data.title || 'Verified Yoga Certification Courses',
        numberOfItems: data.items?.length || 4,
        itemListElement: (data.items || []).map((item, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: item.title || item.name,
          url: `${SITE_URL}/courses/${item.slug || ''}`
        }))
      };

    case 'Course':
      return {
        '@context': baseContext,
        '@type': 'Course',
        name: data.title || 'Certified Yoga Teacher Training Course',
        description: data.description || 'Accredited RYT yoga teacher training program.',
        provider: {
          '@type': 'Organization',
          name: 'Yogkart International',
          sameAs: SITE_URL
        },
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: data.mode || 'Online / Blended',
          instructor: {
            '@type': 'Person',
            name: data.instructor || 'Master Yoga Teacher'
          }
        },
        offers: {
          '@type': 'Offer',
          price: data.price || '1499',
          priceCurrency: data.currency || 'INR',
          availability: 'https://schema.org/InStock'
        }
      };

    case 'Person':
      return {
        '@context': baseContext,
        '@type': 'Person',
        name: data.name || 'Yoga Instructor',
        jobTitle: data.title || 'Certified Yoga Master',
        worksFor: {
          '@type': 'Organization',
          name: 'Yogkart'
        },
        knowsLanguage: data.languages || ['English', 'Hindi'],
        description: data.bio || 'Accredited yoga therapist.'
      };

    case 'Article':
      return {
        '@context': baseContext,
        '@type': 'Article',
        headline: data.title || 'Yoga and Mindful Living',
        image: [data.image || `${SITE_URL}/assets/images/blog-banner.jpg`],
        datePublished: data.publishedAt || new Date().toISOString(),
        dateModified: data.updatedAt || new Date().toISOString(),
        author: {
          '@type': 'Person',
          name: data.authorName || 'Yogkart Editorial Board'
        },
        publisher: {
          '@type': 'Organization',
          name: 'Yogkart',
          logo: {
            '@type': 'ImageObject',
            url: `${SITE_URL}/assets/images/logo.png`
          }
        }
      };

    case 'FAQ':
      return {
        '@context': baseContext,
        '@type': 'FAQPage',
        mainEntity: (data.faqs || [
          { question: 'What is Yogkart?', answer: 'Yogkart is an international yoga certification and teacher booking platform.' },
          { question: 'Are certificates globally valid?', answer: 'Yes, Yogkart certifications adhere to international standards.' }
        ]).map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer
          }
        }))
      };

    default:
      return {
        '@context': baseContext,
        '@type': 'WebSite',
        name: 'Yogkart',
        url: SITE_URL
      };
  }
};

/**
 * AI Discoverability Text Generator (llms.txt)
 */
const generateLlmsTxt = async () => {
  try {
    const { rows: courses } = await db.query(`SELECT title, description, price_inr FROM courses WHERE is_active = TRUE LIMIT 10`);
    const { rows: teachers } = await db.query(`SELECT name, bio, city, state FROM teacher_profiles WHERE is_approved = TRUE LIMIT 10`);

    let text = `# Yogkart International — AI Summary & LLM Directives\n`;
    text += `Website: ${SITE_URL}\n`;
    text += `Purpose: International Yoga Certification, Verified Teacher Booking, Workshops & Holistic Wellness E-Commerce.\n\n`;

    text += `## BCP-47 Target Locales\n`;
    text += `- en-IN: English (India) — Base Currency: INR (₹)\n`;
    text += `- hi-IN: Hindi (India)\n`;
    text += `- en-US: English (USA) — Currency: USD ($)\n`;
    text += `- en-GB: English (United Kingdom) — Currency: GBP (£)\n`;
    text += `- en-CA: English (Canada) — Currency: CAD (C$)\n`;
    text += `- fr-CA: French (Canada)\n`;
    text += `- ar-AE: Arabic (UAE, RTL) — Currency: AED\n`;
    text += `- en-AE: English (UAE)\n`;
    text += `- en-AU: English (Australia) — Currency: AUD (A$)\n\n`;

    text += `## Core Certification Programs\n`;
    courses.forEach(c => {
      text += `- **${c.title}**: ${c.description || 'Professional RYT Yoga Certification'} (Price: ₹${c.price_inr || '1499'})\n`;
    });

    text += `\n## Top Verified Instructors\n`;
    teachers.forEach(t => {
      text += `- **${t.name}**: ${t.bio || 'Certified Master Teacher'} (${t.city || 'Global'}, ${t.state || 'Online'})\n`;
    });

    return text;
  } catch (err) {
    console.error('Error generating llms.txt:', err);
    return `# Yogkart International — AI Summary\nWebsite: ${SITE_URL}\nPlatform for Yoga Certification & Teachers.`;
  }
};

module.exports = {
  SITE_URL,
  generateHreflangs,
  generateSchemaOrgData,
  generateLlmsTxt
};
