#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <app-path> <output-dmg>" >&2
  exit 2
fi

APP_PATH="$1"
OUTPUT_DMG="$2"
APP_NAME="THQ Switch.app"
VOLUME_NAME="THQ Switch"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ "$(uname -s)" != "Darwin" ]; then
  echo "macOS DMG generation only supports macOS." >&2
  exit 2
fi

if [ ! -d "$APP_PATH" ]; then
  echo "App bundle not found: $APP_PATH" >&2
  exit 1
fi

tmp_dir="$(mktemp -d)"
cleanup() {
  rm -rf "$tmp_dir"
}
trap cleanup EXIT

source_dir="$tmp_dir/source"
background_png="$tmp_dir/thq-switch-dmg-background.png"
finish_script="3-drag-then-press-return.sh"
mkdir -p "$source_dir"

ditto "$APP_PATH" "$source_dir/$APP_NAME"

cat > "$source_dir/$finish_script" <<'COMMAND'
#!/usr/bin/env bash
set -euo pipefail

APP_PATH="/Applications/THQ Switch.app"
APP_NAME="THQ Switch"

show_dialog() {
  local message="$1"
  osascript -e "display dialog \"$message\" buttons {\"OK\"} default button \"OK\" with title \"$APP_NAME\""
}

if [ ! -d "$APP_PATH" ]; then
  show_dialog "Step 1 is not complete yet. Please drag THQ Switch into Applications first, then drag 3-drag-then-press-return.sh into Terminal again and press Return."
  exit 1
fi

echo "Finishing THQ Switch installation..."
echo "Removing macOS quarantine from: $APP_PATH"

if ! xattr -dr com.apple.quarantine "$APP_PATH" 2>/dev/null; then
  show_dialog "macOS needs your password to finish installation. Enter your Mac login password in Terminal."
  sudo xattr -dr com.apple.quarantine "$APP_PATH" 2>/dev/null || true
fi

echo "Opening $APP_NAME..."
open "$APP_PATH"

osascript -e "display notification \"Installation finished. You can open THQ Switch from Applications.\" with title \"$APP_NAME\""
COMMAND
chmod +x "$source_dir/$finish_script"

cat > "$tmp_dir/render-dmg-background.swift" <<'SWIFT'
import AppKit
import Foundation

guard CommandLine.arguments.count == 2 else {
  fputs("Usage: render-dmg-background.swift <output.png>\n", stderr)
  exit(2)
}

let outputURL = URL(fileURLWithPath: CommandLine.arguments[1])
let canvas = NSSize(width: 1120, height: 640)
let image = NSImage(size: canvas)

func color(_ red: CGFloat, _ green: CGFloat, _ blue: CGFloat, _ alpha: CGFloat = 1) -> NSColor {
  NSColor(calibratedRed: red / 255, green: green / 255, blue: blue / 255, alpha: alpha)
}

func drawText(
  _ text: String,
  rect: NSRect,
  size: CGFloat,
  weight: NSFont.Weight = .regular,
  color textColor: NSColor = color(49, 54, 63),
  alignment: NSTextAlignment = .center
) {
  let paragraph = NSMutableParagraphStyle()
  paragraph.alignment = alignment
  paragraph.lineBreakMode = .byWordWrapping

  let attributes: [NSAttributedString.Key: Any] = [
    .font: NSFont.systemFont(ofSize: size, weight: weight),
    .foregroundColor: textColor,
    .paragraphStyle: paragraph
  ]
  (text as NSString).draw(in: rect, withAttributes: attributes)
}

func drawRoundedRect(_ rect: NSRect, radius: CGFloat, fill: NSColor, stroke: NSColor? = nil) {
  let path = NSBezierPath(roundedRect: rect, xRadius: radius, yRadius: radius)
  fill.setFill()
  path.fill()
  if let stroke {
    stroke.setStroke()
    path.lineWidth = 1
    path.stroke()
  }
}

func drawCircle(number: String, center: NSPoint, fill: NSColor) {
  let rect = NSRect(x: center.x - 17, y: center.y - 17, width: 34, height: 34)
  fill.setFill()
  NSBezierPath(ovalIn: rect).fill()
  drawText(number, rect: NSRect(x: rect.minX, y: rect.minY + 6, width: rect.width, height: 22), size: 16, weight: .bold, color: .white)
}

func drawArrow(from start: NSPoint, to end: NSPoint) {
  color(120, 126, 138).setStroke()
  let line = NSBezierPath()
  line.move(to: start)
  line.line(to: end)
  line.lineWidth = 4
  line.stroke()

  let head = NSBezierPath()
  head.move(to: end)
  head.line(to: NSPoint(x: end.x - 16, y: end.y + 10))
  head.line(to: NSPoint(x: end.x - 16, y: end.y - 10))
  head.close()
  color(120, 126, 138).setFill()
  head.fill()
}

image.lockFocus()

color(246, 247, 250).setFill()
NSBezierPath(rect: NSRect(origin: .zero, size: canvas)).fill()

drawRoundedRect(NSRect(x: 36, y: 36, width: 1048, height: 568), radius: 22, fill: .white, stroke: color(224, 228, 235))

drawText("THQ Switch macOS 安装", rect: NSRect(x: 0, y: 560, width: canvas.width, height: 40), size: 30, weight: .semibold)
drawText("重点：把脚本拖进 Terminal 以后，还要按 Return / 回车 才会运行", rect: NSRect(x: 0, y: 526, width: canvas.width, height: 28), size: 18, weight: .semibold, color: color(176, 71, 38))

let columns: [(String, String, String, CGFloat, NSColor)] = [
  ("1", "拖动 App", "拖到 Applications 文件夹", 200, color(94, 182, 174)),
  ("2", "打开 Terminal", "双击 2 Open Terminal.app", 535, color(91, 128, 196)),
  ("3", "拖入脚本", "把 3-drag-then-press-return.sh 拖进终端", 840, color(246, 143, 71))
]

for item in columns {
  let x = item.3
  drawCircle(number: item.0, center: NSPoint(x: x, y: 476), fill: item.4)
  drawText(item.1, rect: NSRect(x: x - 120, y: 432, width: 240, height: 28), size: 20, weight: .semibold)
  drawText(item.2, rect: NSRect(x: x - 145, y: 401, width: 290, height: 25), size: 15, weight: .medium, color: color(105, 112, 125))
}

drawArrow(from: NSPoint(x: 240, y: 315), to: NSPoint(x: 325, y: 315))
drawArrow(from: NSPoint(x: 625, y: 315), to: NSPoint(x: 705, y: 315))

drawCircle(number: "4", center: NSPoint(x: 560, y: 145), fill: color(245, 180, 48))
drawText("看到 Terminal 里出现脚本路径后，按 Return / 回车。脚本会自动打开 THQ Switch。", rect: NSRect(x: 160, y: 104, width: 800, height: 30), size: 16, weight: .semibold, color: color(78, 85, 98))
drawText("不要双击 .sh 文件；双击可能会被 VS Code 或文本编辑器打开。", rect: NSRect(x: 160, y: 76, width: 800, height: 24), size: 14, weight: .medium, color: color(112, 119, 132))

image.unlockFocus()

guard
  let tiffData = image.tiffRepresentation,
  let bitmap = NSBitmapImageRep(data: tiffData),
  let pngData = bitmap.representation(using: .png, properties: [:])
else {
  fputs("Could not render DMG background PNG.\n", stderr)
  exit(1)
}

try pngData.write(to: outputURL)
SWIFT

swift "$tmp_dir/render-dmg-background.swift" "$background_png"

rm -f "$OUTPUT_DMG"

cat > "$tmp_dir/appdmg.json" <<JSON
{
  "title": "$VOLUME_NAME",
  "icon": "$ROOT_DIR/src-tauri/icons/icon.icns",
  "background": "$background_png",
  "icon-size": 96,
  "format": "UDZO",
  "filesystem": "HFS+",
  "window": {
    "position": { "x": 200, "y": 120 },
    "size": { "width": 1120, "height": 640 }
  },
  "contents": [
    { "x": 180, "y": 320, "type": "file", "path": "$source_dir/$APP_NAME" },
    { "x": 360, "y": 320, "type": "link", "path": "/Applications" },
    { "x": 550, "y": 320, "type": "link", "path": "/System/Applications/Utilities/Terminal.app", "name": "2 Open Terminal.app" },
    { "x": 840, "y": 320, "type": "file", "path": "$source_dir/$finish_script" },
    { "x": 1320, "y": 780, "type": "position", "path": ".background" },
    { "x": 1320, "y": 840, "type": "position", "path": ".VolumeIcon.icns" }
  ]
}
JSON

npx --yes appdmg@0.6.6 "$tmp_dir/appdmg.json" "$OUTPUT_DMG"
