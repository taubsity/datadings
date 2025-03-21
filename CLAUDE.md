# CLAUDE.md - Guidelines for Datadings Application

## Build & Run Commands
- Setup: `pip install -r requirements.txt`
- Run app: `python app.py`
- Production: `gunicorn app:app`
- Lint: `flake8 app.py`
- Format: `black app.py`

## Code Style Guidelines
- Python: Follow PEP 8 style guide with 4-space indentation
- JavaScript: Use jQuery for DOM manipulation; follow standard JS practices
- CSS: Use Bootstrap classes when possible; custom styles in styles.css
- HTML: Use semantic elements; follow Bootstrap conventions

## Naming Conventions
- Python: snake_case for functions/variables; CamelCase for classes
- JS: camelCase for variables and functions
- Use descriptive names that indicate purpose

## Error Handling
- Flask routes: Return appropriate HTTP error codes
- JavaScript: Use try/catch blocks for AJAX calls
- Validate user input where applicable

## Data Processing
- Use pandas for CSV processing with proper encoding handling
- Document data transformations with clear comments