# Security Guidelines — Motion PPT

## 1. Asset & Media Handling
- **Path Traversal Protection**: Any file loaded via presentation.open or sset.load must resolve within the workspace or approved asset directories.
- **MIME & Extension Whitelist**: Only allow safe image formats (image/png, image/jpeg, image/svg+xml, image/webp) and video formats (ideo/mp4, ideo/webm).
- **SVG Sanitization**: Procedural or imported SVGs must be parsed without executing embedded <script> or external entity references (XXE).

## 2. MCP Server Security
- File system access is restricted to the active workspace directory.
- Shell command execution (e.g. FFmpeg) must use strictly sanitized arguments without shell injection vulnerabilities.
