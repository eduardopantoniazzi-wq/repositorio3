import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL ?? "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const PILOT_PASSWORD = "trocar123";

async function main() {
  const santaMaria = await prisma.unit.upsert({
    where: { code: "SM" },
    update: {},
    create: { code: "SM", name: "Santa Maria/RS", active: true },
  });

  // Present in the system so the data model already supports a second unit,
  // but marked inactive until the pilot expands past Santa Maria.
  await prisma.unit.upsert({
    where: { code: "CS" },
    update: {},
    create: { code: "CS", name: "Canoas/RS", active: false },
  });

  const [suppKraft, suppPlast, suppEtiq] = await Promise.all([
    prisma.supplier.upsert({
      where: { id: "seed-supplier-kraft" },
      update: {},
      create: {
        id: "seed-supplier-kraft",
        name: "Papelera Rio Grande Embalagens",
        contactName: "Marcelo Ferreira",
        phone: "(55) 3222-1010",
        email: "vendas@papelerariograndemb.com.br",
      },
    }),
    prisma.supplier.upsert({
      where: { id: "seed-supplier-plast" },
      update: {},
      create: {
        id: "seed-supplier-plast",
        name: "Poliembal Indústria de Plásticos",
        contactName: "Juliana Souza",
        phone: "(51) 3777-4040",
        email: "comercial@poliembal.com.br",
      },
    }),
    prisma.supplier.upsert({
      where: { id: "seed-supplier-etiq" },
      update: {},
      create: {
        id: "seed-supplier-etiq",
        name: "Rótulos & Etiquetas Sul",
        contactName: "Andre Lima",
        phone: "(55) 3211-9090",
        email: "atendimento@rotulossul.com.br",
      },
    }),
  ]);

  const skus: {
    internalCode: string;
    description: string;
    unitOfMeasure: string;
    classification: "A" | "B" | "C";
    unitCost: number;
    defaultLeadTimeDays: number;
    primarySupplierId: string;
  }[] = [
    {
      internalCode: "EMB-001",
      description: "Saco papel kraft 25kg - Farinha de Trigo Especial",
      unitOfMeasure: "UN",
      classification: "A",
      unitCost: 1.85,
      defaultLeadTimeDays: 7,
      primarySupplierId: suppKraft.id,
    },
    {
      internalCode: "EMB-002",
      description: "Saco papel kraft 10kg - Farinha de Trigo Especial",
      unitOfMeasure: "UN",
      classification: "A",
      unitCost: 1.1,
      defaultLeadTimeDays: 7,
      primarySupplierId: suppKraft.id,
    },
    {
      internalCode: "EMB-003",
      description: "Saco valvulado 25kg - Farinha Integral",
      unitOfMeasure: "UN",
      classification: "A",
      unitCost: 1.95,
      defaultLeadTimeDays: 10,
      primarySupplierId: suppKraft.id,
    },
    {
      internalCode: "EMB-004",
      description: "Big bag 1000kg - Farelo de Trigo",
      unitOfMeasure: "UN",
      classification: "A",
      unitCost: 42.5,
      defaultLeadTimeDays: 15,
      primarySupplierId: suppPlast.id,
    },
    {
      internalCode: "EMB-005",
      description: "Bobina filme plástico para ensacadeira automática",
      unitOfMeasure: "KG",
      classification: "A",
      unitCost: 12.3,
      defaultLeadTimeDays: 12,
      primarySupplierId: suppPlast.id,
    },
    {
      internalCode: "EMB-006",
      description: "Etiqueta adesiva saco 25kg - Trigo Especial",
      unitOfMeasure: "MIL",
      classification: "B",
      unitCost: 0.04,
      defaultLeadTimeDays: 5,
      primarySupplierId: suppEtiq.id,
    },
    {
      internalCode: "EMB-007",
      description: "Fita para lacre de saco valvulado",
      unitOfMeasure: "ROLO",
      classification: "B",
      unitCost: 8.9,
      defaultLeadTimeDays: 5,
      primarySupplierId: suppPlast.id,
    },
    {
      internalCode: "EMB-008",
      description: "Palete de madeira PBR 1,00x1,20m",
      unitOfMeasure: "UN",
      classification: "B",
      unitCost: 35,
      defaultLeadTimeDays: 3,
      primarySupplierId: suppPlast.id,
    },
  ];

  for (const sku of skus) {
    await prisma.sku.upsert({
      where: { unitId_internalCode: { unitId: santaMaria.id, internalCode: sku.internalCode } },
      update: {},
      create: { ...sku, unitId: santaMaria.id },
    });
  }

  const passwordHash = await bcrypt.hash(PILOT_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@antoniazzi.com.br" },
    update: {},
    create: {
      name: "Administrador",
      email: "admin@antoniazzi.com.br",
      passwordHash,
      role: "ADMIN",
    },
  });

  const estoquista = await prisma.user.upsert({
    where: { email: "estoquista.sm@antoniazzi.com.br" },
    update: {},
    create: {
      name: "Estoquista Santa Maria",
      email: "estoquista.sm@antoniazzi.com.br",
      passwordHash,
      role: "ESTOQUISTA",
      unitId: santaMaria.id,
    },
  });

  const operador = await prisma.user.upsert({
    where: { email: "envase.sm@antoniazzi.com.br" },
    update: {},
    create: {
      name: "Operador de Envase Santa Maria",
      email: "envase.sm@antoniazzi.com.br",
      passwordHash,
      role: "OPERADOR_ENVASE",
      unitId: santaMaria.id,
    },
  });

  await prisma.setting.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, divergenceThresholdPercent: 5 },
  });

  console.log("Seed concluído:");
  console.log(`  Unidade piloto: ${santaMaria.name}`);
  console.log(`  SKUs cadastrados: ${skus.length}`);
  console.log("  Usuários (senha para todos: %s)", PILOT_PASSWORD);
  console.log(`    ${admin.email} (Administrador)`);
  console.log(`    ${estoquista.email} (Estoquista)`);
  console.log(`    ${operador.email} (Operador de Envase)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
