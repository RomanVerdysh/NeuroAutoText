// ==UserScript==
// @name         Пишем статью по плану через Claude.ai & ChatGPT
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Process articles based on different plans
// @author       Роман Вердыш, сайт Romanus.ru, телеграм-канал: https://t.me/craftseo
// @match        claude.ai/*
// @match        chatgpt.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Настройки
    const DeleteFirstAnswer = 1; // Удаление первого ответа, если даем вводный промт
    const HeaderAtFirstRow = 1; // Первая строка - тема статья
    const tryArticleSkeleton = 1; // Пробуем сделать скелет из плана во 2 ответе

    const useArticleSkeletonIfNeeded = tryArticleSkeleton === 1 ? ` Используй скелет статьи из второго промта. В нем для каждолго пункта плана указано о чем в нем должно рассказываться.` : '';

    // Укажи свой базовый промт для пункта плана, если нет - будет дефолтный
    const nextlineBasePromt = `Используй инструкции из первого промта.` + useArticleSkeletonIfNeeded + ` На основе полученного названия следующей секции создай подходящий для нее заголовок H2.
    В секции только один заголовок H2. Пиши содержательно и целенаправленно, придерживаясь заданного пункта плана в рамках нашей темы статьи.`;

    // Укажи свою ролевую модель, если нет - будет дефолтный
    const roleModel = ``;
    const roleModelDefault = `Мы будем писать статью на тему, которую я укажу далее. Писать будем согласно редакционной политики ресурса "Лайфхакер", но помни, что ты пишешь не справку, а интересную статью, которую будет читать человек.
    Не стоит использовать списке в каждой секции, используй их только там, где это действительно необходимо.
    Перед написанием статьи нужно определиться, кто ее должен писать и для какой аудитории они будет полезна, чтобы понимать какую лексику использовать. Отвечай строго на вопросы, не пиши лишних слов.
    Я хочу чтобы ты указал явно ответы на следующие вопросы:
    1. На основе темы статьи и ее ориентировочного плана напиши краткое изложение статьи в небольшой связанном тексте.
    2. Укажи 2 наиболее очевидные целевые аудитории, которым эта тема будет интересна?
    3. Какую подачу использовать? Например, речь, формат, тон, специфику и прочие черты стоит выбрать? Я хочу чтобы читающие понимали, что статью писал эксперт, а не новичок.
    4. Какой специалист смог бы наиболее полно описать эту тему?
    5. В несколько предложений опиши идеального автора, который мог бы написать полезную статью для целевой аудитории, учитывая ответы на 4 предыдущих вопроса. Попытайся описать автора.`;

    const withoutWater = ` В твоем ответе я хочу видеть только секцию моей статьи. Тебе запрещено комментировать мои промты, извиняться, писать подведение к ответу, рассказывать что-то кроме того, что будет применимо в статьи, писать что ты делаешь, жаловаться, говорить что ты чего-то не можешь сделать и так далее.
    Просто дай мне то, что я у тебя попросил без лишних слов. Это критически важно!`;



    const url = window.location.href;
    let inputSelector, sendButtonSelector, clearInput, sendPrompt;
    let startMessagesCount = 0;
    let isExpanded = false;
    let processedItems = [];
    let ArticleTheme = '';
    let articleStructure = [];

    function executeChatCommand(text) {
        // Проверка копирайта
        const copyrightElement = document.querySelector('p[id="copyright"]');
        const hasCopyright = copyrightElement && copyrightElement.innerHTML.includes("Крафтовое SEO");

        if (url.includes("claude.ai")) {
            if (hasCopyright) {
                inputSelector = document.querySelector('div[contenteditable="true"]');
                sendButtonSelector = 'div[data-value="new chat"], button[aria-label="Send Message"]';
            } else {
                // Измененные селекторы в случае отсутствия копирайта
                inputSelector = document.querySelector('div[cоntenteditab1е="true"]');
                sendButtonSelector = 'div[data-va1uе="new chat"], buttоn[ariа-1abe1="Send Message"]';
            }

            clearInput = () => {
                if (inputSelector) inputSelector.innerHTML = '';
            };

            sendPrompt = () => {
                if (inputSelector) {
                    const promptText = document.createElement('span');
                    promptText.textContent = text;
                    inputSelector.appendChild(promptText);
                }
            };
        } else if (url.includes("chatgpt.com")) {
            inputSelector = document.querySelector('div[contenteditable="true"].ProseMirror');
            sendButtonSelector = 'button[data-testid="send-button"]';

            clearInput = () => {
                if (inputSelector) {
                    inputSelector.innerHTML = '';
                    inputSelector.dispatchEvent(new Event('input', { bubbles: true }));
                }
            };

            sendPrompt = () => {
                if (inputSelector) {
                    inputSelector.innerHTML = text;
                    inputSelector.dispatchEvent(new Event('input', { bubbles: true }));
                }
            };
        }
        else {
            console.error("Неизвестный сайт.");
            return Promise.reject("Неизвестный сайт.");
        }

        if (!inputSelector) {
            console.error("Не найден элемент ввода.");
            return Promise.reject("Не найден элемент ввода.");
        }

        clearInput();
        sendPrompt();

        return new Promise((resolve) => {
            setTimeout(() => {
                const sendButton = document.querySelector(sendButtonSelector);
                if (sendButton) {
                    sendButton.click();
                    if (url.includes("claude.ai")) {
                        startMessagesCount = document.querySelectorAll('[data-test-render-count]').length;
                    } else if (url.includes("chatgpt.com")) {
                        startMessagesCount = document.querySelectorAll('div.agent-turn').length;
                    }
                    console.log("Начальное количество сообщений:", startMessagesCount);
                    resolve();
                } else {
                    console.error("Кнопка отправки не найдена.");
                    resolve();
                }
            }, 1000);
        });
    }



    let currentTab = 'plan';
    let articleTopic = '';
    let lines = [];
    let isProcessing = false;

    const container = document.createElement('div');
    container.id = 'RomanusMainDiv';
    container.style.position = 'fixed';
    container.style.bottom = '10px';
    container.style.right = '10px';
    container.style.zIndex = '9999';
    container.style.background = 'white';
    container.style.color = 'black';
    container.style.padding = '10px';
    container.style.border = '1px solid black';
    container.style.width = '450px';
    container.style.height = '100px';
    container.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';
    container.style.transition = 'height 0.3s ease';
    container.style.overflow = 'hidden';
    container.style.cursor = 'move';

    const header = document.createElement('div');
    header.style.cursor = 'move';
    container.appendChild(header);

    const toggleButton = document.createElement('button');
    toggleButton.textContent = 'Развернуть';
    toggleButton.style.marginBottom = '10px';
    toggleButton.style.cursor = 'pointer';
    container.appendChild(toggleButton);

    const content = document.createElement('div');
    content.style.display = 'none';
    container.appendChild(content);

    const tabs = document.createElement('div');
    tabs.style.display = 'flex';
    content.appendChild(tabs);

    const planTab = document.createElement('button');
    planTab.id = 'plan';
    planTab.textContent = 'Статья по плану';
    planTab.style.padding = '4px 5px';
    planTab.style.border = '1px solid black';
    planTab.style.flex = '1';
    tabs.appendChild(planTab);

    const miralinksTab = document.createElement('button');
    miralinksTab.id = 'miralinks';
    miralinksTab.textContent = 'Статья для Miralinks';
    miralinksTab.style.padding = '4px 5px';
    miralinksTab.style.border = '1px solid black';
    miralinksTab.style.flex = '1';
    tabs.appendChild(miralinksTab);

    container.appendChild(tabs);

    const textarea = document.createElement('textarea');
    textarea.rows = '10';
    textarea.style.width = '100%';
    textarea.style.marginBottom = '10px';
    textarea.style.cursor = 'text';
    content.appendChild(textarea);

    const buttons = document.createElement('div');
    buttons.style.display = 'flex';

    const startButton = document.createElement('button');
    startButton.textContent = 'Начать';
    startButton.style.padding = '4px 5px';
    startButton.style.border = '1px solid black';
    startButton.style.width = '40%';
    startButton.style.marginTop = '1%';
    buttons.appendChild(startButton);

    const copyButton = document.createElement('button');
    copyButton.textContent = 'Сохранить в html';
    copyButton.style.padding = '4px 5px';
    copyButton.style.border = '1px solid black';
    copyButton.style.width = '40%';
    copyButton.style.marginLeft = '1%';
    copyButton.style.marginTop = '1%';
    buttons.appendChild(copyButton);

    const copyright = document.createElement('div');
    copyright.style.display = 'flex';

    const copyright_p = document.createElement('p');
    copyright_p.id = 'copyright';
    copyright_p.style.fontSize = '12px';
    copyright_p.style.marginTop = '10px';
    copyright_p.style.color = '#666';
    copyright_p.innerHTML = 'Telegram-канал автора: <a href="https://t.me/craftseo"><u>Крафтовое SEO</u></a>';
    copyright.appendChild(copyright_p);


    content.appendChild(buttons);
    container.appendChild(content);
    content.appendChild(copyright);
    document.body.appendChild(container);


    function createArticleSkeleton(lines) {
        articleStructure = lines;
        let ArticleTheme

        let structureText = articleStructure.map((item, index) => `${item}`).join("; ");

        let promptText = `Создайте подробный план статьи. `;
        if (ArticleTheme) {
            promptText = `Создайте подробный план статьи на тему '${ArticleTheme}'. `;
        }
        promptText += `План должен соответствовать следующим требованиям:
        1) Начните с указания темы статьи.
        2) Разделите статью на секции, где каждая секция имеет заголовок H2 соответсвующий моему пункту плана (точь в точь). Не допускается создавать другие H2 заголовки.
        3) Под каждым заголовком H2 укажите 'Соответствует пункту плана: ' и добавьте соответствующий пункт из следующего списка:\n
        ${structureText}\n
        4) Для каждой секции предоставьте детальное описание содержания данной секции в виде одного абзаца. Описание содержания пишется в формате "что нужно сделать, о чем писать". Т.е. явно указывай "Расскажи" или "Опиши" или "Сравни" и т.д. Это описание должно: Быть конкретным и информативным; Включать основные подтемы и аспекты, которые нужно раскрыть; Предлагать конкретные цифры, сравнения или примеры, где это уместно; Давать четкие указания о том, что должно быть включено в каждый раздел.
        5) Убедитесь, что описание содержания охватывает все ключевые аспекты указанной данного пункта плана.
        6) Сделайте описание содержания достаточно детальным, чтобы автор мог написать полную, информативную и конкурентоспособную статью, опираясь только на это описание содержания. Пожалуйста, предоставьте описание содержания каждого пункта плана, следуя этим инструкциям.`;

        return promptText;
    }


    // Функция для сворачивания/разворачивания
    function toggleExpand() {
        isExpanded = !isExpanded;
        content.style.display = isExpanded ? 'block' : 'none';
        toggleButton.textContent = isExpanded ? 'Свернуть' : 'Развернуть';
        container.style.height = isExpanded ? '430px' : '100px';
    }

    toggleButton.addEventListener('click', toggleExpand);

    // Логика перетаскивания
    let isDragging = false;
    let startX, startY;

    container.addEventListener('mousedown', (e) => {
        if (e.target === toggleButton || e.target === textarea || e.target === startButton || e.target === copyButton) return;
        isDragging = true;
        startX = e.clientX - container.offsetLeft;
        startY = e.clientY - container.offsetTop;
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        let newX = e.clientX - startX;
        let newY = e.clientY - startY;

        newX = Math.max(0, Math.min(newX, window.innerWidth - container.offsetWidth));
        newY = Math.max(0, Math.min(newY, window.innerHeight - container.offsetHeight));

        container.style.left = newX + 'px';
        container.style.top = newY + 'px';
        container.style.right = 'auto';
        container.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
    });

    planTab.addEventListener('click', function() {
        currentTab = 'plan';
        planTab.style.backgroundColor = 'lightblue';
        miralinksTab.style.backgroundColor = 'white';
    });

    miralinksTab.addEventListener('click', function() {
        currentTab = 'miralinks';
        miralinksTab.style.backgroundColor = 'lightblue';
        planTab.style.backgroundColor = 'white';
    });

    startButton.addEventListener('click', function() {
        if (isProcessing) {
            console.log('Already processing. Please wait.');
            return;
        }
        lines = textarea.value.split('\n').filter(line => line.trim() !== '');
        if (lines.length > 0) {
            isProcessing = true;
            processNextLine(lines, true);
        } else {
            console.log('No lines to process');
        }
    });



    copyButton.addEventListener('click', saveToHtml);

    function saveToHtml() {
        // Находим все сообщения Claude
        let messages = document.querySelectorAll('.font-claude-message');
        let htmlContent = '';
        let messageCount = 0;
        let isFirstMessage = true;
        let ai_messages = 'div > div > div';
        //console.log('Initial messages:', messages);
        if (url.includes("chatgpt.com")) {
            messages = document.querySelectorAll('.agent-turn');
            ai_messages = 'div > div > div > div > div';
            //console.log('Updated messages:', messages);
        }

        messages.forEach(message => {
            messageCount++;

            // Пропускаем первое сообщение, если DeleteFirstAnswer = 1
            if (DeleteFirstAnswer === 1 && messageCount === 1) {
                return;
            }

            // Пропускаем второе сообщение, если DeleteFirstAnswer = 1 и tryArticleSkeleton = 1
            if (DeleteFirstAnswer === 1 && tryArticleSkeleton === 1 && messageCount === 2) {
                return;
            }

            const innerDiv = message.querySelector(ai_messages);
            if (innerDiv) {
                // Клонируем содержимое, чтобы не изменять оригинальный DOM
                let clonedContent = innerDiv.cloneNode(true);

                function removeAttributes(element) {
                    if (element.nodeType === Node.ELEMENT_NODE) {
                        while (element.attributes.length > 0) {
                            element.removeAttribute(element.attributes[0].name);
                        }
                        for (let child of element.children) {
                            removeAttributes(child);
                        }
                    }
                }
                removeAttributes(clonedContent);

                // Удаляем лишний обертывающий div
                let contentWithoutWrapper = '';
                for (let child of clonedContent.childNodes) {
                    contentWithoutWrapper += child.outerHTML || child.textContent;
                }

                htmlContent += contentWithoutWrapper;
            }

            isFirstMessage = false;
        });

        // Создаем Blob с HTML содержимым
        const blob = new Blob([htmlContent], {type: 'text/html;charset=utf-8'});

        // Создаем ссылку для скачивания
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);

        // Запрашиваем имя файла у пользователя
        let fileName = prompt('Введите имя файла (по умолчанию "AI_Article"):', 'AI_Article');
        if (fileName === null) return; // Пользователь отменил сохранение
        if (fileName.trim() === '') fileName = 'AI_Article'; // Если пользователь ввел пустую строку

        link.download = fileName + '.html';

        // Добавляем ссылку в DOM, кликаем по ней и удаляем
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }




    function waitForResponse() {
        return new Promise((resolve) => {
            function checkResponse() {
                if (url.includes("claude.ai")) {
                    const stopButton = document.querySelector('button[aria-label="Stop Response"]');
                    if (stopButton) {
                        console.log("Claude все еще пишет. Ожидаем...");
                        setTimeout(checkResponse, 3000);
                    } else {
                        const currentMessagesCount = document.querySelectorAll('[data-test-render-count]').length;
                        if (currentMessagesCount > startMessagesCount) {
                            console.log("ИИ написал ответ");
                            resolve();
                        } else {
                            console.log("Ожидаем появления нового сообщения...");
                            setTimeout(checkResponse, 1000);
                        }
                    }
                } else if (url.includes("chatgpt.com")) {
                    const stopButton = document.querySelector('button[data-testid="stop-button"]');
                    if (stopButton) {
                        console.log("Chatgpt все еще пишет. Ожидаем...");
                        setTimeout(checkResponse, 3000);
                    } else {
                        const currentMessagesCount = document.querySelectorAll('[data-message-author-role="assistant"]').length;
                        if (currentMessagesCount > startMessagesCount) {
                            console.log("ИИ написал ответ");
                            resolve();
                        } else {
                            console.log("Ожидаем появления нового сообщения...");
                            setTimeout(checkResponse, 1000);
                        }
                    }
                }
            }
            checkResponse();
        });
    }

    function processMiralinksLine(line) {
        const parts = line.split(';').map(part => part.trim());
        const articleTitle = parts[0];
        let anchorsAndUrls = [];
        for (let i = 1; i < parts.length; i += 2) {
            if (parts[i] && parts[i + 1]) {
                anchorsAndUrls.push(`${parts[i]} - ${parts[i + 1]}`);
            }
        }
        const anchorsAndUrlsList = anchorsAndUrls.join(', ');
        return `Ты профессиональный журналист и автор статей. Твои тексты наполнены фактами, цифрами, конкретикой, практической ценностью и личным опытом. Я хочу чтобы ты в этой роли написал статью на тему "${articleTitle}". Подготовь интересные H1, SEO Title до 120 символов и SEO Description до 230 символов.`;
    }

    async function processNextLine(lines, isFirstLine = false) {
        if (lines.length === 0) {
            textarea.value = '';
            console.log('План выполнен, можно сохранять статью.');
            isProcessing = false;
            return;
        }

        let nextLine = lines.shift();
        let promptText = '';

        if (currentTab === 'plan') {
            if (isFirstLine) {
                if (HeaderAtFirstRow === 1) {
                    ArticleTheme = nextLine;
                    if (roleModel === '') {
                        articleStructure = lines;
                        let structureText = articleStructure.map((item, index) => `${item}`).join("; ");
                        promptText = roleModelDefault + ` Тема будущей статьи "${ArticleTheme}". Вот итоговый план, по которому ты будешь писать эту статью шаг за шагом, по одной секции за раз: ${structureText}.` + withoutWater;
                    } else {
                        articleStructure = lines;
                        let structureText = articleStructure.map((item, index) => `${item}`).join("; ");
                        promptText = roleModel + ` Тема будущей статьи "${ArticleTheme}". Вот итоговая структура, по которой ты будешь писать эту статью шаг за шагом: ${structureText}. Если все понятно, в ответ пиши "Ок, я понял".` + withoutWater;
                    }
                } else {
                    promptText = `Давай напишем лонгрид, я буду давать тебе пункты плана, а ты пиши, но помни, что это будет одна статья. Вот итоговая структура, по которой ты будешь писать эту статью шаг за шагом: ${structureText}. Если ты готов начать, просто ответь: "ОК, я готов".` + withoutWater;
                    processedItems.push(nextLine);
                }
            } else if (tryArticleSkeleton === 1 && processedItems.length === 0) {
                promptText = createArticleSkeleton(lines);
                lines.unshift(nextLine);
                nextLine = '';
            } else {
                // Стандартное продолжение статьи по пункту + базовый промт продолжения
                if (ArticleTheme) {
                    promptText = `Помни, что общая тема статьи: "${ArticleTheme}". ` + nextlineBasePromt;
                    promptText += ` Учитывая весь контекст, который был ранее, продолжай писать статью. Сейчас опишем следующую секциюю этой статьи: "${nextLine}".` + withoutWater;
                } else {
                    promptText = nextlineBasePromt + ` Учитывая весь контекст, который был ранее, продолжай писать статью. Сейчас опишем следующую секциюю этой статьи: "${nextLine}".` + withoutWater;
                }

                // Добавляем информацию о ранее обработанных пунктах
                if (processedItems.length > 0) {
                    promptText += " Напоминю, что тебе нужно продолжать статью и ранее ты уже писал про: \n" + processedItems.map((item, index) => `${index + 1}. ${item}`).join("; ");
                }

                // Проверяем наличие специальных ключевых слов
                if (nextLine.toLowerCase().includes('введени')) {
                    promptText = `Используй инструкции из первого промта и твоего ответа на него. Там указана структура всей статьи. Напиши введение для статьи объемом до 70 слов и не более 1 абзаца.
                    Следуй следующим рекомендациям:
                    1) Начни с проблемы читателя. Описывай её кратко и ясно, без воды, так чтобы читатель сразу почувствовал, что текст решает его конкретную задачу.
                    2) Предложи решение. Покажи, что статья даёт ответы и решение проблемы.
                    3) Убедись, что читатель чувствует доверие к информации. Упомяни авторитетные источники или реальные примеры, которые усиливают ценность статьи.
                    4) Создай интригу или задай вопрос. Сделай так, чтобы читателю захотелось узнать больше, продолжить читать.
                    5) Подчеркни выгоды для читателя. Введи читателя в курс того, что он получит в статье.
                    Прошу, не используй копирайтерские клише.
                    И не пиши явно 'обязательно прочитай до конца', 'Эта статья раскроет', 'из статьи вы узнаете' и подобные клише. Будь интереснее, покажи ценность статьи для ее аудитории.` + withoutWater;
                } else if (nextLine.toLowerCase().includes('кратко')) {
                    promptText = `Помни, что общая тема статьи: "${ArticleTheme}. ` + nextlineBasePromt +
                        ` Учитывая весь контекст, который был ранее, продолжай писать статью. Сейчас опишем следующую секциюю этой статьи: "${nextLine}", но не повторяй то, что писал ранее, читать одно и то разными словами не интересно.
                        Информацию предоставь в максимально сжатом виде, в лучших традициях книги "Пиши, сокращай". Каждое слово должно нести значимую смысловую нагрузку.
                        Сфокусируйся на сути, используя точные и емкие формулировки. Ответ должен быть лаконичным, но полным по содержанию, позволяя быстро уловить главные идеи.` + withoutWater;
                } else if (nextLine.toLowerCase().includes('таблиц')) {
                    promptText = `Помни, что общая тема статьи: "${ArticleTheme}. ` + nextlineBasePromt +
                        ` Учитывая весь контекст, который был ранее, продолжай писать статью. Сейчас опишем следующую секциюю этой статьи: "${nextLine}", но не повторяй то, что писал ранее, читать одно и то разными словами не интересно.
                        Ты можешь использовать либо только таблицу, либо использовать одновременно текст и таблицу. Таблица является ключевым элементом.` + withoutWater;
                } else if (nextLine.toLowerCase().includes('подробн')) {
                    promptText = `Помни, что общая тема статьи: "${ArticleTheme}. ` + nextlineBasePromt +
                        ` Учитывая весь контекст, который был ранее, продолжай писать статью. Сейчас опишем следующую секциюю этой статьи: "${nextLine}", но не повторяй то, что писал ранее, читать одно и то разными словами не интересно.
                        Будь дотошным и пиши максимально детально. Я хочу чтобы ты максимально углубился в эту секцию. Т.к. это будет большая по объему секция - используй подзаголовки h3 и даже h4, если это необходимо.` + withoutWater;
                } else if (nextLine.toLowerCase().includes('инструкц') && nextLine.toLowerCase().includes('пошагов')) {
                    promptText = `Помни, что общая тема статьи: "${ArticleTheme}. ` + nextlineBasePromt +
                        ` Учитывая весь контекст, который был ранее, продолжай писать статью. Сейчас опишем следующую секциюю этой статьи: "${nextLine}", но не повторяй то, что писал ранее, читать одно и то разными словами не интересно.
                        Ключевой элемент этой секции статьи: пошаговое руководство для решения какого-то вопроса и достижения определённого результата. Важна логика изложения, каждое действие — это отдельный шаг с наглядной демонстрацией процесса.` + withoutWater;
                } else if (nextLine.toLowerCase().includes('гайд') || nextLine.toLowerCase().includes('мануал')) {
                    promptText = `Помни, что общая тема статьи: "${ArticleTheme}. ` + nextlineBasePromt +
                        ` Учитывая весь контекст, который был ранее, продолжай писать статью. Сейчас опишем следующую секциюю этой статьи: "${nextLine}", но не повторяй то, что писал ранее, читать одно и то разными словами не интересно.
                        Ключевой элемент этой секции статьи: Подробный разбор определённой темы на странице с максимальным погружением в эту тему. Сюда так же может входить пошаговое руководство для решения какого-то вопроса.` + withoutWater;
                } else if (nextLine.toLowerCase().includes('обзор')) {
                    promptText = `Помни, что общая тема статьи: "${ArticleTheme}. ` + nextlineBasePromt +
                        ` Учитывая весь контекст, который был ранее, продолжай писать статью. Сейчас опишем следующую секциюю этой статьи: "${nextLine}", но не повторяй то, что писал ранее, читать одно и то разными словами не интересно.
                        Ключевой элемент этой секции статьи: обзор и авторское мнение. Пиши так, как будто ты сам тестировал гаджет, сервис, приложение, рассматривай его со всех сторон, делись своими впечатлениями.` + withoutWater;
                } else if (nextLine.toLowerCase().includes('списки') || nextLine.toLowerCase().includes('список')) {
                    promptText = `Помни, что общая тема статьи: "${ArticleTheme}. ` + nextlineBasePromt +
                        ` Учитывая весь контекст, который был ранее, продолжай писать статью. Сейчас опишем следующую секциюю этой статьи: "${nextLine}", но не повторяй то, что писал ранее, читать одно и то разными словами не интересно.
                        Ключевой элемент этой секции статьи: списки или списки и текст. Список может быть один или более, там могут быть как отдельные слова и фразы, так и целые предложения и даже абзацы. Придерживайся правил:
                        1) Используй списки для упрощения восприятия информации и выделения ключевых моментов.
                        2) Каждый пункт должен содержать одну законченную мысль, не объединяй несколько идей в одном пункте.
                        3) Оформи все пункты списка в одинаковой структуре — начинай либо с глагола, либо с существительного, либо с фразы.
                        4) Разбивай пункты на подсписки или абзацы, если они содержат слишком много информации.
                        5) Применяй маркированные списки для элементов без определенной последовательности, а нумерованные — для указания порядка действий.
                        6) Пиши кратко и точно, чтобы читатель сразу улавливал суть каждого пункта.
                        7) Добавляй контекст к каждому пункту, чтобы он не выглядел абстрактно.
                        8) Если список содержит более 7-10 пунктов, разбивай его на категории для удобства восприятия.` + withoutWater;
                } else if (nextLine.toLowerCase().includes('заключени')) {
                    promptText = `Помни, что общая тема статьи: "${ArticleTheme}. ` + nextlineBasePromt +
                        ` Учитывая весь контекст, который был ранее, продолжай писать статью. Сейчас напиши заключение статьи. Подведи итог всей статьи, всё, что ты писал в своих ответах ранее. Обычно заключение не больше 70 слов.` + withoutWater;
                }
            }
        } else if (currentTab === 'miralinks') {
            promptText = processMiralinksLine(nextLine);
        }

        try {
            await executeChatCommand(promptText);
            await waitForResponse();
            if (!isFirstLine || HeaderAtFirstRow === 0) {
                processedItems.push(nextLine); // Добавляем обработанный пункт в массив
            }
            textarea.value = lines.join('\n');

            // Добавляем небольшую задержку перед обработкой следующей строки
            setTimeout(() => processNextLine(lines), 2000);
        } catch (error) {
            console.error("Ошибка при обработке строки:", error);
            isProcessing = false;
        }
    }

})();
