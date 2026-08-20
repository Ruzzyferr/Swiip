CREATE TABLE "meal_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_of" date NOT NULL,
	"days_jsonb" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"constraints_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ogun_tercihleri" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"sevilen_jsonb" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sevilmeyen_jsonb" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pantry" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"items_jsonb" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"name_tr" text NOT NULL,
	"ingredients_jsonb" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"steps_tr" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"macros_jsonb" jsonb NOT NULL,
	"cost_tier" integer DEFAULT 2 NOT NULL,
	"prep_minutes" integer NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verified_by_human" boolean DEFAULT false NOT NULL,
	"locale" text DEFAULT 'tr-TR' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shopping_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"items_jsonb" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"grouped_by_aisle" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ogun_tercihleri" ADD CONSTRAINT "ogun_tercihleri_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry" ADD CONSTRAINT "pantry_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_lists" ADD CONSTRAINT "shopping_lists_plan_id_meal_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "meal_plan_user_week_idx" ON "meal_plans" USING btree ("user_id","week_of");--> statement-breakpoint
CREATE INDEX "recipes_locale_idx" ON "recipes" USING btree ("locale","cost_tier");