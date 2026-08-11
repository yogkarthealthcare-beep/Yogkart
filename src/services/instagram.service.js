const { query } = require('../config/database');

const INSTAGRAM_REELS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS instagram_reels (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  video_url TEXT NOT NULL,
  instagram_link TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

const DEFAULT_REELS = [
  {
    title: 'Yogkart Neem Comb - Flat Lay Glow',
    video_url: 'https://res.cloudinary.com/dnl8ik1o7/video/upload/v1777562478/Yogkat_Ankita_jain_ajbeautymantra_A_sleek_flat-lay_photo_of_a_beautifully_crafted_neem_comb_pl_s73jrk.mp4',
    instagram_link: 'https://www.instagram.com/yogkart',
    sort_order: 1
  },
  {
    title: 'Experience Nature - Pure Neem Wood',
    video_url: 'https://res.cloudinary.com/dnl8ik1o7/video/upload/v1777562480/Experience_the_power_of_nature_with_Yogkart_Neem_Comb_made_from_pure_neem_wood_known_for_its_1_kjwnrh.mp4',
    instagram_link: 'https://www.instagram.com/yogkart',
    sort_order: 2
  },
  {
    title: 'Reduce Hair Fall & Promote Growth',
    video_url: 'https://res.cloudinary.com/dnl8ik1o7/video/upload/v1777562481/Wood_comb_yogkart_Reduce_hair_fall_Promote_hair_growth_Reduce_dandruff_Best_for_hair_growth_ha_p50uct.mp4',
    instagram_link: 'https://www.instagram.com/yogkart',
    sort_order: 3
  },
  {
    title: 'Why Use Plastic? Choose Neem Brush',
    video_url: 'https://res.cloudinary.com/dnl8ik1o7/video/upload/v1777562481/Why_use_plastic_when_nature_has_a_better_option_Loving_my_neem_brush_for_frizz-free_healthy_hai_1_t9xmhu.mp4',
    instagram_link: 'https://www.instagram.com/yogkart',
    sort_order: 4
  },
  {
    title: 'Yogkart Kachi Neem Hair Comb',
    video_url: 'https://res.cloudinary.com/dnl8ik1o7/video/upload/v1777562493/Yogkart_kachi_neem_hair_comb_Neem_combs_are_made_from_the_wood_of_the_neem_tree_Azadirachta_i_vllu2u.mp4',
    instagram_link: 'https://www.instagram.com/yogkart',
    sort_order: 5
  }
];

const ensureInstagramReelsSchema = async () => {
  try {
    console.log('⏳ Ensuring instagram_reels schema...');
    await query(INSTAGRAM_REELS_SCHEMA_SQL);

    const checkRes = await query('SELECT COUNT(*)::integer FROM instagram_reels');
    const count = checkRes.rows[0].count;

    if (count === 0) {
      console.log('🌱 Seeding default instagram_reels...');
      for (const r of DEFAULT_REELS) {
        await query(
          `INSERT INTO instagram_reels (title, video_url, instagram_link, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [r.title, r.video_url, r.instagram_link, r.sort_order]
        );
      }
      console.log('✅ Default instagram_reels seeded.');
    } else {
      console.log(`✅ instagram_reels schema verified. ${count} reels exist.`);
    }
  } catch (err) {
    console.error('❌ Failed to ensure instagram_reels schema:', err);
  }
};

module.exports = { ensureInstagramReelsSchema };
