import re


def normalize_text(text):
    """
    Normalize resume text so skill matching is easier.
    """

    if not text:
        return ""

    text = text.lower()

    # Replace multiple spaces/newlines with a single space
    text = re.sub(r"\s+", " ", text)

    return text.strip()


def skill_exists_in_text(skill_name, resume_text):
    """
    Check whether a skill appears in the resume text.

    Uses special handling for skills such as:
    C, C++, C#, .NET, etc.
    """

    skill = skill_name.lower().strip()

    # Escape special regex characters such as +, #, .
    escaped_skill = re.escape(skill)

    # Make sure the skill is not part of another word.
    pattern = rf"(?<!\w){escaped_skill}(?!\w)"

    return re.search(pattern, resume_text, re.IGNORECASE) is not None


def extract_skills(resume_text, skill_catalog):
    """
    Extract skills from resume text using SkillBridge's skill catalog.

    Parameters:
        resume_text:
            Text extracted from the student's resume.

        skill_catalog:
            List of skills from the SkillBridge database.

            Example:
            [
                {"id": "...", "name": "Python"},
                {"id": "...", "name": "React"},
                {"id": "...", "name": "PostgreSQL"}
            ]

    Returns:
        List of detected skills.
    """

    normalized_resume = normalize_text(resume_text)

    if not normalized_resume:
        return []

    detected_skills = []

    for skill in skill_catalog:

        skill_name = skill.get("name")

        if not skill_name:
            continue

        if skill_exists_in_text(skill_name, normalized_resume):

            detected_skills.append({
                "id": skill.get("id"),
                "name": skill_name,
                "category": skill.get("category")
            })

    return detected_skills