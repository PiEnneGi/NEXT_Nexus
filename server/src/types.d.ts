declare module 'word-extractor' {
  interface ExtractedDocument {
    getBody(): string
    getHeaders(): { [key: string]: string }
    getFooters(): { [key: string]: string }
    getHeadersFooters(): string
    getAnnotations(): string
    getEndNotes(): string
    getFootnotes(): string
  }

  class WordExtractor {
    extract(filePath: string): Promise<ExtractedDocument>
  }

  export default WordExtractor
}
