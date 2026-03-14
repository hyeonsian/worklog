import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("worklog1234", 12);

  const user = await prisma.user.upsert({
    where: { email: "admin@worklog.com" },
    update: {},
    create: {
      email: "admin@worklog.com",
      password: hashedPassword,
      name: "Admin",
    },
  });

  console.log("Seeded user:", user.email);

  // Seed some default tags
  const tags = [
    { name: "업무", color: "#6366f1" },
    { name: "회의", color: "#f59e0b" },
    { name: "개인", color: "#10b981" },
    { name: "중요", color: "#ef4444" },
    { name: "아이디어", color: "#8b5cf6" },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }

  console.log("Seeded tags:", tags.map((t) => t.name).join(", "));

  // Seed sample entries
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.entry.upsert({
    where: { id: "sample-daily-1" },
    update: {},
    create: {
      id: "sample-daily-1",
      title: "오늘의 업무 일지",
      content: `# 오늘의 업무 일지\n\n## 오전\n- 팀 스탠드업 미팅\n- 프로젝트 기획서 작성\n- 코드 리뷰\n\n## 오후\n- 기능 개발 (로그인 모듈)\n- 버그 수정\n- 문서화 작업\n\n## 내일 할 일\n- 테스트 코드 작성\n- PR 제출`,
      type: "DAILY",
      date: today,
      userId: user.id,
    },
  });

  await prisma.entry.upsert({
    where: { id: "sample-meeting-1" },
    update: {},
    create: {
      id: "sample-meeting-1",
      title: "주간 팀 미팅",
      content: `# 주간 팀 미팅\n\n**날짜**: ${today.toLocaleDateString("ko-KR")}\n**참석자**: 팀 전원\n\n## 안건\n1. 지난주 진행 상황 공유\n2. 이번 주 목표 설정\n3. 이슈 및 블로커 논의\n\n## 결정 사항\n- 스프린트 목표: 로그인/회원가입 완성\n- 다음 미팅: 다음 주 월요일 10시`,
      type: "MEETING",
      date: today,
      userId: user.id,
    },
  });

  await prisma.entry.upsert({
    where: { id: "sample-memo-1" },
    update: {},
    create: {
      id: "sample-memo-1",
      title: "개발 참고 메모",
      content: `# 개발 참고 메모\n\n## Next.js App Router 주의사항\n- 서버 컴포넌트 기본\n- 'use client' 명시 필요\n- API Routes는 route.ts 사용\n\n## 유용한 링크\n- [Next.js 공식 문서](https://nextjs.org/docs)\n- [Tailwind CSS](https://tailwindcss.com)\n- [Prisma](https://prisma.io)`,
      type: "MEMO",
      date: today,
      userId: user.id,
    },
  });

  // Seed sample todos
  await prisma.todo.upsert({
    where: { id: "sample-todo-1" },
    update: {},
    create: {
      id: "sample-todo-1",
      title: "프로젝트 기획서 작성",
      done: true,
      userId: user.id,
    },
  });

  await prisma.todo.upsert({
    where: { id: "sample-todo-2" },
    update: {},
    create: {
      id: "sample-todo-2",
      title: "로그인 기능 개발",
      done: false,
      dueDate: today,
      userId: user.id,
    },
  });

  await prisma.todo.upsert({
    where: { id: "sample-todo-3" },
    update: {},
    create: {
      id: "sample-todo-3",
      title: "테스트 코드 작성",
      done: false,
      userId: user.id,
    },
  });

  console.log("Seeded sample entries and todos");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
