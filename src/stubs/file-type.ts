// Stub for file-type's Node.js-only export.
// Payload imports fileTypeFromFile for upload handling, but this service
// never processes file uploads — only markdown-to-lexical conversion.
export { fileTypeFromBuffer, fileTypeFromStream, supportedExtensions, supportedMimeTypes } from 'file-type/core';
export async function fileTypeFromFile() { return undefined; }
