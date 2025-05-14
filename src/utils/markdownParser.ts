import type * as MDAST from "mdast";
// import remarkParse from "remark-parse";
// import { unified } from "unified";
import type { Node } from "unist";

// Интерфейсы для структурированных данных

export interface ParsedCodeBlock {
  content: string;
  language?: string;
  isFoldable: boolean;
  foldTitle?: string;
}

export interface ParsedContentBlock {
  pathTitles: string[]; // Путь из заголовков, например ["JS", "Arrays"] для блока "Методы массива"
  blockTitle: string; // Непосредственный заголовок этого блока, например "Методы массива"
  blockLevel: number; // Уровень заголовка (1-4, соответствует количеству '#')
  textContent: string; // Собранный текстовый контент блока (не включая код)
  codeBlocks: ParsedCodeBlock[]; // Массив блоков кода внутри этого блока
  extractedUrls: string[]; // Поле для извлеченных URL-ссылок
}

export interface ParseMarkdownResult {
  filePath: string;
  mainCategory: string;
  subCategory: string;
  blocks: ParsedContentBlock[];
}

function parseCodeMeta(meta: string | null | undefined): {
  isFoldable: boolean;
  foldTitle?: string;
} {
  if (!meta) {
    return { isFoldable: false };
  }
  const foldRegex = /fold(?:[:="'](.*?)["'])?/;
  const match = meta.match(foldRegex);
  if (match) {
    return {
      isFoldable: true,
      foldTitle: match[1] ? match[1].trim() : undefined,
    };
  }
  return { isFoldable: false };
}

// Вспомогательная функция для извлечения всего текста из узлов заголовка
function extractFullTitleText(nodes: MDAST.Content[] | undefined): string {
  if (!nodes) return "";
  let text = "";
  for (const node of nodes) {
    if (node.type === "text") {
      text += node.value;
    } else if (node.type === "inlineCode") {
      // Пример обработки inlineCode
      text += (node as MDAST.InlineCode).value;
    } else if ("children" in node && (node as MDAST.Parent).children) {
      // Рекурсивно для вложенных элементов форматирования (например, emphasis, strong)
      text += extractFullTitleText(
        (node as MDAST.Parent).children as MDAST.Content[]
      );
    }
  }
  return text.trim();
}

// Новая рекурсивная функция для извлечения URL из AST узлов
const extractUrlsFromAstNode = (node: Node): string[] => {
  let urls: string[] = [];
  if ((node as MDAST.Link).type === "link") {
    const linkNode = node as MDAST.Link;
    if (linkNode.url) {
      urls.push(linkNode.url);
    }
  }

  if ((node as MDAST.Parent).children) {
    for (const child of (node as MDAST.Parent).children) {
      urls = urls.concat(extractUrlsFromAstNode(child));
    }
  }
  return urls;
};

export async function parseMarkdownContent(
  markdownContent: string,
  filePath: string
): Promise<ParseMarkdownResult> {
  const { unified } = await import("unified");
  const { default: remarkParse } = await import("remark-parse");

  const processor = unified().use(remarkParse);
  const ast = processor.parse(markdownContent);

  // --- Логика извлечения категорий ---
  let mainCategory = "Unknown";
  let subCategory = "Unknown";
  const pathParts = filePath.split("/");
  // Пример пути: /obsval/FrontEnd/SBORNICK/JS/Array.md
  // Индексы:      0/1     /2      /3       /4 /5
  // Нам нужен элемент после SBORNICK (индекс 3 + 1 = 4 для mainCategory, если SBORNICK на 3)
  const sbornickIndex = pathParts.indexOf("SBORNICK");
  if (sbornickIndex !== -1 && pathParts.length > sbornickIndex + 1) {
    mainCategory = pathParts[sbornickIndex + 1];
  }

  const fileNameWithExtension = pathParts[pathParts.length - 1];
  if (fileNameWithExtension) {
    const dotIndex = fileNameWithExtension.lastIndexOf(".");
    if (dotIndex > 0) {
      subCategory = fileNameWithExtension.substring(0, dotIndex);
    } else {
      subCategory = fileNameWithExtension; // Если нет расширения
    }
  }
  // --- Конец логики извлечения категорий ---

  const parsedBlocks: ParsedContentBlock[] = [];
  // Используем стек объектов {title, depth, rawMarkdownTitle} для управления иерархией
  let currentTitlePath: {
    title: string;
    depth: number;
    rawMarkdownTitle: string;
  }[] = [];
  let currentBlockChildren: MDAST.Content[] = []; // Содержимое (текст, код) текущего блока

  const extractBlockSpecificContent = (children: MDAST.Content[]) => {
    let textContent = "";
    const codeBlocks: ParsedCodeBlock[] = [];

    const extractTextRecursive = (node: Node) => {
      if ((node as MDAST.Text).value) {
        textContent += (node as MDAST.Text).value;
      }
      if ((node as MDAST.Parent).children) {
        ((node as MDAST.Parent).children as MDAST.Content[]).forEach(
          extractTextRecursive
        );
      }
    };

    children.forEach((child) => {
      if (child.type === "code") {
        const codeMeta = parseCodeMeta(child.meta);
        codeBlocks.push({
          content: child.value,
          language: child.lang || undefined,
          isFoldable: codeMeta.isFoldable,
          foldTitle: codeMeta.foldTitle,
        });
      } else if (child.type !== "heading") {
        extractTextRecursive(child);
        textContent += "\\n";
      }
    });
    return { textContent: textContent.trim(), codeBlocks };
  };

  const saveCollectedBlock = () => {
    // Сохраняем блок, только если есть родительский заголовок в пути и есть контент
    if (currentTitlePath.length > 0 && currentBlockChildren.length > 0) {
      const lastPathElement = currentTitlePath[currentTitlePath.length - 1];
      const blockTitle = lastPathElement.title;
      const blockLevel = lastPathElement.depth;
      const pathTitles = currentTitlePath.slice(0, -1).map((p) => p.title);

      const { textContent, codeBlocks } =
        extractBlockSpecificContent(currentBlockChildren);

      // Извлечение URL из AST узлов заголовка (используя сохраненные узлы, если есть)
      // Для этого нужно будет изменить currentTitlePath, чтобы хранить узлы, а не строку rawMarkdownTitle
      // Пока что оставим извлечение из строки, но это менее надежно.
      // Оптимально передавать сюда оригинальные AST узлы заголовка.
      // В данном шаге мы будем извлекать URL из currentBlockChildren (AST узлов основного контента)
      let urlsFromContentAst: string[] = [];
      currentBlockChildren.forEach((childNode) => {
        if (childNode.type !== "code") {
          // Не ищем ссылки в блоках кода
          urlsFromContentAst = urlsFromContentAst.concat(
            extractUrlsFromAstNode(childNode)
          );
        }
      });

      // Извлечение URL из AST узлов заголовка
      // Это потребует сохранения AST узлов заголовка в currentTitlePath
      // Пример: const urlsFromTitleAst = extractUrlsFromAstNode(lastPathElement.titleAstNode);
      // Сейчас мы не храним titleAstNode, поэтому из заголовков URL по-прежнему будут через regex по rawMarkdownTitle (если он есть)
      // или не будут вовсе, если rawMarkdownTitle был удален/изменен.
      // ДЛЯ КОРРЕКТНОЙ РАБОТЫ: нужно будет модифицировать currentTitlePath, чтобы хранить узлы заголовка.

      // Временное решение: продолжим использовать regex для rawMarkdownBlockTitle, если он есть, + AST для контента
      const urlRegex = /(https?:\/\/[^\s)]+)/gi;
      const urlsFromRawTitleString =
        lastPathElement.rawMarkdownTitle.match(urlRegex) || [];

      // Объединяем и удаляем дубликаты
      const allUrls = Array.from(
        new Set([...urlsFromRawTitleString, ...urlsFromContentAst])
      );

      if (textContent || codeBlocks.length > 0 || allUrls.length > 0) {
        parsedBlocks.push({
          pathTitles,
          blockTitle,
          blockLevel,
          textContent,
          codeBlocks,
          extractedUrls: allUrls, // Сохраняем объединенные и уникальные URL
        });
      }
    }
    currentBlockChildren = [];
  };

  // Вспомогательная функция для преобразования узлов AST в строку Markdown
  // Это упрощенная версия. Для полной точности может потребоваться remark-stringify.
  const stringifyAstNodes = (nodes: MDAST.Content[] | undefined): string => {
    if (!nodes) return "";
    return nodes
      .map((node) => {
        if (node.type === "text") return node.value;
        if (node.type === "link")
          return `[${stringifyAstNodes(node.children as MDAST.Content[])}](${
            node.url
          })`;
        if (node.type === "inlineCode") {
          const castNode = node as MDAST.InlineCode;
          return "`" + castNode.value + "`";
        }
        // Добавьте другие типы по мере необходимости
        if ("children" in node && (node as MDAST.Parent).children) {
          return stringifyAstNodes(
            (node as MDAST.Parent).children as MDAST.Content[]
          );
        }
        return "";
      })
      .join("");
  };

  (ast.children as MDAST.Content[]).forEach((node) => {
    if (node.type === "heading") {
      saveCollectedBlock();

      const rawTitleText = extractFullTitleText(
        node.children as MDAST.Content[]
      );
      const effectiveTitle = rawTitleText || "Untitled";
      const rawMarkdownTitleString = stringifyAstNodes(
        node.children as MDAST.Content[]
      ); // Получаем Markdown строку заголовка
      const newDepth = node.depth;

      while (
        currentTitlePath.length > 0 &&
        currentTitlePath[currentTitlePath.length - 1].depth >= newDepth
      ) {
        currentTitlePath.pop();
      }
      currentTitlePath.push({
        title: effectiveTitle,
        depth: newDepth,
        rawMarkdownTitle: rawMarkdownTitleString,
      });
    } else {
      if (currentTitlePath.length > 0) {
        // Собираем контент только если есть активный путь заголовков
        currentBlockChildren.push(node);
      }
    }
  });

  saveCollectedBlock();

  return {
    filePath,
    mainCategory,
    subCategory,
    blocks: parsedBlocks,
  };
}

// Пример использования (можно будет удалить или вынести в тесты)
/*
const exampleMarkdown = \`
# Уровень 1: JS
Some text for level 1.

## Уровень 2: Массивы
Text about arrays.
\`\`\`js
const arr = [1, 2, 3];
console.log(arr);
\`\`\`

Еще текст про массивы.

### Уровень 3: Метод map
Описание метода map.
\`\`\`ts fold:"Показать пример map"
arr.map(x => x * 2);
\`\`\`

#### Уровень 4: Тонкости map
Какие-то тонкости.

## Уровень 2: Объекты
Text about objects.
\`\`\`json
{ "key": "value" }
\`\`\`
\`;

const exampleFilePath = "/obsval/FrontEnd/SBORNICK/JS/ArrayAndObjects.md";
// const result = parseMarkdownContent(exampleMarkdown, exampleFilePath);
// console.log(JSON.stringify(result, null, 2));
*/
