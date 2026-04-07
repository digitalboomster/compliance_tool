import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('ChangeMe!123', 12)

  const officer = await prisma.user.upsert({
    where: { email: 'officer@savvybee.internal' },
    update: {},
    create: {
      email: 'officer@savvybee.internal',
      passwordHash,
      name: 'A. Officer',
      role: 'COMPLIANCE_OFFICER',
    },
  })

  await prisma.user.upsert({
    where: { email: 'admin@savvybee.internal' },
    update: {},
    create: {
      email: 'admin@savvybee.internal',
      passwordHash,
      name: 'Admin User',
      role: 'ADMIN',
    },
  })

  const existing = await prisma.complianceCase.count()
  if (existing > 0) {
    console.log('Seed skipped: cases already exist')
    return
  }

  const slaSoon = new Date(Date.now() + 2 * 3600000)
  const slaOverdue = new Date(Date.now() - 3600000)

  await prisma.complianceCase.create({
    data: {
      publicId: 'CB-4589',
      type: 'KYC verification',
      risk: 'MEDIUM',
      status: 'IN_REVIEW',
      customerName: 'Ada M.',
      customerRef: 'cust_ada_01',
      country: 'United Kingdom',
      phoneMasked: '+44 •••• ••892',
      applicationSummary: 'Retail savings onboarding',
      slaDueAt: slaSoon,
      assignedOfficerId: officer.id,
      checks: {
        create: [
          { name: 'Identity provider', state: 'PASSED' },
          {
            name: 'Sanctions screening',
            state: 'REVIEW',
            detail:
              'Potential name match on OFAC list (ref #9921). Requires analyst clearance or false-positive mark.',
          },
        ],
      },
      riskFactors: {
        create: [
          { label: 'New jurisdiction', level: 'Low', highlight: false },
          { label: 'Transaction velocity', level: 'High', highlight: true },
          { label: 'Account age', level: '< 1 day', highlight: false },
        ],
      },
      timeline: {
        create: [
          {
            at: new Date('2026-03-30T14:22:00Z'),
            actorType: 'SYSTEM',
            text: 'Documents received; virus scan passed.',
          },
          {
            at: new Date('2026-03-30T13:05:00Z'),
            actorType: 'SYSTEM',
            text: 'Sanctions batch returned: 1 possible hit.',
          },
          {
            at: new Date('2026-03-30T12:18:00Z'),
            actorType: 'USER',
            actorUserId: officer.id,
            text: 'Case pulled from queue for review.',
          },
        ],
      },
    },
  })

  await prisma.complianceCase.create({
    data: {
      publicId: 'CB-4590',
      type: 'Sanctions review',
      risk: 'HIGH',
      status: 'ESCALATED',
      customerName: 'Liam S.',
      country: 'Nigeria',
      phoneMasked: '+234 ••• ••• 441',
      applicationSummary: 'Virtual account funding',
      slaDueAt: slaOverdue,
      checks: {
        create: [
          { name: 'Corporate registry', state: 'PASSED' },
          {
            name: 'UBO screening',
            state: 'REVIEW',
            detail: 'Secondary entity on watchlist (low confidence).',
          },
        ],
      },
      riskFactors: {
        create: [{ label: 'Cross-border', level: 'High', highlight: true }],
      },
      timeline: {
        create: [
          {
            at: new Date('2026-03-30T09:00:00Z'),
            actorType: 'SYSTEM',
            text: 'Escalated: SLA breach warning.',
          },
          {
            at: new Date('2026-03-29T18:00:00Z'),
            actorType: 'USER',
            actorUserId: officer.id,
            text: 'Requested senior sign-off.',
          },
        ],
      },
    },
  })

  await prisma.complianceCase.create({
    data: {
      publicId: 'CB-4591',
      type: 'Flagged transaction',
      risk: 'LOW',
      status: 'PENDING',
      customerName: 'Sofia R.',
      country: 'Portugal',
      phoneMasked: '+351 ••• ••• 102',
      applicationSummary: 'Peer transfer',
      slaDueAt: new Date(Date.now() + 6 * 3600000),
      checks: {
        create: [
          {
            name: 'Velocity rules',
            state: 'REVIEW',
            detail: 'Spike vs 30-day baseline.',
          },
        ],
      },
      riskFactors: {
        create: [{ label: 'Velocity', level: 'Medium', highlight: false }],
      },
      timeline: {
        create: [
          {
            at: new Date('2026-03-30T08:15:00Z'),
            actorType: 'SYSTEM',
            text: 'Transaction held for review.',
          },
        ],
      },
    },
  })

  await prisma.vendorProcessor.create({
    data: {
      name: 'iRecharge Tech-Innovations Ltd',
      contactEmail: 'support@irecharge.com.ng',
      notes: 'Utility & VA partner — SB-COMP-SPEC-2026-001',
    },
  })

  console.log('Seed complete. Login: officer@savvybee.internal / ChangeMe!123')
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
