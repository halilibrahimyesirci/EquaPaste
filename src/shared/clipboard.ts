import type { ClipboardPayload } from '../core/types';

/**
 * Render an equation to a PNG Blob. Provided by the caller (the content layer)
 * so this module stays free of MathML-rendering concerns.
 */
export type ImageRenderer = (altLatex: string) => Promise<Blob>;

export class ClipboardWriteError extends Error {
  override name = 'ClipboardWriteError';
}

/**
 * Write a ClipboardPayload using the async Clipboard API.
 *
 * Chrome requires ClipboardItem values to be Blobs (passing strings can crash),
 * so every text MIME is wrapped in a Blob. Must be called from a user-gesture
 * handler. With the `clipboardWrite` permission this works in extension content
 * scripts and extension pages.
 */
export async function writeClipboard(
  payload: ClipboardPayload,
  renderImage?: ImageRenderer,
): Promise<void> {
  const items: Record<string, Blob> = {};

  const plain = payload['text/plain'];
  if (plain != null) items['text/plain'] = new Blob([plain], { type: 'text/plain' });

  const html = payload['text/html'];
  if (html != null) items['text/html'] = new Blob([html], { type: 'text/html' });

  if (payload.imagePng) {
    if (!renderImage) {
      throw new ClipboardWriteError('Image target requires an image renderer');
    }
    items['image/png'] = await renderImage(payload.imagePng.altLatex);
  }

  if (Object.keys(items).length === 0) {
    throw new ClipboardWriteError('Empty clipboard payload');
  }

  try {
    await navigator.clipboard.write([new ClipboardItem(items)]);
  } catch (err) {
    throw new ClipboardWriteError(err instanceof Error ? err.message : String(err));
  }
}
