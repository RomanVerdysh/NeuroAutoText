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

<code>const DeleteFirstAnswer</code> = 1; // Будет писать ролевую модель, при 0 - не будет, т.е. вы должны ее задать сами в roleModel
const HeaderAtFirstRow = 1; // Будет брать первую строку плана в качестве заголовка статьи, при 0 - не будет
const tryArticleSkeleton = 1; // Будет 2-ым промтом просить сделать скелет статьи и в дальнейших промтах будет просить обращаться к нему, при 0 - не будет

Промты можете смело корректировать под себя, вот смысл:
<pre>const nextlineBasePromt</pre> - базовый промт в который подставляется пункта плана.
