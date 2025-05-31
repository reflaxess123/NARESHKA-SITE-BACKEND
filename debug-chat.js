const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function debugChat() {
  const roomId = "cmbc9exmu0001uvnl74jh38vm"; // ID комнаты из ошибки

  console.log(`Диагностика комнаты: ${roomId}`);
  console.log("=".repeat(50));

  // Проверяем существование комнаты
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      participants: {
        include: {
          user: {
            select: { id: true, email: true },
          },
        },
      },
    },
  });

  if (!room) {
    console.log("❌ Комната не найдена");
    return;
  }

  console.log(`✅ Комната найдена:`);
  console.log(`   ID: ${room.id}`);
  console.log(`   Тип: ${room.type}`);
  console.log(`   Активна: ${room.isActive}`);
  console.log(`   Создана: ${room.createdAt}`);
  console.log(`   Создатель: ${room.createdBy}`);

  console.log("\n👥 Участники:");
  if (room.participants.length === 0) {
    console.log("   ❌ Нет активных участников");
  } else {
    room.participants.forEach((participant, index) => {
      console.log(
        `   ${index + 1}. ${participant.user.email} (ID: ${
          participant.user.id
        })`
      );
      console.log(`      Активен: ${participant.isActive}`);
      console.log(`      Присоединился: ${participant.joinedAt}`);
      console.log(
        `      Последнее чтение: ${participant.lastReadAt || "Никогда"}`
      );
      console.log("");
    });
  }

  // Проверяем, какой пользователь сейчас аутентифицирован
  console.log("\n🔍 Проверка пользователя 123@123.ru:");
  const user = await prisma.user.findUnique({
    where: { email: "123@123.ru" },
  });

  if (!user) {
    console.log("   ❌ Пользователь 123@123.ru не найден");
    return;
  }

  console.log(`   ✅ Пользователь найден (ID: ${user.id})`);

  // Проверяем участие пользователя в комнате
  const participant = await prisma.chatParticipant.findFirst({
    where: {
      roomId: roomId,
      userId: user.id,
      isActive: true,
    },
  });

  if (!participant) {
    console.log(
      "   ❌ Пользователь НЕ является активным участником этой комнаты"
    );

    // Проверяем, есть ли неактивная запись
    const inactiveParticipant = await prisma.chatParticipant.findFirst({
      where: {
        roomId: roomId,
        userId: user.id,
        isActive: false,
      },
    });

    if (inactiveParticipant) {
      console.log("   ⚠️  Найдена неактивная запись участника");
    }
  } else {
    console.log("   ✅ Пользователь является активным участником");
  }

  console.log("\n💡 Возможные решения:");
  if (!participant) {
    console.log(
      "   1. Добавить пользователя в комнату как активного участника"
    );
    console.log("   2. Проверить логику создания/присоединения к комнате");
  }
}

debugChat()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
