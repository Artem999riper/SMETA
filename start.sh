#!/bin/bash
echo "Запуск СметаСБЦ..."

cd "$(dirname "$0")"

if ! command -v node &>/dev/null; then
    echo "ОШИБКА: Node.js не найден. Установите с https://nodejs.org"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "Установка зависимостей (первый запуск)..."
    npm install || exit 1
fi

npm run dev
