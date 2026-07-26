import { PrismaClient, CrmActivityType, LeadSource, LeadStatus, OpportunityStage } from "@prisma/client";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const CEO_USER_ID = "00000000-0000-4000-8000-000000000020";
const SALES_USER_ID = "00000000-0000-4000-8000-000000000023";

const CONVERTED_CUSTOMERS = [
  { id: "00000000-0000-4000-8000-000000000609", code: "CUS-010" },
  { id: "00000000-0000-4000-8000-000000000606", code: "CUS-007" },
  { id: "00000000-0000-4000-8000-000000000613", code: "CUS-014" },
];

const LEADS: Array<{
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  source: LeadSource;
  status: LeadStatus;
  estimatedValue: number;
  assignedToId: string;
  convertedCustomerId?: string;
  notes?: string;
}> = [
  { id: "00000000-0000-4000-8000-000000000800", companyName: "Petra Souvenirs Trading", contactName: "Ahmad Al-Maani", email: "ahmad@petrasouvenirs.jo", phone: "+962 3 215 4400", city: "Wadi Musa", source: "WEBSITE", status: "NEW", estimatedValue: 12000, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000801", companyName: "Madaba Mosaic Crafts", contactName: "Lina Haddad", email: "lina@madabamosaic.jo", phone: "+962 5 325 1100", city: "Madaba", source: "REFERRAL", status: "CONTACTED", estimatedValue: 8500, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000802", companyName: "Jerash Heritage Stores", contactName: "Omar Qudah", email: "omar@jerashheritage.jo", phone: "+962 2 635 2200", city: "Jerash", source: "FIELD_SALES", status: "QUALIFIED", estimatedValue: 22000, assignedToId: CEO_USER_ID },
  { id: "00000000-0000-4000-8000-000000000803", companyName: "Aqaba Port Logistics", contactName: "Sami Nasser", email: "sami@aqabaport.jo", phone: "+962 3 201 5500", city: "Aqaba", source: "EVENT", status: "NEW", estimatedValue: 45000, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000804", companyName: "Karak Castle Retail", contactName: "Huda Shammout", email: "huda@karakcastle.jo", phone: "+962 3 235 8800", city: "Karak", source: "SOCIAL_MEDIA", status: "CONTACTED", estimatedValue: 6500, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000805", companyName: "Ma'an Desert Supplies", contactName: "Faisal Al-Otaibi", email: "faisal@maansupplies.jo", phone: "+962 3 237 1200", city: "Ma'an", source: "FIELD_SALES", status: "QUALIFIED", estimatedValue: 18000, assignedToId: CEO_USER_ID },
  { id: "00000000-0000-4000-8000-000000000806", companyName: "Tafilah Valley Foods", contactName: "Rania Khoury", email: "rania@tafilahfoods.jo", phone: "+962 3 225 3300", city: "Tafilah", source: "WEBSITE", status: "NEW", estimatedValue: 9200, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000807", companyName: "Mafraq Border Trading", contactName: "Yousef Al-Harbi", email: "yousef@mafraqtrade.jo", phone: "+962 2 572 4400", city: "Mafraq", source: "REFERRAL", status: "CONTACTED", estimatedValue: 31000, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000808", companyName: "Ramtha Wholesale Hub", contactName: "Nour Al-Abed", email: "nour@ramthahub.jo", phone: "+962 2 785 2200", city: "Ramtha", source: "FIELD_SALES", status: "QUALIFIED", estimatedValue: 27500, assignedToId: CEO_USER_ID },
  { id: "00000000-0000-4000-8000-000000000809", companyName: "Fuheis Mountain Market", contactName: "George Saba", email: "george@fuheismarket.jo", phone: "+962 6 472 1100", city: "Fuheis", source: "OTHER", status: "LOST", estimatedValue: 5000, assignedToId: SALES_USER_ID, notes: "Chose competitor pricing" },
  { id: "00000000-0000-4000-8000-000000000810", companyName: "Sweileh Campus Stores", contactName: "Maha Odeh", email: "maha@sweilehstores.jo", phone: "+962 6 535 8800", city: "Amman", source: "WEBSITE", status: "NEW", estimatedValue: 14000, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000811", companyName: "Jubeiha Retail Park", contactName: "Tariq Hammad", email: "tariq@jubeihapark.jo", phone: "+962 6 551 2200", city: "Amman", source: "SOCIAL_MEDIA", status: "CONTACTED", estimatedValue: 19500, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000812", companyName: "Abdoun Premium Grocers", contactName: "Dina Masri", email: "dina@abdoungrocers.jo", phone: "+962 6 592 3300", city: "Amman", source: "REFERRAL", status: "QUALIFIED", estimatedValue: 38000, assignedToId: CEO_USER_ID },
  { id: "00000000-0000-4000-8000-000000000813", companyName: "Marka Industrial Canteen", contactName: "Khaled Zoubi", email: "khaled@markacanteen.jo", phone: "+962 6 489 4400", city: "Amman", source: "EVENT", status: "NEW", estimatedValue: 11000, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000814", companyName: "Zarqa Free Zone Trading", contactName: "Samira Jaber", email: "samira@zarqafz.jo", phone: "+962 5 382 5500", city: "Zarqa", source: "FIELD_SALES", status: "CONTACTED", estimatedValue: 52000, assignedToId: CEO_USER_ID },
  { id: "00000000-0000-4000-8000-000000000815", companyName: "Russeifa Corner Markets", contactName: "Hassan Al-Qaisi", email: "hassan@russeifa.jo", phone: "+962 5 371 6600", city: "Russeifa", source: "WEBSITE", status: "QUALIFIED", estimatedValue: 15800, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000816", companyName: "Salt Old City Traders", contactName: "Iman Bani Odeh", email: "iman@salttraders.jo", phone: "+962 5 355 7700", city: "Salt", source: "REFERRAL", status: "NEW", estimatedValue: 7800, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000817", companyName: "Irbid University Bookstore", contactName: "Bassam Nabulsi", email: "bassam@yubookstore.jo", phone: "+962 2 720 8800", city: "Irbid", source: "SOCIAL_MEDIA", status: "CONTACTED", estimatedValue: 9600, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000818", companyName: "Ajloun Forest Products", contactName: "Rami Awad", email: "rami@ajlounforest.jo", phone: "+962 2 642 9900", city: "Ajloun", source: "FIELD_SALES", status: "QUALIFIED", estimatedValue: 13200, assignedToId: CEO_USER_ID },
  { id: "00000000-0000-4000-8000-000000000819", companyName: "Dead Sea Wellness Resorts", contactName: "Layla Khoury", email: "layla@dswellness.jo", phone: "+962 5 356 1100", city: "Dead Sea", source: "EVENT", status: "CONVERTED", estimatedValue: 85000, assignedToId: CEO_USER_ID, convertedCustomerId: CONVERTED_CUSTOMERS[0].id, notes: "Converted to CUS-010" },
  { id: "00000000-0000-4000-8000-000000000820", companyName: "Northern Jordan Distributors", contactName: "Walid Masarweh", email: "walid@northerndist.jo", phone: "+962 2 727 2200", city: "Irbid", source: "REFERRAL", status: "CONVERTED", estimatedValue: 42000, assignedToId: SALES_USER_ID, convertedCustomerId: CONVERTED_CUSTOMERS[1].id, notes: "Converted to CUS-007" },
  { id: "00000000-0000-4000-8000-000000000821", companyName: "Hillside Mini Markets", contactName: "Nadia Saleh", email: "nadia@hillsidemini.jo", phone: "+962 6 582 3300", city: "Amman", source: "WEBSITE", status: "CONVERTED", estimatedValue: 24000, assignedToId: SALES_USER_ID, convertedCustomerId: CONVERTED_CUSTOMERS[2].id, notes: "Converted to CUS-014" },
  { id: "00000000-0000-4000-8000-000000000822", companyName: "Wadi Rum Adventure Co", contactName: "Salem Al-Zalabieh", email: "salem@wadirumadv.jo", phone: "+962 3 209 4400", city: "Wadi Rum", source: "SOCIAL_MEDIA", status: "LOST", estimatedValue: 7500, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000823", companyName: "Dabouq Office Supplies", contactName: "Fadi Issa", email: "fadi@dabouqoffice.jo", phone: "+962 6 552 5500", city: "Amman", source: "OTHER", status: "NEW", estimatedValue: 6800, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000824", companyName: "Shmeisani Corporate Catering", contactName: "Rana Haddadin", email: "rana@shmeisanicat.jo", phone: "+962 6 568 6600", city: "Amman", source: "EVENT", status: "QUALIFIED", estimatedValue: 56000, assignedToId: CEO_USER_ID },
  { id: "00000000-0000-4000-8000-000000000825", companyName: "Tabarbour Fresh Market", contactName: "Issa Khoury", email: "issa@tabarbour.jo", phone: "+962 6 489 7700", city: "Amman", source: "FIELD_SALES", status: "CONTACTED", estimatedValue: 10200, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000826", companyName: "Queen Alia Airport Retail", contactName: "Mona Al-Rashid", email: "mona@qaairport.jo", phone: "+962 6 445 8800", city: "Amman", source: "REFERRAL", status: "QUALIFIED", estimatedValue: 120000, assignedToId: CEO_USER_ID },
  { id: "00000000-0000-4000-8000-000000000827", companyName: "Sahab Industrial Park", contactName: "Ziad Hamdan", email: "ziad@sahabpark.jo", phone: "+962 6 402 9900", city: "Sahab", source: "WEBSITE", status: "NEW", estimatedValue: 34000, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000828", companyName: "Um Uthaina Grocery Chain", contactName: "Lama Abu Ghosh", email: "lama@umuthaina.jo", phone: "+962 6 551 1010", city: "Amman", source: "SOCIAL_MEDIA", status: "CONTACTED", estimatedValue: 16800, assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000829", companyName: "Balqa Agricultural Co-op", contactName: "Mahmoud Sweiss", email: "mahmoud@balqacoop.jo", phone: "+962 5 372 2020", city: "Balqa", source: "FIELD_SALES", status: "QUALIFIED", estimatedValue: 21500, assignedToId: SALES_USER_ID },
];

const OPPORTUNITIES: Array<{
  id: string;
  title: string;
  leadId?: string;
  customerId?: string;
  stage: OpportunityStage;
  estimatedValue: number;
  probability: number;
  expectedCloseDate: string;
  assignedToId: string;
  notes?: string;
}> = [
  { id: "00000000-0000-4000-8000-000000000830", title: "Jerash Heritage annual supply", leadId: "00000000-0000-4000-8000-000000000802", stage: "PROPOSAL", estimatedValue: 22000, probability: 60, expectedCloseDate: "2026-07-15", assignedToId: CEO_USER_ID },
  { id: "00000000-0000-4000-8000-000000000831", title: "Aqaba Port FMCG contract", leadId: "00000000-0000-4000-8000-000000000803", stage: "QUALIFICATION", estimatedValue: 45000, probability: 40, expectedCloseDate: "2026-08-01", assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000832", title: "Ma'an desert camp provisioning", leadId: "00000000-0000-4000-8000-000000000805", stage: "NEGOTIATION", estimatedValue: 18000, probability: 75, expectedCloseDate: "2026-06-30", assignedToId: CEO_USER_ID },
  { id: "00000000-0000-4000-8000-000000000833", title: "Ramtha hub distribution deal", leadId: "00000000-0000-4000-8000-000000000808", stage: "PROPOSAL", estimatedValue: 27500, probability: 55, expectedCloseDate: "2026-07-20", assignedToId: CEO_USER_ID },
  { id: "00000000-0000-4000-8000-000000000834", title: "Abdoun premium grocery rollout", leadId: "00000000-0000-4000-8000-000000000812", stage: "NEGOTIATION", estimatedValue: 38000, probability: 70, expectedCloseDate: "2026-06-25", assignedToId: CEO_USER_ID },
  { id: "00000000-0000-4000-8000-000000000835", title: "Zarqa free zone bulk order", leadId: "00000000-0000-4000-8000-000000000814", stage: "QUALIFICATION", estimatedValue: 52000, probability: 35, expectedCloseDate: "2026-08-15", assignedToId: CEO_USER_ID },
  { id: "00000000-0000-4000-8000-000000000836", title: "Dead Sea hotels beverage supply", customerId: "00000000-0000-4000-8000-000000000609", stage: "WON", estimatedValue: 85000, probability: 100, expectedCloseDate: "2026-05-01", assignedToId: CEO_USER_ID, notes: "Won — linked to converted lead" },
  { id: "00000000-0000-4000-8000-000000000837", title: "Northern Jordan expansion", customerId: "00000000-0000-4000-8000-000000000606", stage: "WON", estimatedValue: 42000, probability: 100, expectedCloseDate: "2026-04-20", assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000838", title: "Hillside chain pilot", customerId: "00000000-0000-4000-8000-000000000613", stage: "PROPOSAL", estimatedValue: 24000, probability: 50, expectedCloseDate: "2026-07-10", assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000839", title: "Shmeisani corporate catering", leadId: "00000000-0000-4000-8000-000000000824", stage: "PROPOSAL", estimatedValue: 56000, probability: 45, expectedCloseDate: "2026-08-30", assignedToId: CEO_USER_ID },
  { id: "00000000-0000-4000-8000-000000000840", title: "QAIA duty-free supply", leadId: "00000000-0000-4000-8000-000000000826", stage: "QUALIFICATION", estimatedValue: 120000, probability: 30, expectedCloseDate: "2026-09-15", assignedToId: CEO_USER_ID },
  { id: "00000000-0000-4000-8000-000000000841", title: "Sahab industrial park canteen", leadId: "00000000-0000-4000-8000-000000000827", stage: "PROSPECTING", estimatedValue: 34000, probability: 20, expectedCloseDate: "2026-09-01", assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000842", title: "Balqa co-op seasonal order", leadId: "00000000-0000-4000-8000-000000000829", stage: "PROSPECTING", estimatedValue: 21500, probability: 25, expectedCloseDate: "2026-07-05", assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000843", title: "Fuheis market trial", leadId: "00000000-0000-4000-8000-000000000809", stage: "LOST", estimatedValue: 5000, probability: 0, expectedCloseDate: "2026-05-10", assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000844", title: "Wadi Rum adventure packs", leadId: "00000000-0000-4000-8000-000000000822", stage: "LOST", estimatedValue: 7500, probability: 0, expectedCloseDate: "2026-05-20", assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000845", title: "Russeifa corner markets", leadId: "00000000-0000-4000-8000-000000000815", stage: "NEGOTIATION", estimatedValue: 15800, probability: 65, expectedCloseDate: "2026-06-28", assignedToId: SALES_USER_ID },
  { id: "00000000-0000-4000-8000-000000000846", title: "Ajloun forest products", leadId: "00000000-0000-4000-8000-000000000818", stage: "PROPOSAL", estimatedValue: 13200, probability: 50, expectedCloseDate: "2026-07-12", assignedToId: CEO_USER_ID },
  { id: "00000000-0000-4000-8000-000000000847", title: "Mafraq border wholesale", leadId: "00000000-0000-4000-8000-000000000807", stage: "QUALIFICATION", estimatedValue: 31000, probability: 40, expectedCloseDate: "2026-08-05", assignedToId: SALES_USER_ID },
];

const ACTIVITY_TYPES: CrmActivityType[] = ["CALL", "EMAIL", "MEETING", "TASK", "FOLLOW_UP"];

function buildActivities() {
  const activities: Array<{
    id: string;
    leadId?: string;
    opportunityId?: string;
    customerId?: string;
    type: CrmActivityType;
    subject: string;
    dueDate: string;
    completedAt?: string;
    assignedToId: string;
    notes?: string;
  }> = [];

  let seq = 0;
  const add = (a: Omit<(typeof activities)[number], "id">) => {
    seq += 1;
    activities.push({ id: `00000000-0000-4000-8000-000000000${850 + seq}`, ...a });
  };

  for (const lead of LEADS.slice(0, 20)) {
    add({
      leadId: lead.id,
      type: ACTIVITY_TYPES[seq % ACTIVITY_TYPES.length],
      subject: `Follow up with ${lead.contactName}`,
      dueDate: `2026-06-${String((seq % 28) + 1).padStart(2, "0")}`,
      assignedToId: lead.assignedToId,
      completedAt: seq % 3 === 0 ? "2026-06-15T10:00:00.000Z" : undefined,
    });
    add({
      leadId: lead.id,
      type: "CALL",
      subject: `Intro call — ${lead.companyName}`,
      dueDate: `2026-07-${String((seq % 20) + 1).padStart(2, "0")}`,
      assignedToId: lead.assignedToId,
    });
  }

  for (const opp of OPPORTUNITIES.slice(0, 12)) {
    add({
      opportunityId: opp.id,
      leadId: opp.leadId,
      customerId: opp.customerId,
      type: "MEETING",
      subject: `Review proposal — ${opp.title}`,
      dueDate: opp.expectedCloseDate,
      assignedToId: opp.assignedToId,
      completedAt: opp.stage === "WON" ? "2026-05-01T14:00:00.000Z" : undefined,
    });
  }

  for (let i = 0; activities.length < 60; i += 1) {
    const lead = LEADS[i % LEADS.length];
    add({
      leadId: lead.id,
      type: ACTIVITY_TYPES[i % ACTIVITY_TYPES.length],
      subject: `Check-in #${i + 1} — ${lead.companyName}`,
      dueDate: `2026-06-${String((i % 25) + 1).padStart(2, "0")}`,
      assignedToId: lead.assignedToId,
      completedAt: i % 4 === 0 ? "2026-06-10T09:00:00.000Z" : undefined,
      notes: i % 5 === 0 ? "Overdue follow-up from field visit" : undefined,
    });
  }

  return activities.slice(0, 60);
}

export async function seedCrm(prisma: PrismaClient) {
  await prisma.opportunityEvent.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.crmActivity.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.opportunity.deleteMany({ where: { organizationId: ORG_ID } });
  await prisma.lead.deleteMany({ where: { organizationId: ORG_ID } });

  let leadSeq = 0;
  for (const lead of LEADS) {
    leadSeq += 1;
    await prisma.lead.create({
      data: {
        id: lead.id,
        organizationId: ORG_ID,
        leadNumber: `LD-2026-${String(leadSeq).padStart(4, "0")}`,
        companyName: lead.companyName,
        contactName: lead.contactName,
        email: lead.email,
        phone: lead.phone,
        city: lead.city,
        source: lead.source,
        status: lead.status,
        estimatedValue: lead.estimatedValue,
        assignedToId: lead.assignedToId,
        convertedCustomerId: lead.convertedCustomerId ?? null,
        notes: lead.notes ?? null,
      },
    });
  }

  let oppSeq = 0;
  for (const opp of OPPORTUNITIES) {
    oppSeq += 1;
    const created = await prisma.opportunity.create({
      data: {
        id: opp.id,
        organizationId: ORG_ID,
        opportunityNumber: `OP-2026-${String(oppSeq).padStart(4, "0")}`,
        title: opp.title,
        leadId: opp.leadId ?? null,
        customerId: opp.customerId ?? null,
        stage: opp.stage,
        estimatedValue: opp.estimatedValue,
        probability: opp.probability,
        expectedCloseDate: new Date(opp.expectedCloseDate),
        assignedToId: opp.assignedToId,
        notes: opp.notes ?? null,
      },
      include: { assignedTo: { select: { name: true } } },
    });

    await prisma.opportunityEvent.create({
      data: {
        organizationId: ORG_ID,
        opportunityId: created.id,
        type: "CREATED",
        summary: `Opportunity created and assigned to ${created.assignedTo?.name ?? "unassigned"}`,
        actorId: opp.assignedToId,
      },
    });
  }

  const activities = buildActivities();
  for (const act of activities) {
    await prisma.crmActivity.create({
      data: {
        id: act.id,
        organizationId: ORG_ID,
        leadId: act.leadId ?? null,
        opportunityId: act.opportunityId ?? null,
        customerId: act.customerId ?? null,
        type: act.type,
        subject: act.subject,
        dueDate: new Date(act.dueDate),
        completedAt: act.completedAt ? new Date(act.completedAt) : null,
        assignedToId: act.assignedToId,
        notes: act.notes ?? null,
      },
    });
  }

  return {
    leads: LEADS.length,
    opportunities: OPPORTUNITIES.length,
    activities: activities.length,
  };
}
