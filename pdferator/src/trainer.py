import yaml
import fitz # PyMuPDF
from .pdf_parser import merge_close_rects
from .xml_parser import get_ground_truth_boxes_by_page
from .utils import calculate_iou

def train_parameters(pdf_path, xml_path, config_path):
    """
    Finds the optimal proximity_threshold by comparing PDF parser output
    to XML ground truth on a page-by-page basis.
    """
    print("Starting training process...")
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
        
    doc = fitz.open(pdf_path)
    
    # Get ground truth boxes organized by page
    true_boxes_by_page = get_ground_truth_boxes_by_page(xml_path, doc)
    if not true_boxes_by_page:
        print("Could not find any ground truth boxes. Aborting training.")
        return

    best_threshold = -1
    best_overall_avg_iou = -1

    min_dims = {
        'width': config['parser_settings']['min_math_box_width'],
        'height': config['parser_settings']['min_math_box_height']
    }

    print("Testing proximity thresholds...")
    for threshold in range(5, 31, 2): # Test values from 5 to 30
        total_iou_for_threshold = 0
        total_true_boxes_for_threshold = 0

        # Iterate through each page that has ground truth boxes
        for page_num, true_boxes_on_page in true_boxes_by_page.items():
            page = doc.load_page(page_num)
            
            # Get predicted boxes for THIS page
            drawings = page.get_drawings()
            initial_rects = [fitz.Rect(d["rect"]) for d in drawings]
            predicted_boxes_on_page = merge_close_rects(initial_rects, threshold)
            
            # Score this page
            page_iou = 0
            for true_box in true_boxes_on_page:
                best_iou_for_box = 0
                for pred_box in predicted_boxes_on_page:
                    iou = calculate_iou(true_box, pred_box)
                    if iou > best_iou_for_box:
                        best_iou_for_box = iou
                page_iou += best_iou_for_box
            
            total_iou_for_threshold += page_iou
            total_true_boxes_for_threshold += len(true_boxes_on_page)
        
        # Calculate the average IoU for this threshold across all relevant pages
        avg_iou = total_iou_for_threshold / total_true_boxes_for_threshold if total_true_boxes_for_threshold > 0 else 0
        print(f"  Threshold: {threshold:2d}, Avg IoU: {avg_iou:.4f}")

        if avg_iou > best_overall_avg_iou:
            best_overall_avg_iou = avg_iou
            best_threshold = threshold

    print(f"\nOptimal threshold found: {best_threshold} with average IoU of {best_overall_avg_iou:.4f}")
    
    config['proximity_threshold'] = best_threshold
    with open(config_path, 'w') as f:
        yaml.dump(config, f)
    print(f"Configuration file '{config_path}' has been updated.")
