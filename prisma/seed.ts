import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

try {
  process.loadEnvFile(path.join(__dirname, "..", ".env"));
} catch {
  // No .env file (e.g. env vars injected directly in production) — ignore.
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function hoursFromNow(hours: number) {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d;
}

const FILLER_FIRST_NAMES = [
  "Jordan",
  "Casey",
  "Riley",
  "Morgan",
  "Taylor",
  "Avery",
  "Dana",
  "Quinn",
  "Reese",
  "Skyler",
  "Emerson",
  "Hayden",
  "Rowan",
  "Sasha",
  "Drew",
];
const FILLER_LAST_NAMES = [
  "Nguyen",
  "Okafor",
  "Kowalski",
  "Bianchi",
  "Fernandez",
  "Larsen",
  "Park",
  "Haddad",
  "Ivanov",
  "Costa",
  "Mercer",
  "Whitfield",
  "Suzuki",
  "Alvarado",
  "Novak",
];

async function main() {
  console.log("Resetting existing data...");
  await prisma.moduleProgress.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.module.deleteMany();
  await prisma.course.deleteMany();
  await prisma.liveSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.instructor.deleteMany();
  await prisma.department.deleteMany();
  await prisma.tenant.deleteMany();

  console.log("Creating tenant...");
  const tenant = await prisma.tenant.create({
    data: {
      name: "Acme Academy",
      slug: "acme-academy",
      domain: "academy.acmecorp.io",
      primaryColor: "#2563eb",
      radius: "rounded-lg",
      fontPairing: "Plus Jakarta Sans",
      themeMode: "LIGHT",
      hideWatermark: false,
      customEmailDomain: "academy.acmecorp.io",
      customEmailVerified: true,
      ssoProvider: "Okta Enterprise Directory",
      ssoEnabled: true,
      seatLimit: 2000,
    },
  });

  console.log("Creating departments...");
  const deptNames = [
    "Global Operations",
    "Engineering Core",
    "Product & Design",
    "Commercial Sales",
  ];
  const departments = new Map<string, string>();
  for (const name of deptNames) {
    const dept = await prisma.department.create({
      data: { tenantId: tenant.id, name },
    });
    departments.set(name, dept.id);
  }

  console.log("Creating instructors...");
  const instructorDefs = [
    { name: "Dr. Harrison Vance", title: "Principal Distributed Systems Architect" },
    { name: "Dr. Rachel Vance", title: "VP AI Research, Core Platform" },
    { name: "Marcus Sterling", title: "Principal Staff SRE, Infra" },
    { name: "Maya Chen", title: "Staff Database Engineer" },
    { name: "Lucas Silva", title: "Senior Platform Engineer" },
    { name: "Sarah Connor", title: "Principal Systems Engineer" },
    { name: "Elena Rostova", title: "VP Product Analytics" },
    { name: "Dev Platform Guild", title: "Acme Engineering" },
    { name: "People & Culture", title: "Acme People Team" },
    { name: "InfoSec Council", title: "Governance & Risk" },
    { name: "AI Platform Group", title: "Infrastructure Guild" },
  ];
  const instructors = new Map<string, string>();
  for (const def of instructorDefs) {
    const instructor = await prisma.instructor.create({
      data: { tenantId: tenant.id, name: def.name, title: def.title },
    });
    instructors.set(def.name, instructor.id);
  }

  console.log("Creating admin + demo learner...");
  const demoPasswordHash = hashPassword("demo1234");
  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "Eleanor Vance",
      email: "eleanor.vance@acme.corp",
      role: "SUPER_ADMIN",
      jobTitle: "Super Admin",
      departmentId: departments.get("Global Operations"),
      passwordHash: demoPasswordHash,
    },
  });

  const alex = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "Alex Rivera",
      email: "alex.rivera@acme.corp",
      role: "LEARNER",
      jobTitle: "Systems Architecture",
      departmentId: departments.get("Engineering Core"),
      weeklyGoalHours: 5,
      weeklyHoursLogged: 4.5,
      streakDays: 12,
      ceuCredits: 18.5,
      rankPoints: 1510,
      passwordHash: demoPasswordHash,
    },
  });

  console.log("Creating leaderboard peers...");
  const leaderboardPeers = [
    { name: "Elena Vance", jobTitle: "Cloud Core Team", dept: "Engineering Core", points: 1820 },
    { name: "Marcus Osei", jobTitle: "DevOps Lead", dept: "Engineering Core", points: 1640 },
    { name: "Priya Patel", jobTitle: "Data Governance", dept: "Commercial Sales", points: 1390 },
  ];
  for (const peer of leaderboardPeers) {
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: peer.name,
        email: `${peer.name.toLowerCase().replace(/\s+/g, ".")}@acme.corp`,
        role: "LEARNER",
        jobTitle: peer.jobTitle,
        departmentId: departments.get(peer.dept),
        rankPoints: peer.points,
      },
    });
  }

  console.log("Creating compliance roster examples...");
  const rosterExamples = [
    { name: "Marcus Thorne", email: "m.thorne@acme.corp" },
    { name: "Samantha Lin", email: "s.lin@acme.corp" },
    { name: "David Kalu", email: "d.kalu@acme.corp" },
    { name: "Alena Rossi", email: "a.rossi@acme.corp" },
    { name: "Julian Moretti", email: "j.moretti@acme.corp" },
  ];
  const rosterUsers: { id: string; name: string; email: string }[] = [];
  for (const person of rosterExamples) {
    const u = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: person.name,
        email: person.email,
        role: "LEARNER",
        departmentId: departments.get("Global Operations"),
      },
    });
    rosterUsers.push(u);
  }

  console.log("Creating filler learners for realistic department counts...");
  const fillerUsers: { id: string; departmentName: string }[] = [];
  let fillerIndex = 0;
  for (const deptName of deptNames) {
    const count = deptName === "Global Operations" ? 10 : deptName === "Engineering Core" ? 16 : deptName === "Commercial Sales" ? 12 : 8;
    for (let i = 0; i < count; i++) {
      const first = FILLER_FIRST_NAMES[fillerIndex % FILLER_FIRST_NAMES.length];
      const last = FILLER_LAST_NAMES[(fillerIndex * 3) % FILLER_LAST_NAMES.length];
      fillerIndex++;
      const u = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          name: `${first} ${last}`,
          email: `${first}.${last}.${fillerIndex}@acme.corp`.toLowerCase(),
          role: "LEARNER",
          departmentId: departments.get(deptName),
          weeklyHoursLogged: Math.round(Math.random() * 8 * 10) / 10,
          streakDays: Math.floor(Math.random() * 15),
          ceuCredits: Math.round(Math.random() * 20 * 10) / 10,
          rankPoints: Math.floor(300 + Math.random() * 1300),
        },
      });
      fillerUsers.push({ id: u.id, departmentName: deptName });
    }
  }

  console.log("Creating courses...");

  // Featured course with full module/lesson breakdown (Alex's "Continue Learning")
  const kafkaCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("Dr. Harrison Vance"),
      title: "Advanced System Architecture & Event-Driven Kafka",
      description:
        "Unit 4.3: Partitioning strategies, zero-copy data transport, and high-throughput leader election mechanics across distributed edge nodes.",
      category: "Engineering",
      difficulty: "ADVANCED",
      ceuCredits: 5,
      durationHours: 22,
      rating: 4.8,
      ratingCount: 96,
    },
  });
  const kafkaModuleDefs = [
    { title: "Distributed Storage Engine Fundamentals", lessons: 2 },
    { title: "Log Structured Merge-Trees (LSM)", lessons: 2 },
    { title: "Broker Topologies & Zookeeper/KRaft", lessons: 2 },
    { title: "Event-Driven Kafka Clusters", lessons: 3 },
    { title: "Exactly-Once Processing (EOS) Semantics", lessons: 1 },
    { title: "Capstone Architecture Defense Lab", lessons: 1 },
  ];
  const kafkaModules: { id: string; title: string; lessonCount: number }[] = [];
  for (let i = 0; i < kafkaModuleDefs.length; i++) {
    const def = kafkaModuleDefs[i];
    const mod = await prisma.module.create({
      data: { courseId: kafkaCourse.id, title: def.title, order: i + 1 },
    });
    for (let l = 0; l < def.lessons; l++) {
      await prisma.lesson.create({
        data: {
          moduleId: mod.id,
          title: `${def.title} — Lesson ${l + 1}`,
          order: l + 1,
          durationMinutes: 20 + l * 10,
        },
      });
    }
    kafkaModules.push({ id: mod.id, title: def.title, lessonCount: def.lessons });
  }

  const securityCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("InfoSec Council"),
      title: "Enterprise Security & Data Governance",
      description: "Module 2: SOC2 Type II compliance, zero-trust perimeter auth, and GDPR data retention vaults.",
      category: "Security & GRC",
      difficulty: "INTERMEDIATE",
      ceuCredits: 2,
      durationHours: 6,
      rating: 4.6,
      ratingCount: 58,
      isMandatory: true,
      dueDate: daysFromNow(5),
    },
  });

  const observabilityCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("Dev Platform Guild"),
      title: "Cloud-Native Observability Sprint",
      description: "OpenTelemetry tracing pipelines and Grafana dashboard generation for microservices.",
      category: "Dev Platform",
      difficulty: "ADVANCED",
      ceuCredits: 3,
      durationHours: 8,
      rating: 4.7,
      ratingCount: 40,
      isCohort: true,
    },
  });

  const postgresCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("Maya Chen"),
      title: "PostgreSQL Deep Internals & Query Tuning",
      description: "WAL flushing, query planner internals, and index strategy at enterprise scale.",
      category: "Data & AI",
      difficulty: "ADVANCED",
      ceuCredits: 3.5,
      durationHours: 10,
      rating: 4.8,
      ratingCount: 71,
    },
  });

  const k8sOperatorCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("Lucas Silva"),
      title: "Kubernetes Production Operator Patterns",
      description: "Live lab sandbox covering operator SDK design and production rollout patterns.",
      category: "DevOps",
      difficulty: "ADVANCED",
      ceuCredits: 4,
      durationHours: 12,
      rating: 4.7,
      ratingCount: 63,
    },
  });

  const rustCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("Sarah Connor"),
      title: "Rust for High-Frequency Services",
      description: "Zero-cost abstractions and lock-free data structures for latency-critical services.",
      category: "Systems",
      difficulty: "ADVANCED",
      ceuCredits: 4,
      durationHours: 11,
      rating: 4.9,
      ratingCount: 88,
    },
  });

  const zeroTrustLlmCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("InfoSec Council"),
      title: "Zero-Trust & Enterprise LLM Deployment Guardrails",
      description:
        "Required for ISO 27001 & SOC2 Type II compliance standards, covering LLM deployment guardrails and zero-trust boundaries.",
      category: "Security & GRC",
      difficulty: "INTERMEDIATE",
      ceuCredits: 2,
      durationHours: 1.75,
      rating: 4.6,
      ratingCount: 34,
      isMandatory: true,
      dueDate: daysFromNow(14),
    },
  });

  const ragCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("Dr. Rachel Vance"),
      title: "Applied Generative AI Architecture & RAG Systems",
      description:
        "Hands-on cohort covering production embedding pipelines, semantic routers, evaluation frameworks, and scalable inference clusters.",
      category: "Data & AI",
      difficulty: "ADVANCED",
      ceuCredits: 4.5,
      durationHours: 14,
      rating: 4.9,
      ratingCount: 142,
      isCohort: true,
      cohortTeamPercent: 68,
    },
  });

  const k8sInfraCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("Marcus Sterling"),
      title: "Enterprise Kubernetes & Cloud Native Infrastructure",
      description:
        "Deep architectural mastery of Istio service meshes, Cilium eBPF networking, GitOps deployment policies, and multitenant isolation.",
      category: "Engineering",
      difficulty: "ADVANCED",
      ceuCredits: 5,
      durationHours: 22,
      rating: 4.8,
      ratingCount: 218,
      isCohort: true,
      cohortTeamPercent: 84,
    },
  });

  const saasMetricsCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("Elena Rostova"),
      title: "Data-Driven SaaS Metrics & Retention Loops",
      description:
        "Master cohort-based churn calculation, Net Revenue Retention modeling, and instrumentation loops for enterprise PLG motions.",
      category: "Product Growth",
      difficulty: "INTERMEDIATE",
      ceuCredits: 2,
      durationHours: 3.5,
      rating: 4.9,
      ratingCount: 310,
    },
  });

  const idpCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("Dev Platform Guild"),
      title: "Internal Developer Platform & Kubernetes 1.30",
      description:
        "Streamlining ephemeral preview environments, Backstage portal customization, and zero-downtime cluster rollouts.",
      category: "Dev Platform",
      difficulty: "ADVANCED",
      ceuCredits: 3.5,
      durationHours: 5,
      rating: 4.8,
      ratingCount: 184,
    },
  });

  const psychSafetyCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("People & Culture"),
      title: "Psychological Safety & High-Velocity Feedback",
      description:
        "Practical techniques for radical candor, effective async retrospectives, blameless post-mortems, and inclusive team culture.",
      category: "Culture & Org",
      difficulty: "ALL_LEVELS",
      ceuCredits: 1.5,
      durationHours: 2,
      rating: 5.0,
      ratingCount: 420,
    },
  });

  const vectorDbCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("AI Platform Group"),
      title: "Vector Database Optimization & RAG at Scale",
      description:
        "HNSW indexing deep dive, product quantization, hybrid BM25 + dense search reranking, and multi-tenant vector storage isolation.",
      category: "AI Engineering",
      difficulty: "ADVANCED",
      ceuCredits: 3,
      durationHours: 6.5,
      rating: 4.9,
      ratingCount: 205,
    },
  });

  const soc2Course = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("InfoSec Council"),
      title: "SOC2 Type II & ISO 27001 Continuous Compliance",
      description:
        "Evidence collection automation, access reviews protocol, cryptographic key lifecycle, and zero-incident vendor assessment.",
      category: "Security & GRC",
      difficulty: "INTERMEDIATE",
      ceuCredits: 1.5,
      durationHours: 1.5,
      rating: 4.7,
      ratingCount: 540,
      isMandatory: true,
      dueDate: daysFromNow(21),
    },
  });

  const promptEngCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("AI Platform Group"),
      title: "Enterprise Prompt Engineering & AI Safety",
      description: "Applied prompt-engineering patterns and safety evaluation for production LLM systems.",
      category: "Data & AI",
      difficulty: "INTERMEDIATE",
      ceuCredits: 3,
      durationHours: 9,
      rating: 4.9,
      ratingCount: 296,
      passRatePercent: 96,
    },
  });

  const zeroTrustCloudCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("InfoSec Council"),
      title: "Zero-Trust Cloud Architecture & Identity",
      description: "Identity-first cloud security architecture for distributed enterprise workloads.",
      category: "Security & GRC",
      difficulty: "ADVANCED",
      ceuCredits: 3.5,
      durationHours: 8,
      rating: 4.6,
      ratingCount: 214,
      passRatePercent: 91,
    },
  });

  const gdprCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("InfoSec Council"),
      title: "Data Governance & Global Privacy (GDPR/CPRA)",
      description: "Global privacy program design covering GDPR, CPRA, and cross-border data transfer.",
      category: "Legal & Privacy",
      difficulty: "INTERMEDIATE",
      ceuCredits: 2.5,
      durationHours: 6,
      rating: 4.5,
      ratingCount: 180,
      passRatePercent: 87,
    },
  });

  const phishingCourse = await prisma.course.create({
    data: {
      tenantId: tenant.id,
      instructorId: instructors.get("InfoSec Council"),
      title: "Q3 Cyber Security Awareness & Phishing Defense",
      description: "Required for ISO 27001 & SOC2 Type II compliance standards; phishing simulation included.",
      category: "Security & GRC",
      difficulty: "ALL_LEVELS",
      ceuCredits: 1,
      durationHours: 1.5,
      rating: 4.4,
      ratingCount: 130,
      isMandatory: true,
      dueDate: daysFromNow(6),
    },
  });

  console.log("Enrolling Alex Rivera...");

  const kafkaEnrollment = await prisma.enrollment.create({
    data: {
      userId: alex.id,
      courseId: kafkaCourse.id,
      progressPercent: 68,
      completedLessons: 7,
      totalLessons: 11,
      hoursLogged: 15,
      status: "IN_PROGRESS",
      startedAt: daysFromNow(-30),
      lastActiveAt: new Date(),
    },
  });
  const moduleStatuses: Record<string, "COMPLETED" | "ACTIVE" | "LOCKED"> = {
    "Distributed Storage Engine Fundamentals": "COMPLETED",
    "Log Structured Merge-Trees (LSM)": "COMPLETED",
    "Broker Topologies & Zookeeper/KRaft": "COMPLETED",
    "Event-Driven Kafka Clusters": "ACTIVE",
    "Exactly-Once Processing (EOS) Semantics": "LOCKED",
    "Capstone Architecture Defense Lab": "LOCKED",
  };
  for (const mod of kafkaModules) {
    await prisma.moduleProgress.create({
      data: {
        enrollmentId: kafkaEnrollment.id,
        moduleId: mod.id,
        status: moduleStatuses[mod.title],
      },
    });
  }

  await prisma.enrollment.create({
    data: {
      userId: alex.id,
      courseId: securityCourse.id,
      progressPercent: 40,
      completedLessons: 2,
      totalLessons: 5,
      hoursLogged: 3,
      status: "IN_PROGRESS",
      startedAt: daysFromNow(-10),
      lastActiveAt: daysFromNow(-1),
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: alex.id,
      courseId: observabilityCourse.id,
      progressPercent: 85,
      completedLessons: 11,
      totalLessons: 13,
      hoursLogged: 9,
      status: "IN_PROGRESS",
      startedAt: daysFromNow(-20),
      lastActiveAt: daysFromNow(-2),
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: alex.id,
      courseId: postgresCourse.id,
      progressPercent: 54,
      completedLessons: 6,
      totalLessons: 11,
      hoursLogged: 5.2,
      status: "IN_PROGRESS",
      startedAt: daysFromNow(-15),
      lastActiveAt: daysFromNow(-1),
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: alex.id,
      courseId: k8sOperatorCourse.id,
      progressPercent: 32,
      completedLessons: 3,
      totalLessons: 9,
      hoursLogged: 3.8,
      status: "IN_PROGRESS",
      startedAt: daysFromNow(-8),
      lastActiveAt: daysFromNow(-3),
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: alex.id,
      courseId: rustCourse.id,
      progressPercent: 92,
      completedLessons: 10,
      totalLessons: 11,
      hoursLogged: 11,
      status: "IN_PROGRESS",
      startedAt: daysFromNow(-45),
      lastActiveAt: daysFromNow(-1),
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: alex.id,
      courseId: zeroTrustLlmCourse.id,
      progressPercent: 60,
      completedLessons: 3,
      totalLessons: 5,
      hoursLogged: 1.05,
      status: "IN_PROGRESS",
      startedAt: daysFromNow(-4),
      lastActiveAt: new Date(),
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: alex.id,
      courseId: psychSafetyCourse.id,
      progressPercent: 100,
      completedLessons: 4,
      totalLessons: 4,
      hoursLogged: 2,
      status: "COMPLETED",
      startedAt: daysFromNow(-90),
      completedAt: daysFromNow(-60),
      satisfactionScore: 5,
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: alex.id,
      courseId: ragCourse.id,
      progressPercent: 0,
      completedLessons: 0,
      totalLessons: 8,
      status: "NOT_STARTED",
      isSaved: true,
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: alex.id,
      courseId: k8sInfraCourse.id,
      progressPercent: 0,
      completedLessons: 0,
      totalLessons: 10,
      status: "NOT_STARTED",
      isSaved: true,
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: alex.id,
      courseId: vectorDbCourse.id,
      progressPercent: 0,
      completedLessons: 0,
      totalLessons: 7,
      status: "NOT_STARTED",
      isSaved: true,
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: alex.id,
      courseId: soc2Course.id,
      progressPercent: 0,
      completedLessons: 0,
      totalLessons: 3,
      status: "OVERDUE",
      lastActiveAt: daysFromNow(-8),
    },
  });

  console.log("Creating certificates for Alex...");
  await prisma.certificate.create({
    data: {
      userId: alex.id,
      courseId: kafkaCourse.id,
      title: "Lead Architect Certification",
      credentialId: "ACM-94810-ENG",
      status: "ACTIVE",
      issuedAt: new Date("2024-10-14"),
    },
  });
  await prisma.certificate.create({
    data: {
      userId: alex.id,
      courseId: rustCourse.id,
      title: "Rust High-Performance Systems Certification",
      credentialId: "ACM-77213-SYS",
      status: "ACTIVE",
      issuedAt: daysFromNow(-60),
    },
  });
  await prisma.certificate.create({
    data: {
      userId: alex.id,
      courseId: k8sOperatorCourse.id,
      title: "Kubernetes Cloud Native Operator Certification",
      credentialId: "ACM-30021-OPS",
      status: "UNDER_REVIEW",
      issuedAt: daysFromNow(-2),
    },
  });

  console.log("Seeding roster + filler compliance enrollments...");
  const complianceCourses = [securityCourse, zeroTrustLlmCourse, soc2Course, phishingCourse];

  const [marcusThorne, samanthaLin, davidKalu, alenaRossi, julianMoretti] = rosterUsers;

  await prisma.enrollment.create({
    data: {
      userId: marcusThorne.id,
      courseId: phishingCourse.id,
      progressPercent: 100,
      completedLessons: 4,
      totalLessons: 4,
      status: "COMPLETED",
      startedAt: daysFromNow(-14),
      completedAt: new Date(),
      lastActiveAt: new Date(),
    },
  });
  await prisma.enrollment.create({
    data: {
      userId: samanthaLin.id,
      courseId: phishingCourse.id,
      progressPercent: 65,
      completedLessons: 2,
      totalLessons: 4,
      status: "IN_PROGRESS",
      startedAt: daysFromNow(-9),
      lastActiveAt: daysFromNow(-1),
    },
  });
  await prisma.enrollment.create({
    data: {
      userId: davidKalu.id,
      courseId: phishingCourse.id,
      progressPercent: 20,
      completedLessons: 1,
      totalLessons: 4,
      status: "OVERDUE",
      startedAt: daysFromNow(-16),
      lastActiveAt: daysFromNow(-8),
    },
  });
  await prisma.enrollment.create({
    data: {
      userId: alenaRossi.id,
      courseId: promptEngCourse.id,
      progressPercent: 100,
      completedLessons: 9,
      totalLessons: 9,
      status: "COMPLETED",
      startedAt: daysFromNow(-40),
      completedAt: new Date("2024-10-14"),
      lastActiveAt: new Date("2024-10-14"),
    },
  });
  await prisma.enrollment.create({
    data: {
      userId: julianMoretti.id,
      courseId: phishingCourse.id,
      progressPercent: 0,
      completedLessons: 0,
      totalLessons: 4,
      status: "OVERDUE",
    },
  });

  console.log("Seeding filler enrollments across the department for realistic KPIs...");
  for (const filler of fillerUsers) {
    const course = complianceCourses[Math.floor(Math.random() * complianceCourses.length)];
    const roll = Math.random();
    const status = roll < 0.72 ? "COMPLETED" : roll < 0.88 ? "IN_PROGRESS" : "OVERDUE";
    const totalLessons = 4;
    const completedLessons =
      status === "COMPLETED" ? totalLessons : status === "IN_PROGRESS" ? Math.ceil(totalLessons * 0.5) : 0;
    await prisma.enrollment.create({
      data: {
        userId: filler.id,
        courseId: course.id,
        progressPercent: (completedLessons / totalLessons) * 100,
        completedLessons,
        totalLessons,
        status,
        startedAt: status === "OVERDUE" ? undefined : daysFromNow(-Math.floor(Math.random() * 30)),
        completedAt: status === "COMPLETED" ? daysFromNow(-Math.floor(Math.random() * 20)) : undefined,
        lastActiveAt: status === "OVERDUE" ? daysFromNow(-Math.floor(Math.random() * 10) - 3) : daysFromNow(-Math.floor(Math.random() * 5)),
      },
    });

    // A second, non-mandatory enrollment for catalog adoption realism
    const otherCourses = [promptEngCourse, zeroTrustCloudCourse, gdprCourse, saasMetricsCourse, idpCourse];
    const other = otherCourses[Math.floor(Math.random() * otherCourses.length)];
    const otherRoll = Math.random();
    if (otherRoll < 0.6) {
      await prisma.enrollment
        .create({
          data: {
            userId: filler.id,
            courseId: other.id,
            progressPercent: Math.floor(Math.random() * 100),
            completedLessons: Math.floor(Math.random() * 6),
            totalLessons: 8,
            status: otherRoll < 0.4 ? "COMPLETED" : "IN_PROGRESS",
            startedAt: daysFromNow(-Math.floor(Math.random() * 60)),
            lastActiveAt: daysFromNow(-Math.floor(Math.random() * 10)),
          },
        })
        .catch(() => undefined);
    }
  }

  console.log("Creating monthly-trend historical completions (May-Oct)...");
  const monthsAgoCounts = [
    { monthsAgo: 5, count: 22 },
    { monthsAgo: 4, count: 28 },
    { monthsAgo: 3, count: 34 },
    { monthsAgo: 2, count: 41 },
    { monthsAgo: 1, count: 48 },
    { monthsAgo: 0, count: 53 },
  ];
  const trendCourse = promptEngCourse;
  let trendUserIdx = 0;
  for (const bucket of monthsAgoCounts) {
    for (let i = 0; i < Math.min(bucket.count, fillerUsers.length); i++) {
      const filler = fillerUsers[trendUserIdx % fillerUsers.length];
      trendUserIdx++;
      const completedAt = new Date();
      completedAt.setMonth(completedAt.getMonth() - bucket.monthsAgo);
      await prisma.enrollment
        .create({
          data: {
            userId: filler.id,
            courseId: trendCourse.id,
            progressPercent: 100,
            completedLessons: 9,
            totalLessons: 9,
            status: "COMPLETED",
            startedAt: completedAt,
            completedAt,
            lastActiveAt: completedAt,
            satisfactionScore: 4 + Math.random(),
          },
        })
        .catch(() => undefined);
    }
  }

  console.log("Creating live sessions...");
  const raftSession = await prisma.liveSession.create({
    data: {
      tenantId: tenant.id,
      title: "Distributed Consensus & Raft in Production",
      type: "LIVE_QA",
      hostName: "Dr. Harrison Vance",
      startsAt: hoursFromNow(24),
    },
  });
  const kafkaClinicSession = await prisma.liveSession.create({
    data: {
      tenantId: tenant.id,
      title: "Kafka Architecture Code Review Clinic",
      type: "OFFICE_HOURS",
      hostName: "Dr. Harrison Vance",
      startsAt: daysFromNow(5),
    },
  });

  console.log("Seeding live session registrations...");
  const shuffledFillers = [...fillerUsers].sort(() => Math.random() - 0.5);
  await prisma.liveSessionRegistration.createMany({
    data: shuffledFillers.slice(0, 42).map((f) => ({ liveSessionId: raftSession.id, userId: f.id })),
  });
  await prisma.liveSessionRegistration.createMany({
    data: shuffledFillers.slice(0, 18).map((f) => ({ liveSessionId: kafkaClinicSession.id, userId: f.id })),
  });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
