# DevKnowledge — RAG Backend

A Retrieval-Augmented Generation API for querying internal knowledge bases.

## Limitations PDF

`pdf-parse` (backed by Mozilla PDF.js) has the following known limitations:

### Simple (linear text) PDFs
Works well for single-column, left-to-right text. Paragraph breaks and headings are preserved as whitespace. Expected accuracy: high.

### Multi-column PDFs
Column boundaries are not respected. Lines from different columns may be interleaved or merged, producing incoherent sentences. The extracted text is usable for keyword search but degrades RAG answer quality for dense column layouts.

### PDFs with tables
Table structure (rows, columns, cell alignment) is entirely lost. Cells are concatenated in reading order without delimiters. Numbers in tabular data remain searchable but the relational context (which column a value belongs to) is not recoverable from the extracted text.

### Other known limits
- Scanned PDFs (image-based) produce empty text — no OCR is applied.
- Password-protected PDFs are rejected with a parse error.
- PDFs with non-standard encoding or fonts may produce garbled Unicode characters.
- Very large PDFs (>500 pages) may be slow to ingest; consider splitting them before upload.
