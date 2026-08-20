CREATE TABLE "tanima_eslemeleri" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taninan_ad" text NOT NULL,
	"food_id" uuid NOT NULL,
	"locale" text DEFAULT 'tr-TR' NOT NULL,
	"onay_sayisi" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tanima_onbellegi" (
	"user_id" uuid NOT NULL,
	"photo_hash" text NOT NULL,
	"kalemler_jsonb" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"isabet_sayisi" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"son_kullanim" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tanima_onbellegi_user_id_photo_hash_pk" PRIMARY KEY("user_id","photo_hash")
);
--> statement-breakpoint
ALTER TABLE "tanima_eslemeleri" ADD CONSTRAINT "tanima_eslemeleri_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tanima_onbellegi" ADD CONSTRAINT "tanima_onbellegi_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tanima_ad_idx" ON "tanima_eslemeleri" USING btree ("locale","taninan_ad","food_id");