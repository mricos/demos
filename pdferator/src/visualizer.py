import fitz # PyMuPDF
import os

def generate_syntax_map(page, elements, output_dir, page_num, color_map):
    """Draws colored rectangles for each element on a copy of the page."""
    map_dir = os.path.join(output_dir, "syntax_maps")
    if not os.path.exists(map_dir):
        os.makedirs(map_dir)

    for elem in elements:
        rect = fitz.Rect(elem["bbox"])
        elem_type = elem.get("type", "text")
        color = color_map.get(elem_type, (0,0,0)) # Default to black
        
        page.draw_rect(rect, color=color, fill=color, fill_opacity=0.3, width=1)
        page.insert_text(rect.top_left + (2, 8), elem_type.upper(), fontsize=6, color=color)

    pix = page.get_pixmap(dpi=150)
    map_path = os.path.join(map_dir, f"page_{page_num+1}_map.png")
    pix.save(map_path)
    print(f"  -> Saved syntax map for page {page_num+1}")

