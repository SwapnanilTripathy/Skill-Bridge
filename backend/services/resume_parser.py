from pypdf import PdfReader


def extract_text_from_pdf(file):
    """
    Extract text from a PDF file.

    Parameters:
        file: PDF file object received by Flask

    Returns:
        Extracted text as a string.
    """

    try:
        # Read the PDF
        reader = PdfReader(file)

        extracted_text = []

        # Read text from every page
        for page in reader.pages:
            text = page.extract_text()

            if text:
                extracted_text.append(text)

        # Combine all pages into one string
        full_text = "\n".join(extracted_text).strip()

        return full_text

    except Exception as error:
        print("Resume parsing error:", error)

        raise ValueError(
            "Unable to extract text from the PDF."
        )