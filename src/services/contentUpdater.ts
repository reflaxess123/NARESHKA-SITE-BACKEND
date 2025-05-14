import { Prisma, PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
// import { createClient as createWebDAVClient, FileStat } from "webdav"; // Old import
import type { FileStat } from "webdav"; // New type-only import for FileStat
import { parseMarkdownContent } from "../utils/markdownParser";

dotenv.config(); // Для доступа к process.env

const prisma = new PrismaClient();

const webDAVUrl = process.env.WEBDAV_URL;
const webDAVUsername = process.env.WEBDAV_USERNAME;
const webDAVPassword = process.env.WEBDAV_PASSWORD;

interface WebDAVFile extends FileStat {
  // Расширяем FileStat, если нужно будет добавить специфичные поля
}

export async function updateContentFromWebDAV(
  baseDirectoryPath: string = "/obsval/FrontEnd/SBORNICK/"
): Promise<{
  status: string;
  processedFiles: number;
  createdFiles: number;
  updatedFiles: number;
  createdBlocks: number;
  errors: { filePath: string; error: string }[];
}> {
  const summary = {
    status: "started",
    processedFiles: 0,
    createdFiles: 0,
    updatedFiles: 0,
    createdBlocks: 0,
    errors: [] as { filePath: string; error: string }[],
  };

  if (!webDAVUrl || !webDAVUsername || !webDAVPassword) {
    console.error(
      "WebDAV credentials are not configured in environment variables for contentUpdater."
    );
    summary.status = "Failed: WebDAV credentials not configured.";
    return summary;
  }

  try {
    const { createClient: createWebDAVClient } = await import("webdav"); // Dynamic import
    const webDAVClient = createWebDAVClient(webDAVUrl, {
      username: webDAVUsername,
      password: webDAVPassword,
    });

    console.log(
      `Starting content update from WebDAV path: ${baseDirectoryPath}`
    );

    // Шаг 0: Удаление всех существующих ContentFile (и каскадно ContentBlock, UserContentProgress)
    console.log("Deleting all existing content from the database...");
    const deletedFilesResult = await prisma.contentFile.deleteMany({});
    console.log(
      `Deleted ${deletedFilesResult.count} ContentFile records (and their related blocks/progress).`
    );
    // Можно также отдельно удалить UserContentProgress, если есть записи, не связанные с ContentBlock, но по идее каскад должен сработать.
    // const deletedProgressResult = await prisma.userContentProgress.deleteMany({});
    // console.log(`Deleted ${deletedProgressResult.count} UserContentProgress records.`);

    // Шаг 1: Получение списка всех .md файлов из WebDAV
    console.log("Fetching file list from WebDAV...");
    const allItemsFromWebDAV = (await webDAVClient.getDirectoryContents(
      baseDirectoryPath,
      { deep: true, details: true }
    )) as WebDAVFile[]; // Expecting FileStat[] directly

    // Проверяем, что allItemsFromWebDAV является массивом
    if (!Array.isArray(allItemsFromWebDAV)) {
      const errorMsg =
        "Unexpected response structure from WebDAV: getDirectoryContents did not return an array.";
      console.error(errorMsg, allItemsFromWebDAV);
      summary.status = `Failed: ${errorMsg}`;
      summary.errors.push({ filePath: "GENERAL", error: errorMsg });
      return summary;
    }

    const mdFiles = allItemsFromWebDAV.filter(
      (item) => item.type === "file" && item.filename.endsWith(".md")
    );

    console.log(`Found ${mdFiles.length} .md files to process.`);

    // Шаг 2: Итерация по каждому файлу
    for (const mdFile of mdFiles) {
      const filePath = mdFile.filename;
      summary.processedFiles++;
      console.log(`Processing file: ${filePath}`);

      try {
        const fileContent = (await webDAVClient.getFileContents(filePath, {
          format: "text",
        })) as string;

        const parsedResult = await parseMarkdownContent(fileContent, filePath);

        // Поскольку все ContentFile были удалены в Шаге 0, мы всегда будем создавать новые.
        // Логика поиска и обновления ContentFile (if (contentFileEntry) { ... }) удалена.

        const contentFileEntry = await prisma.contentFile.create({
          data: {
            webdavPath: filePath,
            mainCategory: parsedResult.mainCategory,
            subCategory: parsedResult.subCategory,
            // createdAt и updatedAt будут установлены Prisma автоматически
          },
        });
        summary.createdFiles++;
        console.log(`Created ContentFile: ${filePath}`);

        let blocksInThisFile = 0;
        for (const [index, parsedBlock] of parsedResult.blocks.entries()) {
          // Добавляем index для orderInFile
          const firstCodeBlock =
            parsedBlock.codeBlocks && parsedBlock.codeBlocks.length > 0
              ? parsedBlock.codeBlocks[0]
              : null;

          await prisma.contentBlock.create({
            data: {
              file: { connect: { id: contentFileEntry.id } }, // Исправлено
              pathTitles: parsedBlock.pathTitles as Prisma.InputJsonValue, // Указываем тип для Prisma
              blockTitle: parsedBlock.blockTitle,
              blockLevel: parsedBlock.blockLevel,
              textContent: parsedBlock.textContent,
              orderInFile: index, // Заполняем orderInFile
              // Данные из первого блока кода (если есть)
              codeContent: firstCodeBlock?.content,
              codeLanguage: firstCodeBlock?.language,
              isCodeFoldable: firstCodeBlock?.isFoldable ?? false,
              codeFoldTitle: firstCodeBlock?.foldTitle,
              extractedUrls: parsedBlock.extractedUrls, // Добавляем извлеченные URL
            },
          });
          blocksInThisFile++;
        }
        summary.createdBlocks += blocksInThisFile;
        console.log(
          `Created ${blocksInThisFile} ContentBlock(s) for ${filePath}`
        );
      } catch (fileProcessingError: unknown) {
        let errorMessage = "An unknown error occurred during file processing";
        if (fileProcessingError instanceof Error) {
          errorMessage = fileProcessingError.message;
        } else if (typeof fileProcessingError === "string") {
          errorMessage = fileProcessingError;
        }
        console.error(`Error processing file ${filePath}:`, errorMessage);
        summary.errors.push({
          filePath,
          error: errorMessage,
        });
      }
    }

    summary.status = "Completed";
    console.log("Content update completed.");
  } catch (error: unknown) {
    let generalErrorMessage =
      "An unknown error occurred updating content from WebDAV";
    if (error instanceof Error) {
      generalErrorMessage = error.message;
    } else if (typeof error === "string") {
      generalErrorMessage = error;
    }
    console.error("Error updating content from WebDAV:", generalErrorMessage);
    summary.status = `Failed: ${generalErrorMessage}`;
    summary.errors.push({ filePath: "GENERAL", error: generalErrorMessage });
  }

  console.log("Update summary:", summary);
  return summary;
}
