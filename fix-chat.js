const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function fixChatAccess() {
  const roomId = "cmbc9exmu0001uvnl74jh38vm";
  const userEmail = "123@123.ru";

  console.log("🔧 Исправление доступа к чату...");
  console.log("=".repeat(50));

  try {
    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      console.log(`❌ Пользователь ${userEmail} не найден`);
      return;
    }

    console.log(`✅ Пользователь найден: ${user.email} (ID: ${user.id})`);

    // Проверяем комнату
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          include: {
            user: { select: { email: true, id: true } },
          },
        },
      },
    });

    if (!room) {
      console.log(`❌ Комната ${roomId} не найдена`);
      return;
    }

    console.log(`✅ Комната найдена: ${room.type} чат`);

    // Проверяем, есть ли уже участник
    const existingParticipant = await prisma.chatParticipant.findFirst({
      where: {
        roomId: roomId,
        userId: user.id,
      },
    });

    if (existingParticipant) {
      if (existingParticipant.isActive) {
        console.log("✅ Пользователь уже является активным участником");
        return;
      } else {
        // Активируем участника
        await prisma.chatParticipant.update({
          where: { id: existingParticipant.id },
          data: {
            isActive: true,
            joinedAt: new Date(),
          },
        });
        console.log("✅ Участник реактивирован");
      }
    } else {
      // Добавляем нового участника
      await prisma.chatParticipant.create({
        data: {
          roomId: roomId,
          userId: user.id,
          isActive: true,
        },
      });
      console.log("✅ Пользователь добавлен как участник");
    }

    // Проверяем результат
    const updatedRoom = await prisma.chatRoom.findUnique({
      where: { id: roomId },
      include: {
        participants: {
          where: { isActive: true },
          include: {
            user: { select: { email: true, id: true } },
          },
        },
      },
    });

    console.log("\n👥 Текущие активные участники:");
    updatedRoom.participants.forEach((participant, index) => {
      console.log(
        `   ${index + 1}. ${participant.user.email} (ID: ${
          participant.user.id
        })`
      );
    });

    console.log(
      "\n🎉 Проблема исправлена! Пользователь теперь может получить доступ к чату."
    );
  } catch (error) {
    console.error("❌ Ошибка при исправлении:", error);
  }
}

fixChatAccess()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
