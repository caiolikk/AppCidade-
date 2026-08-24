-- PostGIS precisa existir antes da coluna geometry(Polygon, 4326).
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('CITIZEN', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "public"."OccurrenceStatus" AS ENUM ('REPORTADA', 'RECEBIDA', 'EM_ANALISE', 'EM_ATENDIMENTO', 'RESOLVIDA', 'ARQUIVADA', 'INVALIDA');

-- CreateEnum
CREATE TYPE "public"."EvaluationType" AS ENUM ('UTIL', 'PERSISTE', 'INCORRETA');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cpf" VARCHAR(11) NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'CITIZEN',
    "reputationScore" INTEGER NOT NULL DEFAULT 0,
    "cep" VARCHAR(8) NOT NULL,
    "neighborhood" TEXT NOT NULL,
    "santosNeighborhoodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."occurrences" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "status" "public"."OccurrenceStatus" NOT NULL DEFAULT 'REPORTADA',
    "categoryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."occurrence_media" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "occurrence_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."santos_neighborhoods" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "geom" geometry(Polygon, 4326) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "santos_neighborhoods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."evaluations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "type" "public"."EvaluationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."occurrence_status_history" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "previousStatus" "public"."OccurrenceStatus",
    "newStatus" "public"."OccurrenceStatus" NOT NULL,
    "changedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "occurrence_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "public"."users"("cpf");

-- CreateIndex
CREATE INDEX "users_santosNeighborhoodId_idx" ON "public"."users"("santosNeighborhoodId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "public"."categories"("name");

-- CreateIndex
CREATE INDEX "occurrences_userId_idx" ON "public"."occurrences"("userId");

-- CreateIndex
CREATE INDEX "occurrences_categoryId_idx" ON "public"."occurrences"("categoryId");

-- CreateIndex
CREATE INDEX "occurrences_status_idx" ON "public"."occurrences"("status");

-- CreateIndex
CREATE UNIQUE INDEX "occurrence_media_publicId_key" ON "public"."occurrence_media"("publicId");

-- CreateIndex
CREATE INDEX "occurrence_media_occurrenceId_idx" ON "public"."occurrence_media"("occurrenceId");

-- CreateIndex
CREATE UNIQUE INDEX "santos_neighborhoods_name_key" ON "public"."santos_neighborhoods"("name");

-- CreateIndex
CREATE UNIQUE INDEX "santos_neighborhoods_normalizedName_key" ON "public"."santos_neighborhoods"("normalizedName");

-- CreateIndex
CREATE INDEX "santos_neighborhoods_geom_gist" ON "public"."santos_neighborhoods" USING GIST ("geom");

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_userId_occurrenceId_key" ON "public"."evaluations"("userId", "occurrenceId");

-- CreateIndex
CREATE INDEX "occurrence_status_history_occurrenceId_idx" ON "public"."occurrence_status_history"("occurrenceId");

-- CreateIndex
CREATE INDEX "occurrence_status_history_changedById_idx" ON "public"."occurrence_status_history"("changedById");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_santosNeighborhoodId_fkey" FOREIGN KEY ("santosNeighborhoodId") REFERENCES "public"."santos_neighborhoods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."occurrences" ADD CONSTRAINT "occurrences_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."occurrences" ADD CONSTRAINT "occurrences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."occurrence_media" ADD CONSTRAINT "occurrence_media_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "public"."occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evaluations" ADD CONSTRAINT "evaluations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."evaluations" ADD CONSTRAINT "evaluations_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "public"."occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."occurrence_status_history" ADD CONSTRAINT "occurrence_status_history_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "public"."occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."occurrence_status_history" ADD CONSTRAINT "occurrence_status_history_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
