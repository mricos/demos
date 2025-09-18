from bs4 import BeautifulSoup
import fitz # PyMuPDF
from collections import defaultdict

def get_ground_truth_boxes_by_page(xml_path, pdf_doc):
    """
    Parses the XML and returns a dictionary mapping page numbers to a list
    of ground truth bounding boxes for math equations on that page.
    """
    print("Parsing ground truth XML (using simplified simulation)...")
    with open(xml_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'lxml-xml')

    # Use a defaultdict to easily append to lists
    true_math_boxes_by_page = defaultdict(list)
    formulas = soup.find_all('disp-formula')

    for formula in formulas:
        label_tag = formula.find('label')
        if not label_tag:
            continue
        
        search_text = label_tag.text
        # Search all pages to find where this label lives
        for page_num in range(len(pdf_doc)):
            page = pdf_doc.load_page(page_num)
            text_instances = page.search_for(search_text)
            if text_instances:
                label_box = text_instances[0]
                # Simulate the math box location relative to the label
                math_box = fitz.Rect(label_box.x0 - 200, label_box.y0 - 50, label_box.x1, label_box.y0 - 5)
                
                # IMPORTANT: Add the box to the list for this specific page number
                true_math_boxes_by_page[page_num].append(math_box)
                
                # Stop searching for this label once found
                break
    
    total_boxes = sum(len(boxes) for boxes in true_math_boxes_by_page.values())
    print(f"Found {total_boxes} ground truth math boxes across {len(true_math_boxes_by_page)} pages.")
    return true_math_boxes_by_page

