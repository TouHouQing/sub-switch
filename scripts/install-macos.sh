#!/usr/bin/env bash
set -euo pipefail

REPO="${THQ_SWITCH_REPO:-TouHouQing/sub-switch}"
TAG="${1:-${THQ_SWITCH_RELEASE_TAG:-__THQ_SWITCH_RELEASE_TAG__}}"
APP_NAME="THQ Switch.app"
APP_DISPLAY_NAME="THQ Switch"
INSTALL_DIR="${THQ_SWITCH_INSTALL_DIR:-/Applications}"
ASSET_NAME="THQ-Switch-${TAG}-macOS.zip"
DOWNLOAD_URL="https://github.com/${REPO}/releases/download/${TAG}/${ASSET_NAME}"

if [ "$TAG" = "__THQ_SWITCH_RELEASE_TAG__" ] || [ -z "$TAG" ]; then
  echo "Usage: $0 <release-tag>" >&2
  echo "Example: $0 v3.16.7" >&2
  exit 2
fi

if [ "$(uname -s)" != "Darwin" ]; then
  echo "This installer only supports macOS." >&2
  exit 2
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required but was not found." >&2
  exit 2
fi

if ! command -v unzip >/dev/null 2>&1; then
  echo "unzip is required but was not found." >&2
  exit 2
fi

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

zip_path="$tmp_dir/${ASSET_NAME}"
unpack_dir="$tmp_dir/unpacked"
dest_path="${INSTALL_DIR}/${APP_NAME}"

echo "Downloading ${APP_DISPLAY_NAME} ${TAG}..."
curl -fL --retry 3 --retry-delay 2 -o "$zip_path" "$DOWNLOAD_URL"

mkdir -p "$unpack_dir"
unzip -q "$zip_path" -d "$unpack_dir"

app_path="$(find "$unpack_dir" -maxdepth 3 -name "$APP_NAME" -type d | head -n 1)"
if [ -z "$app_path" ]; then
  echo "Could not find ${APP_NAME} inside ${ASSET_NAME}." >&2
  exit 1
fi

install_with_privileges() {
  if [ -d "$dest_path" ]; then
    sudo rm -rf "$dest_path"
  fi
  sudo ditto "$app_path" "$dest_path"
  sudo xattr -dr com.apple.quarantine "$dest_path" 2>/dev/null || true
}

install_without_privileges() {
  if [ -d "$dest_path" ]; then
    rm -rf "$dest_path"
  fi
  ditto "$app_path" "$dest_path"
  xattr -dr com.apple.quarantine "$dest_path" 2>/dev/null || true
}

echo "Installing to ${dest_path}..."
if [ -w "$INSTALL_DIR" ]; then
  mkdir -p "$INSTALL_DIR"
  install_without_privileges
else
  echo "Administrator permission is required to install into ${INSTALL_DIR}."
  sudo mkdir -p "$INSTALL_DIR"
  install_with_privileges
fi

echo "Installed ${APP_DISPLAY_NAME}."
if [ "${THQ_SWITCH_NO_OPEN:-0}" != "1" ]; then
  open "$dest_path"
fi
