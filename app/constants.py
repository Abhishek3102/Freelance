SKILL_CATEGORIES = {
    # (Unchanged for brevity, assumes all previous categories are here)
    "Programming Languages": [
        "python", "java", "javascript", "typescript", "c++", "c#", "go", "golang", "ruby", 
        "php", "swift", "kotlin", "r", "matlab", "sql", "scala", "perl", "rust"
    ],
    "Web Development (Frontend)": [
        "html", "css", "react", "angular", "vue", "vue.js", "next.js", "nextjs",
        "svelte", "jquery", "bootstrap", "tailwind", "tailwindcss", "sass", "less", "webpack", "babel"
    ],
    "Database Systems": [
        "mysql", "postgresql", "mongodb", "redis", "oracle", "sqlite", 
        "microsoft sql server", "sql server", "cassandra", "elasticsearch", "dynamodb", "firebase"
    ],
    # ... other categories
}

JOB_ROLES = {
    # (Unchanged for brevity, assumes all previous job roles are here)
    "Software Engineer": {
        "required_skills": ["python", "java", "javascript", "sql", "git", "teamwork"],
        "good_to_have": ["docker", "kubernetes", "aws", "ci/cd", "agile", "react", "node.js", "c++"],
        "experience_keywords": ["development", "implementation", "testing", "debugging", "optimization", "code review"]
    },
    "Data Scientist": {
        "required_skills": ["python", "r", "sql", "pandas", "scikit-learn", "matplotlib"],
        "good_to_have": ["tensorflow", "pytorch", "spark", "tableau", "power bi", "nlp", "computer vision", "aws"],
        "experience_keywords": ["analysis", "modeling", "visualization", "research", "prediction", "a/b testing", "algorithms"]
    },
    # ... other job roles
}

# --- Marketplace Status Constants (NEW) ---

JOB_STATUSES = {
    "OPEN": "Job is open for proposals.",
    "PROPOSAL_ACCEPTED": "Proposal accepted, waiting for escrow funding.",
    "ESCROW_ACTIVE": "Escrow funded, work in progress.",
    "WORK_SUBMITTED": "Freelancer submitted work, waiting for client approval.",
    "COMPLETED": "Job finished and payment released.",
    "DISPUTED": "Job is under dispute, funds frozen pending arbiter review.",
    "CANCELED": "Job canceled or dispute resolved."
}

PROPOSAL_STATUSES = [
    "PENDING",
    "ACCEPTED",
    "REJECTED",
    "WITHDRAWN"
]