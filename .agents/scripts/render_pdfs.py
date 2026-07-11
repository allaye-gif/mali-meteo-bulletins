import fitz
import os

pdfs = [
    "attached_assets/Bulletin_Météo_Radio_du_07-07-2026_1783772718076.pdf",
    "attached_assets/Bulletin_Météo_Matinal_du_07-07-2026_1783772718079.pdf",
    "attached_assets/Bulletin_Météo_Journaux_du_07-07-2026_1783772718080.pdf",
    "attached_assets/Bulletin_Météo_ORTM_du_07-07-2026_1783772718081.pdf",
    "attached_assets/Bulletin_Météo_national_du_07-07-2026_1783772718082.pdf",
]

names = ["Radio", "Matinal", "Journaux", "ORTM", "National"]

os.makedirs(".agents/outputs", exist_ok=True)

for pdf_path, name in zip(pdfs, names):
    doc = fitz.open(pdf_path)
    print(f"\n=== {name} === pages:{doc.page_count}")
    for i, page in enumerate(doc):
        # Render at zoom 2 (144 DPI)
        mat = fitz.Matrix(2, 2)
        pix = page.get_pixmap(matrix=mat)
        out_path = f".agents/outputs/{name}_page{i+1}.png"
        pix.save(out_path)
        print(f"  Saved {out_path} ({page.rect.width:.0f}x{page.rect.height:.0f}pt)")
        
        # Also extract text with positions
        text = page.get_text("text")
        print(f"  Text preview: {text[:500]}")
    doc.close()

print("\nDONE")
