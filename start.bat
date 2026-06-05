@echo off
chcp 65001 >nul
title СметаСБЦ

echo Запуск СметаСБЦ...

:: Проверяем наличие Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo ОШИБКА: Node.js не найден.
    echo Скачайте и установите Node.js с https://nodejs.org
    pause
    exit /b 1
)

:: Переходим в папку проекта
cd /d "%~dp0"

:: Устанавливаем зависимости если нет node_modules
if not exist "node_modules" (
    echo Установка зависимостей (первый запуск)...
    call npm install
    if errorlevel 1 (
        echo ОШИБКА при установке зависимостей.
        pause
        exit /b 1
    )
)

:: Запускаем приложение
echo Запуск приложения...
call npm run dev
