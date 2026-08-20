CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"is_tipi" text NOT NULL,
	"model" text NOT NULL,
	"girdi_token" integer DEFAULT 0 NOT NULL,
	"cikti_token" integer DEFAULT 0 NOT NULL,
	"maliyet_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"onbellekten" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"olay" text NOT NULL,
	"ozellikler" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"answers_jsonb" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"tamamlanan_bloklar" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"son_soru_id" text
);
--> statement-breakpoint
CREATE TABLE "body_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"bodyfat_low" real,
	"bodyfat_high" real,
	"yontem" text NOT NULL,
	"muscle_map_jsonb" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"posture_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"measurements_jsonb" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rapor_jsonb" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"tools_called" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"program_id" uuid,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"rule_fired" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"inputs_jsonb" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"explanation_tr" text NOT NULL,
	"ai_anlatimi" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dogrulama_kodlari" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tip" text NOT NULL,
	"kod_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"kullanildi_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "food_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"logged_at" timestamp with time zone DEFAULT now() NOT NULL,
	"gun" date NOT NULL,
	"food_id" uuid,
	"portion_id" text,
	"quantity" numeric(8, 2) NOT NULL,
	"entry_method" text NOT NULL,
	"photo_hash" text,
	"corrected_from" uuid,
	"ogun" text,
	"hesaplanan_jsonb" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_tr" text NOT NULL,
	"name_en" text,
	"per_100g_jsonb" jsonb NOT NULL,
	"portions_jsonb" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"barcode" text,
	"brand" text,
	"source" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"locale" text DEFAULT 'tr-TR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"assessment_id" uuid,
	"training_age" text NOT NULL,
	"recovery_score" real NOT NULL,
	"tdee_estimated" integer,
	"tdee_corrected" integer,
	"tdee_corrected_at" timestamp with time zone,
	"volume_budget_jsonb" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"constraints_jsonb" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"goal_vector_jsonb" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"profil_jsonb" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"hafta" integer DEFAULT 1 NOT NULL,
	"split_tipi" text NOT NULL,
	"split_jsonb" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"butce_jsonb" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"uyarilar" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progression_state" (
	"user_id" uuid NOT NULL,
	"exercise_id" text NOT NULL,
	"current_weight" real DEFAULT 0 NOT NULL,
	"current_reps" integer DEFAULT 10 NOT NULL,
	"consecutive_success" integer DEFAULT 0 NOT NULL,
	"consecutive_struggle" integer DEFAULT 0 NOT NULL,
	"last_deload_week" integer,
	"e1rm" real DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "progression_state_user_id_exercise_id_pk" PRIMARY KEY("user_id","exercise_id")
);
--> statement-breakpoint
CREATE TABLE "quotas" (
	"user_id" uuid NOT NULL,
	"period" text NOT NULL,
	"food_photos_used" integer DEFAULT 0 NOT NULL,
	"coach_messages_used" integer DEFAULT 0 NOT NULL,
	"body_analyses_used" integer DEFAULT 0 NOT NULL,
	"onbellek_isabeti" integer DEFAULT 0 NOT NULL,
	"hatali_tanima_tekrari" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "quotas_user_id_period_pk" PRIMARY KEY("user_id","period")
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"iptal_at" timestamp with time zone,
	"cihaz" text
);
--> statement-breakpoint
CREATE TABLE "session_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"exercise_id" text NOT NULL,
	"order_index" integer NOT NULL,
	"target_sets" integer NOT NULL,
	"target_weight" real,
	"target_reps_low" integer NOT NULL,
	"target_reps_high" integer NOT NULL,
	"rest_seconds" integer NOT NULL,
	"progression_rule_text" text NOT NULL,
	"rationale_id" text,
	"alternatifler" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"feedback" text,
	"pain_flag" boolean DEFAULT false NOT NULL,
	"degistirildi_from" text
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" uuid,
	"gun_indeksi" integer NOT NULL,
	"gun_tipi" text NOT NULL,
	"planned_for" date,
	"status" text DEFAULT 'planlandi' NOT NULL,
	"skip_reason" text,
	"tahmini_dakika" integer,
	"feedback_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"plan" text DEFAULT 'ucretsiz' NOT NULL,
	"product_id" text,
	"status" text DEFAULT 'aktif' NOT NULL,
	"renews_at" timestamp with time zone,
	"platform" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"parola_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locale" text DEFAULT 'tr-TR' NOT NULL,
	"birth_date" date,
	"sex" text,
	"height_cm" real,
	"consent_health" timestamp with time zone,
	"consent_measurements" timestamp with time zone,
	"consent_photo" timestamp with time zone,
	"consent_yurt_disi" timestamp with time zone,
	"ed_mode" boolean DEFAULT false NOT NULL,
	"ed_sayilar_acik" boolean DEFAULT false NOT NULL,
	"medical_gate_status" text DEFAULT 'temiz' NOT NULL,
	"doktor_onayi_at" timestamp with time zone,
	"email_dogrulandi_at" timestamp with time zone,
	"son_giris_at" timestamp with time zone,
	"silme_talebi_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "weight_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"gun" date NOT NULL,
	"kilo_kg" real NOT NULL,
	"olculer_jsonb" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "body_analyses" ADD CONSTRAINT "body_analyses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_messages" ADD CONSTRAINT "coach_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decisions" ADD CONSTRAINT "decisions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dogrulama_kodlari" ADD CONSTRAINT "dogrulama_kodlari_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_logs" ADD CONSTRAINT "food_logs_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progression_state" ADD CONSTRAINT "progression_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotas" ADD CONSTRAINT "quotas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_items" ADD CONSTRAINT "session_items_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_logs" ADD CONSTRAINT "weight_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_usage_user_idx" ON "ai_usage" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "analytics_olay_idx" ON "analytics_events" USING btree ("olay","created_at");--> statement-breakpoint
CREATE INDEX "assessments_user_idx" ON "assessments" USING btree ("user_id","version");--> statement-breakpoint
CREATE INDEX "body_user_idx" ON "body_analyses" USING btree ("user_id","taken_at");--> statement-breakpoint
CREATE INDEX "coach_user_idx" ON "coach_messages" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "decisions_user_idx" ON "decisions" USING btree ("user_id","entity_type");--> statement-breakpoint
CREATE INDEX "dogrulama_user_idx" ON "dogrulama_kodlari" USING btree ("user_id","tip");--> statement-breakpoint
CREATE INDEX "food_logs_user_gun_idx" ON "food_logs" USING btree ("user_id","gun");--> statement-breakpoint
CREATE INDEX "foods_name_idx" ON "foods" USING btree ("locale","name_tr");--> statement-breakpoint
CREATE UNIQUE INDEX "foods_barcode_idx" ON "foods" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "programs_user_idx" ON "programs" USING btree ("user_id","aktif");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_token_hash_idx" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_items_session_idx" ON "session_items" USING btree ("session_id","order_index");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE UNIQUE INDEX "weight_user_gun_idx" ON "weight_logs" USING btree ("user_id","gun");