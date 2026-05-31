// Small XML helpers used by the conversion core. They rely on the global
// DOMParser / XMLSerializer, which exist wherever conversion runs: the content
// script (a real DOM) and the jsdom test environment. They are NOT available in
// a service worker — so conversion must never run there (it doesn't: the
// clipboard write, and therefore conversion, happens in the content script).

export class XmlParseError extends Error {}

/** Parse an XML string and return its document element, throwing on malformed input. */
export function parseXml(xml: string): Element {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    const detail = doc.getElementsByTagName('parsererror')[0]?.textContent ?? 'unknown';
    throw new XmlParseError(detail);
  }
  return doc.documentElement;
}

export function serializeXml(node: Node): string {
  return new XMLSerializer().serializeToString(node);
}

/** Escape text for use inside an XML text node. */
export function escapeXmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Escape a string for use inside a double-quoted XML attribute. */
export function escapeXmlAttr(s: string): string {
  return escapeXmlText(s).replace(/"/g, '&quot;');
}
