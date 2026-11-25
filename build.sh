#!/bin/bash

# Название образа electron-builder.
# Тег = версия Node внутри образа: Electron 44 требует Node >= 22.12,
# поэтому образ должен быть 22-й линии. Полное имя (docker.io/...) —
# иначе Podman падает в неинтерактивной среде с «short-name resolution».
IMAGE="docker.io/electronuserland/builder:22"

echo "🧹 Очистка предыдущих сборок и локальных зависимостей (без удаления самих папок)..."
# Очищаем содержимое папок, если они существуют, чтобы не ломать inode для Nginx
[ -d "dist" ] && find dist -mindepth 1 -delete
[ -d "node_modules" ] && find node_modules -mindepth 1 -delete

echo "🚀 Подготовка окружения..."
# Явно создаем папку для кэша, чтобы Podman не ругался
mkdir -p "$(pwd)/.cache"

echo "🚀 Запуск сборки Kodme Desktop в контейнере Podman..."

# Запуск сборки через Podman с флагами безопасности :z для SELinux
podman run --rm -ti \
  --env ELECTRON_CACHE="/project/.cache/electron" \
  --env ELECTRON_BUILDER_CACHE="/project/.cache/electron-builder" \
  -v "$(pwd)":/project:z \
  -v "$(pwd)/.cache":/project/.cache:z \
  $IMAGE \
  /bin/bash -c "npm install && npm run dist"

echo "✅ Сборка завершена! Проверь папку dist/"
