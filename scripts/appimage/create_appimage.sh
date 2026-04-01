#!/bin/bash

# Exit on error
set -e

# Check platform
platform=$(uname)

if [[ "$platform" == "Darwin" ]]; then
    echo "Running on macOS. Note that the AppImage created will only work on Linux systems."
    if ! command -v docker &> /dev/null; then
        echo "Docker Desktop for Mac is not installed. Please install it from https://www.docker.com/products/docker-desktop"
        exit 1
    fi
elif [[ "$platform" == "Linux" ]]; then
    echo "Running on Linux. Proceeding with AppImage creation..."
else
    echo "This script is intended to run on macOS or Linux. Current platform: $platform"
    exit 1
fi

# Enable BuildKit
export DOCKER_BUILDKIT=1

BUILD_IMAGE_NAME="raccoon-appimage-builder"

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Please start Docker first."
    exit 1
fi

# Check and install Buildx if needed
if ! docker buildx version >/dev/null 2>&1; then
    echo "Installing Docker Buildx..."
    mkdir -p ~/.docker/cli-plugins/
    curl -SL https://github.com/docker/buildx/releases/download/v0.13.1/buildx-v0.13.1.linux-amd64 -o ~/.docker/cli-plugins/docker-buildx
    chmod +x ~/.docker/cli-plugins/docker-buildx
fi

# Download appimagetool if not present
if [ ! -f "appimagetool" ]; then
    echo "Downloading appimagetool..."
    wget -O appimagetool "https://github.com/AppImage/AppImageKit/releases/download/continuous/appimagetool-x86_64.AppImage"
    chmod +x appimagetool
fi

# Delete any existing AppImage to araccoon bloating the build
rm -f raccoon-x86_64.AppImage

# Create build Dockerfile
echo "Creating build Dockerfile..."
cat > Dockerfile.build << 'EOF'
# syntax=docker/dockerfile:1
FROM ubuntu:20.04

# Install required dependencies
RUN apt-get update && apt-get install -y \
    libfuse2 \
    libglib2.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxss1 \
    libxtst6 \
    libnss3 \
    libasound2 \
    libdrm2 \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
EOF

# Create .dockerignore file
echo "Creating .dockerignore file..."
cat > .dockerignore << EOF
Dockerfile.build
.dockerignore
.git
.gitignore
.DS_Store
*~
*.swp
*.swo
*.tmp
*.bak
*.log
*.err
node_modules/
venv/
*.egg-info/
*.tox/
dist/
EOF

# Build Docker image without cache
echo "Building Docker image (no cache)..."
docker build --no-cache -t "$BUILD_IMAGE_NAME" -f Dockerfile.build .

# Create AppImage using local appimagetool
echo "Creating AppImage..."
docker run --rm --privileged -v "$(pwd):/app" "$BUILD_IMAGE_NAME" bash -c '
cd /app && \
rm -rf raccoonApp.AppDir && \
mkdir -p raccoonApp.AppDir/usr/bin raccoonApp.AppDir/usr/lib raccoonApp.AppDir/usr/share/applications && \
find . -maxdepth 1 ! -name raccoonApp.AppDir ! -name "." ! -name ".." -exec cp -r {} raccoonApp.AppDir/usr/bin/ \; && \
cp raccoon.png raccoonApp.AppDir/ && \
echo "[Desktop Entry]" > raccoonApp.AppDir/raccoon.desktop && \
echo "Name=raccoon" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Comment=Open source AI code editor." >> raccoonApp.AppDir/raccoon.desktop && \
echo "GenericName=Text Editor" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Exec=raccoon %F" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Icon=raccoon" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Type=Application" >> raccoonApp.AppDir/raccoon.desktop && \
echo "StartupNotify=false" >> raccoonApp.AppDir/raccoon.desktop && \
echo "StartupWMClass=raccoon" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Categories=TextEditor;Development;IDE;" >> raccoonApp.AppDir/raccoon.desktop && \
echo "MimeType=application/x-raccoon-workspace;" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Keywords=raccoon;" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Actions=new-empty-window;" >> raccoonApp.AppDir/raccoon.desktop && \
echo "[Desktop Action new-empty-window]" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Name=New Empty Window" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Name[de]=Neues leeres Fenster" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Name[es]=Nueva ventana vacía" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Name[fr]=Nouvelle fenêtre vide" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Name[it]=Nuova finestra vuota" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Name[ja]=新しい空のウィンドウ" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Name[ko]=새 빈 창" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Name[ru]=Новое пустое окно" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Name[zh_CN]=新建空窗口" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Name[zh_TW]=開新空視窗" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Exec=raccoon --new-window %F" >> raccoonApp.AppDir/raccoon.desktop && \
echo "Icon=raccoon" >> raccoonApp.AppDir/raccoon.desktop && \
chmod +x raccoonApp.AppDir/raccoon.desktop && \
cp raccoonApp.AppDir/raccoon.desktop raccoonApp.AppDir/usr/share/applications/ && \
echo "[Desktop Entry]" > raccoonApp.AppDir/raccoon-url-handler.desktop && \
echo "Name=raccoon - URL Handler" > raccoonApp.AppDir/raccoon-url-handler.desktop && \
echo "Comment=Open source AI code editor." > raccoonApp.AppDir/raccoon-url-handler.desktop && \
echo "GenericName=Text Editor" > raccoonApp.AppDir/raccoon-url-handler.desktop && \
echo "Exec=raccoon --open-url %U" > raccoonApp.AppDir/raccoon-url-handler.desktop && \
echo "Icon=raccoon" > raccoonApp.AppDir/raccoon-url-handler.desktop && \
echo "Type=Application" > raccoonApp.AppDir/raccoon-url-handler.desktop && \
echo "NoDisplay=true" > raccoonApp.AppDir/raccoon-url-handler.desktop && \
echo "StartupNotify=true" > raccoonApp.AppDir/raccoon-url-handler.desktop && \
echo "Categories=Utility;TextEditor;Development;IDE;" > raccoonApp.AppDir/raccoon-url-handler.desktop && \
echo "MimeType=x-scheme-handler/raccoon;" > raccoonApp.AppDir/raccoon-url-handler.desktop && \
echo "Keywords=raccoon;" > raccoonApp.AppDir/raccoon-url-handler.desktop && \
chmod +x raccoonApp.AppDir/raccoon-url-handler.desktop && \
cp raccoonApp.AppDir/raccoon-url-handler.desktop raccoonApp.AppDir/usr/share/applications/ && \
echo "#!/bin/bash" > raccoonApp.AppDir/AppRun && \
echo "HERE=\$(dirname \"\$(readlink -f \"\${0}\")\")" >> raccoonApp.AppDir/AppRun && \
echo "export PATH=\${HERE}/usr/bin:\${PATH}" >> raccoonApp.AppDir/AppRun && \
echo "export LD_LIBRARY_PATH=\${HERE}/usr/lib:\${LD_LIBRARY_PATH}" >> raccoonApp.AppDir/AppRun && \
echo "exec \${HERE}/usr/bin/raccoon --no-sandbox \"\$@\"" >> raccoonApp.AppDir/AppRun && \
chmod +x raccoonApp.AppDir/AppRun && \
chmod -R 755 raccoonApp.AppDir && \

# Strip unneeded symbols from the binary to reduce size
strip --strip-unneeded raccoonApp.AppDir/usr/bin/raccoon

ls -la raccoonApp.AppDir/ && \
ARCH=x86_64 ./appimagetool -n raccoonApp.AppDir raccoon-x86_64.AppImage
'

# Clean up
rm -rf raccoonApp.AppDir .dockerignore appimagetool

echo "AppImage creation complete! Your AppImage is: raccoon-x86_64.AppImage"
