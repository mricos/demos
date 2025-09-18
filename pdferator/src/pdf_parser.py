import fitz # PyMuPDF
from PIL import Image
from pix2tex.cli import LatexOCR
import io

def merge_close_rects(rect_list, proximity_threshold=10):
    """Merges a list of fitz.Rect objects that are close to each other."""
    if not rect_list:
        return []

    rect_list.sort(key=lambda r: (r.y0, r.x0))
    merged = []
    current_rect = rect_list[0]

    for i in range(1, len(rect_list)):
        next_rect = rect_list[i]
        expanded_rect = fitz.Rect(
            current_rect.x0 - proximity_threshold,
            current_rect.y0 - proximity_threshold,
            current_rect.x1 + proximity_threshold,
            current_rect.y1 + proximity_threshold
        )
        if expanded_rect.intersects(next_rect):
            current_rect = current_rect | next_rect
        else:
            merged.append(current_rect)
            current_rect = next_rect
    merged.append(current_rect)
    return merged

def get_page_elements(page, proximity_threshold, min_dims):
    """
    Finds all text, image, and merged math elements on a page.
    """
    page_elements = []

    # Gather Text
    text_blocks = page.get_text("dict")["blocks"]
    for block in text_blocks:
        if block['type'] == 0:
            for line in block["lines"]:
                for span in line["spans"]:
                    page_elements.append({"type": "text", "bbox": span["bbox"], "content": span["text"]})

    # Gather Images
    images = page.get_images(full=True)
    for img_info in images:
        bbox = page.get_image_bbox(img_info)
        page_elements.append({"type": "image", "bbox": bbox, "xref": img_info[0]})

    # Gather and Merge Math Equations
    drawings = page.get_drawings()
    initial_rects = [fitz.Rect(d["rect"]) for d in drawings]
    merged_equation_rects = merge_close_rects(initial_rects, proximity_threshold)
    
    for bbox in merged_equation_rects:
        if bbox.width < min_dims['width'] or bbox.height < min_dims['height']:
            continue
        page_elements.append({"type": "math", "bbox": bbox})
        
    return page_elements

def ocr_math_elements(page, math_elements, ocr_model):
    """Runs OCR on the math elements and adds LaTeX to them."""
    for elem in math_elements:
        if elem['type'] == 'math':
            bbox = fitz.Rect(elem['bbox'])
            pix = page.get_pixmap(clip=bbox, dpi=300)
            img_bytes = pix.tobytes("png")
            try:
                pil_image = Image.open(io.BytesIO(img_bytes))
                latex_code = ocr_model(pil_image)
                elem['latex'] = latex_code
            except Exception as e:
                print(f"Error during OCR: {e}")
                elem['latex'] = "\\text{OCR Error}"
    return math_elements

