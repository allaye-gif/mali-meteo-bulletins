import fitz
import os

os.makedirs(".agents/outputs/assets", exist_ok=True)

pdfs = [
    "attached_assets/Bulletin_Météo_Radio_du_07-07-2026_1783772718076.pdf",
    "attached_assets/Bulletin_Météo_ORTM_du_07-07-2026_1783772718081.pdf",
    "attached_assets/Bulletin_Météo_Journaux_du_07-07-2026_1783772718080.pdf",
]
names = ["Radio", "ORTM", "Journaux"]

for pdf_path, name in zip(pdfs, names):
    doc = fitz.open(pdf_path)
    for pi, page in enumerate(doc):
        imgs = page.get_images(full=True)
        print(f"{name} page{pi+1}: {len(imgs)} images")
        for ii, img in enumerate(imgs):
            xref = img[0]
            base = img[7]
            ext_info = doc.extract_image(xref)
            ext = ext_info["ext"]
            data = ext_info["image"]
            out = f".agents/outputs/assets/{name}_img{ii}_{xref}.{ext}"
            with open(out, "wb") as f:
                f.write(data)
            print(f"  Saved {out} ({len(data)} bytes) w={ext_info.get('width')} h={ext_info.get('height')}")
    doc.close()

print("DONE")
