#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Скрипт для конвертации экспортированного файла Anki в файлы Markdown для Obsidian.
Конвертирует HTML в Markdown и организует карточки по категориям с группировкой по 50 штук.
"""

import re
import os
import html
from collections import defaultdict
from pathlib import Path


class AnkiToObsidianConverter:
    def __init__(self, input_file):
        self.input_file = input_file
        self.output_dir = "obsidian_cards"
        self.cards_per_file = 50
        
    def clean_html(self, text):
        """Очищает и конвертирует HTML в Markdown"""
        if not text:
            return ""
            
        # Декодируем HTML entities
        text = html.unescape(text)
        
        # Удаляем лишние кавычки в начале и конце
        text = text.strip('"')
        
        # Конвертируем изображения из HTML в Markdown (обрабатываем двойные кавычки)
        # Ищем изображения с двойными кавычками внутри src
        text = re.sub(r'<img[^>]*src=""([^"]+)""[^>]*>', r'![[\1]]', text)
        # Также обрабатываем обычные одиночные кавычки на всякий случай
        text = re.sub(r'<img[^>]*src="([^"]+)"[^>]*>', r'![[\1]]', text)
        
        # Конвертируем HTML теги в Markdown
        text = re.sub(r'<br\s*/?>', '\n', text)
        text = re.sub(r'</?div[^>]*>', '\n', text)
        text = re.sub(r'</?p[^>]*>', '\n', text)
        text = re.sub(r'<b>(.*?)</b>', r'**\1**', text, flags=re.DOTALL)
        text = re.sub(r'<strong>(.*?)</strong>', r'**\1**', text, flags=re.DOTALL)
        text = re.sub(r'<i>(.*?)</i>', r'*\1*', text, flags=re.DOTALL)
        text = re.sub(r'<em>(.*?)</em>', r'*\1*', text, flags=re.DOTALL)
        text = re.sub(r'<code>(.*?)</code>', r'`\1`', text, flags=re.DOTALL)
        text = re.sub(r'<pre[^>]*>(.*?)</pre>', r'```\n\1\n```', text, flags=re.DOTALL)
        
        # Конвертируем заголовки
        text = re.sub(r'<h(\d)[^>]*>(.*?)</h\d>', lambda m: '#' * int(m.group(1)) + ' ' + m.group(2), text, flags=re.DOTALL)
        
        # Улучшенная обработка списков
        # Обрабатываем вложенные списки
        def convert_list_items(match):
            list_content = match.group(1)
            # Заменяем <li> на элементы списка
            list_content = re.sub(r'<li[^>]*>(.*?)</li>', r'- \1', list_content, flags=re.DOTALL)
            # Очищаем от остатков HTML тегов
            list_content = re.sub(r'<[^>]+>', '', list_content)
            return list_content.strip()
        
        # Обрабатываем ненумерованные списки
        text = re.sub(r'<ul[^>]*>(.*?)</ul>', convert_list_items, text, flags=re.DOTALL)
        # Обрабатываем нумерованные списки
        def convert_ordered_list_items(match):
            list_content = match.group(1)
            items = re.findall(r'<li[^>]*>(.*?)</li>', list_content, flags=re.DOTALL)
            result = []
            for i, item in enumerate(items, 1):
                # Очищаем от HTML тегов
                item = re.sub(r'<[^>]+>', '', item)
                result.append(f"{i}. {item.strip()}")
            return '\n'.join(result)
        
        text = re.sub(r'<ol[^>]*>(.*?)</ol>', convert_ordered_list_items, text, flags=re.DOTALL)
        
        # Удаляем оставшиеся HTML теги
        text = re.sub(r'<[^>]+>', '', text)
        
        # Очищаем лишние пробелы и переносы строк
        text = re.sub(r'\n\s*\n', '\n\n', text)  # Убираем множественные переносы
        text = re.sub(r'&nbsp;', ' ', text)  # Заменяем неразрывные пробелы
        text = text.strip()
        
        return text
    
    def parse_anki_file(self):
        """Парсит файл экспорта Anki"""
        cards = []
        
        try:
            with open(self.input_file, 'r', encoding='utf-8') as file:
                lines = file.readlines()
        except UnicodeDecodeError:
            # Попробуем другую кодировку
            with open(self.input_file, 'r', encoding='windows-1251') as file:
                lines = file.readlines()
        
        for line_num, line in enumerate(lines, 1):
            line = line.strip()
            
            # Пропускаем заголовки и пустые строки
            if line.startswith('#') or not line:
                continue
                
            # Разделяем строку по табуляции
            parts = line.split('\t')
            
            if len(parts) < 5:
                continue
                
            card_id = parts[0]
            difficulty = parts[1]  # Простая
            category = parts[2]    # СБОРНИК::HTML&CSS&ОБЩИЕ
            question = parts[3]    # Вопрос
            answer = parts[4] if len(parts) > 4 else ""  # Ответ
            
            # Очищаем данные
            question = self.clean_html(question)
            answer = self.clean_html(answer)
            
            cards.append({
                'id': card_id,
                'difficulty': difficulty,
                'category': category,
                'question': question,
                'answer': answer
            })
            
        return cards
    
    def group_cards_by_category(self, cards):
        """Группирует карточки по категориям"""
        categories = defaultdict(list)
        
        for card in cards:
            # Извлекаем основную категорию из строки типа "СБОРНИК::HTML&CSS&ОБЩИЕ"
            category_path = card['category']
            if '::' in category_path:
                main_category = category_path.split('::')[1]
            else:
                main_category = category_path
                
            categories[main_category].append(card)
            
        return categories
    
    def create_markdown_content(self, cards, category_name, file_number):
        """Создает содержимое Markdown файла"""
        content = f"# {category_name}\n\n"
        
        for i, card in enumerate(cards, 1):
            # Создаем краткий заголовок из вопроса, убирая изображения
            short_title = self.clean_title_from_images(card['question'])[:80].replace('\n', ' ').strip()
            if len(card['question']) > 80:
                short_title += "..."
            if not short_title:
                short_title = f"Вопрос {i}"
                
            # Заголовок второго уровня с номером вопроса
            content += f"### {i}. {short_title}\n\n"
            
            # Постановка задачи
            content += f"**Постановка задачи:**  \n{card['question']}\n\n"
            
            # Сворачиваемый блок с ответом
            if card['answer']:
                content += f"> [!NOTE]- ОТВЕТ\n"
                # Добавляем отступы для содержимого блока
                answer_lines = card['answer'].split('\n')
                for line in answer_lines:
                    if line.strip():
                        content += f"> {line}\n"
                    else:
                        content += ">\n"
                content += "\n"
            
            content += "---\n\n"
            
        return content
    
    def sanitize_filename(self, filename):
        # Удаляем недопустимые символы для имен файлов
        return re.sub(r'[<>:"/\\|?*&]', '', filename).replace(' ', '')
        
    def clean_title_from_images(self, title):
        """Удаляет изображения из заголовков"""
        # Удаляем ссылки на изображения в формате Obsidian
        title = re.sub(r'!\[\[.*?\]\]', '', title)
        # Удаляем HTML изображения если они остались
        title = re.sub(r'<img[^>]*>', '', title)
        # Очищаем лишние пробелы
        title = re.sub(r'\s+', ' ', title).strip()
        return title

    def convert(self):
        """Основной метод конвертации"""
        print("Парсинг файла Anki...")
        cards = self.parse_anki_file()
        print(f"Найдено {len(cards)} карточек")
        
        print("Группировка по категориям...")
        categories = self.group_cards_by_category(cards)
        print(f"Найдено {len(categories)} категорий")
        
        # Создаем выходную директорию
        Path(self.output_dir).mkdir(exist_ok=True)
        
        # Обрабатываем каждую категорию
        for category_name, category_cards in categories.items():
            print(f"Обработка категории: {category_name} ({len(category_cards)} карточек)")
            
            # Создаем поддиректорию для категории
            category_dir = Path(self.output_dir) / self.sanitize_filename(category_name)
            category_dir.mkdir(exist_ok=True)
            
            # Разбиваем карточки на группы по 50 штук
            for i in range(0, len(category_cards), self.cards_per_file):
                chunk = category_cards[i:i + self.cards_per_file]
                file_number = (i // self.cards_per_file) + 1
                
                # Создаем имя файла
                if len(category_cards) <= self.cards_per_file:
                    filename = f"{self.sanitize_filename(category_name)}.md"
                else:
                    filename = f"{self.sanitize_filename(category_name)}_часть_{file_number}.md"
                
                # Создаем содержимое файла
                content = self.create_markdown_content(chunk, category_name, file_number)
                
                # Записываем файл
                file_path = category_dir / filename
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
                
                print(f"  Создан файл: {file_path}")
        
        print(f"\nКонвертация завершена! Файлы сохранены в директории: {self.output_dir}")


def main():
    input_file = "Все колоды.txt"
    
    if not os.path.exists(input_file):
        print(f"Ошибка: файл '{input_file}' не найден!")
        return
    
    converter = AnkiToObsidianConverter(input_file)
    converter.convert()


if __name__ == "__main__":
    main() 