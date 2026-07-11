import fitz
import os

os.makedirs("artifacts/meteo-app/public/assets", exist_ok=True)

# Radio bulletin - crop header logos
doc = fitz.open("attached_assets/Bulletin_Météo_Radio_du_07-07-2026_1783772718076.pdf")
page = doc[0]
w, h = page.rect.width, page.rect.height
print(f"Page size: {w}x{h}")

# Logo left (MALI-METEO) ~top-left 120x70pt
mat = fitz.Matrix(3, 3)
clip_logo_left = fitz.Rect(0, 0, 120, 68)
pix = page.get_pixmap(matrix=mat, clip=clip_logo_left)
pix.save("artifacts/meteo-app/public/assets/logo-malimeteo.png")
print("Saved logo-malimeteo.png")

# Logo right (République) ~top-right
clip_logo_right = fitz.Rect(w-90, 0, w, 68)
pix = page.get_pixmap(matrix=mat, clip=clip_logo_right)
pix.save("artifacts/meteo-app/public/assets/logo-republique.png")
print("Saved logo-republique.png")

# Full header
clip_header = fitz.Rect(0, 0, w, 70)
pix = page.get_pixmap(matrix=mat, clip=clip_header)
pix.save("artifacts/meteo-app/public/assets/header.png")
print("Saved header.png")

doc.close()

# ORTM bulletin - crop the Mali map section
doc = fitz.open("attached_assets/Bulletin_Météo_ORTM_du_07-07-2026_1783772718081.pdf")
page = doc[0]
# Map area is approximately from y=250 to y=800 (roughly 60% down the page)
clip_map = fitz.Rect(0, 200, w, h-50)
pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip_map)
pix.save("artifacts/meteo-app/public/assets/mali-map-ortm.png")
print("Saved mali-map-ortm.png")

# National page 1 map section
doc2 = fitz.open("attached_assets/Bulletin_Météo_national_du_07-07-2026_1783772718082.pdf")
page2 = doc2[0]
clip_map2 = fitz.Rect(0, 200, w, h-50)
pix2 = page2.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip_map2)
pix2.save("artifacts/meteo-app/public/assets/mali-map-national.png")
print("Saved mali-map-national.png")

# Journaux bulletin - crop vigilance map
doc3 = fitz.open("attached_assets/Bulletin_Météo_Journaux_du_07-07-2026_1783772718080.pdf")
page3 = doc3[0]
clip_vig = fitz.Rect(270, 88, w, 290)
pix3 = page3.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip_vig)
pix3.save("artifacts/meteo-app/public/assets/mali-vigilance-map.png")
print("Saved mali-vigilance-map.png")

# Journaux - crop weather icons section
clip_cities = fitz.Rect(0, 288, w, h-50)
pix4 = page3.get_pixmap(matrix=fitz.Matrix(2, 2), clip=clip_cities)
pix4.save("artifacts/meteo-app/public/assets/journaux-cities.png")
print("Saved journaux-cities.png")

doc3.close()

print("DONE")
