# NeuroAutoText

![image](https://github.com/user-attachments/assets/4abd11a0-cf7d-4588-8dcd-14d354e64e46)

<h2>Установка Tampermonkey</h2>
<ol>
  <li>Скачиваем сам плагин для Google Chrome - <a href="https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo">tampermonkey</a></li>
  <li>Создаем в нем "Создать новый скрипт"</li>
  <li>Удаляем все, что там написано</li>
  <li>Вставляем содержимое моего файла NeuroAutoText.js</li>
  <li>Теперь в ChatGPT и Claude у вас внизу справа будет доступна форма для плана</li>
</ol>

<h2>Настройки</h2>
По сути настроек минимум и все находятся в начале кода под комментарием // Настройки.
В настройках всё просто 1 - активно, 0 - выключено.

<code>const DeleteFirstAnswer = 1;</code> - Будет писать ролевую модель, при 0 - не будет, т.е. вы должны ее задать сами в roleModel
<code>const HeaderAtFirstRow = 1;</code> - Будет брать первую строку плана в качестве заголовка статьи, при 0 - не будет
<code>const tryArticleSkeleton = 1;</code> - Будет 2-ым промтом просить сделать скелет статьи и в дальнейших промтах будет просить обращаться к нему, при 0 - не будет

Промты можете смело корректировать под себя, вот смысл:
<code>const nextlineBasePromt</code> - базовый промт в который подставляется пункта плана.
<code>const roleModel</code> - ваша ролевая модель.
<code>const roleModelDefault</code> - попытка создать ролевую модель через промт, если своя не указана.
<code>const withoutWater</code> - приставка помогающая нейросеть писать строго ответ.
<code>function createArticleSkeleton(lines)</code> - функция, которая группирует пункты плана и промт создающий скелет статьи.
<code>function processMiralinksLine(line)</code> - функция для статей под ссылки, пока не функционирует как надо.
<code>if (nextLine.toLowerCase().includes('введени'))</code> и ниже - это промты, которые подставляются, если в пункте плана встречаются определенные строки (в примере "введени", соответственно промт подгрузится, если в плане есть "Напиши **Введени**е" или просто "**Введени**е"). Это позволяет более гибко управлять промтами и планом.

Чтобы добавлять свои слова - копируйте:
<pre>else if (nextLine.toLowerCase().includes('таблиц')) {
                    promptText = `Помни, что общая тема статьи: "${ArticleTheme}. ` + nextlineBasePromt +
                        ` Учитывая весь контекст, который был ранее, продолжай писать статью. Сейчас опишем следующую секциюю этой статьи: "${nextLine}", но не повторяй то, что писал ранее, читать одно и то разными словами не интересно.
                        Ты можешь использовать либо только таблицу, либо использовать одновременно текст и таблицу. Таблица является ключевым элементом.` + withoutWater;
                }</pre>
![image](https://github.com/user-attachments/assets/2de903af-69f4-459d-8d82-e0a7525acbf4)
Изменяйте ".includes('таблиц')", где вместо "таблиц" - будет ваше слово.
Далее в <code>promptText = ` ` + withoutWater;</code> будет указан ваш промт с вставленными переменными, типа ${ArticleTheme}.

Смотрите видео по плагину: https://www.youtube.com/watch?v=Fj2kyaEmnw4
 
