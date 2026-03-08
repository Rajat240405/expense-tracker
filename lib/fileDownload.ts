/**
 * fileDownload.ts
 *
 * Cross-platform file download utility.
 * - Web: uses the standard anchor.click() method.
 * - Android (Capacitor): uses @capacitor/filesystem to write to Downloads
 *   then @capacitor/share to let the user open / share it.
 *
 * Usage:
 *   await downloadFile('my-file.json', jsonString, 'application/json');
 */

import { Capacitor } from '@capacitor/core';

export async function downloadFile(
    filename: string,
    content: string,
    mimeType: string
): Promise<void> {
    if (Capacitor.isNativePlatform()) {
        await downloadFileNative(filename, content, mimeType);
    } else {
        downloadFileWeb(filename, content, mimeType);
    }
}

// ─── Web ──────────────────────────────────────────────────────────────────────

function downloadFileWeb(filename: string, content: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Android ──────────────────────────────────────────────────────────────────

async function downloadFileNative(
    filename: string,
    content: string,
    mimeType: string
): Promise<void> {
    try {
        // Lazy-import so web bundle doesn't pull in native code
        const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
        const { Share } = await import('@capacitor/share');

        // Write to the app's cache directory (always writable, no permissions needed)
        await Filesystem.writeFile({
            path: filename,
            data: content,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
        });

        // Get the file URI so we can pass it to the share sheet
        const { uri } = await Filesystem.getUri({
            path: filename,
            directory: Directory.Cache,
        });

        // Open native share sheet — user can save to Downloads, send via email, etc.
        await Share.share({
            title: filename,
            text: `Exported: ${filename}`,
            url: uri,
            dialogTitle: 'Save or share your export',
        });
    } catch (err) {
        console.error('[fileDownload] Native download failed:', err);
        // Fallback: try the web method (will silently fail in WebView but won't crash)
        downloadFileWeb(filename, content, mimeType);
    }
}
