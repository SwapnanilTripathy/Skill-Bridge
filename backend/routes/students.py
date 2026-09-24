import json

from flask import Blueprint, request, jsonify

from services.resume_parser import extract_text_from_pdf
from services.skill_extractor import extract_skills


students_bp = Blueprint("students", __name__)


@students_bp.route("/api/resume/parse", methods=["POST"])
def parse_resume():
    try:
        # --------------------------------------------------
        # 1. CHECK WHETHER A FILE WAS SENT
        # --------------------------------------------------

        if "resume" not in request.files:
            return jsonify({
                "success": False,
                "message": "No resume file was provided."
            }), 400

        file = request.files["resume"]

        # --------------------------------------------------
        # 2. CHECK WHETHER FILE HAS A NAME
        # --------------------------------------------------

        if file.filename == "":
            return jsonify({
                "success": False,
                "message": "No file selected."
            }), 400

        # --------------------------------------------------
        # 3. ONLY ALLOW PDF
        # --------------------------------------------------

        if not file.filename.lower().endswith(".pdf"):
            return jsonify({
                "success": False,
                "message": "Only PDF files are allowed."
            }), 400

        # --------------------------------------------------
        # 4. EXTRACT TEXT FROM PDF
        # --------------------------------------------------

        extracted_text = extract_text_from_pdf(file)

        if not extracted_text:
            return jsonify({
                "success": False,
                "message": "No readable text was found in the PDF."
            }), 400

        # --------------------------------------------------
        # 5. READ SKILL CATALOG SENT BY FRONTEND
        # --------------------------------------------------

        skill_catalog = []

        skill_catalog_json = request.form.get("skill_catalog")

        if skill_catalog_json:
            try:
                skill_catalog = json.loads(skill_catalog_json)

                if not isinstance(skill_catalog, list):
                    skill_catalog = []

            except json.JSONDecodeError:
                return jsonify({
                    "success": False,
                    "message": "Invalid skill catalog."
                }), 400

        # --------------------------------------------------
        # 6. EXTRACT SKILLS FROM RESUME
        # --------------------------------------------------

        detected_skills = extract_skills(
            extracted_text,
            skill_catalog
        )

        # --------------------------------------------------
        # 7. RETURN PARSED RESULT
        # --------------------------------------------------

        return jsonify({
            "success": True,
            "filename": file.filename,
            "text": extracted_text,
            "detected_skills": detected_skills
        }), 200

    except Exception as error:
        print("Resume endpoint error:", error)

        return jsonify({
            "success": False,
            "message": "Unable to parse resume."
        }), 500