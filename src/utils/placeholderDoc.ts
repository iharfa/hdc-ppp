// Generates a real, downloadable placeholder PDF on the client so POC
// "documents" actually download something meaningful. In production these
// links point at stored files instead.

function asciize(s: string): string {
  // PDF byte offsets below assume ASCII; strip diacritics/non-ASCII.
  return s.normalize("NFKD").replace(/[^\x20-\x7E]/g, "");
}

function escapePdf(s: string): string {
  return asciize(s).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function makePdfBlob(title: string, lines: string[]): Blob {
  const textLines = [title, "", ...lines];
  let content = "BT\n/F1 15 Tf\n72 780 Td\n20 TL\n";
  for (const ln of textLines) content += `(${escapePdf(ln)}) Tj\nT*\n`;
  content += "ET";

  const objs = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>",
    `<</Length ${content.length}>>\nstream\n${content}\nendstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

/** Build and download a placeholder PDF for a participation document. */
export function downloadPlaceholderDoc(docTitle: string, recordTitle: string): void {
  const blob = makePdfBlob(docTitle, [
    `Participation record: ${recordTitle}`,
    "",
    "PROOF OF CONCEPT - SAMPLE DOCUMENT",
    "",
    "This is an automatically generated placeholder so the download",
    "works in the proof of concept. It does not contain real project",
    "content. In the production system this link will serve the actual",
    "approved document (concept brief, location map, etc.) from secure",
    "document storage.",
    "",
    "Housing Development Corporation",
    "Public Participation Portal",
  ]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = asciize(docTitle).replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") + ".pdf";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
