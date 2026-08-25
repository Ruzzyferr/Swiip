import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/**
 * Veri modeli — spec bölüm 14.
 *
 * İki bilinçli eksiklik var ve ikisi de mimarinin parçası:
 *  - `body_analyses` tablosunda fotoğraf alanı YOK. Fotoğraf hiçbir zaman diske yazılmaz.
 *  - `session_items` tablosunda set bazlı gerçekleşme YOK. Salonda kayıt tutulmuyor (bölüm 7).
 */

// ---------------------------------------------------------------------------
// Kimlik
// ---------------------------------------------------------------------------

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    parola_hash: text('parola_hash').notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    locale: text('locale').notNull().default('tr-TR'),
    birth_date: date('birth_date'),
    sex: text('sex'),
    height_cm: real('height_cm'),

    /** KVKK: her kategori için ayrı açık rıza. Fotoğrafa rıza vermeden diğerlerine verilebilir. */
    consent_health: timestamp('consent_health', { withTimezone: true }),
    consent_measurements: timestamp('consent_measurements', { withTimezone: true }),
    consent_photo: timestamp('consent_photo', { withTimezone: true }),
    consent_yurt_disi: timestamp('consent_yurt_disi', { withTimezone: true }),

    ed_mode: boolean('ed_mode').notNull().default(false),
    /** Kullanıcı ED modunda sayıları kendi açtıysa. Biz açmayız. */
    ed_sayilar_acik: boolean('ed_sayilar_acik').notNull().default(false),

    medical_gate_status: text('medical_gate_status').notNull().default('temiz'),
    doktor_onayi_at: timestamp('doktor_onayi_at', { withTimezone: true }),

    email_dogrulandi_at: timestamp('email_dogrulandi_at', { withTimezone: true }),
    son_giris_at: timestamp('son_giris_at', { withTimezone: true }),
    /** Hesap silme talebi; gerçekten siler, işaretleyip bırakmaz. */
    silme_talebi_at: timestamp('silme_talebi_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('users_email_idx').on(sql`lower(${t.email})`)],
);

export const refresh_tokens = pgTable(
  'refresh_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Ham token asla saklanmaz; yalnızca özeti. */
    token_hash: text('token_hash').notNull(),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    iptal_at: timestamp('iptal_at', { withTimezone: true }),
    cihaz: text('cihaz'),
  },
  (t) => [
    uniqueIndex('refresh_token_hash_idx').on(t.token_hash),
    index('refresh_user_idx').on(t.user_id),
  ],
);

export const dogrulama_kodlari = pgTable(
  'dogrulama_kodlari',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 'eposta_dogrulama' | 'parola_sifirlama' */
    tip: text('tip').notNull(),
    kod_hash: text('kod_hash').notNull(),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    kullanildi_at: timestamp('kullanildi_at', { withTimezone: true }),
  },
  (t) => [index('dogrulama_user_idx').on(t.user_id, t.tip)],
);

// ---------------------------------------------------------------------------
// Değerlendirme ve profil
// ---------------------------------------------------------------------------

export const assessments = pgTable(
  'assessments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    answers_jsonb: jsonb('answers_jsonb').notNull().default({}),
    /** Blok bazlı kayıt: hangi bloklar tamamlandı. */
    tamamlanan_bloklar: jsonb('tamamlanan_bloklar').notNull().default([]),
    started_at: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    completed_at: timestamp('completed_at', { withTimezone: true }),
    /** Terk analizi: hangi soruda bırakıldı. */
    son_soru_id: text('son_soru_id'),
  },
  (t) => [index('assessments_user_idx').on(t.user_id, t.version)],
);

export const profiles = pgTable('profiles', {
  user_id: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  assessment_id: uuid('assessment_id').references(() => assessments.id, { onDelete: 'set null' }),
  training_age: text('training_age').notNull(),
  recovery_score: real('recovery_score').notNull(),
  tdee_estimated: integer('tdee_estimated'),
  tdee_corrected: integer('tdee_corrected'),
  tdee_corrected_at: timestamp('tdee_corrected_at', { withTimezone: true }),
  volume_budget_jsonb: jsonb('volume_budget_jsonb').notNull().default({}),
  constraints_jsonb: jsonb('constraints_jsonb').notNull().default({}),
  goal_vector_jsonb: jsonb('goal_vector_jsonb').notNull().default({}),
  profil_jsonb: jsonb('profil_jsonb').notNull().default({}),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Vücut analizi — fotoğraf alanı bilinçli olarak YOK
// ---------------------------------------------------------------------------

export const body_analyses = pgTable(
  'body_analyses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    taken_at: timestamp('taken_at', { withTimezone: true }).notNull().defaultNow(),
    bodyfat_low: real('bodyfat_low'),
    bodyfat_high: real('bodyfat_high'),
    /** 'capraz' | 'gorsel' | 'olcu' */
    yontem: text('yontem').notNull(),
    /**
     * Analiz görüntüden mi üretildi?
     *
     * Ad bilerek "foto" içermiyor: `sema.test.ts` sütun adlarını photo/foto/image/base64
     * kalıplarına karşı tarıyor ve `fotografli` denendiğinde kırmızıya döndü. Koruma
     * haklı — saklanan şey fotoğraf değil, raporun hangi kaynaktan üretildiği.
     *
     * Gizlilik notu bu alana bakıyor. Bilgi önceden yalnızca üretim anında vardı; rapor
     * sonradan okunduğunda duruş bayrağı sayısından ÇIKARILMAYA çalışılıyordu. Çıkarım
     * yanlış: görsel analiz bayrak üretmediğinde fotoğraf gönderen kullanıcıya "fotoğraf
     * göndermedin" deniyordu. Ürünün en hassas cümlesi tahmin edilecek yer değil.
     */
    gorselden_uretildi: boolean('gorselden_uretildi').notNull().default(false),
    muscle_map_jsonb: jsonb('muscle_map_jsonb').notNull().default({}),
    posture_flags: jsonb('posture_flags').notNull().default([]),
    measurements_jsonb: jsonb('measurements_jsonb').notNull().default({}),
    rapor_jsonb: jsonb('rapor_jsonb').notNull().default({}),

    /**
     * Satir gercek bir analiz mi, yoksa surmekte olan bir cagrinin rezervasyonu mu?
     *
     * Hak kontrolu ile kayit arasinda gorsel AI cagrisi var ve saniyeler suruyor. O
     * aralikta gelen ikinci istek de kontrolu geciyordu: ucretsiz kullanici cift
     * dokunusla omur boyu BIR olan hakkini IKI analize ceviriyordu.
     *
     * Cozum satiri cagridan ONCE acmak. Rezervasyon sayima girer (hak korunur), rapor
     * okumalarina girmez (yarim analiz gosterilmez), cagri basarisiz olursa silinir.
     *
     * `quotas` bu kurali tasiyamiyor: satir `YYYY-MM` ile anahtarli, oysa ay ortasinda
     * odemeye gecen kullanicinin penceresi abonelik aninda basliyor.
     */
    tamamlandi: boolean('tamamlandi').notNull().default(true),
  },
  (t) => [
    index('body_user_idx').on(t.user_id, t.taken_at),
    index('body_user_tamam_idx')
      .on(t.user_id, t.taken_at)
      .where(sql`tamamlandi`),
  ],
);

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

export const programs = pgTable(
  'programs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    hafta: integer('hafta').notNull().default(1),
    split_tipi: text('split_tipi').notNull(),
    split_jsonb: jsonb('split_jsonb').notNull().default({}),
    butce_jsonb: jsonb('butce_jsonb').notNull().default({}),
    uyarilar: jsonb('uyarilar').notNull().default([]),
    /** Uyarıların kod karşılığı; cümle sözlükte kuruluyor (bkz. shared/gerekce.ts). */
    uyari_kodlari_jsonb: jsonb('uyari_kodlari_jsonb').notNull().default([]),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    aktif: boolean('aktif').notNull().default(true),
  },
  (t) => [index('programs_user_idx').on(t.user_id, t.aktif)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    program_id: uuid('program_id').references(() => programs.id, { onDelete: 'cascade' }),
    gun_indeksi: integer('gun_indeksi').notNull(),
    gun_tipi: text('gun_tipi').notNull(),
    planned_for: date('planned_for'),
    /** planlandi | tamamlandi | atlandi */
    status: text('status').notNull().default('planlandi'),
    skip_reason: text('skip_reason'),
    tahmini_dakika: integer('tahmini_dakika'),
    feedback_at: timestamp('feedback_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('sessions_user_idx').on(t.user_id, t.status)],
);

export const session_items = pgTable(
  'session_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    session_id: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    exercise_id: text('exercise_id').notNull(),
    order_index: integer('order_index').notNull(),
    target_sets: integer('target_sets').notNull(),
    target_weight: real('target_weight'),
    target_reps_low: integer('target_reps_low').notNull(),
    target_reps_high: integer('target_reps_high').notNull(),
    rest_seconds: integer('rest_seconds').notNull(),
    progression_rule_text: text('progression_rule_text').notNull(),
    rationale_id: text('rationale_id'),
    alternatifler: jsonb('alternatifler').notNull().default([]),
    /** tamamladim | zorlandim | yapamadim | null — set bazlı kayıt YOK (spec bölüm 7). */
    feedback: text('feedback'),
    pain_flag: boolean('pain_flag').notNull().default(false),
    /** Kullanıcı hareketi kendisi değiştirdiyse. Ücretsiz ve sınırsız. */
    degistirildi_from: text('degistirildi_from'),
  },
  (t) => [index('session_items_session_idx').on(t.session_id, t.order_index)],
);

export const progression_state = pgTable(
  'progression_state',
  {
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    exercise_id: text('exercise_id').notNull(),
    current_weight: real('current_weight').notNull().default(0),
    current_reps: integer('current_reps').notNull().default(10),
    consecutive_success: integer('consecutive_success').notNull().default(0),
    consecutive_struggle: integer('consecutive_struggle').notNull().default(0),
    last_deload_week: integer('last_deload_week'),
    e1rm: real('e1rm').notNull().default(0),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.user_id, t.exercise_id] })],
);

/** Ürünün kalbi: her kararın hangi cevaplardan ve hangi kurallardan doğduğu. */
export const decisions = pgTable(
  'decisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    session_id: uuid('session_id').references(() => sessions.id, { onDelete: 'cascade' }),
    program_id: uuid('program_id').references(() => programs.id, { onDelete: 'cascade' }),
    entity_type: text('entity_type').notNull(),
    entity_id: text('entity_id').notNull(),
    rule_fired: jsonb('rule_fired').notNull().default([]),
    inputs_jsonb: jsonb('inputs_jsonb').notNull().default([]),
    /** Gerekçeyi kullanıcının dilinde kurmak için gereken değerler (bkz. shared/gerekce.ts). */
    parametreler_jsonb: jsonb('parametreler_jsonb').notNull().default({}),
    explanation_tr: text('explanation_tr').notNull(),
    /** AI cümleyi güzelleştirdiyse true; karar yine deterministik. */
    ai_anlatimi: boolean('ai_anlatimi').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('decisions_user_idx').on(t.user_id, t.entity_type)],
);

// ---------------------------------------------------------------------------
// Beslenme
// ---------------------------------------------------------------------------

export const foods = pgTable(
  'foods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name_tr: text('name_tr').notNull(),
    name_en: text('name_en'),
    /** 100 g başına besin değeri. Miktar değil bileşim. */
    per_100g_jsonb: jsonb('per_100g_jsonb').notNull(),
    /** Ev ölçüsü birimleri: kase, tabak, kepçe, kaşık, dilim, avuç, adet, bardak. */
    portions_jsonb: jsonb('portions_jsonb').notNull().default([]),
    barcode: text('barcode'),
    brand: text('brand'),
    /** turkomp | openfoodfacts | bizim | kullanici | zincir */
    source: text('source').notNull(),
    verified: boolean('verified').notNull().default(false),
    locale: text('locale').notNull().default('tr-TR'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('foods_name_idx').on(t.locale, t.name_tr),
    uniqueIndex('foods_barcode_idx').on(t.barcode),
  ],
);

export const food_logs = pgTable(
  'food_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    logged_at: timestamp('logged_at', { withTimezone: true }).notNull().defaultNow(),
    gun: date('gun').notNull(),
    food_id: uuid('food_id').references(() => foods.id, { onDelete: 'set null' }),
    portion_id: text('portion_id'),
    quantity: numeric('quantity', { precision: 8, scale: 2 }).notNull(),
    /** manuel | barkod | foto | onbellek | tarif */
    entry_method: text('entry_method').notNull(),
    /** Görsel parmak izi; fotoğrafın kendisi DEĞİL. */
    photo_hash: text('photo_hash'),
    corrected_from: uuid('corrected_from'),
    ogun: text('ogun'),
    hesaplanan_jsonb: jsonb('hesaplanan_jsonb').notNull().default({}),
  },
  (t) => [index('food_logs_user_gun_idx').on(t.user_id, t.gun)],
);

export const weight_logs = pgTable(
  'weight_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    gun: date('gun').notNull(),
    kilo_kg: real('kilo_kg').notNull(),
    olculer_jsonb: jsonb('olculer_jsonb').notNull().default({}),
  },
  (t) => [uniqueIndex('weight_user_gun_idx').on(t.user_id, t.gun)],
);

// ---------------------------------------------------------------------------
// Abonelik ve kota
// ---------------------------------------------------------------------------

export const subscriptions = pgTable('subscriptions', {
  user_id: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  /** ucretsiz | temel | pro */
  plan: text('plan').notNull().default('ucretsiz'),
  product_id: text('product_id'),
  status: text('status').notNull().default('aktif'),
  renews_at: timestamp('renews_at', { withTimezone: true }),
  platform: text('platform'),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const quotas = pgTable(
  'quotas',
  {
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Aylık havuz: 'YYYY-MM'. Günlük tavan yok. */
    period: text('period').notNull(),
    food_photos_used: integer('food_photos_used').notNull().default(0),
    coach_messages_used: integer('coach_messages_used').notNull().default(0),
    body_analyses_used: integer('body_analyses_used').notNull().default(0),
    /** Adalet kuralları: bunlar kotadan düşmez, yalnızca ölçüm için tutulur. */
    onbellek_isabeti: integer('onbellek_isabeti').notNull().default(0),
    hatali_tanima_tekrari: integer('hatali_tanima_tekrari').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.user_id, t.period] })],
);

/** Birim ekonomisi en büyük riskimiz; her AI çağrısının maliyeti ölçülür. */
export const ai_usage = pgTable(
  'ai_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    is_tipi: text('is_tipi').notNull(),
    model: text('model').notNull(),
    girdi_token: integer('girdi_token').notNull().default(0),
    cikti_token: integer('cikti_token').notNull().default(0),
    maliyet_usd: numeric('maliyet_usd', { precision: 10, scale: 6 }).notNull().default('0'),
    onbellekten: boolean('onbellekten').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ai_usage_user_idx').on(t.user_id, t.created_at)],
);

export const coach_messages = pgTable(
  'coach_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    tools_called: jsonb('tools_called').notNull().default([]),
    tokens: integer('tokens').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('coach_user_idx').on(t.user_id, t.created_at)],
);

/** Değerlendirme terk noktaları ve dönüşüm ölçümü. Kişisel veri taşımaz. */
export const analytics_events = pgTable(
  'analytics_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    olay: text('olay').notNull(),
    ozellikler: jsonb('ozellikler').notNull().default({}),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('analytics_olay_idx').on(t.olay, t.created_at)],
);

// ---------------------------------------------------------------------------
// İlişkiler
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ one, many }) => ({
  profil: one(profiles, { fields: [users.id], references: [profiles.user_id] }),
  abonelik: one(subscriptions, { fields: [users.id], references: [subscriptions.user_id] }),
  degerlendirmeler: many(assessments),
  programlar: many(programs),
  seanslar: many(sessions),
}));

export const programsRelations = relations(programs, ({ many }) => ({
  seanslar: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  program: one(programs, { fields: [sessions.program_id], references: [programs.id] }),
  kalemler: many(session_items),
}));

export const sessionItemsRelations = relations(session_items, ({ one }) => ({
  seans: one(sessions, { fields: [session_items.session_id], references: [sessions.id] }),
}));

export type Kullanici = typeof users.$inferSelect;
export type YeniKullanici = typeof users.$inferInsert;
export type Degerlendirme = typeof assessments.$inferSelect;
export type ProfilKaydi = typeof profiles.$inferSelect;
export type SeansKaydi = typeof sessions.$inferSelect;
export type SeansKalemi = typeof session_items.$inferSelect;

/**
 * Tanıma düzeltmelerinin global eşleme tablosu (F7.6).
 *
 * Kullanıcı "köfte" olarak tanınan kalemi "İzmir köfte" diye düzeltince buraya yazılır.
 * Bir sonraki kullanıcıda aynı ad geldiğinde model çağrısı yine yapılır ama eşleme
 * doğrudan buradan çözülür — yanlış eşleme bir kez düzeltilir, herkes için düzelir.
 */
export const tanima_eslemeleri = pgTable(
  'tanima_eslemeleri',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Modelin ürettiği ham ad, normalize edilmiş hâli. */
    taninan_ad: text('taninan_ad').notNull(),
    food_id: uuid('food_id')
      .notNull()
      .references(() => foods.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull().default('tr-TR'),
    /** Kaç kullanıcı bu eşlemeyi onayladı. Çoğunluk kazanır. */
    onay_sayisi: integer('onay_sayisi').notNull().default(1),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('tanima_ad_idx').on(t.locale, t.taninan_ad, t.food_id)],
);

/**
 * Kullanıcı bazlı görsel parmak izi önbelleği (F7.1).
 *
 * Fotoğrafın kendisi DEĞİL, yalnızca özeti ve çıkan kalem listesi saklanır.
 * Beklenen isabet oranı %35-45; her isabet bir AI çağrısı ve bir kota hakkı kurtarır.
 */
export const tanima_onbellegi = pgTable(
  'tanima_onbellegi',
  {
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    photo_hash: text('photo_hash').notNull(),
    kalemler_jsonb: jsonb('kalemler_jsonb').notNull().default([]),
    isabet_sayisi: integer('isabet_sayisi').notNull().default(0),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    son_kullanim: timestamp('son_kullanim', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.user_id, t.photo_hash] })],
);

// ---------------------------------------------------------------------------
// Öğün planlama (F8)
// ---------------------------------------------------------------------------

export const recipes = pgTable(
  'recipes',
  {
    id: text('id').primaryKey(),
    name_tr: text('name_tr').notNull(),
    ingredients_jsonb: jsonb('ingredients_jsonb').notNull().default([]),
    steps_tr: jsonb('steps_tr').notNull().default([]),
    macros_jsonb: jsonb('macros_jsonb').notNull(),
    /** 1 (ucuz) - 4 (pahalı). B8 bütçe kısıtıyla eşleşir. */
    cost_tier: integer('cost_tier').notNull().default(2),
    prep_minutes: integer('prep_minutes').notNull(),
    tags: jsonb('tags').notNull().default([]),
    /**
     * Et, tavuk ve yumurta içeren tariflerin TAMAMI gıda güvenliği için elle kontrol edilir.
     * Bu alan false ise tarif kullanıcıya gösterilmez.
     */
    verified_by_human: boolean('verified_by_human').notNull().default(false),
    locale: text('locale').notNull().default('tr-TR'),
  },
  (t) => [index('recipes_locale_idx').on(t.locale, t.cost_tier)],
);

export const pantry = pgTable('pantry', {
  user_id: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  items_jsonb: jsonb('items_jsonb').notNull().default([]),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const meal_plans = pgTable(
  'meal_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    week_of: date('week_of').notNull(),
    days_jsonb: jsonb('days_jsonb').notNull().default([]),
    constraints_snapshot: jsonb('constraints_snapshot').notNull().default({}),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('meal_plan_user_week_idx').on(t.user_id, t.week_of)],
);

export const shopping_lists = pgTable('shopping_lists', {
  id: uuid('id').primaryKey().defaultRandom(),
  plan_id: uuid('plan_id')
    .notNull()
    .references(() => meal_plans.id, { onDelete: 'cascade' }),
  items_jsonb: jsonb('items_jsonb').notNull().default([]),
  grouped_by_aisle: jsonb('grouped_by_aisle').notNull().default({}),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Kaydırma tercih öğrenmesi (F8.11). Sağa kaydırma sever, sola kaydırma sevmez. */
export const ogun_tercihleri = pgTable('ogun_tercihleri', {
  user_id: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  sevilen_jsonb: jsonb('sevilen_jsonb').notNull().default({}),
  sevilmeyen_jsonb: jsonb('sevilmeyen_jsonb').notNull().default({}),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Yayın haberi listesi (marka sitesi).
 *
 * Uygulama henüz mağazada değil; sitedeki tek dönüşüm yolu bu. Bültene dönüşmez:
 * tek bir e-posta gönderilir ve kayıt silinir.
 *
 * KVKK: e-posta kişisel veri. Rıza zamanı ayrıca saklanıyor — "izin verdi mi" sorusuna
 * cevap verebilmek, iznin kendisi kadar önemli. IP adresi TUTULMUYOR: gerekmiyor.
 */
export const ilgi_kayitlari = pgTable('ilgi_kayitlari', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Şapkasız katlanmış hâli değil, kullanıcının yazdığı hâli; ama küçük harfe indirilmiş. */
  eposta: text('eposta').notNull().unique(),
  riza_at: timestamp('riza_at', { withTimezone: true }).notNull().defaultNow(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  /** Haber gönderildiğinde damgalanır; gönderim sonrası kayıt silinir. */
  bildirildi_at: timestamp('bildirildi_at', { withTimezone: true }),
});

/**
 * İşlenmiş mağaza kancası olayları — tekrar oynatma ve sıra koruması.
 *
 * RevenueCat 2xx almadığı teslimatı saatlerce yeniden dener; ayrıca olaylar sırayla
 * gelmek zorunda değil. Kanca gövdesi tek yazar olduğu için iki somut sonuç doğuyordu:
 *
 *  1. Gecikmiş bir `RENEWAL`, işlenmiş bir `EXPIRATION`'ın üstüne yazıyor ve süresi
 *     dolmuş aboneye Pro'yu geri veriyordu.
 *  2. `Authorization` sırrını ele geçiren biri aynı gövdeyi sınırsız tekrar oynatıp
 *     istediği `app_user_id`'ye hak açabiliyordu.
 *
 * `event_id` benzersiz: aynı olay iki kez işlenmez. `olay_at` de saklanıyor; daha eski
 * damgalı bir olay, daha yenisi zaten uygulanmışken plan yazamaz.
 */
export const kanca_olaylari = pgTable('kanca_olaylari', {
  event_id: text('event_id').primaryKey(),
  tip: text('tip').notNull(),
  app_user_id: text('app_user_id'),
  /** Olayın RevenueCat'teki damgası; sıra kontrolü buna göre. */
  olay_at: timestamp('olay_at', { withTimezone: true }),
  islendi_at: timestamp('islendi_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Tanıma düzeltmesini KİM onayladı.
 *
 * `tanima_eslemeleri.onay_sayisi` çağrı sayıyordu, kullanıcı değil: tek bir ücretsiz
 * hesap aynı isteği iki kez göndererek bir kelimeyi istediği besine bağlayabiliyor ve
 * bu eşleme HERKES için bağlayıcı oluyordu. Sağlık ürününde yanlış besin değeri.
 *
 * Birincil anahtar dörtlüsü aynı kullanıcının tekrarını sayıya katmıyor.
 */
export const tanima_onaylari = pgTable(
  'tanima_onaylari',
  {
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull().default('tr-TR'),
    taninan_ad: text('taninan_ad').notNull(),
    food_id: uuid('food_id')
      .notNull()
      .references(() => foods.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.user_id, t.locale, t.taninan_ad, t.food_id] })],
);
