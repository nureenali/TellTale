import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Load environment configuration: .env.local takes precedence over .env
load_dotenv(ROOT_DIR / ".env.local")
load_dotenv(ROOT_DIR / ".env")

DATABASE_PATH = os.getenv("DATABASE_PATH", str(DATA_DIR / "telltale.db"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "") or os.getenv("API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-4-hydrogen")
APP_ENV = os.getenv("APP_ENV", "development")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")
