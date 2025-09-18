import argparse
import yaml
import os
import sys
import fitz # PyMuPDF
from pix2tex.cli import LatexOCR

from src.pdf_parser import get_page_elements, ocr_math_elements
from src.visualizer import generate_syntax_map
from src.trainer import train_parameters

def parse_document(pdf_path, config):
    """
    Main function to parse a PDF, generate HTML and syntax maps.
    """
    output_dir = "output"
    if os.path.exists(output_dir):
        import shutil
        shutil.rmtree(output_dir)
    os.makedirs(output_dir)
    
    print("Loading OCR model...")
    ocr_model = LatexOCR()

    doc = fitz.open(pdf_path)
    print(f"📄 Processing '{os.path.basename(pdf_path)}'...")

    html_content = f"""<!DOCTYPE html>
    <html><head><title>{os.path.basename(pdf_path)}</title>
    <script src="[https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js](https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js)" id="MathJax-script" async></script>
    <style>
        body {{ font-family: sans-serif; line-height: 1.5; padding: 2em; max-width: 800px; margin: auto; }}
        img {{ max-width: 100%; height: auto; display: block; margin: 1em auto; border: 1px solid #ccc; }}
        .equation {{ text-align: center; margin: 1.5em 0; }}
    </style>
    </head><body>
    """
    
    img_counter = 0

    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        page_for_map = doc.load_page(page_num)
        html_content += f"<hr><h2>Page {page_num + 1}</h2>"

        threshold = config['proximity_threshold']
        min_dims = {
            'width': config['parser_settings']['min_math_box_width'],
            'height': config['parser_settings']['min_math_box_height']
        }
        
        elements = get_page_elements(page, threshold, min_dims)
        
        math_elements = [e for e in elements if e['type'] == 'math']
        ocr_math_elements(page, math_elements, ocr_model)
        
        generate_syntax_map(page_for_map, elements, output_dir, page_num, config['visualizer_colors'])

        elements.sort(key=lambda el: (el["bbox"][1], el["bbox"][0]))

        for elem in elements:
            if elem["type"] == "text":
                escaped_text = elem['content'].replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                html_content += f"<p>{escaped_text}</p>\n"
            elif elem["type"] == "image":
                img_counter += 1
                base_image = doc.extract_image(elem['xref'])
                img_filename = f"img_{img_counter}.{base_image['ext']}"
                with open(os.path.join(output_dir, img_filename), "wb") as f:
                    f.write(base_image["image"])
                html_content += f"<img src='{img_filename}'/>\n"
            elif elem["type"] == "math":
                html_content += f"<div class='equation'>$${elem.get('latex', '')}$$</div>\n"

    html_content += "</body></html>"
    output_html_path = os.path.join(output_dir, "output.html")
    with open(output_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    print(f"\n✨ Done! Find output in '{output_dir}' and maps in '{os.path.join(output_dir, 'syntax_maps')}'")


def main():
    parser = argparse.ArgumentParser(description="An adaptive PDF parsing engine.")
    subparsers = parser.add_subparsers(dest='command', required=True, help="The command to execute.")

    # Parser for the 'parse' command
    parse_parser = subparsers.add_parser('parse', help="Parse a PDF document.")
    parse_parser.add_argument('pdf', help="Path to the input PDF file.")
    parse_parser.add_argument('--config', default='./config/config.yaml', help="Path to the configuration file.")

    # Parser for the 'train' command
    train_parser = subparsers.add_parser('train', help="Train parsing parameters using a PDF/XML pair.")
    train_parser.add_argument('pdf', help="Path to the input PDF file.")
    train_parser.add_argument('xml', help="Path to the ground truth XML file.")
    train_parser.add_argument('--config', default='./config/config.yaml', help="Path to the configuration file to update.")
    
    args = parser.parse_args()

    if not os.path.exists(args.config):
        print(f"Error: Config file not found at '{args.config}'")
        sys.exit(1)

    if args.command == 'parse':
        if not os.path.exists(args.pdf):
            print(f"Error: PDF file not found at '{args.pdf}'")
            sys.exit(1)
        with open(args.config, 'r') as f:
            config = yaml.safe_load(f)
        parse_document(args.pdf, config)
    elif args.command == 'train':
        if not os.path.exists(args.pdf) or not os.path.exists(args.xml):
            print(f"Error: PDF or XML file not found.")
            sys.exit(1)
        train_parameters(args.pdf, args.xml, args.config)

if __name__ == "__main__":
    main()
