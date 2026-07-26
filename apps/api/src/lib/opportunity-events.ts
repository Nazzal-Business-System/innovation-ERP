import type { OpportunityEventType, Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function logOpportunityEvent(
  tx: Tx,
  input: {
    organizationId: string;
    opportunityId: string;
    type: OpportunityEventType;
    summary: string;
    details?: string | null;
    actorId?: string | null;
  }
) {
  await tx.opportunityEvent.create({
    data: {
      organizationId: input.organizationId,
      opportunityId: input.opportunityId,
      type: input.type,
      summary: input.summary,
      details: input.details ?? null,
      actorId: input.actorId ?? null,
    },
  });
}
