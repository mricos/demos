import fitz # PyMuPDF

def calculate_iou(boxA, boxB):
    """
    Calculates the Intersection over Union (IoU) for two bounding boxes.
    """
    # Determine the coordinates of the intersection rectangle
    inter_rect = boxA & boxB # PyMuPDF's '&' operator finds the intersection
    inter_area = inter_rect.get_area()

    # Calculate the area of both bounding boxes
    boxA_area = boxA.get_area()
    boxB_area = boxB.get_area()

    # Compute the area of the union
    union_area = boxA_area + boxB_area - inter_area

    # Compute the IoU
    iou = inter_area / union_area if union_area > 0 else 0
    return iou

